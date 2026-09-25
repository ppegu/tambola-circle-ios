import CircleDevice from '../modules/circle-device';
import { createAudioSessionController } from './audioSessionController';

// One serialized owner for both offline and online play. A finished clip must not
// deactivate iOS playback while players are adjusting the volume between calls.
const setActive = createAudioSessionController(CircleDevice);
export function setGameAudioActive(active: boolean): Promise<void> {
  return setActive(active);
}
