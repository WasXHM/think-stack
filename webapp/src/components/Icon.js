import React from 'react';

const paths = {
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  bold: <path d="M7 4h6a4 4 0 0 1 0 8H7m0-8v16h7a4 4 0 0 0 0-8H7" />,
  italic: <path d="M10 4h10M4 20h10M15 4 9 20" />,
  strike: <><path d="M17 6c-1-3-10-3-10 2 0 2 2 3 5 4m-5 6c2 3 10 3 10-2M3 12h18" /></>,
  quote: <path d="M4 5h6v8H4V5Zm0 8c0 4 2 6 5 6M14 5h6v8h-6V5Zm0 8c0 4 2 6 5 6" />,
  inlineCode: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16" />,
  codeBlock: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 8-4 4 4 4m6-8 4 4-4 4" /></>,
  link: <><path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-5-5l-2 2" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
  unorderedList: <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4" cy="6" r=".8" /><circle cx="4" cy="12" r=".8" /><circle cx="4" cy="18" r=".8" /></>,
  orderedList: <path d="M10 6h11M10 12h11M10 18h11M3 3h1v6M2 9h4M2 14c0-3 5-3 4 0l-4 6h4" />,
  taskList: <><rect x="2" y="5" width="6" height="6" rx="1" /><path d="m3 8 1 1 3-3M12 8h9M12 17h9" /><rect x="2" y="14" width="6" height="6" rx="1" /></>,
  divider: <path d="M3 12h18M7 5h10M7 19h10" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.75v5.1" />
      <path d="M12 16.5h.01" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.25 12.1 2.45 2.45 5.1-5.1" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h8" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4z" />
    </>
  ),
  file: (
    <>
      <path d="M6 2.75h8l4 4V21.25H6z" />
      <path d="M14 2.75v4h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 10 8.5-7 8.5 7" />
      <path d="M5.5 9v11h13V9" />
      <path d="M9.5 20v-6h5v6" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M8.2 14.7A6 6 0 1 1 15.8 14.7c-.9.7-1.2 1.35-1.3 2.3h-5c-.1-.95-.4-1.6-1.3-2.3Z" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  moon: (
    <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M18.4 16A8 8 0 1 1 20 12" />
    </>
  ),
  search: (
    <>
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m16 16 4 4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 3h6l1 4H8z" />
      <path d="m6.5 7 1 14h9l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
};

export default function Icon({ name, size = 20, className = '', ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      {paths[name] ?? paths.file}
    </svg>
  );
}
