#!/usr/bin/env node
/**
 * prose-check 1차 검사. 후보를 뽑을 뿐 통과 판정을 하지 않는다.
 *
 * 낱말 목록은 자주 나오는 실수의 예일 뿐이다. 다음 실수는 여기 없는 낱말로
 * 나온다. 판정은 references/korean-patterns.md의 네 질문과 references/rules.md가 한다.
 *
 * 일부러 원시 텍스트를 훑는다. SVG <text>, 표 머리, title·alt 속성, 칩 라벨까지 본다.
 * 본문만 고치면 도형 안 글자가 그대로 남기 쉽기 때문이다.
 *
 * 글이 아닌 영역은 보지 않는다. <script>·<style>·HTML 주석·<pre>·코드 블록·코드 스팬(백틱, <code>)이다.
 * 코드 스팬은 지우지 않고 한 어절로 센다(rules.md 4절). 블록 요소의 태그(</p>·</li>·</td>·<br> 등)는
 * 문장 경계다. 줄바꿈 없는 HTML에서 이웃 요소의 글이 한 문장으로 붙지 않게 한다.
 *
 * 프로젝트는 자기 분야의 사실 표현을 `.prose-check-allow`에 적을 수 있다(SKILL.md "Allow list").
 * 그 글자 안에 있는 낱말 후보는 보고하지 않고, 뺀 수만 보인다.
 *
 * 긴 문장·명사 사슬 후보는 낱말 후보와 따로 센다. 어절 수는 기준이지 상한이 아니다.
 * 주제가 하나인 긴 문장은 그대로 둔다.
 *
 * 낱말 하나만 보지 않고 파일 전체도 본다. 같은 일을 두 낱말로 부르는 짝(STE 1.11)과 문형마다 뜻이
 * 갈리는 가벼운 동사(STE 1.3)는 한 글 안에 두 쪽이 다 나올 때 후보가 된다.
 *
 * 마크다운·HTML 글은 문장마다 높임 등급을 가린다(K9). HTML은 요소 종류로 줄 종류를 정한다. 제목·표 칸·버튼은
 * 이름표라 세지 않는다. 형태소 분석기 Kiwi가 있으면 축약형·구어 부사·감탄사(K10)를 형태소로 찾고,
 * 겉모양으로 못 가린 문장 끝도 형태소로 가린다. Kiwi가 없으면 정규식만 사용한다.
 *
 * 후보마다 심각도를 붙인다. S1은 한 번만 나와도 보인다. S2는 한 파일에서 같은 규칙이 세 번 이상 나올 때만
 * 하나씩 보이고, 그보다 적으면 한 줄로 묶는다. 사람 글에도 흔하거나 정밀도가 낮은 표지가 S2다.
 *
 * 후보마다 STE 규칙 번호(references/rules.md 2절)나 한국어 고유 규칙 번호(K1~K12)를 붙인다.
 * 프로젝트에 자체 규칙이 있으면 그것이 먼저다.
 *
 *   node check.mjs [--procedure] 글.html 문서.md ...
 *   node check.mjs --diff [--procedure] [경로...]
 *   node check.mjs --staged [경로...]
 *   node check.mjs --base=main [경로...]
 *   node check.mjs --setup
 *
 *   --procedure    절차 글 기준을 적용한다. 한국어 12어절, 영어 20단어 (STE 5.1).
 *                  기본은 설명 글 기준이다. 한국어 15어절, 영어 25단어 (STE 6.3).
 *   --diff         커밋하지 않은 변경(git diff HEAD)과 추적하지 않는 새 파일만 본다.
 *   --staged       스테이징한 변경(git diff --cached)만 본다.
 *   --base=<ref>   <ref>에서 갈라진 뒤 이 브랜치의 변경(git diff <ref>...HEAD)만 본다.
 *   --code         diff 모드에서 js·ts 파일도 본다. 기본은 글 파일(md·txt·html·svg·json)만 본다.
 *   --setup        형태소 분석기(kiwipiepy)를 데이터 폴더에 설치한다. 한 번만 하면 된다.
 *   --skip-setup   형태소 분석기를 설치하지 않기로 기록한다. 다음부터 설치를 권하지 않고 정규식만 사용한다.
 *   --no-morph     형태소 분석기 없이 정규식만 사용한다.
 *   --all          S2 후보를 횟수와 상관없이 모두 하나씩 보인다.
 *   --json         후보를 JSON으로 출력한다. 원본 저장소의 회귀 시험(scripts/prose-check/test.mjs)이 사용한다.
 *   --tsv=<파일>   후보를 판정 표로 저장한다. label 칸을 채운 뒤 원본 저장소의 scripts/prose-check/precision.mjs로
 *                  규칙별 정밀도를 측정한다.
 *
 * diff 모드에서는 파일 전체를 읽어 문장을 나누고, 추가되거나 바뀐 줄에 있는 후보만 보고한다.
 * 경로를 주면 git pathspec으로 범위를 좁힌다. 코드 주석은 일부러 압축해 작성한 글이라 기본 범위에서
 * 뺀다(SKILL.md Step 0).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { tokenize, setup, venvPython, dataDir, setupSkipped, skipSetup } from './lib/kiwi.mjs';
import { maskCode, MARKDOWN, HTML, htmlEntries, linesOf, sentencesOf as splitSentences, surfaceLevel, morphLevel, LEVEL_NAME } from './lib/text.mjs';

// ── 뜻이 둘인 동사 (STE 1.3) — 쓰다·두다·잡다. 기준은 korean-patterns.md §5 ──
/** 받침이 없고 모음이 ㅏ·ㅐ·ㅓ·ㅕ·ㅘ·ㅙ·ㅝ·ㅞ인 글자 전부. `-아/-어` 연결어미로 끝나는 말의 마지막 글자다 */
const OPEN_AEO = [...Array(19).keys()].flatMap((i) => [0, 1, 4, 6, 9, 10, 14, 15].map((v) => String.fromCharCode(0xac00 + (i * 21 + v) * 28))).join('');
/** 모음은 같지만 동사가 아닌 말의 마지막 글자 — 더·다·저·하나·개·대·채·배·째·여러·아마·자·야·조사 가 */
const NOT_VERB_END = '더다저나개대채배째러마자야가';
/** 쓰다의 활용형. `쓸모`·`쓸데`는 `쓸 `이 아니라 빠지고, `쓰임새`는 뒤를 본다 */
const SSEU = '(?:쓴다|씁니다|쓰(?:고|는|며|면|지|기|려|도록|자|인다|이는|이고|이며|이면|이지|입니다|일(?= )|여|였)|쓰임(?!새)|쓰인(?= )|쓴(?= )|쓸(?= )|써(?= |서|야|도)|썼|쓰다(?![가-힣]))';
/** 굳은 합성어 — 덮어쓰다·글쓰기·띄어쓰기·붙여쓰기·받아쓰기·애쓰다·힘쓰다·신경 쓰다·마음 쓰다·읽기·쓰기 */
const SSEU_IDIOM = '(?:덮어|글|띄어|들여|붙여|받아|애|힘|신경 ?|마음 ?|읽기[·/,]? ?)';
/**
 * 두다의 활용형. 기본형 `두다`와 연결형 `두어`(두어야·두어서·두어도·두어라, 쉼표·마침표 앞)도 본다.
 * 수사 `두`·`둘`·`두어`와 겹치는 꼴(`두 개`·`둘 다`·`두어 번`)은 넣지 않는다
 */
const DU = '(?:둔다|둡니다|두(?:고|는|며|면|지|기|려|도록|었)|둔(?= )|둬|뒀|(?<![가-힣])두다(?![가-힣])|(?<![가-힣])두어(?:야|서|도|라|(?=\\s*(?:[,.;:)]|$))))';
/** 유지 뜻 — 그대로 둔다 · 그냥 둔다 · 가만히 둔다 · ~게 둔다 */
const DU_KEEP = '(?:그대로|그냥|가만히?|[가-힣]게) ?';
/** 보조 용언 `-아/-어 두다`(저장해 둔다 · 찾아 둔 후보) — 결과를 유지하는 뜻이라 뺀다 */
const DU_AUX = `(?![${NOT_VERB_END}])[${OPEN_AEO}]\\s?`;
/** 굳은 말 — 앞두다·그만두다·거두다·가두다 */
const DU_IDIOM = '(?:앞|그만|거|가)';
/** 잡다의 활용형. `잡지`는 `않·못` 앞에서만, `잡다`는 홀로 있을 때만 본다 */
const JAB = '(?:잡는다|잡습니다|잡(?:고|는|은|을|으면|으며|기|도록|으려)|잡아(?!먹)|잡았|잡지(?= ?않| ?못)|잡다(?![가-힣])|잡힌다|잡힙니다|잡(?:히는|히고|히면|혀|혔)|잡힌(?= ))';
/**
 * catch 뜻 — 목적어가 예외·오류·에러·실패·버그·Error·Exception. 부사 하나는 건너뛴다(오류를 모두 잡는다).
 * 코드 스팬(`ApiError`)은 가린 글에서 공백 세 칸 이상이다. 그것이 목적어면 예외 클래스로 보고 catch로 센다
 */
const JAB_CATCH = '(?:예외|오류|에러|실패|버그|[A-Za-z]*(?:[Ee]rror|[Ee]xception)|[ ]{3,})[를을만도는은이가]?\\s?(?:[가-힣A-Za-z]+\\s)?';
/** 굳은 말 — 붙잡다·사로잡다·걷잡다·손잡이·자리 잡다·틀을 잡다·균형을 잡다·중심을 잡다·방향을 잡다·감을 잡다·초점을 잡다 */
const JAB_IDIOM = '(?:붙|사로|걷|손|바로|자리를? ?|틀을 ?|균형을 ?|중심을 ?|방향을 ?|감을 ?|초점을 ?)';
const sseuRe = () => new RegExp(`(?<!${SSEU_IDIOM})${SSEU}`, 'g');
const duRe = () => new RegExp(`(?<!${DU_KEEP})(?<!${DU_AUX})(?<!${DU_IDIOM})${DU}`, 'g');
const jabRe = () => new RegExp(`(?<!${JAB_CATCH})(?<!${JAB_IDIOM})${JAB}`, 'g');
/** 쓰다의 두 뜻을 문형으로 가른다 — 목적어가 글이면 작성, 매체에 `에`면 작성, 나머지는 사용 */
const WRITE_OBJ = '(?:글|문장|문서|코드|주석|로그|메시지|제목|본문|설명|문단|보고서|메일|문구|글자|답|목록|요약|정의|이유|근거|테스트|스크립트|쿼리|SQL|리뷰|댓글|커밋 메시지|PR 본문|한 줄|두 줄|줄)';
const WRITE_FORM = '(?:명사구|명령형|의문형|해라체|합쇼체|영어|한국어|한글|대문자|소문자|목록|표|번호|문장|단수|복수|현재형|과거형|능동|수동|줄임말|약어|기호|숫자|단위|백분율)';
const WRITE_MEDIUM = '(?:글|로그|파일|코드|문서|표|칸|줄|본문|주석|메일|화면|테이블|디스크|메모리|DB|데이터베이스|버퍼|스토리지|S3|시트|노트|셀|필드|란|여기|거기|위|아래|옆|앞|뒤|끝|제목)';

/** 굵게 한 글이 문장 하나인가. 여섯 어절 이상이거나, 네 어절 이상이고 종결어미로 끝나면 문장으로 본다 */
function boldSentence(inner) {
  const t = inner.trim();
  const n = t.split(/\s+/).length;
  return /[가-힣]/.test(t) && (n >= 6 || (n >= 4 && /[가-힣](?:다|요|죠|까)[.?!]?$/.test(t)));
}

/**
 * 산문 속 줄표인가. 표 칸을 혼자 채운 줄표(`| — |`·`<td>—</td>`)는 빈 칸 표시이고,
 * URL 앞뒤의 줄표(`제목 — https://… — 설명`)는 출처 구분이라 뺀다.
 * K12는 한국어 본문 규칙이다. 줄표 뒤에 한글이 없으면(영어 글, `**용어** — English`) 보지 않는다.
 * 마크다운 제목 줄도 본문이 아니라 뺀다
 */
