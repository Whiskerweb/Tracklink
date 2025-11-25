#!/usr/bin/env tsx
/**
 * Script pour configurer le domaine de production traaaction.com
 * 
 * Usage: pnpm tsx scripts/setup-production-domain.ts [workspaceId]
 * 
 * Ce script :
 * 1. Crée le domaine traaaction.com pour le workspace
 * 2. Le marque comme vérifié
 * 3. Affiche les instructions DNS
 */

import { prisma } from "../packages/shared/src/db";

async function setupProductionDomain() {
  const workspaceId = process.argv[2] || process.env.TEST_WORKSPACE_ID;

  if (!workspaceId) {
    console.error("❌ Usage: pnpm tsx scripts/setup-production-domain.ts [workspaceId]");
    console.error("   Exemple: pnpm tsx scripts/setup-production-domain.ts clx00000000000000000000000");
    process.exit(1);
  }

  const domainHost = "traaaction.com";

  console.log(`🌐 Setting up production domain: ${domainHost}`);
  console.log(`   Workspace: ${workspaceId}\n`);

  try {
    // Check if workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      console.error(`❌ Workspace ${workspaceId} not found`);
      process.exit(1);
    }

    // Get or create domain
    let domain = await prisma.domain.findFirst({
      where: {
        workspaceId,
        host: domainHost,
      },
    });

    if (domain) {
      console.log("✅ Domain already exists");
      
      // Update to verified
      if (!domain.verified) {
        domain = await prisma.domain.update({
          where: { id: domain.id },
          data: { verified: true },
        });
        console.log("✅ Domain marked as verified");
      } else {
        console.log("✅ Domain already verified");
      }
    } else {
      domain = await prisma.domain.create({
        data: {
          workspaceId,
          host: domainHost,
          verified: true,
        },
      });
      console.log("✅ Domain created and verified");
    }

    console.log("\n📋 Domain Details:");
    console.log(`   ID: ${domain.id}`);
    console.log(`   Host: ${domain.host}`);
    console.log(`   Verified: ${domain.verified}`);
    console.log(`   Workspace: ${workspace.name}`);

    console.log("\n🔧 Next Steps - Configure DNS at OVH:");
    console.log("   1. Go to OVH Manager > Domaines > traaaction.com > Zone DNS");
    console.log("   2. Add/Update Type A record:");
    console.log("      - Sous-domaine: @ (or leave empty)");
    console.log("      - TTL: 3600");
    console.log("      - Cible: [YOUR_SERVER_IP]");
    console.log("   3. Wait for DNS propagation (5-30 minutes)");
    console.log("   4. Test with: curl -I https://traaaction.com/test");

    console.log("\n✨ All links will now use traaaction.com automatically!");
    console.log(`   Example: https://traaaction.com/your-slug`);

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Failed to setup domain:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

setupProductionDomain();


