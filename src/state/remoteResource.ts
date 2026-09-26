import { createStore } from "zustand/vanilla";

export type Resource<T> = {
  data: T;
  loaded: boolean;
  loading: boolean;
  error: string;
};
/** Deduplicated reads retain useful data and ignore responses from old identities. */
export function createRemoteResource<T>(initial: T) {
  const store = createStore<Resource<T>>(() => ({
    data: initial,
    loaded: false,
    loading: false,
    error: "",
  }));
  let generation = 0,
    pending: Promise<void> | undefined;
  const reset = () => {
    generation++;
    pending = undefined;
    store.setState({ data: initial, loaded: false, loading: false, error: "" });
  };
  const put = (data: T) => {
    generation++;
    pending = undefined;
    store.setState({ data, loaded: true, loading: false, error: "" });
  };
  const load = (fetcher: () => Promise<T>, fresh = false) => {
    if (fresh) {
      generation++;
      pending = undefined;
    }
    if (pending) return pending;
    const request = generation;
    store.setState({ loading: true, error: "" });
    const work = Promise.resolve()
      .then(fetcher)
      .then((data) => {
        if (request === generation)
          store.setState({ data, loaded: true, error: "" });
      })
      .catch((error) => {
        if (request === generation)
          store.setState({
            error: error instanceof Error ? error.message : "Please try again.",
          });
      })
      .finally(() => {
        if (request === generation) {
          pending = undefined;
          store.setState({ loading: false });
        }
      });
    pending = work;
    return work;
  };
  return { store, load, reset, put };
}
