# Scroll-scrubbed video ("the scroll film"): implementation spec

Status: definitive spec for the portfolio's ~7-viewport scroll-scrubbed video. Researched 2026-10-25.
Library versions are taken from the npm registry on that date. Browser support comes from
`@mdn/browser-compat-data` 8.1.7 (published 2026-10-22). Numbers marked **[measured]** come from
the local benchmark in §8 (Chromium 156 headless, software decode, 4-core Linux box). Numbers
marked **[est.]** are estimates and say what they are based on.

---

## 0. Decisions at a glance

| Topic | Decision |
|---|---|
| Delivery | One `<video>` element, **paused the whole time**, kept in a `position: sticky` 100lvh stage inside an 800lvh section (7 chapters × 100lvh of scroll). `currentTime` follows scroll. No `play()` except for the one-off iOS unlock. |
| Codec | **H.264 High, 8-bit 4:2:0 MP4** for every tier. It has hardware decode on every target device, the shortest seek path, and Safari/iOS play it. VP9/AV1 are not shipped (see §2.1 for why). |
| GOP | **`-g 8 -bf 0`** (a keyframe every 8 frames, no B-frames), plus forced IDR frames at the 7 chapter rest times. Measured: 2.4× smaller than all-intra at equal or better VMAF, and 5× more scrub fps than a default encode on texture content. `-g 4` is the knob if devices lag. |
| Variants | `film-hd` 1280×720 @30 fps CRF 23 (desktop/landscape), `film-sd` 960×540 @30 fps CRF 24 (low-end landscape), `film-portrait` 720×1280 @24 fps CRF 25 (phones in portrait, art-directed). 7 chapter stills (AVIF + WebP) for every tier. |
| Byte budget | Under 5 MB for HD and under 3 MB for portrait. Hit it by designing the content (§2.6) before reaching for CRF. |
| Loading | `fetch()` the whole file once, as a Blob, when the section comes within 3 viewports (or at idle on fast connections), then play it from `URL.createObjectURL(blob)`. Memory cost equals the file size. The chapter-1 still is the poster until the first real frame is presented. No MSE. |
| Scrub loop | A `ScrollTrigger` (no pin, no scrub tween) feeds progress into a tiny controller. The controller runs rAF only while target ≠ shown. It **never issues a seek while `video.seeking`** and keeps only the latest pending target (§4.3). Frame-quantised targets. `fastSeek` only for jumps > 1 s, followed by an exact seek once scrolling settles. |
| Captions/images | Driven by **CSS scroll-driven animations** (`view-timeline` on the section), so they run off the main thread. Shipped in Chrome 115, Safari 26 and Firefox 159. GSAP fallback for older browsers. Animate only `transform` and `opacity`. No `backdrop-filter` or `mix-blend-mode` over the video. |
| Fallback tiers | reduced-motion → static chapter stills in normal flow. Save-Data or 2G → sticky stage with 7 crossfading stills (~0.5 MB). iOS Low Power Mode (muted `play()` rejected) → WebCodecs canvas scrubber if `VideoDecoder` exists, else stills. Slow seeks at runtime → switch down to `film-sd`. |
| Never | Image sequences (480 frames at 720p is 1.77 GB decoded), drawing the video into WebGL every frame, GSAP-tweening `currentTime`, `will-change` everywhere, `100dvh` in scroll geometry. |
| Libraries | `lenis@1.3.27` (2.0 exists only as `-dev` prereleases, so don't use it yet), `gsap@3.15.0` (ScrollTrigger and every plugin are free since 3.13), `three@0.186.1`. Optional `mediabunny@1.62.1`, dynamically imported for the WebCodecs tier (≈55 KB gzip tree-shaken **[measured]**). |

---

## 1. Context and budget

- The film runs under 7 consecutive "sections", each a chapter of the portfolio's story with its own caption and image. Total scroll distance is 7 × 100lvh. The section is 800lvh tall because the sticky stage itself takes up 100lvh.
- Clip length is **14–18 s of media at 30 fps (420–540 frames)**. On a 1080-px-tall desktop viewport, 7 × 1080 px ÷ 480 frames ≈ **16 px of scroll per frame**. On an 800-px phone viewport at 24 fps (384 frames) it is ≈ 15 px per frame. That is fine-grained enough that a trackpad scroll never shows a frame hold. More frames would add bytes and decode work and nobody would see the difference.
- The rest of the site also runs several three.js scenes. The film must cost **≈0 CPU and GPU when nobody is scrolling**, and the other WebGL scenes must stop rendering while the film's stage covers the viewport (§6.4).

---

## 2. Encoding

### 2.1 Codec choice

Scrubbing is a stream of random-access decodes. What matters most is the **cost of reaching an arbitrary frame**, which is the decode cost of the frames from the previous keyframe up to the target. File size comes second.

| Codec | HW decode coverage (2026) | Safari / iOS | Seek / decode cost | Verdict |
|---|---|---|---|---|
| **H.264 High 8-bit** | Effectively 100% of phones, tablets and PCs | Yes (all versions) | Lowest. Many SW decoders are also extremely fast. | **Ship it.** |
| VP9 (WebM) | Most Android SoCs, Intel Gen9+, recent AMD/NVIDIA. Apple: SW only on older devices. | WebM VP9 works on recent Safari, but decode is not guaranteed in HW on iOS | Similar to H.264 at `-g 8` in SW (38 vs 36.5 ms median). Intra-only libvpx is inefficient: all-intra was **19.9 MB at VMAF 87 vs H.264's 10.1 MB at VMAF 94**. At `-g 8` it was 21% smaller but lost 10 VMAF points, with dark scenes collapsing (p5 VMAF 20.8 at CRF 34) **[measured]**. | Not worth a second pipeline at 3–5 MB. |
| AV1 | Only recent hardware: Apple A17 Pro/M3 and later, Intel Xe/Arc, RTX 30+, RDNA2+, 2023+ Android flagships | Only on AV1-HW Apple devices | Highest SW cost. Short-GOP AV1 (libaom `cpu-used 6`, `-g 8`, CRF 34) came out at **11.5 MB / VMAF 92.6 vs H.264's 4.15 MB / 95.4**, and seeks were 60% slower (58.8 ms) **[measured]**. Tuning would narrow the size gap but not the decode cost. | No. |
| HEVC | Apple everywhere, mixed elsewhere | Yes | – | Chromium support depends on OS decoders, and Playwright Chromium reports `canPlayType('hvc1') === ''` **[measured]**. No. |

The usual "AV1 saves 30–50%" claim comes mostly from inter-prediction tools over long GOPs. In the intra-heavy short-GOP regime that scrubbing needs, most of that saving disappears while decode cost rises. On a 4 MB file, saving 1 MB is not worth losing hardware decode on a share of devices.

Use `MediaCapabilities.decodingInfo()` as a **sanity gate, not a codec picker**. If H.264 at the chosen resolution reports `smooth: false`, step down a tier. Note that browsers report optimistic `smooth`/`powerEfficient` values until they have recorded stats on that device (MDN).

### 2.2 GOP / keyframe interval

`video.currentTime = t` makes the browser decode from the keyframe at or before `t` up to `t`. With a default x264 encode (keyint 250, B-frames) a seek can mean decoding up to ~8 s of frames. That causes the classic "updates once a second" stutter (hontran.dev; muffinman.io). The options:

All rows are H.264 High, 1280×720, 30 fps, CRF 23, preset slow, 16 s **[measured]**. Seek and scrub figures come from software decode in headless Chromium (§8.1), so they are an upper bound.

| GOP | Film MB | Film VMAF | Film seek ms (median / p95) | Film scrub fps / mean lag (frames) | Texture MB | Texture VMAF | Texture seek ms (median / p95) | Texture scrub fps / lag |
|---|---|---|---|---|---|---|---|---|
| `-g 1` (all-intra) | 10.10 | 94.2 | 31.6 / 58.4 | 27.2 / 3.0 | 28.51 | 88.5 | 58.6 / 95.0 | 17.1 / 4.8 |
| `-g 4 -bf 0` | 5.73 | 95.1 | 36.7 / 54.3 | 24.7 / 3.3 | 24.35 | – | – | – |
| **`-g 8 -bf 0`** | **4.15** | **95.4** | **36.5 / 73.2** | **22.7 / 4.5** | 15.03 | 99.1 | 79.6 / 134.8 | 10.5 / 9.6 |
| `-g 15 -bf 0` | 3.42 | 95.5 | 44.0 / 74.7 | 17.2 / 6.6 | 10.71 | – | – | – |
| `-g 30 -bf 0` | 2.99 | 95.3 | 46.4 / 128.1 | 16.1 / 7.2 | 8.50 | – | – | – |
| x264 default (keyint 250, 3 B-frames) | 2.33 | 95.3 | **110.5 / 224.6** | **9.4 / 15.5** | 5.00 | 99.6 | **513.8 / 1040** | **2.5 / 66.4** |

The two test clips are "film" (the Sintel trailer, CG with grain) and "texture" (a full-frame zoom across a woodblock print, the worst case). The test setup is in §8.1.

Reading the table:

- **Default encodes are unusable for scrubbing:** 2.5–9 presented fps, lagging 0.5–2 s behind the scroll.
- **All-intra (`-g 1`)** gives the cheapest seek, but **2.4× (film) to 1.9× (texture) the bytes of `-g 8`**. At the same CRF it also has **lower** quality: VMAF 94.2 vs 95.4 on film and 88.5 vs 99.1 on texture. x264 intra-only spends bits less efficiently. At equal quality the byte penalty is even larger.
- **`-g 8 -bf 0`** is the knee. Worst case is 7 extra frame decodes per seek, which hardware decoders at 720p do in ≈5–15 ms. Bytes are 41% of all-intra.
- `-g 4` gives about 2 fps more scrub smoothness than `-g 8` under software decode, for 38% more bytes. Keep it as the knob if device testing shows a mean lag above 3 frames.
- Beyond `-g 15` the byte savings flatten out (−18%, −28%) while p95 seek latency climbs (128 ms at `-g 30`).
- **Content affects decode cost, not just bytes.** Texture P-frames carry large residuals, so its `-g 8` seeks are 2.2× slower than film's.
- **`-bf 0` is mandatory.** B-frames reorder decode and presentation, so a seek has to decode future frames too. No B-frames also keeps decode latency at one frame.
- Add **`-force_key_frames` at the 7 chapter rest times.** The rest frames are what people look at longest, because the video holds on them while the caption is read. Making them IDR frames makes them pristine and gives zero-cost seeks exactly where scrolling slows down.
- Keep scene-cut detection on. It only adds keyframes.

### 2.3 Resolution, frame rate, quality

- **Never encode above the largest on-screen size.** The stage is full-bleed with `object-fit: cover`. A 1280×720 source upscaled to a 1920-px window is acceptable for moving imagery, and the rest frames get extra bits from the forced IDR plus a quality zone (below). Do not ship 1080p **[measured]**:
  - it is 1.9–2.0× the bytes of 720p (film `-g 8`: 8.07 vs 4.15 MB)
  - its seeks are 2× slower (74 vs 36.5 ms median)
  - scrubbing drops to 13.8 fps
- **30 fps on desktop, 24 fps on phones.** Frame rate does not change the mapping, because chapters are keyed in seconds. 24 fps cuts portrait bytes and decode work by about 20%, and the Reuters graphics team's scroll-video component specifically warns that higher frame rates crash mobile devices.
- **CRF 23 (HD), 24 (SD), 25 (portrait)** with `-preset slow`. Preset only costs encode time, not decode time. If a file is over budget, raise CRF by 2 steps. That costs ≈40% bytes per 4 CRF **[measured: g8 crf23→27 = −40%]**. Consider it only after the content-side levers in §2.6.
- **x264 zones** can give the rest frames extra quality cheaply. Cover each rest frame ±3 frames with a fixed QP, e.g. at 30 fps `-x264-params "zones=0,3,q=18/63,69,q=18/135,141,q=18/..."` (rest 2.2 s = frame 66, 4.6 s = frame 138). This adds ~1–2% bytes for visibly cleaner hold frames.
- **8-bit `yuv420p`, BT.709 tagged** (`-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv`). Untagged video can be converted with BT.601 coefficients by some pipelines, and then the poster image (sRGB) and the first video frame visibly differ when they swap. 10-bit (High10) has no hardware decode on most devices and is not supported by Safari.
- **No audio track** (`-an`). It removes an autoplay-policy variable and some bytes.
- **`-movflags +faststart`** puts `moov` first. It matters for the progressive fallback, and it lets mediabunny and the browser parse the index before the whole download finishes.

### 2.4 Variants

| Variant | When | Size | fps | CRF | Measured analogue | Target |
|---|---|---|---|---|---|---|
| `film-hd.mp4` | landscape, `deviceMemory` > 4 (or unknown) and `hardwareConcurrency` > 4, not 3G | 1280×720 | 30 | 23 | film: 4.15 MB, VMAF 95.4. With the 7 forced rest keyframes: 4.21 MB (+1.3%) **[measured]** | ≤ 5 MB |
| `film-sd.mp4` | landscape low-end / 3G / runtime downgrade | 960×540 | 30 | 24 | film: 2.31 MB **[measured]** | ≤ 2.5 MB |
| `film-portrait.mp4` | `(max-aspect-ratio: 4/5)` | 720×1280 | 24 | 25 | film (center crop): 2.74 MB **[measured]**. 540×960 @30 CRF 24: 2.18 MB, VMAF 95.2, seeks 27 ms median | ≤ 3 MB |
| `ch-1..7.avif` / `.webp` | all tiers (poster, loading state, stills tiers) | 1280 wide (landscape) / 720 wide (portrait) | – | AVIF crf 30 | – | ≤ 80 KB each |

**Portrait must be art-directed, not cropped.** `object-fit: cover` of a 16:9 frame into a 9:19.5 phone shows only ~29% of the width. The film will most likely be rendered from a three.js/Blender scene, so render a second pass with a portrait camera (same timeline, same chapter times). If that is impossible, the fallback is a crop that follows the subject (`crop=ih*9/16:ih:x='<expr>'`).

### 2.5 Exact ffmpeg commands

Shared settings (the ffmpeg build available here: 7.0.2 static with libx264, libvpx, libaom, libwebp):

```bash
FF=ffmpeg                                  # scratch: .../fftest/node_modules/ffmpeg-static/ffmpeg
SRC=film-master.mov                        # ProRes/near-lossless master, 1920x1080 and 1080x1920 for portrait
REST="0,2.2,4.6,6.9,9.2,11.5,13.8"         # chapter rest times (s); keep in sync with chapters.ts
COLOR="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
X264="-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -tag:v avc1 -movflags +faststart -an"
```

Desktop HD (primary):

```bash
$FF -y -i "$SRC" -vf "fps=30,scale=1280:720:flags=lanczos" $COLOR $X264 -level:v 4.0 \
  -crf 23 -g 8 -keyint_min 8 -bf 0 -force_key_frames "$REST" \
  film-hd.mp4
```

Low-end landscape:

```bash
$FF -y -i "$SRC" -vf "fps=30,scale=960:540:flags=lanczos" $COLOR $X264 -level:v 3.1 \
  -crf 24 -g 8 -keyint_min 8 -bf 0 -force_key_frames "$REST" \
  film-sd.mp4
```

Portrait phones (from the portrait master; the fallback crop is commented out):

```bash
$FF -y -i film-master-portrait.mov -vf "fps=24,scale=720:1280:flags=lanczos" $COLOR $X264 -level:v 4.0 \
  -crf 25 -g 8 -keyint_min 8 -bf 0 -force_key_frames "$REST" \
  film-portrait.mp4
# fallback crop from the landscape master:
#   -vf "fps=24,crop=ih*9/16:ih:(iw-ow)/2:0,scale=720:1280:flags=lanczos"
```

Premium all-intra, only if the content compresses well enough to stay under budget (check the size):

```bash
$FF -y -i "$SRC" -vf "fps=30,scale=1280:720:flags=lanczos" $COLOR $X264 -level:v 4.0 \
  -crf 23 -g 1 film-hd-intra.mp4
```

Chapter stills, taken **from the encoded file** so the poster matches the first decoded frame exactly (same quantisation, same colour path). They are encoded to AVIF and WebP:

```bash
i=1; for t in ${REST//,/ }; do
  $FF -y -ss "$t" -i film-hd.mp4 -frames:v 1 -update 1 -c:v png "ch-$i.png"
  $FF -y -i "ch-$i.png" -c:v libaom-av1 -still-picture 1 -crf 30 -cpu-used 4 -pix_fmt yuv420p "ch-$i.avif"
  $FF -y -i "ch-$i.png" -c:v libwebp -quality 78 -compression_level 6 "ch-$i.webp"
  i=$((i+1)); done
```

Verify the GOP structure and keyframe positions (expect `K` every 8 frames plus the forced rest frames):

```bash
ffprobe -v error -select_streams v:0 -show_entries packet=pts_time,flags -of csv=p=0 film-hd.mp4 | grep K | head -20
```

Optional VP9 alternative (benchmarked but **not shipped**):

```bash
$FF -y -i "$SRC" -vf "fps=30,scale=1280:720" -c:v libvpx-vp9 -crf 34 -b:v 0 -g 8 -auto-alt-ref 0 \
  -row-mt 1 -tile-columns 2 -deadline good -cpu-used 2 -pix_fmt yuv420p -an film-hd.webm
```

### 2.6 Content design is the biggest lever

These are the same codec, same CRF, same GOP, same 720p **[measured]**:

| Content (1280×720, 30 fps, 16 s) | `-g 8` CRF 23 | VMAF | `-g 8` CRF 27 | VMAF | `-g 1` CRF 23 | VMAF |
|---|---|---|---|---|---|---|
| Film: Sintel trailer, CG with grain, cuts | 4.15 MB | 95.4 | 2.49 MB | 91.8 | 10.10 MB | 94.2 |
| Same film after denoising (`hqdn3d=4:3:6:4.5`) | 3.76 MB (−9%) | – | – | – | – | – |
| Texture: continuous zoom over a woodblock print on paper | 15.03 MB | 99.1 | 8.88 MB | 96.4 | 28.51 MB | 88.5 |

At equal CRF the content changes the file size by **3.6×**. At roughly equal VMAF (texture at CRF 27 vs film at CRF 23) it is still **2.1×**. It also changes seek cost by 2.2× (§2.2). No encoder flag has an effect that large. Rules for whoever renders the film:

1. **Keep high-frequency texture out of the moving video.** A washi-paper grain, a halftone or a print texture should be a **static overlay layer** above the `<video>`, such as an AVIF with alpha and normal blending. It is composited once and costs no bitrate. A texture baked into a constant camera zoom changes every pixel in every frame, and that is the expensive case above.
2. **No per-frame noise.** Denoise path-traced renders, and don't use film grain, flicker or particle snow in the video itself. Do grain in CSS or WebGL on top if wanted.
3. **Prefer clean shading, gradients, fog and depth, and slow lateral camera moves** over fast full-frame zooms. Motion vectors predict lateral moves cheaply.
4. **Make the rest frames calm compositions with negative space** for captions on the correct side (left for horizontal LTR text, top-right for vertical Japanese `writing-mode: vertical-rl` captions).
5. Ease camera motion in and out around rest times. The scroll→time map also eases (§4.2), so motion never snaps.
6. Only cut hard at chapter boundaries, and only where a forced keyframe already is.

---

## 3. Loading

### 3.1 Why fetch-as-Blob and not progressive or MSE

| Strategy | Pros | Cons |
|---|---|---|
| Progressive `src=` + `preload="auto"` | Simple. First frame early. | `preload` is only a hint. **Chrome forces `metadata` on cellular and `none` with Data Saver** (web.dev). **iOS Safari only honours `metadata`**, so a paused video's frames are never fetched (WebKit bugs 197608, 180765). A seek into unbuffered data triggers a range request plus a demuxer restart. That is a 100 ms–seconds stall in the middle of a scroll. Behaviour differs per browser. |
| **`fetch` → `Blob` → `createObjectURL`** | Deterministic. After `loadeddata` every frame is local, on all browsers. Goes through the HTTP cache, so repeat visits are instant. One request. | Nothing plays until the full download finishes. That is fine here because the stills cover the gap and the section sits several screens down. **Memory equals the file size.** Chrome keeps blobs in the browser process and pages them to disk under pressure (Chromium blob storage docs). |
| MSE / `ManagedMediaSource` | Progressive and controllable | Needs fragmented MP4 and a segment pipeline. `MediaSource` is iPad-only on iOS, and iPhone needs `ManagedMediaSource` (iOS 17.1+). Lots of code to save 3–5 MB. Rejected. |
| `<link rel="preload" as="video">` | – | Not supported for video in Chrome or Safari, and not compatible with range requests (web.dev). Rejected. |

### 3.2 When to fetch

```
page load ──► idle (requestIdleCallback / setTimeout fallback, since Safari has no rIC)
   │            └─ if effectiveType === '4g' && !saveData (or no NetworkInformation and a fine pointer)
   │               → prefetch the film blob at priority low
   └─► IntersectionObserver(section, rootMargin: '300% 0px') fires → fetch now (priority high) if not started
```

- Use `fetch(url, { priority: 'low' })` for the idle prefetch and `'high'` when it is triggered by approach. `priority` is supported in Chrome 101, Firefox 132 and Safari 17.2.
- Call `await res.blob()`. **Do not stream into an array of chunks** for a progress bar: `new Blob(chunks)` keeps a second copy in the renderer until GC. The stills are the progress state.
- Before fetching, the stills for chapters 1–2 load with `loading="lazy"` and `fetchpriority="low"`. They are the visible content until the video is ready.
- Server or CDN headers: `Content-Type: video/mp4`, `Accept-Ranges: bytes` (required by Safari for the progressive fallback), `Cache-Control: public, max-age=31536000, immutable` with hashed file names, **no gzip/brotli** on `.mp4`, and CORS (`Access-Control-Allow-Origin`) if the file is on another origin, because `fetch()` needs it.

```ts
// film/load.ts
import type { Plan } from './plan';

export function loadFilmBlob(plan: Plan, section: HTMLElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let started = false;
    const go = (priority: 'high' | 'low') => {
      if (started) return;
      started = true; io.disconnect();
      fetch(plan.src, { priority, credentials: 'omit' } as RequestInit)
        .then((r) => { if (!r.ok) throw new Error(`film ${r.status}`); return r.blob(); })
        .then((b) => resolve(URL.createObjectURL(b)), reject);
    };
    // 1) approach trigger: 3 viewports ahead (≈1.5 s of fast scrolling; 4 MB @ 20 Mbit/s ≈ 1.6 s)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && go('high'), { rootMargin: '300% 0px' });
    io.observe(section);
    // 2) idle prefetch on good connections. Safari/Firefox have no NetworkInformation API,
    //    so fall back to "fine pointer = probably desktop".
    const c = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    const fast = c ? c.effectiveType === '4g' && !c.saveData : matchMedia('(pointer: fine)').matches;
    if (!fast) return;
    const idle = (cb: () => void) =>
      'requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2500);
    if (document.readyState === 'complete') idle(() => go('low'));
    else addEventListener('load', () => idle(() => go('low')), { once: true });
  });
}
```

`revealVideo(section)` adds `is-ready` to the section. CSS then fades `.film__poster` to `opacity: 0` over 240 ms, and on `transitionend` the `<picture>` is removed. The measurement script in §8.2 waits for that class.

### 3.3 Poster and first frame

- The chapter-1 still is the poster. Use a real `<picture>` element stacked *above* the video, not the `poster` attribute. Seeking hides the `poster` attribute and can show black on iOS (WebKit bug 225963). A `<picture>` lets us crossfade on our own schedule.
- After `loadeddata`, seek to the current target, then wait for **`seeked` plus one `requestVideoFrameCallback`**. Only then fade the picture out (`opacity` transition, 240 ms) and remove it, which frees its decoded bitmap.
- Set `currentTime` only after `loadeddata`. Earlier seeks are unreliable on iOS (AWS IVS known issues).

### 3.4 iOS / Safari quirks

- Video attributes: `muted playsinline disablepictureinpicture disableremoteplayback preload="none" aria-hidden="true" tabindex="-1"`. Also set `video.muted = true` as a property, because React and some frameworks don't reflect the attribute.
- **Unlock and Low Power Mode probe.** After `loadeddata`, while the section is still off-screen, run `video.play().then(() => video.pause())`. A muted, inline, audio-less video may `play()` without a gesture (WebKit "New video policies for iOS"). If the promise **rejects with `NotAllowedError`**, assume Low Power Mode or disabled autoplay. In that state iOS does not reliably render frames for seeks; the scrolly-video library documents that scroll video "will not work if battery saver mode is on". Then switch to the WebCodecs tier (§5.1) or the stills tier. **Verify on device** (§8.4).
- Safari caps rAF at 60 Hz and drops to 30 Hz in Low Power Mode (Lenis docs). All damping in §4.3 is time-based for this reason.
- Desktop Safari scrubs very well even with longer GOPs (muffinman.io), and `fastSeek()` exists there (and in Firefox). Chrome and Edge have no `fastSeek` (MDN/BCD, crbug 41276303).

### 3.5 Save-Data, slow networks, low memory

| Signal | Availability | Action |
|---|---|---|
| `navigator.connection.saveData` / `Save-Data` header | Chromium only | stills tier |
| `effectiveType` `slow-2g`/`2g` | Chromium only | stills tier |
| `effectiveType` `3g` | Chromium only | `film-sd` / portrait, no idle prefetch |
| `navigator.deviceMemory` ≤ 4 | Chromium only (undefined on Safari/Firefox) | `film-sd` |
| `prefers-reduced-data` | Behind a flag everywhere | Ignore for now, but write the CSS hook |
| Runtime seek-latency EWMA > 66 ms over 30 seeks | everywhere | swap to `film-sd` when idle (§4.3) |

Safari and Firefox expose none of the network or memory hints. They get the default by aspect ratio, plus the runtime downgrade.

---

## 4. The scrub loop

### 4.1 Layout: `position: sticky`, not a ScrollTrigger pin

```html
<section class="film" id="film" aria-label="Career film, 7 chapters">
  <div class="film__stage">                       <!-- sticky, 100lvh -->
    <video class="film__video" muted playsinline disablepictureinpicture disableremoteplayback
           preload="none" aria-hidden="true" tabindex="-1"></video>
    <canvas class="film__canvas" width="1280" height="720" hidden></canvas>  <!-- WebCodecs tier -->
    <picture class="film__poster">                                           <!-- above the video until is-ready -->
      <source type="image/avif" srcset="/film/ch-1.avif"><img src="/film/ch-1.webp" alt="" width="1280" height="720" decoding="async">
    </picture>
    <div class="film__grain" aria-hidden="true"></div>                       <!-- static texture overlay -->
    <ol class="film__captions">
      <li class="cap" style="--i:0">…chapter 1 caption + image…</li>
      <!-- … --i:1 … --i:6 -->
    </ol>
  </div>
</section>
```

```css
.film { position: relative; height: 800lvh; view-timeline: --film block; }
.film__stage { position: sticky; top: 0; height: 100lvh; overflow: clip; contain: layout paint; }
.film__video, .film__poster img, .film__canvas {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
}
.film__captions { position: absolute; inset: 0 0 auto 0; height: 100svh; } /* always above the iOS toolbar */
.film__grain { position: absolute; inset: 0; background: url(/film/washi.avif) center / 512px; pointer-events: none; }
.film__poster { position: absolute; inset: 0; transition: opacity 240ms ease-out; }
.film.is-ready .film__poster { opacity: 0; }   /* removed from the DOM on transitionend */
```

Why sticky:

- With sticky, the browser's compositor keeps the stage in place, with no per-frame JS, no DOM reparenting (`pin-spacer`) and no `position: fixed` toggling. Lenis drives native scroll, so sticky keeps working (Lenis docs: "position: sticky … keep working").
- ScrollTrigger pins need `refresh()` bookkeeping, and on iOS they can show a one-frame jump because scrolling runs on a different thread (GSAP forums). Sticky has neither problem.
- Use `lvh` for the section and stage. `lvh` and `svh` are static, while `dvh` changes as the toolbar animates. **Any geometry that depends on `dvh` changes during scroll and moves the progress, so the video jumps.** Captions are confined to `100svh` so the toolbar never covers them.

### 4.2 Mapping scroll progress to media time (7 chapter keyframes)

Each chapter owns 1/7 of the progress. For the first `hold` fraction of its span the video **rests** on the chapter's rest frame, so the caption can be read. The rest of the span travels to the next rest frame with a smoothstep ease. The map is precomputed into a lookup table, so the loop does no math beyond one array read.

```ts
// film/chapters.ts
export interface FilmChapter {
  id: 'origin' | 'craft' | 'scale' | 'systems' | 'lead' | 'impact' | 'next'; // whatever the story uses
  /** media time (s) of this chapter's rest frame — must equal a forced keyframe in the encode */
  rest: number;
  /** fraction (0..1) of the chapter's scroll span spent holding on `rest` */
  hold: number;
}

export const CHAPTERS: FilmChapter[] = [
  { id: 'origin',  rest: 0.0,  hold: 0.30 },
  { id: 'craft',   rest: 2.2,  hold: 0.40 },
  { id: 'scale',   rest: 4.6,  hold: 0.40 },
  { id: 'systems', rest: 6.9,  hold: 0.40 },
  { id: 'lead',    rest: 9.2,  hold: 0.40 },
  { id: 'impact',  rest: 11.5, hold: 0.40 },
  { id: 'next',    rest: 13.8, hold: 0.55 },
];
export const FILM_DURATION = 16.0; // last chapter travels from 13.8 to the end card

const smoothstep = (x: number) => x * x * (3 - 2 * x);

export function buildTimeLut(ch: FilmChapter[], duration: number, size = 2048): Float32Array {
  const lut = new Float32Array(size + 1);
  const n = ch.length;
  for (let k = 0; k <= size; k++) {
    const x = Math.min((k / size) * n, n - 1e-6);
    const i = Math.floor(x), u = x - i;
    const a = ch[i].rest, b = i + 1 < n ? ch[i + 1].rest : duration - 1 / 30;
    const h = ch[i].hold;
    lut[k] = a + (b - a) * (u <= h ? 0 : smoothstep((u - h) / (1 - h)));
  }
  return lut;
}
```

### 4.3 The controller

Rules it enforces:

1. **No work when idle.** rAF runs only while `target ≠ shown` or a seek is in flight. Scroll updates (from ScrollTrigger) restart it. When the stage is off-screen or the tab is hidden, nothing runs.
2. **Frame-quantised targets.** No seek is issued for sub-frame scroll changes, and the target is the middle of the frame, `(f + 0.5) / fps`, so float rounding can't land on frame `f−1`.
3. **Coalescing.** Never assign `currentTime` while `video.seeking`. Store the latest wanted frame and issue it from `seeked`. A naive "seek every frame" loop aborts each seek before the decoder finishes it. In our benchmark the texture clip presented **zero frames in 9.5 s**, and the film clip dropped from 23 to 15 fps (§8.1 table B).
4. **Light, time-based damping.** Lenis already smooths wheel input, and native touch momentum is already smooth, so damping is only there to coalesce: `k = 20 s⁻¹` (≈50 ms time constant), framerate-independent, then snap when within half a frame.
5. **No layout reads in the loop.** Geometry comes from ScrollTrigger, which caches and refreshes it. A standalone version must cache `offsetTop`/height on resize and read `scrollY` only inside the scroll event. `scrollX`/`scrollY` are on the "forces layout" list (Paul Irish).
6. **fastSeek only for long jumps** (> 1 s of media, e.g. a chapter-index click), and only where it exists (Safari/Firefox). Mark the result approximate and issue an exact seek once settled.
7. **Adaptive downgrade.** Track an EWMA of seek→`seeked` latency. If it stays above 66 ms (below ~15 presented fps) for 30 seeks, swap to the SD file during the next idle moment.

```ts
// film/scroll-film.ts
import { buildTimeLut, type FilmChapter } from './chapters';

export interface ScrollFilmOptions {
  video: HTMLVideoElement;
  chapters: FilmChapter[];
  duration: number;
  fps: number;                 // fps of the *loaded* variant (30 or 24)
  onSlow?: () => void;         // called once when the runtime downgrade threshold trips
}

export class ScrollFilm {
  private readonly v: HTMLVideoElement;
  private readonly lut: Float32Array;
  private readonly fps: number;
  private readonly maxFrame: number;
  private targetT = 0;         // seconds, from scroll
  private currentT = 0;        // seconds, damped
  private shown = -1;          // frame index last requested from the element
  private pending = -1;        // frame wanted while a seek is in flight
  private approx = false;      // last seek was a fastSeek (keyframe-accurate only)
  private raf = 0;
  private last = 0;
  private active = false;      // stage on screen
  private ready = false;       // loadeddata + first frame presented
  private seekStart = 0;
  private ewma = 16;
  private samples = 0;

  constructor(private o: ScrollFilmOptions) {
    this.v = o.video;
    this.fps = o.fps;
    this.maxFrame = Math.floor(o.duration * o.fps) - 1;
    this.lut = buildTimeLut(o.chapters, o.duration);
    this.v.addEventListener('seeked', this.onSeeked);
  }

  /**
   * Attach a loaded source (blob URL). Resolves true after the first real frame is on screen,
   * false if the iOS probe says frames won't render (Low Power Mode / autoplay disabled).
   */
  async attach(src: string, probe = false): Promise<boolean> {
    const v = this.v;
    v.muted = true; v.playsInline = true;
    v.preload = 'auto';            // markup ships preload="none"; with "none" loadeddata may never fire
    v.src = src;
    await once(v, 'loadeddata');
    if (probe) {                   // iOS unlock + Low Power Mode probe, before the first real seek
      try { await v.play(); v.pause(); }
      catch (e) { if (e instanceof DOMException && e.name === 'NotAllowedError') return false; }
    }
    this.ready = true;
    this.currentT = this.targetT;
    this.seekToFrame(this.frameOf(this.targetT), false);
    await once(v, 'seeked');
    await new Promise<void>((r) =>
      'requestVideoFrameCallback' in v ? v.requestVideoFrameCallback(() => r()) : requestAnimationFrame(() => r()));
    return true;
  }

  /** 0..1 progress through the 7-chapter span (from ScrollTrigger.onUpdate). */
  setProgress(p: number): void {
    const k = Math.round(Math.min(1, Math.max(0, p)) * (this.lut.length - 1));
    this.targetT = this.lut[k];
    this.kick();
  }

  setActive(on: boolean): void {
    this.active = on;
    if (on) this.kick(); else this.stop();
  }

  destroy(): void {
    this.stop();
    this.v.removeEventListener('seeked', this.onSeeked);
    const src = this.v.src;
    this.v.removeAttribute('src'); this.v.load();          // releases decoder + buffers
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
  }

  // ───────────────────────── internals ─────────────────────────
  private frameOf(t: number): number {
    return Math.min(this.maxFrame, Math.max(0, Math.round(t * this.fps)));
  }

  private kick(): void {
    if (!this.raf && this.active && this.ready && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (now: number): void => {
    this.raf = 0;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const d = this.targetT - this.currentT;
    const halfFrame = 0.5 / this.fps;
    this.currentT = Math.abs(d) < halfFrame ? this.targetT : this.currentT + d * (1 - Math.exp(-20 * dt));

    const f = this.frameOf(this.currentT);
    if (this.v.seeking) this.pending = f;                       // coalesce: keep only the newest wish
    else if (f !== this.shown) this.seekToFrame(f, Math.abs(f - this.shown) > this.fps);
    else if (this.approx && this.currentT === this.targetT) this.seekToFrame(f, false); // settle exactly

    const settled = this.currentT === this.targetT && f === this.shown && !this.approx && !this.v.seeking;
    if (!settled) this.kick();                                  // otherwise go fully idle
  };

  private seekToFrame(f: number, jump: boolean): void {
    this.shown = f;
    this.pending = -1;
    const t = (f + 0.5) / this.fps;
    this.seekStart = performance.now();
    const v = this.v as HTMLVideoElement & { fastSeek?: (t: number) => void };
    if (jump && typeof v.fastSeek === 'function') { v.fastSeek(t); this.approx = true; }
    else { v.currentTime = t; this.approx = false; }
  }

  private onSeeked = (): void => {
    const lat = performance.now() - this.seekStart;
    this.ewma += (lat - this.ewma) * 0.1;
    if (++this.samples === 30 && this.ewma > 66) this.o.onSlow?.();
    if (this.pending >= 0 && this.pending !== this.shown) this.seekToFrame(this.pending, false);
    else this.kick();
  };
}

function once(el: EventTarget, type: string): Promise<Event> {
  return new Promise((r) => el.addEventListener(type, r, { once: true }));
}
```

### 4.4 Wiring with Lenis and ScrollTrigger

```ts
// film/mount.ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollFilm } from './scroll-film';
import { CHAPTERS, FILM_DURATION } from './chapters';
import { choosePlan, loadFilmBlob } from './plan';

export async function mountFilm(section: HTMLElement) {
  const video = section.querySelector<HTMLVideoElement>('.film__video')!;
  const plan = await choosePlan();                          // §5.4
  if (plan.tier === 'static') return mountStatic(section);  // reduced motion
  if (plan.tier === 'stills') return mountStills(section);  // Save-Data / 2G / failures

  const film = new ScrollFilm({ video, chapters: CHAPTERS, duration: FILM_DURATION, fps: plan.fps,
    onSlow: () => plan.downgrade?.() });

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',             // = 700lvh of scroll for an 800lvh section
    onUpdate: (self) => film.setProgress(self.progress),
    onToggle: (self) => film.setActive(self.isActive),
    onRefresh: (self) => film.setProgress(self.progress),
  });

  const blobUrl = await loadFilmBlob(plan, section);         // §3.2 (IO + idle prefetch)
  const ok = await film.attach(blobUrl, plan.needsIosProbe);  // probe = iOS unlock / Low Power Mode test
  if (!ok) return switchToFallback(section, plan, film);     // WebCodecs tier (§5.1) or stills
  revealVideo(section);                                      // crossfade poster → video, then remove poster
  ScrollTrigger.refresh();
}
```

Use ScrollTrigger for progress only. **Do not use `scrub` or a tween on `currentTime`.** Something like `gsap.to(video, { currentTime: d, scrollTrigger: { scrub: true } })` writes `currentTime` on every tick whether or not a seek is in flight. That is the "naive" column in §8.1 table B.

### 4.5 Overlays: captions and images per chapter

Captions run off the main thread with **CSS scroll-driven animations**. The section declares `view-timeline: --film block`. The `contain` range of an 800lvh section in a 100lvh viewport is exactly the 700lvh scrub span. Each caption picks its 1/7:

```css
@supports (animation-timeline: view()) {
  .cap {
    animation: cap-in-out linear both;
    animation-timeline: --film;
    animation-range: contain calc(var(--i) * 100% / 7) contain calc((var(--i) + 1) * 100% / 7);
  }
  @keyframes cap-in-out {
    0%        { opacity: 0; transform: translate3d(0, 2.5rem, 0); visibility: hidden; }
    1%        { visibility: visible; }
    12%       { opacity: 1; transform: none; }
    38%       { opacity: 1; transform: none; }      /* ≈ hold fraction */
    60%       { opacity: 0; transform: translate3d(0, -1.5rem, 0); visibility: visible; }
    61%, 100% { opacity: 0; visibility: hidden; }   /* fill: both → hidden before and after its range */
  }
}
@media (prefers-reduced-motion: reduce) { .cap { animation: none; } }
```

- Supported in Chrome/Edge 115+, Safari 26+ and Firefox 159+ (BCD 8.1.7). Otherwise, create one GSAP timeline per caption with `scrollTrigger: { trigger: section, start: () => …, end: () => …, scrub: true }`. Also put the controller's chapter index on `section.dataset.chapter`, for anything discrete such as the chapter index UI.
- Animate only `opacity` and `transform`. Those animations run on the compositor in Chrome. `visibility: hidden` at the ends keeps the 6 inactive chapters out of paint.
- **No `backdrop-filter` (glass) and no `mix-blend-mode` over the video.** Both force an extra render pass over the covered region on every video frame. Get caption legibility from composition (negative space in the rest frames, §2.6) or from an opaque or semi-opaque *static* plate.
- Images inside captions: `<img>` sized to their display size, `decoding="async"`, AVIF/WebP. Layer memory is width × height × 4 × DPR², so keep caption plates small. A 600×400 plate at DPR 2 costs 1.9 MB, and a full-screen layer at DPR 2 on a 1920×1080 screen costs 33 MB.

### 4.6 Lenis + GSAP in 2026: versions, setup, pitfalls

- `lenis@1.3.27` (2026-10-15). Lenis 2.0 is only on `-dev` tags (dev.5, 2026-09-18), so don't use it in production yet. `gsap@3.15.0` (2026-04-13): new `easeReverse`, `yoyoEase` deprecated, ScrollTrigger cleanup fixes. Every former Club plugin (SplitText, MorphSVG, …) is in the public `gsap` package since 3.13, which is free under Webflow.

```ts
// app/smooth-scroll.ts
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export const lenis = new Lenis({
  lerp: 0.1,               // default; wheel smoothing
  smoothWheel: true,
  syncTouch: false,        // keep native touch momentum (cheaper, and unstable < iOS 16 if true)
  anchors: true,           // chapter index links
  autoRaf: false,          // GSAP's ticker drives Lenis, so never both
  // respectReducedMotion: true is the 1.3.x default: lerp → 1, instant programmatic scrolls
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Pitfalls:

1. **Never run `autoRaf: true` together with `gsap.ticker.add(lenis.raf)`.** The double-step makes the smoothing run twice as fast.
2. Don't use `ScrollTrigger.normalizeScroll()` together with Lenis, because both want to own the input.
3. **Sticky dies if any ancestor has `overflow: hidden|auto|scroll`**: that ancestor becomes the scroll container. Use `overflow: clip` (Chrome 90, Firefox 81, Safari 16) for clipping. Lenis' own CSS only uses `overflow: clip` while stopped.
4. A sticky child of a flex/grid parent with `align-items: stretch` grows to the parent's height and never sticks. Give it `align-self: start`.
5. `transform` on an ancestor doesn't break sticky (it breaks `fixed`). `contain: paint` on an ancestor is fine.
6. Remove `html { scroll-behavior: smooth }` because it fights Lenis. Lenis does not support CSS scroll-snap (use `lenis/snap`).
7. Double smoothing: Lenis lerp 0.1 plus a heavy video lerp feels like a lag. That is why the controller's damping is light (k = 20).
8. iOS toolbar: GSAP's default `ignoreMobileResize: true` must stay on. Never use `dvh` in the film's geometry. Call `ScrollTrigger.refresh()` after `document.fonts.ready` and after images above the film have dimensions. Reserve `width`/`height` on every image above the film so CLS doesn't shift the section.
9. Lenis cannot smooth over iframes (wheel events don't reach the parent). Keep embeds out of the film.
10. Safari runs rAF at 60 Hz, or 30 Hz in Low Power Mode. Write everything time-based.

---

## 5. Alternatives and tiers

### 5.1 WebCodecs scrubber (fallback tier, not primary)

Demux the same MP4 (mediabunny `Input` + `BlobSource`), decode on demand with `VideoDecoder`, and draw to a canvas. It is not subject to media autoplay policy, which is why it can rescue iOS Low Power Mode, and it is frame-exact.

- Support: `VideoDecoder` is in Chrome 94, Safari/iOS 16.4 and Firefox desktop 130, but **not Firefox Android** (BCD). The tier must stay optional.
- The Low Power Mode rescue is *expected* from the API design (no `play()` involved) but is **not yet verified on a device** (§8.4).
- Cost: it needs a JS demuxer (mediabunny MP4 reader + sample sink ≈ **55 KB gzip, tree-shaken [measured]**; the full bundle is 181 KB). It gives up the browser's optimised video compositing path, because each frame is `drawImage` into a canvas. In our run (§8.1 table C) that path took 324 MB of GPU-process PSS against 59 MB for `<video>`, and 2.5× the GPU-process CPU, with no gain in scrub smoothness.
- **Memory rule: never keep decoded frames.** `sample.draw(ctx, …)` then `sample.close()`. Hardware decoders have small fixed output pools, so holding `VideoFrame`s stalls the decoder. The scrolly-video library pushes every decoded frame into an array as an `ImageBitmap`. For 480 frames at 720p that is **1.77 GB**, which is exactly what we must not do.
- Use one canvas at the video's intrinsic size (1280×720×4 = 3.7 MB). It does not need DPR scaling.

```ts
// film/webcodecs-film.ts (dynamically imported only for this tier)
export async function createWebCodecsFilm(canvas: HTMLCanvasElement, blob: Blob) {
  const { Input, BlobSource, MP4, VideoSampleSink } = await import('mediabunny');
  const input = new Input({ source: new BlobSource(blob), formats: [MP4] });
  const track = (await input.getPrimaryVideoTrack())!;
  const sink = new VideoSampleSink(track);
  const ctx = canvas.getContext('2d', { alpha: false })!;
  let busy = false, wanted = -1, drawn = -1;

  async function pump() {
    if (busy || wanted < 0 || wanted === drawn) return;
    busy = true;
    const t = wanted; wanted = -1;
    const s = await sink.getSample(t);            // decodes from the previous keyframe
    if (s) { s.draw(ctx, 0, 0, canvas.width, canvas.height); drawn = t; s.close(); }
    busy = false;
    pump();                                       // newest wish wins (same coalescing rule)
  }
  return {
    seek(t: number) { wanted = t; pump(); },
    dispose() { input.dispose(); },
  };
}
```

For the WebCodecs tier, `ScrollFilm.seekToFrame` calls `film.seek((f + 0.5) / fps)` instead of setting `currentTime`. Everything else, including the LUT, the idle-stop rule and the coalescing, stays the same.

### 5.2 Image sequences: rejected

| Frames | Frame size | Decoded RGBA | Notes |
|---|---|---|---|
| 480 (16 s @30) | 1280×720 | **1.77 GB** | impossible |
| 480 | 960×540 | 1.0 GB | impossible |
| 240 (16 s @15) | 960×540 | 498 MB | over iOS canvas memory caps (224–384 MB on iOS 12–15; PQINA, Apple forums) |
| 120 | 1280×720 | 442 MB | jerky, and still too much |

You can decode on demand with an LRU of ~30 bitmaps (≈110 MB at 720p), but then you have rebuilt a worse video decoder: 480 HTTP requests or a sprite pipeline, JPEG/WebP decode on the main thread or a worker, and a download 2–3× larger than the H.264 file at equal quality. Image sequences only win for **very short (<60 frame), alpha-channel** overlays, such as a cut-out object rotating over the page. If the site needs one of those, use a WebP/AVIF sprite of ≤ 48 frames at small size.

### 5.3 Rendering the film live in three.js

This option is tempting because the film is probably authored as a 3D scene anyway. But a live render costs continuous GPU time per frame, and on low-end GPUs and phones that is far more than one hardware video decode. Its quality also depends on the device. Keep the film as pre-rendered video, and keep live three.js for the sections where interactivity is the point.

### 5.4 Tier selection

```ts
// film/plan.ts
export type Tier = 'static' | 'stills' | 'video' | 'webcodecs';
export interface Plan {
  tier: Tier; src: string; fps: number; bytes: number;
  needsIosProbe: boolean; downgrade?: () => void;
}

const V = {
  hd:       { src: '/film/film-hd.4f3a.mp4',       fps: 30, w: 1280, h: 720,  bytes: 4.2e6 },
  sd:       { src: '/film/film-sd.9b1c.mp4',       fps: 30, w: 960,  h: 540,  bytes: 2.3e6 },
  portrait: { src: '/film/film-portrait.2d7e.mp4', fps: 24, w: 720,  h: 1280, bytes: 2.8e6 },
} as const;

export async function choosePlan(): Promise<Plan> {
  const mq = (q: string) => matchMedia(q).matches;
  const base = { needsIosProbe: false } as const;
  if (mq('(prefers-reduced-motion: reduce)')) return { ...base, tier: 'static', src: '', fps: 0, bytes: 0 };

  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  const c = nav.connection;
  if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? '')) return { ...base, tier: 'stills', src: '', fps: 0, bytes: 0 };

  const portrait = mq('(max-aspect-ratio: 4/5)');
  const lowEnd = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4 || c?.effectiveType === '3g';
  let v = portrait ? V.portrait : lowEnd ? V.sd : V.hd;

  // Sanity gate: drop a tier if the UA says this config won't decode smoothly.
  try {
    const r = await navigator.mediaCapabilities.decodingInfo({
      type: 'file',
      video: { contentType: 'video/mp4; codecs="avc1.640028"', width: v.w, height: v.h, bitrate: (v.bytes * 8) / 16, framerate: v.fps },
    });
    if (!r.supported) return { ...base, tier: 'stills', src: '', fps: 0, bytes: 0 };
    if (!r.smooth && v === V.hd) v = V.sd;
  } catch { /* old UA: keep choice */ }

  // Every iOS/iPadOS browser (Safari, CriOS, FxiOS…) is WebKit and shares the media policies.
  // iPadOS reports a Mac UA, hence the maxTouchPoints check.
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return { tier: 'video', src: v.src, fps: v.fps, bytes: v.bytes, needsIosProbe: isIOS };
}
```

| Condition | Tier | Bytes | What the user sees |
|---|---|---|---|
| `prefers-reduced-motion: reduce` | **static** | ≈0.5 MB (7 stills, lazy) | Chapters in normal flow, each with its still and caption. No scrub, no sticky, nothing moves on scroll. All content is still present. |
| Save-Data, 2G, `decodingInfo.supported === false`, fetch/decode error | **stills** | ≈0.5 MB | Sticky stage. The 7 stills crossfade by chapter, using the same CSS scroll timeline as the captions. The narrative is intact. |
| iOS muted `play()` rejected (Low Power Mode) and `VideoDecoder` present | **webcodecs** | same MP4 + 55 KB JS | Scrubbing on canvas |
| same, no `VideoDecoder` (iOS < 16.4) | **stills** | | |
| portrait phone | **video** `film-portrait` | ≤ 3 MB | full experience |
| low-end landscape / 3G / runtime slow | **video** `film-sd` | ≤ 2.5 MB | full experience, softer |
| everything else | **video** `film-hd` | ≤ 5 MB | full experience |

Errors: on `video.error`, a fetch rejection or a 10 s timeout after the section is in view, switch to **stills** silently. Never show a broken stage.

---

## 6. Memory and GPU

### 6.1 What the film costs

| Item | HD (1280×720) | Portrait (720×1280 @24) |
|---|---|---|
| Blob (= file) | ≈4–5 MB, browser process (Chromium can page it to disk) | ≈3 MB |
| Demuxer / media buffers | a few MB | a few MB |
| Decoder DPB + output pool | NV12 is 1.38 MB per frame. A typical pool of 4–16 frames is 6–22 MB (hardware decoders preallocate by level). | same |
| Compositor texture(s) for the video layer | 1–3 × 3.7 MB (RGBA) or NV12 overlay | same |
| Poster `<picture>` (until removed) | 3.7 MB decoded | 3.7 MB |
| Caption plates (active chapter only) | 2–8 MB at DPR 2 | similar |

Expect **≈ file size + 30–60 MB** on hardware-decode devices, with no growth while scrubbing. Under software decode plus SwiftShader, total Chromium PSS grew 61–81 MB after loading the 720p file and plateaued during scrubbing (§8.1). Compare that with 1.77 GB for an image sequence.

### 6.2 Don't route the video through WebGL unless the design needs a shader on it

- Drawing a `<video>` into WebGL means a texture upload or copy of a full frame for every new frame (1280×720×4 = 3.7 MB). It also keeps a WebGL context alive and running, and it takes the video off the cheaper path where the compositor can show the decoded frame directly (on some platforms as a hardware overlay plane).
- If a shader effect on the film is essential (an ink-bleed transition between chapters, for example), use `THREE.VideoTexture`. It updates only when a new frame exists (it uses `requestVideoFrameCallback`). Render on demand, meaning only after `seeked`, never in a free-running loop. Limit it to the transition moments and keep a plain `<video>` the rest of the time.
- Keep CSS on the `<video>` itself plain: no `filter`, `border-radius`, `clip-path`, `mask` or non-axis-aligned transforms. Those can disable direct or overlay presentation on some platforms and force an extra composite pass. Put shapes and masks on sibling elements.

### 6.3 Layers and `will-change`

- Every promoted layer is a GPU texture of w × h × 4 × DPR² bytes. A full-viewport layer is 8.3 MB at DPR 1 and **33 MB at DPR 2 (1920×1080 CSS px)**. Ten such layers is a third of a gigabyte on a laptop that also runs three.js.
- Use `will-change: transform` only on elements that are animating *right now*. Set it when the animation starts and remove it afterwards. Never put it in global CSS. Scroll-driven animations get promoted automatically while active.
- The sticky stage gets `contain: layout paint` so caption changes don't invalidate layout outside it.
- Use `content-visibility: auto` on the heavy sections *above and below* the film, not inside the stage, where everything is on-screen geometry.

### 6.4 Coordination with the site's three.js scenes

- **Only one heavy GPU thing at a time.** When the film is active (`onToggle`), pause every other WebGL scene's render loop (`renderer.setAnimationLoop(null)`). Resume when the film leaves.
- Prefer a **single shared `WebGLRenderer` and canvas**, with scenes swapped per section or `renderer.setScissor` per view, over one context per section. Browsers cap live WebGL contexts (around 16 in Chromium) and every context holds its own driver memory.
- Pause all scenes on `visibilitychange` → hidden. The film needs nothing: it is idle unless scrolled.

---

## 7. Accessibility and semantics

- The film is decorative. All chapter content is real text in the captions, so it is translatable for the JA/EN/ZH switch and indexable. Use `aria-hidden="true"` on video, canvas and grain.
- Each caption carries its chapter's heading level (`h2`). The chapter index nav links to `#ch-n` anchors, and Lenis is set with `anchors: true`.
- Reduced motion: static tier (§5.4). Lenis also disables smoothing by itself (`respectReducedMotion`).
- Keyboard: Space, PageDown and arrows scroll natively, so the film follows. Nothing traps focus.

