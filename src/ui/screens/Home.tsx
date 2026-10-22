import { useEffect, useRef, useState, type ReactNode } from "react";
import { openTextFiles } from "../../platform/files";
import { Brand } from "../components/Brand";
import { CtrlStudioLogo } from "../components/CtrlStudioLogo";
import { Icon } from "../components/Icon";
import { Modal } from "../components/ui";
import { useFmt } from "../i18n";
import { deleteSave, listSaves, parseGame, readSave, useStore, type SaveMeta } from "../store";
import { LearnContent } from "../views/Learn";

export const APP_VERSION = "2.1.0";
/** The public site: the game's header and footer link back to it, like the landing's own navigation. */
const SITE_URL = "https://kurisuchanxxx.github.io/foundersdilemma/";
const REPO_URL = "https://github.com/kurisuchanxxx/foundersdilemma";
/** The landing page's background film, tinted to the game's blue by a CSS filter. */
const HERO_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_064556_051587f1-74a1-4336-8c05-4dde3594ed05.mp4";

/** A link to the public site: relative when the game is served next to it (at /play/), absolute elsewhere (desktop app, single file). */
function siteHref(lang: string, hash = ""): string {
  try {
    if (typeof window !== "undefined" && /^https?:/.test(window.location.protocol) && /\/play\/?$/.test(window.location.pathname)) return `../?lang=${lang}${hash}`;
  } catch {
    /* no window */
  }
  return `${SITE_URL}?lang=${lang}${hash}`;
}

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
  const [videoOk, setVideoOk] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const refresh = () => void listSaves().then(setSaves);
  useEffect(refresh, []);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      /* autoplay refused: the glow stays */
    });
  }, [videoOk]);

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
      <section className="home-stage">
        <div className="home-glow" aria-hidden="true" />
        {videoOk && (
          <video ref={videoRef} className="home-bg" autoPlay muted loop playsInline disablePictureInPicture preload="auto" aria-hidden="true" onError={() => setVideoOk(false)}>
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        )}
        <div className="home-scrim" aria-hidden="true" />

        <header className="home-header">
          <a className="home-brand" href={siteHref(lang)} aria-label="Founder's Dilemma">
            <Brand />
          </a>
          <nav className="home-nav" aria-label={f.tx("Site sections", "Sezioni del sito")}>
            <a href={siteHref(lang)}>Home</a>
            <a href={siteHref(lang, "#gioco")}>{f.tx("The game", "Il gioco")}</a>
            <a href={siteHref(lang, "#aula")}>{f.tx("In class", "In aula")}</a>
            <a href={siteHref(lang, "#corso")}>{f.tx("For the course", "Per il corso")}</a>
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
          <nav className="home-panel" aria-label={f.tx("Main menu", "Menu principale")}>
            <div className="home-panel-head">{latest ? f.tx("Your game", "La tua partita") : f.tx("Start", "Inizia")}</div>
            {latest && <MenuRow primary icon="Play" label={`${f.tx("Continue", "Continua")}: ${latest.name}`} sub={saveLabel(latest)} onClick={() => open(latest)} />}
            <MenuRow primary={!latest} icon="Plus" label={f.tx("New game", "Nuova partita")} sub={f.tx("Solo, hot-seat or classroom", "Solo, hot-seat o classe")} onClick={openSetup} />
            <MenuRow icon="FolderOpen" label={f.tx("Load game", "Carica partita")} sub={saves.length > 0 ? `${saves.length} ${f.tx(saves.length === 1 ? "save" : "saves", saves.length === 1 ? "salvataggio" : "salvataggi")}` : f.tx("No saves on this device yet", "Ancora nessun salvataggio su questo dispositivo")} onClick={() => setShowLoad(true)} disabled={saves.length === 0} />
            <MenuRow icon="Upload" label={f.tx("Open game file", "Apri file di partita")} sub={f.tx("A .fdgame.json exported earlier", "Un file .fdgame.json esportato in precedenza")} onClick={importFile} />
            <MenuRow icon="School" label={f.tx("Join a class (team)", "Partecipa a una classe (team)")} sub={f.tx("Open the instructor's file and pick your team", "Apri il file del docente e scegli il tuo team")} onClick={openJoin} />
            <MenuRow icon="BookOpen" label={f.tx("Guide & glossary", "Guida e glossario")} sub={f.tx("Rules, concepts and the course glossary", "Regole, concetti e il glossario del corso")} onClick={() => setShowGuide(true)} />
          </nav>
        </main>
      </section>

      <footer className="home-footer">
        <div className="hf-panel">
          <div className="hf-top">
            <a className="home-brand" href={siteHref(lang)} aria-label="Founder's Dilemma">
              <Brand />
            </a>
            <div className="hf-actions">
              <a className="pill glass sm" href={REPO_URL} target="_blank" rel="noopener">
                GitHub
              </a>
              <button type="button" className="pill solid sm" onClick={() => (latest ? void open(latest) : openSetup())}>
                {f.tx("Play now", "Gioca ora")}
                <span className="arrow">
                  <Icon name="ArrowRight" size={13} />
                </span>
              </button>
            </div>
          </div>
          <div className="hf-grid">
            <div>
              <p className="hf-about">{f.tx("A startup venturing business game for university classrooms. Deterministic simulation engine in TypeScript, interface in English and Italian.", "Business game di startup venturing per l'aula universitaria. Motore di simulazione deterministico in TypeScript, interfaccia in italiano e inglese.")}</p>
              <span className="hf-meta">
                <span className="label">{f.tx("Version", "Versione")}</span>
                <span className="value">{APP_VERSION.replace(/\.0$/, "")} &nbsp;•&nbsp; macOS · Windows · Linux · Web</span>
              </span>
            </div>
            <div className="hf-col">
              <h4>{f.tx("Game", "Gioco")}</h4>
              <a href={siteHref(lang)}>{f.tx("Presentation page", "Pagina di presentazione")}</a>
              <a href={`${REPO_URL}/releases`} target="_blank" rel="noopener">
                {f.tx("Download the apps", "Scarica le app")}
              </a>
              <a href={REPO_URL} target="_blank" rel="noopener">
                {f.tx("Code on GitHub", "Codice su GitHub")}
              </a>
              <a href={`${REPO_URL}/blob/main/LICENSE.md`} target="_blank" rel="noopener">
                {f.tx("License", "Licenza")}
              </a>
            </div>
            <div className="hf-col">
              <h4>{f.tx("For the course", "Per il corso")}</h4>
              <a href={`${REPO_URL}/tree/main/docs/corso`} target="_blank" rel="noopener">
                {f.tx("Course materials", "Materiali per il corso")}
              </a>
              <a href={`${REPO_URL}/blob/main/docs/corso/01-module-proposal-en.md`} target="_blank" rel="noopener">
                {f.tx("Module proposal (English)", "Module proposal (inglese)")}
              </a>
              <a href={`${REPO_URL}/blob/main/docs/corso/06-modello-di-simulazione.md`} target="_blank" rel="noopener">
                {f.tx("The simulation model", "Il modello di simulazione")}
              </a>
              <a href={`${REPO_URL}#readme`} target="_blank" rel="noopener">
                README
              </a>
            </div>
            <div className="hf-col hf-studio">
              <h4>{f.tx("A project by", "Un progetto di")}</h4>
              <a className="hf-logo" href="https://ctrlstudio.it" target="_blank" rel="noopener" aria-label="Ctrl Studio">
                <CtrlStudioLogo />
              </a>
              <p className="hf-desc">{f.tx("Digital studio in Ancona, Italy: websites, automation, management software and digital strategy for SMEs, professional firms and startups.", "Studio digitale di Ancona: siti web, automazioni, gestionali e strategia digitale per PMI, studi professionali e startup.")}</p>
              <a className="hf-site" href="https://ctrlstudio.it" target="_blank" rel="noopener">
                ctrlstudio.it <Icon name="ArrowUpRight" size={13} />
              </a>
            </div>
          </div>
          <div className="hf-bottom">
            <span>© 2026 Christian Ray Lantieri · Ctrl Studio.</span>
            <span>{f.tx("Code: PolyForm Noncommercial 1.0.0 · Materials: CC BY-NC-SA 4.0", "Codice PolyForm Noncommercial 1.0.0 · Materiali CC BY-NC-SA 4.0")}</span>
          </div>
        </div>
      </footer>

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
