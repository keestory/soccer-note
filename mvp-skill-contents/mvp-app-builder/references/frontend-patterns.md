# 프론트엔드 개발 패턴

Next.js + Supabase 기반 클라이언트 개발 가이드.

## 1. 프로젝트 초기화

### Next.js 프로젝트 생성
```bash
npx create-next-app@latest my-app
# ✔ TypeScript? Yes
# ✔ ESLint? Yes
# ✔ Tailwind CSS? Yes
# ✔ `src/` directory? No
# ✔ App Router? Yes
# ✔ Import alias (@/*)? Yes

cd my-app
```

### 필수 패키지 설치
```bash
# Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# UI 컴포넌트 (shadcn/ui)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog

# 아이콘
npm install lucide-react

# 폼 관리
npm install react-hook-form zod @hookform/resolvers

# 상태 관리 (필요시)
npm install zustand
```

---

## 2. 프로젝트 구조

### 권장 디렉토리 구조 (App Router)
```
app/
├── (auth)/              # 인증 관련 페이지
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   └── layout.tsx
├── (dashboard)/         # 로그인 필요한 페이지
│   ├── dashboard/
│   │   └── page.tsx
│   ├── [feature]/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── layout.tsx       # 공통 레이아웃
├── api/                 # API Routes
│   └── route.ts
├── layout.tsx           # 루트 레이아웃
└── page.tsx             # 홈페이지

components/
├── ui/                  # shadcn/ui 컴포넌트
├── auth/                # 인증 관련 컴포넌트
├── [feature]/           # 기능별 컴포넌트
└── layout/              # 레이아웃 컴포넌트

lib/
├── supabase/
│   ├── client.ts        # 클라이언트 사이드
│   ├── server.ts        # 서버 사이드
│   └── middleware.ts    # 미들웨어
├── utils.ts             # 유틸리티 함수
└── validations.ts       # Zod 스키마

types/
└── database.ts          # Supabase 타입 정의
```

---

## 3. Supabase 클라이언트 설정

### 클라이언트 사이드 (브라우저)
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 서버 컴포넌트
```typescript
// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

### 미들웨어 (인증 확인)
```typescript
// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 인증이 필요한 페이지 보호
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 인증된 사용자가 로그인 페이지 접근 시 대시보드로 리다이렉트
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 4. 인증 구현

### 회원가입 페이지
```typescript
// app/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      alert(error.message)
    } else {
      alert('이메일을 확인해주세요!')
      router.push('/login')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSignUp} className="max-w-md mx-auto space-y-4">
      <Input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? '처리 중...' : '회원가입'}
      </Button>
    </form>
  )
}
```

### 로그인 페이지
```typescript
// app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }

    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) alert(error.message)
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <Button onClick={handleGoogleLogin} variant="outline" className="w-full">
        Google로 로그인
      </Button>
    </div>
  )
}
```

### OAuth 콜백 핸들러
```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

---

## 5. 데이터 페칭 패턴

### 서버 컴포넌트에서 데이터 가져오기
```typescript
// app/(dashboard)/posts/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function PostsPage() {
  const supabase = createClient()

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()

  // 데이터 가져오기 (RLS 자동 적용)
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>Error loading posts</div>
  }

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  )
}
```

### 클라이언트 컴포넌트에서 실시간 데이터
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PostsList() {
  const [posts, setPosts] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // 초기 데이터 로드
    fetchPosts()

    // 실시간 구독
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPosts(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setPosts(data)
  }

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  )
}
```

---

## 6. 폼 처리 패턴

### React Hook Form + Zod
```typescript
// lib/validations.ts
import { z } from 'zod'

export const postSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(100),
  content: z.string().min(10, '최소 10자 이상 입력하세요'),
})

export type PostFormData = z.infer<typeof postSchema>
```

```typescript
// components/post-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { postSchema, type PostFormData } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function PostForm() {
  const supabase = createClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
  })

  const onSubmit = async (data: PostFormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title: data.title,
        content: data.content,
      })

    if (error) {
      alert(error.message)
    } else {
      alert('게시글이 작성되었습니다!')
      reset()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          {...register('title')}
          placeholder="제목"
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div>
        <textarea
          {...register('content')}
          placeholder="내용"
          className="w-full min-h-32 p-3 border rounded-md"
        />
        {errors.content && (
          <p className="text-sm text-red-500">{errors.content.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '작성 중...' : '작성하기'}
      </Button>
    </form>
  )
}
```

---

## 7. 파일 업로드

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function ImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) {
      alert(uploadError.message)
    } else {
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      setImageUrl(data.publicUrl)
    }

    setUploading(false)
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {imageUrl && <img src={imageUrl} alt="Uploaded" className="mt-4" />}
    </div>
  )
}
```

---

## 8. 레이아웃 패턴

### 대시보드 레이아웃
```typescript
// app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## 9. 로딩 & 에러 처리

### Loading UI
```typescript
// app/(dashboard)/posts/loading.tsx
export default function Loading() {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
```

### Error UI
```typescript
// app/(dashboard)/posts/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="text-center p-6">
      <h2 className="text-2xl font-bold mb-4">오류가 발생했습니다</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button onClick={reset}>다시 시도</button>
    </div>
  )
}
```

---

## 10. 타입 안전성

### Supabase 타입 생성
```bash
npx supabase gen types typescript --project-id [project-id] > types/database.ts
```

### 타입 적용
```typescript
import { Database } from '@/types/database'

const supabase = createClient<Database>()

// 타입 안전한 쿼리
const { data } = await supabase
  .from('posts')
  .select('*')
  // data는 자동으로 타입이 지정됨
```

---

## 베스트 프랙티스

1. **서버 컴포넌트 우선**: 가능한 서버 컴포넌트 사용 (성능 향상)
2. **클라이언트 컴포넌트**: 인터랙션 필요시에만 'use client'
3. **RLS 신뢰**: 클라이언트 검증 말고 RLS로 보안 확보
4. **타입 안전성**: Supabase 타입 생성 활용
5. **에러 처리**: 모든 비동기 작업에 에러 처리
6. **로딩 상태**: 사용자 피드백 제공
