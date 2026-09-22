/**
 * 글을 줄·문장으로 나누고 문장마다 높임 등급을 가린다. check.mjs가 사용하고, 원본 저장소의 관리 도구(scripts/prose-check)도
 * 가져다 사용한다.
 *
 * 높임 등급은 문장 끝 어절의 겉모양으로 먼저 가린다. 겉모양으로 못 가리는 문장(해체·명사형·명사로 끝난 조각)만
 * Kiwi 형태소 결과로 다시 가린다. Kiwi는 `~다(…).`처럼 괄호가 붙은 문장 끝을 연결 어미로 잘못 읽어서,
 * 겉모양이 분명한 문장에는 정규식이 더 정확하다.
 */

/**
 * 펜스 코드 블록 (CommonMark). check.mjs의 FENCE와 같은 규칙이다. 줄 머리에서 들여쓰기 3칸 이하,
 * 백틱 또는 물결표 3개 이상으로 열고, 같은 글자로 여는 펜스 이상 길게 닫는다. 안 닫히면 문서 끝까지다.
 * 정보 문자열에는 백틱 펜스일 때만 백틱이 못 온다
 */
const FENCE = /^ {0,3}(([`~])\2{2,})(?:(?<=`)[^`\n]*|(?<=~)[^\n]*)\n[\s\S]*?(?:\n {0,3}\1\2*[ \t]*\r?(?=\n|$)|$(?![\s\S]))/gm;

/** 코드 블록·인라인 코드·HTML 주석·<pre>·<code>를 같은 길이의 공백으로 가린다. 줄 번호와 위치는 그대로다 */
export function maskCode(text) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  return text
    .replace(FENCE, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, blank)
    .replace(/`[^`\n]+`/g, (s) => '`' + ' '.repeat(s.length - 2) + '`');
}

/** 마크다운으로 읽을 파일인가. 높임 등급 검사는 이 파일에만 한다 */
export const MARKDOWN = /\.(?:md|mdx|markdown|txt|rst)$/i;

/**
 * 가린 글을 줄 단위로 나누고 종류를 붙인다.
 * 종류: heading · table · list · quote · para · blank
 * text는 줄머리 기호를 떼고 인라인 코드를 `C` 한 글자로 바꾼 글이다
 */
export function linesOf(masked) {
  const out = [];
  masked.split('\n').forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return out.push({ line, kind: 'blank', text: '' });
    let kind = 'para';
    if (/^\s*#{1,6}\s/.test(raw)) kind = 'heading';
    else if (/^\s*\|/.test(raw)) kind = 'table';
    else if (/^\s*(?:[-*+•]|\d+[.)])\s+/.test(raw)) kind = 'list';
    else if (/^\s*>/.test(raw)) kind = 'quote';
    else if (/^\s*<[^>]+>\s*$/.test(raw)) kind = 'blank';
    const text = raw
      .replace(/^\s*(?:#{1,6}\s+|[-*+•]\s+|\d+[.)]\s+|>\s?)/, '')
      .replace(/`\s*`/g, 'C')
      .replace(/<[^>\n]+>/g, ' ');
    out.push({ line, kind, text });
  });
  return out;
}

/** 한 줄을 문장으로 나눈다 */
export function sentencesOf(text) {
  return text.split(/(?<=[.?!][*_"'”’)\]]*)\s+(?=\S)/).map((s) => s.trim()).filter((s) => /[가-힣]/.test(s));
}

/** HTML로 읽을 파일인가. 높임 등급 검사는 요소 종류로 줄 종류를 정한다 */
export const HTML = /\.html?$/i;

/** 안의 글을 문장으로 보지 않는 요소다. 그림 글자·코드·입력값이 들어 있다 */
const HTML_SKIP = new Set('head script style pre code svg math template textarea select noscript iframe object canvas'.split(' '));
/** 요소마다 줄 종류. 목록에 없는 요소(p·div·section 등)는 바깥 요소를 따르고, 끝까지 없으면 문단(para)이다 */
const HTML_KIND = {
  li: 'list', dd: 'list',
  td: 'table', th: 'table', caption: 'table', figcaption: 'table',
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  title: 'heading', summary: 'heading', legend: 'heading', label: 'heading', button: 'heading', option: 'heading', dt: 'heading', nav: 'heading',
};
/** 블록 요소. 여닫는 태그가 문단 경계다. check.mjs의 BLOCK_TAG와 같은 목록이다 */
const HTML_BLOCK = new Set('html body main header footer section article aside nav div p h1 h2 h3 h4 h5 h6 ul ol li dl dt dd table thead tbody tfoot tr td th caption hr details summary blockquote figure figcaption form fieldset legend label button option address title'.split(' '));
const HTML_VOID = new Set('area base br col embed hr img input link meta source track wbr'.split(' '));
const ENTITY = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", mdash: '—', ndash: '–', middot: '·', hellip: '…', rarr: '→', larr: '←', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' };
/** 주석 · 원문 요소(script·style·pre·textarea) · <code> · 태그 · 문자 개체 · 공백 · 글자 */
const HTML_TOKEN = /<!--[\s\S]*?(?:-->|$)|<(script|style|pre|textarea)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)|<code\b[^>]*>[\s\S]*?<\/code\s*>|<(\/?)([A-Za-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|&(#\d{1,7}|#[xX][0-9A-Fa-f]{1,6}|[A-Za-z]{2,8});|\s+|[^<&\s]+|[<&]/gi;

function decodeEntity(name) {
  if (name[0] !== '#') return ENTITY[name.toLowerCase()] ?? ' ';
  const n = /^#[xX]/.test(name) ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
}

/**
 * HTML 파일의 문장 목록. 마크다운의 sentenceEntries와 같은 꼴이다: { line, kind, para, block, label, text, morphText }.
 * 블록 요소 하나가 한 문단이고, <br>은 문단 안의 줄바꿈이다. 목록 묶음(block)은 ul·ol 요소 하나다.
 * dd는 저마다 한 묶음이다. 정의 목록의 dd는 서로 다른 내용(이유·조치·확인)을 담기도 한다.
 * 제목·표 칸·버튼·그림 설명은 이름표라서 문장 목록에 넣지 않는다. <blockquote> 안의 글은 인용(quote)이다.
 * 문단 속 조각이 문장 부호로 끝나지 않으면 카드 제목·링크 글자 같은 이름표로 보고(label) 등급을 세지 않는다.
 * <strong>·<b>는 `**`로, <q>는 따옴표로, <code>는 `C` 한 글자로 바꾼다. 마크다운과 같은 판정을 받게 한다
 */
export function htmlEntries(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  const lineOf = (i) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= i) lo = m; else hi = m - 1; }
    return lo + 1;
  };
  const stack = [];
  const lines = [];
  let buf = '';
  let offs = [];
  let para = 0;
  let listSeq = 0;
  const skipping = () => stack.some((e) => HTML_SKIP.has(e.name));
  const kindOf = () => {
    if (stack.some((e) => e.name === 'blockquote')) return 'quote';
    for (let i = stack.length - 1; i >= 0; i--) if (HTML_KIND[stack[i].name]) return HTML_KIND[stack[i].name];
    return 'para';
  };
  const put = (s, at) => {
    if (skipping()) return;
    for (const ch of s) {
      const space = /\s/.test(ch);
      if (space && (!buf || buf.endsWith(' '))) continue;
      buf += space ? ' ' : ch;
      // 위치는 UTF-16 글자마다 하나다. 이모지처럼 두 단위인 글자도 indexOf 위치와 맞게 한다
      for (let k = 0; k < (space ? 1 : ch.length); k++) offs.push(at);
    }
  };
  const flush = () => {
    if (/[가-힣]/.test(buf)) {
      const list = [...stack].reverse().find((e) => e.list);
      lines.push({ kind: kindOf(), para, block: list ? list.list : 0, text: buf, offs });
    }
    buf = '';
    offs = [];
  };
  /** 닫는 태그를 빠뜨린 요소를 닫는다. 새 li는 열린 li를, 새 칸은 열린 칸을 닫는다 — 목록·표 요소를 넘어가지 않는다 */
  const closeImplied = (names, stop) => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (names.includes(stack[i].name)) { stack.length = i; return; }
      if (stop.includes(stack[i].name)) return;
    }
  };
  for (const m of text.matchAll(HTML_TOKEN)) {
    const [tok, raw, slash, tagName, , entity] = m;
    if (tok.startsWith('<!--')) continue;
    if (raw) { flush(); para++; continue; }
    if (/^<code\b/i.test(tok)) { put('C', m.index); continue; }
    if (tagName) {
      const name = tagName.toLowerCase();
      if (name === 'strong' || name === 'b') { put('**', m.index); continue; }
      if (name === 'q') { put(slash ? '”' : '“', m.index); continue; }
      if (name === 'br') { flush(); continue; }
      const block = HTML_BLOCK.has(name);
      if (!block && !HTML_SKIP.has(name)) continue;
      if (block) { flush(); para++; }
      if (slash) {
        const i = stack.map((e) => e.name).lastIndexOf(name);
        if (i !== -1) stack.length = i;
        continue;
      }
      if (HTML_VOID.has(name) || tok.endsWith('/>')) continue;
      if (name === 'li') closeImplied(['li'], ['ul', 'ol']);
      else if (name === 'td' || name === 'th') closeImplied(['td', 'th'], ['tr', 'table']);
      else if (name === 'tr') closeImplied(['tr'], ['table']);
      else if (name === 'dt' || name === 'dd') closeImplied(['dt', 'dd'], ['dl']);
      else if (block && stack.at(-1)?.name === 'p') stack.pop();
      stack.push({ name, list: /^(?:ul|ol|dl|dd)$/.test(name) ? ++listSeq : 0 });
      continue;
    }
    put(entity ? decodeEntity(entity) : tok, m.index);
  }
  flush();
  const entries = [];
  for (const ln of lines) {
    if (ln.kind === 'heading' || ln.kind === 'table') continue;
    let from = 0;
    for (const s of sentencesOf(ln.text)) {
      const at = ln.text.indexOf(s, from);
      from = at + s.length;
      const ended = /[.?!…:][*_"'”’)\]」』]*$/.test(s);
      const label = /^\*\*[^*]+\*\*[.?!]?$/.test(s) || (ln.kind === 'para' && !ended);
      entries.push({ line: lineOf(ln.offs[Math.max(0, at)]), kind: ln.kind, para: ln.para, block: ln.block, label, text: s, morphText: s.replace(/\*{1,3}|_{2}/g, '') });
    }
  }
  return entries;
}

const JONG_B = 17; // 받침 ㅂ
const JONG_SS = 20; // 받침 ㅆ
const jong = (ch) => {
  const c = (ch ?? '').charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 ? c % 28 : -1;
};

const NOUN_YO = /(?:필요|중요|주요|수요|개요|요요|소요|강요|불필요)$/;
const NOUN_HAE = /(?:이해|피해|오해|공해|방해|분해|손해|저해|침해)$/;
const NOUN_IM = /(?:게임|프레임|타임|네임|런타임|스킴)$/;
const NOUN_EUM = /(?:다음|처음|마음|모음|묶음|얼음|웃음|울음|걸음|믿음|물음|소음|잡음|녹음|발음)$/;
const NOUN_JI = /(?:페이지|메시지|이미지|패키지|스토리지|브리지|브릿지|에지|엣지|잡지|용지|부지|의지|지지)$/;

/** 문장 끝을 정리한다. 마크다운 강조·따옴표·괄호 주석·마침표를 떼어 낸 글과 물음·느낌 표시를 돌려준다 */
export function tailOf(sentence) {
  let s = sentence.replace(/[*_`"'”’」』)\]}>\s]+$/u, '');
  const q = /\?$/.test(s);
  const ex = /!$/.test(s);
  s = s.replace(/[.?!…~:;]+$/u, '').replace(/\s*\([^()]*\)$/, '').replace(/[*_`"'”’」』)\]}>\s]+$/u, '');
  return { s, q, ex };
}

/**
 * 문장 끝 어절의 겉모양으로 높임 등급을 가린다.
 * 등급: hapsyo(합쇼) · haeyo(해요) · haera(해라) · banmal(해체) · nominal(명사형 -ㅁ) · frag(명사 등으로 끝난 조각) · other
 */
export function surfaceLevel(sentence) {
  const { s, q, ex } = tailOf(sentence);
  const last = s.split(/\s+/).pop() || '';
  const m = /([가-힣]+)$/.exec(last);
  if (!m) return { level: 'other', q, ex, word: last };
  const w = m[1];
  const n = w.length;
  const before = n >= 3 ? w[n - 3] : '';
  const r = (level) => ({ level, q, ex, word: w });
  if (/(?:니다|니까)$/.test(w) && (before === '습' || jong(before) === JONG_B)) return r('hapsyo');
  if (/(?:십시오|시오)$/.test(w)) return r('hapsyo');
  // `-ㅂ시다`(알아봅시다·합시다)는 합쇼체 글에서 사용하는 권유형이다
  if (/시다$/.test(w) && n >= 3 && (jong(w[n - 3]) === JONG_B || w[n - 3] === '읍')) return r('hapsyo');
  // `~인지`·`~켤지`처럼 물음을 담은 조각은 목록이나 표에서 사용하는 형태다 (STE 9.4)
  if (/지$/.test(w) && n >= 2 && (jong(w[n - 2]) === 4 || jong(w[n - 2]) === 8 || w[n - 2] === '는')) return r('frag');
  if ((/요$/.test(w) && !NOUN_YO.test(w)) || /죠$/.test(w)) return r('haeyo');
  if (/다$/.test(w)) return r('haera');
  if (/(?:는가|인가|은가|던가)$/.test(w)) return r('haera');
  if (/(?:하라|보라|말라|두라|으라|되라|하자|보자|가자|두자|쓰자|읽자|넣자|빼자|고치자|바꾸자|만들자)$/.test(w)) return r('haera');
  if (n >= 2 && /어$/.test(w) && jong(w[n - 2]) === JONG_SS) return r('banmal');
  if (/(?:거든|잖아|더라|던데|이야|거야|건데|구나|할게|볼게|줄게|할까|볼까|거지|하지|되지|않지|맞지|있지|없지|해|돼|봐|줘)$/.test(w)
    && !NOUN_HAE.test(w) && !NOUN_JI.test(w)) return r('banmal');
  if (/(?:했음|됐음|였음|었음|았음|겠음|있음|없음|않음|같음|[가-힣]함|[가-힣]됨|[가-힣]임|[가-힣]음)$/.test(w)
    && !NOUN_IM.test(w) && !NOUN_EUM.test(w)) return r('nominal');
  return r('frag');
}

/** 형태소 결과로 높임 등급을 가린다. 마지막 종결 어미(EF)의 형태를 본다. 못 가리면 null */
export function morphLevel(tokens) {
  const content = tokens.filter(([, tag]) => !/^S[FPSEOW]/.test(tag));
  const last = content[content.length - 1];
  if (!last) return null;
  const [form, tag] = last;
  // 영어·숫자·기호로 끝난 문장은 등급을 정하지 않는다
  if (/^(?:SL|SH|SN|W_|Z_)/.test(tag)) return 'other';
  // 명사형 `-ㅁ`은 표 칸 등에서 EF로 붙기도 한다
  if ((tag === 'EF' || tag === 'ETN') && /^(?:ᆷ|음|기)$/.test(form)) return 'nominal';
  // `~는지`·`~ㄹ지`로 끝난 물음 조각
  if (/(?:ᆫ지|ᆯ지|는지|은지|을지|던지)$/.test(form)) return 'frag';
  if (tag === 'EF') {
    if (/(?:ᆸ시다|읍시다)$/.test(form)) return 'hapsyo';
    if (/(?:니다|니까|시오)$/.test(form)) return 'hapsyo';
    if (/(?:요|죠)$/.test(form)) return 'haeyo';
    if (/(?:다|라|자|가)$/.test(form)) return 'haera';
    // 해체 어미로 알려진 꼴만 반말로 본다. Kiwi는 드문 합성 명사(`보고치`)를 동사+어미로 읽기도 한다
    if (/(?:어|아|여|해|야|지|네|게|걸|래|니|냐|까|거든|잖아|데|구나|군)$/.test(form)) return 'banmal';
    return null;
  }
  if (/^(?:NN|NP|NR|XSN|XR)/.test(tag)) return 'frag';
  return null;
}

/** 존댓말 등급 */
export const POLITE = new Set(['hapsyo', 'haeyo']);
export const LEVEL_NAME = { hapsyo: '합쇼체', haeyo: '해요체', haera: '해라체', banmal: '반말', nominal: '명사형 종결', frag: '조각', other: '기타' };
