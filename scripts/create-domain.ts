#!/usr/bin/env tsx
/**
 * Script pour créer un domaine dans la base de données
 * 
 * Usage: pnpm tsx scripts/create-domain.ts [workspaceId] [host]
 * 
 * Exemple: pnpm tsx scripts/create-domain.ts clx00000000000000000000000 mon-domaine.com
 */

import { env } from "../apps/api/src/env";

const API_URL = `http://localhost:${env.API_PORT}`;

async function createDomain() {
  const workspaceId = process.argv[2] || process.env.TEST_WORKSPACE_ID || "clx00000000000000000000000";
  const host = process.argv[3];

  if (!host) {
    console.error("❌ Usage: pnpm tsx scripts/create-domain.ts [workspaceId] [host]");
    console.error("   Exemple: pnpm tsx scripts/create-domain.ts clx00000000000000000000000 mon-domaine.com");
    process.exit(1);
  }

  const payload = {
    workspaceId,
    host,
    verified: false, // À mettre à true après configuration DNS
  };

  console.log("Creating domain...", payload);

  try {
    const response = await fetch(`${API_URL}/domains`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const domain = await response.json();
    console.log("✅ Domain created:", domain);
    console.log("\n📋 Next steps:");
    console.log("1. Configure DNS at OVH to point to your server IP");
    console.log("2. Wait for DNS propagation (5-30 minutes)");
    console.log("3. Verify the domain:");
    console.log(`   curl -X PATCH "${API_URL}/domains/${domain.id}" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"verified": true}'`);
    console.log("\n💡 Domain ID:", domain.id);
    console.log("💡 Host:", domain.host);

    return domain;
  } catch (error) {
    console.error("❌ Failed to create domain:", error);
    process.exit(1);
  }
}

createDomain();


