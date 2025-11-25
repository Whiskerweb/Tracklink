import Fastify from "fastify";
import cookie from "@fastify/cookie";
import crypto from "node:crypto";
import { CLICK_COOKIE_NAME, CLICK_COOKIE_TTL_DAYS, prisma } from "@tracking/shared";
import { env } from "./env";
import { logger } from "./logger";
import { hashValue } from "./utils/hash";

async function bootstrap() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
              },
            }
          : undefined,
    },
    trustProxy: true,
  });

  await app.register(cookie, {
    secret: env.CLICK_COOKIE_SECRET,
  });

  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    // Normalize hostname (remove port, lowercase)
    const host = request.hostname?.toLowerCase().split(":")[0] || request.headers.host?.toLowerCase().split(":")[0] || "localhost";

    const link = await prisma.link.findFirst({
      where: {
        slug,
        domain: {
          host,
        },
      },
      include: {
        domain: true,
      },
    });

    if (!link) {
      return reply.code(404).send("Link not found");
    }

    let clickId = request.cookies[CLICK_COOKIE_NAME];
    if (!clickId) {
      clickId = crypto.randomUUID();
      reply.setCookie(CLICK_COOKIE_NAME, clickId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        signed: false,
        maxAge: CLICK_COOKIE_TTL_DAYS * 24 * 60 * 60,
      });
    }

      queueMicrotask(() => {
        void prisma.clickEvent
          .upsert({
            where: {
              workspaceId_clickId: {
                workspaceId: link.workspaceId,
                clickId,
              },
            },
            create: {
              workspaceId: link.workspaceId,
              linkId: link.id,
              clickId,
              referrer: request.headers.referer,
              userAgentHash: hashValue(request.headers["user-agent"] ?? "unknown"),
              ipHash: hashValue(request.ip ?? "unknown"),
              // Auto-attribution from link
              partnerId: link.partnerId,
              partnerLinkId: link.partnerLinkId,
            },
            update: {
              linkId: link.id,
              // Update attribution if link changed
              partnerId: link.partnerId,
              partnerLinkId: link.partnerLinkId,
            },
          })
          .catch((error) => {
            logger.error(
              {
                error,
                workspaceId: link.workspaceId,
                linkId: link.id,
              },
              "Failed to log click event"
            );
          });
      });

    return reply.redirect(link.targetUrl, 302);
  });

  try {
    await app.listen({ port: env.REDIRECT_PORT, host: "0.0.0.0" });
    logger.info(`Redirect server listening on ${env.REDIRECT_PORT}`);
  } catch (error) {
    logger.error(error, "Failed to start redirect server");
    process.exit(1);
  }
}

bootstrap();

