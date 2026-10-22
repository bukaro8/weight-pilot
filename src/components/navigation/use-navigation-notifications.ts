"use client";

import {useCallback, useEffect, useState} from "react";
import {emptyNavigationCounts, type NavigationCounts} from "@/features/notifications/policy";

export const notificationsChangedEvent = "weightpilot:notifications-changed";

export function useNavigationNotifications(enabled: boolean, pathname: string, actorId: string | undefined, initial?: NavigationCounts) {
  const [result, setResult] = useState<{actorId: string | undefined; counts: NavigationCounts}>({actorId, counts: initial ?? emptyNavigationCounts});
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch("/api/notifications/unread", {cache: "no-store"});
      if (response.ok) setResult({actorId, counts: await response.json() as NavigationCounts});
    } catch { /* Keep the last reliable counts until the next poll. */ }
  }, [enabled, actorId]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => void refresh(), 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    const onChanged = () => void refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(notificationsChangedEvent, onChanged);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(notificationsChangedEvent, onChanged);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [pathname, refresh]);
  return enabled && result.actorId === actorId ? result.counts : emptyNavigationCounts;
}
