import { lt, type LText } from "../text";

/**
 * Small, additive effects of individual traits. Each value is a relative change
 * (e.g. dev: 0.08 = +8% development output). They are summed across the team and capped.
 */
export interface TraitEffects {
  dev?: number;
  techDebt?: number;
  bugs?: number;
  quality?: number;
  learning?: number;
  cac?: number;
  sales?: number;
  churn?: number;
  burn?: number;
  morale?: number;
  security?: number;
  conversion?: number;
  brand?: number;
  hiring?: number;
}

export interface TraitDef {
  label: LText;
  effects: TraitEffects;
}

export const PERKS: Record<string, TraitDef> = {
  fast_iteration: { label: lt("Fast iteration", "Iterazione rapida"), effects: { dev: 0.06 } },
  rapid_prototyping: { label: lt("Rapid prototyping", "Prototipazione rapida"), effects: { dev: 0.05, learning: 0.03 } },
  full_stack: { label: lt("Full stack", "Full stack"), effects: { dev: 0.05 } },
  learns_fast: { label: lt("Learns fast", "Impara in fretta"), effects: { dev: 0.03 } },
  scrappy: { label: lt("Scrappy", "Pieno di risorse"), effects: { dev: 0.03, burn: -0.02 } },
  eager: { label: lt("Eager", "Motivatissimo"), effects: { morale: 0.02 } },
  hungry: { label: lt("Hungry", "Affamato di successo"), effects: { sales: 0.04 } },
  architect: { label: lt("Architect", "Architetto software"), effects: { techDebt: -0.15 } },
  scales_systems: { label: lt("Scales systems", "Scala i sistemi"), effects: { techDebt: -0.1, bugs: -0.1 } },
  debug_zen: { label: lt("Debug zen", "Maestro del debug"), effects: { bugs: -0.2 } },
  zero_downtime: { label: lt("Zero downtime", "Zero downtime"), effects: { bugs: -0.15, security: -0.1 } },
  infra_whisperer: { label: lt("Infra whisperer", "Mago dell'infrastruttura"), effects: { techDebt: -0.08, burn: -0.02 } },
  backend_specialist: { label: lt("Backend specialist", "Specialista backend"), effects: { techDebt: -0.06, dev: 0.02 } },
  security_expert: { label: lt("Security expert", "Esperto di sicurezza"), effects: { security: -0.4 } },
  detail_oriented: { label: lt("Detail oriented", "Attento ai dettagli"), effects: { bugs: -0.1, quality: 0.03 } },
  frontend_guru: { label: lt("Frontend guru", "Guru del frontend"), effects: { quality: 0.04 } },
  mobile_specialist: { label: lt("Mobile specialist", "Specialista mobile"), effects: { quality: 0.03, dev: 0.02 } },
  user_empathy: { label: lt("User empathy", "Empatia con l'utente"), effects: { learning: 0.06, quality: 0.02 } },
  empathy: { label: lt("Empathy", "Empatia"), effects: { churn: -0.04 } },
  market_fit_nose: { label: lt("Nose for market fit", "Fiuto per il market fit"), effects: { learning: 0.08 } },
  data_driven: { label: lt("Data driven", "Guidato dai dati"), effects: { learning: 0.05, cac: -0.03 } },
  analytics_guru: { label: lt("Analytics guru", "Guru degli analytics"), effects: { learning: 0.05, cac: -0.04 } },
  fresh_perspective: { label: lt("Fresh perspective", "Sguardo fresco"), effects: { learning: 0.04 } },
  vision_setter: { label: lt("Vision setter", "Definisce la visione"), effects: { morale: 0.03, learning: 0.03 } },
  conversion_ux: { label: lt("Conversion UX", "UX orientata alla conversione"), effects: { conversion: 0.06, quality: 0.02 } },
  design_systems: { label: lt("Design systems", "Design system"), effects: { quality: 0.04, dev: 0.02 } },
  design_ops: { label: lt("Design ops", "Design ops"), effects: { quality: 0.02, dev: 0.02 } },
  polish_performance: { label: lt("Polish & performance", "Cura e performance"), effects: { quality: 0.05 } },
  accessibility_champion: { label: lt("Accessibility champion", "Paladino dell'accessibilità"), effects: { quality: 0.03, churn: -0.02 } },
  brand_aura: { label: lt("Brand aura", "Aura di brand"), effects: { brand: 0.2, cac: -0.03 } },
  cac_slayer: { label: lt("CAC slayer", "Ammazza-CAC"), effects: { cac: -0.1 } },
  paid_performance: { label: lt("Paid performance", "Esperto di paid"), effects: { cac: -0.07 } },
  channel_mastery: { label: lt("Channel mastery", "Padronanza dei canali"), effects: { cac: -0.06 } },
  content_engine: { label: lt("Content engine", "Macchina di contenuti"), effects: { brand: 0.15, cac: -0.03 } },
  thought_leader: { label: lt("Thought leader", "Thought leader"), effects: { brand: 0.15, hiring: 0.03 } },
  enterprise_closer: { label: lt("Enterprise closer", "Chiude contratti enterprise"), effects: { sales: 0.12 } },
  pipeline_machine: { label: lt("Pipeline machine", "Macchina da pipeline"), effects: { sales: 0.1 } },
  outbound_grinder: { label: lt("Outbound grinder", "Instancabile nell'outbound"), effects: { sales: 0.08 } },
  hunter: { label: lt("Hunter", "Cacciatore di clienti"), effects: { sales: 0.08 } },
  smb_hunter: { label: lt("SMB hunter", "Cacciatore di PMI"), effects: { sales: 0.07 } },
  demo_wizard: { label: lt("Demo wizard", "Mago delle demo"), effects: { sales: 0.06, conversion: 0.03 } },
  friendly_demos: { label: lt("Friendly demos", "Demo coinvolgenti"), effects: { conversion: 0.04 } },
  global_network: { label: lt("Global network", "Rete globale"), effects: { sales: 0.06, hiring: 0.03 } },
  asia_pacific_network: { label: lt("APAC network", "Rete in Asia-Pacifico"), effects: { sales: 0.05 } },
  churn_killer: { label: lt("Churn killer", "Ammazza-churn"), effects: { churn: -0.1 } },
  expansion_engine: { label: lt("Expansion engine", "Motore di espansione"), effects: { churn: -0.05, conversion: 0.03 } },
  expansion_upsell: { label: lt("Upsell expert", "Esperto di upsell"), effects: { churn: -0.04 } },
  cs_ops_builder: { label: lt("CS ops builder", "Costruisce processi di CS"), effects: { churn: -0.06 } },
  runway_extender: { label: lt("Runway extender", "Allunga la runway"), effects: { burn: -0.05 } },
  process_builder: { label: lt("Process builder", "Costruisce processi"), effects: { burn: -0.03, morale: 0.01 } },
  crisis_control: { label: lt("Crisis control", "Gestione delle crisi"), effects: { security: -0.15, morale: 0.02 } },
  stakeholder_shield: { label: lt("Stakeholder shield", "Scudo per il team"), effects: { morale: 0.03 } },
  hiring_machine: { label: lt("Hiring machine", "Macchina da recruiting"), effects: { hiring: 0.08 } },
  mentor: { label: lt("Mentor", "Mentore"), effects: { morale: 0.03, dev: 0.02 } },
  humble: { label: lt("Humble", "Umile"), effects: { morale: 0.02 } },
};