---

## 8. Measurement

### 8.1 Local benchmark (what we ran)

Setup:
- Encodes are 16 s at 30 fps from two near-lossless masters.
  - **"film"**: Blender's *Sintel* trailer, 1080p, CC-BY. CG with grain, many cuts and dark scenes.
  - **"texture"**: a continuous 1.0→2.2× zoom and pan across Hokusai's *Great Wave* (Met Open Access, public domain) at 1080p. Every pixel changes every frame and the paper texture is fine, so it is the worst case.
- Quality is VMAF (libvmaf, every 4th frame) against the master scaled to the same size.
- The seek and scrub tests ran in Playwright Chromium 156, **headless with software decode** (FFmpeg H.264 inside Chromium, SwiftShader GL) on a 4-core Linux box.
  - This is a stand-in for a low-end device without hardware decode. Real hardware decode is faster, so treat the latencies as an upper bound.
  - The file is loaded as a Blob URL. The video is displayed at 960×540 CSS px.
- *Random seek*: 40 seeks to random frames. We record time to `seeked` and to the next `requestVideoFrameCallback`.
- *Scrub*: a scripted 9.5 s scroll pattern against the 16 s clip:
  - 4 s slow forward (2× media speed)
  - 1 s fling (≈7×)
  - 3 s slow reverse
  - 1 s fast reverse

  The coalescing loop of §4.3 (without damping) seeks only when the frame changed and no seek is in flight. We record presented fps (unique `mediaTime`s via rVFC), mean and max lag between target and presented frame (in frames), and CPU across *all* Chromium processes from `/proc/<pid>/stat`, expressed in cores (1.0 = one core busy).

