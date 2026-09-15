type ClassValue = string | false | null | undefined | 0;

/** Tiny class joiner; Tailwind classes here never conflict enough to need a merger. */
export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');
