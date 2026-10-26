#!/usr/bin/env bash
# Film encodes and stills (DESIGN §7.3 step 5, video §2.5; owner WP-03). Run from anywhere:
#   bash tools/film/encode.sh            (takes the ffmpeg lock itself for every encode, nice -n 10)
# Inputs:  assets-src/film/master-landscape.mp4, assets-src/film/master-portrait.mp4
# Outputs: build/film/film-{hd,sd,portrait}.mp4, build/film/ch-{1..7}{,-p}.{png,avif,webp}, build/film/end{,-p}.{avif,webp}
set -euo pipefail
cd "$(dirname "$0")/../.."
FF=tools/bin/ffmpeg
LOCK=.locks/ffmpeg.lock
run() { flock "$LOCK" nice -n 10 "$@"; }
mkdir -p build/film
COLOR="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
X264="-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -tag:v avc1 -movflags +faststart -an"
REST="0,2.2,4.6,6.9,9.2,11.5,13.8"      # chapter rest times (s); rest frame = round(t × fps)
FL="0 66 138 207 276 345 414"           # landscape rest frames (30 fps)
FP="0 53 110 166 221 276 331"           # portrait rest frames (24 fps): 4.6 s and 13.8 s fall inside frames 110 / 331
# forced IDR times a quarter frame before each rest frame, so ffmpeg (first frame with pts >= t) picks exactly it
kf() { local out="" sep=""; for f in $1; do out="$out$sep$(awk -v f=$f -v r=$2 'BEGIN { t = (f - 0.25) / r; if (t < 0) t = 0; printf "%.5f", t }')"; sep=","; done; echo "$out"; }
KL=$(kf "$FL" 30); KP=$(kf "$FP" 24)
# Rate control (DESIGN §7.3 / video §2.3). The spec's starting point — CRF 23 / 24 / 25 with a fixed q 18 over
# each forced IDR rest frame ±3 frames — measured 6.6 / 3.7 / 3.5 MB on this film: the ±3 zones alone cost
# ≈ 1.6 MB of HD, because a GOP of 8 makes every zone frame near-intra. Only the rest frame itself is ever held
# on screen (the player parks on its frame-centre time), so the zone is narrowed to the rest frame (q 19) and the
# travel frames keep the spec CRF where the budget allows; SD and portrait take the §7.3 "+2 CRF" step once
# (after the content was simplified: flat mist banks, flat fog tints, a two-tone lake). Result: HD CRF 23,
# SD CRF 26, portrait CRF 27. Override with env vars to experiment.
CRF_HD=${CRF_HD:-23}; CRF_SD=${CRF_SD:-26}; CRF_P=${CRF_P:-27}
ZQ=${ZQ:-19}      # quantiser of the rest-frame zones
ZW=${ZW:-0}       # zone half-width in frames (spec: 3)
zones() { # $1 = rest frames
  local out="zones=" sep=""
  for f in $1; do local a=$((f - ZW)); [ $a -lt 0 ] && a=0; out="$out$sep$a,$((f + ZW)),q=$ZQ"; sep="/"; done
  echo "$out"
}
ZL=$(zones "$FL")
ZP=$(zones "$FP")

run $FF -y -loglevel error -i assets-src/film/master-landscape.mp4 -vf "fps=30,scale=1280:720:flags=lanczos" $COLOR $X264 -level:v 4.0 \
  -crf "$CRF_HD" -g 8 -keyint_min 8 -bf 0 -force_key_frames "$KL" -x264-params "$ZL" build/film/film-hd.mp4
run $FF -y -loglevel error -i assets-src/film/master-landscape.mp4 -vf "fps=30,scale=960:540:flags=lanczos" $COLOR $X264 -level:v 3.1 \
  -crf "$CRF_SD" -g 8 -keyint_min 8 -bf 0 -force_key_frames "$KL" -x264-params "$ZL" build/film/film-sd.mp4
run $FF -y -loglevel error -i assets-src/film/master-portrait.mp4 -vf "fps=24,scale=720:1280:flags=lanczos" $COLOR $X264 -level:v 4.0 \
  -crf "$CRF_P" -g 8 -keyint_min 8 -bf 0 -force_key_frames "$KP" -x264-params "$ZP" build/film/film-portrait.mp4

# stills from the ENCODED files, frame-exact (the poster is exactly the decoded rest frame; end = the last frame)
# AVIF/WebP carry BT.709 so browsers convert them exactly like the video frames
STILL_COLOR="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
still() { # $1 src mp4, $2 frame index, $3 out basename
  run $FF -y -loglevel error -i "$1" -vf "select=eq(n\\,$2),scale=in_color_matrix=bt709:in_range=tv" -frames:v 1 -update 1 -c:v png "build/film/$3.png"
  # spec settings first (AVIF crf 30, WebP q 78); stepped down only while a still is over the 80 KB budget
  local crf=30 q=78
  while :; do
    run $FF -y -loglevel error -i "build/film/$3.png" -vf "scale=out_color_matrix=bt709:out_range=tv" \
      -c:v libaom-av1 -still-picture 1 -crf $crf -cpu-used 4 -pix_fmt yuv420p $STILL_COLOR "build/film/$3.avif"
    [ "$(stat -c %s "build/film/$3.avif")" -le 79000 ] || [ $crf -ge 44 ] && break
    crf=$((crf + 2))
  done
  while :; do
    run $FF -y -loglevel error -i "build/film/$3.png" -c:v libwebp -quality $q -compression_level 6 "build/film/$3.webp"
    [ "$(stat -c %s "build/film/$3.webp")" -le 79000 ] || [ $q -le 50 ] && break
    q=$((q - 4))
  done
  echo "  $3: avif crf $crf $(stat -c %s "build/film/$3.avif") B, webp q $q $(stat -c %s "build/film/$3.webp") B"
}
i=1
for f in $FL; do still build/film/film-hd.mp4 "$f" "ch-$i"; i=$((i+1)); done
i=1
for f in $FP; do still build/film/film-portrait.mp4 "$f" "ch-$i-p"; i=$((i+1)); done
still build/film/film-hd.mp4 479 "end"
still build/film/film-portrait.mp4 383 "end-p"
ls -l build/film
