import { CLICK_COOKIE_NAME } from "@tracking/shared";

type TrackEventType = "lead" | "sale" | "click";

type AttributionModel = "first" | "last";

interface TrackingInitOptions {
  apiBaseUrl: string;
  workspaceId: string;
  cookieName?: string;
  queryParamKeys?: string[];
  debug?: boolean;
  attributionModel?: AttributionModel;
  retryAttempts?: number;
  retryDelay?: number;
  enableOfflineQueue?: boolean;
}

interface CursorTrackPayload {
  workspaceId: string;
  [key: string]: unknown;
}

interface QueuedEvent {
  type: TrackEventType;
  payload: CursorTrackPayload;
  timestamp: number;
  attempts: number;
}

const DEFAULT_QUERY_KEYS = ["dub_id", "via", "cursor_id"];
const STORAGE_KEY = "cursor_tracking_queue";
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const BACKOFF_MULTIPLIER = 2;

let currentOptions: TrackingInitOptions | null = null;
let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

// Listen to online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    processQueue();
  });
  window.addEventListener("offline", () => {
    isOnline = false;
  });
}

export function initTracking(options: TrackingInitOptions): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  currentOptions = {
    cookieName: CLICK_COOKIE_NAME,
    queryParamKeys: DEFAULT_QUERY_KEYS,
    debug: false,
    attributionModel: "last",
    retryAttempts: MAX_RETRY_ATTEMPTS,
    retryDelay: DEFAULT_RETRY_DELAY,
    enableOfflineQueue: true,
    ...options,
  };

  const clickId = resolveClickId();
  if (clickId) {
    persistClickId(clickId);
  }

  if (!("cursorTrack" in window)) {
    window.cursorTrack = cursorTrack;
  }

  // Process any queued events
  if (currentOptions.enableOfflineQueue) {
    processQueue();
  }

  // Auto-collect page data
  if (currentOptions.debug) {
    log("Tracking initialized", { options: currentOptions });
  }
}

export async function cursorTrack(
  event: TrackEventType,
  payload: CursorTrackPayload
): Promise<Response | null> {
  if (!currentOptions) {
    throw new Error("cursorTrack called before initTracking");
  }

  const enrichedPayload = enrichPayload(payload);
  const compressedPayload = compressPayload(enrichedPayload);

  if (currentOptions.debug) {
    log(`Tracking ${event}`, { payload: compressedPayload });
  }

  try {
    const response = await sendWithRetry(event, compressedPayload);
    return response;
  } catch (error) {
    if (currentOptions.debug) {
      log(`Failed to track ${event}`, { error });
    }

    // Queue for offline processing
    if (currentOptions.enableOfflineQueue && !isOnline) {
      queueEvent(event, compressedPayload);
      return null;
    }

    throw error;
  }
}

async function sendWithRetry(
  event: TrackEventType,
  payload: CursorTrackPayload,
  attempt = 1
): Promise<Response> {
  const maxAttempts = currentOptions?.retryAttempts ?? MAX_RETRY_ATTEMPTS;
  const baseDelay = currentOptions?.retryDelay ?? DEFAULT_RETRY_DELAY;

  try {
    const clickId = getStoredClickId();
    const response = await fetch(`${currentOptions!.apiBaseUrl}/track/${event}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        clickId,
      }),
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  } catch (error) {
    if (attempt < maxAttempts) {
      const delay = baseDelay * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
      if (currentOptions?.debug) {
        log(`Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms`, { error });
      }
      await sleep(delay);
      return sendWithRetry(event, payload, attempt + 1);
    }
    throw error;
  }
}

function enrichPayload(payload: CursorTrackPayload): CursorTrackPayload {
  const enriched: CursorTrackPayload = { ...payload };

  // Auto-collect referrer
  if (typeof document !== "undefined" && document.referrer) {
    enriched.referrer = document.referrer;
  }

  // Auto-collect UTM parameters
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const utmParams: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      if (key.startsWith("utm_")) {
        utmParams[key] = value;
      }
    }
    if (Object.keys(utmParams).length > 0) {
      enriched.utm = utmParams;
    }
  }

  // Auto-collect device hints
  if (typeof navigator !== "undefined") {
    enriched.device = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: {
        width: window.screen?.width,
        height: window.screen?.height,
      },
    };
  }

  // Add attribution model
  if (currentOptions?.attributionModel) {
    enriched.attributionModel = currentOptions.attributionModel;
  }

  return enriched;
}

function compressPayload(payload: CursorTrackPayload): CursorTrackPayload {
  // Remove undefined/null values and compact JSON
  const compressed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      compressed[key] = value;
    }
  }
  return compressed as CursorTrackPayload;
}

function queueEvent(event: TrackEventType, payload: CursorTrackPayload): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    const queue = getQueue();
    queue.push({
      type: event,
      payload,
      timestamp: Date.now(),
      attempts: 0,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    if (currentOptions?.debug) {
      log("Event queued for offline processing", { event, queueLength: queue.length });
    }
  } catch (error) {
    if (currentOptions?.debug) {
      log("Failed to queue event", { error });
    }
  }
}

async function processQueue(): Promise<void> {
  if (!currentOptions?.enableOfflineQueue || typeof localStorage === "undefined") {
    return;
  }

  const queue = getQueue();
  if (queue.length === 0) {
    return;
  }

  if (currentOptions.debug) {
    log(`Processing queue with ${queue.length} events`);
  }

  const processed: QueuedEvent[] = [];
  const failed: QueuedEvent[] = [];

  for (const event of queue) {
    try {
      await sendWithRetry(event.type, event.payload, event.attempts + 1);
      processed.push(event);
    } catch (error) {
      if (event.attempts < (currentOptions.retryAttempts ?? MAX_RETRY_ATTEMPTS)) {
        event.attempts++;
        failed.push(event);
      } else {
        // Max attempts reached, remove from queue
        if (currentOptions.debug) {
          log("Event failed after max attempts, removing from queue", { event });
        }
      }
    }
  }

  // Update queue with failed events
  if (failed.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(failed));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }

  if (currentOptions.debug && processed.length > 0) {
    log(`Processed ${processed.length} queued events`);
  }
}

function getQueue(): QueuedEvent[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function resolveClickId(): string | null {
  const fromQuery = extractFromQuery();
  if (fromQuery) {
    return fromQuery;
  }
  const stored = getStoredClickId();
  if (stored) {
    return stored;
  }
  return crypto.randomUUID();
}

function extractFromQuery(): string | null {
  if (!currentOptions || typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  for (const key of currentOptions.queryParamKeys ?? DEFAULT_QUERY_KEYS) {
    const value = params.get(key);
    if (value) {
      return value;
    }
  }
  return null;
}

function persistClickId(clickId: string): void {
  if (!currentOptions || typeof document === "undefined") {
    return;
  }
  const cookieName = currentOptions.cookieName ?? CLICK_COOKIE_NAME;
  document.cookie = `${cookieName}=${clickId}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
}

function getStoredClickId(): string | null {
  if (!currentOptions || typeof document === "undefined") {
    return null;
  }
  const cookieName = currentOptions.cookieName ?? CLICK_COOKIE_NAME;
  const match = document.cookie.match(new RegExp(`(?:^| )${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string, data?: unknown): void {
  if (currentOptions?.debug) {
    console.log(`[CursorTracking] ${message}`, data || ""); // eslint-disable-line no-console
  }
}

declare global {
  interface Window {
    cursorTrack: typeof cursorTrack;
  }
}
