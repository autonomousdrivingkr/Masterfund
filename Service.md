# Masterfund 배포 가이드

이 문서는 Masterfund를 클라우드 또는 개인 서버에서 운영하기 위한 방법을 정리합니다.

---

## 목차

1. [배포 방식 비교](#1-배포-방식-비교)
2. [방법 A — Vercel + Supabase (추천, 무료 시작)](#2-방법-a--vercel--supabase-추천)
3. [방법 B — VPS 단일 서버 (Docker Compose)](#3-방법-b--vps-단일-서버)
4. [방법 C — AWS / GCP 클라우드](#4-방법-c--aws--gcp-클라우드)
5. [공통 — 도메인 및 SSL 설정](#5-공통--도메인-및-ssl-설정)
6. [공통 — 환경 변수 체크리스트](#6-공통--환경-변수-체크리스트)
7. [공통 — GitHub Actions CI/CD](#7-공통--github-actions-cicd)
8. [운영 관리](#8-운영-관리)

---

## 1. 배포 방식 비교

| 항목 | Vercel + Supabase | VPS (Docker) | AWS / GCP |
|------|:-----------------:|:------------:|:---------:|
| 난이도 | 쉬움 | 보통 | 어려움 |
| 초기 비용 | 무료 | 월 $5~20 | 월 $20~100+ |
| 확장성 | 자동 | 수동 | 자동 |
| 관리 부담 | 최소 | 중간 | 높음 |
| 추천 시점 | 초기 ~ 중기 | 중기 (비용 절감) | 대규모 서비스 |

---

## 2. 방법 A — Vercel + Supabase (추천)

Next.js 공식 배포 플랫폼 + 무료 PostgreSQL. 설정이 가장 간단합니다.

### 2-1. Supabase 데이터베이스 준비

1. [supabase.com](https://supabase.com) 에서 무료 계정 생성
2. **New project** 생성 (지역: `Northeast Asia (Seoul)` 추천)
3. **Settings → Database → Connection string → URI** 복사

```
postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

4. 로컬에서 마이그레이션 실행 (`.env`의 `DATABASE_URL`을 Supabase URL로 교체 후):

```bash
npx prisma migrate deploy
```

### 2-2. Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프로젝트 배포 (처음 1회)
vercel

# 이후 배포
vercel --prod
```

또는 **GitHub 연동 자동 배포**:
1. [vercel.com](https://vercel.com) → **Add New Project**
2. GitHub 저장소 `Masterfund` 선택
3. `main` 브랜치 push 시 자동 배포

### 2-3. Vercel 환경 변수 설정

Vercel 대시보드 → **Settings → Environment Variables** 에서 추가:

```
DATABASE_URL        = (Supabase Connection URI)
AUTH_SECRET         = (openssl rand -base64 32 으로 생성)
NEXTAUTH_URL        = https://your-domain.vercel.app
```

### 2-4. 최종 확인

```bash
# 마이그레이션 상태 확인
npx prisma migrate status

# 빌드 사전 확인 (로컬)
npm run build
```

**비용**: Vercel 무료 플랜 (월 100GB 대역폭) + Supabase 무료 플랜 (500MB DB, 2GB 파일)으로 초기 운영 가능

---

## 3. 방법 B — VPS 단일 서버

월 $5~10의 VPS(가상 서버)에 Docker Compose로 전체 스택을 운영합니다.  
추천 VPS: **DigitalOcean Droplet**, **Hetzner Cloud**, **Vultr**

### 3-1. 서버 초기 설정

```bash
# Ubuntu 22.04 기준
sudo apt update && sudo apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose 설치
sudo apt install -y docker-compose-plugin

# 재로그인 후 확인
docker --version && docker compose version
```

### 3-2. Docker Compose 파일 작성

서버에 `docker-compose.yml` 생성:

```yaml
# /opt/masterfund/docker-compose.yml

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: masterfund
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal

  app:
    image: ghcr.io/autonomousdrivingkr/masterfund:latest  # 또는 직접 빌드
    restart: unless-stopped
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/masterfund
      AUTH_SECRET: ${AUTH_SECRET}
      NEXTAUTH_URL: https://${DOMAIN}
      NODE_ENV: production
    networks:
      - internal
      - web

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - certbot_data:/etc/letsencrypt
    depends_on:
      - app
    networks:
      - web

volumes:
  postgres_data:
  certbot_data:

networks:
  internal:
  web:
```

### 3-3. Dockerfile 작성

프로젝트 루트에 `Dockerfile` 생성:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

`next.config.ts`에 standalone 출력 추가:

```ts
const nextConfig: NextConfig = {
  output: "standalone",   // 이 줄 추가
  // ... 기존 설정
};
```

### 3-4. Nginx 설정

```nginx
# /opt/masterfund/nginx.conf

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3-5. 서버 배포

```bash
# 서버에 접속 후
mkdir -p /opt/masterfund && cd /opt/masterfund

# .env 파일 생성
cat > .env << EOF
DB_PASSWORD=강력한패스워드입력
AUTH_SECRET=$(openssl rand -base64 32)
DOMAIN=your-domain.com
EOF

# 저장소 클론 및 실행
git clone https://github.com/autonomousdrivingkr/Masterfund.git .
docker compose up -d --build

# DB 마이그레이션
docker compose exec app npx prisma migrate deploy
```

---

## 4. 방법 C — AWS / GCP 클라우드

대규모 서비스가 필요할 때 사용합니다.

### AWS 구성 (권장)

```
Route 53 (도메인)
    ↓
CloudFront (CDN + HTTPS)
    ↓
ALB (로드 밸런서)
    ↓
ECS Fargate (컨테이너 실행) ← ECR (Docker 이미지)
    ↓
RDS PostgreSQL (관리형 DB)
```

### 핵심 서비스

| AWS 서비스 | 역할 | 월 비용 (소규모) |
|-----------|------|----------------|
| ECS Fargate | 앱 서버 (컨테이너) | ~$15 |
| RDS PostgreSQL (t3.micro) | 데이터베이스 | ~$15 |
| ALB | 로드 밸런서 | ~$16 |
| CloudFront | CDN | ~$1 |
| Route 53 | 도메인 관리 | ~$0.5 |

### AWS CLI 배포 요약

```bash
# ECR에 이미지 푸시
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.ap-northeast-2.amazonaws.com

docker build -t masterfund .
docker tag masterfund:latest 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/masterfund:latest
docker push 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/masterfund:latest

# ECS 서비스 업데이트
aws ecs update-service --cluster masterfund --service masterfund-svc --force-new-deployment
```

> GCP는 Cloud Run (서버리스 컨테이너) + Cloud SQL 조합이 AWS ECS와 유사하며 소규모에서 더 저렴합니다.

---

## 5. 공통 — 도메인 및 SSL 설정

### 도메인 구매

추천 등록 기관: **가비아** (한국), **Cloudflare**, **Namecheap**

### SSL 인증서 (VPS 사용 시)

```bash
# Certbot으로 Let's Encrypt 무료 인증서 발급
sudo apt install -y certbot

sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --email your@email.com \
  --agree-tos

# 자동 갱신 확인 (90일마다 자동 갱신됨)
sudo systemctl status certbot.timer
```

### DNS 설정

| 타입 | 이름 | 값 |
|------|------|-----|
| A | `@` | 서버 IP |
| A | `www` | 서버 IP |
| CNAME | `www` | `your-domain.vercel.app` (Vercel 사용 시) |

---

## 6. 공통 — 환경 변수 체크리스트

운영 환경에서 반드시 설정해야 하는 변수:

```env
# 필수
DATABASE_URL=postgresql://...          # 운영 DB 연결 문자열
AUTH_SECRET=...                        # 최소 32자 랜덤 문자열
NEXTAUTH_URL=https://your-domain.com   # 실제 서비스 URL (http 아닌 https)
NODE_ENV=production

# 선택 (추후 추가 예정)
YAHOO_FINANCE_API_KEY=...              # 시세 API 키 (무료 티어 초과 시)
```

> **보안 주의**: `.env` 파일을 절대 Git에 커밋하지 마세요. GitHub Secrets 또는 클라우드 환경 변수 관리 서비스를 사용하세요.

---

## 7. 공통 — GitHub Actions CI/CD

`main` 브랜치에 push 시 자동으로 배포되는 파이프라인 예시입니다.

### Vercel 자동 배포 (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Deploy to Vercel
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### VPS 자동 배포 (`.github/workflows/deploy-vps.yml`)

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build & Push Docker image
        run: |
          echo ${{ secrets.GHCR_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker build -t ghcr.io/autonomousdrivingkr/masterfund:latest .
          docker push ghcr.io/autonomousdrivingkr/masterfund:latest

      - name: Deploy on server via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/masterfund
            docker compose pull
            docker compose up -d --no-build
            docker compose exec -T app npx prisma migrate deploy
```

---

## 8. 운영 관리

### 데이터베이스 백업

```bash
# 수동 백업
docker compose exec db pg_dump -U postgres masterfund > backup_$(date +%Y%m%d).sql

# 복원
docker compose exec -T db psql -U postgres masterfund < backup_20260524.sql

# 자동 백업 (crontab - 매일 새벽 3시)
0 3 * * * /opt/masterfund/backup.sh
```

### 로그 확인

```bash
# VPS — 실시간 로그
docker compose logs -f app

# Vercel — CLI로 확인
vercel logs your-deployment-url
```

### 스케일링 기준

| 월간 활성 사용자 | 권장 구성 |
|----------------|----------|
| ~100명 | Vercel 무료 + Supabase 무료 |
| ~1,000명 | Vercel Pro ($20/월) + Supabase Pro ($25/월) |
| ~10,000명 | VPS 2~4대 + 관리형 DB (RDS 등) |
| 10,000명+ | AWS/GCP 완전 관리형 인프라 |

### 모니터링 (선택)

- **Uptime**: [UptimeRobot](https://uptimerobot.com) — 무료, 5분 간격 헬스체크
- **에러 추적**: [Sentry](https://sentry.io) — 무료 티어 제공
- **성능**: Vercel Analytics (Vercel 사용 시 내장)

---

## 빠른 결정 가이드

```
지금 바로 시작하고 싶다
    → 방법 A (Vercel + Supabase) ✓

비용을 줄이고 데이터를 직접 관리하고 싶다
    → 방법 B (VPS + Docker Compose)

대규모 트래픽, 엔터프라이즈 수준이 필요하다
    → 방법 C (AWS / GCP)
```
