interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const svgProps = ({ size = 20, className, strokeWidth = 2 }: IconProps) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

/** Stroke icons traced from the design mockups (hint bulb, penalty bolt, keyboard backspace...). */
export const HintIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
  </svg>
);

export const LightningIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
);

export const BackspaceIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <path d="m18 9-6 6" />
    <path d="m12 9 6 6" />
  </svg>
);

export const SlidersIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M4 7h9" />
    <path d="M17 7h3" />
    <circle cx="15" cy="7" r="2" />
    <path d="M4 17h5" />
    <path d="M13 17h7" />
    <circle cx="11" cy="17" r="2" />
  </svg>
);

export const CopyIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...svgProps({ strokeWidth: 3, ...props })}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...svgProps({ strokeWidth: 2.5, ...props })}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const MinusIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M5 12h14" />
  </svg>
);

/* The drawing tools. */

export const BrushIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M17 3a3 3 0 0 1 4 4L9 19l-5 1 1-5z" />
    <path d="m14 6 4 4" />
  </svg>
);

export const EraserIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M14 3 21 10 12 19H7l-4-4z" />
    <path d="M9 8 16 15" />
    <path d="M12 21h9" />
  </svg>
);

export const BucketIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M9 3 19 13l-7 7-7-7 7-7z" />
    <path d="M5 13h13" />
    <path d="M20 17c0 1.1-.7 2-1.7 2s-1.8-.9-1.8-2 1.8-3 1.8-3 1.7 1.9 1.7 3z" />
  </svg>
);

export const UndoIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M3 8h11a5 5 0 0 1 0 10h-6" />
    <path d="m7 4-4 4 4 4" />
  </svg>
);

export const SquareIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

export const CircleIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <circle cx="12" cy="12" r="8" />
  </svg>
);

/** `UndoIcon` mirrored, so the pair reads as one gesture in both directions. */
export const RedoIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M21 8H10a5 5 0 0 0 0 10h6" />
    <path d="m17 4 4 4-4 4" />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
);

export const PencilIcon = (props: IconProps) => (
  <svg {...svgProps(props)}>
    <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="m14 6 4 4" />
  </svg>
);
