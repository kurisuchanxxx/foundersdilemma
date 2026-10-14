import { useState } from "react";
import { SECTORS, type GameState } from "../../core";
import { openTextFiles } from "../../platform/files";
import { Icon } from "../components/Icon";
import { Callout, Card, Logo } from "../components/ui";
import { useFmt } from "../i18n";
import { parseGame, useStore } from "../store";

export function JoinClassroom() {
  const f = useFmt();
  const goHome = useStore((s) => s.goHome);
  const loadGame = useStore((s) => s.loadGame);
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    const files = await openTextFiles([{ name: "Founder's Dilemma", extensions: ["json"] }]);
    if (!files.length) return;
    const g = parseGame(files[0].contents);
    if (!g) {
      setError(f.tx("This is not a valid game file.", "Questo non è un file di partita valido."));
      return;
    }
    setError(null);
    setGame(g);
  };

  return (
    <div className="wizard">
      <div className="wizard-inner" style={{ maxWidth: 640 }}>
        <button className="btn ghost" onClick={goHome}>
          <Icon name="ChevronLeft" size={16} />
          {f.tx("Home", "Home")}
        </button>
        <div className="stack mt-16">
          <div>
            <h1>{f.tx("Join a class", "Partecipa a una classe")}</h1>
            <p className="muted mt-8">
              {f.tx(
                "Open the game file shared by your instructor, choose your team and play your round. Then export your decision file and send it back.",
                "Apri il file di partita condiviso dal docente, scegli il tuo team e gioca il round. Poi esporta il file delle decisioni e rimandalo al docente.",
              )}
            </p>
          </div>
          <button className="btn primary lg" onClick={pick}>
            <Icon name="FolderOpen" size={18} />
            {f.tx("Open the game file", "Apri il file di partita")}
          </button>
          {error && <Callout tone="bad">{error}</Callout>}
          {game && (
            <Card title={`${game.config.sessionName || game.config.seed} · ${f.tx("round", "round")} ${game.round}/${game.config.totalRounds}`} icon="School">
              {game.config.mode !== "classroom" && <Callout tone="warn">{f.tx("This game was not created in classroom mode, but you can still play your team.", "Questa partita non è stata creata in modalità classe, ma puoi comunque giocare il tuo team.")}</Callout>}
              <p className="small muted" style={{ margin: "8px 0" }}>
                {f.tx("Which team are you?", "Quale team siete?")}
              </p>
              <div className="col">
                {game.companies
                  .filter((c) => !c.isBot)
                  .map((c) => (
                    <button key={c.id} className="option-card" onClick={() => loadGame(game, { classroomRole: "team", activeCompanyId: c.id, saveId: null })}>
                      <Logo company={c} size={36} />
                      <span className="grow">
                        <span className="title">{c.name}</span>
                        <span className="desc" style={{ display: "block" }}>
                          {f.L(SECTORS[c.sector].name)} {c.teamMembers.length > 0 ? `· ${c.teamMembers.join(", ")}` : ""}
                        </span>
                      </span>
                      <Icon name="ChevronRight" size={16} />
                    </button>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
