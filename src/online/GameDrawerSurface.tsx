import React from "react";
import { Modal } from "react-native";

/** RNN owns presentation in the app; the standalone preview retains a native fallback. */
export function GameDrawerSurface({
  native = false,
  children,
  onClose,
}: {
  native?: boolean;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return native ? (
    <>{children}</>
  ) : (
    <Modal
      visible
      transparent
      hardwareAccelerated
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {children}
    </Modal>
  );
}
