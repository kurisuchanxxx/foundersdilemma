import { useEffect, useRef, useState } from "react";
import { useFmt } from "../i18n";

/** How long the curtain stays closed before it opens (the home entrance is timed against it). */
export const INTRO_REVEAL_MS = 1700;
const INTRO_TOTAL_MS = 2800;

/** The launch intro plays every time the app is opened, never with reduced motion, and can be skipped with ?nointro. */
export function shouldPlayIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("nointro")) return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  } catch {
    return true;
  }
}

/**
 * Loading curtain: a small rocket lifts off from the bottom centre and, as it reaches the top,
 * the black curtain splits open on the home screen. Click anywhere to skip.
 */
export function IntroCurtain({ onDone }: { onDone: () => void }) {
  const f = useFmt();
  const [open, setOpen] = useState(false);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  useEffect(() => {
    const t1 = setTimeout(() => setOpen(true), INTRO_REVEAL_MS);
    const t2 = setTimeout(finish, INTRO_TOTAL_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skip = () => {
    setOpen(true);
    setTimeout(finish, 650);
  };
  return (
    <div className={`intro ${open ? "open" : ""}`} onClick={skip} role="presentation" aria-hidden="true" data-testid="intro">
      <div className="intro-curtain left" />
      <div className="intro-curtain right" />
      <div className="intro-glow" />
      <div className="intro-word">Founder's Dilemma</div>
      <div className="intro-rocket">
        <span className="intro-trail" />
        <svg viewBox="0 0 56 120" width="56" height="120" aria-hidden="true">
          <defs>
            <linearGradient id="intro-flame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff6c2" />
              <stop offset="0.4" stopColor="#ffb020" />
              <stop offset="1" stopColor="#ff3b1f" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="intro-flame">
            <path d="M19,76 Q28,122 37,76 Z" fill="url(#intro-flame)" />
          </g>
          <path d="M28,4 C40,16 44,34 44,54 L44,72 L12,72 L12,54 C12,34 16,16 28,4 Z" fill="#ffffff" />
          <path d="M12,56 L2,74 L12,72 Z" fill="#cfd3da" />
          <path d="M44,56 L54,74 L44,72 Z" fill="#cfd3da" />
          <circle cx="28" cy="40" r="7" fill="#0a84ff" stroke="#9ad0ff" strokeWidth="2" />
          <rect x="20" y="72" width="16" height="6" rx="2" fill="#aab0b8" />
        </svg>
        <span className="intro-sparks">
          <i style={{ left: "35%", animationDelay: "0s" }} />
          <i style={{ left: "60%", animationDelay: ".25s" }} />
          <i style={{ left: "48%", animationDelay: ".5s" }} />
          <i style={{ left: "70%", animationDelay: ".7s" }} />
        </span>
      </div>
      <div className="intro-loading">
        <span>{f.tx("Loading", "Caricamento")}</span>
        <span className="intro-bar">
          <i />
        </span>
      </div>
      <button type="button" className="intro-skip" onClick={skip}>
        {f.tx("Skip", "Salta")}
      </button>
    </div>
  );
}
