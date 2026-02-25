# namou - 개발 진행 상황

## 프로젝트 개요
- **이름**: namou (구 CozyTable)
- **설명**: 식당 예약 관리 데스크톱 앱
- **기술 스택**: React 19, TypeScript 5.9, Vite 7.3, Electron 40, Zustand, dnd-kit, Tailwind CSS 4
- **빌드**: electron-builder (nsis), 출력 경로 `release/`
- **브랜치**: `claude/gifted-feistel`

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

### Round 4 - UI/UX 대폭 개선 (현재)
- [x] 프로그램 이름 namou 확인
- [x] 테이블 병합 분할 기능 추가 (`splitTable` action, `mergedFrom` 추적)
- [x] "타임테이블" -> "예약시간대"로 이름 변경
- [x] 예약시간대를 팝업 방식으로 변경 (상단바 버튼 클릭 시 모달 팝업)
- [x] 테이블 배치 후 맵 크기 자동 조정 (useMemo, 테이블 위치 기반)
- [x] 왼쪽 예약 리스트 너비 축소 (340px -> 280px)
- [x] 맵 비율 축소 + 테이블 크기 축소 (TABLE_WIDTH: 100->72, TABLE_BASE_HEIGHT: 80->60)
- [x] 테이블 스냅 정렬 기능 (SNAP_SIZE=12, `alignTables` action, 정렬 버튼)
- [x] 예약시간대 표시 간결하게 개선 (타임라인 바 + 시작 슬롯에만 카드 표시)
- [x] 나무 느낌 미니멀 색 테마 적용
- [x] SetupWizard 자동 캔버스 크기 적용
- [x] 소형 테이블 대응 (EditableTable, TableShape, DroppableTable 텍스트 축소)
- [x] TypeScript 체크 통과
- [x] 진행 상황 md 파일 생성

---

## 파일 구조

```
src/
├── App.tsx                          # 메인 앱 (2단 레이아웃 + 팝업)
├── index.css                        # 나무 느낌 미니멀 테마
├── data/
│   └── dummy.ts                     # 타입, 상수, 유틸
├── store/
│   └── useReservationStore.ts       # Zustand 상태관리
├── components/
│   ├── Sidebar.tsx                  # 예약 목록 (280px)
│   ├── FloorMap.tsx                 # 테이블 맵 (자동 크기)
│   ├── TimeTable.tsx                # 예약시간대 팝업
│   ├── SetupWizard.tsx              # 초기 설정 (자동 캔버스)
│   ├── EditableTable.tsx            # 편집 모드 테이블
│   ├── TableShape.tsx               # 일반 모드 테이블
│   ├── DroppableTable.tsx           # 드롭 대상 테이블
│   ├── TableEditPanel.tsx           # 테이블 편집 패널
│   ├── TablePopover.tsx             # 테이블 클릭 팝오버
│   ├── NewReservationModal.tsx      # 새 예약 모달
│   ├── ReservationCard.tsx          # 예약 카드
│   ├── DraggableReservationCard.tsx # 드래그 가능 예약 카드
│   └── DragOverlayContent.tsx       # 드래그 오버레이
├── lib/
│   └── cn.ts                        # clsx + twMerge
electron/
├── main.ts                          # Electron 메인 프로세스
package.json                         # namou 설정 + electron-builder
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
# 코드 서명 없이 빌드 (Windows)
npx cross-env CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --config.win.signAndEditExecutable=false

# 출력: release/namou Setup 1.0.0.exe
```

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