export const RISK_TAGS_DEF: Record<string, TraitDef> = {
  expensive: { label: lt("Expensive", "Costoso"), effects: {} },
  inexperience: { label: lt("Inexperienced", "Inesperto"), effects: { dev: -0.04, bugs: 0.08 } },
  needs_mentoring: { label: lt("Needs mentoring", "Ha bisogno di un mentore"), effects: { dev: -0.04 } },
  needs_coaching: { label: lt("Needs coaching", "Ha bisogno di coaching"), effects: { sales: -0.04 } },
  needs_guidance: { label: lt("Needs guidance", "Ha bisogno di guida"), effects: { dev: -0.03 } },
  needs_feedback: { label: lt("Needs constant feedback", "Ha bisogno di feedback continui"), effects: { morale: -0.01 } },
  perfectionist: { label: lt("Perfectionist", "Perfezionista"), effects: { dev: -0.04, quality: 0.02 } },
  over_engineers: { label: lt("Over-engineers", "Sovra-ingegnerizza"), effects: { dev: -0.05, techDebt: -0.03 } },
  analysis_paralysis: { label: lt("Analysis paralysis", "Paralisi da analisi"), effects: { learning: -0.03 } },
  indecisive: { label: lt("Indecisive", "Indeciso"), effects: { learning: -0.03 } },
  scope_creep: { label: lt("Scope creep", "Allarga sempre lo scope"), effects: { techDebt: 0.06 } },
  tech_debt_creator: { label: lt("Creates tech debt", "Genera debito tecnico"), effects: { techDebt: 0.1 } },
  risky_experiments: { label: lt("Risky experiments", "Esperimenti rischiosi"), effects: { bugs: 0.08 } },
  big_bets: { label: lt("Big bets", "Scommesse azzardate"), effects: { burn: 0.03 } },
  burnout: { label: lt("Burnout risk", "Rischio burnout"), effects: { morale: -0.01 } },
  opinionated: { label: lt("Opinionated", "Molto testardo"), effects: { morale: -0.015 } },
  blunt_communicator: { label: lt("Blunt communicator", "Comunicazione brusca"), effects: { morale: -0.015 } },
  over_controlling: { label: lt("Over-controlling", "Accentratore"), effects: { morale: -0.02 } },
  rigid_processes: { label: lt("Rigid processes", "Processi rigidi"), effects: { dev: -0.02 } },
  tech_stack_snob: { label: lt("Tech stack snob", "Snob delle tecnologie"), effects: { techDebt: 0.02, morale: -0.01 } },
  commission_drama: { label: lt("Commission drama", "Polemiche sulle provvigioni"), effects: { morale: -0.015 } },
  high_commission: { label: lt("High commission", "Provvigioni alte"), effects: { burn: 0.02 } },
  over_promises: { label: lt("Over-promises", "Promette troppo"), effects: { churn: 0.04 } },
  burns_leads: { label: lt("Burns leads", "Brucia i lead"), effects: { cac: 0.03 } },
  under_sells: { label: lt("Under-sells", "Si vende poco"), effects: { sales: -0.03 } },
  attribution_blindness: { label: lt("Attribution blindness", "Cieco all'attribuzione"), effects: { cac: 0.03 } },
  platform_bias: { label: lt("Platform bias", "Fissato con una piattaforma"), effects: { cac: 0.02 } },
  data_obsessed: { label: lt("Data obsessed", "Ossessionato dai dati"), effects: { dev: -0.02 } },
  inconsistent_systems: { label: lt("Inconsistent systems", "Sistemi incoerenti"), effects: { quality: -0.02 } },
  impatient: { label: lt("Impatient", "Impaziente"), effects: { morale: -0.01 } },
};

export function traitLabel(id: string): LText {
  return PERKS[id]?.label ?? RISK_TAGS_DEF[id]?.label ?? lt(id.replace(/_/g, " "), id.replace(/_/g, " "));
}

export const BONUS_LABEL: Record<string, LText> = {
  productivityBoost: lt("Productivity boost", "Aumento di produttività"),
  codeQuality: lt("Code quality", "Qualità del codice"),
  brandBuilding: lt("Brand building", "Costruzione del brand"),
  cacReduction: lt("CAC reduction", "Riduzione del CAC"),
  avoidPitfalls: lt("Avoids pitfalls", "Evita le trappole"),
  churnReduction: lt("Churn reduction", "Riduzione del churn"),
  dealAcceleration: lt("Deal acceleration", "Accelera le vendite"),
  conversionBoost: lt("Conversion boost", "Aumento delle conversioni"),
};