function proseDash(m, t) {
  const start = t.lastIndexOf('\n', m.index) + 1;
  const rest = t.slice(m.index + m[0].length, m.index + m[0].length + 30).split('\n')[0];
  if (!/[가-힣]/.test(rest) || /^ {0,3}#{1,6}\s/.test(t.slice(start, m.index))) return false;
  const before = t.slice(Math.max(0, m.index - 3), m.index);
  const after = rest.slice(0, 12);
  if (/\|[ \t]*$/.test(before) && /^[ \t]*\|/.test(after)) return false;
  if (/>[ \t]*$/.test(before) && /^[ \t]*<\//.test(after)) return false;
  if (/^[ \t]*<?https?:/.test(after)) return false;
  return !/https?:\/\/\S+>?[ \t]*$/.test(t.slice(start, m.index));
}

/** 같은 글자로 끝나는 명사 — 개요·필요(요), 화면·측면·표면(면). 문서·순서(서)는 앞 글자에 받침이 있어서 따로 거른다 */
const HEAD_NOUN_YO = /(?:필요|중요|주요|수요|개요|요요|소요|강요|불필요)$/;
const HEAD_NOUN_MYEON = /(?:화|측|표|단|정|도|지|평|전|후|국|방|장|반|내|외|양|이)면$/;
/**
 * 표 머리 칸이 동사 형태로 끝났는가(STE 9.4). 표 머리는 명사구로 작성한다: `고쳐서`·`나오면`·`그대로 둔다`는 후보다.
 * `-서`는 `-아/-어서`(고쳐서·바꿔서)만 본다. `-고`·`-지`는 참고·경고·메시지 같은 명사가 많아서 보지 않는다
 */
function predicateHead(cell) {
  const t = cell.replace(/[*_~]/g, '').replace(/\s*\([^()]*\)$/, '').trim();
  if (!/[가-힣]$/.test(t)) return false;
  if (/(?:다|죠|까)$/.test(t)) return true;
  if (/요$/.test(t)) return !HEAD_NOUN_YO.test(t);
  if (/서$/.test(t)) return new RegExp(`[${OPEN_AEO}]서$`).test(t);
  if (/면$/.test(t)) return !HEAD_NOUN_MYEON.test(t);
  return false;
}
/** `~에 있어서`의 앞말이 위치를 뜻하면 `있다`의 원래 뜻이다. 빈 앞말은 코드 스팬(가린 글에서 공백)이다 */
const IN_PLACE = /^$|(?:안|밖|뒤|앞|위|아래|옆|곳|쪽|끝|사이|속|가운데|근처|내부|외부|폴더|파일|목록|명단|저장소|서버|클러스터|문서|화면|코드|표|테이블|칸|줄|브랜치|경로|캐시|메모리|큐|본문|자리|[0-9A-Za-z)\]`'"’”])$/;

const HEAD_FIX ='표 머리는 명사구로 작성한다: 고쳐서 → 바꾼 말 · 고치는 방향, 나오면 → 있던 말';

/**
 * 낱말·문형 규칙. sev가 없으면 S1이다. mode가 'regex'면 형태소 분석기를 사용하지 않을 때만 적용한다.
 * when은 정규식이 맞은 뒤 한 번 더 거르는 조건이다.
 * @type {{id:string,tag:string,re:RegExp,not?:RegExp,fix:string,sev?:'S1'|'S2',mode?:'regex',when?:(m:RegExpExecArray,text:string)=>boolean}[]}
 */
const RULES = [
  // ── A. 지어낸 비유 ────────────────────────────────────────────
  { id: 'A', tag: '지어낸 비유 · K3', re: /문지기|바깥에서 오는 문|짚어 가|손가락으로/g, fix: '코드에 있는 이름을 사용한다: 진입점 · 규칙 검사 · 식별자를 따라간다' },

  // ── B. 레포 주석 말투 (STE 1.10) ─────────────────────────────
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /냅니다|낸다/g, not: /(?:알아|보|지어|해|끝|꺼|드러|만들어)(?:냅니다|낸다)/, fix: '만든다 · 돌려준다 · 기록한다 · 보여준다 중 하나를 고른다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /내놓|내주/g, fix: '넘겨준다 · 알려 준다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /(?<![가-힣])(?:잽니다|잰다|쟀다|쟀습니다|잰|재(?:나|는|려는|려고|려면|도록|서|며|면|어))(?![가-힣])/g, fix: '계산한다 · 측정한다 · 알아낸다' }, // `재고`는 명사(재고 수량)와 겹쳐 뺀다
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /[을를이가] (?:진다|집니다)|진 행|지고 있는다/g, fix: '한다 · 딸린' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /임자/g, fix: '정하는 모듈 · 부르는 함수' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /에 삽니다|더 산다|따로 산다|안에 산다|베껴 삽니다/g, fix: '들어 있다 · 하나를 더 추가한다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /나른다|나릅니다/g, fix: '전달한다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /한 덩이|덩이로/g, fix: '한 묶음' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /동봉/g, fix: '옆에 같이 붙인다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /관용구/g, fix: '같은 코드' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /1급 단위|일급 단위/g, fix: '기본 단위' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /무주공산/g, fix: '가리키는 곳 없음' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /유일한 표면|공개 표면/g, fix: '유일한 입구' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /한 마디|마디를/g, fix: '하나 · 경로 조각' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /[0-9]벌|한 벌|두 벌/g, fix: '하나 · 사본 하나' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /예산 [0-9]/g, fix: '최대 N' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /[0-9]겹/g, fix: 'N단계' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /걷어냈|걷었/g, fix: '없앴다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /물고 있|갈아끼우|뜬 서버/g, fix: '유지한다 · 바꾼다 · 실행 중인 서버' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /싣는|실린다|실립니다|실려 간다/g, fix: '담는다 · 들어간다 · 같이 커밋된다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /품는다|품습니다|품은 |품고 /g, fix: '안에 담는다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /얹고|얹는다/g, fix: '붙이고 · 붙인다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /깃헙 꼴|[가-힣] 꼴(?:의|로|이)/g, fix: '~처럼 보여주는 · ~ 형태' },
  // 목적어가 수인 꼴(`문서 수를 센다`·`행을 센다`)은 실제로 세는 일이라 뺀다. `챌린지를 센다`는 후보로 보고하고 §6이 판정한다
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /(?<!(?:수|행|줄)[를을] )세다|(?<!(?:수|행|줄)[를을] )셉니다|(?<!(?:수|행|줄)[를을] )셌(?:다|습니다)|(?<!수|행|줄)[을를] 센다|센 값|센 후보|세는 (?:것|수|숫자)|후보 세기/g, fix: '읽는다 · 찾는다 · 모은다 · 뽑는다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /섭니다|[가-힣] 선다|안 서고| 서고 | 서는 | 섰다| 설 수|세웁니다|세우고|세운다/g, not: /(?:앞|먼저|가로)?서다/, fix: '나온다 · 만든다 · 생긴다' },
  // 찍다(출력 뜻)는 개발자끼리의 말투다. 로그·콘솔·화면 같은 출력 대상이 앞에 올 때만 본다(사진·도장을 찍는다는 뺀다)
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /(?:로그|콘솔|화면|CLI|터미널|stdout|stderr|출력|값|변수|메시지)[을를에가이]?\s(?:[가-힣A-Za-z]+\s)?찍(?:는다|습니다|는\s|어|었|고\s|을\s|으면|힌|히는|힌다|혀)/g, fix: '출력한다 · 기록한다 · 화면 사진이면 캡처한다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /짚는|짚기|짚어|짚을 것/g, fix: '따라간다 · 미리 알아둘 것' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /[에이가] 묻는|물었습니다|못 묻/g, fix: '찾아온다 · 조회한다 · 질문한다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /앉은 자리/g, fix: '감싸는 선언' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /도는 코드|안 도는|로 돈다/g, fix: '실행되는 코드 · 호출되지 않는 · 실행한다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /넘어가는 모양|만난 모양|같은 모양/g, fix: '주고받는 타입 · 타입으로 사용한 선언 · 같은 형태' },

  { id: 'B', tag: '주석 말투 · STE 1.10', re: /(기능|개요|요약|부록) 장|장 머리|장 자체|이 장은|그 장의|각 장의|다른 장의/g, fix: '절 · 섹션. 그 글이 실제로 사용하는 말로 바꾼다' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /걸음마다|다음 걸음|[0-9가-힣] 걸음/g, fix: '단계 · 차례' },
  { id: 'B', tag: '주석 말투 · STE 1.10', re: /물고 있|세운다\.|한 줄을 세운다/g, fix: '유지한다 · 보여 준다' },

  // ── C. 직역투 (K2·K6) ────────────────────────────────────────
  // 영어 문장 틀을 옮긴 문형 (K6). 한 번만 나와도 고칠 것이 많다
  { id: 'C', tag: '직역투 문형 · K6', re: /하는 것이 전부|에 답합니다|고장이 아닙니다|버그가 아닙니다/g, fix: '그것만 한다 · ~를 알아낸다 · ~는 정상이다' },
  { id: 'C', tag: '직역투 문형 · K6', re: /요점입니다|볼 것은|판단이 앞에|확대판/g, fix: '그 사실만 작성한다' },
  // `뜻을 갖지 않는다`·`권한을 갖는다`는 have 직역이다 — `뜻이 없다`·`권한이 있다`
  { id: 'C', tag: '직역투 문형 · K6', re: /를 가지고 있|[을를] 갖(?:는다|습니다|고 있|지 않|지 못)|[을를] 가지지 (?:않|못)/g, fix: '~가 있다 · ~가 없다' },
  // 영어 전치사를 옮긴 조사 구문 (K6). 사람이 작성한 기술 글에도 흔해서 밀도로 본다(S2)
  { id: 'C', tag: '직역투 문형 · K6', sev: 'S2', re: /[을를] 통해|에 의해|에 대한 것|할 필요가 있|에 대(?:해서|해|하여)는|(?:으로|로)부터/g, fix: '조사로 푼다: ~에는 · ~에서 · ~에게서 · ~해야 한다' },
  // 일본어 번역 투 `~에 있어서`(국립국어원 2014). `폴더에 있어서`처럼 위치를 뜻하는 말 뒤는 `있다`의 원래 뜻이라 뺀다.
  // 코드 스팬 뒤(`C`에 있어서)도 대개 파일·값의 위치라 뺀다. 코드 스팬은 가린 글에서 공백이다
  { id: 'C', tag: '직역투 문형 · K6', sev: 'S2', re: /에 있어(?:서)?(?=[ ,])/g, when: (m, t) => !IN_PLACE.test(t.slice(Math.max(0, m.index - 20), m.index).split(/\s+/).pop()), fix: '~에서 · ~은 · ~할 때' },
  // 물건이 움직이거나 놓이는 것처럼 작성한 동사 (K2). 일상어와 겹치는 동사는 밀도로 본다(S2).
  // 활용형은 해라체·합쇼체의 현재(-ㄴ다·-ㅂ니다)와 과거(-았다·-았습니다·-았고)를 함께 넣는다. 판단 글은 합쇼체가 많다
  { id: 'C', tag: '직역 동사 · K2', re: /(?<!일)자리(?!표시자|수)/g, fix: '가리키는 것을 작성한다: 줄 · 파일 · 심볼 · 곳' },
  // `받는 사람`은 수신자를 뜻하는 굳은 말이고, `영향받다`·`지적받다`는 한국어에 원래 있는 말이라 뺀다.
  // 목적어가 코드 스팬이면(`500`을 받은 메시지) 응답·값을 실제로 받는 말이라 뺀다. 코드 스팬은 가린 글에서 공백 세 칸 이상이다(잡다의 catch 판별과 같다)
  { id: 'C', tag: '직역 동사 · K2', sev: 'S2', re: /(?<!영향|영향을 |주고|돌려|넘겨|전달|이어|물려|지적| {3}[을를] )받(?!는 사람)(?:는다|습니다|고 |는 |은 |아 |아서 |았다|았습니다|았고 |았던 )/g, fix: '붙는다 · 차지한다 · 생긴다 · 읽는다' },
  { id: 'C', tag: '직역 동사 · K2', sev: 'S2', re: /남(?:는다|습니다|고 |는 |긴다|깁니다|겼다|겼습니다|긴 |겨 |기고 |아 있|았다|았습니다|았고 |았던 )/g, fix: '하나뿐이다 · 보인다 · 그대로 둔다 · 기록한다' },
  { id: 'C', tag: '개수 문장 · K8', re: /(?:은|는|이|가) (?:둘|셋|넷|다섯|여섯|일곱|여덟)(?:이다|뿐이다|이고)/g, fix: '개수 문장을 지우고 목록만 작성한다' },
  { id: 'C', tag: '직역 동사 · K2', sev: 'S2', re: /맡(?:는다|습니다|고 |는 |은 |긴다|깁니다|겼다|겼습니다|긴 |기고 |아 |았다|았습니다|았고 )/g, fix: '정한다 · 무엇이 어디에 나오는지 작성한다' },
  { id: 'C', tag: '직역 동사 · K2', sev: 'S2', re: /(?:으로|로|에) (?:간다|갑니다|갔다|갔습니다|가고 |온다|옵니다|왔다|왔습니다|오고 )|떨어진다|떨어집니다|떨어졌다|떨어졌습니다|떨어지고|떨어지는|떨어질/g, fix: '분류한다 · 전송된다 · 사라진다 · 저장된다' },
  { id: 'C', tag: '직역 동사 · K2', sev: 'S2', re: /(?:[이가에] |안 )(?:든다|듭니다|든 |드는 |들고 )/g, fix: '달린 · 속한 · 있는 · 저장된다' },
  { id: 'C', tag: '직역 동사 · K2', sev: 'S2', re: / (?:댄다|댑니다|대고|대는|댔다|댔습니다|댈)(?=[\s.,)|])/g, fix: '기록한다 · 보여 준다' },
  // 시간·시일이 걸린다, 마음에 걸린다, 부하가 걸린다는 한국어에 원래 있는 말이라 뺀다.
  // `겁니다`는 `할 겁니다`(것입니다의 준말)와 겉모양이 같아 넣지 않는다
  { id: 'C', tag: '직역 동사 · K2', sev: 'S2', re: / (?:건다|걸었다|걸었습니다|걸린다|걸립니다|걸린|걸리는|걸리고|걸리면|걸리지|걸릴|걸려|걸고|걸어|걸렸다|걸렸습니다)(?=[\s.,)|])/g, not: /(?:시간|시일|기간|며칠|오래|초|분|마음에|부하가)[이가에]? ?걸/, fix: '적용된다 · 일치한다 · 통과하지 못한다' },
  { id: 'C', tag: '직역 동사 · K2', re: /닿(?:는다|습니다|는 |은 |아 |았다|았습니다|을 |지 )|이긴다|이깁니다|이겼다|이겼습니다|이기고 |이기는 |쥔다|쥡니다|쥐었다|쥐었습니다|쥐고 |쥔 |쥐는 /g, fix: '호출을 따라가면 이른다 · 따른다 · 저장한다' },
  { id: 'C', tag: '직역 동사 · K2', re: /(?<![가-힣])박(?:는다|습니다|아 |았다|았습니다|고 |는 |은 |힌 |혀 |아둔|아 둔|아두)/g, fix: '넣는다 · 고정한다 · 기록한다' },

  // ── D. 모호한 동사 ───────────────────────────────────────────
  { id: 'D', tag: '모호한 동사 · STE 3.7', re: /처리(?:한다|합니다|하는)|수행(?:한다|합니다|하는)|진행(?:된다|됩니다)|이루어(?:진다|집니다)|관리(?:한다|합니다)|담당(?:한다|합니다)/g, fix: '무슨 일이 일어나는지 작성한다. 함수 이름과 반환값을 확인한다' },
  // `반영한다`도 무엇이 어디에 들어가는지 밝히지 않는 말이다. 사람이 작성한 기술 글에도 흔해서 밀도로 본다(S2)
  { id: 'D', tag: '모호한 동사 · STE 3.7', sev: 'S2', re: /반영(?:한다|합니다|하는|하면|하고|했다|했습니다|된다|됩니다|되는|되면)/g, fix: '무엇이 어디에 저장되거나 바뀌는지 작성한다' },
  // 뜻이 둘인 동사 — 쓰다는 모든 꼴, 두다는 유지 뜻(그대로 둔다·~해 둔다)을 뺀 나머지, 잡다는 catch 뜻(예외를 잡는다)을 뺀 나머지
  { id: 'D', tag: '뜻이 둘인 동사 · STE 1.3', re: sseuRe(), fix: '사용한다(사용 뜻) · 작성한다·기록한다(작성 뜻). 적는다 대신 기록한다' },
  // 적다(기록 뜻)는 구어체라 사용하지 않는다. `적은 비용`·`적게`·`적어도`(양이 적다)와 겹치지 않는 꼴만 본다:
  // 목적어·처소 뒤의 활용형, 형용사에는 없는 `적는다`·`적는`, 보조 용언 `적어 두다·놓다`, 피동 `적히다`
  { id: 'D', tag: '뜻이 둘인 동사 · STE 1.3', re: /(?:[을를] (?:[가-힣]+ )?|에 |에다 )적(?:는다|습니다|었다|었습니다|어(?!도)|고 |으면|으며|는 |기 )|(?<![가-힣])적는(?:다|\s)|(?<![가-힣])적어 ?(?:둔|두|뒀|둬|놓|놨)|(?<![가-힣])적(?:힌|혀|히는|힌다|혔)/g, fix: '기록한다 · 작성한다. 적다는 구어체라 사용하지 않는다' },
  { id: 'D', tag: '뜻이 둘인 동사 · STE 1.3', re: duRe(), fix: '추가한다 · 설정한다. 유지 뜻(그대로 둔다·~해 둔다)은 그대로 둔다' },
  { id: 'D', tag: '뜻이 둘인 동사 · STE 1.3', re: jabRe(), fix: '정한다 · 설정한다. catch 뜻(예외를 잡는다)은 그대로 둔다' },

  // ── E. 문장 규칙 — ASD-STE100을 한국어로 옮긴 것 ──
  // 이·히·리·기 피동에 `-어지다`를 겹친 꼴. `그려지다`·`옮겨지다`처럼 피동이 한 번인 말은 넣지 않는다
  // `~게 되다`를 겹친 서술어. `보여 줄 수 있게 됩니다` → `보여 줍니다`(rules.md 3.4), `지원하게 된다` → `지원한다`(국립국어원 2011).
  // 상태가 바뀐 것이 요점인 문장도 많아서 밀도로 본다(S2). `이렇게 된다`는 부사 뒤의 본동사라 빼고,
  // `~할 수 있게 되었다`는 새로 가능해진 일을 알리는 문장이라 뺀다. 표본 판정은 research.md 9절
  { id: 'E', tag: '보조 용언 겹침 · STE 3.4', sev: 'S2', re: /(?<=[가-힣])(?<![이그저]렇|어떻)게 (?:된다|됩니다|되었다|되었습니다|됐다|됐습니다)(?=[\s.,)|]|$)/g, not: /수 있게 (?:되었|됐)/, fix:'본동사로 작성한다: 지원하게 된다 → 지원한다. 상태가 바뀐 것이 요점이면 그대로 둔다' },
  { id: 'E', tag: '이중 피동 · STE 3.4', re:/(?:되어|보여|쓰여|잊혀|불려|읽혀|나뉘어|놓여|닫혀|열려|짜여|믿겨|담겨|쌓여|팔려|막혀)(?:진다|집니다|지는|진 |지고|지지|질 |졌다|졌습니다|져)/g, fix: '된다. 행위자를 알면 그것을 주어로 작성한다' },
  { id: 'E', tag: '명사 덩어리 · STE 2.1', re: /[가-힣]+의 (?:(?![가-힣]*(?:가|이|은|는|을|를|에|로|와|과|도|고|며|면|서|다|요|만|마다|까지|부터) )[가-힣]+ )?[가-힣]+의 [가-힣]+/g, not: /(?<![가-힣])(?:회|주|정|동|합|논|강|편|임|모|문|협|결|창|열|예)의 /, fix: '\'의\'를 잇지 않는다. 동사나 다른 조사로 푼다' },
  // 제목·표 머리·목록 항목을 해라체 의문형으로 맺은 것 — `### 무엇을 보나`, `| 왜 ~인가 |`, `- ~하는가` (STE 9.4).
  // 독자가 묻는 해요체 질문(`~나요?`)은 후보로 뽑지 않는다
  { id: 'E', tag: '표 머리 · STE 9.4', re: /<th\b[^>]*>([^<]*?)<\/th\s*>/gi, when: (m) => predicateHead(m[1]), fix: HEAD_FIX },
  { id: 'E', tag: '의문형 제목·라벨 · STE 9.4', re: /^#{1,6} [^\n]*?(?:(?<=[가-힣])하나|[보쓰재]나|지키나|받나|되나|(?<=[가-힣])(?:인가|는가|은가|한가))\??[ \t]*$|<(h[1-6]|th)\b[^>]*>[^<]*?(?:(?<=[가-힣])하나|[보쓰재]나|지키나|받나|되나|(?<=[가-힣])(?:인가|는가|은가|한가))\??<\/\1>|(?:(?<=[가-힣])하나|[보쓰재]나|지키나|받나|되나|(?<=[가-힣])(?:인가|는가|은가|한가))\??(?=[ \t]*\|)|^[ \t]*(?:[-*+]|\d+[.)])[ \t]+[^\n]*?(?:(?<=[가-힣])하나|[보쓰재]나|지키나|받나|되나|(?<=[가-힣])(?:인가|는가|은가|한가))\??[ \t]*$|(?<=[가-힣])(?:는가|인가|은가)\??[ \t]*$/gm, not: /하나하나/, fix: '명사구로 바꾼다: 측정하는 것 · 쓰임새 · ~한 이유 · 근거. 목록 항목의 물음은 ~는지' },
  // 개수만 말하는 문장 — "~은 넷이다", "규칙은 하나다", "고르기 둘이다" (K8)
  { id: 'E', tag: '개수 문장 · K8', re: / (?:하나|둘|셋|넷|다섯|여섯|일곱|여덟)(?:이다|다|뿐이다|이고|입니다|예요|이에요)(?=[\s.,)|*]|$)/g, fix: '개수 문장을 지우고 목록만 작성한다' },

  // ── F. 높임 등급 (K9) ── 문장마다 가리는 검사라 아래 levelCandidates()에 있다

  // ── G. 구어 형태 (K10) ── 글말 본문에 들어온, 말할 때만 사용하는 형태
  // `이건·그게·이걸`은 겉모양으로 분명하다. Kiwi는 문장 첫머리의 `이건`을 `이/NP+이/VCP+건/EC`로 읽기도 해서 정규식으로 찾는다
  { id: 'G', tag: '구어 형태 · K10', re: /(?<![가-힣])(?:이|그|저)(?:건|게|걸|거(?:는|를|랑|도|만|야|예요|에요|죠)?)(?![가-힣])/g, fix: '축약하지 않는다: 이것은 · 그것이 · 이 값은처럼 가리키는 대상을 밝힌다' },
  { id: 'G', tag: '구어 형태 · K10', re: /(?<![가-힣])(?:뭔가?|뭘|근데|그니까|그러니까요|있잖아요?)(?![가-힣])/g, fix: '무엇 · 무엇을 · 그런데 · 그래서처럼 글말로 바꾼다' },
  { id: 'G', tag: '구어 형태 · K10', sev: 'S2', re: /(?<![가-힣])(?:얘기|아무튼|어쨌든|어쨌거나|솔직히)(?![가-힣])/g, fix: '이야기 · 지운다' },
  // 형태소 분석기가 없을 때만 사용하는 근사. Kiwi가 있으면 것/NNB의 겉모양과 부사 품사로 찾는다.
  // `을`은 목적격 조사와 겹쳐서 관형형 목록에서 뺀다(`조건을 걸 수`)
  { id: 'G', tag: '구어 형태 · K10', mode: 'regex', re: /(?:[는은던할한된될본쓴낸] )(?:거|게|걸|건)(?=[\s.,!?)]|$)(?! 수(?![가-힣]))/g, fix: '것으로 바꾼다: ~는 것이 · ~는 것은 · ~한 내용은' },
  { id: 'G', tag: '구어 형태 · K10', mode: 'regex', re: /(?<![가-힣])(?:되게|엄청)(?![가-힣])/g, fix: '지우거나 수치로 바꾼다' },
  { id: 'G', tag: '구어 형태 · K10', mode: 'regex', sev: 'S2', re: /(?<![가-힣])(?:좀|딱|그냥|막|살짝|슬쩍|싹|쭉)(?![가-힣])/g, fix: '지우거나 정확한 말로 바꾼다: 조금 · 정확히' },
  { id: 'G', tag: '구어 형태 · K10', mode: 'regex', sev: 'S2', re: /(?:^|[.!?][ \t]+)(?:사실|사실은)(?=[, \t])/gm, fix: '지운다' },

  // ── H. 담화 틀 (K11) ── 내용 없이 흐름을 끊는 영어식 틀과 채팅 말투
  { id: 'H', tag: '담화 틀 · K11', re: /(?:단순히|단순한)[^.!?\n]{0,40}(?:아니라|아닌|넘어)|처럼 (?:보이|들리)지만/g, fix: '대비를 빼고 말하려는 내용만 작성한다' },
  { id: 'H', tag: '담화 틀 · K11', sev: 'S2', re: /(?<=[가-힣])(?:[이가]|은|는) 아니라(?![가-힣])/g, fix: '앞의 X를 아무도 주장하지 않았으면 Y만 작성한다. 독자의 오해를 바로잡는 대비면 그대로 둔다' },
  { id: 'H', tag: '담화 틀 · K11', re: /결론적으로|요약하자면|정리하자면|결론부터 (?:말하면|말씀드리면)|한 줄로 (?:말하면|요약하면)|한마디로|살펴보겠습니다|알아보겠습니다|살펴봅시다|알아봅시다|짚고 넘어가|앞서 (?:설명|말)(?:했듯이|한 (?:것처럼|대로))/g, fix: '지운다. 요점은 문단 첫 문장에 작성한다 (K4)' },
  { id: 'H', tag: '담화 틀 · K11', sev: 'S2', re: /정리하면|요약하면|다시 말해|다시 말하면|(?<![가-힣])즉,/g, fix: '앞 문장을 고쳐 한 번에 말한다' },
  // 콜론으로 예고하는 머리말. `핵심은 이겁니다:`처럼 문장으로 예고하면 채팅 말투라 S1이다.
  // `핵심:`·`요약:` 같은 이름표는 사람의 메모에도 흔해서 S2다
  { id: 'H', tag: '담화 틀 · K11', re: /(?:^|[.!?][ \t]+|^[ \t]*(?:[-*+]|\d+[.)])[ \t]+)(?:\*\*)?(?:핵심|요점|포인트|결론|한 줄 요약|한마디로)(?:은|는|만|부터)[^:\n]{0,15}(?:\*\*)?:(?=\s|$)/gm, fix: '예고하지 않고 내용을 바로 작성한다' },
  { id: 'H', tag: '담화 틀 · K11', sev: 'S2', re: /(?:^|[.!?][ \t]+|^[ \t]*(?:[-*+]|\d+[.)])[ \t]+)(?:\*\*)?(?:핵심|요점|포인트|결론|요약|정리|한 줄 요약|한마디로)(?:\*\*)?:(?=\s|$)/gm, fix: '이름표 없이 내용을 바로 작성한다. 문서 구조가 필요하면 제목을 사용한다' },
  { id: 'H', tag: '담화 틀 · K11', re: /좋은 질문|물론입니다|물론이죠|도움이 되(?:었|셨)(?:으면|기를|길)|궁금한 (?:점|것)이 있으(?:면|시면)|언제든(?:지)? (?:물어|말씀)/g, fix: '지운다. 문서에는 대화 인사를 넣지 않는다' },

  // ── I. 형식 (K12) ──
  { id: 'I', tag: '형식 · K12', re: /\*\*([^*\n]+)\*\*/g, when: (m) => boldSentence(m[1]), fix: '문장 전체를 굵게 하지 않는다. 짧은 낱말만 굵게 한다' },
  { id: 'I', tag: '형식 · K12', re: /<(strong|b)\b[^>]*>([^<]+)<\/\1\s*>/gi, when: (m) => boldSentence(m[2]), fix: '문장 전체를 굵게 하지 않는다. 짧은 낱말만 굵게 한다' },
  { id: 'I', tag: '형식 · K12', sev: 'S2', re: /—|&mdash;|&#8212;|&#x2014;/gi, when: proseDash, fix: '괄호를 사용하거나 문장을 나눈다' },
];

