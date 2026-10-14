import { useEffect, useState } from "react";
import { openTextFiles } from "../../platform/files";
import { Icon } from "../components/Icon";
import { Modal, Segmented } from "../components/ui";
import { useFmt } from "../i18n";
import { deleteSave, listSaves, parseGame, readSave, useStore, type SaveMeta } from "../store";
import { LearnContent } from "../views/Learn";

export const APP_VERSION = "2.0.0";

export function Home() {
  const f = useFmt();
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const openSetup = useStore((s) => s.openSetup);
  const openJoin = useStore((s) => s.openJoin);
  const loadGame = useStore((s) => s.loadGame);
  const toast = useStore((s) => s.toast);
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [showLoad, setShowLoad] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = () => void listSaves().then(setSaves);
  useEffect(refresh, []);

  const latest = saves[0];

  const open = async (meta: SaveMeta) => {
    const state = await readSave(meta.id);
    if (!state) {
      toast(f.tx("This save could not be read.", "Impossibile leggere questo salvataggio."), "bad");
      return;
    }
    loadGame(state, { saveId: meta.id, classroomRole: meta.classroomRole });
  };

  const importFile = async () => {
    const files = await openTextFiles([{ name: "Founder's Dilemma", extensions: ["json", "fdgame"] }]);
    if (files.length === 0) return;
    const state = parseGame(files[0].contents);
    if (!state) {
      toast(f.tx("Not a valid Founder's Dilemma game file.", "Non è un file di partita valido di Founder's Dilemma."), "bad");
      return;
    }
    loadGame(state, { saveId: null, classroomRole: state.config.mode === "classroom" ? "host" : null });
    toast(f.tx("Game loaded.", "Partita caricata."), "good");
  };

  return (
    <div className="home">
      <div className="home-inner">
        <div className="row between" style={{ marginBottom: 40 }}>
          <Segmented
            value={lang}
            options={[
              { value: "it", label: "Italiano" },
              { value: "en", label: "English" },
            ]}
            onChange={setLang}
          />
          <Segmented
            value={theme}
            options={[
              { value: "auto", label: <Icon name="Settings2" size={14} />, title: "Auto" },
              { value: "light", label: <Icon name="Sun" size={14} />, title: "Light" },
              { value: "dark", label: <Icon name="Moon" size={14} />, title: "Dark" },
            ]}
            onChange={setTheme}
          />
        </div>

        <div className="center" style={{ marginBottom: 36 }}>
          <div className="logo" style={{ width: 72, height: 72, background: "var(--accent)", borderRadius: 18, margin: "0 auto 18px" }}>
            <Icon name="Rocket" size={38} />
          </div>
          <div className="hero-title">Founder's Dilemma</div>
          <p className="muted" style={{ fontSize: 17, marginTop: 10 }}>
            {f.tx("A startup venturing business game: build a company, make hard choices, learn by doing.", "Il business game di startup venturing: costruisci un'azienda, affronta scelte difficili, impara facendo.")}
          </p>
        </div>

        <div className="col gap-12">
          {latest && (
            <button className="btn primary lg block" onClick={() => open(latest)}>
              <Icon name="Play" size={18} />
              {f.tx("Continue", "Continua")}: {latest.name} · {f.tx("round", "round")} {Math.min(latest.round, latest.totalRounds)}/{latest.totalRounds}
            </button>
          )}
          <button className={`btn lg block ${latest ? "" : "primary"}`} onClick={openSetup}>
            <Icon name="Plus" size={18} />
            {f.tx("New game", "Nuova partita")}
          </button>
          <div className="grid cols-2" style={{ gap: 12 }}>
            <button className="btn lg" onClick={() => setShowLoad(true)} disabled={saves.length === 0}>
              <Icon name="FolderOpen" size={16} />
              {f.tx("Load game", "Carica partita")}
            </button>
            <button className="btn lg" onClick={importFile}>
              <Icon name="Upload" size={16} />
              {f.tx("Open game file", "Apri file di partita")}
            </button>
            <button className="btn lg" onClick={openJoin}>
              <Icon name="School" size={16} />
              {f.tx("Join a class (team)", "Partecipa a una classe (team)")}
            </button>
            <button className="btn lg" onClick={() => setShowGuide(true)}>
              <Icon name="BookOpen" size={16} />
              {f.tx("Guide & glossary", "Guida e glossario")}
            </button>
          </div>
        </div>

        <p className="center faint small" style={{ marginTop: 40 }}>
          {f.tx("Version", "Versione")} {APP_VERSION} · {f.tx("Startup Venturing course module", "Modulo didattico di Startup Venturing")} · {f.tx("macOS · Windows · Web", "macOS · Windows · Web")}
        </p>
      </div>

      {showLoad && (
        <Modal title={f.tx("Load game", "Carica partita")} onClose={() => setShowLoad(false)}>
          <div className="col">
            {saves.map((s) => (
              <div key={s.id} className="list-row">
                <Icon name={s.finished ? "Trophy" : s.mode === "solo" ? "UserRound" : "Users"} size={18} className="accent" />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="small faint">
                    {s.finished ? f.tx("Finished", "Conclusa") : `${f.tx("Round", "Round")} ${s.round}/${s.totalRounds}`} · {s.companies.length} {f.tx("companies", "aziende")} · {f.tx("seed", "seed")} {s.seed} · {f.date(s.savedAt)}
                    {s.classroomRole === "team" ? ` · ${f.tx("team copy", "copia del team")}` : ""}
                  </div>
                </div>
                <button className="btn sm primary" onClick={() => open(s)}>
                  {f.tx("Open", "Apri")}
                </button>
                {confirmDelete === s.id ? (
                  <>
                    <button
                      className="btn sm danger"
                      onClick={async () => {
                        await deleteSave(s.id);
                        setConfirmDelete(null);
                        refresh();
                      }}
                    >
                      {f.tx("Delete", "Elimina")}
                    </button>
                    <button className="btn sm ghost" onClick={() => setConfirmDelete(null)}>
                      {f.tx("Keep", "Annulla")}
                    </button>
                  </>
                ) : (
                  <button className="icon-btn" aria-label={f.tx("Delete this save", "Elimina questo salvataggio")} onClick={() => setConfirmDelete(s.id)}>
                    <Icon name="Trash2" size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
      {showGuide && (
        <Modal title={f.tx("Guide & glossary", "Guida e glossario")} onClose={() => setShowGuide(false)} wide>
          <LearnContent />
        </Modal>
      )}
    </div>
  );
}
