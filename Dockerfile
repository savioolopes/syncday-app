# Dockerfile for SyncDay Frontend (Expo Web)
# Uses pre-built dist folder (built locally with host-accessible API URLs)
# Production stage - serve with nginx
FROM nginx:alpine AS runner

# Copy pre-built assets (built locally with: EXPO_PUBLIC_API_URL=http://localhost:8093 etc.)
COPY dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]