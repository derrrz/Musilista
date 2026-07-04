import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

// Grade técnica do brand kit "Console" (DS/Musilista): 24×24, traço 1.6,
// pontas e junções retas (não arredondadas) — substitui os ícones round/round
// e os glifos de texto/emoji usados antes em toda a UI.
function Svg({ size = 16, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9l9-7 9 7v11a1 1 0 0 1-1 1h-5v-9H9v9H4a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function IconGroups(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <rect x="6" y="3" width="6" height="6" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

export function IconEditor(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 4H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M18 2l4 4L11 17H7v-4z" />
    </Svg>
  );
}

export function IconSupport(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconProfile(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <rect x="9" y="3" width="6" height="8" rx="1" />
    </Svg>
  );
}

export function IconAdmin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    </Svg>
  );
}

export function IconRoadmap(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6h17M4 12h17M4 18h17" />
      <rect x="2" y="4.5" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="2" y="10.5" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="2" y="16.5" width="3" height="3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconTheme(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8" y="8" width="8" height="8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </Svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 8l7 7 7-7" />
    </Svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  );
}

export function IconUndo(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 7H4V4" />
      <path d="M4 7a8 8 0 1 1-2 6" />
    </Svg>
  );
}

export function IconRedo(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 7h3V4" />
      <path d="M20 7a8 8 0 1 0 2 6" />
    </Svg>
  );
}

export function IconSave(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5h11l3 3v11H5z" />
      <path d="M8 5v5h7V5" />
    </Svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5h9v4M5 5v14h14v-9" />
      <path d="M12 12l9-9M16 3h5v5" />
    </Svg>
  );
}

export function IconOpenFile(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 4h6l2 2h8v14H4z" />
    </Svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.7z" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </Svg>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12l6 6L20 6" />
    </Svg>
  );
}

export function IconWarning(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" />
      <rect x="10.5" y="7.5" width="3" height="3" />
    </Svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="6" height="6" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </Svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="11" height="11" />
      <path d="M14 14l5 5" />
    </Svg>
  );
}

export function IconCapo(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="3" />
      <path d="M5 9v10M9 9v10M13 9v10M17 9v10" />
    </Svg>
  );
}

export function IconMetronome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4h8l3 16H5z" />
      <path d="M12 19V8l4-2" />
    </Svg>
  );
}

export function IconChordGrid(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="5" width="14" height="14" />
      <path d="M5 9.7h14M5 14.3h14M9.7 5v14M14.3 5v14" />
    </Svg>
  );
}

export function IconDocument(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="14" />
      <path d="M4 9h16M9 5v14" />
    </Svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="4" width="14" height="17" />
      <rect x="9" y="2" width="6" height="4" />
    </Svg>
  );
}

export function IconImport(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v11M8 10l4 4 4-4" />
      <path d="M4 16v4h16v-4" />
    </Svg>
  );
}

export function IconGuitar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4l6 6" />
      <path d="M11 7l6 6" />
      <rect x="5" y="11" width="8" height="8" />
      <path d="M12 12l4-4" />
    </Svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.8 6.4 20l1.5-6.3L3 9.5 9.4 9z" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconDuplicate(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8" y="8" width="13" height="13" />
      <path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" />
    </Svg>
  );
}

export function IconChevronUp(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 15l7-7 7 7" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </Svg>
  );
}
