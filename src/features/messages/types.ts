export type MessageItem = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderRole: "USER" | "ADMIN";
  isMine: boolean;
};

export type AdminConversationSummary = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  language: "en" | "es";
  updatedAt: string;
  lastMessage: string | null;
  unreadCount: number;
};
