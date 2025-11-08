# Image Uploader

Next.js 15 기반의 현대적인 파일 관리 웹 애플리케이션입니다. 

반응형웹을 지원하며 하이브리드 폴더 시스템과 효율적인 파일 관리 기능을 제공하며, Supabase 자체 호스팅으로 완전한 데이터 제어가 가능합니다.

## ✨ 주요 기능

### 📁 하이브리드 폴더 시스템

- **논리적/물리적 분리 아키텍처**: 사용자가 보는 폴더 구조와 실제 파일 저장 위치를 분리하여 성능과 유연성 확보
- **계층형 폴더 구조**: 최대 10레벨 깊이의 폴더 트리 생성 가능
- **빠른 파일 이동**: 메타데이터만 변경하여 실제 파일 이동 없이 즉시 처리
- **자동 폴더 관리**: 1000개 파일마다 자동으로 새 물리적 저장 폴더 생성
- **순환 참조 방지**: 데이터베이스 트리거로 폴더 구조 무결성 보장
- **폴더 커스터마이징**: 색상, 설명 등 폴더별 메타데이터 지원

### 🖼️ 스마트 이미지 처리

- **HEIC 자동 변환**: Apple 기기의 HEIC 이미지를 JPEG로 서버 사이드에서 자동 변환
- **썸네일 자동 생성**: 이미지 업로드 시 최적화된 썸네일 자동 생성 (Sharp 사용)
- **EXIF 메타데이터 추출**: 사진 촬영 날짜, 위치 등 메타데이터 자동 추출 및 저장
- **멀티 파일 업로드**: 한 번에 최대 10개 파일 동시 업로드
- **파일 타입 감지**: 자동 MIME 타입 분류 (image, video, document, other)

### 🔐 인증 및 보안

- **Google OAuth**: 간편한 구글 계정 로그인 (Google One-Tap 지원)
- **세션 관리**: Supabase Auth를 통한 안전한 세션 관리 및 자동 갱신
- **사용자 격리**: 모든 데이터는 사용자별로 완전히 격리
- **권한 검증**: 모든 API 요청에서 사용자 권한 자동 검증
- **미들웨어 보호**: 인증되지 않은 접근 자동 차단

### 🎨 현대적인 UI/UX

- **반응형 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원
- **다크 모드**: 시스템 설정 연동 및 수동 전환 가능
- **실시간 피드백**: 업로드 진행률, 토스트 알림 등
- **터치 지원**: 모바일 터치 제스처 최적화

## 🛠️ 기술 스택

### Frontend

| 카테고리 | 기술 | 버전 | 용도 |
|---------|------|------|------|
| **프레임워크** | Next.js | 15.3.5 | App Router, RSC, Server Actions |
| | React | 19.0.0 | UI 라이브러리 |
| | TypeScript | 5.x | 타입 안정성 |
| **스타일링** | TailwindCSS | 4.1.11 | 유틸리티 CSS |
| | shadcn/ui | - | Radix UI 기반 컴포넌트 |
| | Lucide React | 0.525.0 | 아이콘 라이브러리 |
| | next-themes | 0.4.6 | 다크 모드 |
| **상태 관리** | TanStack Query | 5.90.2 | 서버 상태 관리 |
| | React Hook Form | 7.61.1 | 폼 상태 관리 |
| | Zod | 4.0.10 | 스키마 검증 |
| **유틸리티** | clsx + tailwind-merge | - | 클래스 병합 |
| | class-variance-authority | 0.7.1 | 컴포넌트 변형 |
| | use-debounce | 10.0.5 | 디바운스 |
| | Immer | 10.1.1 | 불변성 관리 |

### Backend & Database

| 카테고리 | 기술 | 용도 |
|---------|------|------|
| **Database** | PostgreSQL | Supabase 자체 호스팅 |
| **인증** | Supabase Auth | Google OAuth |
| **스토리지** | Supabase Storage | 파일 저장 (originals, thumbnails) |
| **ORM** | Supabase JS | 2.56.0 |
| **이미지 처리** | Sharp | 0.34.3 (썸네일 생성, 리사이징) |
| | heic-convert | 2.1.0 (HEIC → JPEG 서버) |
| | heic2any | 0.0.4 (HEIC 변환 클라이언트) |
| | ExifReader | 4.32.0 (메타데이터 추출) |

