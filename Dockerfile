# Stage 1 — build
FROM node:22 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci && chmod -R +x node_modules/.bin/

COPY . .
RUN npm run build

# Stage 2 — serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
