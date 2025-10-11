# syntax=docker/dockerfile:1.4
# ============================================================================
# Dependencies Stage - Node.js 22 Alpine 직접 사용
# ============================================================================
FROM node:22-alpine AS deps

# 네이티브 의존성 설치
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@8 --activate

# 시간대 설정
RUN ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# 사용자 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# 의존성 파일만 복사 (변경 시에만 재설치)
COPY package.json pnpm-lock.yaml ./

# BuildKit 마운트 캐시로 pnpm store 재사용
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
    --mount=type=cache,target=/app/.pnpm,sharing=locked \
    pnpm config set network-timeout 300000 && \
    pnpm config set fetch-retries 5 && \
    pnpm install --force --prefer-offline

# ============================================================================
# Builder Stage - 빌드만 담당
# ============================================================================
FROM node:22-alpine AS builder

# 네이티브 의존성 설치
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@8 --activate

# 시간대 설정
RUN ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# 사용자 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# 의존성 복사 (이미 설치됨)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드타임 환경변수
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js 빌드 캐시 활용
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    pnpm build

# ============================================================================
# Runner Stage - 최종 실행 이미지
# ============================================================================
FROM node:22-alpine AS runner

# 네이티브 의존성 설치 (최소한만)
RUN apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# 시간대 설정
RUN ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# 사용자 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# 런타임 환경변수
ENV NODE_ENV=production
ENV TZ=Asia/Seoul
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# standalone 빌드 결과물만 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 간단한 헬스체크 (curl 이미 설치됨)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# non-root 사용자로 실행
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]