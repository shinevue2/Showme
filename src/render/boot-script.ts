/**
 * Inline boot scripts (DESIGN §8.8 step 1; together ≤ 1 KB). Owner: WP-00. Node-safe (plain strings).
 *
 * BOOT_HEAD (in <head>, before CSS paints): html.no-js → html.js; theme preference from
 * localStorage['hanmoto.theme'] → data-theme; `?theme=day|night` (poster capture) overrides without
 * storing; `?proof=1` → data-proof; `?poster=<viewId>` → data-poster; stored motion-off → data-motion;
 * root-page language notice flag → data-lang-notice (never redirects).
 *
 * BOOT_BODY (end of <body>, before first paint): restores sessionStorage['hanmoto.pos'] =
 * { section, offset (fraction of the section height), hash } written by i18n.switchTo().
 */
export const BOOT_HEAD =
  "(function(h){var D=h.dataset,q=new URLSearchParams(location.search),s,t;h.className=h.className.replace('no-js','js');" +
  "try{s=localStorage;t=s.getItem('hanmoto.theme');if(/^(light|dark)$/.test(t))D.theme=t;if(s.getItem('hanmoto.motion')=='off')D.motion='off';" +
  "if(D.page=='main'&&h.lang=='ja'&&!s.getItem('hanmoto.lang')){t=((navigator.languages||[])[0]||'').slice(0,2);if(/^(en|zh)$/.test(t))D.langNotice=t}}catch(e){}" +
  "t=q.get('theme');if(t=='day')D.theme='light';if(t=='night')D.theme='dark';if(q.get('proof')=='1')D.proof='';t=q.get('poster');if(t)D.poster=t})(document.documentElement)";

export const BOOT_BODY =
  "(function(s,p,e,r){try{s=sessionStorage;p=JSON.parse(s.getItem('hanmoto.pos'));if(!p)return;s.removeItem('hanmoto.pos');" +
  "e=document.getElementById(p.section);if(e){history.scrollRestoration='manual';r=e.getBoundingClientRect();scrollTo(0,r.top+scrollY+(p.offset||0)*r.height)}" +
  "if(p.hash)history.replaceState(history.state,'',location.pathname+location.search+p.hash)}catch(x){}})()";
