#!/usr/bin/env tsx
/**
 * E2E Test Script: Create a link
 * 
 * Usage: pnpm tsx scripts/create-link.ts
 * 
 * Prerequisites:
 * - API server running on port 4000
 * - Workspace and domain must exist in DB
 */

import { env } from "../apps/api/src/env";

const API_URL = `http://localhost:${env.API_PORT}`;

async function createLink() {
  // You'll need to replace these with actual IDs from your Supabase DB
  const workspaceId = process.env.TEST_WORKSPACE_ID || "clx00000000000000000000000";
  // domainId is now optional - will use traaaction.com automatically

  const payload = {
    workspaceId,
    // domainId is optional - automatically uses traaaction.com
    slug: `test-${Date.now()}`,
    targetUrl: "https://example.com",
    trackConversion: true,
    title: "Test Link",
    description: "Created by E2E script",
    tags: ["test", "e2e"],
  };

  console.log("Creating link...", payload);

  try {
    const response = await fetch(`${API_URL}/links`, {
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

    const link = await response.json();
    console.log("✅ Link created:", link);
    console.log("\n📋 Link details:");
    console.log(`   ID: ${link.id}`);
    console.log(`   Slug: ${link.slug}`);
    console.log(`   URL: https://traaaction.com/${link.slug}`);
    console.log(`   Target: ${link.targetUrl}`);

    // Store link ID for next scripts
    process.env.TEST_LINK_ID = link.id;
    process.env.TEST_LINK_SLUG = link.slug;

    return link;
  } catch (error) {
    console.error("❌ Failed to create link:", error);
    process.exit(1);
  }
}

createLink();

