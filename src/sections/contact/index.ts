/**
 * Contact — section module (DESIGN §6.10; bands testimonials-contact (incoming) and contact-colophon). Owner: WP-10.
 *  - the letter: phrases show as outlines with anchor points, then fill one by one (1.2 s) when it comes into view;
 *  - the seal place follows the signature; Send (endpoint POST, else mailto) stamps the seal: WP-09's stone in 3D
 *    (`contact-seal`, registered only while stamping), else the SVG impression (160 ms); ctx.print.setSeal();
 *  - copy-address button, trilingual validation messages;
 *  - the 京師 print scales 0.92 → 1 behind the noren walk-through; the 割印 halves register at mid-viewport.
 */
import type { AppContext, SectionModule } from '../../core/types';
import { strings } from './strings';
import type { SealView } from './view';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function phrases(letter: HTMLElement, ctx: AppContext): void {
  const ps = Array.from(letter.querySelectorAll<HTMLElement>('.letter__body p'));
  const spans: HTMLElement[] = [];
  for (const p of ps) {
    const text = p.textContent ?? '';
    const parts = text.match(/[^、。，,.;：:]+[、。，,.;：:]?\s*/g) ?? [text];
    p.textContent = '';
    for (const part of parts) {
      const sp = document.createElement('span');
      sp.className = 'ph';
      sp.textContent = part;
      p.append(sp);
      spans.push(sp);
    }
  }
  if (!ctx.motion.enabled || !('IntersectionObserver' in window)) return;
  letter.classList.add('is-outline');
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const step = 1200 / Math.max(1, spans.length);
    spans.forEach((sp, i) => setTimeout(() => sp.classList.add('is-filled'), 200 + i * step));
    setTimeout(() => letter.classList.remove('is-outline'), 260 + spans.length * step + 300);
  }, { threshold: 0.45 });
  io.observe(letter);
}

function placeSeal(letter: HTMLElement, slot: HTMLElement, ja: boolean): void {
  const sign = letter.querySelector<HTMLElement>('.letter__sign');
  if (!sign) return;
  const range = document.createRange();
  range.selectNodeContents(sign);
  const rects = Array.from(range.getClientRects());
  const last = rects[rects.length - 1];
  if (!last) return;
  const lr = letter.getBoundingClientRect();
  let x: number, y: number;
  if (ja && getComputedStyle(sign).writingMode.startsWith('vertical')) { x = last.left + last.width / 2 - lr.left; y = last.bottom - lr.top + 40; }
  else { x = last.right - lr.left - 18; y = last.bottom - lr.top + 36; }
  slot.style.setProperty('--sx', `${x.toFixed(1)}px`);
  slot.style.setProperty('--sy', `${y.toFixed(1)}px`);
}

