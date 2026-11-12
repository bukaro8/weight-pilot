export type FollowUpCategory = "INCOMPLETE_ASSESSMENT" | "TREATMENT_FOLLOW_UP";
export type FollowUpStatus = "SENDING" | "ACCEPTED" | "DELIVERED" | "FAILED" | "UNCERTAIN";

export type FollowUpCandidate = {
  memberId: string;
  name: string;
  email: string;
  language: "en" | "es";
  category: FollowUpCategory;
  relatedStatus: "DRAFT" | "APPROVED_FOR_NEXT_STEPS";
  lastReminderAt: string | null;
  reminderCount: number;
  recentReminder: boolean;
  doNotRemind: boolean;
};

export type FollowUpHistoryItem = {
  id: string;
  category: FollowUpCategory;
  subject: string;
  language: "en" | "es";
  status: FollowUpStatus;
  createdAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
};
