#!/usr/bin/env node
/**
 * check.mjs 검사. 고정 글을 임시 파일로 쓰고 스크립트를 돌려, 후보가 나오는지와 안 나오는지를 본다.
 *
 *   node --test scripts/prose-check/check.test.mjs
 *
 * 오탐 사례가 후보에서 빠지는지와, 진짜 후보가 그대로 나오는지를 함께 본다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { venvPython } from '../../plugins/writing/skills/prose-check/scripts/lib/kiwi.mjs';

const CHECK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../plugins/writing/skills/prose-check/scripts/check.mjs');

/** 글을 임시 폴더의 파일로 쓰고 검사한다. 폴더에 .git을 두어 허용 목록 찾기가 그 안에서 멈추게 한다 */
function run(content, { ext = 'md', allow, args = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ste-check-'));
  try {
    fs.mkdirSync(path.join(dir, '.git'));
    if (allow !== undefined) fs.writeFileSync(path.join(dir, '.prose-check-allow'), allow);
    const file = path.join(dir, `doc.${ext}`);
    fs.writeFileSync(file, content);
    const r = spawnSync(process.execPath, [CHECK, ...args, file], { encoding: 'utf8' });
    const plain = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
    return { out: plain(r.stdout), err: plain(r.stderr), code: r.status };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('후보가 없으면 종료 코드 0이다', () => {
  const r = run('서버가 응답을 돌려준다.\n');
  assert.equal(r.code, 0);
  assert.match(r.out, /후보 없음/);
});

test('<script>와 <style> 안의 글은 검사하지 않는다', () => {
  const html = '<p>서버가 응답을 돌려준다.</p>\n<script>\n  // 묶음 접기. 접은 묶음은 브라우저에 남긴다\n  const a = 1; const b = 2;\n</script>\n<style>:root { --bg: #fff; --ink: #000; }</style>\n';
  const r = run(html, { ext: 'html' });
  assert.doesNotMatch(r.out, /남긴다/);
  assert.doesNotMatch(r.out, /세미콜론 · STE/);
  assert.equal(r.code, 0);
});

test('<code>와 <pre> 안의 원문은 검사하지 않는다', () => {
  const html = '<p>메시지는 <code>그룹 정책에 의해 자동승인 방식이 허용되지 않습니다.</code>이다.</p>\n<pre>관리자에 의해 차단된 계정입니다.</pre>\n';
  assert.doesNotMatch(run(html, { ext: 'html' }).out, /에 의해/);
  // 같은 글이 코드 밖에 있으면 후보다. `~에 의해`는 S2라 --all로 하나씩 보인다
  assert.match(run('<p>그룹 정책에 의해 승인이 막힌다.</p>\n', { ext: 'html', args: ['--all'] }).out, /S2 C 직역투 문형 · K6 {2}에 의해/);
});

test('Markdown 백틱 스팬 안의 원문은 검사하지 않는다', () => {
  assert.doesNotMatch(run('메시지는 `관리자에 의해 차단된 계정입니다.`이다.\n').out, /에 의해/);
  assert.match(run('관리자에 의해 계정이 막힌다.\n').out, /에 의해/);
});

test('HTML 주석 안의 글은 검사하지 않는다', () => {
  assert.doesNotMatch(run('<p>정상이다.</p><!-- 결과가 캐시에 남는다 -->\n', { ext: 'html' }).out, /남는다/);
});

test('블록 요소의 태그는 문장 경계다 — 이웃 요소의 글이 한 문장으로 붙지 않는다', () => {
  const meta = '<p class="meta"><code>course-api</code><span class="dot"> · </span>요청 1건<span class="dot"> · </span>처음 02/05 15:34<span class="dot"> · </span><a href="#">Error Tracking</a></p>';
  const html = meta.repeat(6) + '<dl><dt>확인</dt><dd>알림은 장애 채널로 갑니다.</dd></dl>\n';
  assert.doesNotMatch(run(html, { ext: 'html' }).out, /긴 문장 · STE/);
});

test('한 요소 안의 긴 문장은 그대로 후보이고 줄 번호를 안다', () => {
  const html = '<h2>조치</h2>\n<ul>\n<li>광고 이미지 생성 API가 Lambda를 동기로 부르는데, 한 건은 Lambda가 <code>500</code>을 돌려주었고 한 건은 클라이언트 제한 시간을 넘겼습니다.</li>\n</ul>\n';
  assert.match(run(html, { ext: 'html' }).out, /^ +3 {2}E 긴 문장 · STE 6\.3 환산 18어절/m);
});

test('코드 스팬 안의 꺾쇠는 태그가 아니다 — 사이의 글이 문장 길이 검사에서 빠지지 않는다', () => {
  const r = run('먼저 `a < b`로 두 값을 비교하고 그 결과를 저장한 다음 이 값을 다시 읽어서 화면의 표에 차례대로 표시하고 마지막에 `c > d`인지 확인한다.\n', { args: ['--no-morph'] });
  assert.match(r.out, /E 긴 문장 · STE 6\.3 환산 2\d어절/);
});

test('코드 스팬은 자리표시자 한 어절이 되어 명사 사슬을 끊는다', () => {
  assert.doesNotMatch(run('<p>클라이언트 제한 시간 <code>50</code>초</p>\n', { ext: 'html' }).out, /명사 사슬 · STE/);
  assert.doesNotMatch(run('- 클라이언트 제한 시간 `50`초\n').out, /명사 사슬 · STE/);
  // 명사 넷 이상을 조사 없이 이으면 후보다
  assert.match(run('- 서비스별 지표 요청 상위 목록\n').out, /명사 사슬 · STE 2\.1 {2}서비스별 지표 요청 상위 목록/);
});

test('같은 명사 사슬이 표에서 되풀이되면 하나로 묶는다', () => {
  const row = '<tr><td><span class="cls">정상 흐름 기록</span> <span class="flag">바뀜</span></td></tr>\n';
  const r = run('<table>\n' + row.repeat(3) + '</table>\n', { ext: 'html' });
  assert.match(r.out, /명사 사슬 1개/);
  assert.match(r.out, /정상 흐름 기록 바뀜 3곳\(2·3·4행\)/);
});

test('`받는 사람`·`보낸 사람`은 수신자·발신자를 뜻하는 말이라 후보가 아니다', () => {
  assert.doesNotMatch(run('받는 사람·보낸 사람 주소를 모두 후보로 모은다.\n').out, /받는/);
  assert.match(run('행이 카드를 받는다.\n', { args: ['--all'] }).out, /S2 C 직역 동사 · K2 {2}받는다/);
});

test('목적어가 수인 `센다`는 실제로 세는 일이라 후보가 아니다', () => {
  const r = run('`countDocuments`로 문서 수를 센다. 행을 센다. 개수를 셉니다. 건수를 세다.\n');
  assert.doesNotMatch(r.out, /주석 말투/);
  assert.match(run('분석기가 재고를 센다.\n').out, /주석 말투 · STE 1\.10 {2}를 센다/);
  // 목적어가 수가 아니면 후보로 보고한다. 판정은 korean-patterns.md §6이 한다
  assert.match(run('원본 강의가 없는 챌린지를 센다.\n').out, /를 센다/);
  // 과거형도 같다
  assert.match(run('후보를 셌습니다.\n').out, /주석 말투 · STE 1.10 {2}셌습니다/);
  assert.doesNotMatch(run('문서 수를 셌습니다.\n').out, /주석 말투/);
});

test('허용 목록 .prose-check-allow 안의 글귀는 후보에서 빼고 뺀 수를 보인다', () => {
  const md = 'SQS 큐 9개에 오래된 메시지가 남아 있음.\n\n큐에 메시지가 남아 있고 소비자가 없다.\n';
  assert.match(run(md, { args: ['--all'] }).out, /S2 C 직역 동사 · K2 {2}남아 있/);
  const r = run(md, { allow: '# SQS 큐에 메시지가 실제로 남아 있는 사실\n메시지가 남아 있   # 두 어절 이상\n', args: ['--all'] });
  assert.doesNotMatch(r.out, /C 직역 동사 · K2 {2}남아 있/);
  assert.match(r.out, /허용 목록 .*\.prose-check-allow으로 뺀 후보 2건 — "메시지가 남아 있" 2/);
  assert.equal(r.code, 0);
});

test('허용 목록의 글귀는 두 어절 이상이다 — 한 어절은 경고하고 무시한다', () => {
  const r = run('결과가 캐시에 남는다.\n', { allow: '남는다\n', args: ['--all'] });
  assert.match(r.err, /허용 목록 무시: "남는다"/);
  assert.match(r.out, /S2 C 직역 동사 · K2 {2}남는다/);
});

test('허용 목록은 파일이 있는 폴더의 위쪽에서도 찾는다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ste-check-'));
  try {
    fs.mkdirSync(path.join(dir, '.git'));
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.writeFileSync(path.join(dir, '.prose-check-allow'), '메시지가 남아 있\n');
    const file = path.join(dir, 'docs', 'note.md');
    fs.writeFileSync(file, '큐에 메시지가 남아 있다.\n');
    const r = spawnSync(process.execPath, [CHECK, file], { encoding: 'utf8' });
    assert.match(r.stdout, /허용 목록 .*으로 뺀 후보 1건/);
    assert.equal(r.status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('저장소 밖 파일은 현재 폴더의 저장소에서 허용 목록을 찾는다', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'ste-repo-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ste-out-'));
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'ste-other-'));
  try {
    fs.mkdirSync(path.join(repo, '.git'));
    fs.writeFileSync(path.join(repo, '.prose-check-allow'), '메시지가 남아 있\n');
    // 임시 폴더처럼 어느 저장소에도 없는 파일은 현재 폴더(repo)의 목록을 사용한다
    const file = path.join(outside, 'ai-text.md');
    fs.writeFileSync(file, '큐에 메시지가 남아 있다.\n');
    const r = spawnSync(process.execPath, [CHECK, file], { encoding: 'utf8', cwd: repo });
    assert.match(r.stdout, /허용 목록 .*으로 뺀 후보 1건/);
    // 다른 저장소 안의 파일은 그 저장소의 규칙을 따른다. 현재 폴더의 목록을 빌리지 않는다
    fs.mkdirSync(path.join(other, '.git'));
    const inOther = path.join(other, 'note.md');
    fs.writeFileSync(inOther, '큐에 메시지가 남아 있다.\n');
    const r2 = spawnSync(process.execPath, [CHECK, '--all', inOther], { encoding: 'utf8', cwd: repo });
    assert.doesNotMatch(r2.stdout, /허용 목록/);
    assert.match(r2.stdout.replace(/\x1b\[[0-9;]*m/g, ''), /직역 동사 · K2 {2}남아 있/);
  } finally {
    for (const d of [repo, outside, other]) fs.rmSync(d, { recursive: true, force: true });
  }
});

