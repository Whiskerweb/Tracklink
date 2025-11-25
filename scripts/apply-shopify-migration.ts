import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

async function main() {
  console.log("Applying ShopifyShop migration...");

  // Créer la table ShopifyShop
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "ShopifyShop" (
      "id" TEXT NOT NULL,
      "workspaceId" TEXT NOT NULL,
      "shopDomain" TEXT NOT NULL,
      "accessToken" TEXT NOT NULL,
      "scopes" TEXT,
      "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "uninstalledAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ShopifyShop_pkey" PRIMARY KEY ("id")
    )
  `;

  // Créer l'index unique sur shopDomain
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "ShopifyShop_shopDomain_key" ON "ShopifyShop"("shopDomain")
  `;

  // Créer l'index sur workspaceId
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "ShopifyShop_workspaceId_idx" ON "ShopifyShop"("workspaceId")
  `;

  // Créer l'index sur shopDomain
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "ShopifyShop_shopDomain_idx" ON "ShopifyShop"("shopDomain")
  `;

  // Ajouter la foreign key vers Workspace
  await prisma.$executeRaw`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ShopifyShop_workspaceId_fkey'
      ) THEN
        ALTER TABLE "ShopifyShop" 
        ADD CONSTRAINT "ShopifyShop_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") 
        REFERENCES "Workspace"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      END IF;
    END $$;
  `;

  console.log("✅ ShopifyShop migration applied successfully");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

