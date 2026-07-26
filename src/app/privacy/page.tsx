import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보 처리방침 - SoccerNote',
}

export default function PrivacyPage() {
  return (
    <div className="light min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[color:var(--text)] mb-2">개인정보 처리방침</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted2)' }}>최종 수정일: 2026년 3월 22일</p>

        <div className="max-w-none space-y-8 leading-relaxed" style={{ color: 'var(--text2)' }}>
          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">1. 개요</h2>
            <p>
              SoccerNote(이하 &quot;서비스&quot;)는 축구팀 경기 기록 및 선수 관리 애플리케이션입니다.
              본 개인정보 처리방침은 서비스 이용 과정에서 수집되는 개인정보의 항목, 수집 목적,
              보유 기간 및 이용자의 권리에 대해 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">2. 수집하는 개인정보 항목</h2>

            <h3 className="text-lg font-medium text-[color:var(--text)]/80 mt-4 mb-2">가. 회원가입 및 계정 관리</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>이메일 주소</li>
              <li>비밀번호 (암호화 저장)</li>
              <li>표시 이름 (닉네임)</li>
            </ul>

            <h3 className="text-lg font-medium text-[color:var(--text)]/80 mt-4 mb-2">나. 팀 및 경기 관리</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>팀 이름, 팀 유형 (클럽/동호회)</li>
              <li>선수 이름, 등번호, 포지션</li>
              <li>경기 기록 (상대팀, 날짜, 장소, 점수)</li>
              <li>선수 평가 (평점, 골, 어시스트, 피드백 텍스트)</li>
              <li>포메이션 배치 정보</li>
              <li>훈련 기록 (날짜, 유형, 시간, 장소)</li>
              <li>출석 기록</li>
            </ul>

            <h3 className="text-lg font-medium text-[color:var(--text)]/80 mt-4 mb-2">다. 미디어</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>경기 관련 사진 및 동영상 (사용자가 직접 업로드한 경우)</li>
            </ul>

            <h3 className="text-lg font-medium text-[color:var(--text)]/80 mt-4 mb-2">라. 푸시 알림</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>기기 푸시 토큰 (FCM 토큰)</li>
              <li>기기 플랫폼 정보 (iOS, Android, Web)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">3. 개인정보 수집 및 이용 목적</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>회원 식별 및 서비스 제공</li>
              <li>팀 생성 및 팀원 관리</li>
              <li>경기 기록, 선수 평가 및 통계 제공</li>
              <li>푸시 알림 발송 (경기 일정, 팀 공지 등)</li>
              <li>서비스 개선 및 오류 수정</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">4. 개인정보 보유 및 파기</h2>
            <p>
              이용자의 개인정보는 서비스 이용 기간 동안 보유되며,
              회원 탈퇴 시 관련 데이터는 지체 없이 파기됩니다.
              단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>계정 삭제 시: 즉시 파기</li>
              <li>팀 탈퇴 시: 해당 팀 관련 멤버십 데이터 삭제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">5. 제3자 제공 및 위탁</h2>
            <p>서비스는 다음의 제3자 서비스를 이용하여 운영됩니다:</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 pr-4 font-semibold">서비스</th>
                    <th className="text-left py-2 pr-4 font-semibold">목적</th>
                    <th className="text-left py-2 font-semibold">처리 항목</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2 pr-4">데이터베이스, 인증, 파일 저장</td>
                    <td className="py-2">계정 정보, 팀/경기 데이터, 미디어 파일</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Firebase (Google)</td>
                    <td className="py-2 pr-4">푸시 알림 (FCM)</td>
                    <td className="py-2">기기 토큰, 알림 내용</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2 pr-4">앱 호스팅</td>
                    <td className="py-2">서버 로그 (IP 주소 포함 가능)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              이용자의 개인정보를 상기 목적 외로 제3자에게 제공하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">6. 미성년자 개인정보 보호</h2>
            <p>
              서비스는 유소년 축구팀 관리 기능을 포함하고 있습니다.
              미성년자의 선수 정보(이름, 등번호, 경기 기록, 평가)는 코치(팀 관리자)가 입력하며,
              학부모 계정을 통해 자녀의 기록을 확인할 수 있습니다.
            </p>
            <p className="mt-2">
              팀의 공개 범위 설정(Visibility Settings)을 통해 선수 정보의 노출 범위를
              코치가 세부적으로 관리할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">7. 이용자의 권리</h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>개인정보 열람, 정정, 삭제 요청</li>
              <li>회원 탈퇴 및 계정 삭제 요청</li>
              <li>푸시 알림 수신 거부 (기기 설정 또는 앱 내 설정)</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
            <p className="mt-2">
              상기 권리 행사는 앱 내 프로필 설정에서 직접 처리하거나,
              아래 연락처로 요청하실 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">8. 보안 조치</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>비밀번호 암호화 저장</li>
              <li>HTTPS 통신 암호화</li>
              <li>Row Level Security(RLS)를 통한 데이터 접근 제어</li>
              <li>역할 기반 권한 관리 (코치, 멤버, 학부모)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">9. 쿠키 및 자동 수집 정보</h2>
            <p>
              서비스는 별도의 쿠키 또는 웹 분석 도구를 사용하지 않습니다.
              다만, 인증 세션 유지를 위해 Supabase에서 제공하는 세션 토큰이 브라우저에 저장될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">10. 개인정보 처리방침 변경</h2>
            <p>
              본 개인정보 처리방침은 법령, 정책 또는 서비스 변경에 따라 수정될 수 있으며,
              변경 사항은 앱 내 공지 또는 본 페이지를 통해 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[color:var(--text)] mb-3">11. 연락처</h2>
            <p>
              개인정보 처리에 관한 문의사항이 있으시면 아래로 연락해 주세요.
            </p>
            <div className="rounded-xl p-4 mt-3" style={{ background: "var(--card2)" }}>
              <p><strong>서비스명:</strong> SoccerNote</p>
              <p><strong>이메일:</strong> keestory91@gmail.com</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 text-center text-sm" style={{ borderTop: "1px solid var(--line)", color: "var(--muted2)" }}>
          &copy; 2026 SoccerNote. All rights reserved.
        </div>
      </div>
    </div>
  )
}
