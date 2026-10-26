/** 第四扇 strangler — capabilities move one plank at a time (DESIGN §6.4, B.5). Owner: WP-07. Node-safe. */
import { P, poly, t3, type Diagram, type Label, type Prim } from './kit';

export function strangler(): Diagram {
  const prims: Prim[] = [];
  const labels: Label[] = [];
  const env = { x: 92, y: 66, w: 26, h: 196 };
  const mono = { x: 176, y: 84, w: 164, h: 96 };
  const svc = [{ x: 430, y: 72 }, { x: 520, y: 72 }, { x: 610, y: 72 }];
  const sw = 72, sh = 44;
  const kafka = { x: 424, y: 196, w: 264, h: 30 };

  // phase 0 — the request line and the compass circle around the router
  prims.push({ k: 'line', ph: 0, a: P(20, 164), b: P(700, 164) });
  prims.push({ k: 'circle', ph: 0, c: P(env.x + env.w / 2, 164), r: 74 });
  prims.push({ k: 'line', ph: 0, a: P(380, 40), b: P(380, 300) });

  // phase 1 — router, monolith and shared database, services on Kafka
  prims.push({ k: 'line', ph: 1, a: P(22, 164), b: P(env.x - 4, 164), arrow: true, heavy: true });
  prims.push({ k: 'rect', ph: 1, x: env.x, y: env.y, w: env.w, h: env.h, heavy: true, paper: true });
  prims.push({ k: 'rect', ph: 4, x: env.x, y: env.y, w: env.w, h: env.h, fill: 5 });
  prims.push({ k: 'rect', ph: 1, x: mono.x, y: mono.y, w: mono.w, h: mono.h, paper: true });
  prims.push({ k: 'cyl', ph: 1, x: 218, y: 214, w: 80, h: 58 });
  prims.push({ k: 'line', ph: 1, a: P(258, mono.y + mono.h + 2), b: P(258, 212), arrow: true });
  prims.push({ k: 'line', ph: 1, a: P(env.x + env.w + 2, 132), b: P(mono.x - 3, 132), arrow: true });
  svc.forEach((s, i) => {
    prims.push({ k: 'rect', ph: 1, x: s.x, y: s.y, w: sw, h: sh, dash: i === 2, paper: true });
    if (i < 2) prims.push({ k: 'rect', ph: 4, x: s.x, y: s.y, w: sw, h: sh, fill: 5 });
    prims.push({ k: 'line', ph: 1, a: P(s.x + sw / 2, s.y + sh + 2), b: P(s.x + sw / 2, kafka.y - 3), arrow: i < 2, dash: i === 2 });
  });
  prims.push({ k: 'rect', ph: 1, x: kafka.x, y: kafka.y, w: kafka.w, h: kafka.h, heavy: true, paper: true });
  for (let i = 1; i < 11; i++) prims.push({ k: 'line', ph: 1, a: P(kafka.x + i * (kafka.w / 11), kafka.y + 6), b: P(kafka.x + i * (kafka.w / 11), kafka.y + kafka.h - 6) });
  // routes: moved capabilities go to the new services
  prims.push({ k: 'path', ph: 1, d: `M${env.x + env.w + 2} 100C${200} 40 ${380} 38 ${svc[0]!.x - 3} ${svc[0]!.y + 12}`, arrow: true });
  prims.push({ k: 'path', ph: 1, d: `M${env.x + env.w + 2} 92C${230} 18 ${470} 22 ${svc[1]!.x + 10} ${svc[1]!.y - 3}`, arrow: true });
  // shadow reads compare the next capability against the monolith before the switch
  prims.push({ k: 'path', ph: 1, d: `M${env.x + env.w + 2} 196C${300} 300 ${560} 300 ${svc[2]!.x + sw / 2} ${svc[2]!.y + sh + 4}`, dash: true, arrow: true });
  // dual writes while switching
  prims.push({ k: 'path', ph: 1, d: `M${svc[1]!.x} ${svc[1]!.y + sh - 6}C${400} 160 ${330} 250 ${300} 248`, dash: true, warn: true, arrow: true });

  // the eight planks of Yatsuhashi: the migration, crossed one plank at a time over 14 months
  const py = 336;
  for (let i = 0; i < 8; i++) {
    const x0 = 660 - i * 76, up = i % 2 === 0;
    const pts = up ? [P(x0, py + 8), P(x0 - 70, py - 8), P(x0 - 70, py), P(x0, py + 16)] : [P(x0, py - 8), P(x0 - 70, py + 8), P(x0 - 70, py + 16), P(x0, py)];
    prims.push({ k: 'path', ph: 1, d: poly(pts, true) });
    prims.push({ k: 'path', ph: 4, d: poly(pts, true), fill: 5 });
  }

  prims.push({ k: 'x', ph: 2, c: P(380, 164), label: true });
  prims.push({ k: 'anchor', ph: 3, c: P(env.x, env.y) });
  prims.push({ k: 'anchor', ph: 3, c: P(env.x + env.w, env.y + env.h), handle: P(env.x + env.w + 26, env.y + env.h + 10) });

  labels.push({ at: P(24, 30), t: t3('一機能ずつ、イベント駆動へ移す', 'One capability at a time, onto events', '逐个功能，迁往事件驱动'), s: 'head' });
  labels.push({ at: P(env.x + env.w / 2, env.y - 10), t: 'Envoy', a: 'middle', s: 'small' });
  labels.push({ at: P(mono.x + mono.w / 2, mono.y + mono.h / 2 + 5), t: t3('モノリス', 'Monolith', '单体'), a: 'middle', s: 'lbl' });
  labels.push({ at: P(212, 292), t: t3('共有DB', 'Shared DB', '共享数据库'), a: 'end', s: 'small' });
  svc.forEach((s) => labels.push({ at: P(s.x + sw / 2, s.y + sh / 2 + 5), t: 'Go', a: 'middle', s: 'num' }));
  // right-aligned under the bus, clear of the shadow-read curve that rises through its middle
  labels.push({ at: P(kafka.x + kafka.w, kafka.y + kafka.h + 18), t: t3('Kafkaのイベント', 'Kafka events', 'Kafka事件'), a: 'end', s: 'small' });
  labels.push({ at: P(560, 290), t: t3('シャドーリードで突き合わせ', 'shadow reads, compared', '影子读，逐一比对'), a: 'middle', s: 'small' });
  labels.push({ at: P(304, 292), t: t3('切替は二重書き込み', 'switch by dual writes', '双写切换'), a: 'start', s: 'warn' });
  labels.push({ at: P(24, 384), t: t3('14か月・無停止', '14 months · zero downtime', '14个月 · 零停机'), s: 'small' });
  labels.push({ at: P(470, 384), t: '2.1k → 25k events/s', s: 'num' });

  return {
    id: 'strangler', w: 720, h: 400, prims, labels,
    title: t3('配車基盤のストラングラーフィグ移行', 'Strangler-fig migration of dispatch', '调度平台的绞杀者迁移'),
    desc: t3(
      'リクエストはEnvoyのルーティング層を通り、移し終えた機能はKafkaのイベントで動くGoのサービスへ、残りは共有DBを持つモノリスへ向かう。次に移す機能はシャドーリードで旧系と突き合わせ、一致してから二重書き込みで切り替える。下段の八枚の板は、14か月で一枚ずつ渡った移行。',
      'Requests pass an Envoy routing layer: capabilities already moved go to Go services on Kafka events, the rest to the monolith and its shared database. The next capability is shadow-read against the monolith and switched with dual writes once results match. The eight planks below are the migration, crossed one at a time over 14 months.',
      '请求先经过Envoy路由层：已迁出的功能走基于Kafka事件的Go服务，其余仍走带共享数据库的单体。下一个要迁的功能先做影子读与旧系统比对，一致后以双写切换。下方八块木板，是14个月里一块一块走过的迁移。',
    ),
  };
}
