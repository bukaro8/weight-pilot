import {AlertCircle, CheckCircle2} from "lucide-react";

export const inputClassName = "min-h-12 w-full rounded-xl border border-primary/15 bg-background px-3.5 text-base text-foreground shadow-[0_1px_2px_rgba(20,42,71,0.03)] transition-[border-color,box-shadow,background-color] placeholder:text-muted/70 hover:border-primary/25 focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

export function FormMessage({children, success = false}: {children: React.ReactNode; success?: boolean}) {
  const Icon = success ? CheckCircle2 : AlertCircle;
  return <div role={success ? "status" : "alert"} className={`flex gap-2.5 rounded-xl border p-3.5 text-sm leading-6 ${success ? "border-primary/15 bg-mist-blue text-primary-dark" : "border-accent-strong/45 bg-pale-blush text-primary-dark"}`}><Icon aria-hidden="true" className="mt-0.5 shrink-0" size={18}/><span>{children}</span></div>;
}

export function AuthFormSkeleton() {
  return <div aria-hidden="true" className="space-y-5 animate-pulse"><div className="h-12 rounded-xl bg-mist-blue"/><div className="h-12 rounded-xl bg-mist-blue"/><div className="h-13 rounded-full bg-primary/15"/></div>;
}
