import { useEffect, useState } from "react";
import { roundLabel, type GameConfig } from "../../core";
import { useFmt } from "../i18n";
import { SIMULATION_MS } from "../store";
import { RocketGlyph } from "./Intro";

/**
 * Shown while a round is being simulated: the months light up one by one, the bar fills
 * and the rocket shakes on the pad. Purely theatrical, the simulation itself is instant.
 */
export function SimulationOverlay({ config, round, months, toEnd }: { config: GameConfig; round: number; months: number; toEnd?: boolean }) {
  const f = useFmt();
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const step = SIMULATION_MS / (months + 1);
    const ids = Array.from({ length: months }, (_, i) => setTimeout(() => setLit(i + 1), step * (i + 1)));
    return () => ids.forEach(clearTimeout);
  }, [months]);
  return (
    <div className="sim-overlay" role="status" aria-live="polite" data-testid="simulation">
      <div className="sim-card">
        <div className="sim-rocket">
          <RocketGlyph size={44} />
        </div>
        <div className="sim-title">{toEnd ? f.tx("Simulating to the end of the game", "Simulazione fino alla fine della partita") : f.tx("Simulating the period", "Simulazione del periodo")}</div>
        <div className="sim-sub">{toEnd ? f.tx("Every remaining round, in one go", "Tutti i round rimanenti, in un colpo solo") : f.L(roundLabel(config, round))}</div>
        {!toEnd && (
          <div className="sim-months" aria-hidden="true">
            {Array.from({ length: months }, (_, i) => (
              <span key={i} className={`sim-month ${i < lit ? "on" : ""}`}>
                {f.tx("M", "M")}
                {i + 1}
              </span>
            ))}
          </div>
        )}
        <div className="sim-bar">
          <i style={{ animationDuration: `${SIMULATION_MS}ms` }} />
        </div>
        <div className="sim-hint">{f.tx("The market is answering your decisions…", "Il mercato sta rispondendo alle vostre decisioni…")}</div>
      </div>
    </div>
  );
}
