#!/usr/bin/env bash
# State B Database Cleanup Helper Script
# Executes against private Amazon RDS PostgreSQL via psql "$DATABASE_URL"
# Purges stranded k6 synthetic records and verifies 10 permanent seed records remain.
set -u

RUN_ID="${1:?RUN_ID required}"
[[ "$RUN_ID" =~ ^rds-(p[123]-r[123]|smoke-[0-9a-zA-Z]+)$ ]] || {
  echo "Bad RUN_ID: must match rds-pX-rY or rds-smoke-..."
  exit 1
}

# Resolve script directory and output paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${SCRIPT_DIR}/docs/week-3"
LOG="${OUT}/cleanup-${RUN_ID}.log"

mkdir -p "$OUT"

if [ -e "$LOG" ]; then
  echo "Refusing to overwrite $LOG"
  exit 1
fi

# Load DATABASE_URL from .env if not already set in environment
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "${SCRIPT_DIR}/.env" ]; then
    set -a
    source "${SCRIPT_DIR}/.env"
    set +a
  elif [ -f "$HOME/capital-one/.env" ]; then
    set -a
    source "$HOME/capital-one/.env"
    set +a
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set" >&2
  exit 1
fi

{
  echo "RUN_ID=$RUN_ID"
  echo "CLEANUP_START_UTC=$(date -u +%FT%T.%3NZ)"

  PREFIX="k6-${RUN_ID}-%"

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"
  DELETE_RC=$?

  COUNT=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A \
    -c "SELECT count(*) FROM expenses;")
  COUNT_RC=$?

  K6_COUNT=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A \
    -c "SELECT count(*) FROM expenses WHERE title LIKE 'k6-%';")
  K6_RC=$?

  echo "DELETE_EXIT=$DELETE_RC"
  echo "COUNT_EXIT=$COUNT_RC"
  echo "K6_COUNT_EXIT=$K6_RC"
  echo "SEED_COUNT=${COUNT:-ERROR}"
  echo "K6_REMAINING=${K6_COUNT:-ERROR}"

  if [ "$DELETE_RC" -eq 0 ] && [ "$COUNT_RC" -eq 0 ] && \
     [ "$K6_RC" -eq 0 ] && [ "$COUNT" = "10" ] && \
     [ "$K6_COUNT" = "0" ]; then
    echo "CLEANUP_STATUS=OK"
  else
    echo "CLEANUP_STATUS=FAILED"
    exit 1
  fi
} 2>&1 | tee "$LOG"

exit "${PIPESTATUS[0]}"
