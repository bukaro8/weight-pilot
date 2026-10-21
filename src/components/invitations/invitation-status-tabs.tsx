"use client";

export type InvitationTabStatus = "ACTIVE" | "USED" | "EXPIRED";

export function InvitationStatusTabs({selected, counts, labels, ariaLabel, onSelect}: {
  selected: InvitationTabStatus;
  counts: Record<InvitationTabStatus, number>;
  labels: Record<InvitationTabStatus, string>;
  ariaLabel: string;
  onSelect: (status: InvitationTabStatus) => void;
}) {
  return <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-mist-blue/45 p-1" role="tablist" aria-label={ariaLabel} onKeyDown={(event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")];
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const next = (current + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    tabs[next]?.focus();
    tabs[next]?.click();
  }}>
    {(["ACTIVE", "USED", "EXPIRED"] as const).map((status) => <button key={status} id={`invitation-tab-${status.toLowerCase()}`} type="button" role="tab" aria-controls="invitation-status-panel" aria-selected={selected === status} tabIndex={selected === status ? 0 : -1} onClick={() => onSelect(status)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === status ? "bg-surface text-primary-dark shadow-sm" : "text-muted hover:text-primary-dark"}`}>
      <span className="truncate">{labels[status]}</span><span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${selected === status ? "bg-primary text-white" : "bg-white/80 text-primary"}`}>{counts[status]}</span>
    </button>)}
  </div>;
}
