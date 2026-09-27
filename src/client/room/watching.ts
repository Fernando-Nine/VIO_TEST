export interface Watching {
  watching: string[];
  selected: string;
}

/** Focus is presentation state; it never changes the watched subscriptions. */
export function watchScreen(
  state: Watching,
  id: string,
  together = false,
): Watching {
  if (state.watching.includes(id)) return { ...state, selected: id };
  if (!state.watching.length) return { watching: [id], selected: id };
  if (together)
    return { watching: [...state.watching, id], selected: state.selected };
  return {
    watching: state.watching.map((current) =>
      current === state.selected ? id : current,
    ),
    selected: id,
  };
}

export function unwatchScreen(state: Watching, id: string): Watching {
  const watching = state.watching.filter((current) => current !== id);
  return {
    watching,
    selected: state.selected === id ? watching[0] || "" : state.selected,
  };
}

/** Explicitly close other screens, without remounting an already watched one. */
export function watchOnlyScreen(state: Watching, id: string): Watching {
  return {
    watching:
      state.watching.length === 1 && state.watching[0] === id
        ? state.watching
        : [id],
    selected: id,
  };
}
