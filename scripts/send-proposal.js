'use strict';

/**
 * Sunany 파트너십 제안서 이메일 발송
 *
 * 사용법:
 *   node scripts/send-proposal.js
 *
 * 필요 환경변수 (~/.env 또는 .env.local):
 *   GMAIL_USER=kimdh4790@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  (Google 앱 비밀번호)
 *
 * Gmail 앱 비밀번호 발급:
 *   1. myaccount.google.com → 보안 → 2단계 인증 켜기
 *   2. 보안 → 앱 비밀번호 → 앱 선택: 메일, 기기: Windows → 생성
 *   3. 16자리 코드를 GMAIL_APP_PASSWORD에 입력
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// env 로드
(function loadEnv() {
  const envPaths = [
    path.join(process.env.HOME || '', '.env'),
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env'),
  ];
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
    });
    return;
  }
})();

const GMAIL_USER = process.env.GMAIL_USER || 'kimdh4790@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!GMAIL_APP_PASSWORD) {
  console.error('오류: GMAIL_APP_PASSWORD 환경변수가 없습니다.');
  console.error('');
  console.error('설정 방법:');
  console.error('  1. myaccount.google.com → 보안 → 앱 비밀번호');
  console.error('  2. 생성된 16자리 코드를 ~/.env에 저장:');
  console.error('     GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx');
  process.exit(1);
}

const TO = 'vicky@sunany.com';
const SUBJECT = 'Partnership Proposal — FILO Software × Sunany Hardware (Korea Market)';

const BODY = `Hi Vicky,

We are MBTI Co., Ltd., the company behind FILO and DINE — a restaurant management SaaS platform currently operating in Korea.

We would like to propose a hardware-software bundle partnership for the Korean market.

---

WHAT FILO + DINE DOES

FILO is a full-stack restaurant operating system:
- POS & table ordering (QR order, kiosk, kitchen display)
- Staff attendance via QR clock-in/out
- Automatic payroll calculation + payslip push notification
- Inventory tracking with low-stock alerts
- AI-powered 7-day sales forecast
- Menu auto-translation (EN / CN / JP) for foreign customers
- Reservation & waiting list management

DINE is the companion app for employees:
- Staff view their own schedule, salary, and attendance on their phone
- Real-time sync with FILO — no double entry, no manual updates
- Replaces paper timesheets and printed payslips entirely

No competitor in Korea bundles staff payroll + POS + employee app in a single platform.

---

THE MARKET OPPORTUNITY

Korea has 780,000+ food service establishments, most of them 1~5 person operations. Every single one needs:
1. A counter POS terminal — your hardware
2. Software to run daily operations — our software

Additionally, the unmanned store and self-ordering kiosk trend is accelerating rapidly in Korea. Rising labor costs are pushing even small restaurants to adopt kiosk ordering at the entrance. A single customer could purchase both a counter POS and an entrance kiosk — doubling hardware sales per location.

---

OUR PROPOSAL

We handle everything on the Korea side:
- All sales and marketing
- Installation and customer onboarding
- Customer support and after-sales service

In return, we request:
- KC certification cost covered by Sunany (legally required for all electronics sold in Korea)
- Exclusive Korea partnership rights for FILO as your official software partner
- Competitive hardware pricing that reflects our full operational responsibility for the Korean market

You have already exported to Korea before. You know the demand is real. This time, you have a committed software partner with an existing product — meaning Sunany gains Korean market presence without spending on local market development.

---

HARDWARE WE NEED — TWO PRODUCTS

1. Counter POS Terminal
We are already familiar with the A100-156. This fits our needs for the counter unit.

2. Self-Ordering Kiosk
We are looking for a kiosk unit with the following specs:

  Screen    : 21" or larger
  OS        : Android 10+
  Touch     : Multi-touch
  Payment   : Card reader (integrated or attachable)
  Receipt   : Printer port or built-in thermal printer
  Mount     : Floor-standing or wall bracket

FILO's kiosk software is already built and ready. No software work required from your side — hardware only.

Please share your available kiosk models and pricing so we can evaluate compatibility.

---

BUNDLE MODEL

  FILO POS    | Counter terminal      | Sunany counter unit
  FILO Kiosk  | Entrance self-order   | Sunany kiosk unit
  DINE App    | Employee mobile app   | Staff smartphones

---

We believe this is a strong win for both sides. Sunany gains a dedicated Korean distribution partner. FILO gains certified hardware without import overhead.

Please reply by email at your convenience. We are happy to provide additional documentation if needed.

Best regards,
Kim Hyungwoo
CEO, MBTI Co., Ltd.
kimdh4790@gmail.com
filo.ai.kr`;

async function main() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  console.log(`발송 중...`);
  console.log(`  From: ${GMAIL_USER}`);
  console.log(`  To:   ${TO}`);
  console.log(`  제목: ${SUBJECT}`);

  const info = await transporter.sendMail({
    from: `"Kim Hyungwoo (MBTI Co., Ltd.)" <${GMAIL_USER}>`,
    to: TO,
    subject: SUBJECT,
    text: BODY,
  });

  console.log(`\n발송 완료!`);
  console.log(`  Message ID: ${info.messageId}`);
}

main().catch(err => {
  console.error('발송 실패:', err.message);
  process.exit(1);
});
