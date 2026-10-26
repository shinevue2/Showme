/**
 * WebCodecs tier (DESIGN §7.6, video §5.1): demux the same MP4 with mediabunny (dynamic import, its own
 * chunk) and decode on demand into one canvas at the file's size. For iOS Low Power Mode, where a muted
 * play() is rejected and seeks may not render. Memory rule: never keep decoded frames — draw, then close().
 * Same FrameSource contract as the <video>, so ScrollFilm's single-flight coalescing applies unchanged.
 * Owner: WP-06.
 */
import type { FrameSource } from './scroll-film';

export async function createWebCodecsSource(canvas: HTMLCanvasElement, blob: Blob, size: { w: number; h: number }): Promise<FrameSource> {
  const { Input, BlobSource, MP4, VideoSampleSink } = await import('mediabunny');
  const input = new Input({ source: new BlobSource(blob), formats: [MP4] });
  const track = await input.getPrimaryVideoTrack();
  if (!track) { input.dispose(); throw new Error('film: no video track'); }
  if (!(await track.canDecode())) { input.dispose(); throw new Error('film: track not decodable'); }
  const sink = new VideoSampleSink(track);
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx2d = canvas.getContext('2d', { alpha: false });
  if (!ctx2d) { input.dispose(); throw new Error('film: no 2d context'); }

  let busy = false;
  let dead = false;
  const src: FrameSource = {
    onDone: null,
    get busy() { return busy; },
    canFastSeek: false,
    seek(t: number) {
      if (busy || dead) return;
      busy = true;
      sink.getSample(t)
        .then((s) => {
          if (s) {
            if (!dead) s.draw(ctx2d, 0, 0, canvas.width, canvas.height);
            s.close();
          }
        })
        .catch((e) => { console.warn('[film] webcodecs sample failed', e); })
        .finally(() => { busy = false; if (!dead) src.onDone?.(); });
    },
    destroy() {
      dead = true;
      src.onDone = null;
      input.dispose();
    },
  };
  return src;
}
