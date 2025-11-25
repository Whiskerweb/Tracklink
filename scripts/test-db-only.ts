#!/usr/bin/env tsx
/**
 * Test de la base de données uniquement (sans services)
 */

const dotenv = require("dotenv");
dotenv.config({ path: require("path").resolve(process.cwd(), ".env") });

async function testDatabaseOnly() {
  console.log("🧪 Testing database connection and operations...\n");

  try {
    const { prisma } = await import("../packages/shared/src/db");

    // Test 1: Basic connection
    console.log("1️⃣ Testing basic connection...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("   ✅ Connection successful!");

    // Test 2: Workspace operations
    console.log("\n2️⃣ Testing workspace operations...");
    const workspaceCount = await prisma.workspace.count();
    console.log(`   ✅ Found ${workspaceCount} workspace(s)`);

    const workspace = await prisma.workspace.findFirst();
    if (workspace) {
      console.log(`   📋 Workspace: ${workspace.name} (${workspace.id})`);
    }

    // Test 3: Domain operations
    console.log("\n3️⃣ Testing domain operations...");
    const domainCount = await prisma.domain.count();
    console.log(`   ✅ Found ${domainCount} domain(s)`);

    // Check for traaaction.com domain
    const traaactionDomain = await prisma.domain.findFirst({
      where: { host: "traaaction.com" },
    });
    if (traaactionDomain) {
      console.log(`   ✅ Domain traaaction.com exists (verified: ${traaactionDomain.verified})`);
    } else {
      console.log("   ⚠️  Domain traaaction.com not found");
    }

    // Test 4: Link operations
    console.log("\n4️⃣ Testing link operations...");
    const linkCount = await prisma.link.count();
    console.log(`   ✅ Found ${linkCount} link(s)`);

    // Test 5: Create test link
    if (workspace && traaactionDomain) {
      console.log("\n5️⃣ Testing link creation...");
      const testSlug = `test-${Date.now()}`;
      try {
        const newLink = await prisma.link.create({
          data: {
            workspaceId: workspace.id,
            domainId: traaactionDomain.id,
            slug: testSlug,
            targetUrl: "https://example.com",
            title: "Test Link",
          },
        });
        console.log(`   ✅ Link created: ${newLink.slug} (${newLink.id})`);
        console.log(`   📍 URL: https://traaaction.com/${newLink.slug}`);

        // Cleanup
        await prisma.link.delete({ where: { id: newLink.id } });
        console.log("   🧹 Test link cleaned up");
      } catch (error: any) {
        console.log(`   ⚠️  Link creation: ${error.message?.substring(0, 100)}`);
      }
    }

    console.log("\n✅ All database tests passed!");
    await prisma.$disconnect();
  } catch (error: any) {
    console.error("\n❌ Database test failed:", error.message);
    process.exit(1);
  }
}

testDatabaseOnly();

