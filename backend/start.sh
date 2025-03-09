#!/bin/bash
# Backend Startup Script
# ---------------------
# This script starts the backend application using Gunicorn

set -e  # Exit on error

# Configuration
APP_DIR="$(dirname "$0")"
LOG_DIR="$APP_DIR/logs"
WORKERS=4
PORT=5000

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Activate virtual environment if it exists
if [ -d "$APP_DIR/venv" ]; then
    source "$APP_DIR/venv/bin/activate"
fi

# Install or update dependencies
echo "Installing/updating dependencies..."
pip install -r "$APP_DIR/requirements.txt"

# Start the application with Gunicorn
echo "Starting application with Gunicorn..."
cd "$APP_DIR"

# Run with Gunicorn
gunicorn --bind 0.0.0.0:$PORT \
         --workers $WORKERS \
         --log-file "$LOG_DIR/gunicorn.log" \
         --access-logfile "$LOG_DIR/access.log" \
         --error-logfile "$LOG_DIR/error.log" \
         --capture-output \
         --daemon \
         wsgi:app

echo "Application started on port $PORT with $WORKERS workers"
echo "Logs are available in $LOG_DIR"

# Check if the application is running
sleep 2
if curl -s http://localhost:$PORT/api/health > /dev/null; then
    echo "Health check passed. Application is running correctly."
else
    echo "Health check failed. Check the logs for errors."
    exit 1
fi 