### DevOps & 개발 도구

- **Docker**: Supabase 자체 호스팅
- **ESLint **: 코드 품질 관리
- **Prettier **: 코드 포맷팅 (Tailwind 플러그인 포함)
- **Turbopack**: 빠른 개발 서버

## 📂 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/                    # 인증 필수 라우트 그룹
│   │   ├── _/                     # 내부 컴포넌트
│   │   │   ├── components/
│   │   │   │   ├── contentList/  # 파일/폴더 리스트 컴포넌트
│   │   │   │   │   ├── dialogs/  # 다이얼로그 (추가, 상세, 이동, 관리)
│   │   │   │   │   └── selectedFileControlPanel/
│   │   │   │   └── header/       # 헤더 (경로, 모드 선택)
│   │   │   ├── hooks/             # 커스텀 훅 (파일 선택, 터치)
│   │   │   ├── AuthProvider.tsx
│   │   │   └── useThumbnail.ts
│   │   ├── actions.ts             # Server Actions
│   │   ├── layout.tsx
│   │   └── page.tsx               # 메인 페이지
│   ├── auth/login/                # 로그인 페이지
│   ├── api/                       # API Routes
│   │   ├── content/               # 통합 컨텐츠 조회 (폴더+파일)
│   │   ├── files/                 # 파일 관리 (이동, 삭제)
│   │   ├── folders/               # 폴더 CRUD + 이동
│   │   └── upload/                # 파일 업로드
│   ├── _components/               # 전역 컴포넌트
│   ├── globals.css
│   └── layout.tsx                 # 루트 레이아웃
│
├── components/ui/                 # shadcn/ui 컴포넌트 (14개)
├── constants/                     # 공통 상수, 라우트
├── hooks/                         # 전역 커스텀 훅
├── lib/
│   ├── api/                       # API 클라이언트 함수
│   ├── query-client.ts            # TanStack Query 설정
│   └── utils.ts                   # 유틸리티 함수
├── types/                         # 타입 정의
└── utils/
    ├── supabase/                  # Supabase 클라이언트 (client, server, middleware)
    ├── folder-system.ts           # 폴더 시스템 핵심 로직
    ├── thumbnail.ts               # 썸네일 생성
    ├── media-metadata.ts          # EXIF 추출
    └── heic.ts                    # HEIC 변환

database/
├── 01_init_schema.sql             # 초기 스키마 생성
└── 02_reset_data.sql              # 데이터 리셋 (백업 포함)
```

## 🚀 시작하기

### 필수 요구사항

- Node.js 20 이상
- pnpm (권장) 또는 npm
- Docker & Docker Compose (Supabase 자체 호스팅용)
- Google Cloud Console 프로젝트 (OAuth)

### 1. 저장소 클론

```bash
git clone <repository-url>
cd image-uploader
```

### 2. 의존성 설치

```bash
pnpm install
```

#### Google Auth 설정

`.env` 파일에서 docker-compose.yml의 `auth` 서비스 환경 변수 추가:

```yml
auth:
  environment:
    GOTRUE_EXTERNAL_GOOGLE_ENABLED: "true"
    GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: "your-google-client-id"
    GOTRUE_EXTERNAL_GOOGLE_SECRET: "your-google-secret"
    GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: "http://localhost:54321/auth/v1/callback"
```

> **참고**: [Supabase 자체 호스팅 가이드](https://supabase.com/docs/guides/self-hosting)

### 4. 환경 변수 설정

`.env.local` 파일 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 5. 데이터베이스 마이그레이션

Supabase Dashboard에서 SQL Editor를 열고 다음 순서로 실행:

```sql
-- 1. 스키마 초기화
\i database/01_init_schema.sql

