/**
 * JST clock (DESIGN §6.1, §6.10, §11.1 live content aria-live="off"). Owner: WP-00.
 * Updates every `[data-jst-clock]` element once a minute with `setTimeout` aligned to the minute — never rAF.
 */
const fmt = (() => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return null;
  }
})();

export function jstNow(d: Date = new Date()): { hh: string; mm: string; iso: string } {
  let hh = '00', mm = '00';
  if (fmt) {
    const parts = fmt.formatToParts(d);
    hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
    mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
    if (hh === '24') hh = '00';
  } else {
    const j = new Date(d.getTime() + 9 * 3600000);
    hh = String(j.getUTCHours()).padStart(2, '0');
    mm = String(j.getUTCMinutes()).padStart(2, '0');
  }
  const j = new Date(d.getTime() + 9 * 3600000);
  const iso = j.toISOString().slice(0, 16) + '+09:00';
  return { hh, mm, iso };
}

let timer: ReturnType<typeof setTimeout> | null = null;
const minuteCbs = new Set<() => void>();

function paint(): void {
  const { hh, mm, iso } = jstNow();
  document.querySelectorAll<HTMLTimeElement>('[data-jst-clock]').forEach((el) => {
    el.textContent = `JST ${hh}:${mm}`;
    el.dateTime = iso;
  });
  for (const cb of minuteCbs) { try { cb(); } catch (e) { console.error(e); } }
}

function schedule(): void {
  const now = Date.now();
  timer = setTimeout(() => { paint(); schedule(); }, 60000 - (now % 60000) + 50);
}

/** Start the shared minute clock (idempotent). */
export function startClock(): void {
  if (timer) return;
  paint();
  schedule();
}

/** Run a callback on each minute boundary (e.g. overlap-hours readouts). */
export function onMinute(cb: () => void): () => void {
  minuteCbs.add(cb);
  return () => minuteCbs.delete(cb);
}
