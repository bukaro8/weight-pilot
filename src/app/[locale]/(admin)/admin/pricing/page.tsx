import {setRequestLocale} from "next-intl/server";

import {PricingManagement} from "@/components/pricing/pricing-management";
import {getPricingManagementData} from "@/features/pricing/server";
import type {Locale} from "@/i18n/routing";
import {requireAdmin} from "@/lib/authorization";

export default async function AdminPricingPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/pricing");
  const {pricing, scenarios} = await getPricingManagementData();
  return <PricingManagement initialPricing={pricing} initialScenarios={scenarios}/>;
}