-- (선택) 데이터 리셋이 필요한 경우
\i database/02_reset_data.sql
```

### 6. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 http://localhost:3000 접속

### 7. 프로덕션 빌드

```bash
pnpm build
pnpm start
```

## 📊 데이터베이스 구조

### 🏗️ 하이브리드 폴더 아키텍처

```
📁 논리적 구조 (사용자가 보는 것)
├── My Files/                      # 루트 폴더 (자동 생성)
│   ├── 개인/
│   │   ├── 사진/
│   │   │   ├── 2024년/
│   │   │   │   ├── 여행/
│   │   │   │   └── 일상/
│   │   │   └── 2023년/
│   │   └── 문서/
│   └── 업무/
│       ├── 프로젝트 A/
│       └── 프로젝트 B/

💾 물리적 저장 (Supabase Storage)
├── {userId}/folder_000/           # 실제 파일 위치 (최대 1000개)
├── {userId}/folder_001/
└── {userId}/folder_002/
```

**핵심 개념**: 사용자가 파일을 이동하면 DB의 `folder_id`만 변경되고, 실제 파일은 물리적 위치에 그대로 유지됩니다.

### 📋 테이블 구조

#### 1. `folders` - 논리적 폴더 구조

사용자가 보는 폴더 트리를 관리

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  full_path TEXT,                    -- 자동 계산: "/My Files/사진/2024년"
  depth INTEGER DEFAULT 0,            -- 0~10 (루트는 0)
  is_system_folder BOOLEAN DEFAULT false,
  folder_color VARCHAR(7),            -- HEX 색상 (예: #FF5733)
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**주요 기능**:
- 자동 경로 계산 트리거 (`full_path`, `depth`)
- 순환 참조 방지 트리거
- 부모 폴더 삭제 시 하위 폴더도 CASCADE 삭제
- 이름 변경 시 하위 폴더 경로 자동 업데이트

#### 2. `storage_folders` - 물리적 저장 관리

실제 Supabase Storage 폴더를 관리

```sql
CREATE TABLE storage_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_index INTEGER NOT NULL,      -- 0, 1, 2... (순차 증가)
  storage_path TEXT NOT NULL,         -- "userId/folder_000"
  file_count INTEGER DEFAULT 0,
  max_file_count INTEGER DEFAULT 1000,
  total_size BIGINT DEFAULT 0,        -- bytes
  is_active BOOLEAN DEFAULT true,     -- false면 새 파일 업로드 불가
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, folder_index)
);
```

**자동 관리**:
- 파일 업로드 시 활성 폴더 자동 선택
- 1000개 도달 시 `is_active = false`, 새 폴더 자동 생성
- 파일 삭제 시 `file_count`, `total_size` 자동 감소

#### 3. `uploaded_files` - 파일 메타데이터

논리적 폴더와 물리적 저장을 연결

```sql
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  storage_folder_id UUID REFERENCES storage_folders(id),

  -- 파일명
  original_filename TEXT NOT NULL,    -- "photo.jpg"
  display_filename TEXT,              -- 사용자가 변경한 이름
  stored_filename TEXT NOT NULL,      -- "abc123_photo.jpg" (충돌 방지)
  file_path TEXT UNIQUE NOT NULL,     -- "userId/folder_000/abc123_photo.jpg"

  -- 메타데이터
  storage_bucket TEXT DEFAULT 'originals',
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  file_type TEXT CHECK(file_type IN ('image', 'video', 'document', 'other')),

  -- 썸네일
  has_thumbnail BOOLEAN DEFAULT false,
  thumbnail_path TEXT,
  thumbnail_size BIGINT,

  -- 상태
  upload_status TEXT DEFAULT 'completed' CHECK(upload_status IN ('uploading', 'completed', 'failed')),
  error_message TEXT,

  -- 추가 기능
  is_starred BOOLEAN DEFAULT false,
  tags TEXT[],
  media_created_at TIMESTAMPTZ,       -- EXIF에서 추출한 촬영 날짜

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 🔍 뷰 (Views)

