import { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { prisma } from "@tracking/shared";
import {
  createDomainSchema,
  updateDomainSchema,
  getDomainsQuerySchema,
  domainIdParamSchema,
} from "../schemas/domain";
import { env } from "../env";
import { logger } from "../logger";

export async function registerDomainRoutes(app: FastifyInstance): Promise<void> {
  // Disable domain creation for users - only admins can create domains
  // All users use the default domain (traaaction.com)
  app.post("/domains", async (request, reply) => {
    return reply.code(403).send({
      error: "Domain creation is disabled",
      message: "All links use the default domain. Contact support if you need a custom domain.",
    });
  });
  
  // Keep other endpoints for admin/internal use
  app.post("/domains/internal", async (request, reply) => {
    try {
      const payload = createDomainSchema.parse(request.body);

      const domain = await prisma.domain.create({
        data: {
          workspaceId: payload.workspaceId,
          host: payload.host,
          verified: payload.verified ?? false,
        },
      });

      return reply.code(201).send(domain);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
      }
      if (isUniqueConstraintError(error)) {
        return reply.code(409).send({ error: "Domain already exists for this workspace" });
      }
      logger.error(error, "Failed to create domain");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Users can only see the default domain
  app.get("/domains", async (request, reply) => {
    try {
      const query = getDomainsQuerySchema.parse(request.query);
      const { workspaceId } = query;

      // Always return only the default domain for the workspace
      const domain = await prisma.domain.findFirst({
        where: {
          workspaceId,
          host: env.DEFAULT_DOMAIN,
        },
        include: {
          _count: {
            select: {
              links: true,
            },
          },
        },
      });

      // If domain doesn't exist, create it automatically
      if (!domain) {
        const newDomain = await prisma.domain.create({
          data: {
            workspaceId,
            host: env.DEFAULT_DOMAIN,
            verified: true,
          },
          include: {
            _count: {
              select: {
                links: true,
              },
            },
          },
        });
        return reply.send({ items: [newDomain] });
      }

      return reply.send({ items: [domain] });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid query", details: error.flatten() });
      }
      logger.error(error, "Failed to fetch domains");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/domains/:id", async (request, reply) => {
    try {
      const { id } = domainIdParamSchema.parse(request.params);
      const domain = await prisma.domain.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              links: true,
            },
          },
        },
      });

      if (!domain) {
        return reply.code(404).send({ error: "Domain not found" });
      }

      return reply.send(domain);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid domain id", details: error.flatten() });
      }
      logger.error(error, "Failed to fetch domain");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.patch("/domains/:id", async (request, reply) => {
    try {
      const { id } = domainIdParamSchema.parse(request.params);
      const payload = updateDomainSchema.parse(request.body);

      const domain = await prisma.domain.update({
        where: { id },
        data: payload,
      });

      return reply.send(domain);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid payload", details: error.flatten() });
      }
      if (isNotFoundError(error)) {
        return reply.code(404).send({ error: "Domain not found" });
      }
      logger.error(error, "Failed to update domain");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/domains/:id", async (request, reply) => {
    try {
      const { id } = domainIdParamSchema.parse(request.params);

      await prisma.domain.delete({
        where: { id },
      });

      return reply.code(204).send();
    } catch (error) {
      if (isNotFoundError(error)) {
        return reply.code(404).send({ error: "Domain not found" });
      }
      logger.error(error, "Failed to delete domain");
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

