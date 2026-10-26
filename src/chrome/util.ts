/**
 * Chrome helpers (DESIGN §4). Owner: WP-04.
 */
import { frame } from '../core/frame';
import { setMotionLayerVisible } from '../core/motion';
import { local } from '../core/storage';
import type { AppContext, StageAPI } from '../core/types';
import type { ChromeStrings } from './strings';
import type { RulersAPI } from './rulers';

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(sel)];

export const mq = {
  mobile: matchMedia('(max-width: 767px)'),
  desktop: matchMedia('(min-width: 1024px)'),
  fine: matchMedia('(pointer: fine)'),
  coarse: matchMedia('(pointer: coarse)'),
};

/** A frame-coalesced job: calling the returned function any number of times runs `fn` once on the next tick of the one clock. */
export function coalesce(fn: () => void): () => void {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    const off = frame.add(() => {
      off();
      queued = false;
      try { fn(); } catch (e) { console.error('[chrome]', e); }
      return false;
    });
  };
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, attrs?: Record<string, string>, html?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (html !== undefined) el.innerHTML = html;
  return el;
}

export const escHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** A stage with the WP-00 extras (views list); typed loosely so the chrome never imports three. */
export interface StageLike extends StageAPI {
  readonly views?: readonly { id: string; el: HTMLElement; printName: string; scene: unknown }[];
}

/** Shared chrome state passed to every sub-module. */
export interface ChromeCtx {
  readonly ctx: AppContext;
  readonly s: ChromeStrings;
  stage: StageLike | null;
  readonly stageReady: Promise<StageLike | null>;
  /** Text in a live region (status messages for AT). */
  announce(msg: string): void;
}

export const isTextField = (el: Element | null): boolean =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);

/* ---- the Motion layer (shared by the Layers eye, Settings and the keyboard map) ---- */
const motionState = {
  off: local.get('hanmoto.motion') === 'off' ||
    (document.documentElement.dataset.motion === 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches),
};
export const motionLayerOn = (): boolean => !motionState.off;
export function setMotionLayer(on: boolean): void {
  motionState.off = !on;
  setMotionLayerVisible(on);
}

/** Late-bound instruments other modules may drive (Settings → rulers / outline). */
export const hooks: { rulers?: RulersAPI | null; outline?: (on: boolean) => void } = {};

/** Fill `{name}` / `{n}` placeholders (runtime twin of strings.ts fill, so the chunk never bundles all languages). */
export function fill(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
