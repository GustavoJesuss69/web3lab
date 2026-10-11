#!/usr/bin/env bash
# Builds out/web3lab-tx-journey.mp4 from frames/ (1740 JPEGs, 58 s at 30 fps) and out/mix.wav.
set -euo pipefail
mkdir -p out
ffmpeg -y -loglevel error -i out/mix.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 out/master.wav
ffmpeg -y -loglevel error -framerate 30 -i frames/f%05d.jpg -i out/master.wav -c:v libx264 -preset slow -crf 20 \
  -maxrate 4000k -bufsize 8000k -pix_fmt yuv420p -profile:v high -c:a aac -b:a 160k -shortest -movflags +faststart \
  out/web3lab-tx-journey.mp4
ls -l out/web3lab-tx-journey.mp4
