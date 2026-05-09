#!/bin/bash
# Crash-recovery wrapper — restarts the kiosk if it ever exits unexpectedly.
# Usage: bash run.sh
cd "$(dirname "$0")"
while true; do
  npm start
  echo "App exited. Restarting in 2 seconds..."
  sleep 2
done
