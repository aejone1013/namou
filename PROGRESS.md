# namou - 개발 진행 상황

## 프로젝트 개요
- **이름**: namou (구 CozyTable)
- **설명**: 식당 예약 관리 데스크톱 앱
- **기술 스택**: React 19, TypeScript 5.9, Vite 7.3, Electron 40, Zustand, dnd-kit, Tailwind CSS 4
- **빌드**: electron-builder (nsis/portable), 출력 경로 `release/`
- **브랜치**: `main`

---

## 완료된 작업

### Round 1 - 초기 실행 및 분석
- 앱 실행 및 구조 분석
- 개선 사항 제안

### Round 2 - 기본 기능 구현
- 프로그램 이름 `namou`로 변경
- 시간 슬롯: 점심 12:00-14:00, 저녁 19:00-21:30 (15분 간격)
- 테이블 기본값: 2인석, T+번호, 100x100 사각형
- 파티 사이즈 버튼 크게
- 드래그앤드롭 좌석 배정 수정
- 버튼 기반 좌석 배정 (테이블 선택)
- 탭 시스템: 대기/착석/완료
- "플로어 맵" 텍스트 제거
- 좌석 사용 수 표시
- 예약 수정 기능
- 삭제 확인 다이얼로그

### Round 3 - 예약 시스템 개선
- 예약 시스템 점심/저녁 분리
- 예약 시간 시작~종료 범위 표시
- 테이블 편집: +/- 버튼으로 좌석 수 변경
- 테이블 병합 간소화 (목록에서 클릭)
- 테이블 비우기 복원
- 좌석 수에 따라 테이블 높이 자동 조절
- 편집 패널에서 위치/크기 제거
- 가로 고정 + 세로만 리사이즈
- 타임테이블 우측 패널
- 3단 레이아웃: Sidebar | FloorMap | TimeTable

### Round 4 - UI/UX 대폭 개선
- [x] 테이블 병합/분할 기능 추가 (`splitTable` action, `mergedFrom` 추적)
- [x] "타임테이블" -> "예약시간대"로 이름 변경
- [x] 예약시간대를 팝업 방식으로 변경 (상단바 버튼 클릭 시 모달 팝업)
- [x] 테이블 배치 후 맵 크기 자동 조정
- [x] 왼쪽 예약 리스트 너비 축소 (340px -> 280px)
- [x] 맵 비율 축소 + 테이블 크기 축소 (TABLE_WIDTH: 100->72, TABLE_BASE_HEIGHT: 80->60)
- [x] 테이블 스냅 정렬 기능 (SNAP_SIZE=12, `alignTables` action, 정렬 버튼)
- [x] 예약시간대 표시 간결하게 개선 (타임라인 바 + 시작 슬롯에만 카드 표시)
- [x] 나무 느낌 미니멀 색 테마 적용
- [x] SetupWizard 자동 캔버스 크기 적용
- [x] 소형 테이블 대응 (EditableTable, TableShape, DroppableTable 텍스트 축소)

### Round 5 - 테이블 이동 및 예약 시스템 정교화
- [x] 테이블 레이아웃 리셋 버튼 (편집 모드, 확인 다이얼로그)
- [x] 테이블 간 손님 이동 기능 (`moveToTable` 액션, 팝오버 + 예약 카드)
- [x] 착석 탭에 테이블 라벨(T1, T2...) 표시
- [x] 예약 시간 90분 고정 (시작 시간으로 자동 계산)
- [x] 전화번호 프랑스 형식 (06 12 34 56 78 / +33)
- [x] reservation에 tableId 추적

### Round 6 - 기능 메뉴 및 다중 선택 정렬
- [x] 기능 메뉴 (Settings 아이콘): 레이아웃 편집, 예약 초기화, 레이아웃 초기화 분리
- [x] 시간 슬롯 필터 → 맵 우측 접이식 패널로 이동
- [x] 캔버스 크기 자동 맞춤
- [x] 테이블 다중 선택 정렬 (좌/우/상/하/가운데) 및 분배 (수평/수직)
- [x] 사이드바 부제목 "오늘의 예약관리" 제거

