#!/usr/bin/env tsx
/**
 * E2E Test Script: Track a sale event
 * 
 * Usage: pnpm tsx scripts/track-sale.ts [clickId] [customerExternalId] [amount]
 * 
 * Prerequisites:
 * - API server running on port 4000
 * - Workspace must exist
 * - Optional: clickId from simulate-click.ts
 */

import { env } from "../apps/api/src/env";

const API_URL = `http://localhost:${env.API_PORT}`;

async function trackSale(clickId?: string, customerExternalId?: string, amount?: string) {
  const workspaceId = process.env.TEST_WORKSPACE_ID || "clx00000000000000000000000";
  const testClickId = clickId || process.env.TEST_CLICK_ID;
  const testCustomerId = customerExternalId || `customer-${Date.now()}`;
  const saleAmount = amount ? parseFloat(amount) : 99.99;
  const invoiceId = `invoice-${Date.now()}`;

  const payload: {
    workspaceId: string;
    customerExternalId: string;
    amount: number;
    currency: string;
    invoiceId: string;
    clickId?: string;
    idempotencyKey?: string;
    paymentProcessor?: string;
    metadata?: Record<string, unknown>;
  } = {
    workspaceId,
    customerExternalId: testCustomerId,
    amount: saleAmount,
    currency: "USD",
    invoiceId,
    idempotencyKey: invoiceId, // Use invoiceId as idempotency key
    paymentProcessor: "stripe",
    metadata: {
      source: "e2e-test",
      timestamp: new Date().toISOString(),
    },
  };

  if (testClickId) {
    payload.clickId = testClickId;
    console.log(`Using clickId: ${testClickId}`);
  } else {
    console.log("⚠️  No clickId provided - sale will not be attributed to a click");
  }

  console.log("Tracking sale...", payload);

  try {
    const response = await fetch(`${API_URL}/track/sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    
    if (result.duplicate) {
      console.log("⚠️  Sale already exists (idempotent):", result.id);
    } else {
      console.log("✅ Sale tracked:", result.id);
      console.log(`   Amount: ${saleAmount} USD`);
      console.log(`   Invoice: ${invoiceId}`);
    }

    console.log("\n💡 Check your database for the SaleEvent entry");
    return result;
  } catch (error) {
    console.error("❌ Failed to track sale:", error);
    process.exit(1);
  }
}

const clickId = process.argv[2];
const customerId = process.argv[3];
const amount = process.argv[4];
trackSale(clickId, customerId, amount);


