import { Alert, Dimensions, Platform } from 'react-native';
import { Navigation, OptionsModalPresentationStyle } from 'react-native-navigation';
import { createStore } from 'zustand/vanilla';
import type { Route, RouteParams } from './ScreenContext';

export const navigationStore = createStore(() => ({ id: 'circle-home', name: 'Home' as Route }));
let navigating = false;
let sequence = 0;
const mounted = new Map<string, Route>();
const modalRoots = new Set<string>();
export function trackScreen(id: string, name: Route) { mounted.set(id, name); return () => { mounted.delete(id); modalRoots.delete(id); }; }

// Lock only the short native transition, never an API request.
async function transition(action: () => Promise<unknown>) {
  if (navigating) return;
  navigating = true;
  try { await action(); }
  catch (error) { Alert.alert('Couldn’t open screen', error instanceof Error ? error.message : 'Please try again.'); }
  finally { navigating = false; }
}
export function pushScreen(name: Route, params: RouteParams = {}, from = navigationStore.getState().id) {
  void transition(() => Navigation.push(from, { component: { id: `circle-${name}-${++sequence}`, name: `Circle.${name}`, passProps: params } }));
}
export function presentGameScreen(name: 'Numbers' | 'Players') {
  void transition(async () => {
    const id = `circle-${name}-${++sequence}`, height = Dimensions.get('window').height;
    modalRoots.add(id);
    try {
      await Navigation.showModal({ stack: { children: [{ component: { id, name: `Circle.${name}`, options: {
        // Android detaches the table for OverFullScreen; OverCurrentContext
        // preserves it beneath the dimmed, dismissible panel.
        modalPresentationStyle: Platform.OS === 'android' ? OptionsModalPresentationStyle.overCurrentContext : OptionsModalPresentationStyle.overFullScreen,
        layout: { backgroundColor: 'transparent', componentBackgroundColor: 'transparent' },
        statusBar: { visible: false }, navigationBar: { visible: false },
        animations: {
          showModal: { waitForRender: true, translationY: { from: height, to: 0, duration: 240 } },
          dismissModal: { translationY: { from: 0, to: height, duration: 200 } },
        },
      } } }] } });
    } catch (error) { modalRoots.delete(id); throw error; }
  });
}
export function backScreen(id = navigationStore.getState().id) {
  if (id === 'circle-home') return;
  void transition(async () => {
    if (modalRoots.has(id)) { await Navigation.dismissModal(id); modalRoots.delete(id); }
    else await Navigation.pop(id);
  });
}
export function homeScreen() { void transition(() => Navigation.popToRoot(navigationStore.getState().id)); }
export function returnToOnline() {
  const online = [...mounted].reverse().find(([, name]) => name === 'Online');
  void transition(async () => {
    if (modalRoots.size) { await Navigation.dismissAllModals(); modalRoots.clear(); }
    if (online) return Navigation.popTo(online[0]);
    await Navigation.popToRoot(navigationStore.getState().id);
    return Navigation.push('circle-home', { component: { id: `circle-Online-${++sequence}`, name: 'Circle.Online' } });
  });
}
export function startNavigation() {
  // Android's default stack transition can lift the next screen from below.
  // Keep the transition on the native UI thread and make its direction match
  // the platform's back stack. iOS already provides the horizontal push/pop.
  const width = Dimensions.get('window').width;
  const stackAnimations = Platform.OS === 'android' ? {
    push: {
      waitForRender: true,
      content: {
        enter: { translationX: { from: width, to: 0, duration: 260 } },
        exit: { translationX: { from: 0, to: -width * .22, duration: 260 } },
      },
    },
    pop: {
      content: {
        enter: { translationX: { from: -width * .22, to: 0, duration: 240 } },
        exit: { translationX: { from: 0, to: width, duration: 240 } },
      },
    },
  } : { push: { waitForRender: true } };
  Navigation.setDefaultOptions({
    topBar: { visible: false, drawBehind: true },
    layout: { backgroundColor: '#290435', componentBackgroundColor: '#290435', orientation: ['portrait'] },
    statusBar: { style: 'light', backgroundColor: '#290435', drawBehind: true },
    navigationBar: { backgroundColor: '#290435' },
    animations: { ...stackAnimations, setRoot: { waitForRender: true } },
  });
  return Navigation.setRoot({ root: { stack: { id: 'circle-stack', children: [{ component: { id: 'circle-home', name: 'Circle.Home' } }] } } });
}
