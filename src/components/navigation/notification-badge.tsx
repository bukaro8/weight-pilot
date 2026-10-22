import {badgeText} from "@/features/notifications/policy";

export function NotificationBadge({count, className = "", reserveSpace = false}: {count: number; className?: string; reserveSpace?: boolean}) {
  if (count < 1 && !reserveSpace) return null;
  return <span aria-hidden="true" className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#B42318] text-[10px] font-bold leading-none text-white ${count < 1 ? "invisible" : ""} ${className}`}>{count > 0 ? badgeText(count) : "0"}</span>;
}
