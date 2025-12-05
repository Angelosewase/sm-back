# Build stage
FROM node:20-slim as builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build


# Production stage
FROM node:20-slim

WORKDIR /app

# Install Chromium + necessary libs
RUN apt-get update && apt-get install -y \
    chromium \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libnss3 \
    libxss1 \
    libx11-xcb1 \
    libxrandr2 \
    libdrm2 \
    libgbm1 \
    libxkbcommon0 \
    libgtk-3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

# Create uploads directories
RUN mkdir -p /app/uploads/schools-logos \
    /app/uploads/avatars \
    /app/uploads/student-photos \
    /app/uploads/documents

# Add non-root user
RUN useradd -m -u 1001 nestjs

RUN chown -R nestjs:nestjs /app

USER nestjs

EXPOSE 7000

CMD ["node", "dist/main"]
