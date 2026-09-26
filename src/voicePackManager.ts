/** Download state is independent of screens and survives closing the picker. */
export type PackFile = {
  number: number;
  bytes: number;
  sha256: string;
  durationMs: number;
};
export type CallerVoicePack = {
  id: string;
  name: string;
  accent: string;
  revision: string;
  bundled: boolean;
  totalBytes: number;
  files: PackFile[];
};
export type PackStorage = {
  getVoicePackFiles?(
    id: string,
    revision: string,
    files: PackFile[],
  ): Promise<string[] | null>;
  downloadVoiceFile?(
    file: PackFile & {
      id: string;
      revision: string;
      url: string;
      token: string;
    },
  ): Promise<string>;
  cancelVoiceDownload?(token: string): Promise<void>;
  finishVoiceDownload?(token: string): Promise<void>;
  removeVoicePack?(id: string): Promise<void>;
  getVoiceStorageFreeBytes?(): Promise<number>;
};
export type VoicePackState = {
  loading: boolean;
  selected: string;
  installed: Record<string, string[]>;
  downloading: {
    id: string;
    bytes: number;
    total: number;
    cancelling: boolean;
  } | null;
  error: string;
  notice: string;
};

export function createVoicePackManager(
  packs: CallerVoicePack[],
  native: PackStorage,
  preferences: {
    load(): Promise<string | null>;
    save(id: string): Promise<void>;
  },
  baseUrl: string,
) {
  const bundled = packs.find((pack) => pack.bundled)!;
  let state: VoicePackState = {
    loading: true,
    selected: bundled.id,
    installed: {},
    downloading: null,
    error: "",
    notice: "",
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<VoicePackState>) => {
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn());
  };
  let initialization: Promise<void> | undefined;
  let active: { token: string; cancelled: boolean } | undefined;
  let serial = 0;
  const packFor = (id: string) => {
    const pack = packs.find((p) => p.id === id);
    if (!pack) throw new Error("Unknown caller voice.");
    return pack;
  };
  const ready = (id: string) => id === bundled.id || !!state.installed[id];
  const initialize = () =>
    (initialization ??= (async () => {
      let saved: string | null = null;
      try {
        saved = await preferences.load();
      } catch {
        /* Default works without saved preferences. */
      }
      const installed: Record<string, string[]> = {};
      for (const pack of packs.filter((p) => !p.bundled)) {
        try {
          const uris = await native.getVoicePackFiles?.(
            pack.id,
            pack.revision,
            pack.files,
          );
          if (
            uris?.length === pack.files.length &&
            uris.every((uri) => uri.startsWith("file:"))
          )
            installed[pack.id] = uris;
        } catch {
          /* An incomplete or missing pack is offered as a download again. */
        }
      }
      const selected =
        saved && (saved === bundled.id || installed[saved])
          ? saved
          : bundled.id;
      update({
        installed,
        selected,
        loading: false,
        notice:
          saved && selected !== saved
            ? `${bundled.name} is active because your saved voice is unavailable.`
            : "",
      });
    })());
  const select = async (id: string) => {
    await initialize();
    const pack = packFor(id);
    if (!ready(id)) throw new Error("Download this voice before selecting it.");
    await preferences.save(id);
    update({
      selected: id,
      error: "",
      notice: `${pack.name} is now your caller voice.`,
    });
  };
  const download = async (id: string) => {
    await initialize();
    const pack = packFor(id);
    if (pack.bundled || ready(id) || active) return;
    if (!native.downloadVoiceFile || !native.getVoicePackFiles) {
      update({ error: "Update the app to download caller voices." });
      return;
    }
    const task = { token: `voice-${Date.now()}-${++serial}`, cancelled: false };
    active = task;
    update({
      downloading: { id, bytes: 0, total: pack.totalBytes, cancelling: false },
      error: "",
      notice: "",
    });
    try {
      const free = await native.getVoiceStorageFreeBytes?.();
      if (free !== undefined && free < pack.totalBytes + 1_048_576)
        throw new Error("Not enough storage. Free some space and retry.");
      let bytes = 0;
      for (const file of pack.files) {
        if (task.cancelled) break;
        await native.downloadVoiceFile({
          ...file,
          id,
          revision: pack.revision,
          token: task.token,
          url: `${baseUrl}/packs/${id}/${pack.revision}/${file.number}.wav`,
        });
        bytes += file.bytes;
        if (!task.cancelled)
          update({
            downloading: {
              id,
              bytes,
              total: pack.totalBytes,
              cancelling: false,
            },
          });
      }
      if (task.cancelled) return;
      const uris = await native.getVoicePackFiles(
        id,
        pack.revision,
        pack.files,
      );
      if (task.cancelled) return;
      if (
        !uris ||
        uris.length !== pack.files.length ||
        uris.some((uri) => !uri.startsWith("file:"))
      )
        throw new Error(
          "Voice verification failed. Please retry the download.",
        );
      update({
        installed: { ...state.installed, [id]: uris },
        notice: `${pack.name} is ready offline. Tap Use voice to select it.`,
      });
    } catch (error) {
      if (!task.cancelled)
        update({
          error:
            error instanceof Error
              ? error.message
              : "Download failed. Check your connection and retry.",
        });
    } finally {
      await native.finishVoiceDownload?.(task.token).catch(() => {});
      if (active === task) {
        active = undefined;
        update({
          downloading: null,
          ...(task.cancelled
            ? { notice: "Download cancelled. You can retry anytime." }
            : {}),
        });
      }
    }
  };
  const cancel = async () => {
    if (!active) return;
    active.cancelled = true;
    if (state.downloading)
      update({ downloading: { ...state.downloading, cancelling: true } });
    await native.cancelVoiceDownload?.(active.token);
  };
  const remove = async (id: string) => {
    await initialize();
    const pack = packFor(id);
    if (pack.bundled)
      throw new Error(
        `${bundled.name} is included with the app and cannot be removed.`,
      );
    if (state.selected === id)
      throw new Error("Select another voice before removing this one.");
    if (active) throw new Error("Finish or cancel the current download first.");
    if (!native.removeVoicePack)
      throw new Error("Update the app to manage voice downloads.");
    await native.removeVoicePack(id);
    const installed = { ...state.installed };
    delete installed[id];
    update({
      installed,
      notice: `${pack.name} removed from this device.`,
      error: "",
    });
  };
  return {
    initialize,
    select,
    download,
    cancel,
    remove,
    ready,
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reportError: (message: string) => update({ error: message }),
    clearMessage: () => update({ error: "", notice: "" }),
  };
}
