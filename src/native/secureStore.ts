import CircleDevice from "../../modules/circle-device";

// Native implementations retain the existing Keychain/Keystore namespaces.
export const getItem = (key: string) => CircleDevice.getSecureItem(key);
export const setItem = (key: string, value: string) =>
  CircleDevice.setSecureItem(key, value);
export const deleteItem = (key: string) => CircleDevice.deleteSecureItem(key);
