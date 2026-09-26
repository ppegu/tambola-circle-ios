import React, { createContext, useContext, useEffect } from "react";
import { Modal } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export type Route =
  | "Invitations"
  | "InvitePlayers"
  | "Home"
  | "Caller"
  | "Online"
  | "Registration"
  | "Profile"
  | "CreateTable"
  | "JoinTable"
  | "Table"
  | "Tickets"
  | "TableSettings"
  | "MemberTickets"
  | "Numbers"
  | "Players"
  | "Wallet"
  | "Transactions"
  | "TopUp"
  | "PastGames"
  | "PastGame"
  | "Preferences"
  | "Voices"
  | "Policy";
export type RouteParams = Record<string, unknown>;
export type ScreenNavigation = {
  // Read active in async callbacks; useScreenActive subscribes to visibility in render/effects.
  id: string;
  name: Route;
  active: boolean;
  push: (name: Route, params?: RouteParams) => void;
  present: (name: "Numbers" | "Players") => void;
  back: () => void;
  home: () => void;
};
export const ScreenContext = createContext<ScreenNavigation | null>(null);
export const useScreenNavigation = () => useContext(ScreenContext);
export const ScreenAppearanceContext = createContext(false);
export const useScreenAppeared = () => useContext(ScreenAppearanceContext);
export const ScreenVisibilityContext = createContext(true);
export const useScreenActive = () => useContext(ScreenVisibilityContext);

export function ScreenSafeArea({ children }: { children: React.ReactNode }) {
  const navigation = useScreenNavigation();
  return navigation ? (
    <>{children}</>
  ) : (
    <SafeAreaProvider>{children}</SafeAreaProvider>
  );
}

/** Full screens use the native stack; compact confirmations remain native modals. */
export function ScreenSurface({
  children,
  onClose,
  onShow,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onShow?: () => void;
}) {
  const navigation = useScreenNavigation();
  const appeared = useScreenAppeared();
  useEffect(() => {
    if (navigation && appeared) onShow?.();
  }, [!!navigation, appeared, onShow]);
  return navigation ? (
    <>{children}</>
  ) : (
    <Modal
      visible
      hardwareAccelerated
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onShow={onShow}
    >
      {children}
    </Modal>
  );
}
