import { beforeEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({
  push: vi.fn(),
  pop: vi.fn(),
  popTo: vi.fn(),
  popToRoot: vi.fn(),
  setRoot: vi.fn(),
  setDefaultOptions: vi.fn(),
  showModal: vi.fn(),
  dismissModal: vi.fn(),
  dismissAllModals: vi.fn(),
}));
const alert = vi.hoisted(() => vi.fn());
vi.mock("react-native-navigation", () => ({
  Navigation: native,
  OptionsModalPresentationStyle: {
    overFullScreen: "overFullScreen",
    overCurrentContext: "overCurrentContext",
  },
}));
vi.mock("react-native", () => ({
  Alert: { alert },
  Dimensions: { get: () => ({ width: 360, height: 800 }) },
  Platform: { OS: "android" },
}));
import {
  backScreen,
  navigationStore,
  presentGameScreen,
  pushScreen,
  returnToOnline,
  startNavigation,
  trackScreen,
} from "../src/navigation/router";
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
beforeEach(() => {
  vi.clearAllMocks();
  native.push.mockResolvedValue("next");
  native.pop.mockResolvedValue("previous");
  native.popTo.mockResolvedValue("hub");
  native.popToRoot.mockResolvedValue("home");
  navigationStore.setState({ id: "circle-home", name: "Home" });
});
describe("native stack commands", () => {
  it("dismisses the presented game panel instead of popping the underlying table", async () => {
    presentGameScreen("Numbers");
    await settle();
    const component =
      native.showModal.mock.calls[0]![0].stack.children[0].component;
    expect(component.name).toBe("Circle.Numbers");
    expect(component.options.modalPresentationStyle).toBe("overCurrentContext");
    expect(component.options.animations.showModal.translationY).toMatchObject({
      from: 800,
      to: 0,
    });
    backScreen(component.id);
    await settle();
    expect(native.dismissModal).toHaveBeenCalledWith(component.id);
    expect(native.pop).not.toHaveBeenCalled();
  });
  it("can retry a failed modal presentation and prevents duplicate modal taps", async () => {
    native.showModal.mockRejectedValueOnce(new Error("Unavailable"));
    presentGameScreen("Players");
    presentGameScreen("Players");
    await settle();
    await settle();
    expect(native.showModal).toHaveBeenCalledOnce();
    presentGameScreen("Players");
    await settle();
    expect(native.showModal).toHaveBeenCalledTimes(2);
    const id =
      native.showModal.mock.calls[1]![0].stack.children[0].component.id;
    backScreen(id);
    await settle();
  });
  it("uses a retained Home stack root and native transitions", async () => {
    await startNavigation();
    expect(
      native.setRoot.mock.calls[0]![0].root.stack.children[0].component.name,
    ).toBe("Circle.Home");
    const animations = native.setDefaultOptions.mock.calls[0]![0].animations;
    expect(animations.push.waitForRender).toBe(true);
    expect(animations.setRoot.waitForRender).toBe(true);
    expect(animations.push.content.enter.translationX).toMatchObject({
      from: 360,
      to: 0,
    });
    expect(animations.pop.content.exit.translationX).toMatchObject({
      from: 0,
      to: 360,
    });
    expect(animations.push.content.enter.translationY).toBeUndefined();
    backScreen("circle-home");
    expect(native.pop).not.toHaveBeenCalled();
  });
  it("prevents double taps from pushing two copies and does not wait for API work", async () => {
    let complete!: () => void;
    native.push.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    pushScreen("Wallet");
    pushScreen("Wallet");
    expect(native.push).toHaveBeenCalledOnce();
    complete();
    await settle();
    pushScreen("TopUp");
    expect(native.push).toHaveBeenCalledTimes(2);
    await settle();
  });
  it("unlocks navigation after a failed native command", async () => {
    native.push.mockRejectedValueOnce(new Error("Unavailable"));
    pushScreen("Online");
    await settle();
    expect(alert).toHaveBeenCalledOnce();
    pushScreen("Online");
    await settle();
    expect(native.push).toHaveBeenCalledTimes(2);
  });
  it("leaves the entire table flow for the retained hub instead of returning to creation forms", async () => {
    const untrack = trackScreen("online-test", "Online");
    navigationStore.setState({
      id: "table-settings-test",
      name: "TableSettings",
    });
    returnToOnline();
    await settle();
    expect(native.popTo).toHaveBeenCalledWith("online-test");
    expect(native.push).not.toHaveBeenCalled();
    untrack();
  });
  it("opens a hub from Home when no hub remains in the stack", async () => {
    returnToOnline();
    await settle();
    expect(native.popToRoot).toHaveBeenCalledOnce();
    expect(native.push.mock.calls[0]![0]).toBe("circle-home");
    expect(native.push.mock.calls[0]![1].component.name).toBe("Circle.Online");
  });
});
