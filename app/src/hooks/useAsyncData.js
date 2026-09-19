import { useEffect, useState } from "react";

/**
 * Runs `loader` whenever `deps` change and tracks { data, loading, error }.
 * Results from superseded runs are dropped; the previous data stays visible
 * while a new run loads. Pass `null` as the loader to skip loading.
 */
export const useAsyncData = (loader, deps) => {
  const [state, setState] = useState({
    data: null,
    loading: Boolean(loader),
    error: null,
  });

  useEffect(() => {
    if (!loader) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }

    let active = true;
    setState((prev) => ({ data: prev.data, loading: true, error: null }));
    loader().then(
      (data) => {
        if (active) setState({ data, loading: false, error: null });
      },
      (err) => {
        if (!active) return;
        console.error(err);
        setState({ data: null, loading: false, error: err.message });
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
};
