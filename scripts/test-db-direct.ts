#!/usr/bin/env tsx
/**
 * Script de test de connexion avec DIRECT_URL (port 5432)
 * Alternative au connection pooling (port 6543)
 */

// Load environment variables
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testDirectConnection() {
  console.log("🔍 Testing direct database connection (port 5432)...\n");

  if (!process.env.DIRECT_URL) {
    console.error("❌ DIRECT_URL not found in .env");
    console.error("   DIRECT_URL is required for direct connections (port 5432)");
    process.exit(1);
  }

  try {
    // Create a temporary Prisma client with DIRECT_URL
    const { PrismaClient } = await import("@prisma/client");
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DIRECT_URL,
        },
      },
    });

    console.log("1️⃣ Testing direct connection (port 5432)...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("   ✅ Direct connection successful!");

    console.log("\n2️⃣ Testing workspace query...");
    const workspaceCount = await prisma.workspace.count();
    console.log(`   ✅ Found ${workspaceCount} workspace(s)`);

    console.log("\n3️⃣ Testing domain query...");
    const domainCount = await prisma.domain.count();
    console.log(`   ✅ Found ${domainCount} domain(s)`);

    console.log("\n✅ Direct connection works!");
    console.log("\n💡 Note: Direct connection (5432) works, but pooling (6543) doesn't.");
    console.log("   This suggests the IP restriction might only apply to the pooler.");
    console.log("   Check Supabase settings for both connection types.");

    await prisma.$disconnect();
  } catch (error: any) {
    console.error("\n❌ Direct connection also failed!");
    console.error("\nError details:");
    console.error("  Message:", error.message);
    console.error("  Code:", error.code);

    if (error.message?.includes("Can't reach database server")) {
      console.error("\n🔧 Both connections failed. Possible issues:");
      console.error("  1. IP restriction applies to both ports");
      console.error("  2. Firewall blocking both ports");
      console.error("  3. Network connectivity issue");
      console.error("  4. Supabase project might be paused");
    }

    process.exit(1);
  }
}

testDirectConnection();

