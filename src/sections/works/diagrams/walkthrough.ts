/**
 * 第六扇 resilience — 吹抜屋台 walkthrough (DESIGN §6.4): the multi-region design drawn as a roofless
 * cut-away, the way Heian and Edo painters lifted the roof off a house to show the rooms inside, with gold
 * suyari mist in the corners. Owner: WP-07. Node-safe. The text (terms and glosses) is the walkthrough's DOM
 * equivalent; WP-01 may move it into src/content (logged in docs/wp-requests/WP-07.md).
 */
import type { T } from '../../../content/types';
import { P, iso, poly, t3, type Diagram, type Label, type Prim, type Pt } from './kit';

export interface WalkPart { term: T; gloss: T }

export const walkIntro: T = t3(
  '吹抜屋台の描き方で、二つのリージョンを上から覗く。',
  'Drawn the way old painters lifted a roof to show the rooms, the two regions seen from above.',
  '借吹拔屋台的画法，从上方俯看两个区域。',
);

export const walkParts: readonly WalkPart[] = [
  {
    term: t3('門　グローバルルーター', 'Gate · the global router', '门 · 全局路由'),
    gloss: t3(
      'リクエストを、健全なセルのあるリージョンへ通す。',
      'Lets each request into a region that has a healthy cell for it.',
      '把每个请求放进有健康单元的区域。',
    ),
  },
  {
    term: t3('部屋　セル', 'Rooms · cells', '房间 · 单元'),
    gloss: t3(
      '決済の処理とデータを一式持ち、隣の部屋とは何も共有しない。',
      'Each holds the whole checkout path and its data, and shares nothing with the room next door.',
      '每间都有完整的交易链路和数据，与隔壁互不共享。',
    ),
  },
  {
    term: t3('廊下　キュー', 'Corridors · queues', '走廊 · 队列'),
    gloss: t3(
      'セルごとに自分の廊下を持つ。遅いセルが詰まらせるのは、その廊下だけ。',
      'Every cell has its own corridor, so a slow cell backs up only its own.',
      '每个单元有自己的走廊，慢的单元只会堵住自己那条。',
    ),
  },
  {
    term: t3('渡り廊下　非同期レプリケーション', 'Covered bridge · asynchronous replication', '廊桥 · 异步复制'),
    gloss: t3(
      '対になるセルのデータを、もう一方のリージョンへ写し続ける。',
      'Copies each cell’s data to its pair in the other region, continuously.',
      '持续把每个单元的数据复制到另一区域的配对单元。',
    ),
  },
  {
    term: t3('非常口　自動切替', 'Emergency exit · automated failover', '安全出口 · 自动切换'),
    gloss: t3(
      'セルが落ちると、門は15分以内にその流れを対のセルへ回す。',
      'When a cell fails, the gate sends its traffic to the paired cell within 15 minutes.',
      '单元故障时，门在15分钟内把它的流量转到配对单元。',
    ),
  },
];

export const pillarNote: T = t3(
  '五重塔の心柱は、塔を固めるためではなく、揺れを受けて逃がす芯だと説明されることが多い。北斎が描いた輪蔵も、一本の心棒で全体を回す。この構成も、セルが落ちることを前提に、ルーターと自動切替が揺れを受け止める。絶対に壊れない一本には頼らない。',
  'A pagoda’s central pillar is usually explained as a core that takes the shaking and lets it go, not one that holds the tower rigid. The rinzō Hokusai drew turns on a single post. This design leans the same way: cells are allowed to fail, and the router and failover absorb the shock instead of one part that must never break.',
  '五重塔的心柱，常被解释为承受摇晃、再把它卸掉的芯，而不是死死撑住塔身的刚柱。北斋画的轮藏，也靠一根轴转动全身。这套架构同样如此：允许单元故障，由路由和自动切换吸收冲击，而不指望某个永不出错的部件。',
);

