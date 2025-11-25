import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@tracking/shared";
import Fastify from "fastify";
import { registerTrackingRoutes } from "../src/routes/tracking";

describe("Tracking Endpoints", () => {
  let app: ReturnType<typeof Fastify>;
  let workspaceId: string;
  let linkId: string;
  let clickId: string;

  beforeAll(async () => {
    const workspace = await prisma.workspace.create({
      data: { name: "Test Workspace" },
    });
    workspaceId = workspace.id;

    const domain = await prisma.domain.create({
      data: {
        workspaceId,
        host: "test.local",
        verified: true,
      },
    });

    const link = await prisma.link.create({
      data: {
        workspaceId,
        domainId: domain.id,
        slug: "test",
        targetUrl: "https://example.com",
      },
    });
    linkId = link.id;

    const click = await prisma.clickEvent.create({
      data: {
        workspaceId,
        linkId,
        clickId: "test-click-id",
        userAgentHash: "hash",
        ipHash: "hash",
      },
    });
    clickId = click.clickId;

    app = Fastify();
    await app.register(registerTrackingRoutes);
  });

  describe("Lead Tracking", () => {
    it("should track a lead successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/track/lead",
        payload: {
          workspaceId,
          clickId,
          customerExternalId: "customer-1",
          eventName: "signup",
          idempotencyKey: "lead-1",
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.id).toBeTruthy();
    });

    it("should be idempotent", async () => {
      const idempotencyKey = "lead-idempotent";

      const response1 = await app.inject({
        method: "POST",
        url: "/track/lead",
        payload: {
          workspaceId,
          clickId,
          customerExternalId: "customer-2",
          eventName: "signup",
          idempotencyKey,
        },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/track/lead",
        payload: {
          workspaceId,
          clickId,
          customerExternalId: "customer-2",
          eventName: "signup",
          idempotencyKey,
        },
      });

      expect(response1.statusCode).toBe(202);
      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.duplicate).toBe(true);
    });

    it("should prevent duplicate leads (workspace + eventName + customerExternalId)", async () => {
      const customerId = "customer-duplicate";

      await app.inject({
        method: "POST",
        url: "/track/lead",
        payload: {
          workspaceId,
          customerExternalId: customerId,
          eventName: "signup",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/track/lead",
        payload: {
          workspaceId,
          customerExternalId: customerId,
          eventName: "signup",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.duplicate).toBe(true);
    });
  });

  describe("Sale Tracking", () => {
    it("should track a sale successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/track/sale",
        payload: {
          workspaceId,
          clickId,
          customerExternalId: "customer-sale-1",
          amount: 99.99,
          currency: "USD",
          invoiceId: "invoice-1",
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.id).toBeTruthy();
    });

    it("should be idempotent with invoiceId", async () => {
      const invoiceId = "invoice-idempotent";

      const response1 = await app.inject({
        method: "POST",
        url: "/track/sale",
        payload: {
          workspaceId,
          customerExternalId: "customer-sale-2",
          amount: 50.0,
          currency: "USD",
          invoiceId,
        },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/track/sale",
        payload: {
          workspaceId,
          customerExternalId: "customer-sale-2",
          amount: 50.0,
          currency: "USD",
          invoiceId,
        },
      });

      expect(response1.statusCode).toBe(202);
      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.duplicate).toBe(true);
    });

    it("should attribute sale to click", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/track/sale",
        payload: {
          workspaceId,
          clickId,
          customerExternalId: "customer-attributed",
          amount: 100.0,
          currency: "USD",
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);

      const sale = await prisma.saleEvent.findUnique({
        where: { id: body.id },
      });

      expect(sale?.clickId).toBe(clickId);
    });
  });
});


