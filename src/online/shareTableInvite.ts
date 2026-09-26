import { Share } from "react-native";
import { API_URL } from "../api";
import type { RoomSnapshot } from "../../shared/online";
import { t } from "../i18n";
import { tableInviteUrl } from "../../shared/publicLinks";

export function shareTableInvite(table: RoomSnapshot) {
  return Share.share({
    title: "Tambola Circle",
    message:
      t("Join {name} in Tambola Circle! Code: {code}", {
        name: table.name,
        code: table.code,
      }) +
      "\n" +
      tableInviteUrl(API_URL, table.id, table.invite),
  }).catch(() => {});
}
