import { Fragment } from "react";

// Capture @mentions (unicode letters/numbers/_/-) so they can be highlighted.
const MENTION = /(@[\p{L}\p{N}_-]+)/gu;

/**
 * Renders a chat message, wrapping any `@mention` in an ambient amber chip.
 * Purely presentational — the raw message is never mutated server-side.
 */
export function ChatText({ text }: { text: string }) {
  const parts = text.split(MENTION);

  return (
    <>
      {parts.map((part, i) =>
        part.length > 1 && part.startsWith("@") ? (
          <span
            key={i}
            className="rounded border border-amber-500/20 bg-amber-500/10 px-1 font-semibold text-amber-400"
          >
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
