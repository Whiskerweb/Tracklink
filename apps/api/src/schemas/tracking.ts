import { z } from "zod";

const metadataSchema = z.record(z.string(), z.unknown()).optional();

export const trackLeadSchema = z.object({
  workspaceId: z.string().cuid(),
  clickId: z.string().optional(),
  customerExternalId: z.string().min(1),
  eventName: z.string().min(1),
  metadata: metadataSchema,
  idempotencyKey: z.string().optional(),
});

export const trackSaleSchema = z.object({
  workspaceId: z.string().cuid(),
  clickId: z.string().optional(),
  customerExternalId: z.string().min(1),
  amount: z.number().finite(),
  currency: z.string().min(3).max(3),
  invoiceId: z.string().optional(),
  paymentProcessor: z.string().optional(),
  metadata: metadataSchema,
  idempotencyKey: z.string().optional(),
});

export type TrackLeadInput = z.infer<typeof trackLeadSchema>;
export type TrackSaleInput = z.infer<typeof trackSaleSchema>;