Harness (scratch, session-local; copy into the repo if you want it kept):
- `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/scripts/encode.sh` produces the variants.
- `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/scripts/vmaf.sh` computes quality.
- `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/scripts/run-bench.mjs` + `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/scripts/web/bench.html` run the `<video>` seek and scrub tests.
- `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/scripts/run-wc.mjs` + `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/scripts/web/wc.html` run the WebCodecs tests.
- `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/scripts/wc-mem.mjs` collects per-process PSS and CDP `SystemInfo`.
- Raw results are in `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/vbench/bench-run1.log`, `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/vbench/results-wc.jsonl`, `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/vbench/out/sizes.csv` and `/tmp/claude-1000/-home-star-Documents-Portf/e62e8949-2791-405e-a4be-159327fe6fc9/scratchpad/vbench/vmaf*.csv`.

The host was also running a desktop session (load average ≈10 during the runs). Read across rows, not at absolute values.

**A. Codec and resolution (film clip, coalescing loop)**

| Variant | MB | VMAF | Seek ms (median / p95) | Scrub fps | Lag frames (mean / max) | CPU cores while scrubbing | CPU cores idle (film on screen) |
|---|---|---|---|---|---|---|---|
| **H.264 720p `-g 8` CRF 23** | **4.15** | **95.4** | **36.5 / 73.2** | **22.7** | **4.5 / 32.5** | 1.77 | **0.00** |
| H.264 720p `-g 1` | 10.10 | 94.2 | 31.6 / 58.4 | 27.2 | 3.0 / 19.3 | 1.93 | 0.00 |
| H.264 540×960 portrait `-g 8` CRF 24 | 2.18 | 95.2 | 27.1 / 44.5 | 30.0 (capped by the 30 fps source) | 3.0 / 19.3 | 1.77 | 0.01 |
| VP9 720p `-g 8` CRF 34 | 3.29 | 85.6* | 38.0 / 71.6 | 20.7 | 4.6 / 28.9 | 1.60 | 0.01 |
| VP9 720p `-g 1` CRF 34 | 19.91 | 87.0* | 49.3 / 78.3 | 19.9 | 4.2 / 25.1 | 1.87 | 0.01 |
| AV1 720p `-g 8` CRF 34 | 11.55 | 92.6 | 58.8 / 117.9 | 16.7 | 7.3 / 47.1 | 1.95 | 0.01 |
| H.264 1080p `-g 8` | 8.07 | – | 74.3 / 137.1 | 13.8 | 7.4 / 42.3 | 1.73 | 0.12 |
| H.264 1080p `-g 1` | 20.00 | – | 63.6 / 93.2 | 17.2 | 5.7 / 34.4 | 1.96 | 0.01 |

