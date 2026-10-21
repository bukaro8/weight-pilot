import {setRequestLocale} from "next-intl/server";

import {MemberInvitations} from "@/components/invitations/member-invitations";
import {listMemberInvitations} from "@/features/invitations/server";
import {publicInvitationOrigin} from "@/features/invitations/sharing";
import {redirect} from "@/i18n/navigation";
import type {Locale} from "@/i18n/routing";
import {requireMember} from "@/lib/authorization";

export default async function InvitationsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const currentUser = await requireMember(locale, "/invitations");
  if (currentUser.role === "ADMIN") redirect({href: "/admin/invitations", locale});
  const invitations = await listMemberInvitations(currentUser.id);
  return <MemberInvitations initialInvitations={invitations} publicOrigin={publicInvitationOrigin(process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL)}/>;
}
