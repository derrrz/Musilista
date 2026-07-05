import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/constants/colors';

export interface IconProps {
  size?: number;
  color?: ColorValue;
}

// Grade técnica do brand kit "Console" (mesma do web): 24×24, traço 1.6,
// pontas e junções retas. Paths copiados verbatim de components/ui/icons.tsx da web.
function Icon({
  size = 16,
  color = colors.ink,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      {children}
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x="4" y="4" width="11" height="11" />
      <Path d="M14 14l5 5" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 5l14 14M19 5L5 19" />
    </Icon>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M4 12l6 6L20 6" />
    </Icon>
  );
}

export function IconWarning(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 3l10 18H2z" />
      <Path d="M12 10v4M12 17h.01" />
    </Icon>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" />
      <Rect x="10.5" y="7.5" width="3" height="3" />
    </Icon>
  );
}

export function IconPlay({ size = 16, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 5l12 7-12 7z" fill={color} />
    </Svg>
  );
}

export function IconPause({ size = 16, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="6" y="5" width="4" height="14" fill={color} />
      <Rect x="14" y="5" width="4" height="14" fill={color} />
    </Svg>
  );
}

export function IconCapo(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x="3" y="6" width="18" height="3" />
      <Path d="M5 9v10M9 9v10M13 9v10M17 9v10" />
    </Icon>
  );
}

export function IconHeart({ filled, ...props }: IconProps & { filled?: boolean }) {
  const { size = 16, color = colors.ink } = props;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.7z" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </Icon>
  );
}

export function IconShare(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 5h9v4M5 5v14h14v-9" />
      <Path d="M12 12l9-9M16 3h5v5" />
    </Icon>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </Icon>
  );
}

export function IconMetronome(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M8 4h8l3 16H5z" />
      <Path d="M12 19V8l4-2" />
    </Icon>
  );
}

export function IconGroups(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Rect x="6" y="3" width="6" height="6" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

export function IconProfile(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Rect x="9" y="3" width="6" height="8" rx="1" />
    </Icon>
  );
}

export function IconGuitar(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M14 4l6 6" />
      <Path d="M11 7l6 6" />
      <Rect x="5" y="11" width="8" height="8" />
      <Path d="M12 12l4-4" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 8l7 7 7-7" />
    </Icon>
  );
}
