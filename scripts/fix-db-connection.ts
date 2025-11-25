#!/usr/bin/env tsx
/**
 * Script pour tester et corriger la connexion à la base de données
 */

const dotenv = require("dotenv");
dotenv.config({ path: require("path").resolve(process.cwd(), ".env") });

async function testConnection() {
  console.log("🔍 Testing database connections...\n");

  // Test 1: DATABASE_URL (port 6543)
  if (process.env.DATABASE_URL) {
    console.log("1️⃣ Testing DATABASE_URL (port 6543)...");
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma1 = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } },
      });
      await prisma1.$queryRaw`SELECT 1`;
      console.log("   ✅ DATABASE_URL works!");
      await prisma1.$disconnect();
      return;
    } catch (error: any) {
      console.log(`   ❌ DATABASE_URL failed: ${error.message?.substring(0, 100)}`);
    }
  }

  // Test 2: DIRECT_URL (port 5432)
  if (process.env.DIRECT_URL) {
    console.log("\n2️⃣ Testing DIRECT_URL (port 5432)...");
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma2 = new PrismaClient({
        datasources: { db: { url: process.env.DIRECT_URL } },
      });
      await prisma2.$queryRaw`SELECT 1`;
      console.log("   ✅ DIRECT_URL works!");
      
      const count = await prisma2.workspace.count();
      console.log(`   📊 Found ${count} workspace(s)`);
      
      await prisma2.$disconnect();
      console.log("\n💡 Solution: Use DIRECT_URL in your .env");
      console.log("   Temporarily replace DATABASE_URL with DIRECT_URL value");
      return;
    } catch (error: any) {
      console.log(`   ❌ DIRECT_URL failed: ${error.message?.substring(0, 100)}`);
    }
  }

  console.log("\n❌ Both connections failed!");
  console.log("\n🔧 Troubleshooting:");
  console.log("   1. Verify IP restrictions in Supabase (both ports)");
  console.log("   2. Check if password needs URL encoding");
  console.log("   3. Wait 5-10 minutes after changing restrictions");
  console.log("   4. Try removing restrictions temporarily for testing");
}

testConnection();

