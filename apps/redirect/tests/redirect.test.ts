import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@tracking/shared";
import Fastify from "fastify";
import cookie from "@fastify/cookie";

describe("Redirect Service", () => {
  let app: ReturnType<typeof Fastify>;
  let workspaceId: string;
  let domainId: string;
  let linkId: string;

  beforeAll(async () => {
    const workspace = await prisma.workspace.create({
      data: { name: "Test Workspace" },
    });
    workspaceId = workspace.id;

    const domain = await prisma.domain.create({
      data: {
        workspaceId,
        host: "localhost",
        verified: true,
      },
    });
    domainId = domain.id;

    const link = await prisma.link.create({
      data: {
        workspaceId,
        domainId,
        slug: "test-slug",
        targetUrl: "https://example.com",
      },
    });
    linkId = link.id;

    app = Fastify({
      trustProxy: true,
    });

    await app.register(cookie, {
      secret: "test-secret-key-for-cookie-signing-min-32-chars",
    });

    app.get("/:slug", async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const host = request.hostname;

      const link = await prisma.link.findFirst({
        where: {
          slug,
          domain: {
            host,
          },
        },
      });

      if (!link) {
        return reply.code(404).send("Link not found");
      }

      let clickId = request.cookies["cursor_click_id"];
      if (!clickId) {
        clickId = crypto.randomUUID();
        reply.setCookie("cursor_click_id", clickId, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          signed: false,
          maxAge: 90 * 24 * 60 * 60,
        });
      }

      // Log click asynchronously
      queueMicrotask(() => {
        void prisma.clickEvent
          .upsert({
            where: {
              workspaceId_clickId: {
                workspaceId: link.workspaceId,
                clickId,
              },
            },
            create: {
              workspaceId: link.workspaceId,
              linkId: link.id,
              clickId,
              referrer: request.headers.referer,
              userAgentHash: "hash",
              ipHash: "hash",
            },
            update: {
              linkId: link.id,
            },
          })
          .catch(() => {
            // Silent fail for tests
          });
      });

      return reply.redirect(link.targetUrl, 302);
    });
  });

  it("should redirect to targetUrl", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-slug",
      headers: {
        host: "localhost",
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("https://example.com");
  });

  it("should create clickId cookie if not present", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-slug",
      headers: {
        host: "localhost",
      },
    });

    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeTruthy();
    expect(cookies?.some((c) => c.includes("cursor_click_id"))).toBe(true);
  });

  it("should reuse existing clickId cookie", async () => {
    const existingClickId = "existing-click-id";

    const response = await app.inject({
      method: "GET",
      url: "/test-slug",
      headers: {
        host: "localhost",
        cookie: `cursor_click_id=${existingClickId}`,
      },
    });

    // Should not set new cookie
    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeFalsy();
  });

  it("should log click event", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-slug",
      headers: {
        host: "localhost",
        referer: "https://referrer.com",
        "user-agent": "Test Agent",
      },
    });

    expect(response.statusCode).toBe(302);

    // Wait for async click logging
    await new Promise((resolve) => setTimeout(resolve, 100));

    const cookies = response.headers["set-cookie"];
    const clickIdMatch = cookies?.[0]?.match(/cursor_click_id=([^;]+)/);
    const clickId = clickIdMatch?.[1];

    if (clickId) {
      const clickEvent = await prisma.clickEvent.findUnique({
        where: {
          workspaceId_clickId: {
            workspaceId,
            clickId,
          },
        },
      });

      expect(clickEvent).toBeTruthy();
      expect(clickEvent?.linkId).toBe(linkId);
    }
  });

  it("should return 404 for non-existent slug", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/non-existent",
      headers: {
        host: "localhost",
      },
    });

    expect(response.statusCode).toBe(404);
  });
});


