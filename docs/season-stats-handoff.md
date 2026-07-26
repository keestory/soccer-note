# Football Note — 시즌 통계 핸드오프 번들 (Claude Code용)

이 파일 하나만 레포에 넣으면 됩니다 (예: docs/season-stats-handoff.md).
Claude Code 프롬프트 예시:
"docs/season-stats-handoff.md를 읽고, 선수 상세(시즌 통계) 화면을 이 스펙과 레퍼런스 HTML 그대로 구현해줘. Tailwind 값은 레퍼런스의 px 값을 우선해."

---

# 시즌 통계 (선수 상세) — Claude Code 구현 스펙

Football Note **Navy Board** 라이트 테마의 선수 상세 화면. 캐노니컬 레퍼런스: `Football Note App.dc.html`의 `#s-player-detail` 섹션. 토큰은 `tokens/colors.css`·`tokens/typography.css` (`--fn-*`), 컴포넌트 참고: `components/stats/Stats.jsx`, `components/badges/Badges.jsx`.

## 원칙
- 평점 없음 — 선수 가치는 골/어시스트/클린시트에서 자동 파생 (공격 포인트 = 골 + 어시스트).
- 숫자는 전부 Bebas Neue, 한글은 Gothic A1 (700 상한, 800/900 금지).
- 라이트 배경(#f5f6f8) + 흰 카드(1px #eaecf0 보더, 그림자 없음). 네이비(#101828)는 히어로 카드 한 장에만. 볼트(#c8f542)는 네이비 위에서만.

## 레이아웃 (위→아래, gap 13px, 좌우 20px)

### 1. 히어로 카드 (navy #101828, radius 20, padding 20)
- 좌: 등번호 타일 56×56, radius 16, bg volt, Bebas 28px navy 텍스트 (`9`)
- 중: 이름 19px/700 white, 아래 12px #98a2b3 `FW · 공격수`
- 우: 공격 포인트 Bebas 34px volt `6P` (P는 18px), 아래 10px #667085 `시즌 공격 포인트`

### 2. 업적 뱃지 카드 (white)
- 라벨: 11px/600 #98a2b3 letter-spacing .1em `업적 뱃지`
- 뱃지 = #f2f4f7 칩(radius 11, padding 8×12): 컬러 도트 8px + 이름 12px/700 + 설명 10px #98a2b3
- 예: 에이스(volt 도트, 팀 내 최다 포인트), 공격수(#f04438 도트, 4골). 아이콘·이모지 금지.

### 3. 시즌 스탯 그리드 (white 카드, 3열 grid, gap 9)
- 셀: #f2f4f7, radius 11, 중앙정렬 — Bebas 24px 숫자 + 10px #98a2b3 라벨
- 항목: 출전 / 골 / 어시스트 / 클린시트 / 훈련 / 기록 경기. 값 0이면 숫자 색 #d0d5dd.

### 4. 경기별 공격 포인트 차트 (white 카드)
- 헤더: 라벨(11px/600 #98a2b3) + 범례 (8px 사각 스와치: 골=#101828, 어시스트=#d0d5dd)
- 본문: 경기당 막대쌍 (골=navy, 어시=#d0d5dd), 폭 22px, 높이 = 값×28px, radius 5 5 2 2, 하단에 10px 날짜+상대 라벨
- 우측: 1px #eaecf0 세로 구분선 뒤 시즌 합계 — Bebas 28px + `시즌 합계` 라벨
- SVG/차트 라이브러리 불필요 — flex 막대로 충분.

### 5. 경기 기록 리스트 (white 카드들)
- 헤더행: `vs 하남 버닝` 14px/700 + 날짜 11px #98a2b3; 우측 포인트 뱃지 Bebas 15px `3P` — 최다 포인트 경기만 volt bg(navy 텍스트), 나머지 #f2f4f7 bg(#475467)
- 하단 3열: 골/어시/클린시트 미니 스탯 (10px 라벨 + Bebas 18px, 해당없음은 `-` #d0d5dd)
- 각 카드는 해당 경기 상세로 링크.

## 데이터 매핑 (Supabase)
- 공격 포인트 P = SUM(goals) + SUM(assists) per player per season
- 클린시트: GK/DF만, 쿼터 기록의 무실점에서 파생
- 업적 뱃지 규칙: 에이스 = 팀 내 P 1위, 공격수 = 골 ≥ N 등 — 서버에서 파생, 사용자 입력 없음


---

## 레퍼런스 HTML (캐노니컬 — 픽셀 값의 원본)

Football Note App.dc.html의 #s-player-detail 섹션 전체입니다. var(--acc,#c8f542)는 볼트 악센트 토큰(--fn-accent)입니다.

```html
<!-- ===== PLAYER DETAIL ===== -->
    <section id="s-player-detail" data-screen-label="선수 상세">
      <p style="font-size:12px;font-weight:600;color:#98a2b3;margin:0 0 10px 4px;">선수 상세 · 시즌 통계</p>
      <div style="width:390px;height:800px;border-radius:40px;background:#f5f6f8;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(16,24,40,.12);border:1px solid #e5e8eb;">
        <div style="display:flex;justify-content:space-between;padding:18px 26px 6px;font-size:13px;font-weight:600;color:#101828;flex-shrink:0;"><span>9:41</span><span style="letter-spacing:.1em;">▮▮▮ ▂▄▆</span></div>
        <div style="display:flex;align-items:center;gap:10px;padding:6px 20px 12px;flex-shrink:0;">
          <a href="#s-players" style="font-size:20px;color:#101828;">‹</a>
          <span style="font-weight:700;font-size:16px;color:#101828;">시즌 통계</span>
        </div>
        <div style="flex:1;overflow-y:auto;padding:0 20px 20px;display:flex;flex-direction:column;gap:13px;">
          <div style="background:#101828;border-radius:20px;padding:20px;display:flex;align-items:center;gap:14px;">
            <div style="width:56px;height:56px;border-radius:16px;background:var(--acc,#c8f542);color:#101828;font-family:'Bebas Neue',sans-serif;font-size:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">9</div>
            <div style="flex:1;">
              <div style="font-size:19px;font-weight:700;color:#fff;">서은광</div>
              <div style="font-size:12px;color:#98a2b3;margin-top:3px;">FW · 공격수</div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:'Bebas Neue',sans-serif;font-size:34px;line-height:.9;color:var(--acc,#c8f542);">6<span style="font-size:18px;">P</span></div>
              <div style="font-size:10px;color:#667085;margin-top:2px;">시즌 공격 포인트</div>
            </div>
          </div>
          <div style="background:#fff;border:1px solid #eaecf0;border-radius:16px;padding:14px;">
            <div style="font-size:11px;font-weight:600;color:#98a2b3;letter-spacing:.1em;margin-bottom:10px;">업적 뱃지</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:8px;background:#f2f4f7;border-radius:11px;padding:8px 12px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--acc,#c8f542);"></span><div><div style="font-size:12px;font-weight:700;color:#101828;">에이스</div><div style="font-size:10px;color:#98a2b3;">팀 내 최다 포인트</div></div></div>
              <div style="display:flex;align-items:center;gap:8px;background:#f2f4f7;border-radius:11px;padding:8px 12px;"><span style="width:8px;height:8px;border-radius:50%;background:#f04438;"></span><div><div style="font-size:12px;font-weight:700;color:#101828;">공격수</div><div style="font-size:10px;color:#98a2b3;">4골</div></div></div>
            </div>
          </div>
          <div style="background:#fff;border:1px solid #eaecf0;border-radius:16px;padding:14px;">
            <div style="font-size:11px;font-weight:600;color:#98a2b3;letter-spacing:.1em;margin-bottom:12px;">시즌 스탯</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;">
              <div style="background:#f2f4f7;border-radius:11px;padding:11px;text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#101828;">2</div><div style="font-size:10px;color:#98a2b3;margin-top:2px;">출전</div></div>
              <div style="background:#f2f4f7;border-radius:11px;padding:11px;text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#101828;">4</div><div style="font-size:10px;color:#98a2b3;margin-top:2px;">골</div></div>
              <div style="background:#f2f4f7;border-radius:11px;padding:11px;text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#101828;">2</div><div style="font-size:10px;color:#98a2b3;margin-top:2px;">어시스트</div></div>
              <div style="background:#f2f4f7;border-radius:11px;padding:11px;text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#d0d5dd;">0</div><div style="font-size:10px;color:#98a2b3;margin-top:2px;">클린시트</div></div>
              <div style="background:#f2f4f7;border-radius:11px;padding:11px;text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#101828;">5</div><div style="font-size:10px;color:#98a2b3;margin-top:2px;">훈련</div></div>
              <div style="background:#f2f4f7;border-radius:11px;padding:11px;text-align:center;"><div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:#101828;">2</div><div style="font-size:10px;color:#98a2b3;margin-top:2px;">기록 경기</div></div>
            </div>
          </div>
          <div style="background:#fff;border:1px solid #eaecf0;border-radius:16px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <span style="font-size:11px;font-weight:600;color:#98a2b3;letter-spacing:.1em;">경기별 공격 포인트</span>
              <div style="display:flex;gap:10px;align-items:center;">
                <span style="display:flex;align-items:center;gap:4px;font-size:10px;color:#98a2b3;"><span style="width:8px;height:8px;border-radius:2px;background:#101828;"></span>골</span>
                <span style="display:flex;align-items:center;gap:4px;font-size:10px;color:#98a2b3;"><span style="width:8px;height:8px;border-radius:2px;background:#d0d5dd;"></span>어시스트</span>
              </div>
            </div>
            <div style="display:flex;align-items:flex-end;gap:22px;height:88px;padding:0 8px;">
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end;">
                <div style="display:flex;align-items:flex-end;gap:5px;">
                  <div style="width:22px;height:28px;border-radius:5px 5px 2px 2px;background:#101828;"></div>
                  <div style="width:22px;height:28px;border-radius:5px 5px 2px 2px;background:#d0d5dd;"></div>
                </div>
                <span style="font-size:10px;color:#98a2b3;">05.31 강동 FC</span>
              </div>
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end;">
                <div style="display:flex;align-items:flex-end;gap:5px;">
                  <div style="width:22px;height:56px;border-radius:5px 5px 2px 2px;background:#101828;"></div>
                  <div style="width:22px;height:28px;border-radius:5px 5px 2px 2px;background:#d0d5dd;"></div>
                </div>
                <span style="font-size:10px;color:#98a2b3;">06.28 하남 버닝</span>
              </div>
              <div style="width:1px;height:100%;background:#eaecf0;"></div>
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;padding-bottom:16px;">
                <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;line-height:1;color:#101828;">6</div>
                <span style="font-size:10px;color:#98a2b3;white-space:nowrap;">시즌 합계</span>
              </div>
            </div>
          </div>
          <div style="font-size:11px;font-weight:600;color:#98a2b3;letter-spacing:.1em;">경기 기록</div>
          <a href="#s-match" style="background:#fff;border:1px solid #eaecf0;border-radius:16px;padding:14px;display:block;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
              <div><div style="font-size:14px;font-weight:700;color:#101828;">vs 하남 버닝</div><div style="font-size:11px;color:#98a2b3;margin-top:2px;">2026.06.28</div></div>
              <span style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:#101828;background:var(--acc,#c8f542);padding:4px 10px;border-radius:8px;">3P</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
              <div style="text-align:center;"><div style="font-size:10px;color:#98a2b3;">골</div><div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:#101828;">2</div></div>
              <div style="text-align:center;"><div style="font-size:10px;color:#98a2b3;">어시</div><div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:#101828;">1</div></div>
              <div style="text-align:center;"><div style="font-size:10px;color:#98a2b3;">클린시트</div><div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:#d0d5dd;">-</div></div>
            </div>
          </a>
          <a href="#s-match" style="background:#fff;border:1px solid #eaecf0;border-radius:16px;padding:14px;display:flex;justify-content:space-between;align-items:center;">
            <div><div style="font-size:14px;font-weight:700;color:#101828;">vs 강동 FC</div><div style="font-size:11px;color:#98a2b3;margin-top:2px;">2026.05.31</div></div>
            <span style="font-family:'Bebas Neue',sans-serif;font-size:15px;color:#475467;background:#f2f4f7;padding:4px 10px;border-radius:8px;">2P</span>
          </a>
        </div>
      </div>
    </section>
```

---

## tokens/colors.css

```css
/* ============================================================
   COLOR TOKENS — Football Note "Navy Board" (light theme)
   Light neutral UI; navy (#101828) is the single dark surface,
   used for scoreboard cards, primary buttons, and selected
   states. The volt accent (--fn-accent) appears ONLY on navy —
   never on light backgrounds (contrast is too low there).
   ============================================================ */
:root {
  /* --- Surfaces --- */
  --fn-bg:        #f5f6f8;   /* app screen background */
  --fn-panel:     #ffffff;   /* card / panel background */
  --fn-panel-2:   #f2f4f7;   /* inset tile / input / chip bg */
  --fn-navy:      #101828;   /* scoreboard card, primary button, selected */
  --fn-navy-2:    #1a2437;   /* inset tile ON navy */
  --fn-line:      #eaecf0;   /* card borders */
  --fn-line-2:    #e4e7ec;   /* dividers */
  --fn-input-line:#d0d5dd;   /* input borders / disabled toggle */

  /* --- Text (on light) --- */
  --fn-text:      #101828;   /* primary */
  --fn-text-2:    #475467;   /* secondary */
  --fn-text-3:    #667085;   /* tertiary / body muted */
  --fn-text-mute: #98a2b3;   /* labels / placeholder */
  --fn-text-faint:#d0d5dd;   /* faintest / disabled */

  /* --- Text (on navy) --- */
  --fn-on-navy:      #ffffff;
  --fn-on-navy-mute: #98a2b3;
  --fn-on-navy-dim:  #667085;
  --fn-on-navy-dash: #344054; /* score dash/colon on navy */

  /* --- Accent (volt — ONLY on navy surfaces) --- */
  --fn-accent:    #c8f542;
  --fn-on-accent: #101828;   /* text on an accent fill */

  /* --- Semantic --- */
  --fn-danger:      #f04438;  /* loss / destructive */
  --fn-danger-deep: #d92d20;  /* destructive button */
  --fn-danger-text: #b42318;
  --fn-danger-soft: #fef3f2;  /* danger tint bg */
  --fn-danger-line: #fecdca;
  --fn-danger-chip: #fdecec;  /* loss badge bg */

  /* --- Pitch (formation view) --- */
  --fn-pitch-1: #12724a;
  --fn-pitch-2: #0e5e3d;
  --fn-pitch-line: rgba(255,255,255,.28);

  /* --- Training-type dots --- */
  --fn-train-minigame:#f59e0b;
  --fn-train-pass:    #38bdf8;
  --fn-train-shoot:   #ef4444;
  --fn-train-fitness: #2dd4bf;
  --fn-train-tactic:  #6366f1;
  --fn-train-etc:     #98a2b3;

  /* --- Match level chips (text / bg) --- */
  --fn-lvl-basic-text: #026aa2; --fn-lvl-basic-bg: #e0f2fe;
  --fn-lvl-mid-text:   #0e9384; --fn-lvl-mid-bg:   #e0f5f2;
  --fn-lvl-adv-text:   #b54708; --fn-lvl-adv-bg:   #fef0c7;
}

/* -------- Accent presets -------------------------------------
   The accent only ever sits on navy, so swapping it is a single
   variable — no derived aliases needed (vs. the old dark theme).
   ------------------------------------------------------------- */
[data-fn-accent="volt"]   { --fn-accent:#c8f542; }
[data-fn-accent="sky"]    { --fn-accent:#7dd3fc; }
[data-fn-accent="peach"]  { --fn-accent:#fdba74; }

```

---

## tokens/typography.css

```css
/* ============================================================
   TYPOGRAPHY TOKENS — Football Note (Navy Board)
   Two families:
   - Display / numerals: Bebas Neue (scores, %, D-3, WIN, codes)
   - Body / Korean:      Gothic A1 (700 titles · 600 card titles
                         · 500 body · 400 long-form). No 800/900.
   ============================================================ */
:root {
  --fn-font-display: "Bebas Neue", "Gothic A1", sans-serif;
  --fn-font-body:    "Gothic A1", system-ui, sans-serif;

  /* Weights (Gothic A1) — bold ceiling is 700 */
  --fn-w-regular: 400;
  --fn-w-medium:  500;
  --fn-w-semibold:600;
  --fn-w-bold:    700;

  /* Type scale (px) */
  --fn-fs-score-xl: 76px;  /* home KV score */
  --fn-fs-score:    60px;  /* match-detail scoreboard */
  --fn-fs-stat:     44px;  /* win-rate % */
  --fn-fs-code:     30px;  /* invite code */
  --fn-fs-h1:       21px;  /* screen title (Gothic 700) */
  --fn-fs-title:    16px;  /* header / card title */
  --fn-fs-body:     14px;
  --fn-fs-sm:       13px;
  --fn-fs-xs:       12px;
  --fn-fs-cap:      11px;  /* caption */
  --fn-fs-micro:    10px;  /* field labels */
  --fn-fs-nano:     9px;   /* pitch player names */

  /* Tracking */
  --fn-ls-tight:  0.02em;
  --fn-ls-label:  0.20em;  /* Bebas eyebrow labels (LAST MATCH) */
  --fn-ls-code:   0.22em;  /* invite code */
}

```

---

## components/stats/Stats.jsx (구조 참고용 React)

```jsx
// Football Note stats — QuarterChips, SeasonStrip, AttackPointsChart
const BEBAS = "'Bebas Neue',sans-serif";
function QuarterChips({quarters=[[2,1],[1,1],[2,0],[1,2]], active=0}) {
  return React.createElement('div',{style:{display:'flex',gap:8}},
    quarters.map((q,i)=>React.createElement('span',{key:i,style:{flex:1,textAlign:'center',fontFamily:BEBAS,fontSize:15,padding:'10px 0',borderRadius:12,
      background:i===active?'var(--fn-navy,#101828)':'var(--fn-panel,#fff)',color:i===active?'var(--fn-accent,#c8f542)':'var(--fn-text-2,#475467)',
      border:i===active?'none':'1px solid var(--fn-line,#eaecf0)'}},(i+1)+'Q '+q[0]+':'+q[1])));
}
function SeasonStrip({games=12,rate=67,w=8,d=1,l=3}) { // white stat card: win-rate hero + W/D/L
  return React.createElement('div',{style:{background:'var(--fn-panel,#fff)',border:'1px solid var(--fn-line,#eaecf0)',borderRadius:16,padding:'16px 18px',display:'flex',alignItems:'center',fontFamily:"'Gothic A1',sans-serif"}},
    React.createElement('div',{style:{flex:1.2}},
      React.createElement('div',{style:{fontSize:11,color:'var(--fn-text-mute,#98a2b3)'}},'2026 시즌 · '+games+'전'),
      React.createElement('div',{style:{display:'flex',alignItems:'baseline',gap:8,marginTop:6}},
        React.createElement('span',{style:{fontFamily:BEBAS,fontSize:44,lineHeight:.8,color:'var(--fn-text,#101828)'}},rate,React.createElement('span',{style:{fontSize:24}},'%')),
        React.createElement('span',{style:{fontSize:11,color:'var(--fn-text-3,#667085)'}},'승률'))),
    React.createElement('div',{style:{display:'flex',gap:14}},
      [['승',w,'var(--fn-text,#101828)'],['무',d,'var(--fn-text-mute,#98a2b3)'],['패',l,'var(--fn-danger,#f04438)']].map(([k,v,c])=>
        React.createElement('div',{key:k,style:{textAlign:'center'}},
          React.createElement('div',{style:{fontFamily:BEBAS,fontSize:22,color:c}},v),
          React.createElement('div',{style:{fontSize:10,color:'var(--fn-text-mute,#98a2b3)'}},k)))));
}
function AttackPointsChart({games=[{label:'05.31 강동 FC',g:1,a:1},{label:'06.28 하남 버닝',g:2,a:1}], total=6, max=2}) {
  // navy bar = goals, gray bar = assists; 28px per point
  const bar=(h,c)=>React.createElement('div',{style:{width:22,height:h*28,borderRadius:'5px 5px 2px 2px',background:c}});
  return React.createElement('div',{style:{background:'var(--fn-panel,#fff)',border:'1px solid var(--fn-line,#eaecf0)',borderRadius:16,padding:14,fontFamily:"'Gothic A1',sans-serif"}},
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}},
      React.createElement('span',{style:{fontSize:11,fontWeight:600,color:'var(--fn-text-mute,#98a2b3)',letterSpacing:'.1em'}},'경기별 공격 포인트'),
      React.createElement('div',{style:{display:'flex',gap:10,fontSize:10,color:'var(--fn-text-mute,#98a2b3)'}},
        React.createElement('span',null,'■ 골'), React.createElement('span',{style:{color:'#d0d5dd'}},'■ 어시스트'))),
    React.createElement('div',{style:{display:'flex',alignItems:'flex-end',gap:22,height:88,padding:'0 8px'}},
      games.map((g,i)=>React.createElement('div',{key:i,style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,height:'100%',justifyContent:'flex-end'}},
        React.createElement('div',{style:{display:'flex',alignItems:'flex-end',gap:5}}, bar(g.g,'var(--fn-navy,#101828)'), bar(g.a,'#d0d5dd')),
        React.createElement('span',{style:{fontSize:10,color:'var(--fn-text-mute,#98a2b3)'}},g.label))),
      React.createElement('div',{style:{width:1,height:'100%',background:'var(--fn-line,#eaecf0)'}}),
      React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',gap:2,paddingBottom:16}},
        React.createElement('div',{style:{fontFamily:BEBAS,fontSize:28,lineHeight:1,color:'var(--fn-text,#101828)'}},total),
        React.createElement('span',{style:{fontSize:10,color:'var(--fn-text-mute,#98a2b3)',whiteSpace:'nowrap'}},'시즌 합계'))));
}
window.FN = Object.assign(window.FN||{}, {QuarterChips, SeasonStrip, AttackPointsChart});
module.exports = { QuarterChips, SeasonStrip, AttackPointsChart };
```

---

## components/badges/Badges.jsx (등번호 타일 등)

```jsx
// Football Note badges — WinTag, LevelBadge, JerseyTile, DdayBadge, MvpBadge
const BEBAS = "'Bebas Neue',sans-serif";
function WinTag({result='win'}) { // navy/volt=win, gray=draw, red=loss (KR short labels)
  const m = {win:['승','var(--fn-navy,#101828)','var(--fn-accent,#c8f542)'],draw:['무','var(--fn-panel-2,#f2f4f7)','var(--fn-text-2,#475467)'],loss:['패','var(--fn-danger-chip,#fdecec)','var(--fn-danger,#f04438)']}[result];
  return React.createElement('span',{style:{fontSize:11,fontWeight:700,color:m[2],background:m[1],padding:'4px 9px',borderRadius:8,fontFamily:"'Gothic A1',sans-serif"}},m[0]);
}
function LevelBadge({level='중급'}) {
  const m = {'초급':['var(--fn-lvl-basic-text,#026aa2)','var(--fn-lvl-basic-bg,#e0f2fe)'],'중급':['var(--fn-lvl-mid-text,#0e9384)','var(--fn-lvl-mid-bg,#e0f5f2)'],'고급':['var(--fn-lvl-adv-text,#b54708)','var(--fn-lvl-adv-bg,#fef0c7)']}[level]||['#475467','#f2f4f7'];
  return React.createElement('span',{style:{fontSize:11,fontWeight:600,color:m[0],background:m[1],padding:'3px 9px',borderRadius:9,fontFamily:"'Gothic A1',sans-serif"}},level);
}
function JerseyTile({no=9, highlight=false, size=40}) { // Bebas jersey number tile replaces avatars
  return React.createElement('span',{style:{fontFamily:BEBAS,fontSize:size*.55,color:highlight?'var(--fn-navy,#101828)':'var(--fn-text-2,#475467)',background:highlight?'var(--fn-accent,#c8f542)':'var(--fn-panel-2,#f2f4f7)',borderRadius:10,width:size,height:size,display:'inline-flex',alignItems:'center',justifyContent:'center'}},no);
}
function DdayBadge({d=3}) {
  return React.createElement('span',{style:{background:'var(--fn-navy,#101828)',color:'var(--fn-accent,#c8f542)',fontFamily:BEBAS,fontSize:14,letterSpacing:'.06em',padding:'4px 10px',borderRadius:8}},'D-'+d);
}
function MvpBadge() {
  return React.createElement('span',{style:{fontFamily:BEBAS,fontSize:13,letterSpacing:'.14em',color:'var(--fn-on-accent,#101828)',background:'var(--fn-accent,#c8f542)',padding:'4px 10px',borderRadius:8}},'MVP');
}
window.FN = Object.assign(window.FN||{}, {WinTag, LevelBadge, JerseyTile, DdayBadge, MvpBadge});
module.exports = { WinTag, LevelBadge, JerseyTile, DdayBadge, MvpBadge };
```
