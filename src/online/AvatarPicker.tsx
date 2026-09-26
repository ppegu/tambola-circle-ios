import { chooseAvatarPhoto, uploadAvatarPhoto } from "./avatarPhotos";
import { t as tr, useLanguage } from "../i18n";
import React, { useEffect, useRef, useState } from "react";
import { Image, useWindowDimensions } from "react-native";
import { AVATAR_LABELS } from "../../shared/avatars";
import { TABLE_AVATAR_LABELS } from "../../shared/tableAvatars";
import { TableAvatar } from "../components/TableAvatar";
import { GameAvatar, GameButton } from "../components/GameArtwork";
import { Icon, Notice, Pressable, ScrollView, Sheet, View } from "./components";

export function AvatarPicker({
  selected,
  selectedPhoto,
  onSelect,
  onClose,
  table = false,
  busy = false,
}: {
  selected: number;
  selectedPhoto?: string;
  onSelect: (id: number, photo?: string) => void | Promise<unknown>;
  onClose: () => void;
  table?: boolean;
  busy?: boolean;
}) {
  useLanguage();
  const [choice, setChoice] = useState(selected);
  const [photo, setPhoto] = useState(selectedPhoto),
    [local, setLocal] = useState<string | null>(null);
  const [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const active = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const disabled = busy || working,
    custom = !!(local || photo);
  async function choosePhoto() {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setError("");
    try {
      const value = await chooseAvatarPhoto();
      if (value && active.current) {
        setLocal(value);
        setPhoto(undefined);
      }
    } catch {
      if (active.current)
        setError(tr("Could not open this photo. Please choose another photo."));
    } finally {
      lock.current = false;
      if (active.current) setWorking(false);
    }
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setError("");
    try {
      const saved = local ? await uploadAvatarPhoto(local) : photo;
      if (active.current) {
        setPhoto(saved);
        setLocal(null);
        await onSelect(choice, saved);
      }
    } catch {
      if (active.current)
        setError(tr("Could not save your photo. Please try again."));
    } finally {
      lock.current = false;
      if (active.current) setWorking(false);
    }
  }
  const size = Math.min(
    88,
    Math.floor((Math.min(useWindowDimensions().width, 576) - 60) / 4),
  );
  return (
    <Sheet
      title={table ? tr("Choose table avatar") : tr("Choose your avatar")}
      onClose={onClose}
    >
      <View
        pointerEvents="none"
        style={{ alignItems: "center", paddingVertical: 4 }}
      >
        {local ? (
          <Image
            source={{ uri: "data:image/jpeg;base64," + local }}
            style={{ width: 116, height: 116, borderRadius: 58 }}
          />
        ) : table ? (
          <TableAvatar id={choice} photo={photo} size={116} />
        ) : (
          <GameAvatar index={choice} photo={photo} size={116} />
        )}
      </View>
      <GameButton
        small
        tone="cyan"
        glyph="image"
        busy={working}
        disabled={disabled}
        onPress={() => {
          void choosePhoto();
        }}
      >
        {tr("Choose from phone gallery")}
      </GameButton>
      {!!error && <Notice tone="red">{error}</Notice>}
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ paddingVertical: 6, gap: 8 }}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {(table ? TABLE_AVATAR_LABELS : AVATAR_LABELS).map((label, id) => (
            <Pressable
              key={id}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityLabel={tr("Avatar {v0}: {v1}", {
                v0: id + 1,
                v1: label,
              })}
              accessibilityState={{
                selected: !custom && choice === id,
                checked: !custom && choice === id,
                disabled,
              }}
              onPress={() => {
                setChoice(id);
                setPhoto(undefined);
                setLocal(null);
              }}
              style={{
                padding: 3,
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor:
                  !custom && choice === id ? "#ffe875" : "transparent",
                backgroundColor:
                  !custom && choice === id ? "#ffe87544" : "transparent",
              }}
            >
              {table ? (
                <TableAvatar id={id} size={size - 10} />
              ) : (
                <GameAvatar index={id} size={size - 10} />
              )}
              {!custom && choice === id && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 23,
                    height: 23,
                    borderRadius: 12,
                    backgroundColor: "#ffdc4a",
                    borderWidth: 1,
                    borderColor: "#fff5a4",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="check" color="#542609" size={17} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <GameButton
        busy={working || busy}
        disabled={disabled}
        onPress={() => {
          void save();
        }}
        style={{ marginBottom: 8 }}
      >
        {tr("Use avatar")}
      </GameButton>
    </Sheet>
  );
}
