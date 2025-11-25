import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Shared Prisma client singleton.
 * Prevents multiple instances in development (hot reload protection).
 * 
 * Note: Using DIRECT_URL by default because it works better with IP restrictions.
 * DIRECT_URL (port 5432) typically has fewer connection issues than DATABASE_URL (port 6543).
 */
function getDatabaseUrl(): string {
  // Try DATABASE_URL first (port 6543, pooling), then DIRECT_URL (port 5432)
  // This allows using the pooler which might have different restrictions
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
  
  if (!url) {
    throw new Error(
      "DATABASE_URL or DIRECT_URL must be set in environment variables"
    );
  }
  
  return url;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}


