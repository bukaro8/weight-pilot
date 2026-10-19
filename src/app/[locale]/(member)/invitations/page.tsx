import {setRequestLocale} from "next-intl/server";

import {MemberInvitations} from "@/components/invitations/member-invitations";
import {listMemberInvitations} from "@/features/invitations/server";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";

export default async function InvitationsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const currentUser = await requireMember(locale, "/invitations");
  const invitations = await listMemberInvitations(currentUser.id);
  return <MemberInvitations initialInvitations={invitations}/>;
}
