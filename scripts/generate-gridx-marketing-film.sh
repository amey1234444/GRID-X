#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "${script_dir}/.." && pwd)"
media_dir="${repo_dir}/apps/web/public/media"
source_dir="${media_dir}/film-source"
video_path="${media_dir}/gridx-control-network.mp4"
poster_path="${media_dir}/gridx-control-network-poster.webp"

network_floor="${source_dir}/network-floor.webp"
engineering_evidence="${source_dir}/engineering-evidence.webp"
network_scale="${source_dir}/network-scale.webp"

for source in "${network_floor}" "${engineering_evidence}" "${network_scale}"; do
  if [[ ! -f "${source}" ]]; then
    printf 'Missing film plate: %s\n' "${source}" >&2
    exit 1
  fi
done

# Four plates create one seamless visual sentence:
# network floor -> engineering evidence -> distributed network -> network floor.
#
# The old encode asked zoompan to generate 114 output frames for every input frame. That made its
# whole-pixel crop rounding visible as periodic vibration. This version feeds one source frame into
# one output frame (`d=1`) at 60 fps, keeps the movement centred, and removes synthetic per-frame
# noise. Motion now comes from continuous optical scaling and long dissolves rather than lateral
# crop jumps. Returning to the first plate keeps the browser loop visually closed.
ffmpeg -hide_banner -loglevel warning -y \
  -loop 1 -framerate 60 -t 3.8 -i "${network_floor}" \
  -loop 1 -framerate 60 -t 3.8 -i "${engineering_evidence}" \
  -loop 1 -framerate 60 -t 3.8 -i "${network_scale}" \
  -loop 1 -framerate 60 -t 3.8 -i "${network_floor}" \
  -filter_complex "
    [0:v]scale=3200:1800:flags=lanczos,
      zoompan=z='1.012+on*0.000038':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=1600x900:fps=60,
      trim=duration=3.8,setpts=PTS-STARTPTS[s0];
    [1:v]scale=3200:1800:flags=lanczos,
      zoompan=z='1.023-on*0.000035':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=1600x900:fps=60,
      trim=duration=3.8,setpts=PTS-STARTPTS[s1];
    [2:v]scale=3200:1800:flags=lanczos,
      zoompan=z='1.01+on*0.00004':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=1600x900:fps=60,
      trim=duration=3.8,setpts=PTS-STARTPTS[s2];
    [3:v]scale=3200:1800:flags=lanczos,
      zoompan=z='1.022-on*0.000036':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=1600x900:fps=60,
      trim=duration=3.8,setpts=PTS-STARTPTS[s3];
    [s0][s1]xfade=transition=fade:duration=0.8:offset=3.0[x1];
    [x1][s2]xfade=transition=fade:duration=0.8:offset=6.0[x2];
    [x2][s3]xfade=transition=fade:duration=0.8:offset=9.0,
      eq=contrast=1.035:brightness=-0.012:saturation=0.74,
      vignette=PI/7:eval=frame,
      format=yuv420p[out]
  " \
  -map "[out]" -t 12.0 -an \
  -c:v libx264 -preset slow -crf 20 -profile:v high -level 4.2 \
  -x264-params "aq-mode=3:deblock=-1,-1" \
  -movflags +faststart "${video_path}"

ffmpeg -hide_banner -loglevel warning -y \
  -ss 0.7 -i "${video_path}" -frames:v 1 -c:v libwebp -quality 82 "${poster_path}"

printf 'Generated %s\n' "${video_path}"
printf 'Generated %s\n' "${poster_path}"
