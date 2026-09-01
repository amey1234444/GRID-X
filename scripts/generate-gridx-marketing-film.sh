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

# Four slowly moving plates create a seamless visual sentence:
# network floor -> engineering evidence -> distributed network -> network floor.
# The first plate returns at the end so the browser loop does not jump between subjects.
ffmpeg -hide_banner -loglevel warning -y \
  -loop 1 -framerate 30 -t 3.8 -i "${network_floor}" \
  -loop 1 -framerate 30 -t 3.8 -i "${engineering_evidence}" \
  -loop 1 -framerate 30 -t 3.8 -i "${network_scale}" \
  -loop 1 -framerate 30 -t 3.8 -i "${network_floor}" \
  -filter_complex "
    [0:v]scale=1760:990,
      zoompan=z='min(zoom+0.00042,1.05)':x='iw/2-(iw/zoom/2)+on*0.028':y='ih/2-(ih/zoom/2)':d=114:s=1600x900:fps=30,
      trim=duration=3.8,setpts=PTS-STARTPTS[s0];
    [1:v]scale=1760:990,
      zoompan=z='if(eq(on,0),1.05,max(zoom-0.00038,1.007))':x='iw/2-(iw/zoom/2)-on*0.018':y='ih/2-(ih/zoom/2)+on*0.008':d=114:s=1600x900:fps=30,
      trim=duration=3.8,setpts=PTS-STARTPTS[s1];
    [2:v]scale=1760:990,
      zoompan=z='min(zoom+0.00036,1.045)':x='iw/2-(iw/zoom/2)-on*0.032':y='ih/2-(ih/zoom/2)+on*0.012':d=114:s=1600x900:fps=30,
      trim=duration=3.8,setpts=PTS-STARTPTS[s2];
    [3:v]scale=1760:990,
      zoompan=z='if(eq(on,0),1.045,max(zoom-0.00036,1.005))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=114:s=1600x900:fps=30,
      trim=duration=3.8,setpts=PTS-STARTPTS[s3];
    [s0][s1]xfade=transition=fade:duration=0.7:offset=3.1[x1];
    [x1][s2]xfade=transition=fade:duration=0.7:offset=6.2[x2];
    [x2][s3]xfade=transition=fade:duration=0.7:offset=9.3,
      eq=contrast=1.04:brightness=-0.018:saturation=0.72,
      vignette=PI/7:eval=frame,
      noise=alls=1.2:allf=t,
      format=yuv420p[out]
  " \
  -map "[out]" -t 12.4 -an \
  -c:v libx264 -preset slow -crf 20 -profile:v high -level 4.1 \
  -movflags +faststart "${video_path}"

ffmpeg -hide_banner -loglevel warning -y \
  -ss 0.7 -i "${video_path}" -frames:v 1 -c:v libwebp -quality 82 "${poster_path}"

printf 'Generated %s\n' "${video_path}"
printf 'Generated %s\n' "${poster_path}"
