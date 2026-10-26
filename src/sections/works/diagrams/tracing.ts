/** 第二扇 tracing — one request across 140 services (DESIGN §6.4, B.5). Owner: WP-07. Node-safe. */
import { P, poly, t3, type Diagram, type Label, type Prim, type Pt } from './kit';

export function tracing(): Diagram {
  const prims: Prim[] = [];
  const labels: Label[] = [];
  const c = P(196, 206);
  const R = 140;
  const at = (deg: number, r = R): Pt => [c[0] + r * Math.cos((deg * Math.PI) / 180), c[1] + r * Math.sin((deg * Math.PI) / 180)];

  // phase 0 — the ring of services drawn with the compass, its inner circle and two diameters
  prims.push({ k: 'circle', ph: 0, c, r: R });
  prims.push({ k: 'circle', ph: 0, c, r: 86 });
  prims.push({ k: 'line', ph: 0, a: at(180), b: at(0) });
  prims.push({ k: 'line', ph: 0, a: at(270), b: at(90) });

  // phase 1 — 28 nodes stand for 140 services; the shared library at the centre
  for (let i = 0; i < 28; i++) prims.push({ k: 'circle', ph: 1, c: at(i * (360 / 28) + 6), r: 3.4 });
  prims.push({ k: 'rect', ph: 1, x: c[0] - 62, y: c[1] - 24, w: 124, h: 48, heavy: true, paper: true });
  prims.push({ k: 'rect', ph: 4, x: c[0] - 62, y: c[1] - 24, w: 124, h: 48, fill: 3 });
  // spokes: every service gets tracing by upgrading one dependency
  [6, 57.4, 108.9, 160.3, 211.7, 263.1, 314.6].forEach((d) => prims.push({ k: 'line', ph: 1, a: at(d, 30 + 34), b: at(d, R - 7), dash: true }));
  // one request, end to end
  const hops = [at(199), at(237.6), at(289), at(340.4), at(31.7), at(83)];
  prims.push({ k: 'path', ph: 1, d: poly(hops), heavy: true, arrow: true });
  hops.forEach((h) => prims.push({ k: 'circle', ph: 1, c: h, r: 6.5 }));

  // collector with tail sampling → storage; alerts link to exemplar traces
  const col = { x: 420, y: 92, w: 140, h: 52 };
  prims.push({ k: 'line', ph: 1, a: P(c[0] + 64, c[1] - 8), b: P(col.x - 4, col.y + 30), arrow: true });
  prims.push({ k: 'rect', ph: 1, x: col.x, y: col.y, w: col.w, h: col.h, paper: true });
  prims.push({ k: 'cyl', ph: 1, x: 618, y: 82, w: 74, h: 72, fill: 3 });
  prims.push({ k: 'line', ph: 1, a: P(col.x + col.w + 2, col.y + 18), b: P(614, col.y + 18), arrow: true, heavy: true });
  prims.push({ k: 'line', ph: 1, a: P(col.x + col.w + 2, col.y + 38), b: P(614, col.y + 38), arrow: true, dash: true });
  const al = { x: 420, y: 262, w: 140, h: 44 };
  prims.push({ k: 'rect', ph: 1, x: al.x, y: al.y, w: al.w, h: al.h, paper: true });
  prims.push({ k: 'path', ph: 1, d: `M${al.x + al.w + 2} ${al.y + 22}C${640} ${al.y + 22} ${656} ${220} ${655} ${160}`, arrow: true });

  // phase 2 — where the request crosses the inner circle
  prims.push({ k: 'x', ph: 2, c: at(250, 86), label: true });
  // phase 3 — anchors on the request path
  prims.push({ k: 'anchor', ph: 3, c: hops[0]!, handle: at(185, R + 22) });
  prims.push({ k: 'anchor', ph: 3, c: hops[5]! });

  labels.push({ at: P(24, 36), t: t3('140サービスを、一つのリクエストで貫く', 'One request, followed across 140 services', '一个请求，贯穿140个服务'), s: 'head' });
  labels.push({ at: P(c[0], c[1] - 4), t: t3('共通ライブラリ', 'Shared libraries', '公共库'), a: 'middle', s: 'small' });
  labels.push({ at: P(c[0], c[1] + 13), t: '+ OpenTelemetry', a: 'middle', s: 'small' });
  labels.push({ at: P(at(300, R + 20)[0] + 6, at(300, R + 20)[1] - 6), t: t3('一つのリクエスト', 'one request', '一个请求'), s: 'small' });
  labels.push({ at: P(col.x + col.w / 2, col.y + 22), t: t3('コレクター', 'Collector', '采集器'), a: 'middle', s: 'small' });
  labels.push({ at: P(col.x + col.w / 2, col.y + 39), t: t3('テイルサンプリング', 'tail sampling', '尾部采样'), a: 'middle', s: 'small' });
  labels.push({ at: P(655, 72), t: t3('保存（予算内）', 'Storage, fixed budget', '存储（定额）'), a: 'middle', s: 'small' });
  labels.push({ at: P(588, col.y + 76), t: t3('遅い・失敗は全件', 'slow or failing: all', '慢、失败：全留'), a: 'middle', s: 'small' });
  labels.push({ at: P(588, col.y + 92), t: t3('その他は一部', 'the rest: a share', '其余：抽样'), a: 'middle', s: 'small' });
  labels.push({ at: P(al.x + al.w / 2, al.y + 27), t: t3('Prometheusアラート', 'Prometheus alert', 'Prometheus告警'), a: 'middle', s: 'small' });
  labels.push({ at: P(636, 230), t: t3('エグザンプラーで該当トレースへ', 'exemplar → the trace', '经exemplar跳到trace'), a: 'end', s: 'small', halo: true });   // left of the alert's curve
  labels.push({ at: P(420, 372), t: 'MTTD 38 → 6 min', s: 'num' });
  labels.push({ at: P(420, 390), t: t3('顧客より先に気づく', 'seen before customers see it', '先于用户发现'), s: 'small' });

  return {
    id: 'tracing', w: 720, h: 400, prims, labels,
    title: t3('140サービス横断のトレーシング', 'Tracing across 140 services', '140个服务的全链路追踪'),
    desc: t3(
      '140のサービスが共通ライブラリ経由でOpenTelemetryの計装を持ち、一つのリクエストが六つのサービスをまたいで追跡される。コレクターのテイルサンプリングは遅い・失敗したトレースを全件、その他を一部だけ予算内で保存し、Prometheusのアラートはエグザンプラーで該当トレースに直接つながる。',
      'All 140 services carry OpenTelemetry through shared libraries, so one request is followed across six of them. The collector tail-samples: every slow or failing trace and a share of the rest are stored within a fixed budget, and Prometheus alerts link straight to the exemplar trace.',
      '140个服务经公共库接入OpenTelemetry，一个请求跨六个服务被完整追踪。采集器做尾部采样：慢请求和失败请求全量保存，其余抽样，存储不超预算；Prometheus告警通过exemplar直接链接到对应trace。',
    ),
  };
}
