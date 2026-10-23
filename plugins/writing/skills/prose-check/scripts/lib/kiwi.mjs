/**
 * 형태소 분석기 Kiwi를 부르는 곳. check.mjs가 사용하고, 원본 저장소의 관리 도구(scripts/prose-check)도 가져다 사용한다.
 *
 * Kiwi는 파이썬 판(kiwipiepy)을 사용한다. 큰 모델(cong-global)이 WASM 판(kiwi-nlp)에서는
 * 일부 문장에서 "memory access out of bounds"로 멈추고, 파이썬 판에서는 멈추지 않았다.
 * 가상 환경은 데이터 폴더에 한 번 만들고, 판을 고정해서 설치한다.
 *
 * 데이터 폴더 차례: PROSE_CHECK_HOME → CLAUDE_PLUGIN_DATA/prose-check → XDG_CACHE_HOME/prose-check → ~/.cache/prose-check
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** 설치할 kiwipiepy 판. 모델 패키지(kiwipiepy_model)도 같은 판으로 따라온다 */
export const KIWI_VERSION = '0.24.0';
/** 기본 모델. 설치한 판에 없으면 도우미가 cong으로 내려간다 */
export const KIWI_MODEL = process.env.PROSE_CHECK_KIWI_MODEL || 'cong-global';

const HELPER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'kiwi_tokens.py');

export function dataDir() {
  if (process.env.PROSE_CHECK_HOME) return process.env.PROSE_CHECK_HOME;
  if (process.env.CLAUDE_PLUGIN_DATA) return path.join(process.env.CLAUDE_PLUGIN_DATA, 'prose-check');
  const cache = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(cache, 'prose-check');
}

const venvDir = () => path.join(dataDir(), 'venv');
/** 사용자가 설치하지 않기로 했다는 표시 파일. 있으면 다시 묻지 않는다 */
const skipMarker = () => path.join(dataDir(), 'skip-setup');

/** 사용자가 설치하지 않기로 했는가 */
export const setupSkipped = () => fs.existsSync(skipMarker());

/** 설치하지 않기로 한 것을 기록한다. 다음 실행부터 설치를 권하지 않는다 */
export function skipSetup() {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(skipMarker(), `${new Date().toISOString()}\n`);
  return skipMarker();
}

/** 가상 환경의 파이썬. 없으면 null */
export function venvPython() {
  for (const p of [path.join(venvDir(), 'bin', 'python'), path.join(venvDir(), 'Scripts', 'python.exe')])
    if (fs.existsSync(p)) return p;
  return null;
}

/**
 * 글 여러 개를 한 번에 분석한다. 분석기가 없으면 null을 돌려준다.
 * 실패하면 예외를 던진다. 부르는 쪽이 정규식만으로 계속할지 정한다.
 * @param {string[]} texts
 * @returns {{model: string, version: string, tokens: [string, string, number, number][][]} | null}
 */
/** 도우미를 기다리는 최대 시간(ms). 넘으면 실패로 보고, 부르는 쪽이 정규식만으로 계속한다. 제한이 없으면 멈춘 도우미가 검사 전체를 멈춘다 */
const TIMEOUT_MS = Number(process.env.PROSE_CHECK_KIWI_TIMEOUT_MS) || 300_000;

export function tokenize(texts, model = KIWI_MODEL) {
  const py = venvPython();
  if (!py) return null;
  const r = spawnSync(py, [HELPER], {
    input: JSON.stringify({ texts, model }),
    encoding: 'utf8',
    maxBuffer: 1 << 30,
    timeout: TIMEOUT_MS,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  if (r.error?.code === 'ETIMEDOUT') throw new Error(`Kiwi 도우미가 ${TIMEOUT_MS / 1000}초 안에 끝나지 않았다`);
  if (r.status !== 0) throw new Error(`Kiwi 도우미 실패: ${(r.stderr || r.error?.message || '').trim().split('\n').pop()}`);
  return JSON.parse(r.stdout);
}

/** 명령이 있는지 본다 */
const has = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;

/**
 * 가상 환경을 만들고 kiwipiepy를 설치한다. uv가 있으면 uv를 사용하고, 없으면 python3 -m venv와 pip를 사용한다.
 * 설치 뒤 시험 문장 하나를 분석해서 확인한다. 성공하면 true다.
 */
export function setup({ log = console.log } = {}) {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const run = (cmd, args) => {
    log(`$ ${cmd} ${args.join(' ')}`);
    const r = spawnSync(cmd, args, { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`${cmd} 실패 (종료 코드 ${r.status})`);
  };
  const pkg = `kiwipiepy==${KIWI_VERSION}`;
  if (!venvPython()) {
    if (has('uv')) run('uv', ['venv', '--quiet', venvDir()]);
    else if (has('python3')) run('python3', ['-m', 'venv', venvDir()]);
    else throw new Error('python3도 uv도 없다. 둘 중 하나를 설치한 뒤 다시 돌린다');
  }
  const py = venvPython();
  if (has('uv')) run('uv', ['pip', 'install', '--quiet', '--python', py, pkg]);
  else run(py, ['-m', 'pip', 'install', '--quiet', pkg]);
  const probe = tokenize(['자세한 건 아래에 적었습니다.']);
  const ok = probe?.tokens?.[0]?.some(([form, tag]) => form === '거' && tag === 'NNB');
  if (ok) fs.rmSync(skipMarker(), { force: true });
  log(ok
    ? `설치 끝: kiwipiepy ${probe.version}, 모델 ${probe.model}, 위치 ${venvDir()}`
    : `설치는 끝났지만 시험 분석 결과가 예상과 다르다: ${JSON.stringify(probe?.tokens?.[0])}`);
  return Boolean(ok);
}