### Round 7 - 플로어맵 UX 및 통합 컨트롤 패널
- [x] ControlPanel.tsx: 테이블 상태별 우측 통합 컨트롤 패널
  - `AvailableTableActions`: 빈 테이블 — 예약/워크인 배정
  - `NextBookingSection`: 다음 예약 정보 표시 및 바로 착석 배정
  - `OccupiedMoveClearActions`: 착석 테이블 이동/비우기
  - `ReservedTableActionSection`: 예약된 테이블 착석 처리
- [x] Toast 알림 시스템 (`Toast.tsx`, `useToastStore.ts`, `toastPresets.ts`)
- [x] 정책 모듈 분리: `mergePlanner.ts`, `movePolicies.ts`, `clearTablePolicies.ts`
- [x] `floorMapStyles.ts` 스타일 분리
- [x] `useElementSize.ts` 훅 추가
- [x] SetupWizard 제거 (초기 설정 간소화)
- [x] DevTools 조건부 실행 (`OPEN_DEVTOOLS=true` 환경변수)
- [x] 기본 정책 단위 테스트 추가 (`mergePlanner.test.ts`, `movePolicies.test.ts`, `clearTablePolicies.test.ts`)

### Round 8 - 예약 표시 UX 및 빌드 환경 정비
- [x] `MapTopBar.tsx` 추가 (맵 상단 툴바 분리)
- [x] `plannedBookingPolicies.ts` 추가 (예약 배정 정책)
- [x] Vitest 테스트 환경 설정 (`vitest.config.ts`, `src/test/setup.ts`)
- [x] 앱 아이콘 추가 (`build/icon.ico`, `namou.jpg`, `public/favicon.jpg`)
- [x] `CODE_SIGNING.md` 코드 서명 문서화
- [x] 서명된 빌드 지원 (`CSC_LINK`, `CSC_KEY_PASSWORD` 환경변수)
- [x] 예약 카드 UX 대폭 개선 (ReservationCard 리팩토링)
- [x] 통합 테스트 추가 (`useReservationStore.integration.test.ts`, `plannedBookingPolicies.test.ts`)

### Round 9 - 겹치는 예약 배정 버그 수정
- [x] 병합 테이블에서 다음 예약(NextBookingSection) 표시 버그 수정
- [x] 겹치는 예약 배정 차단 로직 추가
- [x] `NextBookingSection.ui.test.tsx` UI 테스트 추가

### Round 10 - 착석 범위 겹침 배정 차단
- [x] 현재 착석 중인 테이블 범위와 겹치는 다음 예약 배정 차단
- [x] 통합 테스트 추가 (useReservationStore.integration.test.ts)

---

## 파일 구조

