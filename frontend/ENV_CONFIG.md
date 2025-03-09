# Environment Configuration for Water360 Frontend

This document explains how environment variables are configured in the Water360 frontend application.

## Overview

The frontend application uses a runtime environment configuration approach that works well with Kubernetes ConfigMaps. This allows you to change environment variables without rebuilding the container.

## How It Works

1. **Environment Variable Injection**:
   - The application uses a `window._env_` object to store environment variables
   - At container startup, the `entrypoint.sh` script generates the `env-config.js` file from a template
   - Kubernetes ConfigMap values are injected into this file

2. **API Configuration**:
   - The API service in `src/utils/api.js` reads configuration from `window._env_` first
   - If not available, it falls back to standard React environment variables (`process.env`)
   - A final fallback to localhost is provided for development

## Deployment with Kubernetes

When deploying with Kubernetes:

1. Update the ConfigMap in `K8s/Frontend/frontend-configmap.yaml`:
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: frontend-config
     namespace: frontend-water360
   data:
     REACT_APP_BACKEND_URL: "http://backend-service:5000"  # Backend service URL
   ```

2. Ensure your Deployment mounts this ConfigMap as environment variables:
   ```yaml
   spec:
     containers:
     - name: frontend
       image: your-frontend-image:tag
       env:
       - name: REACT_APP_BACKEND_URL
         valueFrom:
           configMapKeyRef:
             name: frontend-config
             key: REACT_APP_BACKEND_URL
   ```

## Local Development

For local development:
1. Use the standard `.env` file with `REACT_APP_BACKEND_URL` set
2. The application will read from `process.env.REACT_APP_BACKEND_URL`

## Testing Configuration

To verify your configuration is working:
1. Open browser developer tools
2. Run `console.log(window._env_)` to see injected environment variables
3. The API service will log the base URL on initialization 