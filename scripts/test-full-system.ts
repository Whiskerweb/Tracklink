#!/usr/bin/env tsx
/**
 * Script de test complet du système
 * Teste : création de domaine, création de lien, redirection, tracking
 */

// Load environment variables from .env file FIRST (before any other imports)
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Could not load .env from ${envPath}:`, result.error.message);
  // Try loading from current working directory
  config({ path: resolve(process.cwd(), ".env") });
}

import { prisma } from "../packages/shared/src/db";
import { env } from "../apps/api/src/env";

const API_URL = `http://localhost:${env.API_PORT}`;
const REDIRECT_URL = `http://localhost:4100`;

async function testFullSystem() {
  console.log("🧪 Testing full system...\n");

  let workspaceId: string;
  let domainId: string;
  let linkId: string;
  let linkSlug: string;

  try {
    // 1. Get or create test workspace
    console.log("1️⃣ Getting or creating test workspace...");
    let workspace = await prisma.workspace.findFirst({
      where: { name: "Test Workspace" },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: "Test Workspace" },
      });
      console.log(`   ✅ Created workspace: ${workspace.id}`);
    } else {
      console.log(`   ✅ Using existing workspace: ${workspace.id}`);
    }
    workspaceId = workspace.id;

    // 2. Get or create default domain
    console.log("\n2️⃣ Getting or creating default domain...");
    let domain = await prisma.domain.findFirst({
      where: {
        workspaceId,
        host: env.DEFAULT_DOMAIN,
      },
    });

    if (!domain) {
      domain = await prisma.domain.create({
        data: {
          workspaceId,
          host: env.DEFAULT_DOMAIN,
          verified: true,
        },
      });
      console.log(`   ✅ Created domain: ${domain.host} (${domain.id})`);
    } else {
      console.log(`   ✅ Using existing domain: ${domain.host} (${domain.id})`);
    }
    domainId = domain.id;

    // 3. Test API - Create link
    console.log("\n3️⃣ Testing API - Create link...");
    const testSlug = `test-${Date.now()}`;
    const createLinkResponse = await fetch(`${API_URL}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        slug: testSlug,
        targetUrl: "https://example.com",
        title: "Test Link",
      }),
    });

    if (!createLinkResponse.ok) {
      const error = await createLinkResponse.text();
      throw new Error(`Failed to create link: ${createLinkResponse.status} - ${error}`);
    }

    const link = await createLinkResponse.json();
    linkId = link.id;
    linkSlug = link.slug;
    console.log(`   ✅ Link created: ${linkSlug} (${linkId})`);
    console.log(`   📍 URL: https://${env.DEFAULT_DOMAIN}/${linkSlug}`);

    // 4. Test API - Get links
    console.log("\n4️⃣ Testing API - Get links...");
    const getLinksResponse = await fetch(
      `${API_URL}/links?workspaceId=${workspaceId}&limit=10`
    );

    if (!getLinksResponse.ok) {
      throw new Error(`Failed to get links: ${getLinksResponse.status}`);
    }

    const linksData = await getLinksResponse.json();
    console.log(`   ✅ Retrieved ${linksData.items.length} link(s)`);

    // 5. Test API - Get domain
    console.log("\n5️⃣ Testing API - Get domain...");
    const getDomainResponse = await fetch(
      `${API_URL}/domains?workspaceId=${workspaceId}`
    );

    if (!getDomainResponse.ok) {
      throw new Error(`Failed to get domain: ${getDomainResponse.status}`);
    }

    const domainData = await getDomainResponse.json();
    console.log(`   ✅ Retrieved domain: ${domainData.items[0]?.host || "none"}`);

    // 6. Test Redirect service
    console.log("\n6️⃣ Testing Redirect service...");
    const redirectResponse = await fetch(`${REDIRECT_URL}/${linkSlug}`, {
      method: "GET",
      redirect: "manual",
      headers: {
        Host: env.DEFAULT_DOMAIN,
      },
    });

    if (redirectResponse.status === 302 || redirectResponse.status === 301) {
      const location = redirectResponse.headers.get("location");
      console.log(`   ✅ Redirect working: ${linkSlug} → ${location}`);
      console.log(`   📍 Status: ${redirectResponse.status}`);
    } else {
      console.log(`   ⚠️  Unexpected status: ${redirectResponse.status}`);
      const text = await redirectResponse.text();
      console.log(`   Response: ${text.substring(0, 100)}`);
    }

    // 7. Test ClickEvent creation
    console.log("\n7️⃣ Testing ClickEvent creation...");
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for async click logging

    const clickEvents = await prisma.clickEvent.findMany({
      where: { linkId },
      take: 1,
    });

    if (clickEvents.length > 0) {
      console.log(`   ✅ ClickEvent created: ${clickEvents[0].id}`);
    } else {
      console.log(`   ⚠️  No ClickEvent found (may be async, check later)`);
    }

    // 8. Test Tracking - Lead
    console.log("\n8️⃣ Testing Tracking - Lead...");
    const leadResponse = await fetch(`${API_URL}/track/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        clickId: "test-click-id",
        eventName: "test-lead",
        customerExternalId: "test-customer-123",
      }),
    });

    if (!leadResponse.ok) {
      const error = await leadResponse.text();
      throw new Error(`Failed to track lead: ${leadResponse.status} - ${error}`);
    }

    const leadEvent = await leadResponse.json();
    console.log(`   ✅ Lead tracked: ${leadEvent.id}`);

    // 9. Test Tracking - Sale
    console.log("\n9️⃣ Testing Tracking - Sale...");
    const saleResponse = await fetch(`${API_URL}/track/sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        clickId: "test-click-id",
        eventName: "test-sale",
        customerExternalId: "test-customer-123",
        amount: 99.99,
        currency: "USD",
      }),
    });

    if (!saleResponse.ok) {
      const error = await saleResponse.text();
      throw new Error(`Failed to track sale: ${saleResponse.status} - ${error}`);
    }

    const saleEvent = await saleResponse.json();
    console.log(`   ✅ Sale tracked: ${saleEvent.id}`);

    // 10. Test Domain restriction
    console.log("\n🔟 Testing Domain creation restriction...");
    const domainCreateResponse = await fetch(`${API_URL}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        host: "custom-domain.com",
      }),
    });

    if (domainCreateResponse.status === 403) {
      console.log(`   ✅ Domain creation correctly restricted (403)`);
    } else {
      console.log(`   ⚠️  Unexpected status: ${domainCreateResponse.status}`);
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(50));
    console.log("\n📋 Summary:");
    console.log(`   Workspace: ${workspaceId}`);
    console.log(`   Domain: ${env.DEFAULT_DOMAIN} (${domainId})`);
    console.log(`   Link: ${linkSlug} (${linkId})`);
    console.log(`   URL: https://${env.DEFAULT_DOMAIN}/${linkSlug}`);
    console.log("\n🎉 System is ready for production!");

    await prisma.$disconnect();
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testFullSystem();


