/** The app's one caller player also owns previews, so voices never overlap. */
type Preview = {
  play(id: string): Promise<void>;
  stop(): void;
  prepare(): Promise<void>;
  release(): void;
};
let handler: Preview | undefined;
export function registerVoicePreview(next: Preview) {
  handler = next;
  return () => {
    if (handler === next) handler = undefined;
  };
}
export function previewCallerVoice(id: string) {
  return (
    handler?.play(id) ??
    Promise.reject(new Error("Voice preview is not ready. Please try again."))
  );
}
export function stopCallerPreview() {
  handler?.stop();
}
export function prepareCallerPreviews() {
  return (
    handler?.prepare() ??
    Promise.reject(new Error("Voice preview is not ready. Please try again."))
  );
}
export function releaseCallerPreviews() {
  handler?.release();
}
