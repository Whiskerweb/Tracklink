import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@tracking/shared";
import Fastify from "fastify";
import { registerLinkRoutes } from "../src/routes/links";

describe("Link Creation", () => {
  let app: ReturnType<typeof Fastify>;
  let workspaceId: string;
  let domainId: string;

  beforeAll(async () => {
    // Create test workspace and domain
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
    domainId = domain.id;

    app = Fastify();
    await app.register(registerLinkRoutes);
  });

  it("should create a link successfully", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/links",
      payload: {
        workspaceId,
        domainId,
        slug: "test-link",
        targetUrl: "https://example.com",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.slug).toBe("test-link");
    expect(body.targetUrl).toBe("https://example.com");
  });

  it("should reject duplicate slug", async () => {
    await app.inject({
      method: "POST",
      url: "/links",
      payload: {
        workspaceId,
        domainId,
        slug: "duplicate",
        targetUrl: "https://example.com",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/links",
      payload: {
        workspaceId,
        domainId,
        slug: "duplicate",
        targetUrl: "https://example.com",
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("should validate required fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/links",
      payload: {
        workspaceId,
        // Missing domainId and slug
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should list links with pagination", async () => {
    // Create multiple links
    for (let i = 0; i < 5; i++) {
      await prisma.link.create({
        data: {
          workspaceId,
          domainId,
          slug: `link-${i}`,
          targetUrl: "https://example.com",
        },
      });
    }

    const response = await app.inject({
      method: "GET",
      url: `/links?workspaceId=${workspaceId}&limit=3`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(3);
    expect(body.nextCursor).toBeTruthy();
  });
});


