/** 第三扇 mapgl — tiles streamed under a moving camera, a fixed frame budget (DESIGN §6.4, B.5). Owner: WP-07. */
import { P, poly, t3, type Diagram, type Label, type Prim } from './kit';

export function mapgl(): Diagram {
  const prims: Prim[] = [];
  const labels: Label[] = [];
  const gx = 40, gy = 56, cell = 46, nx = 9, ny = 5;

  // phase 0 — the tile grid, ruled
  for (let i = 0; i <= nx; i++) prims.push({ k: 'line', ph: 0, a: P(gx + i * cell, gy), b: P(gx + i * cell, gy + ny * cell) });
  for (let j = 0; j <= ny; j++) prims.push({ k: 'line', ph: 0, a: P(gx, gy + j * cell), b: P(gx + nx * cell, gy + j * cell) });
  // the camera's centre, circled
  const cam = P(gx + 3.6 * cell, gy + 2.5 * cell);
  prims.push({ k: 'circle', ph: 0, c: cam, r: 1.9 * cell });

  // phase 4 — tiles loaded under the current view
  for (let i = 1; i <= 5; i++) for (let j = 1; j <= 4; j++) prims.push({ k: 'rect', ph: 4, x: gx + i * cell, y: gy + j * cell - cell, w: cell, h: cell, fill: 4 });
  // phase 1 — the view now (solid), the view next (dashed), tiles streaming in ahead
  const v0 = { x: gx + 1.2 * cell, y: gy + 0.35 * cell, w: 4.8 * cell, h: 3.4 * cell };
  prims.push({ k: 'rect', ph: 1, x: v0.x, y: v0.y, w: v0.w, h: v0.h, heavy: true });
  prims.push({ k: 'rect', ph: 1, x: v0.x + 1.9 * cell, y: v0.y + 0.6 * cell, w: v0.w, h: v0.h, dash: true });
  prims.push({ k: 'line', ph: 1, a: P(cam[0], cam[1]), b: P(cam[0] + 1.85 * cell, cam[1] + 0.58 * cell), arrow: true });
  for (let j = 1; j <= 4; j++) prims.push({ k: 'rect', ph: 1, x: gx + 6 * cell + 3, y: gy + j * cell - cell + 3, w: cell - 6, h: cell - 6, dash: true });
  // vehicles: instanced glyphs (small arrows) inside the view
  const vs = [[1.6, 0.8, 20], [2.2, 1.5, 80], [2.9, 0.9, 150], [3.4, 2.1, 220], [4.1, 1.2, 300], [4.8, 2.6, 30], [1.9, 2.8, 110], [2.6, 3.3, 200], [3.9, 3.0, 260], [5.3, 1.7, 340], [5.6, 0.9, 60], [3.1, 2.6, 170], [4.5, 3.4, 10], [1.5, 1.9, 280]] as const;
  for (const [x, y, deg] of vs) {
    const cx = gx + x * cell, cy = gy + y * cell, a = (deg * Math.PI) / 180;
    const pt = (r: number, d: number) => P(cx + r * Math.cos(a + d), cy + r * Math.sin(a + d));
    prims.push({ k: 'path', ph: 1, d: poly([pt(6, 0), pt(4.5, 2.5), pt(4.5, -2.5)], true) });
  }

  // the frame budget: three frames of 16.7 ms; work that does not fit waits for the next frame
  const fy = 322, fw = 150, fh = 22, f0 = 40;
  for (let k = 0; k < 3; k++) {
    const x = f0 + k * (fw + 16);
    prims.push({ k: 'rect', ph: 1, x, y: fy, w: fw, h: fh });
    prims.push({ k: 'rect', ph: 4, x, y: fy, w: fw * (9 / 16.7), h: fh, fill: 4 });
    prims.push({ k: 'line', ph: 1, a: P(x + fw * (9 / 16.7), fy), b: P(x + fw * (9 / 16.7), fy + fh) });
  }
  prims.push({ k: 'path', ph: 1, d: `M${f0 + fw - 8} ${fy - 4}C${f0 + fw + 10} ${fy - 30} ${f0 + fw + 40} ${fy - 30} ${f0 + fw + 16 + fw * 0.6} ${fy - 3}`, arrow: true });

  // phase 2 — where the camera path leaves the circle
  prims.push({ k: 'x', ph: 2, c: P(cam[0] + 1.81 * cell, cam[1] + 0.565 * cell), label: true });
  prims.push({ k: 'anchor', ph: 3, c: P(v0.x, v0.y) });
  prims.push({ k: 'anchor', ph: 3, c: P(v0.x + v0.w, v0.y + v0.h), handle: P(v0.x + v0.w + 24, v0.y + v0.h - 14) });

  labels.push({ at: P(24, 36), t: t3('動くカメラの下にタイルを流し込む', 'Tiles streamed in under a moving camera', '镜头移动，瓦片随之流入'), s: 'head' });
  const lx = gx + nx * cell + 18;
  prims.push({ k: 'line', ph: 1, a: P(lx, gy + 0.6 * cell - 4), b: P(lx + 22, gy + 0.6 * cell - 4), heavy: true });
  prims.push({ k: 'line', ph: 1, a: P(lx, gy + 1.6 * cell - 4), b: P(lx + 22, gy + 1.6 * cell - 4), dash: true });
  prims.push({ k: 'rect', ph: 1, x: lx + 4, y: gy + 2.6 * cell - 12, w: 14, h: 14, dash: true });
  prims.push({ k: 'path', ph: 1, d: poly([P(lx + 17, gy + 3.6 * cell - 4), P(lx + 8, gy + 3.6 * cell - 9), P(lx + 8, gy + 3.6 * cell + 1)], true) });
  labels.push({ at: P(lx + 32, gy + 0.6 * cell), t: t3('今のビュー', 'view now', '当前视野'), s: 'small' });
  labels.push({ at: P(lx + 32, gy + 1.6 * cell), t: t3('次のビュー', 'view next', '下一视野'), s: 'small' });
  labels.push({ at: P(lx + 32, gy + 2.6 * cell), t: t3('先読み中のタイル', 'tiles streaming', '预取中的瓦片'), s: 'small' });
  labels.push({ at: P(lx + 32, gy + 3.6 * cell), t: t3('車両＝インスタンス描画', 'vehicles: instanced glyphs', '车辆：实例化图元'), s: 'small' });
  labels.push({ at: P(f0, fy + fh + 18), t: '16.7 ms', s: 'num' });
  labels.push({ at: P(f0 + fw * 0.27, fy + 15), t: '9 ms', a: 'middle', s: 'small' });
  labels.push({ at: P(f0 + 2 * (fw + 16) + fw + 18, fy + 15), t: t3('収まらない処理は次のフレームへ', 'work that does not fit waits a frame', '超出预算的工作顺延一帧'), s: 'small' });
  labels.push({ at: P(520, 372), t: 'p95 38 → 9 ms', s: 'num' });
  labels.push({ at: P(520, 390), t: t3('車両4万台', 'at 40k vehicles', '4万辆车'), s: 'small' });

  return {
    id: 'mapgl', w: 720, h: 400, prims, labels,
    title: t3('WebGLの車両地図レンダラー', 'WebGL fleet-map renderer', 'WebGL车辆地图渲染器'),
    desc: t3(
      'タイルの格子の上で、今のビューの下のタイルは読み込み済み、カメラの進む先のタイルは先読み中。車両はインスタンス描画のグリフ。下段は16.7ミリ秒のフレーム予算で、描画は9ミリ秒に収まり、収まらない処理は次のフレームへ回る。',
      'On the tile grid, tiles under the current view are loaded and tiles ahead of the moving camera are streaming in; vehicles are instanced glyphs. Below, three 16.7 ms frame budgets: rendering fits in 9 ms, and work that does not fit moves to the next frame.',
      '瓦片网格上，当前视野下的瓦片已加载，镜头前进方向的瓦片正在预取；车辆是实例化图元。下方是三帧16.7毫秒的预算：渲染控制在9毫秒内，放不下的工作顺延到下一帧。',
    ),
  };
}
