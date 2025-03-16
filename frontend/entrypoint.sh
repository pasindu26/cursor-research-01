#!/bin/sh
echo "Injecting environment variables..."

# Check for required environment variables
if [ -z "$REACT_APP_BACKEND_URL" ]; then
  echo "WARNING: REACT_APP_BACKEND_URL is not set. The application may not function correctly."
  # Set a default value to prevent template errors
  export REACT_APP_BACKEND_URL="http://localhost:5000"
fi

# Set default values for optional environment variables if not provided
if [ -z "$REACT_APP_ENV" ]; then
  export REACT_APP_ENV="production"
fi

if [ -z "$REACT_APP_VERSION" ]; then
  export REACT_APP_VERSION="1.0.0"
fi

if [ -z "$REACT_APP_API_TIMEOUT" ]; then
  export REACT_APP_API_TIMEOUT="30000"
fi

# Create env-config.js from the template
# This approach allows runtime configuration in Kubernetes
envsubst < /usr/share/nginx/html/env-config.js.template > /usr/share/nginx/html/env-config.js

# Log the generated config for debugging (without sensitive data)
echo "Generated env-config.js:"
cat /usr/share/nginx/html/env-config.js

echo "Environment setup complete. Starting server..."

# Start Nginx
exec "$@"
