/**
 * AI 나레이션 생성기
 * 실행: node scripts/audio/generate-narration.js --product filo
 *
 * 지원 TTS (우선순위 순):
 *   Google TTS (권장): GOOGLE_TTS_API_KEY 환경변수 — 무료 월 100만자
 *   CLOVA:             NAVER_TTS_CLIENT_ID + NAVER_TTS_CLIENT_SECRET
 *   ElevenLabs:        ELEVENLABS_API_KEY
 *
 * 출력: output/<product>-narration.mp3 (전체 나레이션)
 *       output/<product>-narration-<n>.mp3 (구간별)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const args = process.argv.slice(2);
const productArg = args.indexOf('--product');
const PRODUCT = productArg !== -1 ? args[productArg + 1] : 'filo';

const scriptFile = path.join(ROOT, `scripts/content/${PRODUCT}-narration.json`);
if (!fs.existsSync(scriptFile)) {
  console.error(`[TTS] 나레이션 스크립트 없음: ${scriptFile}`);
  process.exit(1);
}

const script = require(scriptFile);
const OUTPUT_DIR = path.join(ROOT, 'output');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Google Cloud TTS ──────────────────────────────────────────────
async function googleTTS(text, outFile) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY 환경변수 필요');

  const bodyStr = JSON.stringify({
    input: { text },
    voice: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-A', ssmlGender: 'FEMALE' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95, pitch: 0 },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'texttospeech.googleapis.com',
        path: `/v1/text:synthesize?key=${apiKey}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
      },
      (res) => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Google TTS 오류 ${res.statusCode}: ${data}`));
          }
          try {
            const { audioContent } = JSON.parse(data);
            fs.writeFileSync(outFile, Buffer.from(audioContent, 'base64'));
            resolve();
          } catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── CLOVA Voice TTS ───────────────────────────────────────────────
async function clovaVoice(text, voice, speed, outFile) {
  const clientId = process.env.NAVER_TTS_CLIENT_ID;
  const clientSecret = process.env.NAVER_TTS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('NAVER_TTS_CLIENT_ID / NAVER_TTS_CLIENT_SECRET 환경변수 필요');
  }

  const body = new URLSearchParams({
    speaker: voice || 'nara',
    text,
    speed: String(speed ?? 0),
    volume: '0',
    pitch: '0',
    format: 'mp3',
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'naveropenapi.apigw.ntruss.com',
        path: '/tts-premium/v1/tts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-NCP-APIGW-API-KEY-ID': clientId,
          'X-NCP-APIGW-API-KEY': clientSecret,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let err = '';
          res.on('data', d => (err += d));
          res.on('end', () => reject(new Error(`CLOVA API 오류 ${res.statusCode}: ${err}`)));
          return;
        }
        const out = fs.createWriteStream(outFile);
        res.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── ElevenLabs TTS ───────────────────────────────────────────────
async function elevenLabs(text, voiceId, outFile) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY 환경변수 필요');

  // 기본 한국어 음성 ID (Rachel = 다국어, Korean 지원)
  const vid = voiceId || '21m00Tcm4TlvDq8ikWAM';
  const bodyStr = JSON.stringify({
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${vid}`,
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let err = '';
          res.on('data', d => (err += d));
          res.on('end', () => reject(new Error(`ElevenLabs 오류 ${res.statusCode}: ${err}`)));
          return;
        }
        const out = fs.createWriteStream(outFile);
        res.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── FFmpeg concat with silence gaps ──────────────────────────────
async function buildFinalAudio(lines, segments, outFile) {
  const { execSync } = require('child_process');
  const ffmpeg = (() => {
    try { return require('ffmpeg-static'); } catch { return 'ffmpeg'; }
  })();

  // 각 구간 mp3 → 시작시간 기준 silence gap 삽입 후 concat
  const inputArgs = [];
  const filterParts = [];

  // 순서: [silence_0] [seg_0] [silence_1] [seg_1] ...
  // silence 길이 = startSec[n] - (startSec[n-1] + duration[n-1])
  // duration은 실측 어렵기 때문에 단순히 순서대로 concat하고 각 라인 앞에 패딩 silence 삽입

  const tmpDir = path.join(OUTPUT_DIR, `nar-tmp-${PRODUCT}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // 각 세그먼트 앞 silence 생성 (startSec 기준)
  // 전략: 0초에 시작, 각 라인 앞에 (startSec - 이전 종료점) 만큼 silence 생성
  const concatList = [];
  let cursor = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const gap = Math.max(0, line.startSec - cursor);

    if (gap > 0.1) {
      // silence 생성
      const silFile = path.join(tmpDir, `silence_${i}.mp3`);
      execSync(
        `${ffmpeg} -y -f lavfi -i anullsrc=r=24000:cl=mono -t ${gap.toFixed(3)} -q:a 9 -acodec libmp3lame "${silFile}"`,
        { stdio: 'pipe' }
      );
      concatList.push(silFile);
    }

    concatList.push(segments[i]);
    // duration 추측: 한국어 약 5~6글자/초
    const charPerSec = 5.5;
    const estDuration = line.text.length / charPerSec;
    cursor = line.startSec + estDuration;
  }

  // concat 목록 파일 작성
  const listFile = path.join(tmpDir, 'concat.txt');
  fs.writeFileSync(listFile, concatList.map(f => `file '${f}'`).join('\n'));

  execSync(
    `${ffmpeg} -y -f concat -safe 0 -i "${listFile}" -c copy "${outFile}"`,
    { stdio: 'pipe' }
  );

  // 임시 파일 정리
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`[TTS] 완성: ${outFile}`);
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  const lines = script.lines;
  const voice = script.voice || 'nara';
  const speed = script.speedRate ?? 0;
  const useGoogle = !!process.env.GOOGLE_TTS_API_KEY;
  const useClova = !!(process.env.NAVER_TTS_CLIENT_ID && process.env.NAVER_TTS_CLIENT_SECRET);
  const useElevenLabs = !!process.env.ELEVENLABS_API_KEY;

  if (!useGoogle && !useClova && !useElevenLabs) {
    console.error('[TTS] API 키 없음. 다음 중 하나 설정:');
    console.error('  GOOGLE_TTS_API_KEY       (Google Cloud TTS, 권장 — 무료 월 100만자)');
    console.error('  NAVER_TTS_CLIENT_ID + NAVER_TTS_CLIENT_SECRET');
    console.error('  ELEVENLABS_API_KEY');
    process.exit(1);
  }

  const engine = useGoogle ? 'Google TTS' : useClova ? 'CLOVA' : 'ElevenLabs';
  console.log(`[TTS] ${PRODUCT} 나레이션 생성 중... (${engine})`);

  const segments = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const segFile = path.join(OUTPUT_DIR, `${PRODUCT}-nar-${i}.mp3`);
    console.log(`  [${i + 1}/${lines.length}] "${line.text.slice(0, 30)}..."`);

    if (useGoogle) {
      await googleTTS(line.text, segFile);
    } else if (useClova) {
      await clovaVoice(line.text, voice, speed, segFile);
    } else {
      await elevenLabs(line.text, null, segFile);
    }
    segments.push(segFile);

    // API 요청 간 딜레이
    await new Promise(r => setTimeout(r, 300));
  }

  const finalFile = path.join(OUTPUT_DIR, `${PRODUCT}-narration.mp3`);
  await buildFinalAudio(lines, segments, finalFile);

  // 구간별 mp3 삭제
  segments.forEach(f => { try { fs.unlinkSync(f); } catch {} });
}

main().catch(err => { console.error('[TTS] 오류:', err.message); process.exit(1); });
