import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";
import {getAdminRequest} from "@/features/treatments/server";
import {AdminRequestEditor} from "@/components/treatments/admin-request-editor";
import {MarkNotificationViewed} from "@/components/navigation/mark-notification-viewed";
import {PaymentInstructionPanel} from "@/components/treatments/payment-instruction-panel";
import {getStrengthPrices} from "@/features/pricing/server";

export default async function AdminRequestPage({params}: {params: Promise<{locale: Locale; id: string}>}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, `/admin/treatment-requests/${id}`);
  const detail = await getAdminRequest(id);
  if (!detail) notFound();
  const {request, memberName, memberEmail, reviewRequestId, conversationId, events, payment} = detail;
  const strengthPrices = await getStrengthPrices();
  const approvedPrice = strengthPrices.find((row) => row.treatment === request.approvedTreatment && row.strength === request.approvedStrength)?.pricePence ?? null;
  const t = await getTranslations("treatments");
  const date = (value: Date) => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"}).format(value);

  return <main id="main-content" className="mx-auto max-w-5xl px-4 py-9 sm:px-6 lg:px-10"><MarkNotificationViewed kind="adminRequest" id={id}/>
    <Link href="/admin/treatment-requests" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">← {t("adminTitle")}</Link>
    <h1 className="mt-5 font-display text-4xl text-primary-dark">{memberName}</h1>
    <p className="mt-2 break-words text-muted">{memberEmail} · {t(request.treatment === "SEMAGLUTIDE" ? "semaglutide" : "tirzepatide")} · {t(request.status)}</p>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
          <h2 className="font-display text-2xl text-primary-dark">{t("reviewDetails")}</h2>
          <dl className="mt-5 divide-y divide-border break-words">{[
            [t("fullName"), request.fullName], [t("telephone"), request.telephone],
            [t(request.streetAddress ? "streetAddress" : "address"), request.streetAddress ?? request.address],
            ...(request.flatNumber ? [[t("flatNumber"), request.flatNumber]] : []),
            ...(request.buildingName ? [[t("buildingName"), request.buildingName]] : []),
            ...(request.city ? [[t("city"), request.city]] : []),
            [t("postcode"), request.postcode],
            ...(request.message ? [[t("optionalMessage"), request.message]] : []),
          ].map(([label, value]) => <div key={label} className="py-3"><dt className="text-sm font-semibold text-primary-dark">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-muted">{value}</dd></div>)}</dl>
          <div className="mt-5 flex flex-wrap gap-5">
            {reviewRequestId ? <Link href={`/admin/questionnaires/${reviewRequestId}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("associatedReport")}</Link> : null}
            <Link href={conversationId ? `/admin/messages/${conversationId}` : "/admin/messages"} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t("messageAdmin")}</Link>
          </div>
        </section>
        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-2xl text-primary-dark">{t("history")}</h2><ol className="mt-4 space-y-3">{events.map((event) => <li key={`${event.status}-${event.createdAt.toISOString()}`} className="flex flex-wrap justify-between gap-2 border-b border-border pb-3 text-sm"><span className="font-semibold text-primary-dark">{t(event.status)}</span><time className="text-muted" dateTime={event.createdAt.toISOString()}>{date(event.createdAt)}</time></li>)}</ol></section>
      </div>
      <div className="space-y-5"><AdminRequestEditor id={id} initial={{status: request.status, internalNote: request.internalNote ?? "", declineReason: request.declineReason ?? "", approvedTreatment: request.approvedTreatment, approvedStrength: request.approvedStrength}}/>
        {request.status === "APPROVED_FOR_NEXT_STEPS" && request.approvedTreatment && request.approvedStrength ? <PaymentInstructionPanel id={id} treatment={request.approvedTreatment} strength={request.approvedStrength} pricePence={approvedPrice} sendStatus={payment?.sendStatus ?? null} snapshot={payment ? {itemPricePence: payment.itemPricePence, deliveryPricePence: payment.deliveryPricePence, totalPence: payment.totalPence} : null}/> : null}
      </div>
    </div>
  </main>;
}
