import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./env";
import { logger } from "./logger";
import { createObservabilityPlugin } from "@tracking/shared";
import { registerLinkRoutes } from "./routes/links";
import { registerTrackingRoutes } from "./routes/tracking";
import { registerPartnerRoutes } from "./routes/partners";
import { registerDomainRoutes } from "./routes/domains";

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
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      // En développement, autoriser toutes les origines
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      // En production, whitelist des origines autorisées
      const allowedOrigins = [
        "https://traaaction.com",
        "https://www.traaaction.com",
        // Prévisualisations Vercel
        /^https:\/\/.*\.vercel\.app$/,
      ];

      // Si pas d'origin (requêtes same-origin ou curl), autoriser
      if (!origin) {
        return callback(null, true);
      }

      // Vérifier si l'origin est dans la whitelist
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") {
          return origin === allowed;
        }
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
  });
  await app.register(sensible);
  await app.register(createObservabilityPlugin());

  await registerLinkRoutes(app);
  await registerTrackingRoutes(app);
  await registerPartnerRoutes(app);
  await registerDomainRoutes(app);

  try {
    await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
    logger.info(`API server listening on ${env.API_PORT}`);
  } catch (error) {
    logger.error(error, "Failed to start API server");
    process.exit(1);
  }
}

bootstrap();

