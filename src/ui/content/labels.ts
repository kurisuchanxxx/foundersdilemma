import type { FundingRecord } from "../../core";
import type { Fmt } from "../i18n";

/** Readable name of a funding instrument in the current language. */
export function instrumentLabel(f: Fmt, instrument: FundingRecord["instrument"]): string {
  switch (instrument) {
    case "equity":
      return "equity";
    case "safe":
      return "SAFE";
    case "grant":
      return f.tx("grant", "bando");
    case "loan":
      return f.tx("loan", "prestito");
    case "crowd":
      return "crowdfunding";
    case "rescue":
      return f.tx("rescue round", "round di salvataggio");
    case "conversion":
      return f.tx("SAFE conversion", "conversione SAFE");
    default:
      return instrument;
  }
}