\*VP9 at CRF 34 collapsed in dark scenes (5th-percentile VMAF 20.8).

The GOP sweep for both clips is in §2.2. The scrub CPU is high in absolute terms because *everything* is software here: H.264 decode, plus SwiftShader compositing of a 960×540 layer. The per-process split for the film `-g 8` run was 9.6 CPU-s in the renderer (decode) and 7.7 CPU-s in the GPU process (SwiftShader) over 9.5 s, from CDP `SystemInfo.getProcessInfo`. With hardware decode and a real GPU both drop sharply. **The numbers that carry over are the relative ones and the idle figure, which is ≈0 in every run because the loop stops.** Total Chromium PSS grew 61–81 MB after loading a 720p `-g 8`/`-g 1` file, and 11–26 MB more during the scrub, with no growth after that.

**B. Coalescing vs naive "seek on every rAF"**

| File | Coalesced: fps / mean lag | Naive: fps / mean lag | Naive seeks/s |
|---|---|---|---|
| film `-g 8` | 23.4 / 4.2 | 15.5 / 6.5 | 60 |
| texture `-g 8` | 12.0 / 8.5 | **0 frames presented in 9.5 s** | 60 |
| film, default GOP | 9.4 / 16.7 | 1.2 / 58.0 | 60 |

Each new seek aborts the one in flight. When decode takes longer than one rAF, the naive loop **never shows a frame at all**. This is the most important line of code in the feature.

