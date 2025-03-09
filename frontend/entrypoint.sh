#!/bin/sh
echo "Injecting environment variables..."

# Create env-config.js from the template
# This approach allows runtime configuration in Kubernetes
envsubst < /usr/share/nginx/html/env-config.js.template > /usr/share/nginx/html/env-config.js

# Log the generated config for debugging (without sensitive data)
echo "Generated env-config.js:"
cat /usr/share/nginx/html/env-config.js

echo "Environment setup complete. Starting server..."

# Start Nginx
exec "$@"
