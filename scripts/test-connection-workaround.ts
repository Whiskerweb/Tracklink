#!/usr/bin/env tsx
/**
 * Test de connexion avec différents workarounds
 */

const dotenv = require("dotenv");
dotenv.config({ path: require("path").resolve(process.cwd(), ".env") });

async function testWorkarounds() {
  console.log("🔍 Testing connection workarounds...\n");

  // Test 1: Try with connection string modifications
  console.log("1️⃣ Testing with connection string modifications...");
  
  if (process.env.DIRECT_URL) {
    const directUrl = process.env.DIRECT_URL;
    
    // Try removing sslmode=require
    const urlWithoutSSL = directUrl.replace("?sslmode=require", "");
    console.log("   Testing without sslmode requirement...");
    
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient({
        datasources: { db: { url: urlWithoutSSL } },
      });
      await prisma.$queryRaw`SELECT 1`;
      console.log("   ✅ Connection works without sslmode!");
      await prisma.$disconnect();
      return;
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message?.substring(0, 80)}`);
    }

    // Try with different SSL modes
    const sslModes = ["?sslmode=prefer", "?sslmode=allow", ""];
    for (const sslMode of sslModes) {
      const testUrl = directUrl.replace(/\?.*$/, "") + sslMode;
      console.log(`   Testing with ${sslMode || "no SSL param"}...`);
      try {
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient({
          datasources: { db: { url: testUrl } },
        });
        await prisma.$queryRaw`SELECT 1`;
        console.log(`   ✅ Connection works with ${sslMode || "no SSL"}!`);
        await prisma.$disconnect();
        console.log(`\n💡 Solution: Use this URL: ${testUrl.replace(/:[^:]*@/, ":***@")}`);
        return;
      } catch (error: any) {
        // Continue to next test
      }
    }
  }

  console.log("\n❌ All connection attempts failed");
  console.log("\n🔧 The issue is definitely network restrictions blocking direct connections");
  console.log("   You must remove restrictions in Supabase Dashboard manually");
}

testWorkarounds();

