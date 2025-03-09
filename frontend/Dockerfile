# Use an official Node.js runtime as a parent image
FROM node:16-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Use nginx to serve the static files
FROM nginx:1.21-alpine

# Remove the default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration file
COPY default.conf /etc/nginx/conf.d/

# Copy the build output to nginx's html directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy the env-config template
COPY public/env-config.js.template /usr/share/nginx/html/env-config.js.template

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Start nginx with entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]