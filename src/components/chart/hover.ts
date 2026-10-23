export const TOUCH_CLEAR_MS = 1800;

type Timers = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (id: unknown) => void;
};

/**
 * Tracks the selected point. A mouse selection follows the pointer; a touch
 * stays until ~1.8s after the finger lifts, and a new touch cancels that.
 */
export function createHoverController(
  onChange: (index: number | null) => void,
  timers: Timers = {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  },
) {
  let pending: unknown = null;
  const cancel = () => {
    if (pending !== null) timers.clear(pending);
    pending = null;
  };
  return {
    move(index: number) {
      cancel();
      onChange(index);
    },
    touch(index: number) {
      cancel();
      onChange(index);
    },
    touchEnd() {
      cancel();
      pending = timers.set(() => {
        pending = null;
        onChange(null);
      }, TOUCH_CLEAR_MS);
    },
    leave() {
      cancel();
      onChange(null);
    },
    dispose: cancel,
  };
}
