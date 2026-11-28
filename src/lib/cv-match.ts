/**
 * CV → programme matcher.
 *
 * Pure and deterministic, runs entirely in the browser. It only uses fields
 * that come from the real catalogue (programme name, title keywords and
 * discipline field). Sample enrichment (research pillars, sample eligibility)
 * is deliberately ignored so demo data cannot bias the ranking.
 *
 * Method:
 *  1. Tokenise and stem the CV text, and also spot known skill phrases
 *     ("pytorch", "remote sensing", "public health") that map onto the
 *     vocabulary programme titles actually use.
 *  2. Score each programme by how much of its title vocabulary the CV covers,
 *     weighted by how rare each word is across the catalogue (IDF).
 *  3. Nudge the score by how well the programme's field matches the fields the
 *     CV leans towards.
 */
import { stemmer } from "stemmer";
import type { DisciplineCluster, Program } from "./types";

const STOP = new Set(
  (
    "a an and are as at be by for from has have in is it its of on or that the to was were will with " +
    "erasmus mundus joint master masters programme program degree msc ma emjm european international " +
    "school plus science sciences design de des la le et en du di e i my me our we you your he she they " +
    "also using use used etc ltd inc pvt university college institute year years month months present " +
    "email phone address linkedin github http https www com org page"
  ).split(" "),
);

/** Common in CVs and in many titles, so they carry little signal. */
const GENERIC = new Set(
  [
    "management", "system", "systems", "development", "research", "innovation", "innovative", "global",
    "advanced", "applied", "sustainable", "sustainability", "technology", "technologies", "society",
    "studies", "digital", "intelligent", "new", "contemporary", "challenges", "applications", "transition",
    "transitions", "networks", "network", "work", "level", "europe", "world", "local", "future", "excellence", "smart",
  ].map((w) => stemmer(w)),
);

