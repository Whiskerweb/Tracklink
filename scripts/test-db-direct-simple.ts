#!/usr/bin/env tsx
/**
 * Test simple avec DIRECT_URL
 */

const dotenv = require("dotenv");
dotenv.config({ path: require("path").resolve(process.cwd(), ".env") });

async function test() {
  if (!process.env.DIRECT_URL) {
    console.error("❌ DIRECT_URL not found");
    process.exit(1);
  }

  console.log("🔍 Testing DIRECT_URL (port 5432)...\n");

  try {
    // Use Prisma from the shared package
    const { PrismaClient } = await import("../packages/shared/node_modules/.prisma/client");
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DIRECT_URL,
        },
      },
    });

    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ DIRECT_URL works! Port 5432 is accessible.");
    
    const count = await prisma.workspace.count();
    console.log(`📊 Found ${count} workspace(s)`);
    
    await prisma.$disconnect();
  } catch (error: any) {
    console.error("❌ DIRECT_URL also failed");
    console.error("Error:", error.message?.substring(0, 200));
    
    if (error.message?.includes("Can't reach database server")) {
      console.error("\n💡 Both ports (6543 and 5432) are blocked.");
      console.error("   This confirms the IP restriction is the issue.");
    }
    
    process.exit(1);
  }
}

test();

