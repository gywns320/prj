# 제주 API 데이터 검증 — 선생님이 만들고, 학생 사이트가 실시간으로 대조

Open API(비짓제주·제주in놀다)는 JSON 구조는 맞아도, 값이 다른 장소의 것이거나 틀린 경우가 있습니다.
**선생님**이 이 PC에서 API 크레딧으로 데이터를 검증해 **파일 하나**(`api/_corrections.js`)를 만들어 주면,
**학생**의 Vercel 사이트가 매 요청마다 실시간 Open API 응답을 그 파일과 대조해 보여줍니다. 학생에게는 API 키가 필요 없습니다.

```
선생님 PC                                                학생 Vercel 사이트
──────────                                              ────────────────
npm run verify        규칙 검사 + 원본 스냅샷 저장
npm run verify:agent  Claude가 웹 검색으로 외부 대조   ─┐
npm run verify:apply  수정 승인 → api/_corrections.js  ─┴─▶  파일 교체·배포
                                                         ▼
                                       실시간 Open API ─▶ 대조 ─▶ 화면
                                         · 맞음 그대로      → ✓ 검증됨
                                         · 아직 틀린 값     → 확인된 값으로 고쳐서 '정보 보정'
                                         · 그 사이 원본 바뀜 → 원본 그대로 + 서버 로그에 '다시 검증 필요'
                                         · 다른 장소의 내용 → 목록에서 숨김
```

## 선생님 (데이터 만들기)

**보통은 이것 하나면 됩니다** — 아래 단계를 차례로 돌리고 학생에게 줄 폴더 `handoff/날짜/`를 만듭니다.

```bash
npm run agent                          # 의심 항목만 AI 검증 (상한 $10). 키가 없으면 규칙 검사만
npm run agent -- --all --max-usd 50    # 전체 AI 검증 (끊겨도 다시 돌리면 이어서)
npm run agent -- --approve 12,15       # 대기 중인 AI 수정 승인 → 폴더 다시 만듦
```

단계를 하나씩 돌리고 싶을 때는 아래처럼 합니다.

`.env.local`에 키를 넣습니다. 이 파일은 git에 올라가지 않고, 학생에게 주지 않습니다.

```
ANTHROPIC_API_KEY=sk-ant-...
# (선택) VERIFY_MODEL=claude-sonnet-5-5   ← 더 싸게. 기본은 claude-opus-5-5
```

```bash
npm run verify                                   # 1. 최신 데이터를 받아 규칙 검사 (무료)
npm run verify:agent -- --limit 3                # 2-a. 먼저 3건만 시험 → verify/agent/날짜.md 확인
npm run verify:agent -- --all --max-usd 50       # 2-b. 전체(약 410건). 의심 항목부터, 4건씩 동시에
npm run verify:apply                             # 3. 수정 제안 목록 (번호는 고정)
npm run verify:apply -- --approve rule           #    규칙 검사 제안 전부 승인
npm run verify:apply -- --approve 12,15          #    번호로 승인  /  --reject 13 거절
```

- `verify:agent`는 **중간에 멈춰도** 다시 실행하면 남은 항목부터 이어서 합니다(같은 스냅샷 기준). 처음부터 다시 하려면 `--fresh`를 붙입니다.
- `--max-usd`는 토큰·검색 수로 계산한 **추정** 금액입니다. 실제 청구액은 Anthropic 콘솔에서 확인하세요.
- AI가 「틀림」으로 판정한 칸은 **근거 URL이 있어야** 제안이 되고, **승인해야** 파일에 들어갑니다. 「맞음」 판정(검증됨 배지)은 승인 없이 들어갑니다.
- 쌓이는 것: `snapshots/날짜/`(원본), `reports/`(규칙 검사), `agent/history.jsonl`(AI 판정, 날짜·모델별), `proposals.json`(승인·거절 이력).

다 끝나면 **`api/_corrections.js` 한 파일**을 학생에게 줍니다.

## 학생 (배포)

**처음 한 번**: 아래 코드가 프로젝트에 있어야 합니다. 선생님이 같이 주는 파일로 덮어씁니다.

| 파일 | 하는 일 |
|---|---|
| `api/_apply.js` | 실시간 응답과 검증 데이터를 대조 |
| `api/_corrections.js` | 검증 데이터 (선생님이 매번 새로 줌) |
| `api/_visitjeju.js`, `api/visitjeju.js`, `api/event.js`, `api/_tools.js` | 관광지·행사·AI 가이드 응답에 대조 적용 |
| `src/components/VerifyBadge.jsx`, `src/api/places.js`, `src/api/events.js`, `src/pages/EventDetail.jsx`, `src/components/NearbyPlaces.jsx`, `src/i18n/messages.extra.js`, `src/styles/theme.css` | 화면의 「✓ 검증됨」·「정보 보정」 표시 |

**그다음부터**: `api/_corrections.js`만 바꾸고 배포합니다 (git push 또는 `vercel --prod`).

**확인**: 브라우저 개발자 도구 → Network → `/api/event` 또는 `/api/visitjeju` 응답 헤더에서 이 값을 봅니다.

```
X-Data-Corrections: verified=… ; applied=… ; hidden=… ; upstream-fixed=… ; stale=…
```

- `stale`이 0보다 크면, 검증한 뒤에 원본 API가 바뀐 항목이 있다는 뜻입니다. Vercel 로그에 항목 번호가 남으니 선생님께 알려 다시 검증받습니다.
- `upstream-fixed`는 원본이 이미 고쳐져서 보정이 필요 없어진 칸 수입니다.
