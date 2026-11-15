#!/usr/bin/env bash
# State B Automated Benchmark Suite Execution Script
# Executes the remaining benchmark runs across P2 and P3:
# - EC2 container telemetry + host vmstat
# - k6 load test results (grafana/k6:2.3.0)
# - Database cleanup and invariant verification (10 records)
# - Artifact synchronization to docs/week-3/

set -e

EC2_HOST="15.206.79.68"
SSH_KEY="$HOME/.ssh/khush-mumbai-key.pem"
BASE_URL="http://${EC2_HOST}:3000"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${LOCAL_DIR}/docs/week-3"

mkdir -p "$OUT_DIR"

RUNS=(
  "P2 rds-p2-r2"
  "P2 rds-p2-r3"
  "P3 rds-p3-r1"
  "P3 rds-p3-r2"
  "P3 rds-p3-r3"
)

for entry in "${RUNS[@]}"; do
  PROFILE=$(echo "$entry" | cut -d' ' -f1)
  RUN_ID=$(echo "$entry" | cut -d' ' -f2)

  echo "================================================================================"
  echo ">>> [$(date -u +%T)] STARTING RUN: ${RUN_ID} (Profile: ${PROFILE}, Target: ${BASE_URL})"
  echo "================================================================================"

  # 1. Start Telemetry on EC2 via background ssh job
  echo "Starting EC2 telemetry for ${RUN_ID}..."
  ssh -i "${SSH_KEY}" -o ConnectTimeout=10 ubuntu@"${EC2_HOST}" "cd /home/ubuntu/clud && ./telemetry-rds-run.sh ${RUN_ID} 165" > /dev/null 2>&1 &
  TELEMETRY_PID=$!

  # 2. Run k6 Load Test from Mac
  START_UTC=$(date -u +%FT%T.%7NZ)
  echo "k6 start: ${START_UTC}"

  set +e
  docker run --rm -i \
    -v "${LOCAL_DIR}/tests/load:/scripts:ro" \
    grafana/k6:2.3.0 run \
    -e BASE_URL="${BASE_URL}" \
    -e PROFILE="${PROFILE}" \
    -e RUN_ID="${RUN_ID}" \
    /scripts/expense-load.js > "${OUT_DIR}/raw-${RUN_ID}.log" 2>&1
  K6_EXIT=$?
  set -e

  END_UTC=$(date -u +%FT%T.%7NZ)
  echo "k6 end: ${END_UTC}, exit code: ${K6_EXIT}"

  cat << EOF > "${OUT_DIR}/timing-${RUN_ID}.log"
RUN_ID=${RUN_ID} PROFILE=${PROFILE}
K6_START_UTC=${START_UTC}
K6_END_UTC=${END_UTC}
K6_EXIT_CODE=${K6_EXIT}
EOF

  # 3. Wait for telemetry process to conclude
  echo "Waiting for EC2 telemetry to conclude..."
  wait $TELEMETRY_PID 2>/dev/null || true
  sleep 3

  # 4. Run cleanup on EC2
  echo "Running cleanup on EC2..."
  ssh -i "${SSH_KEY}" -o ConnectTimeout=10 ubuntu@"${EC2_HOST}" "cd /home/ubuntu/clud && ./cleanup-rds-run.sh ${RUN_ID}"

  # 5. Sync telemetry, vmstat, and cleanup logs back to local Mac
  rsync -avz -e "ssh -i ${SSH_KEY}" "ubuntu@${EC2_HOST}:/home/ubuntu/clud/docs/week-3/*${RUN_ID}*" "${OUT_DIR}/"

  echo ">>> FINISHED RUN: ${RUN_ID}"
  grep -E "Failed Request Percentage|p50 Latency|p95 Latency|p99 Latency|Total HTTP Throughput" "${OUT_DIR}/raw-${RUN_ID}.log" || true
  cat "${OUT_DIR}/cleanup-${RUN_ID}.log"
  echo ""
  sleep 5
done

echo "================================================================================"
echo "ALL STATE B BENCHMARK RUNS COMPLETED SUCCESSFULLY!"
echo "================================================================================"
