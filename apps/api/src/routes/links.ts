import { FastifyInstance } from "fastify";
import { ZodError, z } from "zod";
import { prisma } from "@tracking/shared";
import { createLinkSchema, getLinksQuerySchema } from "../schemas/link";
import { env } from "../env";
import { logger } from "../logger";

const linkIdParamSchema = z.object({
  id: z.string().cuid(),
});

export async function registerLinkRoutes(app: FastifyInstance): Promise<void> {
  app.post("/links", async (request, reply) => {
    try {
      const payload = createLinkSchema.parse(request.body);

      // Get or create default domain for this workspace
      let domain = await prisma.domain.findFirst({
        where: {
          workspaceId: payload.workspaceId,
          host: env.DEFAULT_DOMAIN,
        },
      });

      if (!domain) {
        // Create default domain if it doesn't exist
        domain = await prisma.domain.create({
          data: {
            workspaceId: payload.workspaceId,
            host: env.DEFAULT_DOMAIN,
            verified: true, // Auto-verified since it's our domain
          },
        });
      }

      // Generate slug if not provided
      let slug = payload.slug;
      if (!slug) {
        // Generate a unique slug using timestamp and random string
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        slug = `link-${timestamp}-${random}`;
      }

      const link = await prisma.link.create({
        data: {
          workspaceId: payload.workspaceId,
          domainId: domain.id, // Always use default domain
          slug,
          targetUrl: payload.targetUrl,
          trackConversion: payload.trackConversion ?? true,
          title: payload.title,
          description: payload.description,
          tags: payload.tags ?? [],
          metadata: payload.metadata,
          partnerId: payload.partnerId ?? null,
          partnerLinkId: payload.partnerLinkId ?? null,
        },
      });

      return reply.code(201).send(link);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
      }
      if (isUniqueConstraintError(error)) {
        return reply.code(409).send({ error: "Link already exists for this slug" });
      }
      logger.error(error, "Failed to create link");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/links", async (request, reply) => {
    try {
      const query = getLinksQuerySchema.parse(request.query);
      const { limit, cursor, search, tag, workspaceId, domainId } = query;

      // If domainId not provided, use default domain
      let finalDomainId = domainId;
      if (!finalDomainId) {
        const defaultDomain = await prisma.domain.findFirst({
          where: {
            workspaceId,
            host: env.DEFAULT_DOMAIN,
          },
        });
        if (defaultDomain) {
          finalDomainId = defaultDomain.id;
        }
      }

      const items = await prisma.link.findMany({
        where: {
          workspaceId,
          ...(finalDomainId ? { domainId: finalDomainId } : {}),
          ...(tag ? { tags: { has: tag } } : {}),
          ...(search
            ? {
                OR: [
                  { slug: { contains: search, mode: "insensitive" } },
                  { targetUrl: { contains: search, mode: "insensitive" } },
                  { title: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasNextPage = items.length > limit;
      if (hasNextPage) {
        items.pop();
      }

      return reply.send({
        items,
        nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid query", details: error.flatten() });
      }
      logger.error(error, "Failed to fetch links");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/links/:id", async (request, reply) => {
    try {
      const { id } = linkIdParamSchema.parse(request.params);
      const link = await prisma.link.findUnique({
        where: { id },
      });
      if (!link) {
        return reply.code(404).send({ error: "Link not found" });
      }
      return reply.send(link);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid link id", details: error.flatten() });
      }
      logger.error(error, "Failed to fetch link");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/links/:id/stats", async (request, reply) => {
    try {
      const { id } = linkIdParamSchema.parse(request.params);
      
      // Vérifier que le lien existe
      const link = await prisma.link.findUnique({
        where: { id },
      });
      if (!link) {
        return reply.code(404).send({ error: "Link not found" });
      }

      // Récupérer les clickIds associés à ce lien
      const clickIds = await prisma.clickEvent.findMany({
        where: { linkId: id },
        select: { clickId: true },
      });
      const clickIdArray = clickIds.map((c: { clickId: string }) => c.clickId);

      // Compter les clics
      const clicks = await prisma.clickEvent.count({
        where: { linkId: id },
      });

      // Compter les leads (via clickId)
      const leads = await prisma.leadEvent.count({
        where: {
          clickId: { in: clickIdArray },
        },
      });

      // Compter les sales et calculer le revenue (via clickId)
      const [sales, revenueAgg] = await Promise.all([
        prisma.saleEvent.count({
          where: {
            clickId: { in: clickIdArray },
          },
        }),
        prisma.saleEvent.aggregate({
          where: {
            clickId: { in: clickIdArray },
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      const revenue = revenueAgg._sum.amount ? Number(revenueAgg._sum.amount) : 0;

      return reply.send({
        clicks,
        leads,
        sales,
        revenue,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid link id", details: error.flatten() });
      }
      logger.error(error, "Failed to fetch link stats");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

