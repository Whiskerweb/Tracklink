#!/usr/bin/env tsx
/**
 * Seed script: Create test workspace and domain
 * 
 * Usage: pnpm tsx scripts/seed-test-data.ts
 * 
 * This creates a test workspace and domain that can be used for E2E testing.
 */

import { prisma } from "../packages/shared/src/db";

async function seed() {
  console.log("🌱 Seeding test data...");

  try {
    // Create workspace
    const workspace = await prisma.workspace.upsert({
      where: { id: "clx00000000000000000000000" },
      update: {},
      create: {
        id: "clx00000000000000000000000",
        name: "Test Workspace",
      },
    });

    console.log("✅ Workspace created:", workspace.id);

    // Create domain
    const domain = await prisma.domain.upsert({
      where: {
        workspaceId_host: {
          workspaceId: workspace.id,
          host: "localhost",
        },
      },
      update: {},
      create: {
        id: "clx00000000000000000000001",
        workspaceId: workspace.id,
        host: "localhost",
        verified: true,
      },
    });

    console.log("✅ Domain created:", domain.id);
    console.log("\n📋 Test IDs (add to .env):");
    console.log(`   TEST_WORKSPACE_ID="${workspace.id}"`);
    console.log(`   TEST_DOMAIN_ID="${domain.id}"`);
    console.log("\n✨ Seed complete!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();


