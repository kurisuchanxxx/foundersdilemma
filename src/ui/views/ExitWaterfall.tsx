// Advanced complexity only: who gets what at a given exit value (liquidation waterfall).
import { useMemo, useState } from "react";
import { founderPayout, safeImpliedPct, waterfall, type Company, type Payout } from "../../core";
import { LineChart } from "../components/charts";
import { Badge, Card, InfoTip, Segmented, Stat } from "../components/ui";
import { useFmt } from "../i18n";

const MULTIPLES = [0.25, 0.5, 1, 2, 4] as const;

function byGroup(c: Company, payouts: Payout[]) {
  const founders = founderPayout(c, payouts);
  const employees = payouts.filter((p) => p.kind === "employee").reduce((s, p) => s + p.amount, 0);
  const investors = payouts.filter((p) => p.kind === "investor" || p.kind === "crowd").reduce((s, p) => s + p.amount, 0);
  return { founders, employees, investors };
}

export function ExitWaterfall({ c }: { c: Company }) {
  const f = useFmt();
  const [multiple, setMultiple] = useState<number>(1);
  const base = Math.max(c.valuation, 100_000);
  const exitValue = base * multiple;

  const prefStack = c.capTable.holders.reduce((s, h) => s + (h.kind !== "pool" ? h.preference : 0), 0) + c.safes.reduce((s, x) => s + x.amount, 0);
  const payouts = useMemo(() => waterfall(c, exitValue), [c, exitValue]);
  const groups = byGroup(c, payouts);

  const curve = useMemo(() => {
    const max = Math.max(base * 4, prefStack * 2);
    const pts = Array.from({ length: 41 }, (_, i) => (max * i) / 40);
    return pts.map((x) => ({ x, ...byGroup(c, waterfall(c, x)) }));
  }, [c, base, prefStack]);

  const rows = payouts
    .filter((p) => p.amount > 0 || p.kind !== "employee")
    .sort((a, b) => b.amount - a.amount);
  const holder = (id: string) => c.capTable.holders.find((h) => h.id === id);
  const safe = (id: string) => c.safes.find((s) => s.id === id);
  const kindLabel = (k: Payout["kind"]) =>
    k === "founder" ? f.tx("founder", "fondatore") : k === "employee" ? f.tx("employee", "dipendente") : k === "crowd" ? "crowd" : f.tx("investor", "investitore");

  return (
    <Card title={f.tx("Exit waterfall simulator", "Simulatore del waterfall di uscita")} icon="Layers" action={<InfoTip concept="liquidationPreference" />}>
      <p className="small muted" style={{ marginTop: 0 }}>
        {f.tx(
          "Advanced finance: how a sale price would be split today. Investors with preferences are paid first (1x non-participating, 2x for rescue rounds), unless converting to common pays them more.",
          "Finanza avanzata: come si dividerebbe oggi un prezzo di vendita. Gli investitori con preferenza vengono pagati per primi (1x non partecipante, 2x nei round di salvataggio), a meno che convertire in azioni ordinarie non renda di più.",
        )}
      </p>
      <div className="row wrap gap-12 mt-8">
        <span className="small muted">{f.tx("Exit value", "Valore di uscita")}</span>
        <Segmented value={multiple} options={MULTIPLES.map((m) => ({ value: m, label: `${m}× ${f.tx("val.", "val.")}` }))} onChange={setMultiple} />
      </div>
      <div className="grid cols-4 mt-16">
        <Stat label={f.tx("Exit value", "Valore di uscita")} value={f.money(exitValue)} sub={`${multiple}× ${f.tx("current valuation", "valutazione attuale")}`} />
        <Stat label={f.tx("Preference stack", "Stack delle preferenze")} concept="liquidationPreference" value={f.money(prefStack)} sub={c.safes.length > 0 ? `${f.tx("incl. SAFEs", "inclusi SAFE")} (${f.pct(safeImpliedPct(c), 1)})` : undefined} />
        <Stat label={f.tx("To the founders", "Ai fondatori")} value={f.money(groups.founders)} sub={exitValue > 0 ? f.pct(groups.founders / exitValue, 1) : undefined} tone={groups.founders > 0 ? "good" : "bad"} />
        <Stat label={f.tx("To investors", "Agli investitori")} value={f.money(groups.investors)} sub={exitValue > 0 ? f.pct(groups.investors / exitValue, 1) : undefined} />
      </div>

      <div className="mt-16">
        <LineChart
          series={[
            { id: "founders", label: f.tx("Founders", "Fondatori"), color: "var(--s1)", points: curve.map((p) => ({ x: p.x, y: p.founders })) },
            { id: "investors", label: f.tx("Investors", "Investitori"), color: "var(--s2)", points: curve.map((p) => ({ x: p.x, y: p.investors })) },
            { id: "employees", label: f.tx("Employees", "Dipendenti"), color: "var(--s3)", points: curve.map((p) => ({ x: p.x, y: p.employees })) },
          ]}
          xFormat={(x) => f.money(x)}
          yFormat={(y) => f.money(y)}
          height={200}
        />
        <p className="tiny faint">{f.tx("Horizontal axis: exit value. Below the preference stack the founders receive nothing.", "Asse orizzontale: valore di uscita. Sotto lo stack delle preferenze i fondatori non ricevono nulla.")}</p>
      </div>

      <div className="table-wrap mt-16">
        <table className="table">
          <thead>
            <tr>
              <th>{f.tx("Holder", "Socio")}</th>
              <th>{f.tx("Type", "Tipo")}</th>
              <th className="num">{f.tx("Preference", "Preferenza")}</th>
              <th>{f.tx("Takes", "Prende")}</th>
              <th className="num">{f.tx("Payout", "Incasso")}</th>
              <th className="num">{f.tx("Share of exit", "Quota dell'exit")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const pref = holder(p.holderId)?.preference ?? safe(p.holderId)?.amount ?? 0;
              const converts = pref > 0 && p.amount > pref + 1;
              return (
                <tr key={p.holderId}>
                  <td>{p.name}</td>
                  <td className="small muted">{safe(p.holderId) ? "SAFE" : kindLabel(p.kind)}</td>
                  <td className="num">{pref > 0 ? f.money(pref) : "—"}</td>
                  <td>{pref <= 0 ? <Badge>{f.tx("common", "ordinarie")}</Badge> : converts ? <Badge tone="accent">{f.tx("converts", "converte")}</Badge> : <Badge tone="warn">{f.tx("preference", "preferenza")}</Badge>}</td>
                  <td className="num">{f.money(p.amount)}</td>
                  <td className="num">{exitValue > 0 ? f.pct(p.amount / exitValue, 1) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
