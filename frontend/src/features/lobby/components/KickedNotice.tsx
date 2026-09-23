interface KickedNoticeProps {
  /** Already counted down and translated: "… en 12 segundos." */
  message: string;
}

/**
 * The one notice a kicked player sees while the door is shut
 * (docs/context/06-v1.1.md -> Room management). It sits on the join view and
 * counts down, instead of a toast per attempt saying the same fixed number.
 */
export const KickedNotice = ({ message }: KickedNoticeProps) => (
  <p
    role="status"
    aria-live="polite"
    className="m-0 rounded-xl border border-red/20 bg-red-soft px-4 py-3 text-sm font-semibold text-red"
  >
    {message}
  </p>
);
