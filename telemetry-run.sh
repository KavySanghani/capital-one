#!/usr/bin/env bash
set -u

RUN_ID="${1:?RUN_ID required}"
DURATION="${2:-160}"

[[ "$RUN_ID" =~ ^ec2-p[123]-r[123]$ ]] || { echo "Bad RUN_ID"; exit 1; }

OUT="$HOME/capital-one/docs/week-3"
CSV="$OUT/telemetry-$RUN_ID.csv"
VM="$OUT/vmstat-$RUN_ID.log"

mkdir -p "$OUT"

if [ -e "$CSV" ] || [ -e "$VM" ]; then
  echo "Refusing: output exists for $RUN_ID"
  exit 1
fi

echo "# RUN_ID=$RUN_ID" > "$CSV"
echo "# TELEMETRY_START_UTC=$(date -u +%FT%T.%3NZ)" >> "$CSV"
echo "timestamp_utc,name,cpu_perc,mem_usage,mem_perc,net_io,block_io" >> "$CSV"

vmstat -t 5 31 > "$VM" &
VM_PID=$!

OK=0
FAIL=0
END=$(( $(date +%s) + DURATION ))

while [ "$(date +%s)" -lt "$END" ]; do
  TS=$(date -u +%FT%T.%3NZ)
  SAMPLE=$(docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}" 2>/dev/null)
  RC=$?

  if [ "$RC" -eq 0 ] && [ "$(printf '%s\n' "$SAMPLE" | grep -c .)" -eq 2 ]; then
    printf '%s\n' "$SAMPLE" | while IFS= read -r LINE; do
  echo "$TS,$LINE" >> "$CSV"
done
    OK=$((OK + 1))
  else
    FAIL=$((FAIL + 1))
    echo "Telemetry sample failed at $TS" >&2
  fi

  sleep 5
done

wait "$VM_PID"
VM_RC=$?

echo "# TELEMETRY_END_UTC=$(date -u +%FT%T.%3NZ)" >> "$CSV"
echo "OK=$OK FAIL=$FAIL VMSTAT_EXIT=$VM_RC" | tee -a "$CSV"

if [ "$FAIL" -gt 0 ] || [ "$OK" -lt 20 ] || [ "$VM_RC" -ne 0 ]; then
  echo "TELEMETRY_STATUS=FAILED" | tee -a "$CSV"
  exit 1
fi

echo "TELEMETRY_STATUS=OK" | tee -a "$CSV"