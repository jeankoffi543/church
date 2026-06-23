#!/bin/sh
# Called by Nginx `exec_record_done` with: $1 = recorded FLV path, $2 = stream key.
# Remux FLV → MP4 (web-friendly), notify the API to attach it to the archive,
# then drop the FLV. Logs to /recordings/record.log for debugging.
set -u

FLV="$1"
KEY="${2:-}"
MP4="${FLV%.flv}.mp4"
LOG="/recordings/record.log"
API="http://host.docker.internal:8001/api/v1/public/rtmp/recorded"

echo "[$(date)] record-done flv=$FLV key=$KEY" >>"$LOG" 2>&1

ffmpeg -y -i "$FLV" -c copy -movflags +faststart "$MP4" >>"$LOG" 2>&1 || {
  echo "[$(date)] ffmpeg FAILED — keeping FLV" >>"$LOG" 2>&1
  exit 0
}

curl -s -X POST "$API" \
  --data-urlencode "name=$KEY" \
  --data-urlencode "file=$(basename "$MP4")" >>"$LOG" 2>&1

echo "[$(date)] notified API with $(basename "$MP4")" >>"$LOG" 2>&1
rm -f "$FLV"
