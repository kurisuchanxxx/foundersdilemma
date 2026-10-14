import { useState } from "react";
import { roundLabel } from "../../core";
import { saveTextFile } from "../../platform/files";
import { LineChart } from "../components/charts";
import { Icon } from "../components/Icon";
import { Card, Empty, Segmented } from "../components/ui";
import { useActiveCompany, useGame } from "../hooks";
import { useFmt } from "../i18n";
import { downloadTeamReport } from "../report/teamReport";
import { useStore } from "../store";
import { ReportBody } from "./RoundReport";

type Metric = "cash" | "mrr" | "customers" | "valuation" | "founderOwnership" | "runway";

export function Reports() {
  const f = useFmt();
  const game = useGame();
  const c = useActiveCompany();
  const reports = c ? game.reports.filter((r) => r.companyId === c.id) : [];
  const [round, setRound] = useState<number | null>(reports.length ? reports[reports.length - 1].round : null);
  const [metric, setMetric] = useState<Metric>("cash");
  const lang = useStore((s) => s.lang);
  if (!c) return null;
  const report = reports.find((r) => r.round === round);
  const fmt = (v: number) => (metric === "founderOwnership" ? f.pct(v) : metric === "customers" ? f.compact(v) : metric === "runway" ? f.num(Math.min(v, 60), 1) : f.money(v));

  const exportCsv = () => {
    const header = ["round", "cash", "mrr", "customers", "new_customers", "churn", "price", "cac", "ltv", "net_burn", "runway", "valuation", "founder_ownership", "pmf", "quality", "tech_debt", "headcount", "morale"];
    const rows = c.history.map((h) => [h.round, h.cash, h.mrr, h.customers, h.newCustomers, h.churn, h.price, h.cac, h.ltv, h.netBurn, Math.min(999, h.runway), h.valuation, h.founderOwnership, h.pmf, h.quality, h.techDebt, h.headcount, h.morale].map((v) => (Number.isInteger(v) ? v : Number(v).toFixed(4))).join(","));
    void saveTextFile(`${c.name.replace(/\W+/g, "_")}_history.csv`, [header.join(","), ...rows].join("\n"), [{ name: "CSV", extensions: ["csv"] }], "text/csv");
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{f.tx("Round reports", "Report dei round")}</h1>
          <p className="muted">{f.tx("Look back at what happened and why.", "Riguarda cosa è successo e perché.")}</p>
        </div>
        <div className="row wrap">
          <button className="btn" onClick={() => void downloadTeamReport(game, c, lang)} disabled={c.history.length === 0}>
            <Icon name="FileText" size={16} />
            {f.tx("Team report (printable)", "Report del team (stampabile)")}
          </button>
          <button className="btn" onClick={exportCsv} disabled={c.history.length === 0}>
            <Icon name="FileSpreadsheet" size={16} />
            {f.tx("Export my history (CSV)", "Esporta il mio storico (CSV)")}
          </button>
        </div>
      </div>
      {c.history.length > 0 && (
        <Card title={f.tx("Trend", "Andamento")} icon="LineChart">
          <Segmented
            value={metric}
            options={[
              { value: "cash", label: f.tx("Cash", "Cassa") },
              { value: "mrr", label: "MRR" },
              { value: "customers", label: f.tx("Customers", "Clienti") },
              { value: "valuation", label: f.tx("Valuation", "Valutazione") },
              { value: "founderOwnership", label: f.tx("Founders' %", "% fondatori") },
              { value: "runway", label: "Runway" },
            ]}
            onChange={setMetric}
          />
          <div className="mt-16">
            <LineChart
              series={[{ id: metric, label: metric, color: "var(--s1)", points: c.history.map((h) => ({ x: h.round, y: metric === "runway" ? Math.min(60, h.runway) : h[metric] })) }]}
              xFormat={(r) => `R${r}`}
              yFormat={fmt}
              area
              height={220}
            />
          </div>
        </Card>
      )}
      {reports.length === 0 ? (
        <Empty icon="FileText">{f.tx("Reports appear after the first round.", "I report compaiono dopo il primo round.")}</Empty>
      ) : (
        <>
          <Segmented value={round ?? reports[0].round} options={reports.map((r) => ({ value: r.round, label: f.L(roundLabel(game.config, r.round)) }))} onChange={setRound} />
          {report && <ReportBody c={c} report={report} />}
        </>
      )}
    </div>
  );
}
