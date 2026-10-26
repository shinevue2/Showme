/**
 * Chrome bridge (DESIGN §8.5 ChromeAPI). Owner: WP-00.
 * `ctx.chrome` exists from boot; it forwards to the implementation that src/chrome/index.ts (WP-04) returns
 * from `mount()`. Until then every call is a safe no-op (spinWheel resolves immediately).
 */
import type { ChromeAPI, Lang } from './types';

export interface ChromeBridge extends ChromeAPI {
  attach(impl: Partial<ChromeAPI>): void;
}

export function createChromeBridge(): ChromeBridge {
  let impl: Partial<ChromeAPI> = {};
  let lastYears: number | null = null;
  return {
    attach(next) {
      impl = next;
      if (lastYears !== null) impl.setRulerYears?.(lastYears);
    },
    setRulerYears(p: number | null) {
      lastYears = p;
      impl.setRulerYears?.(p);
    },
    smartGuide(x: number, y: number, label: string) {
      impl.smartGuide?.(x, y, label);
    },
    setStatus(text: string | null) {
      impl.setStatus?.(text);
    },
    spinWheel(to: Lang) {
      return impl.spinWheel ? impl.spinWheel(to) : Promise.resolve();
    },
  };
}
