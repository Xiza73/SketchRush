interface SessionExpiredNoticeProps {
  message: string;
  dismissLabel: string;
  onDismiss: () => void;
}

/** Shown on the home page after a stored session was dropped. */
export const SessionExpiredNotice = ({
  message,
  dismissLabel,
  onDismiss,
}: SessionExpiredNoticeProps) => (
  <div
    role="alert"
    className="flex items-start justify-between gap-3 border-b border-line bg-red-soft px-4 py-3 text-sm font-semibold text-red sm:px-8"
  >
    <span className="m-0">{message}</span>
    <button
      type="button"
      onClick={onDismiss}
      className="shrink-0 text-xs font-semibold text-red underline underline-offset-4 hover:opacity-80"
    >
      {dismissLabel}
    </button>
  </div>
);
