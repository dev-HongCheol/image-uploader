# Dependencies stage
FROM node:20.11-slim AS deps
WORKDIR /app

# pnpm 설치 및 설정
RUN corepack enable && corepack prepare pnpm@8 --activate

# 의존성 파일만 복사
COPY package.json pnpm-lock.yaml ./

# 의존성 설치 (재시도 및 타임아웃 설정)
RUN pnpm config set network-timeout 300000 && \
    pnpm install --frozen-lockfile --no-optional

# Builder stage
FROM node:20.11-slim AS builder
WORKDIR /app

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@8 --activate

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 환경변수 (빌드타임)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NODE_ENV=production

# Next.js 빌드
RUN pnpm build

# Runner stage
FROM node:20.11-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Seoul

RUN ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime

# standalone 출력물과 필요한 파일만 복사
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]