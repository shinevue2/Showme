import type { Lang, PlateN } from '../core/types';

export type T = Readonly<Record<Lang, string>>;
export type Prov = 'persona-sample' | 'client';
export type EmployerId = 'hanamichi' | 'wataridori' | 'kairo';
export type StationId = 'nihonbashi' | 'hakone' | 'mishima' | 'hara' | 'shimada' | 'okazaki' | 'shono' | 'seki' | 'kyoto';
export type CaseId = 'ledger' | 'tracing' | 'mapgl' | 'strangler' | 'platform' | 'resilience';
export type DomainId = 'web' | 'backend' | 'data' | 'infra' | 'practice';
export type MetricId = 'settle' | 'pci' | 'mttd' | 'frame' | 'thru' | 'deploy' | 'paths' | 'avail' | 'rto' | 'mttr' | 'pages' | 'mentees' | 'rfc';
export type RepoId = 'kento' | 'baren' | 'scrubkit';
export type ChartId = 'deploys' | 'leadtime' | 'mttr';
export type ToolId = string;

export interface Figure { file: string; caption: T; alt: T }

/* ---------- facts ---------- */
export interface Person {
  name: T; nameRuby: string; sealGlyph: string; role: T; yearsLabel: T; since: string; specialty: T;
  location: T; timezone: 'Asia/Tokyo';
  availability: { from: string; kinds: T; notice: T; workAuth: T; relocation: T };
  overlap: readonly { label: T; startJST: string; endJST: string; zone: string }[];
  languages: readonly { lang: Lang; level: T }[];
  education: T; awards: readonly T[]; now: T; responseTime: T; prov: Prov;
}
export interface Employer { id: EmployerId; name: T; descriptor: T; from: string; to: string | null; headcount: T; prov: Prov }
export interface Metric {
  id: MetricId; label: T; before: string; after: string; display: T; unit: T;
  direction: 'rose' | 'fell'; period: string; employer: EmployerId | 'all';
  context: T; source: T; seal?: { face: T; side: T }; prov: Prov;
}
export interface Plate { n: PlateN; numeral: T; name: T; ruby: string; year: string; station: StationId | 'gold' }
export interface Station { id: StationId; printNo: number; image: string; name: T; subtitle: T }
export interface Chapter {
  n: 1 | 2 | 3 | 4 | 5 | 6 | 7; year: string; station: StationId; employer: EmployerId;
  role: T; headline: T; scope: T; outcomes: readonly [T, T]; plate: PlateN; metrics: readonly MetricId[]; prov: Prov;
}
export interface CaseStudy {
  id: CaseId; panel: 1 | 2 | 3 | 4 | 5 | 6; panelLabel: T; title: T; short: T; employer: EmployerId; period: string;
  role: T; team: T; problem: T; constraints: readonly T[]; method: T; tradeoffs: readonly T[];
  result: T; metrics: readonly MetricId[]; reflection: T; art: { file: string; why: T }; prov: Prov;
}
export interface Domain { id: DomainId; name: T; pattern: 'kaku-asanoha' | 'asanoha' | 'masu' | 'kikko' | 'mitsukude'; patternName: T; why: T }
export interface Tool {
  id: ToolId; name: string; domain: DomainId; years: number; since: string; lastProduction: string;
  projects: number; employers: readonly EmployerId[]; scale: T; cases: readonly CaseId[]; neighbours: readonly ToolId[];
}
export interface Principle { id: string; n: 1 | 2 | 3 | 4 | 5; title: T; body: T; stone: { x: number; z: number; r: number } }
export interface Sev1 { week: number; date: string; blastPct: number; durationMin: number; title: T }
export interface Ops { service: T; from: string; to: string; weeklyP99ms: readonly number[]; slo: T; sloMet: T; sev1: readonly Sev1[] }
export interface BanzukeEntry { rank: 'ozeki' | 'sekiwake' | 'komusubi' | 'maegashira'; feat: T; metric?: MetricId; period: string }
export interface Banzuke { title: T; centre: T; date: T; east: { label: T; entries: readonly BanzukeEntry[] }; west: { label: T; entries: readonly BanzukeEntry[] } }
export interface Chart { id: ChartId; title: T; unit: T; kind: 'bars' | 'line'; series: readonly { x: string; y: number }[]; note: T; source: T }
export interface ReliabilityFigure { id: string; label: T; value: string; period: string }
export interface Repo { id: RepoId; name: string; desc: T; language: string; stars: number; plate: PlateN; releases: readonly { date: string; tag: string; lines: number }[]; prov: Prov }
export interface Article { id: string; title: T; date: string; venue: T; abstract: T; url?: string; prov: Prov }
export interface Talk { id: string; title: T; date: string; venue: T; abstract: T; prov: Prov }
export interface Testimonial { id: 'manager' | 'peer' | 'report'; name: T; role: T; relation: T; date: string; quote: T; prov: Prov }
export interface Leadership { mentees: number; promoted: number; interviews: number; onboardingReaders: number; rfcs: number; incidentCommandersTrained: number; notes: readonly T[] }
export interface GlossaryEntry { term: string; ruby: string; en: string; zh: string; gloss: T }

