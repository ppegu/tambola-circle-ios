import { describe, expect, it, vi } from "vitest";
import { createRemoteResource } from "../src/state/remoteResource";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
describe("shared API resource state", () => {
  it("shows loading immediately and shares simultaneous reads from multiple native roots", async () => {
    const resource = createRemoteResource<number[]>([]),
      response = deferred<number[]>(),
      fetch = vi.fn(() => response.promise);
    const first = resource.load(fetch),
      second = resource.load(fetch);
    expect(first).toBe(second);
    expect(resource.store.getState().loading).toBe(true);
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledOnce();
    response.resolve([1, 2]);
    await first;
    expect(resource.store.getState()).toEqual({
      data: [1, 2],
      loaded: true,
      loading: false,
      error: "",
    });
  });
  it("keeps useful data on failed refresh and supports retry, including synchronous failures", async () => {
    const resource = createRemoteResource(0);
    await resource.load(async () => 42);
    await resource.load(() => {
      throw new Error("Network unavailable");
    });
    expect(resource.store.getState()).toEqual({
      data: 42,
      loaded: true,
      loading: false,
      error: "Network unavailable",
    });
    await resource.load(async () => 43);
    expect(resource.store.getState()).toEqual({
      data: 43,
      loaded: true,
      loading: false,
      error: "",
    });
  });
  it("ignores stale data and errors after identity reset without cancelling the newer loading state", async () => {
    const resource = createRemoteResource(0),
      old = deferred<number>(),
      current = deferred<number>();
    const first = resource.load(() => old.promise);
    await Promise.resolve();
    resource.reset();
    const second = resource.load(() => current.promise);
    await Promise.resolve();
    old.resolve(99);
    await first;
    expect(resource.store.getState()).toEqual({
      data: 0,
      loaded: false,
      loading: true,
      error: "",
    });
    current.resolve(12);
    await second;
    expect(resource.store.getState().data).toBe(12);
  });
  it("does not overwrite a confirmed purchase with an older balance response", async () => {
    const resource = createRemoteResource(0),
      stale = deferred<number>();
    const read = resource.load(() => stale.promise);
    await Promise.resolve();
    resource.put(1200);
    stale.resolve(50);
    await read;
    expect(resource.store.getState()).toEqual({
      data: 1200,
      loaded: true,
      loading: false,
      error: "",
    });
  });
});
