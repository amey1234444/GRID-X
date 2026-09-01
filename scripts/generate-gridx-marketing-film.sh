#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "${script_dir}/.." && pwd)"
output_dir="${repo_dir}/apps/web/public/media"
video_path="${output_dir}/gridx-control-network.mp4"
poster_path="${output_dir}/gridx-control-network-poster.webp"
font_sans="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
font_mono="/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

mkdir -p "${output_dir}"

ffmpeg -hide_banner -loglevel warning -y \
  -f lavfi -i "color=c=#050505:s=1600x900:r=24:d=10" \
  -vf "
    drawgrid=w=80:h=80:t=1:c=white@0.022,
    drawbox=x='-40+24*sin(t*0.22)':y=74:w=1700:h=1:c=white@0.075:t=fill,
    drawbox=x='-40+18*sin(t*0.18)':y=816:w=1700:h=1:c=white@0.055:t=fill,
    drawbox=x='260+12*sin(t*0.28)':y='92+8*cos(t*0.24)':w=1080:h=640:c=#111111@0.96:t=fill,
    drawbox=x='260+12*sin(t*0.28)':y='92+8*cos(t*0.24)':w=1080:h=640:c=white@0.12:t=1,
    drawbox=x='260+12*sin(t*0.28)':y='92+8*cos(t*0.24)':w=1080:h=54:c=#151515@1:t=fill,
    drawbox=x='260+12*sin(t*0.28)':y='146+8*cos(t*0.24)':w=260:h=586:c=#0b0b0b@1:t=fill,
    drawbox=x='520+12*sin(t*0.28)':y='146+8*cos(t*0.24)':w=1:h=586:c=white@0.075:t=fill,
    drawbox=x='1045+12*sin(t*0.28)':y='146+8*cos(t*0.24)':w=1:h=586:c=white@0.075:t=fill,
    drawbox=x='280+12*sin(t*0.28)':y='198+8*cos(t*0.24)':w=216:h=42:c=#181818@1:t=fill,
    drawbox=x='280+12*sin(t*0.28)':y='198+8*cos(t*0.24)':w=3:h=42:c=#ebebeb@0.9:t=fill,
    drawbox=x='280+12*sin(t*0.28)':y='257+8*cos(t*0.24)':w=216:h=42:c=#101010@1:t=fill,
    drawbox=x='280+12*sin(t*0.28)':y='316+8*cos(t*0.24)':w=216:h=42:c=#101010@1:t=fill,
    drawbox=x='280+12*sin(t*0.28)':y='375+8*cos(t*0.24)':w=216:h=42:c=#101010@1:t=fill,
    drawbox=x='548+12*sin(t*0.28)':y='178+8*cos(t*0.24)':w=470:h=80:c=#171717@1:t=fill,
    drawbox=x='548+12*sin(t*0.28)':y='178+8*cos(t*0.24)':w=470:h=80:c=white@0.09:t=1,
    drawbox=x='548+12*sin(t*0.28)':y='278+8*cos(t*0.24)':w=470:h=154:c=#141414@1:t=fill,
    drawbox=x='548+12*sin(t*0.28)':y='278+8*cos(t*0.24)':w=470:h=154:c=white@0.085:t=1,
    drawbox=x='568+12*sin(t*0.28)':y='333+8*cos(t*0.24)':w=430:h=1:c=white@0.06:t=fill,
    drawbox=x='568+12*sin(t*0.28)':y='376+8*cos(t*0.24)':w=430:h=1:c=white@0.06:t=fill,
    drawbox=x='548+12*sin(t*0.28)':y='452+8*cos(t*0.24)':w=470:h=228:c=#101010@1:t=fill,
    drawbox=x='548+12*sin(t*0.28)':y='452+8*cos(t*0.24)':w=470:h=228:c=white@0.08:t=1,
    drawbox=x='574+12*sin(t*0.28)':y='502+8*cos(t*0.24)':w=52:h=128:c=#171717@1:t=fill,
    drawbox=x='646+12*sin(t*0.28)':y='532+8*cos(t*0.24)':w=52:h=98:c=#1d1d1d@1:t=fill,
    drawbox=x='718+12*sin(t*0.28)':y='484+8*cos(t*0.24)':w=52:h=146:c=#222222@1:t=fill,
    drawbox=x='790+12*sin(t*0.28)':y='553+8*cos(t*0.24)':w=52:h=77:c=#191919@1:t=fill,
    drawbox=x='862+12*sin(t*0.28)':y='514+8*cos(t*0.24)':w=52:h=116:c=#262626@1:t=fill,
    drawbox=x='934+12*sin(t*0.28)':y='470+8*cos(t*0.24)':w=52:h=160:c=#303030@1:t=fill,
    drawbox=x='1068+12*sin(t*0.28)':y='178+8*cos(t*0.24)':w=248:h=202:c=#161616@1:t=fill,
    drawbox=x='1068+12*sin(t*0.28)':y='178+8*cos(t*0.24)':w=248:h=202:c=white@0.09:t=1,
    drawbox=x='1088+12*sin(t*0.28)':y='232+8*cos(t*0.24)':w=208:h=38:c=#202020@1:t=fill,
    drawbox=x='1088+12*sin(t*0.28)':y='284+8*cos(t*0.24)':w=208:h=38:c=#202020@1:t=fill,
    drawbox=x='1088+12*sin(t*0.28)':y='336+8*cos(t*0.24)':w=208:h=2:c=#dff900@0.72:t=fill,
    drawbox=x='1068+12*sin(t*0.28)':y='402+8*cos(t*0.24)':w=248:h=278:c=#101010@1:t=fill,
    drawbox=x='1068+12*sin(t*0.28)':y='402+8*cos(t*0.24)':w=248:h=278:c=white@0.08:t=1,
    drawbox=x='1088+12*sin(t*0.28)':y='456+8*cos(t*0.24)':w=208:h=50:c=#171717@1:t=fill,
    drawbox=x='1088+12*sin(t*0.28)':y='520+8*cos(t*0.24)':w=208:h=50:c=#171717@1:t=fill,
    drawbox=x='1088+12*sin(t*0.28)':y='584+8*cos(t*0.24)':w=208:h=50:c=#171717@1:t=fill,
    drawbox=x='260+12*sin(t*0.28)':y='92+mod(t*72,640)':w=1080:h=1:c=white@0.055:t=fill,
    drawbox=x='520+mod(t*135,525)':y='418+8*cos(t*0.24)':w=44:h=2:c=#dff900@0.65:t=fill,
    drawbox=x='1068+mod(t*72,208)':y='674+8*cos(t*0.24)':w=24:h=2:c=white@0.48:t=fill,
    drawtext=fontfile=${font_sans}:text='GRID-X':x='296+12*sin(t*0.28)':y='108+8*cos(t*0.24)':fontsize=18:fontcolor=white@0.92,
    drawtext=fontfile=${font_mono}:text='CONTROL NETWORK / LIVE':x='408+12*sin(t*0.28)':y='112+8*cos(t*0.24)':fontsize=11:fontcolor=white@0.38,
    drawtext=fontfile=${font_mono}:text='96.4%':x='1245+12*sin(t*0.28)':y='112+8*cos(t*0.24)':fontsize=12:fontcolor=#dff900@0.84:expansion=none,
    drawtext=fontfile=${font_mono}:text='COMMAND':x='292+12*sin(t*0.28)':y='166+8*cos(t*0.24)':fontsize=10:fontcolor=white@0.3,
    drawtext=fontfile=${font_sans}:text='Overview':x='306+12*sin(t*0.28)':y='211+8*cos(t*0.24)':fontsize=14:fontcolor=white@0.82,
    drawtext=fontfile=${font_sans}:text='Production':x='306+12*sin(t*0.28)':y='270+8*cos(t*0.24)':fontsize=14:fontcolor=white@0.44,
    drawtext=fontfile=${font_sans}:text='Materials':x='306+12*sin(t*0.28)':y='329+8*cos(t*0.24)':fontsize=14:fontcolor=white@0.44,
    drawtext=fontfile=${font_sans}:text='Quality':x='306+12*sin(t*0.28)':y='388+8*cos(t*0.24)':fontsize=14:fontcolor=white@0.44,
    drawtext=fontfile=${font_mono}:text='JOB-00412 / RELEASED':x='568+12*sin(t*0.28)':y='195+8*cos(t*0.24)':fontsize=11:fontcolor=white@0.42,
    drawtext=fontfile=${font_sans}:text='Pump housing / Rev C':x='568+12*sin(t*0.28)':y='220+8*cos(t*0.24)':fontsize=20:fontcolor=white@0.88,
    drawtext=fontfile=${font_mono}:text='EVIDENCE TRAIL':x='568+12*sin(t*0.28)':y='295+8*cos(t*0.24)':fontsize=10:fontcolor=white@0.3,
    drawtext=fontfile=${font_sans}:text='Drawing acknowledged':x='590+12*sin(t*0.28)':y='346+8*cos(t*0.24)':fontsize=13:fontcolor=white@0.68,
    drawtext=fontfile=${font_sans}:text='Material reconciled':x='590+12*sin(t*0.28)':y='389+8*cos(t*0.24)':fontsize=13:fontcolor=white@0.68,
    drawtext=fontfile=${font_mono}:text='ACCEPTED OUTPUT / 7 DAYS':x='568+12*sin(t*0.28)':y='468+8*cos(t*0.24)':fontsize=10:fontcolor=white@0.3,
    drawtext=fontfile=${font_mono}:text='PARTNER SIGNAL':x='1088+12*sin(t*0.28)':y='196+8*cos(t*0.24)':fontsize=10:fontcolor=white@0.3,
    drawtext=fontfile=${font_sans}:text='Shakti Works':x='1104+12*sin(t*0.28)':y='244+8*cos(t*0.24)':fontsize=13:fontcolor=white@0.72,
    drawtext=fontfile=${font_sans}:text='Precision Auto':x='1104+12*sin(t*0.28)':y='296+8*cos(t*0.24)':fontsize=13:fontcolor=white@0.72,
    drawtext=fontfile=${font_mono}:text='PAYMENT GATE':x='1088+12*sin(t*0.28)':y='420+8*cos(t*0.24)':fontsize=10:fontcolor=white@0.3,
    drawtext=fontfile=${font_sans}:text='Quantity / passed':x='1102+12*sin(t*0.28)':y='473+8*cos(t*0.24)':fontsize=12:fontcolor=white@0.67,
    drawtext=fontfile=${font_sans}:text='Quality / passed':x='1102+12*sin(t*0.28)':y='537+8*cos(t*0.24)':fontsize=12:fontcolor=white@0.67,
    drawtext=fontfile=${font_sans}:text='Material / passed':x='1102+12*sin(t*0.28)':y='601+8*cos(t*0.24)':fontsize=12:fontcolor=white@0.67,
    rotate='-0.018+0.003*sin(t*0.24)':fillcolor=#050505,
    vignette=PI/5:eval=frame,
    noise=alls=2.4:allf=t,
    format=yuv420p
  " \
  -an -c:v libx264 -preset slow -crf 25 -profile:v high -level 4.0 \
  -movflags +faststart "${video_path}"

ffmpeg -hide_banner -loglevel warning -y \
  -ss 4 -i "${video_path}" -frames:v 1 -c:v libwebp -quality 78 "${poster_path}"

printf 'Generated %s\n' "${video_path}"
printf 'Generated %s\n' "${poster_path}"