**C. WebCodecs (mediabunny `VideoSampleSink.getSample` → 2D canvas) vs `<video>`**

| File | `<video>` seek median | WebCodecs seek median | `<video>` scrub fps | WebCodecs fps: `getSample` / `samplesAtTimestamps` | CPU cores: `<video>` / WebCodecs |
|---|---|---|---|---|---|
| film `-g 1` | 31.6 ms | 15.7 ms | 27.2 | 25.6 / 28.7 | 1.93 / 2.41 |
| film `-g 8` | 36.5 ms | 29.1 ms | 22.7 | 22.1 / 21.2 | 1.77 / 2.43 |
| film default GOP | 110.5 ms | 106.3 ms | 9.4 | 9.6 / 14.0 | 1.62 / 1.90 |
| texture `-g 8` | 79.6 ms | 50.0 ms | 10.5 | 15.1 / 12.9 | 1.40 / 1.99 |

Per-process PSS after a 9.5 s scrub of film `-g 8`:
- `<video>`: renderer 104 MB, GPU process 59 MB.
- WebCodecs: renderer 96 MB, **GPU process 324 MB**.

GPU-process CPU during the scrub was 7.7 s vs 19.3 s.

So WebCodecs skips the media-pipeline seek overhead and decodes a single seek faster. But in this environment, the canvas presentation path costs more GPU-process time and memory than the `<video>` element's compositing path, and scrub smoothness ends up the same. Add the extra code, the 55 KB of JS and the missing Firefox Android support, and it stays a **fallback tier**. Re-measure on real GPUs before ever promoting it.

