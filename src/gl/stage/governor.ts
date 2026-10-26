/**
 * Adaptive quality governor (DESIGN §8.6, threejs §i). Owner: WP-00.
 * Learns the refresh rate from the first 60 consecutive frames, then watches the share of missed frames:
 * lowers DPR in 0.25 steps first, then the tier; recovers DPR after 8 s of headroom; 2 s hysteresis between
 * decisions. Frames are on demand, so gaps > 250 ms (idle) are ignored rather than counted as slow.
 */
export interface GovernedStage {
  readonly dpr: number;
  readonly maxDprNow: number;
  readonly minDprNow: number;
  setDpr(d: number): void;
  degradeTier(): boolean;
}

export class Governor {
  private buf = new Float32Array(90);
  private i = 0;
  private filled = 0;
  private last = 0;
  private changed = 0;
  private budget = 1000 / 60;
  private calib: number[] = [];
  decision = 'learning refresh rate';

  constructor(private stage: GovernedStage) {}

  reset(): void {
    this.i = 0;
    this.filled = 0;
    this.last = 0;
  }

  tick(now: number): void {
    const dt = now - this.last;
    this.last = now;
    if (dt <= 0 || dt > 250) return;
    if (this.calib.length < 60) {
      this.calib.push(dt);
      if (this.calib.length === 60) {
        const m = this.calib.slice().sort((a, b) => a - b)[30]!;
        this.budget = Math.max(m, 1000 / 144);
        this.decision = `refresh ≈ ${Math.round(1000 / this.budget)} Hz`;
      }
      return;
    }
    this.buf[this.i] = dt;
    this.i = (this.i + 1) % this.buf.length;
    this.filled = Math.min(this.filled + 1, this.buf.length);
    if (now - this.changed < 2000 || this.filled < this.buf.length) return;
    let sum = 0, slow = 0;
    for (const x of this.buf) { sum += x; if (x > this.budget * 1.5) slow++; }
    const avg = sum / this.buf.length;
    const slowShare = slow / this.buf.length;
    const s = this.stage;
    if (slowShare > 0.2 || avg > this.budget * 1.25) {
      if (s.dpr > s.minDprNow + 1e-3) {
        const d = Math.max(s.minDprNow, s.dpr - 0.25);
        s.setDpr(d);
        this.decision = `DPR ↓ ${d.toFixed(2)} (${Math.round(slowShare * 100)} % slow)`;
      } else if (s.degradeTier()) {
        this.decision = `tier ↓ (${Math.round(slowShare * 100)} % slow at min DPR)`;
      }
      this.changed = now;
      this.filled = 0;
    } else if (slowShare < 0.02 && avg < this.budget * 1.05 && now - this.changed > 8000 && s.dpr < s.maxDprNow - 1e-3) {
      const d = Math.min(s.maxDprNow, s.dpr + 0.25);
      s.setDpr(d);
      this.decision = `DPR ↑ ${d.toFixed(2)}`;
      this.changed = now;
      this.filled = 0;
    }
  }
}
