# MoonYeon — 사장 1명 + AI 직원 팀

직원 0명인 1인 사업을 **AI 직원 17명**이 나눠 맡는 운영 시스템과, 그 성과를 보여 주는 **홈페이지**입니다.
사장은 휴대폰(텔레그램)으로 "이거 해줘" 한 줄 보내고, 고객에게 나가는 초안에 **승인**만 누릅니다.

## 구성

| 폴더 | 내용 |
|---|---|
| `config/business.json` | 회사 이름·소개·**회사 규칙**(모든 직원이 지키는 안전 규칙) |
| `config/employees.json` | 부서 5개, 직원 17명, 출근 시간(루틴), 텔레그램 방 6개 |
| `skills/*.md` | 직원별 **업무 지침서(스킬)** — 일하는 방식을 저장해 재사용 |
| `moonyeon/` | 실행 엔진 (Claude API) |
| `site/` | 홈페이지 (정적 HTML, 숫자는 `site/data/stats.json`에서 자동) |
| `data/inbox/<종류>/` | 직원에게 넘길 자료(주문 CSV, 댓글, 문의, 광고, 지출, 메일)를 넣는 곳 |
| `data/outputs/` · `data/outbox/` · `data/worklog.jsonl` | 결과물 · 승인 대기함 · 업무일지 (git 제외) |

### AI 직원 명단

| 부서 | 직원 | 출근 |
|---|---|---|
| ① 콘텐츠·채널 | 유튜브 기획·대본 작가 / 댓글 담당 / 경쟁 채널 감시 / 네이버 블로그 작가 → 블로그 검수관 / SNS 담당 | 평일 9시, 하루 4번, 주 3회, 매일 7시, 매일 13시 |
| ② 판매·고객 응대 | 주문 정리 / 고객 상담 / 광고 분석가 / 상세페이지 기획자 | 매일 0:45, 새벽 2·6시, 월요일 |
| ③ 조사·강의 | 자료 조사원 / 강의 자료 제작자 | 지시할 때 |
| ④ 서류·돈 | 경리 / 서류 담당 / 메일 담당 | 매월 1일, 평일 9·18시 |
| ⑤ 장치 | 비서실장(지시 분배·아침 브리핑) / 업무일지 담당 | 매일 8:30, 23:50 |

`python -m moonyeon team` 으로 언제든 확인할 수 있습니다. 직원을 늘리거나 시간을 바꾸려면 `config/employees.json`과 `skills/`만 고치면 됩니다.

## 안전장치

- 고객·외부로 나가는 직원(`customer_facing`)의 결과는 **승인 대기함**에 들어가고, 사장이 `/approve 번호`를 눌러야 승인됩니다.
- 블로그 원고처럼 `next`가 지정된 일은 **검수관을 통과한 버전만** 승인 대기함에 올라갑니다.
- 텔레그램 봇은 `TELEGRAM_OWNER_ID`(사장 본인)가 보낸 메시지만 받습니다.
- 모든 일(실패 포함)은 업무일지에 남고, 홈페이지 숫자도 여기서 집계됩니다. 숫자를 부풀리지 않습니다.

> 지금은 직원이 **초안·분석·보고**까지 합니다. 승인된 초안을 유튜브/네이버/당근/메일 등에 실제로 올리는 연동은 아직 없으므로, 승인 후 복사해 붙여 넣으면 됩니다. (연동을 붙이려면 `store.decide_outbox` 뒤에 채널별 발송 코드를 추가하세요.)

## 시작하기

```bash
pip install -r requirements.txt
```

```bash
cp .env.example .env   # API 키, 텔레그램 토큰/본인 id 입력
```

```bash
set -a && . ./.env && set +a
```

직원 한 명에게 바로 일 시키기:

```bash
python -m moonyeon run researcher "1인 사업자 종합소득세 신고 일정과 준비 서류 정리해 줘"
```

비서실장에게 한 줄 지시 (휴대폰 지시와 동일):

```bash
python -m moonyeon ask "오늘 주문 정리하고 추가 질문 답변 초안까지 써 줘"
```

텔레그램 방 + 매일 루틴 켜기 (24시간 서버에서 실행: `deploy/moonyeon.service` 또는 `Dockerfile`):

```bash
python -m moonyeon bot
```

텔레그램 명령: 한 줄 지시 · `/team` · `/run <직원id> <지시>` · `/outbox` · `/approve <번호>` · `/reject <번호>` · `/log`

## 홈페이지

```bash
python -m moonyeon stats
```

```bash
cd site && python3 -m http.server 8000
```

`site/` 폴더를 GitHub Pages·Netlify 등에 그대로 올리면 됩니다. `stats`를 다시 실행할 때마다 직원 수·루틴·업무일지 숫자가 갱신됩니다.

## 테스트

```bash
python -m pytest -q
```

AI 호출은 Claude API(`claude-opus-5-5`, 적응형 사고, 직원별 effort, 웹 검색, 거절 시 서버 측 대체 모델)를 사용합니다.
