import { useEffect, useState, type ReactNode } from "react";
import { openTextFiles } from "../../platform/files";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { Modal } from "../components/ui";
import { useFmt } from "../i18n";
import { deleteSave, listSaves, parseGame, readSave, useStore, type SaveMeta } from "../store";
import { LearnContent } from "../views/Learn";

export const APP_VERSION = "2.1.0";
/** The public site: the game's header links back to its sections, like the landing's own navigation. */
const SITE_URL = "https://kurisuchanxxx.github.io/foundersdilemma/";

function MenuRow({ icon, label, sub, onClick, disabled, primary }: { icon: string; label: string; sub?: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button type="button" className={`menu-row ${primary ? "continue" : ""}`} onClick={onClick} disabled={disabled}>
      <span className="ico">
        <Icon name={icon} size={17} />
      </span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="label">{label}</span>
        {sub && <span className="sub">{sub}</span>}
      </span>
      <Icon name="ChevronRight" size={15} className="chev" />
    </button>
  );
}

export function Home({ entranceDelay = 0 }: { entranceDelay?: number }) {
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

  const saveLabel = (s: SaveMeta) => `${s.finished ? f.tx("Finished", "Conclusa") : `${f.tx("Round", "Round")} ${Math.min(s.round, s.totalRounds)}/${s.totalRounds}`} · ${s.companies.filter((c) => !c.isBot).length} ${f.tx("teams", "team")} · ${f.date(s.savedAt)}`;

  return (
    <div className="home-screen enter" style={{ "--hs-delay": `${entranceDelay}ms` } as React.CSSProperties}>
      <div className="home-glow" aria-hidden="true" />
      <div className="home-stars far" aria-hidden="true" />
      <div className="home-stars" aria-hidden="true" />
      <div className="home-grid" aria-hidden="true" />

      <header className="home-header">
        <a className="home-brand" href={`${SITE_URL}?lang=${lang}`} aria-label="Founder's Dilemma">
          <Brand />
        </a>
        <nav className="home-nav" aria-label={f.tx("Site sections", "Sezioni del sito")}>
          <a href={`${SITE_URL}?lang=${lang}`}>Home</a>
          <a href={`${SITE_URL}?lang=${lang}#gioco`}>{f.tx("The game", "Il gioco")}</a>
          <a href={`${SITE_URL}?lang=${lang}#aula`}>{f.tx("In class", "In aula")}</a>
          <a href={`${SITE_URL}?lang=${lang}#corso`}>{f.tx("For the course", "Per il corso")}</a>
        </nav>
        <span className="home-version">
          <span className="label">{f.tx("Version", "Versione")}</span>
          <span className="value">{APP_VERSION.replace(/\.0$/, "")} &nbsp;•&nbsp; macOS · Windows · Web</span>
        </span>
        <span className="lang-switch" role="radiogroup" aria-label={f.tx("Language", "Lingua")}>
          <button type="button" role="radio" aria-checked={lang === "en"} aria-pressed={lang === "en"} aria-label="English" onClick={() => setLang("en")}>
            EN
          </button>
          <button type="button" role="radio" aria-checked={lang === "it"} aria-pressed={lang === "it"} aria-label="Italiano" onClick={() => setLang("it")}>
            IT
          </button>
        </span>
        <span className="lang-switch theme-switch" role="radiogroup" aria-label={f.tx("Theme", "Tema")}>
          <button type="button" role="radio" aria-checked={theme === "auto"} aria-pressed={theme === "auto"} title="Auto" aria-label="Auto" onClick={() => setTheme("auto")}>
            <Icon name="Settings2" size={14} />
          </button>
          <button type="button" role="radio" aria-checked={theme === "light"} aria-pressed={theme === "light"} title="Light" aria-label="Light" onClick={() => setTheme("light")}>
            <Icon name="Sun" size={14} />
          </button>
          <button type="button" role="radio" aria-checked={theme === "dark"} aria-pressed={theme === "dark"} title="Dark" aria-label="Dark" onClick={() => setTheme("dark")}>
            <Icon name="Moon" size={14} />
          </button>
        </span>
        <button type="button" className="home-signup" onClick={() => (latest ? void open(latest) : openSetup())}>
          {f.tx("Play now", "Gioca ora")}
        </button>
      </header>

      <main className="home-hero">
        <div className="home-hero-text">
          <h1 className="home-title">
            <span className="line line-one">
              <span className="line-reveal">Founder's Dilemma</span>
            </span>
            <span className="line line-two">
              <span className="line-reveal">{f.tx("From seed to exit.", "Dal seed all'exit.")}</span>
            </span>
          </h1>
          <p className="home-copy">
            {f.tx(
              "A startup venturing business game: build a company, make hard choices, learn by doing. Round after round, you decide and the market answers.",
              "Il business game di startup venturing: costruisci un'azienda, affronta scelte difficili, impara facendo. Round dopo round decidi tu, e il mercato risponde.",
            )}
          </p>
          <div className="home-cta-row">
            {latest ? (
              <>
                <button type="button" className="pill solid" onClick={() => open(latest)}>
                  {f.tx("Continue", "Continua")}
                  <span className="arrow">
                    <Icon name="Play" size={13} />
                  </span>
                </button>
                <button type="button" className="pill glass" onClick={openSetup}>
                  <Icon name="Plus" size={15} />
                  {f.tx("New game", "Nuova partita")}
                </button>
              </>
            ) : (
              <button type="button" className="pill solid" onClick={openSetup}>
                {f.tx("New game", "Nuova partita")}
                <span className="arrow">
                  <Icon name="ArrowUpRight" size={14} />
                </span>
              </button>
            )}
          </div>
        </div>

        <nav className="home-panel" aria-label={f.tx("Main menu", "Menu principale")}>
          <div className="home-panel-head">{latest ? f.tx("Your game", "La tua partita") : f.tx("Start", "Inizia")}</div>
          {latest && <MenuRow primary icon="Play" label={`${f.tx("Continue", "Continua")}: ${latest.name}`} sub={saveLabel(latest)} onClick={() => open(latest)} />}
          {latest && <MenuRow icon="Plus" label={f.tx("New game", "Nuova partita")} sub={f.tx("Solo, hot-seat or classroom", "Solo, hot-seat o classe")} onClick={openSetup} />}
          <MenuRow icon="FolderOpen" label={f.tx("Load game", "Carica partita")} sub={saves.length > 0 ? `${saves.length} ${f.tx(saves.length === 1 ? "save" : "saves", saves.length === 1 ? "salvataggio" : "salvataggi")}` : f.tx("No saves on this device yet", "Ancora nessun salvataggio su questo dispositivo")} onClick={() => setShowLoad(true)} disabled={saves.length === 0} />
          <MenuRow icon="Upload" label={f.tx("Open game file", "Apri file di partita")} sub={f.tx("A .fdgame.json exported earlier", "Un file .fdgame.json esportato in precedenza")} onClick={importFile} />
          <MenuRow icon="School" label={f.tx("Join a class (team)", "Partecipa a una classe (team)")} sub={f.tx("Open the instructor's file and pick your team", "Apri il file del docente e scegli il tuo team")} onClick={openJoin} />
          <MenuRow icon="BookOpen" label={f.tx("Guide & glossary", "Guida e glossario")} sub={f.tx("Rules, concepts and the course glossary", "Regole, concetti e il glossario del corso")} onClick={() => setShowGuide(true)} />
        </nav>
      </main>

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
