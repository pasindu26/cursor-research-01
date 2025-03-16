#!/bin/bash

echo "Starting Water360 Backend with environment:"
echo "MYSQL_HOST: $MYSQL_HOST"
echo "MYSQL_USER: $MYSQL_USER"
echo "MYSQL_DB: $MYSQL_DB"
echo "FLASK_ENV: $FLASK_ENV"
echo "FRONTEND_URL: $FRONTEND_URL"
echo "CORS_ORIGIN: $CORS_ORIGIN"

# Check for required environment variables
if [ -z "$MYSQL_HOST" ]; then
  echo "WARNING: MYSQL_HOST is not set. Using default value from config."
fi

if [ -z "$MYSQL_USER" ]; then
  echo "WARNING: MYSQL_USER is not set. Using default value from config."
fi

if [ -z "$MYSQL_PASSWORD" ]; then
  echo "WARNING: MYSQL_PASSWORD is not set. Using default value from config."
fi

if [ -z "$MYSQL_DB" ]; then
  echo "WARNING: MYSQL_DB is not set. Using default value from config."
fi

if [ -z "$FRONTEND_URL" ]; then
  echo "WARNING: FRONTEND_URL is not set. Using default value from config."
fi

# Execute the command passed to docker run
exec "$@" 