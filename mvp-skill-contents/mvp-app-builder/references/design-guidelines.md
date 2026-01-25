# 디자인 가이드라인 (DESIGN_SPEC.md)

MVP를 위한 미니멀하고 실용적인 디자인 시스템.

## 템플릿 구조

```markdown
# [프로젝트명] - 디자인 사양

## 1. 디자인 원칙

### MVP 디자인 철학
- **심플**: 불필요한 장식 제거
- **기능 중심**: UX > UI
- **일관성**: 패턴 재사용
- **접근성**: WCAG 2.1 AA 준수

### 디자인 목표
1. [목표 1, 예: 직관적인 네비게이션]
2. [목표 2, 예: 빠른 액션 완료]
3. [목표 3, 예: 쾌적한 읽기 경험]

---

## 2. 컬러 시스템

### 컬러 팔레트 (Tailwind CSS 기준)

#### Primary Colors
```css
/* 브랜드 메인 컬러 */
primary-50:  #[hex]   /* 매우 밝음 - hover 배경 */
primary-100: #[hex]   /* 밝음 - 버튼 비활성 */
primary-500: #[hex]   /* 기본 - 주요 버튼, 링크 */
primary-600: #[hex]   /* 진함 - hover 상태 */
primary-700: #[hex]   /* 매우 진함 - active 상태 */
```

**Tailwind 매핑**:
```javascript
// tailwind.config.js
colors: {
  primary: {
    50: '#...',
    100: '#...',
    500: '#...',
    600: '#...',
    700: '#...',
  }
}
```

#### Neutral Colors (회색 스케일)
```css
gray-50:  #F9FAFB   /* 배경 */
gray-100: #F3F4F6   /* 카드 배경 */
gray-200: #E5E7EB   /* 테두리 */
gray-400: #9CA3AF   /* 비활성 텍스트 */
gray-600: #4B5563   /* 보조 텍스트 */
gray-900: #111827   /* 주요 텍스트 */
```

#### Semantic Colors
```css
/* Success */
success: #10B981  (green-500)

/* Warning */
warning: #F59E0B  (amber-500)

/* Error */
error: #EF4444    (red-500)

/* Info */
info: #3B82F6     (blue-500)
```

### 사용 예시
| 용도 | 컬러 | Tailwind Class |
|------|------|----------------|
| 주요 버튼 | Primary-500 | bg-primary-500 |
| 버튼 hover | Primary-600 | hover:bg-primary-600 |
| 링크 | Primary-500 | text-primary-500 |
| 본문 텍스트 | Gray-900 | text-gray-900 |
| 보조 텍스트 | Gray-600 | text-gray-600 |
| 배경 | Gray-50 | bg-gray-50 |
| 카드 | White | bg-white |
| 테두리 | Gray-200 | border-gray-200 |

---

## 3. 타이포그래피

### 폰트 패밀리
```css
/* 주요 폰트 */
font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto

/* 한글 폰트 (옵션) */
font-korean: 'Pretendard', 'Apple SD Gothic Neo', sans-serif

/* 코드/숫자 */
font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas
```

### 타이포그래피 스케일
| 레벨 | 용도 | 크기 | Line Height | Tailwind |
|------|------|------|-------------|----------|
| H1 | 페이지 타이틀 | 36px (2.25rem) | 1.2 | text-4xl |
| H2 | 섹션 헤딩 | 30px (1.875rem) | 1.3 | text-3xl |
| H3 | 서브 헤딩 | 24px (1.5rem) | 1.4 | text-2xl |
| H4 | 카드 타이틀 | 20px (1.25rem) | 1.4 | text-xl |
| Body Large | 강조 본문 | 18px (1.125rem) | 1.6 | text-lg |
| Body | 일반 본문 | 16px (1rem) | 1.6 | text-base |
| Body Small | 보조 정보 | 14px (0.875rem) | 1.5 | text-sm |
| Caption | 캡션 | 12px (0.75rem) | 1.4 | text-xs |

### 폰트 웨이트
```css
font-normal:   400  /* 본문 */
font-medium:   500  /* 버튼 */
font-semibold: 600  /* 헤딩 */
font-bold:     700  /* 강조 */
```

### 사용 예시
```tsx
// 페이지 타이틀
<h1 className="text-4xl font-bold text-gray-900">
  
// 섹션 헤딩
<h2 className="text-3xl font-semibold text-gray-900">
  
// 본문
<p className="text-base text-gray-600 leading-relaxed">

// 작은 텍스트
<span className="text-sm text-gray-500">
```

---

## 4. 간격 시스템 (Spacing)

### 기본 스케일 (Tailwind 8px 기준)
```
0.5 = 2px    (0.125rem)
1   = 4px    (0.25rem)
2   = 8px    (0.5rem)
3   = 12px   (0.75rem)
4   = 16px   (1rem)
6   = 24px   (1.5rem)
8   = 32px   (2rem)
12  = 48px   (3rem)
16  = 64px   (4rem)
```

### 간격 가이드
| 용도 | 간격 | Tailwind |
|------|------|----------|
| 컴포넌트 내부 패딩 | 16px | p-4 |
| 카드 패딩 | 24px | p-6 |
| 섹션 간격 | 48px | gap-12, space-y-12 |
| 버튼 패딩 | 12px 24px | px-6 py-3 |
| 입력 필드 패딩 | 12px | p-3 |

---

## 5. 레이아웃

### 컨테이너
```tsx
// 페이지 컨테이너
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// 카드 그리드
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 중앙 정렬 폼
<div className="max-w-md mx-auto">
```

### 반응형 브레이크포인트
```css
sm: 640px   /* 모바일 가로 */
md: 768px   /* 태블릿 */
lg: 1024px  /* 데스크탑 */
xl: 1280px  /* 대형 화면 */
```

---

## 6. 컴포넌트 라이브러리

### 사용 컴포넌트 (shadcn/ui 권장)
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

### 주요 컴포넌트

#### Button
```tsx
// Primary 버튼
<Button variant="default">저장하기</Button>

