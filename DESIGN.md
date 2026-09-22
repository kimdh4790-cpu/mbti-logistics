---
version: 1.0
name: MBTICO-design-system
description: MBTICO SaaS 제품군 공통 디자인 시스템. 흰색+하늘 배경에 핑크·연두·골드 3색 포인트. Pretendard 전용, 모바일 퍼스트(375px). FILO·DINE·DONWAY·용차앱·MBTICO 전 제품 공통 적용.

colors:
  # 배경
  canvas: "#FFFFFF"
  canvas-sky: "#EAF6FF"
  canvas-sky-deep: "#D0EBFF"
  surface: "#F4FAFF"
  surface-soft: "#FAFCFF"

  # 포인트 3색
  pink: "#F472B6"
  pink-deep: "#EC4899"
  pink-soft: "#FCE7F3"
  pink-on: "#FFFFFF"

  lime: "#86EFAC"
  lime-deep: "#4ADE80"
  lime-text: "#16A34A"
  lime-soft: "#DCFCE7"
  lime-on: "#14532D"

  gold: "#FBBF24"
  gold-deep: "#F59E0B"
  gold-text: "#B45309"
  gold-soft: "#FEF3C7"
  gold-on: "#78350F"

  # 텍스트
  ink: "#1E293B"
  ink-muted: "#64748B"
  ink-faint: "#94A3B8"
  on-dark: "#FFFFFF"

  # 시맨틱
  semantic-success: "#4ADE80"
  semantic-warning: "#FBBF24"
  semantic-error: "#F87171"
  semantic-info: "#60A5FA"

  # 보더/구분선
  hairline: "#E2EEF9"
  hairline-soft: "#EFF6FF"

typography:
  font-family: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
  font-cdn: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"

  hero-display:
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    color: ink

  heading-1:
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
    color: ink

  heading-2:
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
    color: ink

  body:
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    color: ink

  body-small:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    color: ink-muted

  caption:
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
    color: ink-faint

  label:
    fontSize: 12px
    fontWeight: 600
    letterSpacing: "0.05em"
    textTransform: uppercase
    color: ink-muted

layout:
  mobile-base: 375px
  gutter: 16px
  section-gap: 32px
  card-gap: 12px
  touch-min: 44px
  border-radius-sm: 8px
  border-radius-md: 12px
  border-radius-lg: 20px
  border-radius-pill: 9999px

components:
  # 주 CTA 버튼 — 핑크
  button-primary:
    background: pink
    color: pink-on
    borderRadius: border-radius-pill
    padding: "12px 24px"
    fontWeight: 600
    fontSize: 15px
    hover-background: pink-deep

  # 보조 버튼 — 연두
  button-secondary:
    background: lime-soft
    color: lime-on
    border: "1.5px solid lime-deep"
    borderRadius: border-radius-pill
    padding: "12px 24px"
    fontWeight: 600
    fontSize: 15px

  # 강조 버튼 — 골드
  button-accent:
    background: gold
    color: gold-on
    borderRadius: border-radius-pill
    padding: "12px 24px"
    fontWeight: 700
    fontSize: 15px

  # 카드
  card:
    background: canvas
    border: "1px solid hairline"
    borderRadius: border-radius-md
    padding: 20px
    shadow: "0 1px 4px rgba(0,100,200,0.06)"

  card-sky:
    background: canvas-sky
    border: "1px solid hairline"
    borderRadius: border-radius-md
    padding: 20px

  # 뱃지
  badge-pink:
    background: pink-soft
    color: pink-deep
    borderRadius: border-radius-pill
    padding: "3px 10px"
    fontSize: 12px
    fontWeight: 600

  badge-lime:
    background: lime-soft
    color: lime-text
    borderRadius: border-radius-pill
    padding: "3px 10px"
    fontSize: 12px
    fontWeight: 600

  badge-gold:
    background: gold-soft
    color: gold-text
    borderRadius: border-radius-pill
    padding: "3px 10px"
    fontSize: 12px
    fontWeight: 600

  # 입력 필드
  input:
    background: canvas
    border: "1.5px solid hairline"
    borderRadius: border-radius-sm
    padding: "12px 14px"
    fontSize: 16px
    focus-border: pink
    focus-shadow: "0 0 0 3px rgba(244,114,182,0.15)"

  # 내비게이션 바 (모바일 하단)
  nav-bar:
    background: canvas
    border-top: "1px solid hairline"
    active-color: pink
    inactive-color: ink-faint
    icon-size: 22px
    label-size: 11px

rules:
  - "배경은 항상 canvas(#FFFFFF) 또는 canvas-sky(#EAF6FF) 중 하나"
  - "포인트 색은 핑크(주 액션) · 연두(성공/완료) · 골드(강조/프리미엄) 역할 분리"
  - "텍스트에 순수 검정(#000) 사용 금지 — ink(#1E293B) 사용"
  - "그라데이션 남용 금지 — 사용 시 핑크→하늘 방향만 허용"
  - "모바일 퍼스트: 375px 기준 먼저, 768px+ 확장"
  - "터치 타겟 최소 44px"
  - "alert() 금지 — toast 함수 사용"
  - "이모지 금지 — Lucide SVG 아이콘 사용"
  - "여백: 16px / 24px / 32px 배수만"
  - "폰트 계층: 24px / 20px / 16px / 14px / 12px"
  - "카드에 shadow 과용 금지 — border + 연한 shadow 하나만"
  - "다크모드: canvas-sky 배경, 동일 포인트 색 유지"

dark-mode:
  canvas: "#0F172A"
  canvas-sky: "#1E293B"
  surface: "#162032"
  ink: "#F1F5F9"
  ink-muted: "#94A3B8"
  hairline: "#334155"
  hairline-soft: "#1E293B"
  # 포인트 색은 동일 유지 (핑크·연두·골드)
