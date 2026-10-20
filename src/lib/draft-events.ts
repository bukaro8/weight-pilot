"use client";

const beforeLocaleChangeEvent = "weightpilot:before-locale-change";

type DraftEventDetail = {waitUntil: (task: Promise<unknown>) => void};

export async function waitForPendingDraftSaves() {
  const tasks: Promise<unknown>[] = [];
  window.dispatchEvent(new CustomEvent<DraftEventDetail>(beforeLocaleChangeEvent, {
    detail: {waitUntil: (task) => tasks.push(task)},
  }));
  const results = await Promise.allSettled(tasks);
  return results.every((result) => result.status === "fulfilled");
}

export function onBeforeLocaleChange(save: () => Promise<unknown>) {
  const listener = (event: Event) => {
    (event as CustomEvent<DraftEventDetail>).detail.waitUntil(save());
  };
  window.addEventListener(beforeLocaleChangeEvent, listener);
  return () => window.removeEventListener(beforeLocaleChangeEvent, listener);
}
