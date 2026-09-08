#!/usr/bin/env python3
"""
서류하나 PaddleOCR 서버 — 포트 3101
Oracle Cloud에서 실행: python3 paddle_server.py

설치:
  pip install paddleocr paddlepaddle flask

시작:
  nohup python3 paddle_server.py > /tmp/paddle.log 2>&1 &
"""

from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
import base64, tempfile, os, traceback

app = Flask(__name__)

# 한국어 모델 — 첫 실행 시 약 200MB 자동 다운로드
_ocr = None
def get_ocr():
    global _ocr
    if _ocr is None:
        _ocr = PaddleOCR(use_angle_cls=True, lang='korean', show_log=False)
    return _ocr


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'ok': True})


@app.route('/ocr', methods=['POST'])
def run_ocr():
    """
    요청: multipart/form-data (file 필드)
         또는 JSON { "base64": "<b64>", "ext": "jpg"|"png"|"pdf" }

    응답: {
      "text": "전체 텍스트",
      "blocks": [{ "text": "...", "confidence": 0.98, "box": [[x,y],...] }],
      "confidence": 0.96,
      "block_count": 42
    }
    """
    try:
        if request.is_json:
            data = request.json or {}
            b64  = data.get('base64', '')
            ext  = data.get('ext', 'jpg').lstrip('.')
            if not b64:
                return jsonify({'error': 'base64 필드 없음'}), 400
            file_bytes = base64.b64decode(b64)
        else:
            f = request.files.get('file')
            if not f:
                return jsonify({'error': '파일 없음'}), 400
            file_bytes = f.read()
            orig = f.filename or 'file.jpg'
            ext  = orig.rsplit('.', 1)[-1].lower() if '.' in orig else 'jpg'

        with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            result = get_ocr().ocr(tmp_path, cls=True)
            blocks    = []
            all_lines = []

            for page in (result or []):
                if not page:
                    continue
                for item in page:
                    box, (text, conf) = item
                    blocks.append({
                        'text':       text,
                        'confidence': round(float(conf), 4),
                        'box':        box
                    })
                    all_lines.append(text)

            avg_conf = (
                sum(b['confidence'] for b in blocks) / len(blocks)
                if blocks else 0.0
            )

            return jsonify({
                'text':        '\n'.join(all_lines),
                'blocks':      blocks,
                'confidence':  round(avg_conf, 3),
                'block_count': len(blocks)
            })
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('[PaddleOCR] 서버 시작 → http://0.0.0.0:3101')
    app.run(host='0.0.0.0', port=3101, debug=False, threaded=True)