/** Lower-case, strip accents, keep c++ / c# style tokens. */
export function normalise(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()} `;
}

export function tokenize(text: string): string[] {
  return normalise(text)
    .trim()
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w))
    .map((w) => stemmer(w));
}

interface Concept {
  label: string;
  cluster: DisciplineCluster;
  /** Phrases looked for in the CV (already lower-case, matched on word boundaries). */
  triggers: string[];
  /** Words, as they appear in programme titles, that this concept supports. */
  terms: string;
}

export const CONCEPTS: Concept[] = [
  { label: "AI & machine learning", cluster: "Computer Science", triggers: ["machine learning", "deep learning", "neural network", "neural networks", "tensorflow", "pytorch", "keras", "scikit learn", "sklearn", "nlp", "natural language processing", "llm", "llms", "transformers", "reinforcement learning", "artificial intelligence", "generative ai", "ml", "ai"], terms: "artificial intelligence data intelligent" },
  { label: "Data science", cluster: "Computer Science", triggers: ["python", "pandas", "numpy", "sql", "spark", "pyspark", "hadoop", "tableau", "power bi", "data analysis", "data analytics", "data science", "data scientist", "data analyst", "data engineer", "data engineering", "etl", "big data", "data mining", "data visualization", "r programming", "jupyter"], terms: "data" },
  { label: "Software engineering", cluster: "Computer Science", triggers: ["java", "javascript", "typescript", "react", "node js", "nodejs", "c++", "c#", "golang", "git", "docker", "kubernetes", "backend", "frontend", "full stack", "software development", "software engineer", "software engineering", "rest api", "microservices", "devops", "cloud computing", "aws", "azure"], terms: "software systems information computing data intensive" },
  { label: "Cybersecurity", cluster: "Computer Science", triggers: ["penetration testing", "pentesting", "network security", "information security", "cyber security", "cybersecurity", "cryptography", "owasp", "siem", "malware", "ethical hacking", "firewall", "cissp", "ceh", "vulnerability", "soc analyst", "forensics"], terms: "cybersecurity security assurance cyberspace" },
  { label: "Embedded & electronics", cluster: "Engineering", triggers: ["arduino", "raspberry pi", "fpga", "vhdl", "verilog", "microcontroller", "microcontrollers", "pcb", "embedded", "iot", "internet of things", "vlsi", "semiconductor", "electronics", "circuit design", "analog", "digital electronics"], terms: "embedded computing systems electronics semiconductor chips nanosystems microelectronics" },
  { label: "Robotics & control", cluster: "Engineering", triggers: ["ros", "robot", "robots", "robotics", "plc", "simulink", "control systems", "control engineering", "automation", "mechatronics", "autonomous vehicles", "drones", "uav"], terms: "robotics robotic mechatronics control field" },
  { label: "Mechanical & structures", cluster: "Engineering", triggers: ["solidworks", "autocad", "catia", "ansys", "abaqus", "cad", "fea", "finite element", "cfd", "thermodynamics", "fluid mechanics", "mechanical engineering", "mechanical engineer", "composites", "aerospace", "aeronautical", "naval", "ship"], terms: "mechanics structural structures solid composite materials fluids aeronautical ships offshore" },
  { label: "Energy & power", cluster: "Engineering", triggers: ["solar", "photovoltaic", "pv", "wind energy", "wind turbine", "power systems", "power electronics", "electrical grid", "smart grid", "battery", "batteries", "renewable", "renewables", "hydrogen", "fuel cell", "electric vehicle", "electrical engineering", "energy"], terms: "energy renewable renewables power electric hydrogen storage conversion propulsion" },
  { label: "Civil & construction", cluster: "Engineering", triggers: ["construction", "structural engineering", "concrete", "bim", "revit", "surveying", "geotechnical", "civil engineering", "civil engineer", "architecture", "building"], terms: "construction built environment civil infrastructures structures architecture earthen" },
  { label: "Materials & chemistry", cluster: "Natural Sciences", triggers: ["polymer", "polymers", "nanotechnology", "nanomaterials", "materials science", "spectroscopy", "synthesis", "catalysis", "chromatography", "hplc", "organic chemistry", "inorganic chemistry", "chemistry", "chemical engineering", "metallurgy", "membrane"], terms: "materials chemistry chemical nanomaterials catalysis analytical membrane metal" },
  { label: "Geospatial & earth observation", cluster: "Environmental Sciences", triggers: ["gis", "arcgis", "qgis", "remote sensing", "satellite", "gps", "lidar", "cartography", "mapping", "geomatics", "geoinformatics", "earth observation", "photogrammetry"], terms: "geospatial geo information earth observation cartography mapping digital spatial copernicus" },
  { label: "Environment & climate", cluster: "Environmental Sciences", triggers: ["climate", "climate change", "ecology", "biodiversity", "conservation", "environmental", "wastewater", "water treatment", "hydrology", "groundwater", "forestry", "forest", "ecosystem", "flood", "natural resources"], terms: "environmental environment climate ecology biodiversity water groundwater forestry forest ecosystems flood ecohydrology" },
  { label: "Agriculture & food", cluster: "Life Sciences", triggers: ["agriculture", "agronomy", "crop", "crops", "food science", "food technology", "horticulture", "soil", "plant science", "agricultural", "dairy", "farming"], terms: "agriculture food agrifood plant soils cropping rural" },
  { label: "Marine & ocean", cluster: "Environmental Sciences", triggers: ["ocean", "marine", "oceanography", "fisheries", "aquaculture", "coastal", "maritime"], terms: "marine ocean coastal aquaculture islands" },
  { label: "Biology & biotech", cluster: "Life Sciences", triggers: ["biology", "molecular biology", "pcr", "genomics", "bioinformatics", "cell culture", "microbiology", "biotechnology", "genetics", "biochemistry", "zoology", "botany", "crispr"], terms: "biology biotechnology genomics biological bioeconomy bio" },
  { label: "Medicine & public health", cluster: "Life Sciences", triggers: ["epidemiology", "public health", "clinical", "nursing", "hospital", "pharmacology", "medicine", "mbbs", "pharmacy", "vaccine", "vaccines", "physician", "healthcare", "biomedical", "toxicology", "medical"], terms: "health medicine public diseases drug vaccinology medical healthcare biomedical toxicology" },
  { label: "Neuroscience", cluster: "Life Sciences", triggers: ["neuroscience", "cognitive science", "brain", "eeg", "fmri", "neural"], terms: "neuroscience brain" },
  { label: "Physics", cluster: "Natural Sciences", triggers: ["physics", "physicist", "condensed matter", "theoretical physics"], terms: "physics" },
  { label: "Quantum", cluster: "Natural Sciences", triggers: ["quantum", "qubit", "qubits", "quantum computing", "quantum mechanics"], terms: "quantum" },
  { label: "Optics & photonics", cluster: "Natural Sciences", triggers: ["optics", "laser", "lasers", "photonics", "optical", "fibre optics", "fiber optics"], terms: "photonics lasers europhotonics" },
  { label: "Astrophysics & space", cluster: "Natural Sciences", triggers: ["astrophysics", "astronomy", "cosmology", "space science", "planetary", "telescope"], terms: "astrophysics space planetary" },
  { label: "Nuclear & particle physics", cluster: "Natural Sciences", triggers: ["nuclear", "particle physics", "accelerator", "accelerators", "radiation", "dosimetry", "high energy physics"], terms: "nuclear particle accelerators radiation" },
  { label: "Mathematics & modelling", cluster: "Natural Sciences", triggers: ["mathematics", "linear algebra", "calculus", "optimization", "optimisation", "numerical methods", "mathematical modelling", "simulation", "statistics", "stochastic", "operations research"], terms: "mathematics mathematical modelling simulation computational" },
  { label: "Economics & business", cluster: "Social Sciences", triggers: ["economics", "econometrics", "finance", "financial", "accounting", "marketing", "business", "mba", "entrepreneurship", "startup", "consulting", "supply chain", "bba"], terms: "economics business finance markets entrepreneurship" },
  { label: "Policy, politics & law", cluster: "Social Sciences", triggers: ["political science", "international relations", "public policy", "law", "llb", "legal", "governance", "human rights", "ngo", "diplomacy", "public administration", "intellectual property"], terms: "policy policies politics law governance public security peace intellectual" },
  { label: "Migration & society", cluster: "Social Sciences", triggers: ["sociology", "migration", "refugees", "refugee", "gender", "social work", "anthropology", "humanitarian", "development studies", "inclusion"], terms: "migration migrations diversity humanitarian society gender displacement inclusion" },
  { label: "Education", cluster: "Social Sciences", triggers: ["teaching", "teacher", "education", "pedagogy", "curriculum", "tutoring", "tutor", "e learning", "instructional design"], terms: "education teaching learning educational" },
  { label: "Languages & linguistics", cluster: "Humanities", triggers: ["linguistics", "translation", "translator", "interpreter", "corpus", "lexicography", "philology", "language teaching", "german", "french", "spanish"], terms: "linguistic linguistics language multilingualism lexicography german" },
  { label: "Film, media & arts", cluster: "Humanities", triggers: ["film", "filmmaking", "video editing", "documentary", "journalism", "journalist", "media", "photography", "premiere pro", "after effects", "sound design", "music", "theatre", "theater", "dance", "animation", "game design", "game development", "unity", "unreal engine", "art"], terms: "film media journalism documentary sound arts games theatre dance creativity fiction" },
  { label: "Heritage & history", cluster: "Humanities", triggers: ["history", "archaeology", "museum", "heritage", "art history", "cultural", "religion", "religious studies"], terms: "heritage history archaeological museums cultural religious prehistory" },
  { label: "Psychology", cluster: "Social Sciences", triggers: ["psychology", "counselling", "counseling", "therapy", "mental health", "organizational behaviour", "organizational behavior", "human resources", "hr"], terms: "psychology therapy behavior organizational personnel work" },
  { label: "Urban & transport", cluster: "Engineering", triggers: ["urban planning", "city planning", "transport", "transportation", "urban design", "smart city", "smart cities", "regional planning"], terms: "cities city urban transportation territorial communities" },
  { label: "Telecom & signals", cluster: "Computer Science", triggers: ["telecommunications", "signal processing", "wireless", "5g", "networking", "rf", "antenna", "microwave", "communication systems"], terms: "communications microwave electronics photonics" },
  { label: "Imaging & vision", cluster: "Computer Science", triggers: ["image processing", "opencv", "computer vision", "microscopy", "medical imaging", "augmented reality", "virtual reality", "ar vr", "3d modelling", "graphics"], terms: "imaging image vision extended reality microscopy" },
];

/** Count non-overlapping occurrences of a phrase in normalised text. */
function countPhrase(norm: string, phrase: string): number {
  const needle = ` ${phrase} `;
  let n = 0;
  let i = norm.indexOf(needle);
  while (i !== -1) {
    n++;
    i = norm.indexOf(needle, i + needle.length - 1);
  }
  return n;
}

export interface CvProfile {
  /** Stemmed term → weight. */
  terms: Map<string, number>;
  /** Human-readable concepts spotted in the CV, strongest first. */
  concepts: { label: string; hits: number; cluster: DisciplineCluster }[];
  /** Share of concept hits per field, 0..1. */
  clusters: Partial<Record<DisciplineCluster, number>>;
  wordCount: number;
}

export function profileCv(text: string): CvProfile {
  const norm = normalise(text);
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);

  const terms = new Map<string, number>();
  for (const [t, c] of counts) terms.set(t, (1 + Math.log(c)) * (GENERIC.has(t) ? 0.3 : 1));

  const concepts: CvProfile["concepts"] = [];
  const clusterHits: Partial<Record<DisciplineCluster, number>> = {};
  for (const concept of CONCEPTS) {
    const hits = concept.triggers.reduce((s, p) => s + countPhrase(norm, p), 0);
    if (!hits) continue;
    concepts.push({ label: concept.label, hits, cluster: concept.cluster });
    clusterHits[concept.cluster] = (clusterHits[concept.cluster] ?? 0) + hits;
    const w = 0.35 * (1 + Math.log(hits));
    for (const t of tokenize(concept.terms)) terms.set(t, Math.max(terms.get(t) ?? 0, w));
  }
  concepts.sort((a, b) => b.hits - a.hits);

  const total = Object.values(clusterHits).reduce((s, v) => s + (v ?? 0), 0);
  const clusters: CvProfile["clusters"] = {};
  for (const [k, v] of Object.entries(clusterHits)) clusters[k as DisciplineCluster] = total ? (v ?? 0) / total : 0;

  return { terms, concepts, clusters, wordCount: tokens.length };
}

export interface ProgramIndex {
  docs: { program: Program; terms: Map<string, string> /* stem → display word */ }[];
  idf: Map<string, number>;
}

export function buildIndex(programs: Program[]): ProgramIndex {
  const docs = programs.map((program) => {
    const terms = new Map<string, string>();
    for (const word of normalise(`${program.name} ${program.keywords.join(" ")}`).trim().split(" ")) {
      if (word.length < 2 || STOP.has(word)) continue;
      const s = stemmer(word);
      if (!terms.has(s)) terms.set(s, word);
    }
    return { program, terms };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.terms.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(1 + docs.length / n) * (GENERIC.has(t) ? 0.4 : 1));
  return { docs, idf };
}

export interface CvMatch {
  program: Program;
  /** 0–100, relative fit. Not a probability of admission. */
  score: number;
  /** Words from the programme title that the CV supports. */
  matchedTerms: string[];
  fieldFit: number; // 0..1
}

export interface MatchOptions {
  limit?: number;
  filter?: (p: Program) => boolean;
}

export function matchCv(text: string, programs: Program[], opts: MatchOptions = {}): { profile: CvProfile; matches: CvMatch[] } {
  const profile = profileCv(text);
  const pool = opts.filter ? programs.filter(opts.filter) : programs;
  // IDF over the whole catalogue so filtering does not change word rarity.
  const index = buildIndex(programs);
  const docById = new Map(index.docs.map((d) => [d.program.id, d]));
  const topField = Math.max(0, ...Object.values(profile.clusters).map((v) => v ?? 0));

  const scored = pool.map((program) => {
    const doc = docById.get(program.id)!;
    let mass = 0;
    let covered = 0;
    let dot = 0;
    const matched: { word: string; w: number }[] = [];
    for (const [t, word] of doc.terms) {
      const idf = index.idf.get(t) ?? 0;
      mass += idf;
      const cw = profile.terms.get(t);
      if (cw) {
        covered += idf * Math.min(cw, 1);
        dot += idf * cw;
        matched.push({ word, w: idf * cw });
      }
    }
    // Very short titles (one rare word) would otherwise hit 100% coverage from a single mention.
    const coverage = mass ? (covered / mass) * Math.sqrt(Math.min(1, mass / 8)) : 0;
    const fieldShare = profile.clusters[program.discipline_cluster] ?? 0;
    const fieldFit = topField ? fieldShare / topField : 0;
    const raw = (0.5 * coverage + 0.5 * Math.min(dot / 10, 1)) * (0.65 + 0.35 * fieldFit);
    return {
      program,
      raw,
      fieldFit,
      matchedTerms: matched.sort((a, b) => b.w - a.w).map((m) => m.word),
    };
  });

  scored.sort((a, b) => b.raw - a.raw || a.program.name.localeCompare(b.program.name));
  const top = scored.filter((s) => s.raw > 0).slice(0, opts.limit ?? 5);
  return {
    profile,
    matches: top.map((s) => ({
      program: s.program,
      score: Math.round(Math.min(1, s.raw) * 100),
      matchedTerms: s.matchedTerms,
      fieldFit: s.fieldFit,
    })),
  };
}
