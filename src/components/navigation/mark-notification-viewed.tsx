"use client";

import {useEffect} from "react";
import {notificationsChangedEvent} from "./use-navigation-notifications";

export function MarkNotificationViewed({kind, id, expectedStatus}: {kind: "report" | "memberRequest" | "adminRequest"; id: string; expectedStatus?: string}) {
  useEffect(() => {
    let active = true;
    void fetch("/api/notifications/viewed", {
      method: "POST", headers: {"content-type": "application/json"}, cache: "no-store", body: JSON.stringify({kind, id, expectedStatus}),
    }).then((response) => { if (active && response.ok) window.dispatchEvent(new Event(notificationsChangedEvent)); }).catch(() => undefined);
    return () => { active = false; };
  }, [kind, id, expectedStatus]);
  return null;
}