### 8.2 How to measure on real devices (and prove low load)

Chrome / Edge (desktop and Android via `chrome://inspect`):
1. **Performance panel** at 4× CPU throttling. Record a 10 s scroll through the film and check:
   - Main thread: there are no long tasks from the film, and the `tick` and `seeked` handlers each take under 0.3 ms.
   - Frames track: no red frames while scrolling.
   - GPU track: short bursts per video frame.
   - When the scroll stops, the main thread, the frames track and rAF go completely idle.
2. **Rendering tab** (DevTools → More tools):
   - *Frame Rendering Stats* for FPS and GPU memory.
   - *Paint flashing*: only captions may flash, never the stage.
   - *Layer borders*.
3. **Layers panel**: number of layers and their memory while a chapter is active. Target fewer than 8 layers in the stage.
4. **`chrome://media-internals`** → the player → `kVideoDecoderName`:
   - Hardware decoders show up as `VDAVideoDecoder`, `D3D11VideoDecoder`, `VaapiVideoDecoder` or `MediaCodecVideoDecoder`.
   - Software shows up as `FFmpegVideoDecoder`, `VpxVideoDecoder` or `Dav1dVideoDecoder`.
   - Also check `is_platform_video_decoder: true`.
5. **Task Manager** (Shift+Esc): GPU-process and tab memory before and after the film loads. Target: delta ≤ file size + 60 MB.

