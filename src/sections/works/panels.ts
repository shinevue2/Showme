/**
 * Per-panel constants for the works section and the case pages (DESIGN §6.4, §12 #5–6). Owner: WP-07.
 * Node-safe. Crop boxes are the WP-02 atlas crops (assets-src/svg/byobu-crops.json) expressed as fractions of
 * each full screen photograph, so a case page can mark on the whole screen which part was mounted as its panel.
 */
import type { CaseId } from '../../content/types';
import type { PlateN } from '../../core/types';

export interface PanelInfo {
  /** 第N扇, counted from the right (1 = rightmost, first read). */
  n: 1 | 2 | 3 | 4 | 5 | 6;
  /** Crop of the screen photograph used for the panel: x, y, w, h as fractions (0..1). */
  crop: readonly [number, number, number, number];
  /** Mobile panel (opaque 560 × 896, 1 : 1.6). */
  mobile: string;
  /** The plate of the case's year (2019 → 弐 … 2025 → 漆): the registration snap under its title. */
  plate: PlateN;
}

const box = (x: number, y: number, w: number, h: number, iw: number, ih: number) =>
  [x / iw, y / ih, w / iw, h / ih] as const;

export const PANEL_INFO: Readonly<Record<CaseId, PanelInfo>> = {
  ledger:     { n: 1, crop: box(1645, 60, 275, 757, 1974, 887),  mobile: 'img/gen/byobu-panel-1', plate: 2 },
  tracing:    { n: 2, crop: box(366, 50, 286, 787, 1976, 879),   mobile: 'img/gen/byobu-panel-2', plate: 3 },
  mapgl:      { n: 3, crop: box(356, 48, 238, 655, 1979, 753),   mobile: 'img/gen/byobu-panel-3', plate: 4 },
  strangler:  { n: 4, crop: box(349, 50, 316, 869, 2000, 970),   mobile: 'img/gen/byobu-panel-4', plate: 5 },
  platform:   { n: 5, crop: box(1329, 30, 317, 872, 2000, 962),  mobile: 'img/gen/byobu-panel-5', plate: 6 },
  resilience: { n: 6, crop: box(352, 44, 616, 1694, 2000, 1781), mobile: 'img/gen/byobu-panel-6', plate: 7 },
};

/** Atlas files (WP-02 R5): column i (left → right) is 第(i+1)扇. */
export const ATLAS = { high: 'img/gen/byobu-atlas-3072.webp', low: 'img/gen/byobu-atlas-1536.webp' } as const;
