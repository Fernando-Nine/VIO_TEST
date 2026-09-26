export interface Watching {
  watching: string[];
  selected: string;
}

/** Focus is presentation state; it never changes the membership of a pair. */
export function watchScreen(
  state: Watching,
  id: string,
  together = false,
): Watching {
  if (state.watching.includes(id)) return { ...state, selected: id };
  if (together && state.watching.length >= 2) return state;
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
