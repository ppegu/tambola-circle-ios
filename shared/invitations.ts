export type InvitePerson = {
  id: string;
  name: string;
  avatarId?: number;
  avatarPhoto?: string;
};
export type TableInvitation = {
  id: string;
  tableId: string;
  tableName: string;
  tableAvatarId?: number;
  tableAvatarPhoto?: string;
  sender: InvitePerson;
  status: "pending" | "accepting" | "accepted" | "declined" | "expired";
  createdAt: number;
  expiresAt: number;
};
export function isInviteMobile(value: unknown): value is string {
  return typeof value === "string" && /^\d{10}$/.test(value);
}
