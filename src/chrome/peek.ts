/**
 * Peek the GLSL (DESIGN §4.1). Owner: WP-04. Desktop, fine pointer, live stage only.
 * Every live view gets a 10 px square anchor at its top-left corner (layer colour, focusable, 24 px target).
 * Activating it opens a panel with that view's fragment shader source (read-only, IBM Plex Mono, copy
 * button) and its share of the views' CPU time. Sources come from the view's own materials: the authored
 * `fragmentShader` of ShaderMaterials, or the compiled program source for built-in materials. The chrome
 * never imports three: the scene is walked by duck typing.
 */
import { icon } from '../core/icons';
import { $, coalesce, escHtml, h, mq, type ChromeCtx, type StageLike } from './util';

interface Src { name: string; code: string }
interface MatLike { type?: string; name?: string; fragmentShader?: string; uuid?: string }
interface Obj3 { material?: MatLike | MatLike[]; children?: Obj3[] }
type RendererLike = { properties?: { get(m: unknown): { currentProgram?: { fragmentShader?: WebGLShader } } }; getContext?(): WebGLRenderingContext };

function sources(view: { scene: unknown }, renderer: RendererLike | undefined): Src[] {
  const out: Src[] = [];
  const seen = new Set<string>();
  const visit = (o: Obj3) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      const key = m.uuid ?? String(out.length);
      if (seen.has(key)) continue;
      seen.add(key);
      let code = typeof m.fragmentShader === 'string' && m.fragmentShader.trim() ? m.fragmentShader : '';
      if (!code && renderer?.properties && renderer.getContext) {
        try {
          const prog = renderer.properties.get(m).currentProgram;
          const sh = prog?.fragmentShader;
          if (sh) code = renderer.getContext().getShaderSource(sh) ?? '';
        } catch { /* lost context */ }
      }
      if (code && !out.some((x) => x.code === code)) out.push({ name: m.name || m.type || 'material', code });
    }
    for (const ch of o.children ?? []) visit(ch);
  };
  visit(view.scene as Obj3);
  return out;
}

const KW = /\b(uniform|varying|attribute|in|out|inout|const|void|float|int|uint|bool|vec[234]|ivec[234]|bvec[234]|mat[234]|sampler2D|samplerCube|sampler3D|precision|highp|mediump|lowp|if|else|for|while|return|discard|struct|break|continue|true|false|layout)\b/g;
function highlight(code: string): string {
  return code.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n').map((line) => {
    let html = escHtml(line);
    const ci = html.indexOf('//');
    let comment = '';
    if (ci >= 0) { comment = `<span class="c">${html.slice(ci)}</span>`; html = html.slice(0, ci); }
    if (/^\s*#/.test(html)) html = `<span class="k">${html}</span>`;
    else html = html.replace(KW, '<span class="k">$1</span>').replace(/(?<![\w.#])(\d+\.?\d*(?:e[-+]?\d+)?)(?![\w])/g, '<span class="n">$1</span>');
    return `<span class="ln">${html}${comment}</span>`;
  }).join('');
}

export function mountPeek(c: ChromeCtx, stage: StageLike): void {
  const { s } = c;
  const anchors = new Map<string, HTMLButtonElement>();
  let dialog: HTMLDialogElement | null = null;

  const place = coalesce(() => {
    const views = stage.views ?? [];
    for (const v of views) {
      let a = anchors.get(v.id);
      const live = v.el.dataset.live === '1' && mq.fine.matches && !mq.mobile.matches;
      if (!live) { if (a) delete a.dataset.on; continue; }
      if (!a) {
        a = h('button', 'peek-anchor', { type: 'button', 'aria-label': `${s.peek}: ${v.printName || v.id}` });
        const sec = v.el.closest<HTMLElement>('[data-section]');
        if (sec) a.style.setProperty('--sw', `var(--layer-${sec.dataset.section})`);
        a.addEventListener('click', () => open(v.id));
        document.body.appendChild(a);
        anchors.set(v.id, a);
      }
      const r = v.el.getBoundingClientRect();
      const topMin = 64;
      const vis = r.bottom > topMin + 12 && r.top < innerHeight - 30 && r.right > 0;
      if (!vis) { delete a.dataset.on; continue; }
      a.dataset.on = '';
      a.style.transform = `translate(${Math.round(Math.max(r.left, 24) + 6)}px, ${Math.round(Math.max(r.top, topMin) + 6)}px)`;
    }
  });

  const open = (id: string) => {
    const v = (stage.views ?? []).find((x) => x.id === id);
    if (!v) return;
    const list = sources(v, stage.renderer as unknown as RendererLike);
    const stats = stage.stats();
    const total = Object.values(stats.perViewMs).reduce((a, b) => a + b, 0);
    const ms = stats.perViewMs[id] ?? 0;
    const share = total > 0 ? Math.round((ms / total) * 100) : 0;
    dialog?.remove();
    dialog = h('dialog', 'peek', { 'aria-labelledby': 'peek-title' }) as HTMLDialogElement;
    const sec = v.el.closest<HTMLElement>('[data-section]');
    if (sec) dialog.style.setProperty('--sw', `var(--layer-${sec.dataset.section})`);
    dialog.innerHTML =
      `<div class="peek__head"><span class="peek__sw" aria-hidden="true"></span>` +
      `<p class="peek__title" id="peek-title"><span><b lang="ja">${escHtml(v.printName || id)}</b> · ${escHtml(id)}</span><small>${s.peekTitle}</small></p>` +
      `<button type="button" class="peek__copy" data-copy>${icon('copy')}<span>${s.copy}</span></button>` +
      `<button type="button" class="panel__close" data-close aria-label="${escHtml(s.close)}">${icon('close')}</button></div>` +
      (list.length > 1 ? `<div class="peek__tabs">${list.map((x, i) => `<button type="button" data-src="${i}" aria-pressed="${i === 0}">${escHtml(x.name)}</button>`).join('')}</div>` : '') +
      `<pre tabindex="0"><code>${list.length ? highlight(list[0]!.code) : escHtml(s.peekNoSource)}</code></pre>` +
      `<p class="peek__foot">${ms.toFixed(2)} ms · ${share}% ${escHtml(s.peekShare)} · ${escHtml(s.programs)} ${list.length}</p>`;
    document.body.appendChild(dialog);
    let cur = 0;
    const code = $<HTMLElement>('code', dialog)!;
    dialog.querySelectorAll<HTMLButtonElement>('[data-src]').forEach((b) => b.addEventListener('click', () => {
      cur = Number(b.dataset.src);
      code.innerHTML = highlight(list[cur]!.code);
      dialog!.querySelectorAll<HTMLButtonElement>('[data-src]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    const copyBtn = $<HTMLButtonElement>('[data-copy]', dialog)!;
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(list[cur]?.code ?? ''); copyBtn.querySelector('span')!.textContent = s.copied; c.announce(s.copied); } catch { /* clipboard blocked */ }
    });
    const close = () => { dialog?.close(); dialog?.remove(); dialog = null; anchors.get(id)?.focus({ preventScroll: true }); };
    $<HTMLButtonElement>('[data-close]', dialog)!.addEventListener('click', close);
    dialog.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
    dialog.show();
    copyBtn.focus({ preventScroll: true });
  };

  // anchors follow the live views: data-live flips when the stage promotes / parks a view
  const mo = new MutationObserver(() => place());
  document.querySelectorAll('.view').forEach((v) => mo.observe(v, { attributes: true, attributeFilter: ['data-live'] }));
  addEventListener('scroll', () => place(), { passive: true });
  addEventListener('resize', () => place(), { passive: true });
  place();
}
