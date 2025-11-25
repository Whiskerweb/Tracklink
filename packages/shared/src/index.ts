export const CLICK_COOKIE_NAME = "cursor_click_id";
export const CLICK_COOKIE_TTL_DAYS = 90;

export type UUID = string;

// Re-export Prisma client for convenience
export { prisma } from "./db";
export type { PrismaClient } from "@prisma/client";
export { Prisma } from "@prisma/client";

// Re-export observability
export { observability, createObservabilityPlugin } from "./observability";
export type { LogContext, LogEntry } from "./observability";

export interface WorkspaceScoped {
  workspaceId: UUID;
}

export interface LinkRecord extends WorkspaceScoped {
  id: UUID;
  domainId: UUID;
  slug: string;
  targetUrl: string;
  trackConversion: boolean;
  metadata?: Record<string, unknown>;
}

export interface ClickEvent extends WorkspaceScoped {
  id: UUID;
  linkId: UUID;
  clickId: UUID;
  referrer?: string;
  userAgentHash: string;
  ipHash: string;
  country?: string;
  device?: string;
  partnerId?: UUID | null;
  partnerLinkId?: UUID | null;
  timestamp: Date;
}

export interface LeadEvent extends WorkspaceScoped {
  id: UUID;
  clickId: UUID;
  customerExternalId: string;
  eventName: string;
  metadata?: Record<string, unknown>;
  partnerId?: UUID | null;
  partnerLinkId?: UUID | null;
  timestamp: Date;
}

export interface SaleEvent extends WorkspaceScoped {
  id: UUID;
  clickId?: UUID | null;
  customerExternalId: string;
  amount: number;
  currency: string;
  invoiceId?: string | null;
  paymentProcessor?: string | null;
  metadata?: Record<string, unknown>;
  partnerId?: UUID | null;
  partnerLinkId?: UUID | null;
  timestamp: Date;
}

