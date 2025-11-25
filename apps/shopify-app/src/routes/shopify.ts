import { FastifyInstance } from "fastify";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { prisma } from "@tracking/shared";
import { env } from "../env";
import { logger } from "../logger";
import {
  trackSaleInternal,
  mapShopifyOrderToSaleEvent,
  ShopifyOrder,
} from "../utils/tracking";
import crypto from "node:crypto";

// Configuration Shopify API
let shopify: ReturnType<typeof shopifyApi> | null = null;

if (env.SHOPIFY_API_KEY && env.SHOPIFY_API_SECRET) {
  shopify = shopifyApi({
    apiKey: env.SHOPIFY_API_KEY,
    apiSecretKey: env.SHOPIFY_API_SECRET,
    scopes: env.SHOPIFY_SCOPES?.split(",") || ["read_orders", "write_orders"],
    hostName: env.SHOPIFY_APP_URL?.replace(/^https?:\/\//, "").split("/")[0] || "localhost:3001",
    apiVersion: ApiVersion.January24,
    isEmbeddedApp: false,
  });
}

/**
 * Valide la signature HMAC d'un webhook Shopify
 */
function validateWebhookSignature(
  body: string,
  signature: string
): boolean {
  if (!env.SHOPIFY_API_SECRET) {
    logger.warn("SHOPIFY_API_SECRET not set, skipping webhook validation");
    return true; // En dev, on peut skip si pas configuré
  }

  const hmac = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}

export async function registerShopifyRoutes(
  app: FastifyInstance
): Promise<void> {
  // Route d'installation OAuth
  app.get("/shopify/install", async (request, reply) => {
    if (!shopify) {
      return reply.code(500).send({
        error: "Shopify API not configured. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET",
      });
    }

    const shop = (request.query as { shop?: string }).shop;
    if (!shop) {
      return reply.code(400).send({ error: "Missing shop parameter" });
    }

    try {
      const authRoute = await shopify.auth.begin({
        shop: shop,
        callbackPath: "/shopify/callback",
        isOnline: false,
        rawRequest: request.raw,
        rawResponse: reply.raw,
      });

      return reply.redirect(authRoute);
    } catch (error) {
      logger.error({ error, shop }, "Failed to start OAuth flow");
      return reply.code(500).send({ error: "Failed to start OAuth" });
    }
  });

  // Route de callback OAuth
  app.get("/shopify/callback", async (request, reply) => {
    if (!shopify) {
      return reply.code(500).send({
        error: "Shopify API not configured",
      });
    }

    try {
      const callbackResponse = await shopify.auth.callback({
        rawRequest: request.raw,
        rawResponse: reply.raw,
      });

      const { session } = callbackResponse;
      const shopDomain = session.shop;

      // Récupérer le workspaceId (pour l'instant, via variable d'env ou mapping)
      // TODO: Implémenter un système de mapping shop -> workspaceId
      const workspaceId = process.env.SHOPIFY_WORKSPACE_ID || process.env.DEFAULT_WORKSPACE_ID;
      
      if (!workspaceId) {
        logger.error({ shopDomain }, "No workspaceId configured for Shopify shop");
        return reply.code(500).send({
          error: "No workspace configured. Set SHOPIFY_WORKSPACE_ID or DEFAULT_WORKSPACE_ID",
        });
      }

      // Enregistrer ou mettre à jour le shop
      await prisma.shopifyShop.upsert({
        where: { shopDomain },
        create: {
          workspaceId,
          shopDomain,
          accessToken: session.accessToken,
          scopes: session.scope || env.SHOPIFY_SCOPES || null,
          installedAt: new Date(),
        },
        update: {
          accessToken: session.accessToken,
          scopes: session.scope || env.SHOPIFY_SCOPES || null,
          uninstalledAt: null,
          updatedAt: new Date(),
        },
      });

      logger.info({ shopDomain, workspaceId }, "Shopify shop installed");

      return reply.send({
        success: true,
        message: "Shop installed successfully",
        shopDomain,
      });
    } catch (error) {
      logger.error({ error }, "Failed to complete OAuth callback");
      return reply.code(500).send({ error: "Failed to complete installation" });
    }
  });

  // Webhook: orders/create
  app.post("/shopify/webhooks/orders/create", {
    config: {
      rawBody: true, // Nécessaire pour la validation HMAC
    },
  }, async (request, reply) => {
    const signature = request.headers["x-shopify-hmac-sha256"] as string;
    const shopDomain = request.headers["x-shopify-shop-domain"] as string;

    if (!signature) {
      logger.warn("Missing webhook signature");
      return reply.code(401).send({ error: "Missing signature" });
    }

    // Valider la signature HMAC avec le body brut
    // Fastify parse le body, donc on doit le re-stringify
    // En production, utilisez request.rawBody si disponible
    const rawBody = (request as any).rawBody || JSON.stringify(request.body);
    if (!validateWebhookSignature(rawBody, signature)) {
      logger.warn({ shopDomain }, "Invalid webhook signature");
      return reply.code(401).send({ error: "Invalid signature" });
    }

    try {
      // Récupérer le shop et workspaceId
      const shop = await prisma.shopifyShop.findUnique({
        where: { shopDomain },
      });

      if (!shop || shop.uninstalledAt) {
        logger.warn({ shopDomain }, "Shop not found or uninstalled");
        return reply.code(404).send({ error: "Shop not found" });
      }

      const order = request.body as ShopifyOrder;

      // Mapper l'ordre Shopify vers un SaleEvent
      const salePayload = mapShopifyOrderToSaleEvent(
        order,
        shop.workspaceId,
        shopDomain
      );

      // Appeler l'API interne pour tracker la vente
      // L'attribution sera gérée automatiquement par l'API
      await trackSaleInternal(salePayload);

      logger.info(
        {
          shopDomain,
          orderId: order.id,
          orderName: order.name,
          workspaceId: shop.workspaceId,
        },
        "Shopify order tracked as sale"
      );

      return reply.code(200).send({ success: true });
    } catch (error) {
      logger.error({ error, shopDomain }, "Failed to process Shopify order webhook");
      return reply.code(500).send({ error: "Failed to process webhook" });
    }
  });

  // Webhook: app/uninstalled
  app.post("/shopify/webhooks/uninstall", {
    config: {
      rawBody: true,
    },
  }, async (request, reply) => {
    const signature = request.headers["x-shopify-hmac-sha256"] as string;
    const shopDomain = request.headers["x-shopify-shop-domain"] as string;

    if (!signature) {
      return reply.code(401).send({ error: "Missing signature" });
    }

    const rawBody = (request as any).rawBody || JSON.stringify(request.body);
    if (!validateWebhookSignature(rawBody, signature)) {
      return reply.code(401).send({ error: "Invalid signature" });
    }

    try {
      await prisma.shopifyShop.updateMany({
        where: { shopDomain },
        data: { uninstalledAt: new Date() },
      });

      logger.info({ shopDomain }, "Shopify shop uninstalled");

      return reply.code(200).send({ success: true });
    } catch (error) {
      logger.error({ error, shopDomain }, "Failed to process uninstall webhook");
      return reply.code(500).send({ error: "Failed to process webhook" });
    }
  });
}