Safari (macOS, and iOS via Web Inspector):
- Timelines → CPU + Memory + Layers while scrolling.
- Develop → Show Compositing Borders.
- Test Low Power Mode on a real iPhone (§8.4).

Firefox:
- Firefox Profiler with the "Media" preset.
- `about:support` → Media → hardware decoding rows.

Automated (Playwright + CDP). Use it in CI as a regression budget:

```ts
// scripts/measure-film.ts — run with `npx tsx scripts/measure-film.ts http://localhost:4173`
import { chromium } from 'playwright';

const url = process.argv[2];
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist'] });   // headed GPU on a real box is better
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
const bcdp = await browser.newBrowserCDPSession();
await cdp.send('Performance.enable');
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const cpu = async () => {
  const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo');  // cpuTime per process, seconds
  return processInfo.reduce((s: number, p: { cpuTime: number }) => s + p.cpuTime, 0);
};
const metric = async (name: string) =>
  (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === name)!.value;

await page.goto(url, { waitUntil: 'networkidle' });
const film = page.locator('#film');
await film.scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelector('#film')?.classList.contains('is-ready'));

// 1) idle with the film on screen: should be ~0
let c0 = await cpu(), t0 = await metric('TaskDuration');
await page.waitForTimeout(3000);
const idleCores = (await cpu() - c0) / 3, idleMain = (await metric('TaskDuration') - t0) / 3;

