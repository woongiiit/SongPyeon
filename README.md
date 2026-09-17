# 송편 (SongPyeon)

추석에 스마트폰으로 송편 아웃라인을 따라 그리고, 정확도·속도로 겨루는 모바일 웹앱입니다.

## 플로우

입장 → 송편빚기 → 재료선택(깨/콩/밤) → 시작 → 아웃라인 따라 그리기 → 완성 → 결과(카톡 공유 / 다시빚기)

## 로컬 실행

```bash
cp .env.example .env
# VITE_KAKAO_JS_KEY 설정 (DATABASE_URL 없으면 메모리 랭킹으로 동작)

npm install
npm run dev
```

- 클라이언트: http://localhost:5173 (API는 `/api` 프록시)
- 서버: http://localhost:8080

## 점수 산식

- **정확도**: 스트로크 ↔ 아웃라인 평균 거리 `d` → `100 - d * 2.5` (커버리지 60% 미만 시 감점)
- **속도**: 0.1초마다 0.5점 감점 (`100 - floor(초×10)×0.5`, 최소 0)
- **종합**: `accuracy * 0.7 + speed * 0.3`

## Railway 배포

1. GitHub 저장소 [woongiiit/SongPyeon](https://github.com/woongiiit/SongPyeon) 연결
2. Postgres 플러그인 추가 → `DATABASE_URL` 자동 주입
3. 변수 설정
   - `VITE_KAKAO_JS_KEY` — 카카오 JavaScript 키 (**빌드 시 Docker ARG로 주입**, Variables에 설정 후 재배포)
   - `PORT` — Railway가 주입하면 그대로 사용
4. Dockerfile 기반 배포 (`railway.toml` 참고)
5. 빌드 로그에서 `RUN npm run build`가 `cached`가 아닌지 확인 (키가 번들에 들어갔는지)

## 카카오톡 공유

1. [카카오 개발자](https://developers.kakao.com) 앱에서 JavaScript 키 확인
2. **앱 > 플랫폼 / 제품 링크**에 Railway 웹 도메인 등록
3. `VITE_KAKAO_JS_KEY`를 Railway에 설정 후 재배포

## 스택

Vite + React + TypeScript / Express / PostgreSQL (없으면 인메모리)
