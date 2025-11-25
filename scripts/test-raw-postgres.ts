#!/usr/bin/env tsx
/**
 * Test de connexion PostgreSQL brute (sans Prisma)
 */

const dotenv = require("dotenv");
dotenv.config({ path: require("path").resolve(process.cwd(), ".env") });

async function testRawConnection() {
  console.log("🔍 Testing raw PostgreSQL connection...\n");

  const testUrls = [
    { name: "DATABASE_URL", url: process.env.DATABASE_URL },
    { name: "DIRECT_URL", url: process.env.DIRECT_URL },
  ];

  for (const { name, url } of testUrls) {
    if (!url) continue;

    console.log(`\n1️⃣ Testing ${name}...`);
    
    try {
      // Try using pg library directly
      const { Client } = await import("pg");
      const client = new Client({ connectionString: url });
      
      await client.connect();
      console.log(`   ✅ ${name} - Connection successful!`);
      
      const result = await client.query('SELECT COUNT(*) as count FROM "Workspace"');
      console.log(`   📊 Workspaces: ${result.rows[0].count}`);
      
      await client.end();
      console.log(`\n🎉 SUCCESS with ${name}!`);
      return true;
    } catch (error: any) {
      console.log(`   ❌ ${name} failed: ${error.message?.substring(0, 100)}`);
    }
  }

  console.log("\n❌ All raw connections failed");
  return false;
}

testRawConnection();

