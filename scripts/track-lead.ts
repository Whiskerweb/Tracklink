#!/usr/bin/env tsx
/**
 * E2E Test Script: Track a lead event
 * 
 * Usage: pnpm tsx scripts/track-lead.ts [clickId] [customerExternalId]
 * 
 * Prerequisites:
 * - API server running on port 4000
 * - Workspace must exist
 * - Optional: clickId from simulate-click.ts
 */

import { env } from "../apps/api/src/env";

const API_URL = `http://localhost:${env.API_PORT}`;

async function trackLead(clickId?: string, customerExternalId?: string) {
  const workspaceId = process.env.TEST_WORKSPACE_ID || "clx00000000000000000000000";
  const testClickId = clickId || process.env.TEST_CLICK_ID;
  const testCustomerId = customerExternalId || `customer-${Date.now()}`;

  const payload: {
    workspaceId: string;
    customerExternalId: string;
    eventName: string;
    clickId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  } = {
    workspaceId,
    customerExternalId: testCustomerId,
    eventName: "signup",
    idempotencyKey: `lead-${testCustomerId}-${Date.now()}`,
    metadata: {
      source: "e2e-test",
      timestamp: new Date().toISOString(),
    },
  };

  if (testClickId) {
    payload.clickId = testClickId;
    console.log(`Using clickId: ${testClickId}`);
  } else {
    console.log("⚠️  No clickId provided - lead will not be attributed to a click");
  }

  console.log("Tracking lead...", payload);

  try {
    const response = await fetch(`${API_URL}/track/lead`, {
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
      console.log("⚠️  Lead already exists (idempotent):", result.id);
    } else {
      console.log("✅ Lead tracked:", result.id);
    }

    console.log("\n💡 Check your database for the LeadEvent entry");
    return result;
  } catch (error) {
    console.error("❌ Failed to track lead:", error);
    process.exit(1);
  }
}

const clickId = process.argv[2];
const customerId = process.argv[3];
trackLead(clickId, customerId);


