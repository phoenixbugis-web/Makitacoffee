# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build Vite bundle
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code, built frontend, and assets
COPY server/ ./server/
COPY public/ ./public/
COPY --from=builder /app/dist ./dist

# Create storage folders
RUN mkdir -p /app/server/uploads /app/server/db

EXPOSE 3001

CMD ["node", "server/index.js"]