// Secondary 버튼
<Button variant="outline">취소</Button>

// Destructive 버튼
<Button variant="destructive">삭제</Button>

// 크기
<Button size="sm">작은 버튼</Button>
<Button size="default">기본 버튼</Button>
<Button size="lg">큰 버튼</Button>
```

#### Input
```tsx
<Input 
  type="text" 
  placeholder="입력하세요"
  className="max-w-md"
/>
```

#### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>
    내용
  </CardContent>
  <CardFooter>
    푸터
  </CardFooter>
</Card>
```

---

## 7. 아이콘 시스템

### 아이콘 라이브러리
```bash
npm install lucide-react
```

### 사용 예시
```tsx
import { Home, Search, User, Settings } from 'lucide-react'

<Home className="w-5 h-5" />
<Search className="w-4 h-4 text-gray-500" />
```

### 아이콘 크기 가이드
- **Small**: 16px (w-4 h-4) - 작은 버튼, 인라인
- **Default**: 20px (w-5 h-5) - 일반 버튼, 메뉴
- **Large**: 24px (w-6 h-6) - 주요 액션, 아이콘 버튼

---

## 8. 주요 화면 와이어프레임

### 랜딩 페이지
```
┌─────────────────────────────────────┐
│  [Logo]              [Login] [Sign] │  <- Header
├─────────────────────────────────────┤
│                                     │
│        [Hero Title]                 │  <- Hero Section
│        [Subtitle]                   │
│        [CTA Button]                 │
│                                     │
├─────────────────────────────────────┤
│  [Feature 1] [Feature 2] [Feature 3] │ <- Features
├─────────────────────────────────────┤
│        [Footer]                     │
└─────────────────────────────────────┘
```

### 대시보드
```
┌─────────────────────────────────────┐
│  [Logo]  [Nav] [Nav] [Nav] [Avatar] │  <- Header
├──────┬──────────────────────────────┤
│      │  [Page Title]    [+ Button]  │
│ Sid  │  ─────────────────────────   │
│ eba  │  ┌──────┐ ┌──────┐ ┌──────┐ │
│  r   │  │Card 1│ │Card 2│ │Card 3│ │
│      │  └──────┘ └──────┘ └──────┘ │
│      │                              │
│ [Nav]│  ┌─────────────────────────┐ │
│ [Nav]│  │   Main Content Area     │ │
│ [Nav]│  └─────────────────────────┘ │
└──────┴──────────────────────────────┘
```

### 상세 페이지
```
┌─────────────────────────────────────┐
│  [← Back]           [Edit] [Delete] │
├─────────────────────────────────────┤
│  [Title]                            │
│  [Metadata: Date, Author, etc.]     │
│  ─────────────────────────────────  │
│                                     │
│  [Main Content]                     │
│                                     │
│  ─────────────────────────────────  │
│  [Related Items]                    │
└─────────────────────────────────────┘
```

---

## 9. 상태별 디자인

### 버튼 상태
- **Default**: primary-500 배경
- **Hover**: primary-600 배경, 살짝 확대 효과
- **Active**: primary-700 배경
- **Disabled**: gray-300 배경, cursor-not-allowed
- **Loading**: spinner 표시, 비활성화

### 입력 필드 상태
- **Default**: gray-200 테두리
- **Focus**: primary-500 테두리, ring 효과
- **Error**: red-500 테두리, 에러 메시지 표시
- **Disabled**: gray-100 배경, 읽기 전용

### 카드 상태
- **Default**: 그림자 없음 또는 subtle shadow
- **Hover**: 살짝 들어 올리는 효과 (shadow-md)
- **Selected**: primary-100 배경 또는 테두리

---

## 10. 애니메이션 & 전환

### 기본 애니메이션 (Tailwind)
```tsx
// Fade in
<div className="animate-in fade-in duration-200">

// Slide in
<div className="animate-in slide-in-from-bottom-4 duration-300">

// Hover 효과
<button className="transition-all hover:scale-105">
```

### 사용 가이드
- **페이지 전환**: 200-300ms
- **모달 등장**: 200ms ease-out
- **호버 효과**: 150ms
- **로딩 스피너**: 무한 회전

---

## 11. 접근성 체크리스트

- [ ] 색상 대비 4.5:1 이상 (텍스트)
- [ ] 포커스 상태 명확히 표시
- [ ] 키보드 네비게이션 지원
- [ ] alt 텍스트 제공 (이미지)
- [ ] ARIA 레이블 (복잡한 UI)
- [ ] 반응형 디자인 (모바일 친화적)

---

## 12. 디자인 토큰 (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#...',
          100: '#...',
          500: '#...',
          600: '#...',
          700: '#...',
        }
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'lg': '0.5rem',  // 8px
        'xl': '0.75rem', // 12px
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }
    }
  }
}
```
```

## 작성 가이드

### MVP 디자인 최소화 전략
1. **shadcn/ui** 활용으로 컴포넌트 개발 시간 단축
2. **Tailwind CSS** 기본 테마 최대한 활용
3. **커스텀 디자인** 최소화 (브랜드 컬러만 변경)
4. **일관성** 우선 (창의성은 나중에)

### 시간 절약 팁
- Tailwind 기본 색상 사용 (blue, gray, green 등)
- 복잡한 애니메이션 피하기
- 아이콘은 lucide-react로 통일
- 폰트는 시스템 폰트 우선