```
src/
├── App.tsx                                    # 메인 앱 (2단 레이아웃)
├── index.css                                  # 나무 느낌 미니멀 테마
├── main.tsx                                   # Electron 렌더러 엔트리
├── data/
│   └── dummy.ts                               # 타입, 상수, 유틸
├── store/
│   ├── useReservationStore.ts                 # Zustand 상태관리 (메인)
│   ├── useReservationStore.integration.test.ts
│   ├── useToastStore.ts                       # 토스트 알림 상태
│   ├── mergePlanner.ts / .test.ts             # 병합 정책
│   ├── movePolicies.ts / .test.ts             # 이동 정책
│   ├── clearTablePolicies.ts / .test.ts       # 비우기 정책
│   └── plannedBookingPolicies.ts / .test.ts   # 예약 배정 정책
├── components/
│   ├── Sidebar.tsx                            # 예약 목록 (280px)
│   ├── FloorMap.tsx                           # 테이블 맵
│   ├── MapTopBar.tsx                          # 맵 상단 툴바
│   ├── ControlPanel.tsx                       # 우측 통합 컨트롤 패널
│   ├── control-panel/
│   │   ├── AvailableTableActions.tsx          # 빈 테이블 액션
│   │   ├── NextBookingSection.tsx             # 다음 예약 섹션
│   │   ├── NextBookingSection.ui.test.tsx
│   │   ├── OccupiedMoveClearActions.tsx       # 착석 이동/비우기
│   │   └── ReservedTableActionSection.tsx     # 예약 테이블 액션
│   ├── TimeTable.tsx                          # 예약시간대 팝업
│   ├── EditableTable.tsx                      # 편집 모드 테이블
│   ├── TableShape.tsx                         # 일반 모드 테이블
│   ├── DroppableTable.tsx                     # 드롭 대상 테이블
│   ├── TableEditPanel.tsx                     # 테이블 편집 패널
│   ├── TablePopover.tsx                       # 테이블 클릭 팝오버
│   ├── FunctionMenu.tsx                       # 기능 메뉴
│   ├── NewReservationModal.tsx                # 새 예약 모달
│   ├── ReservationCard.tsx                    # 예약 카드
│   └── Toast.tsx                              # 토스트 알림 UI
├── features/
│   ├── floor-map/floorMapStyles.ts            # 맵 스타일 상수
│   └── toast/toastPresets.ts                  # 토스트 프리셋
├── hooks/
│   └── useElementSize.ts                      # 엘리먼트 크기 훅
├── lib/
│   └── cn.ts                                  # clsx + twMerge
└── test/
    └── setup.ts                               # Vitest 설정
electron/
└── main.ts                                    # Electron 메인 프로세스
```

---

## 주요 상수 및 설정

| 항목 | 값 |
|------|-----|
| TABLE_WIDTH | 72px |
| TABLE_BASE_HEIGHT | 60px |
| TABLE_HEIGHT_PER_EXTRA | 18px/석 |
| SNAP_SIZE | 12px |
| 사이드바 너비 | 280px |
| 편집 패널 너비 | 200px |
| 점심 시간 | 12:00 - 14:00 |
| 저녁 시간 | 19:00 - 21:30 |
| 시간 간격 | 15분 |
| 예약 시간 | 90분 고정 |

---

## 색상 테마 (나무 느낌 미니멀)

| 이름 | 값 | 용도 |
|------|-----|------|
| cream | #F7F3ED | 배경 |
| surface | #FEFCF9 | 카드/패널 |
| primary | #8B6F47 | 주요 액션 |
| primary-dark | #6B5535 | 호버 |
| charcoal | #3A3128 | 텍스트 |
| occupied | #C75B3F | 사용중 |
| available | #5B8C5A | 비어있음 |
| reserved | #C4A44A | 예약됨 |

---

## .exe 빌드 방법

```bash
# 코드 서명 없이 빌드
npm run electron:build:clean

# 코드 서명 포함 빌드 (PowerShell)
$env:CSC_LINK="C:\path\to\cert.pfx"
$env:CSC_KEY_PASSWORD="password"
npm run electron:build:signed:clean

# 출력: release/namou-1.0.0-setup.exe, release/namou-1.0.0-portable.exe
```

자세한 내용: `CODE_SIGNING.md` 참조

---

## 테스트

```bash
npx vitest run
```

- `src/store/*.test.ts` — 정책 단위 테스트
- `src/store/useReservationStore.integration.test.ts` — 통합 테스트
- `src/store/plannedBookingPolicies.test.ts` — 예약 배정 정책 테스트
- `src/components/control-panel/NextBookingSection.ui.test.tsx` — UI 테스트

---

## localStorage 키
- `namou-storage`: Zustand persist 상태 (테이블, 예약, 설정)

---

## 향후 개선 아이디어
- 예약 데이터 내보내기/가져오기
- 날짜별 예약 관리
- 인쇄 기능
- 다국어 지원
- 테이블 모양 다양화 (원형, 부스 등)
- 알림/리마인더
- 통계 대시보드
