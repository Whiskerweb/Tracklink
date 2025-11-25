#!/usr/bin/env tsx
/**
 * Script de vérification de l'état du système
 * Vérifie : services, base de données, endpoints
 */

// Load environment variables from .env file FIRST (before any other imports)
// Using require to ensure synchronous loading before ES imports
const dotenv = require("dotenv");
const path = require("path");

// Try multiple paths for .env file
const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
];

let loaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn("⚠️  Could not load .env file. Make sure .env exists in the project root.");
}

// Now import env after loading .env
import { env } from "../apps/api/src/env";

const API_URL = `http://localhost:${env.API_PORT}`;
const REDIRECT_URL = `http://localhost:4100`;

async function checkService(url: string, name: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.status < 500;
  } catch (error) {
    return false;
  }
}

async function testSystemStatus() {
  console.log("🔍 Checking system status...\n");

  const results: { name: string; status: boolean; message: string }[] = [];

  // 1. Check API service
  console.log("1️⃣ Checking API service...");
  const apiRunning = await checkService(`${API_URL}/health`, "API");
  if (apiRunning) {
    console.log("   ✅ API is running on port", env.API_PORT);
    results.push({ name: "API", status: true, message: `Running on port ${env.API_PORT}` });
  } else {
    console.log("   ❌ API is not running on port", env.API_PORT);
    results.push({
      name: "API",
      status: false,
      message: `Not running. Start with: pnpm --filter @tracking/api dev`,
    });
  }

  // 2. Check Redirect service
  console.log("\n2️⃣ Checking Redirect service...");
  try {
    const redirectResponse = await fetch(`${REDIRECT_URL}/test-404`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (redirectResponse.status === 404 || redirectResponse.status === 302) {
      console.log("   ✅ Redirect service is running on port 4100");
      results.push({
        name: "Redirect",
        status: true,
        message: "Running on port 4100",
      });
    } else {
      console.log("   ⚠️  Redirect service responded with unexpected status:", redirectResponse.status);
      results.push({
        name: "Redirect",
        status: true,
        message: `Running but unexpected status: ${redirectResponse.status}`,
      });
    }
  } catch (error) {
    console.log("   ❌ Redirect service is not running on port 4100");
    results.push({
      name: "Redirect",
      status: false,
      message: `Not running. Start with: pnpm --filter @tracking/redirect dev`,
    });
  }

  // 3. Check Database connection
  console.log("\n3️⃣ Checking Database connection...");
  try {
    const { prisma } = await import("../packages/shared/src/db");
    await prisma.$queryRaw`SELECT 1`;
    console.log("   ✅ Database connection successful");
    results.push({ name: "Database", status: true, message: "Connected to Supabase" });

    // Check if we can query workspaces
    const workspaceCount = await prisma.workspace.count();
    console.log(`   📊 Found ${workspaceCount} workspace(s) in database`);
  } catch (error: any) {
    console.log("   ❌ Database connection failed");
    console.log("   Error:", error.message?.substring(0, 100) || error);
    results.push({
      name: "Database",
      status: false,
      message: `Connection failed: ${error.message?.substring(0, 50) || "Unknown error"}`,
    });
  }

  // 4. Check Environment variables
  console.log("\n4️⃣ Checking Environment variables...");
  const requiredVars = ["DATABASE_URL", "HASH_SALT"];
  const optionalVars = ["DEFAULT_DOMAIN"];
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // Check optional vars
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      console.log(`   ℹ️  ${varName} not set (using default: traaaction.com)`);
    }
  }

  if (missingVars.length === 0) {
    console.log("   ✅ All required environment variables are set");
    results.push({
      name: "Environment",
      status: true,
      message: "All variables set",
    });
  } else {
    console.log("   ❌ Missing environment variables:", missingVars.join(", "));
    results.push({
      name: "Environment",
      status: false,
      message: `Missing: ${missingVars.join(", ")}`,
    });
  }

  // 5. Test API endpoints (if API is running)
  if (results.find((r) => r.name === "API" && r.status)) {
    console.log("\n5️⃣ Testing API endpoints...");

    // Test GET /domains
    try {
      const testWorkspaceId = "clx00000000000000000000000";
      const domainsResponse = await fetch(`${API_URL}/domains?workspaceId=${testWorkspaceId}`);
      if (domainsResponse.ok) {
        console.log("   ✅ GET /domains endpoint working");
      } else {
        console.log(`   ⚠️  GET /domains returned status: ${domainsResponse.status}`);
      }
    } catch (error) {
      console.log("   ❌ GET /domains endpoint failed");
    }

    // Test POST /links (will fail without valid workspace, but tests endpoint)
    try {
      const linksResponse = await fetch(`${API_URL}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: "test",
          slug: "test",
          targetUrl: "https://example.com",
        }),
      });
      if (linksResponse.status === 400 || linksResponse.status === 201) {
        console.log("   ✅ POST /links endpoint accessible");
      } else {
        console.log(`   ⚠️  POST /links returned status: ${linksResponse.status}`);
      }
    } catch (error) {
      console.log("   ❌ POST /links endpoint failed");
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 SYSTEM STATUS SUMMARY");
  console.log("=".repeat(50));

  const allGood = results.every((r) => r.status);
  const failed = results.filter((r) => !r.status);

  results.forEach((result) => {
    const icon = result.status ? "✅" : "❌";
    console.log(`${icon} ${result.name.padEnd(15)} ${result.message}`);
  });

  console.log("\n" + "=".repeat(50));

  if (allGood) {
    console.log("🎉 All systems operational!");
    console.log("\n💡 Next steps:");
    console.log("   1. Run: pnpm test:full (for full integration tests)");
    console.log("   2. Create a link: pnpm test:e2e:create-link");
    console.log("   3. Test redirect: curl http://localhost:4100/YOUR_SLUG");
  } else {
    console.log("⚠️  Some systems are not operational");
    console.log("\n🔧 To fix:");
    failed.forEach((result) => {
      console.log(`   - ${result.name}: ${result.message}`);
    });
    console.log("\n💡 Start services:");
    console.log("   pnpm dev  (starts both API and Redirect)");
  }

  console.log("=".repeat(50) + "\n");
}

testSystemStatus().catch(console.error);

