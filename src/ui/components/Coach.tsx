import { useEffect, useLayoutEffect, useState } from "react";
import { TOUR } from "../content/tour";
import { useFmt } from "../i18n";
import { useStore } from "../store";
import { Icon } from "./Icon";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The guided tour: a card with the current step and a spotlight on its target. */
export function Coach() {
  const f = useFmt();
  const step = useStore((s) => s.tourStep);
  const setStep = useStore((s) => s.setTourStep);
  const setView = useStore((s) => s.setView);
  const setTab = useStore((s) => s.setDecisionsTab);
  const [rect, setRect] = useState<Rect | null>(null);
  const current = step === null ? null : TOUR[step];

  // open the step's view and tab
  useEffect(() => {
    if (!current) return;
    if (current.view) setView(current.view);
    if (current.tab) setTab(current.tab);
  }, [current, setView, setTab]);

  // follow the highlighted element while the page moves
  useLayoutEffect(() => {
    if (!current?.target) {
      setRect(null);
      return;
    }
    let raf = 0;
    let scrolled = false;
    const tick = () => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          scrolled = true;
        }
        const r = el.getBoundingClientRect();
        setRect((prev) => (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : { top: r.top, left: r.left, width: r.width, height: r.height }));
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [current]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStep(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setStep]);

  if (step === null || !current) return null;
  const last = step === TOUR.length - 1;
  const pad = 6;
  return (
    <>
      {rect && <div className="coach-spot" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />}
      <div className="coach" role="dialog" aria-label={f.tx("Guided tour", "Tour guidato")}>
        <div className="row between">
          <span className="tiny faint">
            {f.tx("Guided tour", "Tour guidato")} · {step + 1}/{TOUR.length}
          </span>
          <button className="icon-btn" aria-label={f.tx("Close the tour", "Chiudi il tour")} onClick={() => setStep(null)}>
            <Icon name="X" size={15} />
          </button>
        </div>
        <h3 style={{ margin: "6px 0 4px" }}>{f.tx(...current.title)}</h3>
        <p className="small muted" style={{ margin: 0 }}>
          {f.tx(...current.body)}
        </p>
        <div className="coach-dots" aria-hidden="true">
          {TOUR.map((_, i) => (
            <span key={i} className={i === step ? "on" : ""} />
          ))}
        </div>
        <div className="row between">
          <button className="btn ghost sm" onClick={() => setStep(null)}>
            {f.tx("Skip tour", "Salta il tour")}
          </button>
          <div className="row gap-8">
            {step > 0 && (
              <button className="btn sm" onClick={() => setStep(step - 1)}>
                {f.tx("Back", "Indietro")}
              </button>
            )}
            <button className="btn sm primary" onClick={() => setStep(last ? null : step + 1)}>
              {last ? f.tx("Start playing", "Inizia a giocare") : f.tx("Next", "Avanti")}
              {!last && <Icon name="ChevronRight" size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
