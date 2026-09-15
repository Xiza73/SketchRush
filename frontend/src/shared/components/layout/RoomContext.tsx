interface RoomContextProps {
  code: string;
  parts?: (string | null | undefined)[];
}

/** Top-bar room context: room code, then round and room language, separated by dots. */
export const RoomContext = ({ code, parts = [] }: RoomContextProps) => (
  <>
    <span className="font-mono font-semibold text-ink">{code}</span>
    {parts.filter(Boolean).map((part) => (
      <span key={part} className="flex items-center gap-2">
        <span aria-hidden="true">·</span>
        <span className="truncate">{part}</span>
      </span>
    ))}
  </>
);
