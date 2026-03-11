# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

**직장 헬게이트 탈출 v2.0** — 직장인 스트레스 해소용 모바일 웹 탭 액션 게임.
단일 컴포넌트(`app.js`) 구조의 React 앱. 외부 서버·DB 없음.

---

## 아키텍처

### 파일 구조
- `app.js` — 전체 앱의 유일한 소스 파일 (React 컴포넌트 + 비즈니스 로직 모두 포함)
- `PRD.md` — 제품 요구사항 문서

### 주요 구성 요소 (app.js 내부)

| 레이어 | 설명 |
|--------|------|
| `AudioEngine` 클래스 | Web Audio API 래퍼. BGM·타격음·필살기·격파음 모두 프로그래매틱 생성 (외부 파일 없음). 싱글턴으로 모듈 레벨에 인스턴스화(`audioEngine`) |
| `vibrate()` 헬퍼 | `navigator.vibrate` 래퍼. 미지원 기기에서는 no-op |
| 리더보드 유틸 | `getLeaderboard()` / `saveScore()` / `calcScore()` — `localStorage` 키 `hellgate_leaderboard_v2`에 상위 10개 기록 저장 |
| `FloatingText` / `Shockwave` | 타격 이펙트 전용 표시 컴포넌트 |
| `App` (default export) | 3개 화면(`setup` → `game` → `result`)을 단일 `screen` state로 전환하는 메인 컴포넌트 |

### 화면 전환 흐름
```
screen === "setup"  →  startGame()  →  screen === "game"
screen === "game"   →  triggerDefeat() (마지막 빌런)  →  screen === "result"
screen === "result" →  setScreen("setup")
```

### 핵심 게임 로직

- **`handleHit`**: 탭/클릭 이벤트 처리. 데미지 계산(기본 4~11 + 콤보 보너스), 콤보 타이머(1600ms) 관리, 스킬 게이지 충전, 이펙트 트리거, HP 0 도달 시 `triggerDefeat()` 호출
- **`triggerDefeat`**: 빌런 격파 처리. 다음 빌런이 있으면 1400ms 후 `loadVillain()`으로 전환, 없으면 점수 계산 후 결과 화면으로 이동
- **`handleUltimate`**: 필살기 발동. 40~60 데미지 + 오디오/진동 이펙트

### 스타일링 방식
각 화면 함수의 맨 앞에 `<style>` 태그를 인라인으로 삽입하는 방식. CSS 클래스를 짧은 이름(`.s`, `.gw`, `.r`)으로 정의. CSS 애니메이션(`@keyframes`)도 동일하게 인라인 정의.

일부 스타일 값은 React state를 템플릿 리터럴로 직접 CSS에 삽입:
```js
background: ${bgFlash ? "..." : "..."}
width: ${hpPct}%;
```

### 점수 계산식
```
총 점수 = 공격 횟수 × 10 + 최대콤보 × 50 + 격파빌런수 × 200 + 스트레스해소율 × 5
```

---

## 개발 환경

이 프로젝트는 단일 `app.js`(React 컴포넌트)만 있는 상태로, **번들러·패키지 매니저·테스트 러너가 설정되어 있지 않음**.

앱인토스(Appintos) 등 외부 React 호스팅 환경에 `app.js`를 직접 업로드하는 방식으로 배포.

로컬에서 테스트하려면 React를 지원하는 CDN 기반 HTML 또는 Vite·CRA 프로젝트를 별도로 구성하고 `app.js`를 import해서 사용.

---

## 주요 제약 사항

- **외부 리소스 없음**: 사운드는 Web Audio API로 자체 생성, 이미지 없음, Google Fonts만 외부 로드
- **서버 없음**: 데이터 저장은 `localStorage`만 사용 (기기 내 로컬, 기기 간 공유 불가)
- **단일 파일 원칙**: 앱인토스 업로드 구조상 `app.js` 한 파일에 모든 로직과 스타일을 유지
