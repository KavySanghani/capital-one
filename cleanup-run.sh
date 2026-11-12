#!/usr/bin/env bash
set -u

RUN_ID="${1:?RUN_ID required}"
[[ "$RUN_ID" =~ ^ec2-p[123]-r[123]$ ]] || {
  echo "Bad RUN_ID"
  exit 1
}

CONTAINER="capital-one-postgres-1"
OUT="$HOME/capital-one/docs/week-3"
LOG="$OUT/cleanup-$RUN_ID.log"

mkdir -p "$OUT"

if [ -e "$LOG" ]; then
  echo "Refusing to overwrite $LOG"
  exit 1
fi

{
  echo "RUN_ID=$RUN_ID"
  echo "CLEANUP_START_UTC=$(date -u +%FT%T.%3NZ)"

  PREFIX="k6-${RUN_ID}-%"

  docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 \
    -U expense_user -d expense_tracker \
    -c "DELETE FROM expenses WHERE title LIKE '$PREFIX';"
  DELETE_RC=$?

  COUNT=$(docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 \
    -U expense_user -d expense_tracker -t -A \
    -c "SELECT count(*) FROM expenses;")
  COUNT_RC=$?

  K6_COUNT=$(docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 \
    -U expense_user -d expense_tracker -t -A \
    -c "SELECT count(*) FROM expenses WHERE title LIKE 'k6-%';")
  K6_RC=$?

  echo "DELETE_EXIT=$DELETE_RC"
  echo "COUNT_EXIT=$COUNT_RC"
  echo "K6_COUNT_EXIT=$K6_RC"
  echo "SEED_COUNT=${COUNT:-ERROR}"
  echo "K6_REMAINING=${K6_COUNT:-ERROR}"

  if [ "$DELETE_RC" -eq 0 ] && [ "$COUNT_RC" -eq 0 ] &&
     [ "$K6_RC" -eq 0 ] && [ "$COUNT" = "10" ] &&
     [ "$K6_COUNT" = "0" ]; then
    echo "CLEANUP_STATUS=OK"
  else
    echo "CLEANUP_STATUS=FAILED"
    exit 1
  fi
} 2>&1 | tee "$LOG"

exit "${PIPESTATUS[0]}"