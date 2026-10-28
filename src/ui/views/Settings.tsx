import { useState } from "react";
import { decisionsCsv, historyCsv, standingsCsv } from "../../core";
import { isDesktop, openTextFiles, saveTextFile } from "../../platform/files";
import { checkTeamUpdate, exportDecisionFile, gameFileContents, gameFileName } from "../classroom";
import { Icon } from "../components/Icon";
import { Callout, Card, Segmented } from "../components/ui";
import { useActiveCompany, useGame } from "../hooks";
import { useFmt } from "../i18n";
import { parseGame, stateForSave, useStore } from "../store";
import { APP_VERSION } from "../screens/Home";

export function SettingsView() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const saveAs = useStore((s) => s.saveAs);
  const drafts = useStore((s) => s.drafts);
  const goHome = useStore((s) => s.goHome);
  const role = useStore((s) => s.classroomRole);
  const loadGame = useStore((s) => s.loadGame);
  const toast = useStore((s) => s.toast);
  const draftOf = useStore((s) => s.draft);
  const [name, setName] = useState(game.config.sessionName || "");

  const exportGame = async () => {
    const ok = await saveTextFile(gameFileName(game), gameFileContents(stateForSave(game, drafts)), [{ name: "Founder's Dilemma", extensions: ["json"] }]);
    if (ok) toast(f.tx("Game file exported.", "File di partita esportato."), "good");
  };

  const exportDecision = async () => {
    if (!c) return;
    const d = c.submitted && c.decision ? c.decision : draftOf(c.id);
    if (!d) return;
    const ok = await exportDecisionFile(game, c.id, d);
    if (ok) toast(f.tx("Decision file exported: send it to the instructor.", "File delle decisioni esportato: invialo al docente."), "good");
  };

  const importUpdate = async () => {
    const files = await openTextFiles([{ name: "Founder's Dilemma", extensions: ["json"] }]);
    if (!files.length) return;
    const incoming = parseGame(files[0].contents);
    if (!incoming) return toast(f.tx("Not a valid game file.", "Non è un file di partita valido."), "bad");
    const check = checkTeamUpdate(game, incoming);
    if (!check.ok) return toast(f.L(check.message), "bad");
    loadGame(incoming, { classroomRole: "team", activeCompanyId: c?.id ?? null });
    if (incoming.round > game.round) useStore.getState().openReport(incoming.round - 1);
    toast(f.L(check.message), "good");
  };

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{f.tx("Settings & save", "Impostazioni e salvataggio")}</h1>
      </div>
      <div className="grid cols-2">
        <Card title={f.tx("Appearance", "Aspetto")} icon="Palette">
          <div className="col gap-12">
            <div className="field">
              <div className="field-label">{f.tx("Language", "Lingua")}</div>
              <Segmented value={lang} options={[{ value: "it", label: "Italiano" }, { value: "en", label: "English" }]} onChange={setLang} />
            </div>
            <div className="field">
              <div className="field-label">{f.tx("Theme", "Tema")}</div>
              <Segmented
                value={theme}
                options={[
                  { value: "auto", label: f.tx("Auto", "Automatico") },
                  { value: "light", label: f.tx("Light", "Chiaro") },
                  { value: "dark", label: f.tx("Dark", "Scuro") },
                ]}
                onChange={setTheme}
              />
            </div>
          </div>
        </Card>
        <Card title={f.tx("Save", "Salvataggio")} icon="Save">
          <p className="small muted">{f.tx("The game is saved automatically after every change. You can also keep named copies or export a file.", "La partita viene salvata automaticamente a ogni modifica. Puoi anche tenere copie con nome o esportare un file.")}</p>
          <div className="row mt-16">
            <input className="input" value={name} placeholder={f.tx("Name of the copy", "Nome della copia")} onChange={(e) => setName(e.target.value)} />
            <button
              className="btn"
              onClick={async () => {
                await saveAs(name || `${game.config.seed} R${game.round}`);
                toast(f.tx("Copy saved.", "Copia salvata."), "good");
              }}
            >
              <Icon name="Save" size={16} />
              {f.tx("Save copy", "Salva copia")}
            </button>
          </div>
          <div className="row wrap mt-16">
            <button className="btn" onClick={exportGame}>
              <Icon name="Download" size={16} />
              {f.tx("Export game file", "Esporta file di partita")}
            </button>
          </div>
        </Card>
      </div>

      {role === "team" && c && (
        <Card title={f.tx("Classroom: team copy", "Classe: copia del team")} icon="School">
          <Callout tone="info">
            {f.tx(
              "1) Decide and submit. 2) Export the decision file and send it to the instructor. 3) When the instructor shares the new game file, import it here to see the results.",
              "1) Decidi e invia. 2) Esporta il file delle decisioni e invialo al docente. 3) Quando il docente condivide il nuovo file di partita, importalo qui per vedere i risultati.",
            )}
          </Callout>
          <div className="row wrap mt-16">
            <button className="btn primary" onClick={exportDecision} disabled={game.finished}>
              <Icon name="Upload" size={16} />
              {f.tx("Export decision file", "Esporta file delle decisioni")}
            </button>
            <button className="btn" onClick={importUpdate}>
              <Icon name="Download" size={16} />
              {f.tx("Import updated game from instructor", "Importa la partita aggiornata dal docente")}
            </button>
          </div>
          {!c.submitted && !game.finished && <p className="small warn mt-8">{f.tx("Your decisions are not submitted yet: the file will contain your current draft.", "Le decisioni non sono ancora inviate: il file conterrà la bozza attuale.")}</p>}
        </Card>
      )}

      {role !== "team" && (
        <Card title={f.tx("Data exports for instructors", "Esportazione dati per i docenti")} icon="FileSpreadsheet">
          <p className="small muted">{f.tx("CSV files open in Excel, Numbers or Google Sheets: use them for grading and for the debrief.", "I file CSV si aprono con Excel, Numbers o Google Sheets: usali per la valutazione e il debriefing.")}</p>
          <div className="row wrap mt-16">
            <button className="btn" onClick={() => saveTextFile(`${game.config.seed}_history.csv`, historyCsv(game, lang), [{ name: "CSV", extensions: ["csv"] }], "text/csv")}>
              <Icon name="FileSpreadsheet" size={16} />
              {f.tx("History (all teams, all rounds)", "Storico (tutti i team, tutti i round)")}
            </button>
            <button className="btn" onClick={() => saveTextFile(`${game.config.seed}_decisions.csv`, decisionsCsv(game, lang), [{ name: "CSV", extensions: ["csv"] }], "text/csv")}>
              <Icon name="FileSpreadsheet" size={16} />
              {f.tx("Decisions", "Decisioni")}
            </button>
            <button className="btn" onClick={() => saveTextFile(`${game.config.seed}_standings.csv`, standingsCsv(game, lang), [{ name: "CSV", extensions: ["csv"] }], "text/csv")}>
              <Icon name="FileSpreadsheet" size={16} />
              {f.tx("Standings", "Classifica")}
            </button>
          </div>
        </Card>
      )}

      <Card title={f.tx("Game", "Partita")} icon="Info">
        <div className="kv">
          <span>Seed</span>
          <span>{game.config.seed}</span>
          <span>{f.tx("Mode", "Modalità")}</span>
          <span>{{ solo: f.tx("Solo vs bots", "Solo contro bot"), hotseat: f.tx("Hot-seat", "Hot-seat"), classroom: f.tx("Classroom (files)", "Classe (file)") }[game.config.mode]}</span>
          <span>{f.tx("Complexity", "Complessità")}</span>
          <span>{{ essential: f.tx("Essential", "Essenziale"), standard: f.tx("Standard", "Standard"), advanced: f.tx("Advanced", "Avanzata") }[game.config.complexity]}</span>
          <span>{f.tx("Difficulty", "Difficoltà")}</span>
          <span>{{ forgiving: f.tx("Forgiving", "Indulgente"), standard: f.tx("Standard", "Standard"), hardcore: f.tx("Realistic", "Realistica") }[game.config.difficulty]}</span>
          <span>{f.tx("Version", "Versione")}</span>
          <span>
            {APP_VERSION} · {isDesktop() ? f.tx("desktop app", "app desktop") : f.tx("browser", "browser")}
          </span>
        </div>
        <button className="btn mt-16" onClick={goHome}>
          <Icon name="LogOut" size={16} />
          {f.tx("Back to main menu", "Torna al menu principale")}
        </button>
      </Card>
    </div>
  );
}
