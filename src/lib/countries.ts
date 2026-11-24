const NAMES: Record<string, string> = {
  AT: "Austria", BE: "Belgium", BG: "Bulgaria", HR: "Croatia", CY: "Cyprus", CZ: "Czechia", DK: "Denmark",
  EE: "Estonia", FI: "Finland", FR: "France", DE: "Germany", GR: "Greece", HU: "Hungary", IE: "Ireland",
  IT: "Italy", LV: "Latvia", LT: "Lithuania", LU: "Luxembourg", MT: "Malta", NL: "Netherlands", PL: "Poland",
  PT: "Portugal", RO: "Romania", SK: "Slovakia", SI: "Slovenia", ES: "Spain", SE: "Sweden", NO: "Norway",
  IS: "Iceland", CH: "Switzerland", GB: "United Kingdom", TR: "Türkiye", RS: "Serbia", JP: "Japan",
  IN: "India", CN: "China", US: "United States", CA: "Canada", BR: "Brazil", MX: "Mexico", NG: "Nigeria",
  EG: "Egypt", PK: "Pakistan", BD: "Bangladesh", ID: "Indonesia", VN: "Vietnam", PH: "Philippines",
  ET: "Ethiopia", KE: "Kenya", GH: "Ghana", IR: "Iran", NP: "Nepal", LK: "Sri Lanka", CO: "Colombia",
  AR: "Argentina", ZA: "South Africa", MA: "Morocco", TN: "Tunisia", UA: "Ukraine", AU: "Australia",
};

export function countryName(code: string): string {
  return NAMES[code.toUpperCase()] ?? code;
}

export const COUNTRY_OPTIONS = Object.entries(NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));