test('본문의 4분의 1 이상이 다른 등급이면 목록·표를 펼친 글인지 한 줄로 알린다', () => {
  // 판단 글(합쇼체)과 절차(해라체)를 모두 문단으로 펼친 글
  const flat = Array.from({ length: 12 }, (_, i) => `서비스 ${i}의 오류는 정상 흐름 기록입니다.\n\n로그 ${i}의 원인을 확인한다.\n`).join('\n');
  const r = run(flat, { args: ['--no-morph'] });
  assert.match(r.out, /주의 본문 문장 24개 중 12개\(50%\)가 .*아니다\. 목록이나 표를 문단으로 펼쳐 뽑은 글이면 원래 구조로 다시 뽑는다/);
  // 같은 글이라도 절차를 목록으로 두면 알리지 않는다
  const structured = Array.from({ length: 12 }, (_, i) => `서비스 ${i}의 오류는 정상 흐름 기록입니다.\n\n- 로그 ${i}의 원인을 확인한다.\n`).join('\n');
  assert.doesNotMatch(run(structured, { args: ['--no-morph'] }).out, /주의 본문 문장/);
});

test('형태소 분석 도우미가 제한 시간을 넘기면 정규식만으로 계속한다', { skip: !venvPython() && 'Kiwi가 없다' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ste-check-'));
  try {
    fs.mkdirSync(path.join(dir, '.git'));
    const file = path.join(dir, 'doc.md');
    fs.writeFileSync(file, '결과가 캐시에 남는다.\n');
    const r = spawnSync(process.execPath, [CHECK, '--all', file], { encoding: 'utf8', env: { ...process.env, PROSE_CHECK_KIWI_TIMEOUT_MS: '1' } });
    const out = r.stdout.replace(/\x1b\[[0-9;]*m/g, '');
    assert.match(out, /형태소 분석 실패, 정규식만 사용한다: Kiwi 도우미가 0\.001초 안에 끝나지 않았다/);
    assert.match(out, /직역 동사 · K2 {2}남는다/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('진짜 후보는 그대로 나온다', () => {
  const html = '<p><code>error instanceof ApiError</code>가 거짓이면 아래 분기로 간다.</p>\n<p>경보가 아무 뜻을 갖지 않습니다.</p>\n';
  // have 직역은 S1이라 늘 보인다. `~로 간다`는 S2라 --all로 하나씩 보인다
  assert.match(run(html, { ext: 'html' }).out, /S1 C 직역투 문형 · K6 {2}을 갖지 않/);
  const r = run(html, { ext: 'html', args: ['--all'] });
  assert.match(r.out, /S2 C 직역 동사 · K2 {2}로 간다/);
  assert.equal(r.code, 1);
});

test('쓰다는 모든 활용형이 후보이고, 두 뜻이 함께 나오면 1.3 전체 후보로도 보인다', () => {
  const r = run('버전 `1.0`을 쓴다. 결과를 코드에 쓴다. 라이브러리를 쓰면 로그를 쓸 수 있다.\n');
  assert.equal((r.out.match(/D 뜻이 둘인 동사 · STE 1\.3 {2}[쓰쓴쓸써썼씁]/g) ?? []).length, 4);
  assert.match(r.out, /E 한 낱말 여러 뜻 · STE 1\.3 {2}쓰다 — 사용 \d곳.* · 작성 \d곳/);
  assert.match(r.out, /사용한다\(사용 뜻\) · 작성한다·기록한다\(작성 뜻\)/);
});

test('쓰다의 굳은 합성어는 후보가 아니다', () => {
  const r = run('덮어쓰기와 글쓰기, 띄어쓰기, 읽기·쓰기 권한은 쓸모 있다. 쓰임새가 다르다. 애쓴다. 힘쓴다. 신경 쓴다.\n');
  assert.doesNotMatch(r.out, /뜻이 둘인 동사/);
});

test('두다는 유지 뜻(그대로 둔다·~해 둔다)을 뺀 나머지가 후보다', () => {
  const hit = run('상한 검사를 둔다. 임계값을 따로 둔다. 사본을 하나 더 둔다.\n');
  assert.equal((hit.out.match(/D 뜻이 둘인 동사 · STE 1\.3 {2}둔다/g) ?? []).length, 3);
  const keep = run('나머지는 그대로 둔다. 결과를 저장해 둔다. 도구가 찾아 둔 후보다. 화면에 보이게 둔다. 두 개를 둘 다 본다.\n');
  assert.doesNotMatch(keep.out, /뜻이 둘인 동사/);
  // 두 뜻이 함께 나오면 1.3 전체 후보다
  assert.match(run('상한 검사를 둔다. 나머지는 그대로 둔다.\n').out, /E 한 낱말 여러 뜻 · STE 1\.3 {2}두다 — 추가·설정 1곳.* · 유지 1곳/);
});

test('잡다는 catch 뜻(예외·오류를 잡는다)을 뺀 나머지가 후보다', () => {
  const hit = run('임계값을 높게 잡는다. 기준을 잡고 비교한다.\n');
  assert.equal((hit.out.match(/D 뜻이 둘인 동사 · STE 1\.3 {2}잡/g) ?? []).length, 2);
  const keep = run('예외를 잡는다. 오류를 잡고 다시 시도한다. `ApiError`를 모두 잡는다. 에러가 잡힌다. 자리를 잡는다. 균형을 잡는다. 잡음이 섞인다. 오해를 바로잡는다.\n');
  assert.doesNotMatch(keep.out, /뜻이 둘인 동사/);
  assert.match(run('임계값을 높게 잡는다. 예외를 잡는다.\n').out, /E 한 낱말 여러 뜻 · STE 1\.3 {2}잡다 — 설정 1곳.* · catch 1곳/);
});

test('쓰다의 -자 꼴과 관형 피동 꼴(쓰자·쓰인)도 후보다', () => {
  const r = run('`문`을 쓰자 비유가 늘었다. 타입으로 쓰인 선언이다.\n');
  assert.equal((r.out.match(/D 뜻이 둘인 동사 · STE 1\.3 {2}쓰[자인]/g) ?? []).length, 2);
});

test('적다는 기록 뜻의 꼴만 후보다. 적은 비용·적게·적어도는 아니다', () => {
  const hit = run('설정값을 문서에 적는다. 결과를 따로 적어 둔다. 로그에 적었다. 표에 적힌 값이다.\n');
  assert.equal((hit.out.match(/D 뜻이 둘인 동사 · STE 1\.3 {2}[^\n]*적/g) ?? []).length, 4);
  const keep = run('적은 비용으로 끝난다. 메모리를 적게 사용한다. 적어도 한 번은 확인한다. 트래픽이 적어 문제가 없다. 데이터를 적은 메모리로 읽는다.\n');
  assert.doesNotMatch(keep.out, /뜻이 둘인 동사/);
});

test('찍다는 로그·콘솔 같은 출력 대상 뒤에서만 후보다. 사진·도장을 찍는다는 아니다', () => {
  const hit = run('로그를 찍는다. 콘솔에 찍히는 값을 확인한다. CLI가 실제로 찍는 글자다.\n');
  assert.equal((hit.out.match(/B 주석 말투 · STE 1\.10 {2}[^\n]*찍/g) ?? []).length, 3);
  assert.doesNotMatch(run('사진을 찍는다. 도장을 찍었다. 점을 찍는다.\n').out, /주석 말투/);
});

test('반영하다는 S2다. 한 번만 나오면 요약 줄에만 보이고, --all이면 하나씩 보인다', () => {
  const one = run('변경을 그대로 반영하면 된다.\n');
  assert.doesNotMatch(one.out, /S2 D 모호한 동사 · STE 3\.7 {2}반영/);
  assert.match(one.out, /S2 기준 미만[^\n]*반영하면/);
  assert.match(run('변경을 그대로 반영하면 된다.\n', { args: ['--all'] }).out, /S2 D 모호한 동사 · STE 3\.7 {2}반영하면/);
});

test('동사 형태로 끝난 표 머리는 9.4 후보다. 문서·화면·개요처럼 같은 글자로 끝나는 명사는 아니다', () => {
  const md = '| 나오면 | 고쳐서 |\n|---|---|\n| a | b |\n\n| 문서 | 화면 | 개요 | 바꾼 말 |\n|---|---|---|---|\n| a | b | c | d |\n';
  const r = run(md);
  assert.equal((r.out.match(/S1 E 표 머리 · STE 9\.4 {2}(?:나오면|고쳐서)/g) ?? []).length, 2);
  assert.match(r.out, /\n\s+1 {2}S1 E 표 머리/);
  assert.doesNotMatch(r.out, /표 머리 · STE 9\.4 {2}(?:문서|화면|개요|바꾼 말)/);
  assert.match(run('<table><tr><th>그대로 둔다</th><th>설명</th></tr></table>\n', { ext: 'html' }).out, /S1 E 표 머리 · STE 9\.4 {2}<th>그대로 둔다<\/th>/);
});

test('맨 앞·맨 뒤 `|`가 없는 표와 구분선 칸이 짧은 표(`:-`)의 머리도 검사한다. 제목 밑줄 위의 글과, 구분선과 칸 수가 다른 줄은 표 머리가 아니다', () => {
  const r = run('나오면 | 고쳐서\n--- | ---\na | b\n\n| 그대로 둔다 | 설명 |\n|:-|-:|\n');
  assert.equal((r.out.match(/S1 E 표 머리 · STE 9\.4 {2}(?:나오면|고쳐서|그대로 둔다)/g) ?? []).length, 3);
  assert.doesNotMatch(run('설치한다\n---\n\n| 그대로 둔다 |\n---\n\n나오면 | 고쳐서\n---|---|---\n').out, /표 머리/);
});

test('`|` 바로 앞에 역슬래시가 있으면 칸을 나누지 않는다. GitHub 렌더러처럼 역슬래시가 둘(`\\\\|`)이어도 나누지 않는다', () => {
  assert.match(run('| 그대로 둔다 \\| 바꾼다 |\n|---|\n').out, /S1 E 표 머리 · STE 9\.4 {2}그대로 둔다 \\\| 바꾼다/);
  assert.match(run('| 나오면 \\\\| 고쳐서 |\n|---|\n').out, /S1 E 표 머리 · STE 9\.4 {2}나오면 \\\\\| 고쳐서/);
  // GitHub는 이 두 줄을 머리 칸 하나와 구분선 칸 둘로 읽는다. 칸 수가 달라서 두 줄은 문단이 된다
  assert.doesNotMatch(run('나오면 \\\\| 고쳐서\n---|---\n').out, /표 머리/);
});

test('펜스 코드 블록은 CommonMark 규칙으로 가린다 — 물결표, 긴 닫는 펜스, 블록 안의 짧은 백틱 줄, 안 닫힌 펜스', () => {
  // 후보 줄만 본다 — 앞뒤 글 줄은 원문에서 가져오므로 가린 글자도 보인다
  // 직역투 후보는 S2가 많아서 --all로 하나씩 보이게 한다
  const hit = (w) => new RegExp(`C 직역[^\\n]*? {2}${w}`);
  const all = { args: ['--all'] };
  const tilde = run('글이다.\n\n~~~\n결과가 캐시에 남는다\n~~~\n\n관리자에 의해 막힌다.\n', all);
  assert.doesNotMatch(tilde.out, hit('남는다'));
  assert.match(tilde.out, hit('에 의해'));
  // 여는 펜스보다 긴 닫는 펜스. 블록 안의 `` 줄과 `x` 줄은 닫지 않는다
  const longer = run('```js\n``\n`x`\n그룹 정책에 의해\n````\n행이 카드를 받는다.\n', all);
  assert.doesNotMatch(longer.out, hit('에 의해'));
  assert.match(longer.out, hit('받는다'));
  // 글자가 섞인 줄(```~~)은 닫는 펜스가 아니다. 안 닫힌 펜스는 문서 끝까지 가린다
  const unclosed = run('```\n결과가 캐시에 남는다\n```~~\n관리자에 의해 막힌다.\n', all);
  assert.doesNotMatch(unclosed.out, /C 직역/);
  assert.equal(unclosed.code, 0);
  // 들여쓰기 4칸은 펜스가 아니다
  assert.match(run('    ```\n관리자에 의해 막힌다.\n', all).out, hit('에 의해'));
});

test('물결표 펜스의 정보 문자열에는 백틱이 와도 펜스다', () => {
  // 펜스로 못 읽으면 4행이 본문이 되고, 5행의 닫는 펜스가 새 펜스를 열어 7행을 가린다
  const doc = '이 문서는 설정을 설명합니다. 설정 파일을 엽니다.\n\n~~~ js `x`\n그룹 정책에 의해 값을 바꾼다.\n~~~\n\n관리자에 의해 막힙니다.\n';
  const r = run(doc, { args: ['--all'] });
  assert.doesNotMatch(r.out, /\n\s+4 {2}S/);
  assert.match(r.out, /\n\s+7 {2}S2 C 직역투 문형 · K6 {2}에 의해/);
});

test('두다의 기본형과 연결형(두다·두어야·두어서)도 후보다 — 수사 두·두어와 앞두다·그만두다는 아니다', () => {
  const hit = run('예외를 두다. 검사를 두어야 한다. 상한을 두어서 막는다. 사용자가 둔 값이다.\n');
  assert.equal((hit.out.match(/D 뜻이 둘인 동사 · STE 1\.3 {2}[두둔]/g) ?? []).length, 4);
  const keep = run('두 개를 두어 번 본다. 두어 명이 배포를 앞두고 검사를 그만둔다. 결과를 거둔다.\n');
  assert.doesNotMatch(keep.out, /뜻이 둘인 동사/);
});

test('높임 등급 검사는 <script> 안의 글을 세지 않는다', () => {
  const prose = '<p>서버가 응답을 돌려주었습니다. 클라이언트가 요청을 보냈습니다. 서버가 로그를 적었습니다. 사용자가 화면을 보았습니다.</p>\n';
  const script = '<script>' + 'x("했습니다.");'.repeat(5) + 'y("한다.");'.repeat(5) + '</script>\n';
  assert.doesNotMatch(run(prose + script, { ext: 'html' }).out, /높임 등급/);
});

test('HTML 본문도 높임 등급을 본다 — 제목·표 칸·버튼은 세지 않고, 인용 요소 안의 글은 후보가 아니다', () => {
  const html = [
    '<h2>설정을 바꾼다</h2>',
    '<p>이 문서는 설정을 설명합니다. 설정 파일을 엽니다.</p>',
    '<table><tr><td>값을 읽는다</td></tr></table><button>저장한다</button>',
    '<p>서버를 다시',
    '켠다.</p>',
    '<blockquote>이건 남의 말이야.</blockquote>',
  ].join('\n') + '\n';
  const r = run(html, { ext: 'html', args: ['--no-morph'] });
  // 합쇼체 본문 속 해라체 문장 하나만 후보다. 문장이 시작한 줄(4행)을 보인다
  assert.equal((r.out.match(/F 높임 등급 · K9/g) ?? []).length, 1);
  assert.match(r.out, /\n\s+4 {2}S1 F 높임 등급 · K9 {2}켠다/);
  assert.doesNotMatch(r.out, /이건/);
});

test('HTML의 <strong> 문장과 줄표 개체도 K12 후보다 — 표 칸을 혼자 채운 줄표는 아니다', () => {
  const html = '<p><strong>이 문장은 처음부터 끝까지 굵게 표시합니다.</strong> 캐시는 빠릅니다 &mdash; 대신 값이 오래됩니다.</p>\n<table><tr><td>—</td><td> &mdash; </td></tr></table>\n';
  const r = run(html, { ext: 'html', args: ['--all', '--no-morph'] });
  assert.match(r.out, /S1 I 형식 · K12 {2}<strong>/);
  assert.equal((r.out.match(/S2 I 형식 · K12/g) ?? []).length, 1);
});