async function mount(el: HTMLElement, ctx: AppContext): Promise<void> {
  const s = strings[ctx.lang];
  const c = ctx.content.copy.contact;
  const letter = el.querySelector<HTMLElement>('[data-letter]');
  const slot = el.querySelector<HTMLElement>('[data-view-id="contact-seal"]');
  const form = el.querySelector<HTMLFormElement>('.contact__form');
  const status = el.querySelector<HTMLElement>('.contact__status');
  if (letter) phrases(letter, ctx);

  /* ---------- seal place ---------- */
  const place = () => { if (letter && slot) placeSeal(letter, slot, ctx.lang === 'ja'); };
  place();
  document.fonts?.ready.then(place);
  if (letter) new ResizeObserver(place).observe(letter);
  const prior = ctx.print.seal;
  if (prior && letter && slot) { slot.style.setProperty('--seal-rot', `${-prior.rotation}rad`); letter.classList.add('is-sealed'); }

  let stamping = false;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const timeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout'); })]) as Promise<T>;
  const inView = () => { const r = slot!.getBoundingClientRect(); return r.bottom > 40 && r.top < innerHeight - 40; };
  const stamp = async () => {
    if (!letter || !slot || stamping) return;
    stamping = true;
    place();
    let result: { pressure: number; rotation: number } | null = null;
    // the seal goes on the letter: bring it into view first (a response to the visitor's own Send)
    if (ctx.motion.enabled && !inView()) { ctx.scroll.scrollTo(letter, { offset: -96 }); await sleep(1100); }
    const stage = ctx.motion.enabled && inView() ? await ctx.getStage() : null;
    if (stage) {
      let view: SealView | null = null;
      try {
        view = (await import('./view')).default(slot, ctx);
        stage.register(view);
        await timeout(view.ready, 6000);
        letter.classList.remove('is-sealed');
        result = await timeout(view.stamp(), 6000);
        slot.style.setProperty('--seal-rot', `${-result.rotation}rad`);
        letter.classList.add('is-sealed');
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      } catch { result = null; }
      if (view) stage.unregister(view);
    }
    if (!result) {
      result = { pressure: 0.92, rotation: (((ctx.print.seed % 31) / 31) * 2 - 1) * 0.026 };
      slot.style.setProperty('--seal-rot', `${-result.rotation}rad`);
      letter.classList.remove('is-stamping-2d', 'is-sealed');
      void letter.offsetWidth;
      letter.classList.add('is-sealed', 'is-stamping-2d');
    }
    ctx.print.setSeal({ pressure: result.pressure, rotation: result.rotation, at: Date.now() });
    const live = letter.querySelector('.letter__sealed');
    if (live) live.textContent = s.sealed;
    stamping = false;
  };

  /* ---------- copy ---------- */
  el.querySelector<HTMLButtonElement>('.contact__copy')?.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    const label = b.textContent;
    try { await navigator.clipboard.writeText(b.dataset.copy ?? ''); b.textContent = c.copied[ctx.lang]; setTimeout(() => { b.textContent = label; }, 2000); } catch { /* the address is selectable */ }
  });

  /* ---------- form ---------- */
  if (form) {
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((f) => {
      f.addEventListener('invalid', () => f.setCustomValidity(f.validity.valueMissing ? s.required : f.validity.typeMismatch ? s.badEmail : ''));
      f.addEventListener('input', () => f.setCustomValidity(''));
    });
    const say = (t: string) => { if (status) status.textContent = t; };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
      const endpoint = form.dataset.endpoint || ctx.content.site.contactEndpoint;
      if (endpoint) {
        say(c.form.sending[ctx.lang]);
        try {
          const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, lang: ctx.lang }) });
          if (!r.ok) throw new Error(String(r.status));
          say(c.form.sent[ctx.lang]);
          form.reset();
          void stamp();
        } catch { say(c.form.error[ctx.lang]); }
        return;
      }
      const email = ctx.content.site.email;
      const body = `${data.message ?? ''}\n\n— ${data.name ?? ''} <${data.email ?? ''}>`;
      location.href = `mailto:${email}?subject=${encodeURIComponent(s.subject)}&body=${encodeURIComponent(body)}`;
      say(c.form.mailtoNote[ctx.lang]);
      void stamp();
    });
  }

  /* ---------- testimonials → contact: the Kyoto print comes forward behind the noren ---------- */
  const kyoto = el.querySelector<HTMLElement>('.contact__kyoto');
  if (kyoto && ctx.motion.enabled) {
    kyoto.style.transform = 'scale(0.92)';
    ctx.scroll.band('testimonials-contact').on((p) => { kyoto.style.transform = p >= 1 ? '' : `scale(${(0.92 + 0.08 * clamp01(p)).toFixed(4)})`; });
  }

  /* ---------- 割印: the halves slide in and register when the join reaches mid-viewport ---------- */
  const band = el.querySelector<HTMLElement>('[data-band="contact-colophon"]');
  const top = band?.querySelector<HTMLElement>('.wariin--top');
  const bottom = document.querySelector<HTMLElement>('#colophon .wariin--bottom');
  if (band && top && bottom && ctx.motion.enabled) {
    const set = () => {
      const vh = innerHeight;
      const join = band.getBoundingClientRect().bottom + (bottom.parentElement!.getBoundingClientRect().top - band.getBoundingClientRect().bottom) / 2;
      const k = Math.max(0, Math.min(1, (join - vh / 2) / (vh / 2)));
      const dx = Math.round(k * k * 120);
      top.style.setProperty('--wx', `${dx}px`);
      bottom.style.setProperty('--wx', `${-dx}px`);
    };
    set();
    ctx.scroll.track(band, { start: 'top bottom', end: 'bottom top', onUpdate: set });
  }
}

export default { id: 'contact', mount } satisfies SectionModule;
