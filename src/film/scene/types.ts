/** plates.json (written by tools/film/plates.py) — all coordinates normalised to each station's canvas. */
export interface PlateLayer {
  name: string;
  z: number;
  rect: [number, number, number, number];   // x, y (top-left, y down), w, h in canvas units
  span?: [number, number];                   // full layer extent in u (x0, w) — tiles of one layer share it
  seed?: number;
  px: [number, number];
  k: string | null;                          // PNG-8 in P_k
  p: string | null;                          // PNG-8 in P_{k-1} (null for chapter 1)
  shadow: string;
  curl: number;
  shadowAlpha: number;
  stencil: boolean;
}

export interface Pose { cx: number; cy: number; w: number; [key: string]: unknown }

export interface SkySpec {
  z: number;
  stops: [number, number, number][];          // [canvas y, plate (0 = paper), amount]
  stopsPrev: [number, number, number][] | null;
}

export interface TravellerSpec {
  z: number;
  height: number;                             // fraction of the rest frame height
  path: [number, number][];                   // canvas coords, right (entry) → left (exit)
  rest: number;                               // arc-length parameter of the rest spot
  pose?: 'walk' | 'carried';
  restPortrait?: number;
  pathPortrait?: [number, number][];
  zPortrait?: number;
}

export interface StationRecord {
  station: string;
  k: number;
  canvas: [number, number];
  aspect: number;
  print: [number, number, number, number];
  layers: PlateLayer[];
  sky: SkySpec;
  vp: [number, number] | null;
  rest: Pose;
  restPortrait: Pose;
  traveller: TravellerSpec | null;
  extras: { frameLine?: boolean; frameLinePortraitTop?: number; [key: string]: unknown };
  palette: { k: number[][]; p: number[][] };
}

export interface PlatesJson {
  version: 1;
  order: string[];
  paper: [number, number, number];
  plates: string[];
  stations: Record<string, StationRecord>;
}
