import { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { prisma } from "@tracking/shared";
import {
  createPartnerSchema,
  updatePartnerSchema,
  getPartnersQuerySchema,
  partnerIdParamSchema,
  createPartnerLinkSchema,
  analyticsQuerySchema,
} from "../schemas/partner";
import { logger } from "../logger";

export async function registerPartnerRoutes(app: FastifyInstance): Promise<void> {
  // CRUD Partners
  app.post("/partners", async (request, reply) => {
    try {
      const payload = createPartnerSchema.parse(request.body);

      const partner = await prisma.partner.create({
        data: {
          workspaceId: payload.workspaceId,
          email: payload.email,
          name: payload.name,
          country: payload.country,
          status: payload.status ?? "PENDING",
        },
      });

      return reply.code(201).send(partner);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
      }
      if (isUniqueConstraintError(error)) {
        return reply.code(409).send({ error: "Partner with this email already exists" });
      }
      logger.error(error, "Failed to create partner");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/partners", async (request, reply) => {
    try {
      const query = getPartnersQuerySchema.parse(request.query);
      const { limit, cursor, search, status, workspaceId } = query;

      const items = await prisma.partner.findMany({
        where: {
          workspaceId,
          ...(status ? { status } : {}),
          ...(search
            ? {
                OR: [
                  { email: { contains: search, mode: "insensitive" } },
                  { name: { contains: search, mode: "insensitive" } },
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
      logger.error(error, "Failed to fetch partners");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/partners/:id", async (request, reply) => {
    try {
      const { id } = partnerIdParamSchema.parse(request.params);
      const partner = await prisma.partner.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              links: true,
              partnerLinks: true,
              clickEvents: true,
              leadEvents: true,
              saleEvents: true,
            },
          },
        },
      });

      if (!partner) {
        return reply.code(404).send({ error: "Partner not found" });
      }

      return reply.send(partner);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid partner id", details: error.flatten() });
      }
      logger.error(error, "Failed to fetch partner");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.patch("/partners/:id", async (request, reply) => {
    try {
      const { id } = partnerIdParamSchema.parse(request.params);
      const payload = updatePartnerSchema.parse(request.body);

      const partner = await prisma.partner.update({
        where: { id },
        data: payload,
      });

      return reply.send(partner);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
      }
      if (isNotFoundError(error)) {
        return reply.code(404).send({ error: "Partner not found" });
      }
      logger.error(error, "Failed to update partner");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/partners/:id", async (request, reply) => {
    try {
      const { id } = partnerIdParamSchema.parse(request.params);

      await prisma.partner.delete({
        where: { id },
      });

      return reply.code(204).send();
    } catch (error) {
      if (isNotFoundError(error)) {
        return reply.code(404).send({ error: "Partner not found" });
      }
      logger.error(error, "Failed to delete partner");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Partner Links
  app.post("/partners/links", async (request, reply) => {
    try {
      const payload = createPartnerLinkSchema.parse(request.body);

      const partnerLink = await prisma.partnerLink.create({
        data: {
          workspaceId: payload.workspaceId,
          partnerId: payload.partnerId,
          linkId: payload.linkId,
        },
        include: {
          link: true,
          partner: true,
        },
      });

      return reply.code(201).send(partnerLink);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
      }
      if (isUniqueConstraintError(error)) {
        return reply.code(409).send({ error: "Partner link already exists" });
      }
      logger.error(error, "Failed to create partner link");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/partners/:id/links", async (request, reply) => {
    try {
      const { id } = partnerIdParamSchema.parse(request.params);

      const partnerLinks = await prisma.partnerLink.findMany({
        where: { partnerId: id },
        include: {
          link: true,
        },
      });

      return reply.send({ items: partnerLinks });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid partner id", details: error.flatten() });
      }
      logger.error(error, "Failed to fetch partner links");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Analytics
  app.get("/partners/:id/analytics", async (request, reply) => {
    try {
      const { id } = partnerIdParamSchema.parse(request.params);
      const query = analyticsQuerySchema.parse(request.query);

      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      // Get aggregated stats
      const [clicks, leads, sales, earnings] = await Promise.all([
        prisma.clickEvent.count({
          where: {
            partnerId: id,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.leadEvent.count({
          where: {
            partnerId: id,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.saleEvent.count({
          where: {
            partnerId: id,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.saleEvent.aggregate({
          where: {
            partnerId: id,
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      // Get timeline data - aggregate from all event types
      const dateFormat = query.groupBy === "day" ? "day" : query.groupBy === "week" ? "week" : "month";

      // Get clicks timeline
      const clicksTimeline = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT 
          date_trunc('${dateFormat}', "createdAt")::date as date,
          COUNT(*)::bigint as count
        FROM "ClickEvent"
        WHERE "partnerId" = ${id} AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY date
        ORDER BY date ASC
      `;

      // Get leads timeline
      const leadsTimeline = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT 
          date_trunc('${dateFormat}', "createdAt")::date as date,
          COUNT(*)::bigint as count
        FROM "LeadEvent"
        WHERE "partnerId" = ${id} AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY date
        ORDER BY date ASC
      `;

      // Get sales timeline with earnings
      const salesTimeline = await prisma.$queryRaw<Array<{ date: Date; count: bigint; earnings: Decimal }>>`
        SELECT 
          date_trunc('${dateFormat}', "createdAt")::date as date,
          COUNT(*)::bigint as count,
          COALESCE(SUM("amount"), 0) as earnings
        FROM "SaleEvent"
        WHERE "partnerId" = ${id} AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY date
        ORDER BY date ASC
      `;

      // Merge timelines
      const dateMap = new Map<string, { clicks: number; leads: number; sales: number; earnings: number }>();

      clicksTimeline.forEach((item) => {
        const key = item.date.toISOString().split("T")[0];
        if (!dateMap.has(key)) {
          dateMap.set(key, { clicks: 0, leads: 0, sales: 0, earnings: 0 });
        }
        dateMap.get(key)!.clicks = Number(item.count);
      });

      leadsTimeline.forEach((item) => {
        const key = item.date.toISOString().split("T")[0];
        if (!dateMap.has(key)) {
          dateMap.set(key, { clicks: 0, leads: 0, sales: 0, earnings: 0 });
        }
        dateMap.get(key)!.leads = Number(item.count);
      });

      salesTimeline.forEach((item) => {
        const key = item.date.toISOString().split("T")[0];
        if (!dateMap.has(key)) {
          dateMap.set(key, { clicks: 0, leads: 0, sales: 0, earnings: 0 });
        }
        dateMap.get(key)!.sales = Number(item.count);
        dateMap.get(key)!.earnings = Number(item.earnings);
      });

      const timeline = Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return reply.send({
        summary: {
          clicks,
          leads,
          sales,
          earnings: earnings._sum.amount || 0,
        },
        timeline,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid query", details: error.flatten() });
      }
      logger.error(error, "Failed to fetch partner analytics");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Get partner from embed token
  app.get("/partners/embed-token/:token", async (request, reply) => {
    try {
      const { token } = request.params as { token: string };

      const embedToken = await prisma.partnerEmbedToken.findUnique({
        where: { token },
        include: { partner: true },
      });

      if (!embedToken) {
        return reply.code(404).send({ error: "Invalid token" });
      }

      if (embedToken.expiresAt < new Date()) {
        return reply.code(401).send({ error: "Token expired" });
      }

      return reply.send({
        partnerId: embedToken.partnerId,
        partner: embedToken.partner,
      });
    } catch (error) {
      logger.error(error, "Failed to validate embed token");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Embed Token
  app.post("/partners/:id/embed-token", async (request, reply) => {
    try {
      const { id } = partnerIdParamSchema.parse(request.params);
      const { expiresInDays = 90 } = request.body as { expiresInDays?: number };

      const partner = await prisma.partner.findUnique({
        where: { id },
      });

      if (!partner) {
        return reply.code(404).send({ error: "Partner not found" });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const embedToken = await prisma.partnerEmbedToken.create({
        data: {
          workspaceId: partner.workspaceId,
          partnerId: id,
          token,
          expiresAt,
        },
      });

      return reply.code(201).send({
        token: embedToken.token,
        expiresAt: embedToken.expiresAt,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid partner id", details: error.flatten() });
      }
      logger.error(error, "Failed to create embed token");
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

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2025"
  );
}

