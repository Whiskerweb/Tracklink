#!/usr/bin/env tsx
/**
 * Test des deux URLs de connexion
 */

const dotenv = require("dotenv");
dotenv.config({ path: require("path").resolve(process.cwd(), ".env") });

async function testBothUrls() {
  console.log("🔍 Testing both DATABASE_URL and DIRECT_URL...\n");

  const urls = [
    { name: "DATABASE_URL (port 6543)", url: process.env.DATABASE_URL },
    { name: "DIRECT_URL (port 5432)", url: process.env.DIRECT_URL },
  ];

  for (const { name, url } of urls) {
    if (!url) {
      console.log(`⏭️  ${name}: Not configured, skipping`);
      continue;
    }

    console.log(`\n1️⃣ Testing ${name}...`);
    console.log(`   Host: ${url.match(/@([^:]+):/)?.[1] || "unknown"}`);
    
    try {
      // Use Prisma from the shared package
      const prismaModule = await import("../packages/shared/src/db");
      // Create a new client with the test URL
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient({
        datasources: { db: { url } },
      });

      await prisma.$queryRaw`SELECT 1`;
      console.log(`   ✅ ${name} WORKS!`);
      
      const count = await prisma.workspace.count();
      console.log(`   📊 Found ${count} workspace(s)`);
      
      await prisma.$disconnect();
      console.log(`\n🎉 SUCCESS! Use ${name} for your connection`);
      return true;
    } catch (error: any) {
      const errorMsg = error.message?.substring(0, 150) || String(error);
      console.log(`   ❌ ${name} failed`);
      console.log(`   Error: ${errorMsg}`);
    }
  }

  console.log("\n❌ Both connections failed");
  console.log("\n💡 Possible causes:");
  console.log("   1. Restrictions not fully propagated (wait 5-10 more minutes)");
  console.log("   2. Firewall blocking ports locally");
  console.log("   3. Password encoding issue in URL");
  console.log("   4. Network connectivity issue");
  
  return false;
}

testBothUrls();