#### `folder_tree_view` - 폴더 통계 포함

```sql
CREATE VIEW folder_tree_view AS
SELECT
  f.*,
  COUNT(DISTINCT uf.id) as file_count,
  COALESCE(SUM(uf.file_size), 0) as total_size,
  COUNT(DISTINCT sf.id) as subfolder_count
FROM folders f
LEFT JOIN uploaded_files uf ON f.id = uf.folder_id
LEFT JOIN folders sf ON f.id = sf.parent_id
GROUP BY f.id;
```

#### `file_details` - 파일 + 폴더 정보 통합

```sql
CREATE VIEW file_details AS
SELECT
  uf.*,
  f.name as folder_name,
  f.full_path as folder_path,
  sf.storage_path as physical_storage_path
FROM uploaded_files uf
LEFT JOIN folders f ON uf.folder_id = f.id
LEFT JOIN storage_folders sf ON uf.storage_folder_id = sf.id;
```

### 🔐 주요 트리거

1. **`update_folder_path`**: 폴더 생성/수정 시 `full_path`, `depth` 자동 계산
2. **`prevent_circular_reference`**: 순환 참조 방지 (재귀 CTE 사용)
3. **`update_descendant_paths`**: 폴더 이름/부모 변경 시 하위 폴더 경로 업데이트
4. **`update_updated_at_column`**: 모든 테이블의 `updated_at` 자동 갱신

### 📈 인덱스 최적화

```sql
-- 폴더
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);
CREATE INDEX idx_folders_full_path ON folders(full_path);

-- 파일
CREATE INDEX idx_files_user_folder ON uploaded_files(user_id, folder_id);
CREATE INDEX idx_files_created_desc ON uploaded_files(created_at DESC);
CREATE INDEX idx_files_media_created_desc ON uploaded_files(media_created_at DESC);
CREATE INDEX idx_files_type ON uploaded_files(file_type);

-- 물리적 폴더
CREATE INDEX idx_storage_folders_active ON storage_folders(user_id, is_active, folder_index DESC);
```

## 🔌 API 엔드포인트

### 파일 업로드

```typescript
POST /api/upload
Content-Type: multipart/form-data

// FormData
files: File[]              // 최대 10개
path?: string              // 대상 폴더 경로 (예: "/My Files/사진")

// Response
{
  results: [
    {
      success: true,
      fileName: "photo.jpg",
      fileId: "uuid",
      folderId: "uuid",
      hasThumbnail: true
    }
  ],
  summary: {
    total: 3,
    successful: 3,
    failed: 0
  }
}
```

**처리 순서**:
1. 사용자 인증 확인
2. 활성 물리적 저장 폴더 확보
3. EXIF 메타데이터 추출
4. 썸네일 생성 (이미지만)
5. 원본 파일 업로드
6. DB 레코드 생성
7. 저장 폴더 카운터 증가

### 통합 컨텐츠 조회

```typescript
GET /api/content
Query Params:
  path?: string              // 폴더 경로 (기본: "/My Files")
  limit?: number             // 페이지 크기 (기본: 20)
  offset?: number            // 오프셋
  sortBy?: string            // 정렬 기준 (created_at, name, file_size, media_created_at)
  sortOrder?: 'asc' | 'desc'
  fileType?: string          // 필터 (image, video, document, other)
  searchType?: 'file' | 'folder' | 'all'

// Response
{
  folders: [...],            // 현재 폴더 내 하위 폴더 목록
  files: [...],              // 현재 폴더 내 파일 목록
  currentFolder: {...},      // 현재 폴더 정보
  hasMore: boolean
}
```

### 폴더 관리

```typescript
// 폴더 생성
POST /api/folders
{
  name: string,
  path?: string,             // 부모 경로
  folderColor?: string,      // HEX 색상
  description?: string
}

// 폴더 수정
PATCH /api/folders
{
  folderId: string,
  name?: string,
  folderColor?: string,
  description?: string
}

// 폴더 삭제 (재귀 지원)
DELETE /api/folders
{
  folderId: string,
  recursive?: boolean        // true면 하위 폴더/파일 모두 삭제
}

// 폴더 이동
POST /api/folders/move
{
  folderId: string,
  targetPath: string         // 이동할 부모 경로
}
```

