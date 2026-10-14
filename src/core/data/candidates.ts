import type { Rng } from "../rng";
import { lt, type LText } from "../text";
import type { Candidate, CandidateCV, Role, SectorId, Seniority, Stats } from "../types";
import professional from "./candidates.json";

type RawCandidate = Omit<Candidate, "availableSinceRound" | "heldFor">;

/** The 50 hand-written candidates (with full CVs) inherited from the Swift blueprint. */
export const PROFESSIONAL_CANDIDATES: RawCandidate[] = professional as RawCandidate[];

export const ROLES: Role[] = ["Engineer", "Product", "Designer", "Growth", "Sales", "Ops", "CustomerSuccess", "Finance"];
export const SENIORITIES: Seniority[] = ["Junior", "Mid", "Senior", "Staff", "Principal"];

export const ROLE_LABEL: Record<Role, LText> = {
  Engineer: lt("Engineer", "Ingegnere software"),
  Product: lt("Product manager", "Product manager"),
  Designer: lt("Designer", "Designer"),
  Growth: lt("Growth marketer", "Growth marketer"),
  Sales: lt("Sales", "Commerciale"),
  Ops: lt("Operations", "Operations"),
  CustomerSuccess: lt("Customer success", "Customer success"),
  Finance: lt("Finance", "Finanza"),
};

export const SENIORITY_LABEL: Record<Seniority, LText> = {
  Junior: lt("Junior", "Junior"),
  Mid: lt("Mid", "Intermedio"),
  Senior: lt("Senior", "Senior"),
  Staff: lt("Staff", "Staff"),
  Principal: lt("Principal", "Principal"),
};

export const SALARY_RANGE: Record<Seniority, [number, number]> = {
  Junior: [30_000, 40_000],
  Mid: [44_000, 60_000],
  Senior: [62_000, 90_000],
  Staff: [88_000, 120_000],
  Principal: [130_000, 155_000],
};

/** Equity (fraction) a candidate typically expects from an early-stage startup. */
export const EXPECTED_EQUITY: Record<Seniority, number> = {
  Junior: 0.001,
  Mid: 0.003,
  Senior: 0.006,
  Staff: 0.012,
  Principal: 0.025,
};

/** Minimum score a candidate needs to accept an offer. */
export const ACCEPT_THRESHOLD: Record<Seniority, number> = {
  Junior: 0.42,
  Mid: 0.47,
  Senior: 0.52,
  Staff: 0.57,
  Principal: 0.62,
};

const ROLE_STATS: Record<Role, Stats> = {
  Engineer: { eng: 8, product: 4, design: 1, growth: 0, sales: 0, ops: 2, cs: 0 },
  Product: { eng: 2, product: 8, design: 4, growth: 3, sales: 1, ops: 2, cs: 2 },
  Designer: { eng: 1, product: 4, design: 8, growth: 2, sales: 0, ops: 0, cs: 1 },
  Growth: { eng: 1, product: 3, design: 2, growth: 8, sales: 2, ops: 1, cs: 1 },
  Sales: { eng: 0, product: 1, design: 0, growth: 3, sales: 8, ops: 1, cs: 3 },
  Ops: { eng: 1, product: 2, design: 0, growth: 1, sales: 2, ops: 8, cs: 3 },
  CustomerSuccess: { eng: 0, product: 2, design: 1, growth: 1, sales: 3, ops: 2, cs: 8 },
  Finance: { eng: 0, product: 1, design: 0, growth: 1, sales: 1, ops: 7, cs: 1 },
};

const SENIORITY_SCALE: Record<Seniority, number> = { Junior: 0.7, Mid: 1, Senior: 1.2, Staff: 1.35, Principal: 1.5 };

const ROLE_PERKS: Record<Role, string[]> = {
  Engineer: ["fast_iteration", "full_stack", "architect", "scales_systems", "debug_zen", "infra_whisperer", "security_expert", "rapid_prototyping", "backend_specialist", "zero_downtime"],
  Product: ["market_fit_nose", "user_empathy", "data_driven", "vision_setter", "rapid_prototyping", "stakeholder_shield"],
  Designer: ["conversion_ux", "design_systems", "user_empathy", "polish_performance", "accessibility_champion", "brand_aura"],
  Growth: ["cac_slayer", "paid_performance", "content_engine", "channel_mastery", "analytics_guru", "brand_aura"],
  Sales: ["enterprise_closer", "pipeline_machine", "outbound_grinder", "demo_wizard", "smb_hunter", "hunter"],
  Ops: ["runway_extender", "process_builder", "crisis_control", "hiring_machine", "stakeholder_shield"],
  CustomerSuccess: ["churn_killer", "expansion_engine", "cs_ops_builder", "empathy", "expansion_upsell"],
  Finance: ["runway_extender", "crisis_control", "data_driven", "stakeholder_shield"],
};

