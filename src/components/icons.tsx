import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function CameraIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4.5Z"/><circle cx="12" cy="12" r="4"/></svg>;
}

export function FlipIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m16 3 3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h12M8 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H5"/></svg>;
}

export function HandIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M7 11V6a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1.2a7 7 0 0 1-5.5-2.7L2.6 15a1.7 1.7 0 0 1 2.6-2.2L7 15"/></svg>;
}

export function ShieldIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>;
}

export function PinLogo(props: IconProps) {
  return <svg {...base} viewBox="0 0 32 42" {...props}><path d="M23 2c-2 6-7 7-9 11-2 4 2 7-1 11-2 3-7 4-8 8-1 3 1 6 4 8"/><path d="m8 40 6-4-3-5-6 3 3 6Z"/><path d="M15 13c4-1 7 0 9-3"/><circle cx="24" cy="7" r="2"/></svg>;
}

export function HomeIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>;
}

export function MusicIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M9 9l11-2"/></svg>;
}

export function BookIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M8 7h8M8 11h6"/></svg>;
}

export function SettingsIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></svg>;
}

export function PlayIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m8 5 11 7-11 7V5Z"/></svg>;
}

export function ArrowIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
}

export function CubeIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12.1V21"/></svg>;
}

export function SearchIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
}

export function ClockIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
}

export function ChevronLeftIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m15 18-6-6 6-6"/></svg>;
}

export function VolumeIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
}
