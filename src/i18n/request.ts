import {getRequestConfig} from "next-intl/server";
import {hasLocale} from "next-intl";
import {routing} from "./routing";

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [messages, reportCost, reportAssessment] = await Promise.all([
    import(`../messages/${locale}.json`),
    import(`../messages/report-cost/${locale}.json`),
    import(`../messages/report-assessment/${locale}.json`),
  ]);
  return {locale, messages: {...messages.default, reportCost: reportCost.default, reportAssessment: reportAssessment.default}};
});