/**
 * 한 글 안에서 같은 일을 두 낱말로 부르는 짝 (STE 1.11). 두 쪽이 다 나오면 후보다.
 * 이 짝도 지난 실수의 예일 뿐이다. 판정은 SKILL.md Step 2의 핵심 동사 목록이 한다.
 */
const SAME_ACT = [
  { label: '재다 · 측정하다', a: /(?<![가-힣])(?:잽니다|잰다|쟀|잰|재(?:나|는|려는|려고|려면|도록|서|며|면|어))(?![가-힣])/g, b: /측정/g, fix: '한 동사로 맞춘다. 대개 측정한다' },
  { label: '견주다 · 비교하다', a: /견주|견줘|견준/g, b: /비교/g, fix: '한 동사로 맞춘다' },
  { label: '가다 · 보내다(전송 뜻)', a: /에게(?:만|는)? (?:갑니다|간다|가고|가지 않|가는)/g, b: /보냅니다|보내고|보내지|전달/g, fix: '전송은 한 동사로 맞춘다: 보낸다 · 전달한다' },
  { label: '남다 · 저장하다(저장 뜻)', a: /(?:으로|로|에) 남(?:고|는다|습니다|는|아)/g, b: /저장|기록/g, fix: '저장은 한 동사로 맞춘다: 저장한다 · 기록한다' },
];