**검증**:
- 순환 참조 방지
- 자기 자신으로 이동 차단
- 중복 이름 체크
- 최대 깊이(10) 체크

### 파일 관리

```typescript
// 파일 이동
POST /api/files/move
{
  fileIds: string[],         // 이동할 파일 ID 배열
  targetPath: string         // 대상 폴더 경로
}

// 파일 삭제
DELETE /api/files/delete
{
  fileIds: string[]          // 삭제할 파일 ID 배열
}
```

**삭제 순서**:
1. DB 레코드 조회
2. DB 레코드 삭제
3. `storage_folders` 카운터 업데이트
4. Supabase Storage에서 원본/썸네일 삭제 (베스트 에포트)

## ⚙️ 환경 설정

### Next.js 설정

```typescript
// next.config.ts
{
  output: 'standalone',            // Windows 제외
  images: {
    remotePatterns: [...]          // 외부 이미지 허용 도메인
  },
  webpack: {
    // 서버: heic-convert, sharp 외부화
    // 클라이언트: fs, path, crypto fallback false
  },
  serverExternalPackages: ['sharp', 'heic-convert', 'libheif-js']
}
```

### Supabase 버킷

- **originals**: 원본 파일 (private)
- **thumbnails**: 썸네일 (signed URL, 600초)

### 상수

```typescript
// src/constants/common.ts
ROOT_FOLDER_NAME = "My Files"
DEFAULT_PAGE_SIZE = 20
MAX_FILES_PER_REQUEST = 10
MAX_FOLDER_DEPTH = 10
MAX_FILES_PER_STORAGE_FOLDER = 1000
```

## 🐳 Supabase 자체 호스팅

### Docker 설정

공식 가이드: https://supabase.com/docs/guides/self-hosting

#### PostgreSQL 비밀번호 변경 이슈

`.env` 파일의 `POSTGRES_PASSWORD` 변경 시 일부 컨테이너에서 비밀번호 오류 발생 가능.

**해결 방법**:
- https://github.com/supabase/supabase/issues/22605#issuecomment-2455781878
- 대시보드 대부분 기능은 정상 작동 확인됨

#### Google OAuth 설정

`docker-compose.yml`의 `auth` 서비스에 환경 변수 추가:

```yml
auth:
  environment:
    GOTRUE_EXTERNAL_GOOGLE_ENABLED: "true"
    GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: "your-client-id.apps.googleusercontent.com"
    GOTRUE_EXTERNAL_GOOGLE_SECRET: "your-secret"
    GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: "http://localhost:54321/auth/v1/callback"
```

**Google Cloud Console 설정**:
1. OAuth 2.0 클라이언트 ID 생성
2. 승인된 리디렉션 URI 추가: `http://localhost:54321/auth/v1/callback`
3. Client ID, Secret 복사

참고: https://www.reddit.com/r/Supabase/comments/1h46b6d/set_up_selfhosted_supabase_auth_with_github_oauth/

## 🧑‍💻 개발 가이드

### 코드 생성 규칙 (CLAUDE.md)

프로젝트에 기여 시 다음 규칙 준수:

- ✅ **JSDoc 주석**: 모든 함수에 필수
- ✅ **TypeScript 타입**: 명시적 타입 정의
- ✅ **에러 핸들링**: try-catch 및 에러 메시지
- ✅ **한국어 주석**: 복잡한 로직 설명

### 디렉토리 규칙

- **라우트별 컴포넌트**: `app/(route)/_components/`
- **전역 UI 컴포넌트**: `components/ui/`
- **API 클라이언트**: `lib/api/`
- **유틸리티**: `utils/`
- **타입 정의**: `types/`

## 📄 라이선스

이 프로젝트는 개인 프로젝트입니다.
