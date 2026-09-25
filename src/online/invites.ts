export function parseInvite(
  url: string,
): { tableId: string; invite: string } | null {
  try {
    const value = new URL(url),
      tableId = value.searchParams.get("table"),
      invite = value.searchParams.get("invite");
    if (
      tableId &&
      invite &&
      /^[a-f0-9-]{36}$/.test(tableId) &&
      /^[a-f0-9]{64}$/.test(invite)
    )
      return { tableId, invite };
    const match = value.pathname.match(
      /^\/invite\/([a-f0-9-]{36})\/([a-f0-9]{64})$/,
    );
    return match ? { tableId: match[1]!, invite: match[2]! } : null;
  } catch {
    return null;
  }
}
