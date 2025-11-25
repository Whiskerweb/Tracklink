#!/usr/bin/env tsx
/**
 * Script de test de connexion directe à la base de données
 */

// Load environment variables
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testConnection() {
  console.log("🔍 Testing database connection...\n");

  try {
    const { prisma } = await import("../packages/shared/src/db");

    console.log("1️⃣ Testing basic connection...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("   ✅ Connection successful!");

    console.log("\n2️⃣ Testing workspace query...");
    const workspaceCount = await prisma.workspace.count();
    console.log(`   ✅ Found ${workspaceCount} workspace(s)`);

    console.log("\n3️⃣ Testing domain query...");
    const domainCount = await prisma.domain.count();
    console.log(`   ✅ Found ${domainCount} domain(s)`);

    console.log("\n4️⃣ Testing link query...");
    const linkCount = await prisma.link.count();
    console.log(`   ✅ Found ${linkCount} link(s)`);

    console.log("\n✅ All database tests passed!");
    await prisma.$disconnect();
  } catch (error: any) {
    console.error("\n❌ Database connection failed!");
    console.error("\nError details:");
    console.error("  Message:", error.message);
    console.error("  Code:", error.code);

    if (error.message?.includes("Can't reach database server")) {
      console.error("\n🔧 Troubleshooting:");
      console.error("  1. Vérifiez que votre IP est bien whitelistée dans Supabase");
      console.error("     Dashboard > Settings > Database > Network Restrictions");
      console.error("  2. Attendez 1-2 minutes après avoir ajouté l'IP (propagation)");
      console.error("  3. Vérifiez que DATABASE_URL est correct dans .env");
      console.error("  4. Vérifiez que le port 6543 n'est pas bloqué par un firewall");
    }

    if (error.message?.includes("authentication")) {
      console.error("\n🔧 Troubleshooting:");
      console.error("  1. Vérifiez que le mot de passe dans DATABASE_URL est correct");
      console.error("  2. Vérifiez que les caractères spéciaux sont encodés (%40 pour @, etc.)");
    }

    process.exit(1);
  }
}

testConnection();