/* ---------- copy (section text) ---------- */
interface Base { layer: T; title: T; stage: T; takeaway: T }
export interface CopyCover extends Base { name: T; nameLines: T; role: T; facts: { years: T; specialty: T; location: T; availability: T; languages: T }; express: { works: T; cv: T; contact: T; skipFilm: T }; peelHint: T; blockCaption: T }
export interface CopySummary extends Base {
  paragraphs: readonly [T, T, T]; resultsTitle: T; results: readonly [MetricId, MetricId, MetricId, MetricId];
  nowTitle: T; now: T; ledgerTitle: T; ledgerColumns: { company: T; role: T; dates: T; scope: T };
  ledger: readonly { employer: EmployerId; role: T; from: string; to: string | null; scope: T }[];
  overlapTitle: T; languagesLine: T; educationLine: T; figure: Figure;
}
export interface CopyRoad extends Base { skip: T; directionNote: T; refLabel: T; yearUnit: T }
export interface CopyWorks extends Base {
  directionNote: T; read: T; backToWorks: T; prevCase: T; nextCase: T;
  labels: { problem: T; constraints: T; role: T; team: T; period: T; method: T; tradeoffs: T; result: T; reflection: T };
}
export interface CopySkills extends Base { yearsUnit: T; projectsUnit: T; lastUsed: T; architectureToggle: T; architectureCaption: T; specFigure: Figure; learnFigure: Figure; kikkoFigure: Figure }
export interface CopyPrinciples extends Base { rerake: T; rakeToggle: T; showData: T; hideData: T; tableCaption: T; weekLabel: T; p99Label: T; sev1Label: T; legend: T; mistFigure: Figure }
export interface CopyAchievements extends Base {
  banzukeNote: T; sealsTitle: T; sealLegend: { rose: T; fell: T }; chartsTitle: T; karazuriTitle: T; karazuriCaption: T;
  inkIt: T; lightAngle: T; credentialsTitle: T; credentials: readonly T[]; pinesFigure: Figure;
}
export interface CopyWriting extends Base {
  reposTitle: T; articlesTitle: T; talksTitle: T; dropHint: T; dropCentre: T; takePrint: T; download: T; share: T; reset: T;
  starsLabel: T; latestLabel: T; figures: { header: Figure; oss: Figure; articles: Figure; talks: Figure };
}
export interface CopyTestimonials extends Base {
  leadershipTitle: T; leadershipLabels: { mentees: T; promoted: T; interviews: T; onboarding: T; rfcs: T; ics: T };
  figureDay: Figure; figureNight: Figure;
}
export interface CopyContact extends Base {
  letter: readonly T[]; signature: T;
  form: { name: T; email: T; message: T; send: T; sending: T; sent: T; error: T; mailtoNote: T };
  copyEmail: T; copied: T; cvTitle: T; cv: { ja: T; en: T; zh: T };
  availabilityTitle: T; overlapTitle: T; responseTime: T; workAuth: T; relocation: T; arrival: T; figure: Figure;
}
export interface CopyColophon extends Base {
  bookTitle: T; author: T; publisher: T; carving: T; printing: T; paper: T; pictures: T;
  weightLabel: T; vitalsLabel: T; buildLabel: T; editionPattern: T; datePattern: T; finale: T; todaysPrint: T; savePrint: T;
  libraries: readonly { name: string; version: string; licence: string }[];
  fonts: readonly { family: string; licence: 'OFL-1.1' | 'Apache-2.0' }[];
  booksFigure: Figure; nightFigure: Figure;
}
export interface CopyNotFound { title: T; line: T; home: T; figure: Figure }
export interface Copy {
  cover: CopyCover; summary: CopySummary; road: CopyRoad; works: CopyWorks; skills: CopySkills; principles: CopyPrinciples;
  achievements: CopyAchievements; writing: CopyWriting; testimonials: CopyTestimonials; contact: CopyContact;
  colophon: CopyColophon; notFound: CopyNotFound;
}

/* ---------- site config, manifest, images ---------- */
export interface Site {
  title: T; description: T; ogAlt: T; sampleNotice: boolean; sampleNoticeText: T;
  email: string; links: { github: string; linkedin: string }; contactEndpoint: string | null; siteOrigin: string | null; versionMajor: number;
}
export interface ManifestEntry {
  file: string; set: string; title: string; artist: string; date: string; institution: string; objectUrl: string; imageUrl: string;
  license: string; width: number; height: number; dominantColors: string[]; accentColors?: string[]; suggestedUse: string;
  creditText: string; accession?: string; creditLine?: string; medium?: string; sourceApiFlag?: string; bytes?: number;
  tokaido?: { printNo: number; stationIndex: number; nameJa: string; nameEn: string; subtitle: string }; description?: string;
}
export type ImagesIndex = Readonly<Record<string, { w: number; h: number; widths: readonly number[]; dominant: string; accent: readonly string[] }>>;

export interface Content {
  site: Site; person: Person; employers: readonly Employer[]; metrics: readonly Metric[]; plates: readonly Plate[];
  stations: readonly Station[]; career: readonly Chapter[]; cases: readonly CaseStudy[]; domains: readonly Domain[]; tools: readonly Tool[];
  principles: readonly Principle[]; ops: Ops; banzuke: Banzuke; charts: readonly Chart[]; reliability: readonly ReliabilityFigure[];
  repos: readonly Repo[]; articles: readonly Article[]; talks: readonly Talk[]; testimonials: readonly Testimonial[]; leadership: Leadership;
  glossary: readonly GlossaryEntry[]; credits: Readonly<Record<string, { title: T; alt: T }>>; copy: Copy;
}
