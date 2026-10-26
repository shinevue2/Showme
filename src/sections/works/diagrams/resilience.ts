/** 第六扇 resilience — cells in two regions, automated failover (DESIGN §6.4, B.5). Owner: WP-07. Node-safe. */
import { P, t3, type Diagram, type Label, type Prim } from './kit';

export function resilience(): Diagram {
  const prims: Prim[] = [];
  const labels: Label[] = [];
  const router = { x: 300, y: 40, w: 120, h: 38 };
  const rc = P(360, 59);
  const regions = [{ x: 40, label: t3('東リージョン', 'East region', '东区') }, { x: 384, label: t3('西リージョン', 'West region', '西区') }];
  const ry = 128, rw = 296, rh = 196;
  const cw = 76, ch = 84;
  const cellX = (rx: number, i: number) => rx + 22 + i * (cw + 18);

  // phase 0 — the axis of symmetry and the compass circle from the router
  prims.push({ k: 'line', ph: 0, a: P(360, 24), b: P(360, 344) });
  prims.push({ k: 'circle', ph: 0, c: rc, r: 132 });

  // phase 1 — router, two regions, three cells each (app + data)
  prims.push({ k: 'rect', ph: 1, x: router.x, y: router.y, w: router.w, h: router.h, heavy: true, paper: true });
  regions.forEach((r, ri) => {
    prims.push({ k: 'rect', ph: 1, x: r.x, y: ry, w: rw, h: rh });
    for (let i = 0; i < 3; i++) {
      const x = cellX(r.x, i), y = ry + 54;
      const failed = ri === 0 && i === 1;
      prims.push({ k: 'rect', ph: 1, x, y, w: cw, h: ch, dash: failed, paper: true });
      if (!failed) prims.push({ k: 'rect', ph: 4, x, y, w: cw, h: ch, fill: 7 });
      prims.push({ k: 'cyl', ph: 1, x: x + 22, y: y + 40, w: 32, h: 30 });
      prims.push({ k: 'line', ph: 1, a: P(rc[0] + (x + cw / 2 - rc[0]) * 0.12, router.y + router.h + 1), b: P(x + cw / 2, y - 3), arrow: !failed, dash: failed });
    }
  });
  // replication between paired cells
  for (let i = 0; i < 3; i++) {
    const a = P(cellX(40, i) + cw / 2, ry + 54 + ch + 4), b = P(cellX(384, i) + cw / 2, ry + 54 + ch + 4);
    prims.push({ k: 'path', ph: 1, d: `M${a[0]} ${a[1]}C${a[0]} ${a[1] + 36 + i * 8} ${b[0]} ${b[1] + 36 + i * 8} ${b[0]} ${b[1]}`, dash: true });
  }
  // the failed cell and the automated failover to its pair in the other region
  const fx = cellX(40, 1), fy = ry + 54;
  prims.push({ k: 'path', ph: 1, d: `M${fx + 18} ${fy + 20}L${fx + cw - 18} ${fy + ch - 44}M${fx + cw - 18} ${fy + 20}L${fx + 18} ${fy + ch - 44}`, warn: true });
  prims.push({ k: 'path', ph: 1, d: `M${rc[0] + 40} ${router.y + router.h + 2}C${500} 110 ${cellX(384, 1) + cw / 2} 120 ${cellX(384, 1) + cw / 2} ${fy - 4}`, heavy: true, arrow: true, warn: true });

  prims.push({ k: 'x', ph: 2, c: P(360, rc[1] + 132), label: true });
  prims.push({ k: 'anchor', ph: 3, c: P(router.x, router.y) });
  prims.push({ k: 'anchor', ph: 3, c: P(router.x + router.w, router.y + router.h), handle: P(router.x + router.w + 26, router.y + router.h + 8) });

  labels.push({ at: P(24, 30), t: t3('セルに分け、二つのリージョンで持つ', 'Cells, each held in two regions', '拆成单元，两个区域各持一份'), s: 'head' });
  labels.push({ at: P(360, 63), t: t3('グローバルルーター', 'Global router', '全局路由'), a: 'middle', s: 'small' });
  regions.forEach((r) => {
    labels.push({ at: P(r.x + 14, ry + 24), t: r.label, s: 'small', halo: true });   // the router's lines pass under it
    for (let i = 0; i < 3; i++) labels.push({ at: P(cellX(r.x, i) + cw / 2, ry + 54 + 26), t: t3(`セル${i + 1}`, `cell ${i + 1}`, `单元${i + 1}`), a: 'middle', s: 'small' });
  });
  labels.push({ at: P(560, 108), t: t3('自動切替', 'automated failover', '自动切换'), s: 'warn' });
  labels.push({ at: P(360, 364), t: t3('非同期レプリケーション', 'asynchronous replication', '异步复制'), a: 'middle', s: 'small' });
  labels.push({ at: P(24, 388), t: 'RTO 4 h → 15 min', s: 'num' });
  labels.push({ at: P(470, 388), t: '99.95 → 99.99 %', s: 'num' });

  return {
    id: 'resilience', w: 720, h: 400, prims, labels,
    title: t3('セル型マルチリージョン構成', 'Cell-based multi-region design', '单元化异地多活架构'),
    desc: t3(
      'グローバルルーターが東西二つのリージョンの各三セルへ振り分け、対になるセルどうしは非同期でレプリケーションする。東のセル2が落ちると、そのトラフィックは西のセル2へ自動で切り替わる。',
      'A global router spreads traffic over three cells in each of two regions; paired cells replicate asynchronously. When cell 2 in the east fails, its traffic fails over automatically to cell 2 in the west.',
      '全局路由把流量分到东西两个区域各三个单元，成对的单元之间异步复制。东区单元2故障时，其流量自动切换到西区单元2。',
    ),
  };
}