const RISK_TAGS: Record<Seniority, string[]> = {
  Junior: ["inexperience", "needs_mentoring", "impatient", "needs_feedback"],
  Mid: ["scope_creep", "perfectionist", "opinionated", "burnout", "tech_debt_creator"],
  Senior: ["expensive", "over_engineers", "opinionated", "burnout", "big_bets"],
  Staff: ["expensive", "over_controlling", "rigid_processes", "tech_stack_snob"],
  Principal: ["expensive", "over_controlling", "big_bets"],
};

const FIRST_NAMES = [
  "Giulia", "Marco", "Chiara", "Luca", "Sofia", "Alessandro", "Francesca", "Matteo", "Elena", "Davide",
  "Aisha", "Kenji", "Priya", "Lars", "Ines", "Tomás", "Amara", "Jonas", "Mei", "Omar",
  "Valentina", "Federico", "Martina", "Riccardo", "Sara", "Nicolò", "Beatrice", "Gabriel", "Leila", "Yusuf",
  "Hannah", "Diego", "Noor", "Pierre", "Zoe", "Arjun", "Clara", "Emeka", "Freya", "Andrea",
];
const LAST_NAMES = [
  "Rossi", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti",
  "Okafor", "Tanaka", "Sharma", "Nilsson", "Duarte", "Haddad", "Müller", "Kowalski", "Chen", "Dubois",
  "Esposito", "De Luca", "Fontana", "Moretti", "Barbieri", "Lombardi", "García", "Novak", "Ahmed", "Larsen",
];
const UNIVERSITIES = [
  "Politecnico di Milano", "Università Bocconi", "Politecnico di Torino", "Sapienza Università di Roma",
  "Università di Bologna", "Università di Padova", "ETH Zürich", "TU München", "Imperial College London",
  "Universidad Politécnica de Madrid", "KTH Stockholm", "University of Amsterdam", "Università Federico II",
];
const FIELDS: Record<Role, string[]> = {
  Engineer: ["Computer Engineering", "Computer Science", "Electronic Engineering"],
  Product: ["Management Engineering", "Business Administration", "Computer Science"],
  Designer: ["Communication Design", "Interaction Design", "Industrial Design"],
  Growth: ["Marketing", "Economics", "Statistics"],
  Sales: ["Business Administration", "Economics", "Languages"],
  Ops: ["Management Engineering", "Economics", "Industrial Engineering"],
  CustomerSuccess: ["Psychology", "Business Administration", "Languages"],
  Finance: ["Finance", "Economics", "Accounting"],
};
const EMPLOYERS = [
  { company: "Big Tech (EU office)", sector: null },
  { company: "Fintech scale-up", sector: "fintech" },
  { company: "SaaS unicorn", sector: "saas" },
  { company: "Food delivery marketplace", sector: "marketplace" },
  { company: "Fashion e-commerce", sector: "ecommerce" },
  { company: "Mobile gaming studio", sector: "consumer" },
  { company: "Medical devices company", sector: "healthtech" },
  { company: "Robotics lab", sector: "deeptech" },
  { company: "AI research startup", sector: "aiinfra" },
  { company: "Strategy consulting firm", sector: null },
  { company: "Digital agency", sector: null },
  { company: "Early-stage startup (failed)", sector: null },
] as const;
const ROLE_TITLES: Record<Role, string> = {
  Engineer: "Software Engineer",
  Product: "Product Manager",
  Designer: "Product Designer",
  Growth: "Growth Marketer",
  Sales: "Account Executive",
  Ops: "Operations Manager",
  CustomerSuccess: "Customer Success Manager",
  Finance: "Finance Manager",
};
const ROLE_SKILLS: Record<Role, string[]> = {
  Engineer: ["typescript", "python", "golang", "react", "aws", "kubernetes", "postgresql", "rust"],
  Product: ["productmanagement", "analytics", "userresearch", "experimentation"],
  Designer: ["figma", "userresearch", "prototyping", "illustrator"],
  Growth: ["seo", "paidads", "contentmarketing", "analytics", "experimentation"],
  Sales: ["salesforce", "hubspot", "negotiation", "coldcalling", "demoskills"],
  Ops: ["projectmanagement", "excel", "hiring", "systemsthinking"],
  CustomerSuccess: ["communication", "hubspot", "analytics", "salesforce"],
  Finance: ["finance", "excel", "sql", "negotiation"],
};