/**
 * 한 낱말이 여러 뜻으로 나오는지 (STE 1.3). 가벼운 동사는 문형마다 뜻이 갈린다.
 * 두 문형 이상이 한 글에 나오면 후보다. 문형만 보므로 뜻은 읽는 쪽이 판정한다.
 */
const SENSES = [
  {
    label: '보다',
    fix: '뜻마다 구체 동사로 바꾼다: 측정한다 · 점수를 준다 · ~라고 정한다 · 볼 수 있다(열람). `~해 보다`는 그대로 둔다',
    forms: [
      { sense: '측정·평가', re: /[을를] (?:봅니다|본다|보나|보는 |보므로|봐서)|무엇을 보나/g },
      { sense: '간주', re: /(?:으로|로) (?:봅니다|본다|보고 |보는 |보므로)/g },
      { sense: '의견', re: /다고 (?:봅니다|본다|보고 )/g },
      { sense: '열람', re: /화면(?:에서|으로)(?:만|도)? (?:봅니다|본다|보고 |볼 )/g },
    ],
  },
  {
    label: '쓰다',
    fix: '사용 뜻은 사용한다, 작성 뜻은 작성한다·기록한다. 글에서 `쓰다`를 없앤다',
    forms: [
      { sense: '사용', re: new RegExp(`(?<!${WRITE_OBJ})[을를] ${SSEU}|(?<!${WRITE_FORM})(?:으로|로) ${SSEU}|(?<!${WRITE_MEDIUM})에 ${SSEU}|(?:만|도|처럼|까지|대신) ${SSEU}`, 'g') },
      { sense: '작성', re: new RegExp(`${WRITE_OBJ}[을를]? ?${SSEU}|${WRITE_FORM}(?:으로|로) ${SSEU}|${WRITE_MEDIUM}에(?:다가?)? ?${SSEU}|[다라]고 ${SSEU}`, 'g') },
    ],
  },
  {
    label: '두다',
    fix: '추가·설정 뜻은 추가한다·설정한다. 유지 뜻(그대로 둔다)은 그대로 둔다',
    forms: [
      { sense: '추가·설정', re: duRe() },
      { sense: '유지', re: new RegExp(`${DU_KEEP}${DU}`, 'g') },
    ],
  },
  {
    label: '잡다',
    fix: '설정 뜻은 정한다·설정한다. catch 뜻(예외를 잡는다)은 그대로 둔다',
    forms: [
      { sense: '설정', re: jabRe() },
      { sense: 'catch', re: new RegExp(`${JAB_CATCH}${JAB}`, 'g') },
    ],
  },
];

const args = process.argv.slice(2);
if (args.includes('--skip-setup')) {
  console.log(`형태소 분석기를 설치하지 않기로 기록했다: ${skipSetup()}. 앞으로 정규식만 사용한다. 설치하려면 --setup을 돌린다.`);
  process.exit(0);
}
if (args.includes('--setup')) {
  try {
    process.exit(setup() ? 0 : 1);
  } catch (e) {
    console.error(`설치 실패: ${e.message}`);
    process.exit(2);
  }
}
const PROCEDURE = args.includes('--procedure');
const NO_MORPH = args.includes('--no-morph');
const SHOW_ALL = args.includes('--all');
const JSON_OUT = args.includes('--json');
const TSV_OUT = args.find((a) => a.startsWith('--tsv='))?.slice('--tsv='.length);
/** S2 규칙이 한 파일에서 이만큼 나와야 하나씩 보인다 */
const S2_MIN = 3;
// --json은 사람용 출력을 끈다. 결과는 마지막에 한 번에 출력한다
const log = JSON_OUT ? () => {} : console.log;
/** 한국어 어절 기준. STE 설명 25단어·절차 20단어를 옮긴 값이다 (references/calibration.md) */
const SENTENCE_WORDS = PROCEDURE ? 12 : 15;
/** 영어 단어 기준. STE 6.3(설명)·5.1(절차) 그대로다 */
const ENGLISH_WORDS = PROCEDURE ? 20 : 25;

/** 끝에 오면 동사 구실을 하는 명사 — 이름 `가입 안내 메일 발송`에서 `발송`은 세지 않는다 (STE 2.1) */
const ACTION_NOUNS = new Set('조회 저장 발송 추가 삭제 수정 확인 생성 변경 처리 호출 검사 계산 표시 회수 발급 지급 집계 판정 반환 등록 갱신 전송 읽기 쓰기 검증 정리 비교'.split(' '));
/** 이 말로 끝나는 어절은 조사·어미가 붙은 것으로 본다 — 명사 사슬을 끊는다 */
const NOT_BARE = /(?:은|는|이|가|을|를|에|의|로|와|과|도|만|에서|부터|까지|처럼|보다|마다|하고|이고|이며|이나|며|면|고|다|요|게|히|던|된|될|할|하는|적인|으로|라|니|죠|까|거나|있어|없어|해|돼|봐|쳐|져|워)$/;

/** 글이 아닌 영역. 낱말 검사와 문장 검사 모두 뺀다. 코드 스팬은 한 줄 안에서만 짝을 맞춘다 — 홀로 남은 백틱이 긴 글을 숨기지 않게 */
/**
 * 펜스 코드 블록 (CommonMark). 줄 머리에서 들여쓰기 3칸 이하, 백틱 또는 물결표 3개 이상으로 연다.
 * 닫는 펜스는 같은 글자이고 길이가 여는 펜스 이상이며 뒤에는 공백만 온다. 안 닫히면 문서 끝까지다.
 * \1은 여는 펜스 전체, \2는 펜스 글자다. 정보 문자열에는 백틱 펜스일 때만 백틱이 못 온다
 */
