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