export function walkthrough(): Diagram {
  const prims: Prim[] = [];
  const labels: Label[] = [];
  const o: Pt = P(300, 62);
  const I = (x: number, y: number, z = 0) => iso(x, y, z, o, 1);
  const quad = (pts: Pt[]) => poly(pts, true);
  const H = 22;               // wall height
  const W = 250, D = 100;     // a house: 250 × 100 (plan units)
  const EAST = 0, WEST = 170;

  // phase 0 — the 間 grid the houses are set out on
  for (let x = 0; x <= 350; x += 50) prims.push({ k: 'line', ph: 0, a: I(x, -10), b: I(x, 280) });
  for (let y = 0; y <= 270; y += 45) prims.push({ k: 'line', ph: 0, a: I(-10, y), b: I(370, y) });

  const box = (x: number, y: number, w: number, d: number, h: number) => {
    // a small store of data: top and the two faces we can see
    prims.push({ k: 'path', ph: 1, d: quad([I(x, y, h), I(x + w, y, h), I(x + w, y + d, h), I(x, y + d, h)]) });
    prims.push({ k: 'path', ph: 1, d: poly([I(x, y + d, h), I(x, y + d, 0), I(x + w, y + d, 0), I(x + w, y, 0), I(x + w, y, h)]) });
    prims.push({ k: 'path', ph: 1, d: poly([I(x + w, y + d, h), I(x + w, y + d, 0)]) });
  };
  const house = (y0: number) => {
    prims.push({ k: 'path', ph: 4, d: quad([I(0, y0), I(W, y0), I(W, y0 + 66), I(0, y0 + 66)]), fill: 7 });
    prims.push({ k: 'path', ph: 1, d: quad([I(0, y0), I(W, y0), I(W, y0 + D), I(0, y0 + D)]) });
    // the far walls stand full height; the near ones are lifted off (吹抜屋台)
    prims.push({ k: 'path', ph: 1, d: poly([I(0, y0 + D, 0), I(0, y0 + D, H), I(0, y0, H), I(W, y0, H), I(W, y0, 0)]) });
    prims.push({ k: 'path', ph: 1, d: poly([I(0, y0, 0), I(0, y0, H)]) });
    // three rooms (cells) at the back, a corridor (queue) in front
    for (const x of [W / 3, (2 * W) / 3]) prims.push({ k: 'path', ph: 1, d: poly([I(x, y0, H), I(x, y0 + 66, H), I(x, y0 + 66, 0)]) });
    prims.push({ k: 'path', ph: 1, d: poly([I(0, y0 + 66, 6), I(W, y0 + 66, 6), I(W, y0 + 66, 0)]) });
    for (let i = 0; i < 3; i++) box(i * (W / 3) + W / 6 - 12, y0 + 22, 24, 22, 14);
    // work waiting in the corridor
    for (let i = 0; i < 8; i++) {
      const x = 18 + i * 28;
      prims.push({ k: 'path', ph: 4, d: quad([I(x, y0 + 78), I(x + 14, y0 + 78), I(x + 14, y0 + 88), I(x, y0 + 88)]), fill: 6 });
      prims.push({ k: 'path', ph: 1, d: quad([I(x, y0 + 78), I(x + 14, y0 + 78), I(x + 14, y0 + 88), I(x, y0 + 88)]) });
    }
  };
  house(EAST);
  house(WEST);
  // covered bridge between the houses (replication)
  prims.push({ k: 'path', ph: 1, d: quad([I(108, D), I(142, D), I(142, WEST), I(108, WEST)]) });
  prims.push({ k: 'path', ph: 1, d: poly([I(108, D, 10), I(108, WEST, 10)]), dash: true });
  prims.push({ k: 'path', ph: 1, d: poly([I(142, D, 10), I(142, WEST, 10)]), dash: true });
  // the gate (router) in front, between the houses: a small gatehouse (番所) with a hipped roof
  const gx = 334, gy0 = 116, gy1 = 154, gw = 30, gh = 22;
  prims.push({ k: 'path', ph: 4, d: quad([I(gx, gy0), I(gx + gw, gy0), I(gx + gw, gy1), I(gx, gy1)]), fill: 7 });
  box(gx, gy0, gw, gy1 - gy0, gh);
  const ridgeA = I(gx + gw / 2, gy0 + 12, gh + 16), ridgeB = I(gx + gw / 2, gy1 - 12, gh + 16);
  prims.push({ k: 'path', ph: 1, d: poly([I(gx - 4, gy0 - 4, gh), ridgeA, ridgeB, I(gx - 4, gy1 + 4, gh)]), heavy: true });
  prims.push({ k: 'path', ph: 1, d: poly([I(gx + gw + 4, gy0 - 4, gh), ridgeA]), heavy: true });
  prims.push({ k: 'path', ph: 1, d: poly([I(gx + gw + 4, gy1 + 4, gh), ridgeB]), heavy: true });
  prims.push({ k: 'path', ph: 1, d: quad([I(gx - 4, gy0 - 4, gh), I(gx + gw + 4, gy0 - 4, gh), I(gx + gw + 4, gy1 + 4, gh), I(gx - 4, gy1 + 4, gh)]) });
  // roads from the gate into each corridor
  prims.push({ k: 'path', ph: 1, d: poly([I(gx - 6, gy0 + 6), I(W + 8, EAST + 84)]), arrow: true });
  prims.push({ k: 'path', ph: 1, d: poly([I(gx - 6, gy1 - 6), I(W + 8, WEST + 84)]), arrow: true });
  // the failed room in the east, and the emergency exit to its pair in the west
  const f0 = I(W / 2, EAST + 33, 6), f1 = I(W / 2, WEST + 30, 6);
  prims.push({ k: 'path', ph: 1, d: `M${f0[0] - 9} ${f0[1] - 7}L${f0[0] + 9} ${f0[1] + 7}M${f0[0] + 9} ${f0[1] - 7}L${f0[0] - 9} ${f0[1] + 7}`, warn: true });
  const via = I(W / 2, (D + WEST) / 2, 30);
  prims.push({ k: 'path', ph: 1, d: `M${f0[0]} ${f0[1] + 10}Q${via[0]} ${via[1]} ${f1[0]} ${f1[1] - 8}`, heavy: true, warn: true, arrow: true });

  // gold suyari mist in two corners, as in the old roofless pictures: floating banks of stepped tiers, each
  // tier with long elliptical ends (rx ≈ 1.9 × h/2, the same cloud as the film's closing gold)
  const tier = (x0: number, x1: number, y: number, h: number) => {
    const rx = h * 0.95;
    return `M${x0 + rx} ${y}H${x1 - rx}A${rx} ${h / 2} 0 0 1 ${x1 - rx} ${y + h}H${x0 + rx}A${rx} ${h / 2} 0 0 1 ${x0 + rx} ${y}Z`;
  };
  prims.push({ k: 'path', ph: 4, d: tier(14, 262, 10, 14) + tier(40, 204, 23, 14) + tier(4, 128, 36, 13), fill: 8 });
  prims.push({ k: 'path', ph: 4, d: tier(452, 712, 372, 14) + tier(520, 716, 385, 14) + tier(598, 706, 398, 13), fill: 8 });

  // phase 2 — where the exit crosses the bridge rail; phase 3 — anchors on the gate
  prims.push({ k: 'x', ph: 2, c: I(W / 2 + 17, D + 2, 10), label: true });
  prims.push({ k: 'anchor', ph: 3, c: I(gx, gy0) });
  prims.push({ k: 'anchor', ph: 3, c: I(gx + gw, gy1) });

  const ge = I(gx + gw / 2, gy0, gh + 20);
  labels.push({ at: P(ge[0] + 14, ge[1] - 2), t: t3('門', 'Gate', '门'), s: 'head' });
  const r = I(W, EAST + 33, H);
  labels.push({ at: P(r[0] + 34, r[1] - 8), t: t3('部屋（セル）', 'Rooms (cells)', '房间（单元）'), s: 'small' });
  const c = I(W, WEST + 100);
  labels.push({ at: P(c[0] + 16, c[1] + 14), t: t3('廊下（キュー）', 'Corridor (queue)', '走廊（队列）'), s: 'small', halo: true });
  const br = I(142, (D + WEST) / 2);
  labels.push({ at: P(br[0] + 12, br[1] + 4), t: t3('渡り廊下', 'Covered bridge', '廊桥'), s: 'small', halo: true });
  labels.push({ at: P(via[0] - 34, via[1] - 16), t: t3('非常口', 'Emergency exit', '安全出口'), a: 'end', s: 'warn', halo: true });
  const east = I(W, EAST, H);
  const west = I(0, WEST + D, H);
  labels.push({ at: P(east[0] + 12, east[1] - 12), t: t3('東', 'East', '东'), s: 'head' });
  labels.push({ at: P(west[0] - 12, west[1] + 4), t: t3('西', 'West', '西'), a: 'end', s: 'head' });

  return {
    id: 'walk', w: 720, h: 420, prims, labels,
    title: t3('吹抜屋台で見るマルチリージョン構成', 'The multi-region design, roof off', '吹拔屋台式的异地多活架构'),
    desc: t3(
      '屋根のない二棟の家が東西のリージョン。奥に三つの部屋（セル）、手前に廊下（キュー）があり、二棟は渡り廊下（非同期レプリケーション）でつながる。前の門（グローバルルーター）から各廊下へ道が通り、東の中央の部屋が落ちると、非常口の矢印が西の対の部屋へ流れを回す。',
      'Two roofless houses are the east and west regions: three rooms (cells) at the back, a corridor (queue) in front, joined by a covered bridge (asynchronous replication). Roads run from the gate (global router) into each corridor; when the middle room in the east fails, the emergency-exit arrow sends its traffic to the paired room in the west.',
      '两座无顶的房子是东西两个区域：后面三间房（单元），前面一条走廊（队列），两座之间以廊桥（异步复制）相连。门（全局路由）有路通往各条走廊；东区中间那间房故障时，安全出口的箭头把流量转到西区对应的房间。',
    ),
  };
}
