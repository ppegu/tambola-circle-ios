import React from "react";
import { useStore } from "zustand";
import { t as tr, useLanguage } from "../i18n";
import { IconButton, Text, View } from "./components";
import { invitationResource } from "./invitationStore";

export function InvitationBell({ onPress }: { onPress: () => void }) {
  useLanguage();
  const count = useStore(
    invitationResource.store,
    (s) =>
      s.data.filter((i) => i.status === "accepting" || i.status === "pending")
        .length,
  );
  return (
    <View>
      <IconButton
        light
        name="bell"
        label={tr("Invitations ({count})", { count })}
        onPress={onPress}
      />
      {count > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            backgroundColor: "#ed2455",
            borderColor: "#ffe68a",
            borderWidth: 1,
            borderRadius: 10,
            minWidth: 19,
            paddingHorizontal: 3,
          }}
        >
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: "#fff",
              fontSize: 11,
              textAlign: "center",
              fontWeight: "800",
            }}
          >
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </View>
  );
}
