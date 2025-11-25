import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./env";
import { logger } from "./logger";
import { registerShopifyRoutes } from "./routes/shopify";
import { registerExtensionRoutes } from "./routes/extension";

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
    // Pour les webhooks Shopify, on a besoin du body brut pour la validation HMAC
    bodyLimit: 1048576, // 1MB
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(sensible);

  await registerShopifyRoutes(app);
  await registerExtensionRoutes(app);

  // Health check
  app.get("/health", async () => {
    return { status: "ok", service: "shopify-app" };
  });

  try {
    await app.listen({ port: env.SHOPIFY_PORT, host: "0.0.0.0" });
    logger.info(`Shopify app listening on ${env.SHOPIFY_PORT}`);
  } catch (error) {
    logger.error(error, "Failed to start Shopify app");
    process.exit(1);
  }
}

bootstrap();

