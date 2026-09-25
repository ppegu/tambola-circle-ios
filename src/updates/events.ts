/** Single app-level boundary shared by HTTP and socket clients; no React dependency. */
let receive: ((value: unknown) => Promise<void>) | undefined;
let deviceKey: string | undefined;
export const configureDeviceKey = (key: string) => { deviceKey = key; };
export const accessHeaders = (): Record<string, string> => deviceKey ? { 'X-Device-Key': deviceKey } : {};
export const dispatchAccess = async (value: unknown) => { if (receive) await receive(value); };
export function configureAccess(key: string, handler: (value: unknown) => Promise<void>) {
  deviceKey = key; receive = handler;
  return () => { if (receive === handler) { receive = undefined; deviceKey = undefined; } };
}
