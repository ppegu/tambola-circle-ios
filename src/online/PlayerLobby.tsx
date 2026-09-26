import React from "react";
import { TableLobby } from "./TableLobby";
import type { OnlineModel } from "./useOnline";

export function PlayerLobby(props: {
  model: OnlineModel;
  onCoins: () => void;
  onMember: (id: string) => void;
  onTickets: () => void;
  onReady: () => void;
  onControls: () => void;
}) {
  return <TableLobby {...props} onControls={props.onControls} />;
}
