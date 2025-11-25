import { env } from "../env";
import { logger } from "../logger";

export interface TrackSaleInput {
  workspaceId: string;
  customerExternalId: string;
  amount: number;
  currency: string;
  invoiceId?: string;
  clickId?: string;
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
  const customerExternalId =
    order.customer?.id?.toString() ||
    order.customer?.email ||
    order.email ||
    `shopify_${order.id}`;

  const discountCodes =
    order.discount_codes?.map((dc) => dc.code) || [];

  return {
    workspaceId,
    customerExternalId,
    amount: parseFloat(order.total_price),
    currency: order.currency || "USD",
    invoiceId: order.name || order.id.toString(),
    metadata: {
      shopDomain,
      orderName: order.name,
      orderId: order.id,
      lineItems: order.line_items || [],
      discountCodes,
      source: "shopify",
    },
    // clickId sera déterminé par l'attribution engine côté API
  };
}

