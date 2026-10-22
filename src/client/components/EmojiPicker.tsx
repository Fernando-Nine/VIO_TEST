import { useId, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { AnchoredPopover } from "./AnchoredPopover";

// A short, curated set keeps the picker light and needs no dependency.
// prettier-ignore
const emojis = [
  "😀", "😂", "🤣", "😊", "😍", "😎", "🤔", "😅",
  "😮", "😢", "😭", "😡", "🥳", "😴", "🤯", "🙄",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👀", "🫡",
  "❤️", "🔥", "✨", "🎉", "💯", "✅", "❌", "⭐",
  "🍿", "🎮", "🎬", "🎵", "🏆", "🎲", "☕", "🍕",
];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <>
      <button
        ref={button}
        type="button"
        className="icon-button"
        aria-label="Emojis"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile size={18} />
      </button>
      {open && (
        <AnchoredPopover
          anchor={button}
          id={id}
          side="above"
          label="Emojis"
          className="emoji-picker"
          close={() => setOpen(false)}
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </AnchoredPopover>
      )}
    </>
  );
}
