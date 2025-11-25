import { prisma } from "@tracking/shared";

interface EnsureIdempotentParams {
  workspaceId: string;
  key?: string;
  eventType: string;
  resourceId: string;
}

export async function ensureIdempotent({
  workspaceId,
  key,
  eventType,
  resourceId,
}: EnsureIdempotentParams): Promise<{ alreadyProcessed: boolean; resourceId?: string }> {
  if (!key) {
    return { alreadyProcessed: false };
  }

  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      workspaceId_key_eventType: {
        workspaceId,
        key,
        eventType,
      },
    },
  });

  if (existing) {
    return { alreadyProcessed: true, resourceId: existing.resourceId };
  }

  await prisma.idempotencyKey.create({
    data: {
      workspaceId,
      key,
      eventType,
      resourceId,
    },
  });

  return { alreadyProcessed: false };
}

