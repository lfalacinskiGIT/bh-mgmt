import type { SVGProps } from "react";

function IconBase({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </IconBase>
  );
}

export function SalesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-6" />
      <path d="m17 7h1v1" />
    </IconBase>
  );
}

export function ContractsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7 3h10l3 3v15H7z" />
      <path d="M17 3v4h4" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
    </IconBase>
  );
}

export function ProjectsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 20V8" />
      <path d="M8 20V4" />
      <path d="M12 20v-6" />
      <path d="M16 20V6" />
      <path d="M20 20V10" />
    </IconBase>
  );
}

export function InvoicesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7 3h10l3 3v15H7z" />
      <path d="M10 10h6" />
      <path d="M10 14h6" />
      <path d="M10 6h4" />
    </IconBase>
  );
}

export function PaymentsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5" />
      <path d="M12 7v10" />
    </IconBase>
  );
}

export function CostControlIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 19h16" />
      <path d="M6 16v-4" />
      <path d="M10 16V8" />
      <path d="M14 16v-6" />
      <path d="M18 16v-9" />
    </IconBase>
  );
}

export function ReportsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7 3h10l3 3v15H7z" />
      <path d="M10 10h4" />
      <path d="M10 14h6" />
      <path d="M10 18h3" />
    </IconBase>
  );
}

export function TeamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16" cy="10" r="2" />
      <path d="M4.5 19c.6-3 2.7-4.5 4.5-4.5S13 16 13.5 19" />
      <path d="M13.5 19c.3-1.8 1.5-3 3-3 1.2 0 2.3.6 3 3" />
    </IconBase>
  );
}

export function IntegrationsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7 7h4" />
      <path d="M13 17h4" />
      <path d="M11 7v4" />
      <path d="M13 13v4" />
      <path d="M7 17h4" />
      <path d="M13 7h4" />
      <circle cx="9" cy="11" r="2" />
      <circle cx="15" cy="13" r="2" />
    </IconBase>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="m19 12-1.5-.8.2-1.7-1.6-1.6-1.7.2L13 4h-2l-.4 1.9-1.7-.2-1.6 1.6.2 1.7L4 12l1.5.8-.2 1.7 1.6 1.6 1.7-.2L11 20h2l.4-1.9 1.7.2 1.6-1.6-.2-1.7z" />
    </IconBase>
  );
}

export function WorkTimeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
      <path d="M8 3h8" />
    </IconBase>
  );
}

export function ProfitLossIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-4" />
      <path d="m6 11 3-2 3 1 4-3" />
    </IconBase>
  );
}
