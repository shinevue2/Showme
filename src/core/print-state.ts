/**
 * Today's print state (DESIGN §1.3 persistent threads, §3.2 Separations, §4.4). Owner: WP-00.
 * Plates are inked as the visitor passes them (`ink(n)`), hidden from decorative layers via
 * html[data-sep-off~="N"] (`setHidden`), then the visitor's marbling and seal finish the print.
 * Plate 1 is inked from the start and can never be hidden.
 */
import type { MarbleOp, PlateN, PrintStateAPI, SealImpression } from './types';

type Ev = 'ink' | 'hide' | 'marbling' | 'seal';

export function createPrintState(seed: number): PrintStateAPI {
  const root = document.documentElement;
  const inked = new Set<PlateN>([1]);
  const hidden = new Set<PlateN>();
  const listeners: Record<Ev, Set<() => void>> = { ink: new Set(), hide: new Set(), marbling: new Set(), seal: new Set() };
  let marbling: { canvas: HTMLCanvasElement | null; ops: readonly MarbleOp[]; version: number } = { canvas: null, ops: [], version: 0 };
  let seal: SealImpression | null = null;
  const emit = (e: Ev) => { for (const cb of listeners[e]) { try { cb(); } catch (err) { console.error(err); } } };

  const initialOff = (root.dataset.sepOff ?? '').split(/\s+/).map(Number).filter((n) => n >= 2 && n <= 8) as PlateN[];
  initialOff.forEach((n) => hidden.add(n));

  return {
    seed,
    get inked() { return inked as ReadonlySet<PlateN>; },
    get hidden() { return hidden as ReadonlySet<PlateN>; },
    ink(n: PlateN) {
      if (inked.has(n)) return;
      inked.add(n);
      root.dataset.inked = [...inked].sort().join(' ');
      emit('ink');
    },
    setHidden(n: PlateN, h: boolean) {
      if (n === 1) return;
      if (h === hidden.has(n)) return;
      if (h) hidden.add(n); else hidden.delete(n);
      const v = [...hidden].sort().join(' ');
      if (v) root.dataset.sepOff = v; else delete root.dataset.sepOff;
      emit('hide');
    },
    get marbling() { return marbling; },
    setMarbling(canvas: HTMLCanvasElement, ops: readonly MarbleOp[]) {
      marbling = { canvas, ops: [...ops], version: marbling.version + 1 };
      emit('marbling');
    },
    get seal() { return seal; },
    setSeal(s: SealImpression) {
      seal = { ...s };
      emit('seal');
    },
    on(ev: Ev, cb: () => void) {
      listeners[ev].add(cb);
      return () => listeners[ev].delete(cb);
    },
  };
}
