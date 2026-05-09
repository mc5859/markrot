#!/bin/bash
# Crash-recovery wrapper — restarts the kiosk if it ever exits unexpectedly.
# Usage: bash run.sh
cd "$(dirname "$0")"
while true; do
  npm start
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    echo "App exited cleanly."
    break
  fi
  echo "App crashed (code $EXIT_CODE). Restarting in 2 seconds..."
  sleep 2
done
