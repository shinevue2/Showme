/** 第五扇 platform — fourteen ways in, one paved path out (DESIGN §6.4, B.5). Owner: WP-07. Node-safe. */
import { P, arcPath, t3, type Diagram, type Label, type Prim } from './kit';

export function platform(): Diagram {
  const prims: Prim[] = [];
  const labels: Label[] = [];
  const gate = P(250, 212);
  const pathY = gate[1];

  // phase 0 — the compass arc the fourteen paths converge through, and the path's centre line
  prims.push({ k: 'path', ph: 0, d: arcPath(gate, 176, Math.PI * 0.62, Math.PI * 1.38) });
  prims.push({ k: 'circle', ph: 0, c: gate, r: 12 });
  prims.push({ k: 'line', ph: 0, a: P(24, pathY), b: P(700, pathY) });

  // phase 1 — fourteen team pipelines, each its own way
  for (let i = 0; i < 14; i++) {
    const y0 = 62 + i * 22;
    const k = ((i * 7) % 5) - 2;                       // each team's own wiggle
    const x1 = 70 + (i % 3) * 12, x2 = 120 + (i % 4) * 10;
    const yMid = y0 + (pathY - y0) * 0.45;
    const d = `M28 ${y0}C${x1} ${y0 + k * 7} ${x2} ${y0 - k * 9} ${150 + (i % 2) * 8} ${yMid.toFixed(1)}S${gate[0] - 30} ${pathY} ${gate[0] - 12} ${pathY}`;
    prims.push({ k: 'path', ph: 1, d });
  }
  // the paved path: a double rule running between the stations
  const st = [{ x: 296, w: 96 }, { x: 420, w: 92 }, { x: 540, w: 112 }];
  const stops = [gate[0] + 12, ...st.flatMap((q) => [q.x, q.x + q.w]), 700];
  for (let i = 0; i < stops.length; i += 2) {
    const a = stops[i]!, b = stops[i + 1]!;
    const last = i + 2 >= stops.length;
    prims.push({ k: 'line', ph: 1, a: P(a, pathY - 5), b: P(b - (last ? 0 : 2), pathY - 5), heavy: true });
    prims.push({ k: 'line', ph: 1, a: P(a, pathY + 5), b: P(b - (last ? 0 : 2), pathY + 5), heavy: true, arrow: last });
  }
  st.forEach((q) => {
    prims.push({ k: 'rect', ph: 1, x: q.x, y: pathY - 20, w: q.w, h: 40, paper: true });
    prims.push({ k: 'rect', ph: 4, x: q.x, y: pathY - 20, w: q.w, h: 40, fill: 6 });
  });
  // Terraform modules feed the cloud pieces; audit evidence falls out of CI
  prims.push({ k: 'rect', ph: 1, x: 420, y: 282, w: 92, h: 40, paper: true });
  prims.push({ k: 'line', ph: 1, a: P(466, 280), b: P(466, pathY + 24), arrow: true });
  prims.push({ k: 'line', ph: 1, a: P(466, pathY - 22), b: P(466, 146), arrow: true, dash: true });
  prims.push({ k: 'path', ph: 1, d: 'M444 104h34l10 10v30h-44z' });
  prims.push({ k: 'path', ph: 1, d: 'M478 104v10h10' });
  // scorecards: 120 services on the path
  const sx = 552, sy = 56, cs = 11.5;
  let grid = '';
  let fill = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 15; c++) {
    const x = sx + c * (cs - 2.5), y = sy + r * (cs - 2.5);
    grid += `M${x.toFixed(1)} ${y.toFixed(1)}h7v7h-7z`;
    fill += `M${x.toFixed(1)} ${y.toFixed(1)}h7v7h-7z`;
  }
  prims.push({ k: 'path', ph: 4, d: fill, fill: 6 });
  prims.push({ k: 'path', ph: 1, d: grid });

  prims.push({ k: 'x', ph: 2, c: P(gate[0] - 176, pathY), label: true });   // the arc meets the centre line
  prims.push({ k: 'anchor', ph: 3, c: P(gate[0] + 12, pathY - 5) });
  prims.push({ k: 'anchor', ph: 3, c: P(gate[0] + 12, pathY + 5), handle: P(gate[0] + 30, pathY + 28) });

  labels.push({ at: P(24, 34), t: t3('14通りの道を、一本の舗装路に', 'Fourteen ways to deploy, one paved path', '十四条路，并成一条铺好的路'), s: 'head' });
  labels.push({ at: P(28, 384), t: t3('14チーム、それぞれのパイプライン', '14 teams, 14 pipelines', '14个团队，14条流水线'), s: 'small' });
  labels.push({ at: P(344, pathY + 5), t: t3('テンプレート', 'Template', '模板'), a: 'middle', s: 'small' });
  labels.push({ at: P(466, pathY + 5), t: t3('共通CI', 'Paved CI', '标准CI'), a: 'middle', s: 'small' });
  labels.push({ at: P(596, pathY + 5), t: 'Kubernetes', a: 'middle', s: 'small' });
  labels.push({ at: P(466, 300), t: 'Terraform', a: 'middle', s: 'small' });
  labels.push({ at: P(466, 315), t: t3('モジュール', 'modules', '模块'), a: 'middle', s: 'small' });
  labels.push({ at: P(436, 128), t: t3('監査の証跡（副産物）', 'audit evidence, as a side effect', '审计证据（副产物）'), a: 'end', s: 'small' });
  labels.push({ at: P(sx, sy + 8 * (cs - 2.5) + 16), t: t3('スコアカード　120サービス', 'Scorecards · 120 services', '评分卡 · 120个服务'), s: 'small' });
  labels.push({ at: P(540, 372), t: '45 → 7 min', s: 'num' });
  labels.push({ at: P(540, 390), t: t3('デプロイのリードタイム（中央値）', 'deploy lead time, median', '部署前置时间（中位数）'), s: 'small' });

  return {
    id: 'platform', w: 720, h: 400, prims, labels,
    title: t3('開発者プラットフォームのゴールデンパス', 'Developer platform golden paths', '开发者平台的黄金路径'),
    desc: t3(
      '14チームそれぞれのデプロイ手段が一点に集まり、テンプレート、共通CI、Kubernetesへと続く一本の舗装路になる。クラウド資源はTerraformモジュールから入り、監査の証跡はCIの副産物として残る。スコアカードは120サービスの現在地を示す。',
      'Fourteen teams’ own deploy pipelines converge into one paved path: template, paved CI, Kubernetes. Cloud pieces come in through Terraform modules, audit evidence falls out of CI as a side effect, and scorecards show where each of the 120 services stands.',
      '14个团队各自的部署流水线汇到一处，变成一条铺好的路：模板、标准CI、Kubernetes。云资源经Terraform模块接入，审计证据作为CI的副产物留存，评分卡显示120个服务各自的位置。',
    ),
  };
}
