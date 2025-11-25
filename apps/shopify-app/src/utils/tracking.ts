import { env } from "../env";
import { logger } from "../logger";

export interface TrackSaleInput {
  workspaceId: string;
  customerExternalId: string;
  amount: number;
  currency: string;
  invoiceId?: string;
  clickId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  email?: string;
  customer?: {
    id?: number;
    email?: string;
  };
  total_price: string;
  currency: string;
  discount_codes?: Array<{ code: string }>;
  note_attributes?: Array<{ name: string; value: string }>;
  line_items?: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
}

/**
 * Appelle l'API interne /track/sale pour tracker une vente
 */
export async function trackSaleInternal(payload: TrackSaleInput): Promise<void> {
  try {
    const response = await fetch(`${env.API_URL}/track/sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to track sale: ${response.status} ${errorText}`);
    }

    logger.info({ payload }, "Sale tracked successfully");
  } catch (error) {
    logger.error({ error, payload }, "Failed to track sale");
    throw error;
  }
}

/**
 * Transforme un ordre Shopify en payload pour /track/sale
 */
export function mapShopifyOrderToSaleEvent(
  order: ShopifyOrder,
  workspaceId: string,
  shopDomain: string
): TrackSaleInput {
  // CustomerExternalId au format: shopify:${shopDomain}:${customerId}
  // ou fallback sur email ou order ID
  let customerExternalId: string;
  if (order.customer?.id) {
    customerExternalId = `shopify:${shopDomain}:${order.customer.id}`;
  } else if (order.customer?.email) {
    customerExternalId = `shopify:${shopDomain}:${order.customer.email}`;
  } else if (order.email) {
    customerExternalId = `shopify:${shopDomain}:${order.email}`;
  } else {
    customerExternalId = `shopify:${shopDomain}:order-${order.id}`;
  }

  // Chercher le clickId dans les note_attributes (si on l'a stocké là)
  let clickId: string | undefined;
  const clickIdAttr = order.note_attributes?.find(
    (attr) => attr.name === "cursor_click_id" || attr.name === "clickId"
  );
  if (clickIdAttr?.value) {
    clickId = clickIdAttr.value;
  }

  const discountCodes =
    order.discount_codes?.map((dc) => dc.code) || [];

  return {
    workspaceId,
    customerExternalId,
    amount: parseFloat(order.total_price),
    currency: order.currency || "USD",
    invoiceId: order.name || order.id.toString(),
    clickId, // Peut être undefined, l'attribution engine gérera les fallbacks
    idempotencyKey: `shopify-order-${order.id}`,
    metadata: {
      shopDomain,
      orderName: order.name,
      orderId: order.id,
      lineItems: order.line_items || [],
      discountCodes,
      source: "shopify",
    },
  };
}