// 2) scripted wheel scroll through all 7 chapters
c0 = await cpu(); t0 = await metric('TaskDuration');
const start = Date.now();
for (let i = 0; i < 140; i++) { await page.mouse.wheel(0, 45); await page.waitForTimeout(16); }
await page.waitForTimeout(800);
const secs = (Date.now() - start) / 1000;
const scrubCores = (await cpu() - c0) / secs, scrubMain = (await metric('TaskDuration') - t0) / secs;
const q = await page.evaluate(() => (document.querySelector('.film__video') as HTMLVideoElement).getVideoPlaybackQuality());

console.table({ idleCores, idleMain, scrubCores, scrubMain, dropped: q.droppedVideoFrames });
// Budgets (4x throttle, desktop HD): idleMain < 0.01, scrubMain < 0.15, idleCores < 0.05
if (idleMain > 0.01 || scrubMain > 0.15) process.exitCode = 1;
await browser.close();
```

Notes on the script:
- `Emulation.setCPUThrottlingRate` slows only the renderer main thread, not media decode threads or the GPU process. That is why total CPU comes from `SystemInfo.getProcessInfo`, which reports per-process `cpuTime` (verified on Chromium 156; types `browser`, `renderer`, `GPU`, `utility`).
- `Performance.getMetrics` `TaskDuration` covers the main thread only.
- On Linux you can cross-check with `/proc/<pid>/stat` and `smaps_rollup` (PSS), which is what §8.1 used.
- Add `page.tracing` / `Tracing.start` with the categories `devtools.timeline,disabled-by-default-devtools.timeline.frame,media,gpu` if you need frame-level evidence. Load the trace into the Performance panel.

### 8.3 Pass criteria

| Metric | Budget |
|---|---|
| Main-thread time while the film is on screen and **not** scrolling | **< 1%** (rAF stopped) |
| Main-thread time while scrubbing (4× throttle) | < 15% |
| Presented frames while scrolling at reading speed | ≥ 24/s on mid-range hardware, ≥ 15/s on low-end SW decode |
| Mean target→presented lag | ≤ 3 frames (100 ms) |
| Memory delta after load | ≤ file size + 60 MB, no growth across 10 full scrubs |
| Long tasks > 50 ms caused by the film | 0 |
| CLS caused by the film | 0 |
| Bytes before the section approaches | 0 (except idle prefetch on 4G and better) |

### 8.4 Device test matrix (manual, before launch)

| Device | Check |
|---|---|
| iPhone (A15 or newer), iOS 26, normal mode | portrait file, unlock works, scrub smooth |
| Same iPhone, **Low Power Mode** | `play()` rejects → WebCodecs tier renders frames. If not, the stills tier engages cleanly. |
| Older iPhone (iOS 16.x) | stills or video, no black stage |
| Mid Android (Chrome, 4 GB RAM), cellular | `film-sd`/portrait chosen, no stalls (blob), Save-Data → stills |
| Windows laptop with iGPU, Edge | HD, `D3D11VideoDecoder` in media-internals |
| macOS Safari 26 | HD, captions via scroll timeline |
| Firefox 159+ desktop | HD, scroll timeline captions; Firefox ≤ 158 → GSAP caption fallback |
| Any, `prefers-reduced-motion` | static tier, all text present |

---

## 9. Sources

- Encoding all-intra for scroll scrub, `-g 1`, file-size trade-off, `yuv420p` for Safari: hontran.dev, "Scroll-scrubbed video stutters? Fix the encode" — https://www.hontran.dev/blog/scroll-scrubbed-video-stutters-fix
- Keyframe interval vs smoothness by browser (Safari best, Firefox prefers WebM), size growth with keyframes: muffinman.io, "Scrubbing videos using JavaScript" — https://muffinman.io/blog/scrubbing-videos-using-javascript/
- scrolly-video (npm 0.0.24, README and source): keyframe = 1 advice, WebCodecs path keeps every frame as an ImageBitmap, iOS battery-saver limitation — https://www.npmjs.com/package/scrolly-video , https://scrollyvideo.js.org
- Reuters Graphics ScrollerVideo docs: 24 fps (higher crashes mobile), ~3 s keyframes, separate mobile files, `lvh`/`svh` — https://cdn.jsdelivr.net/npm/@reuters-graphics/graphics-components@4.7.0/dist/llm-docs/components/ScrollerVideo.md
- requestVideoFrameCallback semantics and support — https://web.dev/articles/requestvideoframecallback-rvfc
- `fastSeek()` (Safari 8+, Firefox 31+, no Chromium) — https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/fastSeek
- Browser support numbers: `@mdn/browser-compat-data` 8.1.7 (2026-10-22). VideoDecoder, animation-timeline (Chrome 115 / Safari 26 / Firefox 159), timeline-scope, ManagedMediaSource (Safari 17 / iOS 17.1), MediaSource iPad-only on iOS, NetworkInformation.saveData and deviceMemory Chromium-only, prefers-reduced-data flag-only, fetch `priority`, overflow: clip.
- Preload behaviour (Chrome default `metadata` since 64, forced `metadata` on cellular, `none` with Data Saver; `link rel=preload as=video` unsupported) — https://web.dev/articles/fast-playback-with-preload
- iOS Safari only honours `preload="metadata"` — https://bugs.webkit.org/show_bug.cgi?id=197608 , https://bugs.webkit.org/show_bug.cgi?id=180765
- Seeking hides the poster (black first frame) — https://bugs.webkit.org/show_bug.cgi?id=225963
- iOS inline/muted autoplay policy, `play()` promise rejection — https://webkit.org/blog/6784/new-video-policies-for-ios/
- Seek after `loadeddata` on iOS — https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/web-issues.html
- MediaCapabilities `decodingInfo()` (smooth / powerEfficient, optimistic before stats) — https://developer.mozilla.org/docs/Web/API/MediaCapabilities/decodingInfo
- Chromium blob storage (in-memory limits, paging to disk) — https://chromium.googlesource.com/chromium/src/+/HEAD/storage/browser/blob
- iOS canvas memory caps (224–384 MB) — https://www.pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/ , https://bugs.webkit.org/show_bug.cgi?id=195325
- What forces layout (scrollY etc.) — https://gist.github.com/paulirish/5d52fb081b3570c81e3a
- Scroll-driven animations — https://developer.chrome.com/docs/css-ui/scroll-driven-animations
- Lenis 1.3.27 README and `lenis.css` (options, GSAP integration, sticky works, Safari 60/30 fps cap, iframes, `respectReducedMotion`) — https://cdn.jsdelivr.net/npm/lenis@1.3.27/README.md
- GSAP 3.13: all plugins free (Webflow) — https://gsap.com/blog/3-13/ , https://webflow.com/updates/gsap-becomes-free ; 3.15.0 on npm (`easeReverse`).
- ScrollTrigger + iOS toolbar / pin jitter discussions — https://gsap.com/community/forums/topic/40372-scrolltrigger-pin-with-dvh-css-units/ , https://greensock.com/forums/topic/31638-long-page-with-scrolltrigger-jumps-on-ios-when-scrolling-ends/
- three.js `VideoTexture` updates via `requestVideoFrameCallback` (r186 source) — https://cdn.jsdelivr.net/npm/three@0.186.1/src/textures/VideoTexture.js
- mediabunny (VideoSampleSink, CanvasSink pooling, `close()` discipline, tree-shaking) — https://mediabunny.dev/guide/media-sinks , https://cdn.jsdelivr.net/npm/mediabunny@1.62.1/README.md
- Test media: Sintel trailer © Blender Foundation (CC-BY 3.0) https://download.blender.org/durian/trailer/ ; Hokusai, *Under the Wave off Kanagawa*, The Met 45434 (Open Access, public domain).
