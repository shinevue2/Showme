/** 第一扇 ledger — the idempotent settlement batch (DESIGN §6.4, B.5). Owner: WP-07. Node-safe. */
import { P, poly, t3, type Diagram, type Label, type Prim } from './kit';

export function ledger(): Diagram {
  const prims: Prim[] = [];
  const labels: Label[] = [];
  const lanes = [96, 160, 224, 288];
  const cols = [138, 252, 366];
  const bw = 88, bh = 34;
  const hub = P(522, 192);

  // phase 0 — construction: lane baselines, step verticals, the compass circle at the outbox junction
  lanes.forEach((y) => prims.push({ k: 'line', ph: 0, a: P(64, y), b: P(470, y) }));
  cols.forEach((x) => prims.push({ k: 'line', ph: 0, a: P(x, 66), b: P(x, 318) }));
  prims.push({ k: 'circle', ph: 0, c: hub, r: 64 });
  prims.push({ k: 'circle', ph: 0, c: hub, r: 22 });

  // phase 1 — the batch: 4 merchant partitions × 3 steps, each step with its idempotency key
  lanes.forEach((y, li) => {
    cols.forEach((x, ci) => {
      const failed = li === 2 && ci === 1;
      prims.push({ k: 'rect', ph: 1, x: x - bw / 2, y: y - bh / 2, w: bw, h: bh, dash: failed || (li === 2 && ci === 2), paper: true });
      // key glyph: bow + bit
      prims.push({ k: 'path', ph: 1, d: `M${x + bw / 2 - 18} ${y - bh / 2 + 9}a3.2 3.2 0 1 0 0.01 0M${x + bw / 2 - 14.8} ${y - bh / 2 + 9}h8v3` });
      if (ci < 2) prims.push({ k: 'line', ph: 1, a: P(x + bw / 2 + 2, y), b: P(cols[ci + 1]! - bw / 2 - 3, y), arrow: !(li === 2 && ci >= 1) });
      if (!(li === 2 && ci > 0)) prims.push({ k: 'rect', ph: 4, x: x - bw / 2, y: y - bh / 2, w: bw, h: bh, fill: 2 });
    });
    if (li !== 2) prims.push({ k: 'line', ph: 1, a: P(cols[2]! + bw / 2 + 2, y), b: P(hub[0] - 26, hub[1] + (y - hub[1]) * 0.08), arrow: true });
  });
  // the retry on partition 3: only the uncommitted steps run again
  const y3 = lanes[2]!;
  prims.push({ k: 'path', ph: 1, d: `M${cols[2]! + bw / 2} ${y3 + 6}C${cols[2]! + 78} ${y3 + 48} ${cols[1]! - 20} ${y3 + 54} ${cols[1]! - bw / 2 + 6} ${y3 + bh / 2 + 2}`, arrow: true, warn: true, dash: true });
  // outbox → ledger → settlement file
  prims.push({ k: 'rect', ph: 1, x: hub[0] - 22, y: hub[1] - 22, w: 44, h: 44, heavy: true, paper: true });
  prims.push({ k: 'rect', ph: 4, x: hub[0] - 22, y: hub[1] - 22, w: 44, h: 44, fill: 2 });
  prims.push({ k: 'line', ph: 1, a: P(hub[0] + 24, hub[1]), b: P(616, hub[1]), arrow: true });
  prims.push({ k: 'cyl', ph: 1, x: 620, y: hub[1] - 34, w: 72, h: 68, fill: 2 });
  prims.push({ k: 'line', ph: 1, a: P(656, hub[1] + 38), b: P(656, 262), arrow: true });
  prims.push({ k: 'path', ph: 1, d: poly([P(626, 266), P(676, 266), P(688, 278), P(688, 314), P(626, 314)], true) });
  prims.push({ k: 'path', ph: 1, d: poly([P(676, 266), P(676, 278), P(688, 278)]) });

  // phase 2 — intersections where the partitions meet the outbox circle
  {
    // where partition 1's line meets the outbox circle
    const a = P(cols[2]! + bw / 2 + 2, lanes[0]!), b = P(hub[0] - 26, hub[1] + (lanes[0]! - hub[1]) * 0.08);
    let t = 0;
    for (let i = 0; i <= 200; i++) { const u = i / 200; const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u; if (Math.hypot(x - hub[0], y - hub[1]) <= 64) { t = u; break; } }
    prims.push({ k: 'x', ph: 2, c: P(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), label: true });
  }
  // phase 3 — anchors on the commit column, as an Illustrator selection would show them
  prims.push({ k: 'anchor', ph: 3, c: P(cols[2]! - bw / 2, lanes[0]! - bh / 2) });
  prims.push({ k: 'anchor', ph: 3, c: P(cols[2]! + bw / 2, lanes[0]! - bh / 2) });
  prims.push({ k: 'anchor', ph: 3, c: P(cols[2]! + bw / 2, lanes[3]! + bh / 2), handle: P(cols[2]! + bw / 2 + 22, lanes[3]! + bh / 2 + 12) });
  prims.push({ k: 'anchor', ph: 3, c: P(cols[2]! - bw / 2, lanes[3]! + bh / 2) });

  // labels
  labels.push({ at: P(24, 36), t: t3('加盟店ごとに分割し、並列に流す', 'Partitioned by merchant, run in parallel', '按商户分区，并行跑批'), s: 'head' });
  labels.push({ at: P(cols[0]!, 64), t: t3('集計', 'Sum', '汇总'), a: 'middle', s: 'small' });
  labels.push({ at: P(cols[1]!, 64), t: t3('手数料', 'Fees', '手续费'), a: 'middle', s: 'small' });
  labels.push({ at: P(cols[2]!, 64), t: t3('確定', 'Commit', '提交'), a: 'middle', s: 'small' });
  lanes.forEach((y, i) => labels.push({ at: P(28, y + 4), t: `P${i + 1}`, s: 'num' }));
  labels.push({ at: P(hub[0], hub[1] + 40), t: t3('アウトボックス', 'Outbox', '发件箱'), a: 'middle', s: 'small' });   // under the box: the smart guide's "intersect" sits above
  labels.push({ at: P(656, hub[1] + 10), t: t3('台帳', 'Ledger', '账本'), a: 'middle', s: 'small' });
  labels.push({ at: P(656, hub[1] - 44), t: 'PostgreSQL', a: 'middle', s: 'small' });
  labels.push({ at: P(657, 332), t: t3('精算ファイル', 'Settlement file', '清算文件'), a: 'middle', s: 'small' });
  labels.push({ at: P(cols[1]!, 330), t: t3('再実行は未確定の分だけ', 'A retry repeats only uncommitted steps', '重跑只补未提交的步骤'), s: 'warn', a: 'middle' });
  labels.push({ at: P(24, 362), t: t3('各ステップに冪等キー', 'An idempotency key on every step', '每一步都带幂等键'), s: 'small' });
  labels.push({ at: P(24, 390), t: '6 h → 50 min', s: 'num' });
  labels.push({ at: P(160, 390), t: t3('夜間精算　二重精算ゼロ', 'nightly run · zero double settlements', '夜间清算 · 零重复清算'), s: 'small' });

  return {
    id: 'ledger', w: 720, h: 404, prims, labels,
    title: t3('冪等な精算バッチ', 'An idempotent settlement batch', '幂等的清算跑批'),
    desc: t3(
      '加盟店ごとの四つのパーティションが、集計・手数料・確定の三段を並列に進み、トランザクショナルアウトボックス経由で台帳（PostgreSQL）に書き、精算ファイルを出す。三つ目のパーティションは手数料で失敗し、再実行は確定していない段だけを繰り返す。',
      'Four merchant partitions run sum, fees and commit in parallel, write through a transactional outbox to the PostgreSQL ledger and produce the settlement file. The third partition fails at fees; its retry repeats only the steps that have not committed.',
      '四个商户分区并行执行汇总、手续费、提交三步，经事务性发件箱写入PostgreSQL账本并生成清算文件。第三个分区在手续费一步失败，重跑只重复尚未提交的步骤。',
    ),
  };
}
