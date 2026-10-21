import { useId } from "react";

/** The landing page's disc mark: a light disc with the rocket outline. */
export function BrandMark({ size = 25, className }: { size?: number; className?: string }) {
  const id = `brand-disc-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 25 25" width={size} height={size} className={className} aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <defs>
        <clipPath id={id}>
          <circle cx="12.5" cy="12.5" r="12.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="25" height="25" fill="#ededed" />
        <path d="M0 25 L25 0 L25 25 Z" fill="#fafafa" />
        <g transform="translate(5.4 5.4) scale(0.6)" fill="none" stroke="#050606" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </g>
      </g>
    </svg>
  );
}

/** Mark plus wordmark, as in the landing page header. */
export function Brand({ size = 25, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`brand ${className}`}>
      <BrandMark size={size} />
      <span className="brand-name">Founder's Dilemma</span>
    </span>
  );
}