const FENCE = /^ {0,3}(([`~])\2{2,})(?:(?<=`)[^`\n]*|(?<=~)[^\n]*)\n[\s\S]*?(?:\n {0,3}\1\2*[ \t]*\r?(?=\n|$)|$(?![\s\S]))/gm;
const SCRIPT_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const PRE = /<pre\b[^>]*>[\s\S]*?<\/pre\s*>/gi;
const CODE_EL = /<code\b[^>]*>([\s\S]*?)<\/code\s*>/gi;
const CODE_SPAN = /`[^`\n]*`/g;
/** 블록 요소의 여닫는 태그. 문장 경계다. 줄바꿈 없는 HTML에서 이웃 요소의 글이 한 문장으로 붙지 않게 한다 */
const BLOCK_TAG = /<\/?(?:p|div|section|article|aside|nav|header|footer|main|h[1-6]|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|td|th|caption|br|hr|details|summary|blockquote|figure|figcaption|form|fieldset|legend|label|button|option|title|text|address|body|head|html)\b[^>]*>/gi;
const ANY_TAG = /<[^>]+>/g;
const CODE_FILE = /\.(?:[cm]?[jt]sx?)$/i;
/** 문장 경계 표시. 줄바꿈을 더하면 줄 번호가 밀리므로 다른 글자를 사용한다 */
const BOUNDARY = '\u0001';

/** 글자는 공백으로 바꾸고 줄바꿈은 그대로 둔다 — 글자 위치와 줄 번호가 변하지 않는다 */
const blank = (m) => m.replace(/[^\n]/g, ' ');
/** 글자를 지우고 줄바꿈만 그대로 둔다 */
const newlinesOf = (m) => m.replace(/[^\n]+/g, '');

/** 낱말 검사용 글. 글이 아닌 영역을 같은 길이의 공백으로 바꾼다. 코드 파일은 그대로다 */
function maskedOf(file, text) {
  if (CODE_FILE.test(file)) return text;
  return [FENCE, SCRIPT_STYLE, HTML_COMMENT, PRE, CODE_EL, CODE_SPAN].reduce((t, re) => t.replace(re, blank), text);
}

/**
 * 사람이 읽는 글만 꺼낸다. JSON(서사 초안)은 문자열 값, 코드 파일은 주석, 나머지는 글이 아닌 영역과 태그를 뺀 본문이다.
 * 코드 파일의 주석은 이어진 줄을 한 문단으로 붙인다 — 줄마다 끊으면 여러 줄 문장을 못 센다.
 * <code>는 백틱 코드 스팬으로 바꾼다. 어절 세기·명사 사슬·세미콜론 검사가 코드 스팬을 한 어절로 다룬다.
 * 돌려주는 것은 줄 단위 조각 { s, line }이다. 표 칸과 블록 요소는 따로 조각이 된다.
 * 줄바꿈 수를 지키며 바꾸므로 조각의 줄 번호를 안다. JSON과 코드 파일은 모른다(line = null).
 */
function proseOf(file, text) {
  let body = text;
  let tracked = true;
  if (file.endsWith('.json')) {
    try {
      const strings = [];
      (function walk(v) {
        if (typeof v === 'string') strings.push(v);
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
      })(JSON.parse(text));
      body = strings.join('\n');
      tracked = false;
    } catch { /* JSON이 아니면 원문 그대로 */ }
  } else if (CODE_FILE.test(file)) {
    const paras = [];
    let cur = [];
    for (const line of text.split('\n')) {
      const m = /^\s*(?:\/\/+|\/\*+|\*(?!\/))\s?(.*?)\s*(?:\*\/)?$/.exec(line);
      if (m && !/^\s*\*\/\s*$/.test(line)) cur.push(m[1]);
      else if (cur.length) { paras.push(cur.join(' ')); cur = []; }
    }
    if (cur.length) paras.push(cur.join(' '));
    body = paras.join('\n');
    tracked = false;
  }
  const cut = (m) => BOUNDARY + newlinesOf(m);
  body = body
    .replace(FENCE, cut)
    .replace(SCRIPT_STYLE, cut)
    .replace(HTML_COMMENT, cut)
    .replace(PRE, cut)
    .replace(CODE_EL, (m, inner) => {
      const span = inner.replace(/[`\n]+/g, ' ').trim();
      return (span ? `\`${span}\`` : ' ') + newlinesOf(inner);
    })
    // 코드 스팬 안의 꺾쇠(`a < b`)는 태그가 아니다. 그대로 두면 다음 `>`까지 글이 태그로 지워진다
    .replace(CODE_SPAN, (m) => m.replace(/</g, '‹').replace(/>/g, '›'))
    .replace(BLOCK_TAG, cut)
    .replace(ANY_TAG, (m) => ' ' + newlinesOf(m));
  const out = [];
  body.split('\n').forEach((line, i) => {
    for (const part of line.split(BOUNDARY))
      for (const cell of part.split(/\s\|\s|^\s*\||\|\s*$/)) if (cell.trim()) out.push({ s: cell, line: tracked ? i + 1 : null });
  });
  return out;
}

/** 어절 수. 코드 스팬은 한 어절로 세고, 문장 안의 인용 괄호(ADR·조항·날짜)는 세지 않는다 */
function wordCount(s) {
  return s
    .replace(/`[^`]*`/g, 'C')
    .replace(/\((?:[^()]*?(?:ADR-|#\d|\d{4}-\d{2}-\d{2}|[0-9a-f]{7}\b)[^()]*)\)/g, '')
    .split(/\s+/)
    .filter((w) => /[0-9A-Za-z가-힣]/.test(w)).length;
}

/** 종결어미로 끝나는 조각만 문장으로 본다 — 라벨·이름·표 머리는 명사구라 빠진다 */
function sentencesOf(file, text) {
  const out = [];
  for (const { s: cell, line } of proseOf(file, text))
    for (const piece of cell.split(/(?<=[.?!][*`"'”’)\]]*)\s+/)) {
      const s = piece.replace(/^\s*(?:[-*>]|\d+\.)\s+/, '').trim();
      const tail = s
        .replace(/\s*\([^()]*\)\s*([.?!]?)$/, '$1')
        .replace(/[*`"'”’]+([.?!]?)$/, '$1');
      if (!/[가-힣C`)](?:다|요|죠|까)[.?!]?$/.test(tail) && !/(?:다|요|죠|까)[.?!]?$/.test(tail)) continue;
      const words = wordCount(s);
      // 줄표 앞이 완결 절이면 두 문장을 이은 것이다. 맨 앞 굵은 제목 뒤의 줄표(기각한 대안 형식)는 뺀다
      const dash = /(?:다|요)[.)*]*\s+—\s/.test(s.replace(/^\*\*[^*]+\*\*(?:\([^)]*\))?\s+—/, ''));
      if (words > SENTENCE_WORDS) out.push({ s, words, dash, line });
    }
  return out;
}

/** 영어 단어 수. STE 8.5(괄호 안 글 = 한 단어)·8.7(하이픈 낱말 = 한 단어). 코드 스팬은 한 단어다 */
function englishCount(s) {
  return s.replace(/`[^`]*`/g, ' C ').replace(/\([^()]*\)/g, ' X ')
    .split(/\s+/).filter((w) => /[0-9A-Za-z]/.test(w)).length;
}

/** 한글이 없는 영어 문장 가운데 기준을 넘는 것 (STE 5.1·6.3) */
function englishSentencesOf(file, text) {
  const out = [];
  for (const { s: cell, line } of proseOf(file, text))
    for (const piece of cell.split(/(?<=[.?!][*`"'”’)\]]*)\s+(?=[*A-Z`"'(])/)) {
      const s = piece.replace(/^\s*(?:[-*>]|\d+\.)\s+/, '').trim();
      if (/[가-힣]/.test(s) || !/[A-Za-z]{2,}.*[.?!][*`"')\]]*$/.test(s)) continue;
      const words = englishCount(s);
      if (words > ENGLISH_WORDS) out.push({ s, words, line });
    }
  return out;
}

/** 세미콜론이 있는 문장 (STE 8.1). 코드 블록·코드 스팬·HTML 개체는 뺀다 */
function semicolonsOf(file, text) {
  const out = [];
  for (const { s: cell, line } of proseOf(file, text)) {
    const plain = cell.replace(/`[^`]*`/g, '').replace(/&[a-z]+;|&#\d+;/g, '');
    if (plain.includes(';')) out.push({ c: cell.trim(), line });
  }
  return out;
}

/** 사슬을 끊는 말 — 수·관형사·부사·위치 명사. 이 말은 명사 덩어리를 만들지 않는다 */
const NOT_NOUN = new Set('한 두 세 네 다섯 여섯 둘 셋 넷 몇 첫 맨 각 이 그 저 이런 그런 더 덜 또 늘 다시 이미 아무 가장 모두 전부 내내 자주 계속 아직 거의 바로 곧 항상 매우 너무 아주 잘 중 뒤 앞 안 밖 위 아래 옆 쪽 대신 동안 후 전 때 시 번 개 곳 판 줄'.split(' '));

/**
 * 조사 없이 띄어 이은 명사 넷 이상. 끝이 동작 명사면 다섯 이상이다 .
 * 이름·라벨·표 칸·제목처럼 종결어미가 없는 짧은 조각(8어절 이하)만 본다 — 문장 안에서는 활용형을
 * 명사와 가리지 못해 후보가 쏟아진다. 문장 안의 덩어리는 글을 읽는 쪽이 찾는다.
 */
function nounChainsOf(file, text) {
  const out = [];
  for (const { s: cell, line } of proseOf(file, text))
    for (const piece of cell.split(/(?<=[.?!:;])\s+|\s+[—·→]\s+|[,()]/)) {
      // 코드 스팬은 지우지 않고 자리표시자 한 어절로 바꾼다. 한글이 아니므로 사슬을 끊는다 — `제한 시간 `50`초`는 사슬이 아니다
      const p = piece.replace(/^\s*(?:[-*>#]+|\d+\.)\s+/, '').replace(/`[^`]*`/g, 'C').replace(/\*/g, '').trim();
      const tokens = p.split(/\s+/).filter(Boolean);
      if (!tokens.length || tokens.length > 8 || /(?:다|요|죠|까)[.?!]?$/.test(p)) continue;
      let run = [];
      const flush = () => {
        const need = run.length && ACTION_NOUNS.has(run[run.length - 1]) ? 5 : 4;
        if (run.length >= need) out.push({ c: run.join(' '), line });
        run = [];
      };
      for (const t of tokens) {
        // `취소한`·`바뀐`처럼 세 글자 이상에 관형형 어미가 붙은 말도 끊는다 — 두 글자 `권한`·`제한`은 명사다
        const bare = /^[가-힣]+$/.test(t) && !NOT_BARE.test(t) && !NOT_NOUN.has(t) && !(t.length >= 3 && /[한된할될던]$/.test(t));
        if (bare) run.push(t);
        else flush();
      }
      flush();
    }
  return out;
}

const STAGED = args.includes('--staged');
const BASE = args.find((a) => a.startsWith('--base='))?.slice('--base='.length);
const DIFF_MODE = args.includes('--diff') || STAGED || BASE !== undefined;
const paths = args.filter((a) => !a.startsWith('--'));
if (BASE === '') {
  console.error('--base= 뒤에 기준 커밋이나 브랜치를 지정한다. 예: --base=main');
  process.exit(2);
}
if (!paths.length && !DIFF_MODE) {
  console.error('사용법: node check.mjs [--procedure] <파일...>');
  console.error('      node check.mjs --diff | --staged | --base=<ref> [--code] [--procedure] [경로...]');
  process.exit(2);
}

/** diff 모드에서 볼 파일. 사람이 읽는 글이 들어 있는 형식만 고른다. 코드 파일은 --code일 때만 본다 */
const TEXT_FILE = /\.(?:md|mdx|markdown|txt|rst|html?|svg|json)$/i;
const WITH_CODE = args.includes('--code');
// prose-check 자신의 회귀 시험 글은 일부러 규칙을 어긴 예문이라 diff 모드에서 뺀다
const SKIP_FILE = /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|composer\.lock)$|\.min\.js$|(?:^|\/)scripts\/prose-check\/fixtures\//;

function git(argv) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...argv], {
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * 바뀐 파일과 바뀐 줄을 모은다. 줄 번호는 새 판 기준이다. lines가 null이면 파일 전체가 새것이다.
 * 파일 목록은 --name-status -z로 받는다. diff 머리줄의 경로는 공백·따옴표가 있으면 모양이 바뀐다.
 * 줄 범위는 파일마다 저장소 최상위에서 git diff -U0로 받는다. 이름이 바뀐 파일은 옛 경로도 함께
 * 넘겨야 git이 이름 바뀜을 알아채고 바뀐 줄만 준다.
 */
function diffTargets() {
  let root;
  try {
    root = git(['rev-parse', '--show-toplevel']).trim();
  } catch {
    console.error('diff 모드는 git 저장소 안에서 실행한다');
    process.exit(2);
  }
  const range = STAGED ? ['--cached'] : BASE !== undefined ? [`${BASE}...HEAD`] : ['HEAD'];
  const list = (argv) => {
    try {
      return git(argv).split('\0').filter(Boolean);
    } catch (e) {
      console.error(`git 실패: ${String(e.stderr || e.message).trim()}`);
      process.exit(2);
    }
  };
  // 경로 인자는 지금 폴더 기준이고, 두 명령 모두 저장소 최상위 기준 경로를 준다
  const status = list(['diff', '--name-status', '-z', '-M', '--no-ext-diff', '--diff-filter=ACMR', ...range, '--', ...paths]);
  /** @type {{rel: string, old?: string}[]} */
  const changedFiles = [];
  for (let k = 0; k < status.length;) {
    const code = status[k++];
    if (/^[RC]/.test(code)) changedFiles.push({ old: status[k++], rel: status[k++] });
    else changedFiles.push({ rel: status[k++] });
  }
  // git ls-files는 지금 폴더 아래만 본다. 경로를 주지 않으면 git diff처럼 저장소 전체를 본다
  const newFiles = !STAGED && BASE === undefined
    ? list(paths.length
      ? ['ls-files', '--others', '--exclude-standard', '--full-name', '-z', '--', ...paths]
      : ['-C', root, 'ls-files', '--others', '--exclude-standard', '--full-name', '-z'])
    : [];

  const out = [];
  const add = (rel, lines) => {
    const abs = path.join(root, rel);
    out.push({ file: path.relative(process.cwd(), abs) || rel, abs, lines });
  };
  const prose = (rel) => (TEXT_FILE.test(rel) || (WITH_CODE && CODE_FILE.test(rel))) && !SKIP_FILE.test(rel);
  for (const { rel, old } of changedFiles.filter((f) => prose(f.rel))) {
    const spec = old ? [`:(literal)${old}`, `:(literal)${rel}`] : [`:(literal)${rel}`];
    const diff = git(['-C', root, 'diff', '--unified=0', '-M', '--no-color', '--no-ext-diff', ...range, '--', ...spec]);
    const lines = new Set();
    for (const h of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
      const start = Number(h[1]);
      const count = h[2] === undefined ? 1 : Number(h[2]);
      for (let n = start; n < start + count; n++) lines.add(n);
    }
    // 이름만 바뀐 파일처럼 더한 줄이 없으면 볼 것이 없다
    if (lines.size) add(rel, lines);
  }
  for (const rel of newFiles.filter(prose)) add(rel, null);
  return out;
}

const targets = DIFF_MODE ? diffTargets() : paths.map((f) => ({ file: f, abs: f, lines: null }));
const scopeLabel = STAGED ? '스테이징한 변경(git diff --cached)'
  : BASE !== undefined ? `${BASE}에서 갈라진 뒤의 변경(git diff ${BASE}...HEAD)`
  : '커밋하지 않은 변경(git diff HEAD)과 새 파일';
if (DIFF_MODE) {
  if (!targets.length) {
    if (JSON_OUT) console.log(JSON.stringify({ morph: null, morphMissing: false, setupSkipped: setupSkipped(), candidates: [], whole: [], sentences: [] }));
    else console.log(`검사할 변경 없음: ${scopeLabel}에 사람이 읽는 글 파일이 없다.`);
    process.exit(0);
  }
  log(`\x1b[2m변경된 줄만 검사한다: ${scopeLabel} · 파일 ${targets.length}개\x1b[0m`);
}

/** 바뀐 줄 범위 안인가. 파일을 지정한 모드와 새 파일은 모든 줄이 범위다 */
const inScope = (t, line) => t.lines === null || (typeof line === 'number' && t.lines.has(line));

let unreadable = 0;
const cache = new Map();
/** 파일 글을 한 번만 읽는다. 못 읽으면 null */
function textOf(t) {
  if (!cache.has(t.abs)) {
    try {
      cache.set(t.abs, fs.readFileSync(t.abs, 'utf8'));
    } catch {
      console.error(`못 읽음: ${t.file}`);
      unreadable++;
      cache.set(t.abs, null);
    }
  }
  return cache.get(t.abs);
}

const maskedCache = new Map();
/** 낱말 검사용 글. 글이 아닌 영역을 공백으로 바꾼 것이다. 글자 위치와 줄 번호는 원문과 같다 */
function maskedTextOf(t) {
  if (!maskedCache.has(t.abs)) maskedCache.set(t.abs, maskedOf(t.file, textOf(t)));
  return maskedCache.get(t.abs);
}

/**
 * 허용 목록. 프로젝트가 자기 분야의 사실 표현을 적어 둔 파일이다. 한 줄에 한 글귀, `#`부터 주석이다.
 * 글귀 안에 있는 낱말 후보는 보고하지 않는다. 글귀는 두 어절 이상이어야 한다 — 낱말 하나를 통째로 허용하지 못하게.
 * 파일이 있는 폴더에서 저장소 최상위(.git이 있는 폴더)까지 올라가며 처음 찾은 것을 사용한다.
 * 파일이 어느 저장소에도 없으면(임시 폴더에 뽑은 글 등) 현재 폴더의 저장소에서 찾는다.
 */
const ALLOW_FILE = '.prose-check-allow';
const allowCache = new Map();
function readAllow(file) {
  const phrases = [];
  fs.readFileSync(file, 'utf8').split('\n').forEach((raw, i) => {
    const phrase = raw.replace(/(?:^|\s)#.*$/, '').trim();
    if (!phrase) return;
    if (!/\s/.test(phrase)) {
      console.error(`허용 목록 무시: "${phrase}" — 글귀는 두 어절 이상이어야 한다 (${file}:${i + 1})`);
      return;
    }
    phrases.push(phrase);
  });
  const rel = path.relative(process.cwd(), file);
  return { file: rel && !rel.startsWith('..') ? rel : file, phrases };
}
/** 폴더에서 위로 찾는다. 저장소 최상위에서 멈춘다. 파일시스템 뿌리까지 저장소가 없으면 outside 다 */
function lookupAllow(start) {
  const dirs = [];
  let dir = start;
  let res = { found: null, outside: false };
  for (;;) {
    if (allowCache.has(dir)) { res = allowCache.get(dir); break; }
    dirs.push(dir);
    const file = path.join(dir, ALLOW_FILE);
    if (fs.existsSync(file)) { res = { found: readAllow(file), outside: false }; break; }
    if (fs.existsSync(path.join(dir, '.git'))) break;
    const parent = path.dirname(dir);
    if (parent === dir) { res = { found: null, outside: true }; break; }
    dir = parent;
  }
  for (const d of dirs) allowCache.set(d, res);
  return res;
}
function allowFor(abs) {
  const r = lookupAllow(path.dirname(path.resolve(abs)));
  return r.outside ? lookupAllow(process.cwd()).found : r.found;
}
/** 허용 글귀가 원문에서 차지하는 범위. 후보가 그 안에 다 들어가면 뺀다 */
function allowedRanges(text, allow) {
  const ranges = [];
  for (const phrase of allow?.phrases ?? [])
    for (let i = text.indexOf(phrase); i !== -1; i = text.indexOf(phrase, i + 1))
      ranges.push({ start: i, end: i + phrase.length, phrase });
  return ranges;
}

/** 이 위치가 SVG 안인가 / 속성값 안인가 — 본문만 고치고 놓치기 쉬운 곳을 표시한다 */
function whereIn(text, i) {
  const before = text.slice(0, i);
  const svgOpen = before.lastIndexOf('<svg');
  if (svgOpen !== -1 && before.lastIndexOf('</svg>') < svgOpen) return '도형';
  const tagOpen = before.lastIndexOf('<');
  if (tagOpen !== -1 && before.lastIndexOf('>') < tagOpen) return '속성';
  return '';
}

/** 글 위치를 줄 번호로 바꾸는 함수를 만든다 */
function lineFinder(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (i) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= i) lo = m; else hi = m - 1; }
    return lo + 1;
  };
}

/** HTML 인용 요소(<blockquote>·<q>)가 차지하는 범위. 안의 글자는 인용 줄처럼 후보로 삼지 않는다 */
const QUOTE_EL = /<(blockquote|q)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const quoteRanges = (text) => [...text.matchAll(QUOTE_EL)].map((m) => [m.index, m.index + m[0].length]);

/**
 * 이 위치가 인용 안인가. 인용 줄(`>`)과 따옴표 안의 글자는 남의 말이거나 표지를 언급한 것이라 후보로 삼지 않는다
 */
function quoted(text, i) {
  const start = text.lastIndexOf('\n', i - 1) + 1;
  const end = text.indexOf('\n', i);
  const line = text.slice(start, end === -1 ? undefined : end);
  if (/^\s*>/.test(line)) return true;
  const col = i - start;
  for (const m of line.matchAll(/"[^"\n]*"|“[^”\n]*”|'[^'\n]*'|‘[^’\n]*’|「[^」\n]*」/g))
    if (col > m.index && col < m.index + m[0].length) return true;
  return false;
}

/**
 * 마크다운 파일의 문장 목록. 줄 종류(para · list · quote)와 문단·목록 묶음 번호를 붙인다.
 * morphText는 형태소 분석에 보낼 글이다. 강조 기호를 뗀다
 */
function sentenceEntries(text) {
  const entries = [];
  let para = 0;
  let block = 0;
  let prev = 'blank';
  let prevContent = 'blank';
  for (const { line, kind, text: lineText } of linesOf(maskCode(text))) {
    if (kind === 'blank') { prev = kind; continue; }
    // 목록 묶음: 사이에 빈 줄만 있는 목록 줄은 같은 묶음이고, 다른 종류의 줄이 끼면 새 묶음이다
    if (kind === 'list' && prevContent !== 'list') block++;
    prevContent = kind;
    if (kind === 'heading' || kind === 'table') { prev = kind; continue; }
    if (kind !== 'para' || prev !== 'para') para++;
    prev = kind;
    // 통째로 굵게 한 문장은 목록 머리의 이름표 구실을 해서 등급을 세지 않는다 (label)
    for (const s of splitSentences(lineText)) entries.push({ line, kind, para, block, label: /^\*\*[^*]+\*\*[.?!]?$/.test(s), text: s, morphText: s.replace(/\*{1,3}|_{2}/g, '') });
  }
  return entries;
}

const docs = targets.map((t) => {
  const text = textOf(t);
  if (text === null) return null;
  const allow = allowFor(t.abs);
  return {
    t, text, masked: maskedTextOf(t), allow, allowed: allowedRanges(text, allow), skipped: new Map(), quotes: quoteRanges(maskedTextOf(t)),
    entries: MARKDOWN.test(t.file) ? sentenceEntries(text) : HTML.test(t.file) ? htmlEntries(text) : [], cands: [], morphed: false,
  };
}).filter(Boolean);

// 형태소 분석: 마크다운·HTML 파일의 문장을 한 번에 보낸다. 분석기가 없거나 실패하면 정규식만 사용한다
let morph = null;
let morphMissing = false;
if (!NO_MORPH) {
  const all = docs.flatMap((d) => d.entries);
  if (all.length) {
    if (!venvPython()) {
      morphMissing = true;
      const me = `node ${path.relative(process.cwd(), process.argv[1])}`;
      // 이 줄은 SKILL.md가 찾는 표시다. 처음이면 사용자에게 설치할지 묻는다
      if (setupSkipped()) log(`\x1b[2m형태소 분석기 없이 정규식만 사용한다(설치하지 않기로 했다). 설치하려면: ${me} --setup\x1b[0m`);
      else log(`\x1b[33m[형태소 분석기 없음]\x1b[0m 정규식만 사용한다. 설치(약 140MB, ${dataDir()}): ${me} --setup · 설치하지 않고 다시 묻지 않기: ${me} --skip-setup`);
    } else {
      try {
        const r = tokenize(all.map((e) => e.morphText));
        all.forEach((e, i) => { e.tokens = r.tokens[i]; });
        morph = { model: r.model, version: r.version };
        for (const d of docs) d.morphed = d.entries.length > 0;
      } catch (e) {
        log(`\x1b[33m형태소 분석 실패, 정규식만 사용한다:\x1b[0m ${e.message}`);
      }
    }
  }
}

const ctxAt = (text, i) => text.slice(Math.max(0, i - 40), i + 30).replace(/\s+/g, ' ').trim();

// ── 낱말·문형 규칙 (A~E, G~I) ──
// 글이 아닌 영역을 가린 글에서 찾는다. 글자 위치가 같으므로 줄 번호와 앞뒤 글은 원문에서 가져온다
for (const d of docs) {
  const lineOf = lineFinder(d.text);
  RULES.forEach((rule, ri) => {
    if (rule.mode === 'regex' && d.morphed) return;
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(d.masked)) !== null) {
      if (!m[0]) { rule.re.lastIndex++; continue; }
      if (rule.not && rule.not.test(d.masked.slice(Math.max(0, m.index - 4), m.index + m[0].length))) continue;
      if (rule.when && !rule.when(m, d.masked)) continue;
      // 문장 앞 구두점까지 찾는 규칙은 낱말이 시작하는 곳을 위치로 사용한다
      const at = m.index + Math.max(0, m[0].search(/[^\s.!?]/));
      if (quoted(d.masked, at) || d.quotes.some(([a, b]) => a <= at && at < b)) continue;
      const line = lineOf(at);
      if (!inScope(d.t, line)) continue;
      const inAllowed = d.allowed.find((r) => r.start <= m.index && m.index + m[0].length <= r.end);
      if (inAllowed) { d.skipped.set(inAllowed.phrase, (d.skipped.get(inAllowed.phrase) ?? 0) + 1); continue; }
      d.cands.push({ line, index: at, sev: rule.sev ?? 'S1', id: rule.id, tag: rule.tag, word: m[0].slice(at - m.index).trim(), ctx: ctxAt(d.text, at), fix: rule.fix, where: whereIn(d.text, at), key: `r${ri}` });
    }
  });
}

/**
 * 마크다운 표 줄의 칸과 각 칸이 줄에서 시작하는 위치. 맨 앞·맨 뒤의 `|`는 없어도 된다(GFM).
 * `|` 바로 앞에 `\`가 있으면 칸을 나누지 않는다. GitHub 렌더러는 역슬래시가 둘(`\\|`)이어도 나누지 않는다
 */
function rowCells(line) {
  const cells = [];
  let from = 0;
  for (let i = 0; i <= line.length; i++) {
    if (i < line.length && (line[i] !== '|' || line[i - 1] === '\\')) continue;
    cells.push({ text: line.slice(from, i), at: from });
    from = i + 1;
  }
  // 양 끝의 빈 칸은 맨 앞·맨 뒤 `|`가 만든 것이다
  if (cells.length > 1 && !cells[0].text.trim()) cells.shift();
  if (cells.length > 1 && !cells.at(-1).text.trim()) cells.pop();
  return cells;
}

// 마크다운 표의 머리 줄에서 동사 형태로 끝난 칸 (STE 9.4). 머리 줄은 바로 다음 줄이 구분선이고, 두 줄의 칸 수가 같다(GFM).
// 구분선 칸은 `-` 하나여도 된다(`:--`). `---`만 있는 줄은 제목 밑줄이나 가로줄이다. 코드 스팬은 가린 글에서 공백이라 빠진다
const TABLE_RULE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
const SETEXT_RULE = /^\s*-+\s*$/;
for (const d of docs) {
  const lines = d.masked.split('\n');
  let start = 0;
  for (let i = 0; i < lines.length; start += lines[i].length + 1, i++) {
    const rule = lines[i + 1];
    if (rule === undefined || !TABLE_RULE.test(rule) || SETEXT_RULE.test(rule) || !inScope(d.t, i + 1)) continue;
    const cells = rowCells(lines[i]);
    if (cells.length !== rowCells(rule).length) continue;
    for (const { text: cell, at: col } of cells) {
      if (!predicateHead(cell)) continue;
      const at = start + col + (cell.length - cell.trimStart().length);
      d.cands.push({ line: i + 1, index: at, sev: 'S1', id: 'E', tag: '표 머리 · STE 9.4', word: d.text.slice(at, at + cell.trim().length), ctx: ctxAt(d.text, at), fix: HEAD_FIX, where: '', key: 'head94' });
    }
  }
}

// ── 문장 규칙: 높임 등급(K9), 구어 종결어미·형태소로 찾는 구어 형태(K10), 자문자답(K11) ──
const COLLOQ_EF = /(?:거든요|잖아요|더라고요|던데요|네요|군요|[는은인한]데요|죠|지요)$/;
const MAG_S1 = new Set(['무지', '되게', '엄청']);
// `진짜`·`완전`은 Kiwi가 `진짜 STE`(진품) 같은 명사 용법도 부사로 읽어서 밀도로 본다
const MAG_S2 = new Set(['좀', '딱', '그냥', '막', '살짝', '슬쩍', '싹', '쭉', '확', '진짜', '완전']);
/** 감탄사로 볼 말. Kiwi가 문장 첫머리의 `그`를 감탄사로 읽기도 해서 목록으로 거른다 */
const INTERJECTION = /^(?:아|아하|자|음|와|오|어|흠|글쎄|글쎄요|뭐|에이|아이고|헐|네|예|아니요|아뇨)$/;
const MAIN_LEVELS = ['hapsyo', 'haeyo', 'haera'];
const BANMAL_SURFACE = /(?:어|아|여|해|야|지|네|게|걸|래|니|냐|까|거든|잖아|데|구나|군|돼|봐|줘)$/;
/** 자문자답으로 볼 물음. 의문사가 없는 물음(`진행할까요?`)은 독자에게 실제로 묻는 말이라 뺀다 */
const QUESTION_WORD = /(?<![가-힣])(?:왜|어떻게|무엇|뭐|뭘|무슨|어떤|어느|어디|언제|누가|누구|얼마나|몇)/;

/** 형태소 결과에서 구어 형태를 찾는다. 축약형은 Kiwi가 `것`으로 되돌린 형태와 원래 글자가 다를 때다 */
function morphColloquial(e) {
  const hits = [];
  e.tokens.forEach(([form, tag, start, len], i) => {
    if (quoted(e.morphText, start)) return;
    const word = e.morphText.slice(start, start + len);
    if (tag === 'NNB' && (form === '것' || form === '거') && !word.startsWith('것'))
      hits.push({ sev: 'S1', kind: 'contraction', word, fix: '것으로 바꾼다: ~는 것이 · ~는 것은 · ~한 내용은' });
    else if (tag === 'MAG' && MAG_S1.has(form)) hits.push({ sev: 'S1', kind: 'degree', word, fix: '지우거나 수치로 바꾼다' });
    else if (tag === 'MAG' && MAG_S2.has(form)) hits.push({ sev: 'S2', kind: 'adverb', word, fix: '지우거나 정확한 말로 바꾼다: 조금 · 정확히' });
    else if (tag === 'MAG' && form === '사실' && i === 0) hits.push({ sev: 'S2', kind: 'marker', word, fix: '지운다' });
    // 감탄사는 바로 뒤에 쉼표나 문장 부호가 올 때만 센다(`아,`·`자,`). Kiwi가 `아티팩트`의 `아`, `네 질문`의 `네`를 감탄사로 읽기도 한다
    else if (tag === 'IC' && INTERJECTION.test(form) && /^[,.!?…~]/.test(e.morphText.slice(start + len, start + len + 1))) hits.push({ sev: /^(?:네|예|아니요|아뇨)$/.test(form) ? 'S2' : 'S1', kind: 'ic', word, fix: '감탄사를 지운다' });
  });
  return hits;
}

/** 한 파일의 문장 규칙 후보 */
function levelCandidates(d) {
  const out = [];
  if (!d.entries.length) return out;
  for (const e of d.entries) {
    const sl = surfaceLevel(e.text);
    e.q = sl.q;
    e.word = sl.word;
    e.level = sl.level;
    if (e.tokens && ['frag', 'banmal', 'nominal', 'other'].includes(sl.level)) {
      const ml = morphLevel(e.tokens);
      // Kiwi는 `보고치`를 `보고하지`로 되돌려 읽기도 한다. 겉모양도 해체 어미로 끝날 때만 반말로 본다
      e.level = ml === 'banmal' && !BANMAL_SURFACE.test(sl.word) ? sl.level : ml ?? sl.level;
    }
    // 따옴표로 끝나는 문장은 남의 말을 옮긴 것이다. 등급과 물음을 보지 않는다
    if (/["”'’」』][*_]*[.?!]?[*_]*$/.test(e.text.trim())) { e.level = 'quote'; e.q = false; }
  }
  const add = (e, sev, id, tag, fix, key, word = e.word) => {
    if (!inScope(d.t, e.line)) return;
    // 허용 목록 글귀가 이 문장에 있고 후보 낱말을 품으면 뺀다
    const phrase = d.allow?.phrases.find((p) => e.text.includes(p) && p.includes(word));
    if (phrase) { d.skipped.set(phrase, (d.skipped.get(phrase) ?? 0) + 1); return; }
    out.push({ line: e.line, index: -1, sev, id, tag, word, ctx: e.text.length > 70 ? e.text.slice(0, 70) + '…' : e.text, fix, where: '', key });
  };
  /** 다수 등급. 존댓말·해라체 문장이 둘 이상일 때만 정한다. 같으면 합쇼 · 해라 · 해요 차례다 */
  const mainOf = (list) => {
    const n = { hapsyo: 0, haeyo: 0, haera: 0 };
    for (const e of list) if (e.level in n) n[e.level]++;
    if (n.hapsyo + n.haeyo + n.haera < 2) return null;
    return ['hapsyo', 'haera', 'haeyo'].reduce((a, b) => (n[b] > n[a] ? b : a));
  };
  const body = d.entries.filter((e) => e.kind === 'para' && !e.label);
  const items = d.entries.filter((e) => e.kind === 'list' && !e.label);
  const main = mainOf(body);
  // 합쇼체 글의 `-세요` 명령은 한국어 기술 문서의 관례다. 물음은 아래 자문자답에서 본다
  const allowedLevel = (e, base) => e.q || (base === 'hapsyo' && e.level === 'haeyo' && /세요$/.test(e.word));
  for (const e of [...body, ...items])
    if (e.level === 'banmal') add(e, 'S1', 'F', '높임 등급 · K9', '반말로 맺지 않는다. 글의 등급으로 맞춘다', 'K9-banmal');
  if (main) {
    const name = LEVEL_NAME[main];
    // 본문의 4분의 1 이상이 다른 등급이면 글이 원래 두 등급을 나눠 쓰는 구조일 수 있다. 목록·표를 문단으로 펼쳐 뽑은 글이 대표다.
    // 후보는 그대로 보이고, 파일마다 한 줄로 알린다 (K9는 목록과 표를 본문과 따로 센다)
    const leveled = body.filter((e) => MAIN_LEVELS.includes(e.level) && !allowedLevel(e, main));
    const off = leveled.filter((e) => e.level !== main).length;
    if (leveled.length >= 20 && off >= 10 && off / leveled.length >= 0.25)
      d.notes = [`본문 문장 ${leveled.length}개 중 ${off}개(${Math.round((off / leveled.length) * 100)}%)가 ${name}가 아니다. 목록이나 표를 문단으로 펼쳐 뽑은 글이면 원래 구조로 다시 뽑는다. K9는 목록과 표를 본문과 따로 센다`];
    for (const e of body) {
      if (e.level === 'nominal') add(e, 'S2', 'F', '높임 등급 · K9', '본문을 명사형(-함·-음)으로 맺지 않는다. 목록과 표에서만 사용한다', 'K9-nominal');
      else if (MAIN_LEVELS.includes(e.level) && e.level !== main && !allowedLevel(e, main)) {
        const sev = main === 'haeyo' && e.level === 'hapsyo' ? 'S2' : 'S1';
        add(e, sev, 'F', '높임 등급 · K9', `본문은 ${name}이다. 이 문장(${LEVEL_NAME[e.level]})도 ${name}로 맞춘다`, `K9-${e.level}`);
      }
    }
  }
  // 목록은 본문과 따로, 묶음마다 다수 등급을 정한다. 한 글 안에 선택지 목록과 절차 목록이 다른 등급이어도 된다
  for (const b of new Set(items.map((e) => e.block))) {
    const group = items.filter((e) => e.block === b);
    const listMain = mainOf(group);
    if (!listMain) continue;
    for (const e of group)
      if (MAIN_LEVELS.includes(e.level) && e.level !== listMain && !allowedLevel(e, listMain))
        add(e, 'S2', 'F', '높임 등급 · K9', `이 목록은 주로 ${LEVEL_NAME[listMain]}이다. 한 목록 안에서 맞춘다`, 'K9-list');
  }
  // 구어 종결어미는 등급이 맞아도 말할 때 사용하는 어미다. 등급이 어긋난 문장은 위에서 이미 찾았다
  for (const e of [...body, ...items])
    if (e.level === 'haeyo' && COLLOQ_EF.test(e.word) && (main === 'haeyo' || !main))
      add(e, 'S2', 'G', '구어 형태 · K10', '구어 종결어미(~거든요·~죠·~네요)를 글말 어미로 바꾼다', 'K10-ef');
  // 자문자답: 의문사가 있는 물음 뒤 같은 문단에 답이 바로 온다
  for (let i = 0; i < body.length - 1; i++) {
    const a = body[i], b = body[i + 1];
    if (a.q && a.para === b.para && !b.q && b.level !== 'frag' && QUESTION_WORD.test(a.text)) add(a, 'S1', 'H', '담화 틀 · K11', '물음을 빼고 답을 바로 작성한다', 'K11-qa');
  }
  // 형태소로 찾는 구어 형태는 등급과 상관없으므로 이름표 문장도 본다.
  // 따옴표 짝이 문장 안에서 맞지 않으면 여러 문장에 걸친 인용의 조각이라 뺀다
  const partialQuote = (t) => (t.match(/"/g) ?? []).length % 2 === 1 || (t.match(/“/g) ?? []).length !== (t.match(/”/g) ?? []).length;
  for (const e of d.entries.filter((e) => e.kind === 'para' || e.kind === 'list'))
    if (e.tokens && !partialQuote(e.text)) for (const h of morphColloquial(e)) add(e, h.sev, 'G', '구어 형태 · K10', h.fix, `K10-${h.kind}`, h.word);
  return out;
}

for (const d of docs) d.cands.push(...levelCandidates(d));

// S2는 같은 규칙이 한 파일에 S2_MIN번 이상 나올 때만 하나씩 보인다
for (const d of docs) {
  const counts = new Map();
  for (const c of d.cands) if (c.sev === 'S2') counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
  for (const c of d.cands) c.listed = c.sev === 'S1' || SHOW_ALL || counts.get(c.key) >= S2_MIN;
  d.cands.sort((a, b) => a.line - b.line || a.index - b.index);
}

let total = 0;
let quietTotal = 0;
const bySev = { S1: 0, S2: 0 };
for (const d of docs) {
  const shown = d.cands.filter((c) => c.listed);
  const quiet = d.cands.filter((c) => !c.listed);
  if (!shown.length && !quiet.length && !d.skipped.size) continue;
  total += shown.length;
  quietTotal += quiet.length;
  for (const c of shown) bySev[c.sev]++;
  log(`\n\x1b[1m${d.t.file}\x1b[0m — ${shown.length}건`);
  for (const note of d.notes ?? []) log(`  \x1b[33m주의\x1b[0m ${note}`);
  if (d.skipped.size) {
    const n = [...d.skipped.values()].reduce((a, b) => a + b, 0);
    const list = [...d.skipped].map(([p, c]) => `"${p}" ${c}`).join(' · ');
    log(`  \x1b[2m허용 목록 ${d.allow.file}으로 뺀 후보 ${n}건 — ${list}\x1b[0m`);
  }
  for (const c of shown) {
    const mark = c.where ? `\x1b[33m[${c.where}]\x1b[0m ` : '';
    log(`  ${String(c.line).padStart(5)}  ${c.sev} ${c.id} ${c.tag}  \x1b[31m${c.word}\x1b[0m`);
    log(`         ${mark}…${c.ctx}…`);
    log(`         \x1b[32m→ ${c.fix}\x1b[0m`);
  }
  if (quiet.length) {
    const groups = new Map();
    for (const c of quiet) {
      const g = groups.get(c.key) ?? { tag: c.tag, words: new Set(), lines: [] };
      g.words.add(c.word);
      g.lines.push(c.line);
      groups.set(c.key, g);
    }
    const parts = [...groups.values()].map((g) => `${[...g.words].slice(0, 2).join('·')} ${g.lines.length}곳(${g.lines.slice(0, 4).join('·')}행) [${g.tag}]`);
    log(`\x1b[2m  S2 기준 미만(같은 규칙 ${S2_MIN}번 미만, --all로 모두 보인다): ${parts.join(' · ')}\x1b[0m`);
  }
}

// 한 대상 두 낱말 · 한 낱말 여러 뜻 — 파일 전체를 보고 정한다 (STE 1.11 · 1.3)
// diff 모드에서는 어느 한쪽이라도 바뀐 줄에 있을 때만 보인다
const whole = [];
for (const d of docs) {
  const { t, masked } = d;
  const lineNo = lineFinder(masked);
  const find = (re) => [...masked.matchAll(re)].map((m) => ({ word: m[0].trim(), line: lineNo(m.index) }));
  const brief = (hs) => {
    const lines = [...new Set(hs.map((h) => h.line))];
    return `${hs.length}곳(${lines.slice(0, 4).join('·')}행${lines.length > 4 ? '…' : ''})`;
  };
  const out = [];
  for (const p of SAME_ACT) {
    const a = find(p.a), b = find(p.b);
    if (a.length && b.length && [...a, ...b].some((h) => inScope(t, h.line))) {
      whole.push({ file: t.file, tag: '한 대상 두 낱말 · STE 1.11', label: p.label, lines: [...a, ...b].map((h) => h.line) });
      out.push(`  E 한 대상 두 낱말 · STE 1.11  \x1b[31m${p.label}\x1b[0m — ${a[0].word} ${brief(a)} · ${b[0].word} ${brief(b)}\n         \x1b[32m→ ${p.fix}\x1b[0m`);
    }
  }
  for (const w of SENSES) {
    const used = w.forms.map((f) => ({ ...f, hits: find(f.re) })).filter((f) => f.hits.length);
    if (used.length >= 2 && used.some((f) => f.hits.some((h) => inScope(t, h.line)))) {
      whole.push({ file: t.file, tag: '한 낱말 여러 뜻 · STE 1.3', label: w.label, lines: used.flatMap((f) => f.hits.map((h) => h.line)) });
      out.push(`  E 한 낱말 여러 뜻 · STE 1.3  \x1b[31m${w.label}\x1b[0m — ${used.map((f) => `${f.sense} ${brief(f.hits)}`).join(' · ')}\n         \x1b[32m→ ${w.fix}\x1b[0m`);
    }
  }
  if (!out.length) continue;
  total += out.length;
  log(`\n\x1b[1m${t.file}\x1b[0m — 한 대상 두 낱말 · 한 낱말 여러 뜻 후보 ${out.length}개`);
  for (const o of out) log(o);
}

// 긴 문장과 명사 사슬 — 주제가 둘 이상 이어졌는지, 명사를 조사 없이 이었는지 읽어 볼 곳
let long = 0;
const sentenceCands = [];
for (const d of docs) {
  const { t, text } = d;
  const file = t.file;
  const from = new Map();
  /** 조각이 줄 번호를 모를 때(JSON·코드 파일) 원문에서 찾는다. 같은 글자가 여러 번 나오면 앞에서 찾은 곳 다음부터 찾는다 */
  const lineAt = (snippet) => {
    const at = text.indexOf(snippet, from.get(snippet) ?? 0);
    if (at === -1) return '-';
    from.set(snippet, at + 1);
    return text.slice(0, at).split('\n').length;
  };
  // 줄표로 두 절을 이은 문장과 18어절 이상을 먼저 보인다 — 표본에서 진짜 위반이 많았던 쪽이다
  const found = sentencesOf(file, text)
    .sort((a, b) => Number(b.dash) - Number(a.dash) || b.words - a.words)
    .map((x) => ({ ...x, line: x.line ?? lineAt(x.s.slice(0, 20)) }))
    .filter((x) => inScope(t, x.line));
  // 같은 사슬이 표 칸·라벨에서 되풀이되면 하나로 묶는다 — 판정은 한 번이다
  const chains = [];
  for (const x of nounChainsOf(file, text).map((x) => ({ ...x, line: x.line ?? lineAt(x.c) })).filter((x) => inScope(t, x.line))) {
    const g = chains.find((c) => c.c === x.c);
    if (g) g.lines.push(x.line);
    else chains.push({ c: x.c, lines: [x.line] });
  }
  const english = englishSentencesOf(file, text).map((x) => ({ ...x, line: x.line ?? lineAt(x.s.slice(0, 20)) })).filter((x) => inScope(t, x.line));
  const semis = semicolonsOf(file, text).map((x) => ({ ...x, line: x.line ?? lineAt(x.c.slice(0, 20)) })).filter((x) => inScope(t, x.line));
  if (!found.length && !chains.length && !english.length && !semis.length) continue;
  long += found.length + chains.length + english.length + semis.length;
  for (const x of found) sentenceCands.push({ file, line: x.line, tag: `긴 문장 · STE ${PROCEDURE ? '5.1' : '6.3'}`, words: x.words });
  for (const x of chains) sentenceCands.push({ file, line: x.lines[0], tag: '명사 사슬 · STE 2.1', text: x.c, lines: x.lines });
  for (const x of english) sentenceCands.push({ file, line: x.line, tag: `긴 영어 문장 · STE ${PROCEDURE ? '5.1' : '6.3'}`, words: x.words });
  for (const x of semis) sentenceCands.push({ file, line: x.line, tag: '세미콜론 · STE 8.1' });
  log(`\n\x1b[1m${file}\x1b[0m — ${SENTENCE_WORDS}어절 넘는 문장 ${found.length}개 · 명사 사슬 ${chains.length}개 · ${ENGLISH_WORDS}단어 넘는 영어 문장 ${english.length}개 · 세미콜론 ${semis.length}개`);
  for (const { s, words, dash, line } of found) {
    const mark = dash ? ' \x1b[33m줄표 이음\x1b[0m' : '';
    log(`  ${String(line).padStart(5)}  E 긴 문장 · STE ${PROCEDURE ? '5.1' : '6.3'} 환산 ${words}어절${mark}  ${s.length > 70 ? s.slice(0, 70) + '…' : s}`);
  }
  for (const { c, lines } of chains) {
    const uniq = [...new Set(lines)];
    const more = lines.length > 1 ? ` \x1b[2m${lines.length}곳(${uniq.slice(0, 4).join('·')}행${uniq.length > 4 ? '…' : ''})\x1b[0m` : '';
    log(`  ${String(lines[0]).padStart(5)}  E 명사 사슬 · STE 2.1  ${c}${more}`);
  }
  for (const { s: e, words, line } of english)
    log(`  ${String(line).padStart(5)}  E 긴 영어 문장 · STE ${PROCEDURE ? '5.1' : '6.3'} ${words}단어  ${e.length > 70 ? e.slice(0, 70) + '…' : e}`);
  for (const { c, line } of semis)
    log(`  ${String(line).padStart(5)}  E 세미콜론 · STE 8.1  ${c.length > 70 ? c.slice(0, 70) + '…' : c}`);
}

const allCands = docs.flatMap((d) => d.cands.map(({ index, ...c }) => ({ file: d.t.file, ...c })));
if (TSV_OUT) {
  const cell = (v) => String(v ?? '').replace(/[\t\n]/g, ' ');
  const rows = [['file', 'line', 'sev', 'id', 'tag', 'word', 'listed', 'context', 'label'].join('\t')];
  for (const c of allCands) rows.push([c.file, c.line, c.sev, c.id, c.tag, c.word, c.listed ? 'yes' : 'no', c.ctx, ''].map(cell).join('\t'));
  fs.writeFileSync(TSV_OUT, rows.join('\n') + '\n');
  log(`\n판정 표를 저장했다: ${TSV_OUT} (${allCands.length}행). label 칸에 y(맞는 지적)·n(오탐)을 채운 뒤 원본 저장소의 scripts/prose-check/precision.mjs로 측정한다`);
}

const morphLine = NO_MORPH ? '형태소 분석 끔' : morph ? `형태소 분석 Kiwi ${morph.version} · ${morph.model}` : '형태소 분석 없음';
const quietLine = quietTotal ? ` S2 기준 미만 ${quietTotal}건은 위 요약 줄에 있다.` : '';
if (JSON_OUT) {
  console.log(JSON.stringify({ morph, morphMissing, setupSkipped: setupSkipped(), candidates: allCands, whole, sentences: sentenceCands, notes: docs.flatMap((d) => (d.notes ?? []).map((note) => ({ file: d.t.file, note }))) }, null, 1));
} else {
  console.log(
    total || long
      ? `\n\x1b[1m합계 ${total}건 (S1 ${bySev.S1} · S2 ${bySev.S2})${long ? ` · 문장 후보 ${long}개` : ''}.\x1b[0m${quietLine} \x1b[2m${morphLine}.\x1b[0m 후보일 뿐이다. 낱말은 korean-patterns.md의 네 질문(출처·화면·역질문·치환)이 판정한다. 긴 문장은 "주제가 하나인가", 명사 사슬은 "조사나 동사로 풀 수 있나"로 판정한다.`
      : `\n후보 없음.${quietLine} \x1b[1m통과가 아니다\x1b[0m. \x1b[2m${morphLine}.\x1b[0m 씨앗 목록은 지난 실수일 뿐이고, 다음 실수는 목록에 없는 낱말로 나온다. SKILL.md Step 2를 돌린다.`,
  );
}
// process.exit()는 파이프로 넘기는 긴 출력을 다 내보내기 전에 끝낸다 — 종료 코드만 정한다
// 0: 후보 없음 · 1: 후보 있음 · 2: 읽지 못한 파일이 있음
if (unreadable) console.error(`\n읽지 못한 파일 ${unreadable}개. 경로를 확인한다.`);
process.exitCode = unreadable ? 2 : total || long ? 1 : 0;
