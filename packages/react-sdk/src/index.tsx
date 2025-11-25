import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { cursorTrack, initTracking, type TrackingInitOptions } from "@tracking/tracking-sdk";

interface AnalyticsProviderProps extends Omit<TrackingInitOptions, "workspaceId"> {
  workspaceId: string;
  children: React.ReactNode;
}

interface AnalyticsState {
  clickId: string | null;
  isInitialized: boolean;
  trackClick: (payload?: Record<string, unknown>) => Promise<void>;
  trackLead: (payload: { customerExternalId: string; eventName: string; [key: string]: unknown }) => Promise<void>;
  trackSale: (payload: { customerExternalId: string; amount: number; currency: string; [key: string]: unknown }) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsState | null>(null);

export function AnalyticsProvider({ workspaceId, children, ...options }: AnalyticsProviderProps) {
  const [clickId, setClickId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initTracking({
      workspaceId,
      ...options,
    });
    setIsInitialized(true);

    // Get clickId from cookie
    const cookieName = options.cookieName || "cursor_click_id";
    const match = document.cookie.match(new RegExp(`(?:^| )${cookieName}=([^;]+)`));
    if (match) {
      setClickId(match[1]);
    }
  }, [workspaceId, options.apiBaseUrl]);

  const trackClick = useCallback(
    async (payload?: Record<string, unknown>) => {
      if (!isInitialized) return;
      await cursorTrack("click", {
        workspaceId,
        ...payload,
      });
    },
    [workspaceId, isInitialized]
  );

  const trackLead = useCallback(
    async (payload: { customerExternalId: string; eventName: string; [key: string]: unknown }) => {
      if (!isInitialized) return;
      await cursorTrack("lead", {
        workspaceId,
        ...payload,
      });
    },
    [workspaceId, isInitialized]
  );

  const trackSale = useCallback(
    async (payload: { customerExternalId: string; amount: number; currency: string; [key: string]: unknown }) => {
      if (!isInitialized) return;
      await cursorTrack("sale", {
        workspaceId,
        ...payload,
      });
    },
    [workspaceId, isInitialized]
  );

  const value = useMemo(
    () => ({
      clickId,
      isInitialized,
      trackClick,
      trackLead,
      trackSale,
    }),
    [clickId, isInitialized, trackClick, trackLead, trackSale]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useCursorTrack() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useCursorTrack must be used within AnalyticsProvider");
  }
  return context;
}

export function useTrackClick() {
  const { trackClick } = useCursorTrack();
  return trackClick;
}

export function useTrackLead() {
  const { trackLead } = useCursorTrack();
  return trackLead;
}

export function useTrackSale() {
  const { trackSale } = useCursorTrack();
  return trackSale;
}

export { cursorTrack } from "@tracking/tracking-sdk";
export type { TrackingInitOptions } from "@tracking/tracking-sdk";
