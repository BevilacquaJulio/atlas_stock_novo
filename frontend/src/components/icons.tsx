import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const defaults = (props: IconProps): IconProps => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...props,
});

export const IconBox = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </svg>
);

export const IconUsers = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

export const IconCar = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M5 17h14M6 17l1.5-5h9L18 17" />
    <path d="M3 17v-3l2-1 1.5-4h11L19 13l2 1v3" />
    <circle cx="7.5" cy="17.5" r="1.5" />
    <circle cx="16.5" cy="17.5" r="1.5" />
  </svg>
);

export const IconTag = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M20.59 13.41 12 22l-9-9V4h9l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1.5" />
  </svg>
);

export const IconTruck = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7z" />
    <circle cx="5.5" cy="18.5" r="1.5" />
    <circle cx="18.5" cy="18.5" r="1.5" />
  </svg>
);

export const IconSwap = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M7 10 3 6l4-4" />
    <path d="M3 6h13a4 4 0 0 1 4 4" />
    <path d="M17 14l4 4-4 4" />
    <path d="M21 18H8a4 4 0 0 1-4-4" />
  </svg>
);

export const IconDashboard = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" />
  </svg>
);

export const IconDollar = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const IconClipboard = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);

export const IconCart = (p: IconProps) => (
  <svg {...defaults(p)}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconSearch = (p: IconProps) => (
  <svg {...defaults(p)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconEdit = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const IconTrash = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

export const IconLogout = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const IconMenu = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

export const IconClose = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconChevronDown = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconCheck = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconBell = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
