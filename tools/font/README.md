# GDS 폰트 서브셋 — assets/fonts/

GDS 폰트는 **Noto Sans KR 단일**입니다 (`data/type-decisions.json`, 강민관 2026-08-04).

사이트가 다른 폰트로 렌더되면 타이포 견본이 원본과 다른 글꼴로 보입니다 — 문서가 스스로를 반증하는 상태가 됩니다. 그래서 `build/font.js` 가 빌드 단계에서 **모든 페이지의 본문 폰트 선언을 GDS 폰트로 교체**하고, 서브셋 woff2 를 base64 로 임베드합니다.

## 왜 서브셋인가

`build/check.js` 가 **외부 리소스 참조를 금지**합니다(자기완결 원칙). 웹폰트 CDN 을 못 쓰므로 파일을 임베드해야 하는데, Noto Sans KR 한국어 서브셋 원본은 weight 당 **532 KB** 입니다. 3종이면 1.6 MB — 페이지마다 base64 로 넣기엔 과합니다.

사이트에 실제로 쓰이는 문자만 남기면 weight 당 **약 40 KB** 로 줄어듭니다.

| 파일 | 크기 |
|---|---|
| `assets/fonts/noto-sans-kr-400.woff2` | ~40 KB |
| `assets/fonts/noto-sans-kr-500.woff2` | ~40 KB |
| `assets/fonts/noto-sans-kr-700.woff2` | ~40 KB |
| `assets/fonts/coverage.txt` | 서브셋에 포함된 문자 전체 |

## 언제 재생성해야 하나

`npm run check` 의 **`서브셋 글리프 누락 없음`** 항목이 실패하면 재생성이 필요합니다. 페이지에 새 한글이 들어왔는데 폰트에 그 글자가 없다는 뜻이고, 그대로 두면 두부(□)로 렌더됩니다. 실패 메시지에 누락 문자가 찍힙니다.

## 재생성 절차

**네트워크와 Python 이 필요합니다.** 빌드·CI 에는 들어가지 않습니다 — 저장소의 "외부 패키지 미설치" 원칙을 지키기 위해 산출물(woff2)만 커밋합니다.

```bash
# 1. 원본 폰트 받기 (임시 디렉터리)
mkdir -p /tmp/fontdl && cd /tmp/fontdl
npm i --no-save @fontsource/noto-sans-kr@5

# 2. 도구
pip install fonttools brotli --break-system-packages

# 3. 현재 페이지에 쓰인 문자 수집 (저장소 루트에서, 빌드 후)
cd <저장소 루트>
node -e '
const fs=require("fs");let t="";
for(const f of ["dist/index.html","dist/diagnostics.html","dist/decisions/index.html"])
  t+=fs.readFileSync(f,"utf8");
const cur=new Set([...fs.readFileSync("assets/fonts/coverage.txt","utf8")]);
for(const c of t) cur.add(c);
const keep=[...cur].filter(c=>{const p=c.codePointAt(0);
  return (p>=0x20&&p<0x7f)||(p>=0xac00&&p<=0xd7a3)||(p>=0x3131&&p<=0x318e)||(p>=0x2010&&p<=0x203a);});
fs.writeFileSync("assets/fonts/coverage.txt",keep.sort().join(""));
console.log("문자 수:",keep.length);'

# 4. 서브셋 생성
for w in 400 500 700; do
  python3 -m fontTools.subset \
    /tmp/fontdl/node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-$w-normal.woff2 \
    --text-file=assets/fonts/coverage.txt --flavor=woff2 --layout-features='*' --no-hinting \
    --output-file=assets/fonts/noto-sans-kr-$w.woff2
done

# 5. 확인
npm run build && npm run check
```

3번 단계는 **기존 coverage 에 새 문자를 더하기만** 합니다 — 빼지 않으므로 이전 페이지의 글자가 사라질 일은 없습니다.

## 라이선스

Noto Sans KR — SIL Open Font License 1.1. 서브셋·임베드·재배포가 허용되며, 폰트 자체를 판매하지 않는 한 별도 표기 의무는 없습니다. 원본: <https://fonts.google.com/noto/specimen/Noto+Sans+KR>

## 주의

- `build/font.js` 는 `font-family` 선언 중 **모노스페이스가 아닌 것을 전부** 원본으로 바꿉니다. 코드 표기용 `ui-monospace, ... monospace` 선언은 그대로 둡니다.
- 사이트 소스(`site/*.html`)의 폰트 선언은 그대로 둬도 됩니다 — 빌드가 덮어씁니다. 다만 혼동을 줄이려면 소스도 GDS 폰트로 맞춰 두는 편이 낫습니다.
