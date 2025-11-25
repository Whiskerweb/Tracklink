#!/usr/bin/env tsx
/**
 * Test de connexion via l'API Supabase (contournement des restrictions IP)
 */

const dotenv = require("dotenv");
dotenv.config({ path: require("path").resolve(process.cwd(), ".env") });

async function testViaAPI() {
  console.log("🔍 Testing connection via Supabase API...\n");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found");
    console.error("   Using API requires service role key");
    return;
  }

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/Workspace?select=id,name&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API connection works!");
      console.log(`📊 Found ${data.length} workspace(s) via API`);
      console.log("\n💡 Solution: API works, but Prisma direct connection is blocked");
      console.log("   This confirms IP restrictions are blocking direct DB connections");
    } else {
      console.error(`❌ API failed: ${response.status} ${response.statusText}`);
    }
  } catch (error: any) {
    console.error("❌ API connection failed:", error.message);
  }
}

testViaAPI();

