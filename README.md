# Masterfund

전 세계 주식, ETF, 채권을 한 곳에서 관리하는 개인 자산 관리 웹 서비스입니다.  
회원별 개인 계정을 통해 포트폴리오를 구성하고, 실시간 시세 연동으로 수익률과 배당 현황을 추적합니다.

---

## 주요 기능

- **회원 관리** — 이메일/패스워드 기반 회원가입 및 로그인
- **포트폴리오** — 테마별 포트폴리오 생성 및 관리 (예: 미국 주식, 한국 주식)
- **자산 등록** — 전 세계 주식·ETF·채권·암호화폐 검색 후 보유 수량·매입가 등록
- **실시간 시세** — Yahoo Finance 연동으로 현재가·수익률·손익 자동 계산
- **다국어 지원** — 한국어 / 영어 (URL 기반: `/ko`, `/en`)

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, TypeScript) |
| 스타일링 | Tailwind CSS v4 |
| 인증 | NextAuth.js v5 (Credentials) |
| ORM | Prisma 7 |
| 데이터베이스 | PostgreSQL 16 |
| 시세 데이터 | Yahoo Finance API (무료) |
| 배포 예정 | Vercel + Supabase |

---

## 시작하기

### 사전 요구사항

- [Node.js 18+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (로컬 DB용)

### 1. 저장소 클론

```bash
git clone https://github.com/captainzone/Masterfund.git
cd Masterfund
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.example`을 복사해 `.env`를 만들고 값을 채워주세요:

```bash
cp .env.example .env
```

```env
# PostgreSQL 연결 문자열
DATABASE_URL="postgresql://postgres:masterfund123@localhost:5432/masterfund"

# NextAuth 시크릿 (아래 명령으로 생성 가능: openssl rand -base64 32)
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. PostgreSQL 실행 (Docker)

```bash
docker run -d \
  --name masterfund-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=masterfund123 \
  -e POSTGRES_DB=masterfund \
  -p 5432:5432 \
  --restart unless-stopped \
  postgres:16-alpine
```

### 5. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev --name init
```

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 프로젝트 구조

```
src/
├── app/
│   ├── [locale]/               # 한국어(/ko), 영어(/en) 라우팅
│   │   ├── page.tsx            # 랜딩 페이지
│   │   ├── login/              # 로그인
│   │   ├── signup/             # 회원가입
│   │   └── dashboard/
│   │       ├── page.tsx        # 대시보드 홈 (포트폴리오 요약)
│   │       └── portfolio/
│   │           ├── page.tsx    # 포트폴리오 목록
│   │           └── [id]/       # 포트폴리오 상세 + 자산 관리
│   └── api/
│       ├── auth/               # NextAuth 핸들러 + 회원가입 API
│       ├── market/             # 종목 검색, 시세 조회 (Yahoo Finance)
│       └── portfolio/          # 포트폴리오·자산 CRUD
├── components/
│   └── layout/Sidebar.tsx      # 대시보드 사이드바
├── i18n/                       # 다국어 설정 (next-intl)
└── lib/
    ├── auth.ts                 # NextAuth 설정
    ├── db.ts                   # Prisma 클라이언트
    └── market.ts               # Yahoo Finance 연동 유틸
messages/
├── ko.json                     # 한국어 번역
└── en.json                     # 영어 번역
prisma/
└── schema.prisma               # DB 스키마 (User, Portfolio, Asset, Transaction, Dividend)
```

---

## 데이터베이스 스키마

```
User ──< Portfolio ──< Asset ──< Transaction
                              └──< Dividend
```

- **User** — 회원 계정 (이메일/패스워드)
- **Portfolio** — 포트폴리오 그룹 (이름, 기준 통화)
- **Asset** — 보유 종목 (심볼, 수량, 평균 매입가)
- **Transaction** — 매수/매도 거래 내역
- **Dividend** — 배당 수령 내역

---

## 주요 명령어

```bash
# 개발 서버
npm run dev

# 타입 체크
npx tsc --noEmit

# DB 스키마 변경 후 마이그레이션
npx prisma migrate dev --name <변경내용>

# Prisma Studio (DB 브라우저 GUI)
npx prisma studio

# Docker 컨테이너 관리
docker start masterfund-db    # 시작
docker stop masterfund-db     # 중지
docker ps                     # 상태 확인
```

---

## 향후 계획

- [ ] 배당 관리 페이지 (수령 내역 입력, 연간 배당수익률 계산)
- [ ] 포트폴리오 수익률 차트 (Recharts)
- [ ] 거래 내역 관리 (매수/매도 기록)
- [ ] Vercel + Supabase 클라우드 배포
- [ ] Google OAuth 소셜 로그인

---

## 라이선스

Private — All rights reserved © 2026 Masterfund
