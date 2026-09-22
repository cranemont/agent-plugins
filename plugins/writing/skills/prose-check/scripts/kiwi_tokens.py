#!/usr/bin/env python3
"""prose-check 형태소 분석 도우미. check.mjs와 excess.mjs가 하위 프로세스로 부른다.

표준 입력으로 JSON {"texts": [...], "model": "cong-global"}을 받는다.
표준 출력으로 JSON {"model": ..., "version": ..., "tokens": [[[형태, 품사, 시작, 길이], ...], ...]}을 쓴다.
시작과 길이는 입력 글 안의 글자 위치다. 축약형(`게` → 것/NNB + 이/JKS)은 두 형태소가 같은 위치를 가리킨다.

`--version`을 주면 kiwipiepy 판만 찍는다. 설치는 `node check.mjs --setup`이 한다.
"""
import json
import sys


def main():
    import kiwipiepy
    if '--version' in sys.argv:
        print(kiwipiepy.__version__)
        return
    req = json.load(sys.stdin)
    texts = req.get('texts', [])
    model = req.get('model') or 'cong-global'
    try:
        kiwi = kiwipiepy.Kiwi(model_type=model)
    except Exception:
        # 큰 모델을 못 읽으면 기본 모델로 내려간다
        model = 'cong'
        kiwi = kiwipiepy.Kiwi(model_type=model)
    tokens = [[[t.form, t.tag, t.start, t.len] for t in toks] for toks in kiwi.tokenize(texts)] if texts else []
    json.dump({'model': model, 'version': kiwipiepy.__version__, 'tokens': tokens}, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
