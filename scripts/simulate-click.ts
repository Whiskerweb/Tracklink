#!/usr/bin/env tsx
/**
 * E2E Test Script: Simulate a click on a link
 * 
 * Usage: pnpm tsx scripts/simulate-click.ts [slug]
 * 
 * Prerequisites:
 * - Redirect server running on port 4100
 * - Link must exist (run create-link.ts first)
 */

import { env } from "../apps/redirect/src/env";

const REDIRECT_URL = `http://localhost:${env.REDIRECT_PORT}`;

async function simulateClick(slug?: string) {
  const linkSlug = slug || process.env.TEST_LINK_SLUG;

  if (!linkSlug) {
    console.error("❌ No slug provided. Set TEST_LINK_SLUG or pass as argument.");
    process.exit(1);
  }

  console.log(`Simulating click on slug: ${linkSlug}`);

  try {
    // Simulate a browser request with headers
    const response = await fetch(`${REDIRECT_URL}/${linkSlug}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) TestBot/1.0",
        "Referer": "https://example.com/referrer",
      },
      redirect: "manual", // Don't follow redirect, just check status
    });

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("Location");
      const cookies = response.headers.get("Set-Cookie");
      
      console.log("✅ Redirect successful!");
      console.log(`   Status: ${response.status}`);
      console.log(`   Location: ${location}`);
      
      if (cookies) {
        const clickIdMatch = cookies.match(/cursor_click_id=([^;]+)/);
        if (clickIdMatch) {
          const clickId = clickIdMatch[1];
          console.log(`   Click ID (cookie): ${clickId}`);
          process.env.TEST_CLICK_ID = clickId;
        }
      }

      // Wait a bit for async click logging
      console.log("\n⏳ Waiting 1s for click event to be logged...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("✅ Click simulation complete!");
      console.log("\n💡 Check your database for the ClickEvent entry");
    } else {
      const text = await response.text();
      throw new Error(`Unexpected status ${response.status}: ${text}`);
    }
  } catch (error) {
    console.error("❌ Failed to simulate click:", error);
    process.exit(1);
  }
}

const slug = process.argv[2];
simulateClick(slug);


