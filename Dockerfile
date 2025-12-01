# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && \
    mkdir -p /app/uploads/schools-logos && \
    mkdir -p /app/uploads/avatars && \
    mkdir -p /app/uploads/student-photos && \
    mkdir -p /app/uploads/documents

# Create a non-root user with specific UID/GID (1001:1001)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Change ownership of the app directory (EXCEPT node_modules)
RUN chown -R nestjs:nodejs /app && \
    chown -R nestjs:nodejs /app/uploads

# Fix permissions for node_modules (owned by root for security)
RUN chown -R root:root /app/node_modules

# Switch to non-root user
USER nestjs

# Expose the port
EXPOSE 7000

# Start the application
CMD ["node", "dist/main"]