function clampStat(v: number): number {
  return Math.max(0, Math.min(10, Math.round(v)));
}

/** Creates a fresh candidate for the job market (deterministic given the rng). */
export function generateCandidate(rng: Rng, seq: number, round: number): Candidate {
  const role = rng.weighted(ROLES, (r) =>
    ({ Engineer: 4, Product: 2, Designer: 1.5, Growth: 2, Sales: 2, Ops: 1, CustomerSuccess: 1.2, Finance: 0.6 })[r],
  ) as Role;
  const seniority = rng.weighted(SENIORITIES, (s) =>
    ({ Junior: 3, Mid: 4, Senior: 3, Staff: 1.2, Principal: 0.3 })[s],
  ) as Seniority;
  const scale = SENIORITY_SCALE[seniority];
  const base = ROLE_STATS[role];
  const stats = {} as Stats;
  for (const k of Object.keys(base) as Array<keyof Stats>) {
    stats[k] = base[k] === 0 ? 0 : clampStat(base[k] * scale + rng.normal(0, 0.8));
  }
  const [smin, smax] = SALARY_RANGE[seniority];
  const askSalary = Math.round(rng.range(smin, smax) / 500) * 500;
  const perks = rng.shuffle(ROLE_PERKS[role]).slice(0, seniority === "Junior" ? 1 : rng.int(1, 2));
  const riskTags = rng.chance(0.75) ? [rng.pick(RISK_TAGS[seniority])] : [];
  if (seniority === "Junior" && !perks.includes("learns_fast") && rng.chance(0.5)) perks.push("learns_fast");

  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  const years = { Junior: rng.range(0.5, 2), Mid: rng.range(3, 6), Senior: rng.range(6, 10), Staff: rng.range(9, 14), Principal: rng.range(13, 20) }[seniority];
  const graduated = 2026 - Math.round(years) - 1;
  const employers = rng.shuffle(EMPLOYERS).slice(0, years > 4 ? 2 : 1);
  const preferredSectors = Array.from(
    new Set(employers.map((e) => e.sector).filter((s): s is NonNullable<typeof s> => s !== null)),
  ) as SectorId[];
  const cv: CandidateCV = {
    age: 23 + Math.round(years),
    education: {
      university: rng.pick(UNIVERSITIES),
      degree: seniority === "Junior" ? "BSc" : rng.pick(["MSc", "MSc", "BSc", "MBA", "PhD"]),
      field: rng.pick(FIELDS[role]),
      graduated,
    },
    experiences: employers.map((e, i) => ({
      company: e.company,
      role: ROLE_TITLES[role],
      yearsWorked: Math.round((years / employers.length) * 10) / 10,
      description: i === 0 ? `${ROLE_TITLES[role]} in a ${e.company.toLowerCase()}` : `Previous role at ${e.company.toLowerCase()}`,
      isKeyExperience: false,
    })),
    skills: rng
      .shuffle(ROLE_SKILLS[role])
      .slice(0, 3)
      .map((name) => ({ name, level: Math.max(1, Math.min(5, Math.round(scale * 3 + rng.normal(0, 0.7)))) })),
    achievements: [],
  };
  return {
    id: `gen_${seq}`,
    name: `${first} ${last}`,
    role,
    seniority,
    askSalary,
    stats,
    perks,
    riskTags,
    cv,
    hiddenBonuses: [],
    prefs: {
      minRunwayMonths: rng.pick([3, 4, 6, 6, 9, 12]),
      equityAppetite: Math.round(Math.max(0, Math.min(1, rng.normal(0.5, 0.2))) * 100) / 100,
      riskTolerance: Math.round(Math.max(0, Math.min(1, rng.normal(seniority === "Junior" ? 0.65 : 0.5, 0.15))) * 100) / 100,
      preferredSectors,
    },
    availableSinceRound: round,
    heldFor: null,
  };
}

export function professionalCandidate(raw: RawCandidate, round: number): Candidate {
  return { ...raw, cv: structuredClone(raw.cv), availableSinceRound: round, heldFor: null };
}
