import { prisma } from "@tracking/shared";
import Decimal from "decimal.js";

interface CommissionRule {
  type: "percentage" | "fixed_per_click" | "fixed_per_lead" | "fixed_per_sale";
  value: number; // percentage (0-100) or fixed amount
  currency?: string;
}

interface CalculateCommissionParams {
  workspaceId: string;
  partnerId: string;
  eventId: string;
  eventType: "click" | "lead" | "sale";
  amount?: number; // For sales
  currency?: string;
}

export async function calculateAndCreateCommission(
  params: CalculateCommissionParams
): Promise<string | null> {
  // Get partner's commission rules (for now, use defaults)
  // In Phase 2, this would come from a CommissionRule model
  const rules: CommissionRule[] = [
    { type: "fixed_per_click", value: 0.01, currency: "USD" },
    { type: "fixed_per_lead", value: 5.0, currency: "USD" },
    { type: "percentage", value: 10.0, currency: "USD" }, // 10% of sale
  ];

  let commissionAmount = new Decimal(0);
  const currency = params.currency || "USD";

  // Find applicable rule
  const rule = rules.find((r) => {
    if (params.eventType === "click" && r.type === "fixed_per_click") return true;
    if (params.eventType === "lead" && r.type === "fixed_per_lead") return true;
    if (params.eventType === "sale" && r.type === "percentage") return true;
    return false;
  });

  if (!rule) {
    return null; // No commission rule for this event type
  }

  // Calculate commission
  if (rule.type === "percentage" && params.amount) {
    commissionAmount = new Decimal(params.amount).mul(rule.value).div(100);
  } else if (rule.type.startsWith("fixed_")) {
    commissionAmount = new Decimal(rule.value);
  }

  if (commissionAmount.equals(0)) {
    return null; // No commission to create
  }

  // Create commission record
  const commission = await prisma.commission.create({
    data: {
      workspaceId: params.workspaceId,
      partnerId: params.partnerId,
      eventId: params.eventId,
      eventType: params.eventType,
      amount: commissionAmount,
      currency,
    },
  });

  return commission.id;
}


