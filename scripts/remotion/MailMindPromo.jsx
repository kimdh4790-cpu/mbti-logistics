const { Composition, AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Sequence, Audio } = window.Remotion || require('remotion');

// MailMind 60초 홍보 영상 (1080×1920, 30fps, 1800프레임)
// Scene 1:  0-10s  (  0-300f) 외국어 이메일 도착 → 당황
// Scene 2: 10-20s  (300-600f) MailMind 클릭 → 내 언어로 요약
// Scene 3: 20-35s  (600-1050f) 톤 선택 → 완벽한 답장 자동 생성
// Scene 4: 35-45s (1050-1350f) 언어 전환 버튼 → UI 언어 전환
// Scene 5: 45-55s (1350-1650f) Smart Reply Guard / 약속 추출
// Scene 6: 55-60s (1650-1800f) 로고 + 플랜 가격 + URL

const BRAND = {
  blue: '#1A6BFF',
  blueDark: '#0A4FD4',
  blueLight: '#4D8FFF',
  cyan: '#00E5FF',
  white: '#FFFFFF',
  gray: '#F0F4FF',
  textDark: '#0A1628',
  textMid: '#3A5070',
  pink: '#FF4D8C',
  green: '#00D68F',
  gold: '#FFB800',
};

const QR_CODE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAALcCAIAAABby/A+AAAVSUlEQVR4nO3dQY7j2rVFwZcfOQZ3Pcg/Dg/SXU+Cbj8DLl+jjk+uS0W0CxJFkaoFNnJ/Pcx/Dbj8DLl+jjk+uS0W0CxJFkaoFNnJ/PU8z38AAAAASUVORK5CYII=';

// ─────────────────────────────────────────────────────────────────────
// 14개 언어 UI 레이블 — 모든 씬 텍스트
// ─────────────────────────────────────────────────────────────────────
const UI_LABELS = {
  KR: {
    // Scene 1
    s1Badge: '외국어 이메일 도착',
    s1Confused: '이게 무슨 내용이지...?',
    // Scene 2
    s2Analyzing: '⚡ 분석 중...',
    s2SummaryTitle: '📋 AI 요약 (한국어)',
    s2Detected: '🌏 감지된 언어: 아랍어(SA) → 한국어로 번역됨',
    s2Click: '클릭!',
    // Scene 3
    s3ToneTitle: '답장 톤 선택',
    s3ToneDescs: ['간결하고 단도직입', '친근하고 배려있는', '상세하고 전문적인'],
    s3Selected: '✓ 선택됨',
    s3AIReply: '✨ AI가 생성한 답장',
    s3InsertBtn: 'Gmail에 삽입',
    // Scene 4
    s4Header: '🌐 언어 전환 — 버튼 하나로',
    s4UILabels: ['답장 비교', '스마트 답장·Pro', '스레드 요약', '감지된 할 일'],
    // Scene 5
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& 약속·할일 자동 추출',
    s5Tasks: [
      { icon: '📅', text: '2026-10-15 오전 10시 화상회의', type: '약속' },
      { icon: '📋', text: '계약서 초안 검토 후 회신', type: '할 일' },
      { icon: '⚠️', text: '"즉시 처리 바람" — 긴급 감지', type: 'Guard' },
    ],
    s5Detected: '감지',
    s5Footer: '이메일 속 중요한 것을 놓치지 않습니다',
    // Scene 6
    s6Tagline: 'AI Gmail 이메일 답장 Chrome 확장',
    s6Scan: '스캔하여 바로 설치',
  },
  JP: {
    s1Badge: '外国語メール着信',
    s1Confused: 'これは何の内容...？',
    s2Analyzing: '⚡ 解析中...',
    s2SummaryTitle: '📋 AI 要約（日本語）',
    s2Detected: '🌏 言語検出: アラビア語 → 日本語に翻訳',
    s2Click: 'クリック!',
    s3ToneTitle: '返信トーン選択',
    s3ToneDescs: ['簡潔で直接的', '親しみやすい', '詳細で専門的'],
    s3Selected: '✓ 選択済み',
    s3AIReply: '✨ AI生成の返信',
    s3InsertBtn: 'Gmailに挿入',
    s4Header: '🌐 言語切替 — ワンクリック',
    s4UILabels: ['返信を比較', 'スマート返信·Pro', 'スレッド要約', '検出タスク'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& 予定・タスク自動抽出',
    s5Tasks: [
      { icon: '📅', text: '2026-10-15 午前10時 ビデオ会議', type: '予定' },
      { icon: '📋', text: '契約書草案を確認して返信', type: 'タスク' },
      { icon: '⚠️', text: '"至急対応" — 緊急検出', type: 'Guard' },
    ],
    s5Detected: '検出',
    s5Footer: 'メールの重要事項を見逃しません',
    s6Tagline: 'AI Gmailメール返信 Chrome拡張',
    s6Scan: 'スキャンしてインストール',
  },
  EN: {
    s1Badge: 'Foreign Email Arrived',
    s1Confused: "What does this even mean...?",
    s2Analyzing: '⚡ Analyzing...',
    s2SummaryTitle: '📋 AI Summary (English)',
    s2Detected: '🌏 Detected: Arabic (SA) → Translated to English',
    s2Click: 'Click!',
    s3ToneTitle: 'Choose Reply Tone',
    s3ToneDescs: ['Concise & Direct', 'Warm & Friendly', 'Detailed & Professional'],
    s3Selected: '✓ Selected',
    s3AIReply: '✨ AI-Generated Reply',
    s3InsertBtn: 'Insert into Gmail',
    s4Header: '🌐 Language Switch — One Button',
    s4UILabels: ['Compare Replies', 'Smart Reply·Pro', 'Thread Summary', 'Detected Tasks'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Auto Task Extraction',
    s5Tasks: [
      { icon: '📅', text: 'Oct 15 10AM Video Conference', type: 'Appointment' },
      { icon: '📋', text: 'Review contract draft & reply', type: 'To-Do' },
      { icon: '⚠️', text: '"Urgent action required" — Alert', type: 'Guard' },
    ],
    s5Detected: 'Detected',
    s5Footer: "Never miss what's important in your emails",
    s6Tagline: 'AI Gmail Reply Chrome Extension',
    s6Scan: 'Scan to Install',
  },
  PT: {
    s1Badge: 'E-mail Estrangeiro Recebido',
    s1Confused: 'O que isso significa...?',
    s2Analyzing: '⚡ Analisando...',
    s2SummaryTitle: '📋 Resumo IA (Português)',
    s2Detected: '🌏 Detectado: Árabe → Traduzido para Português',
    s2Click: 'Clique!',
    s3ToneTitle: 'Escolha o Tom',
    s3ToneDescs: ['Conciso e Direto', 'Caloroso e Amigável', 'Detalhado e Profissional'],
    s3Selected: '✓ Selecionado',
    s3AIReply: '✨ Resposta Gerada por IA',
    s3InsertBtn: 'Inserir no Gmail',
    s4Header: '🌐 Trocar Idioma — Um Botão',
    s4UILabels: ['Comparar Respostas', 'Resposta Smart·Pro', 'Resumo da Thread', 'Tarefas Detectadas'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Extração Automática de Tarefas',
    s5Tasks: [
      { icon: '📅', text: '15/10 10h Videoconferência', type: 'Compromisso' },
      { icon: '📋', text: 'Revisar rascunho e responder', type: 'Tarefa' },
      { icon: '⚠️', text: '"Ação urgente" — Alerta', type: 'Guard' },
    ],
    s5Detected: 'Detectado',
    s5Footer: 'Nunca perca o que é importante nos seus e-mails',
    s6Tagline: 'Extensão Chrome de Resposta Gmail IA',
    s6Scan: 'Escaneie para Instalar',
  },
  HI: {
    s1Badge: 'विदेशी ईमेल आया',
    s1Confused: 'यह क्या है...?',
    s2Analyzing: '⚡ विश्लेषण हो रहा है...',
    s2SummaryTitle: '📋 AI सारांश (हिन्दी)',
    s2Detected: '🌏 भाषा: अरबी → हिन्दी में अनुवाद',
    s2Click: 'क्लिक!',
    s3ToneTitle: 'उत्तर का स्वर चुनें',
    s3ToneDescs: ['संक्षिप्त और सीधा', 'मित्रवत और गर्मजोशी', 'विस्तृत और पेशेवर'],
    s3Selected: '✓ चुना गया',
    s3AIReply: '✨ AI द्वारा उत्पन्न उत्तर',
    s3InsertBtn: 'Gmail में डालें',
    s4Header: '🌐 भाषा बदलें — एक बटन',
    s4UILabels: ['उत्तर तुलना', 'स्मार्ट उत्तर·Pro', 'थ्रेड सारांश', 'कार्य पहचाने गए'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& स्वचालित कार्य निष्कर्षण',
    s5Tasks: [
      { icon: '📅', text: '15 अक्टू 10 बजे वीडियो कॉन्फ्रेंस', type: 'अपॉइंटमेंट' },
      { icon: '📋', text: 'अनुबंध मसौदा समीक्षा करें', type: 'कार्य' },
      { icon: '⚠️', text: '"तत्काल कार्रवाई आवश्यक"', type: 'Guard' },
    ],
    s5Detected: 'पहचाना',
    s5Footer: 'ईमेल में जरूरी बात न चूकें',
    s6Tagline: 'AI Gmail रिप्लाई Chrome एक्सटेंशन',
    s6Scan: 'स्कैन करके इंस्टॉल करें',
  },
  ID: {
    s1Badge: 'Email Asing Masuk',
    s1Confused: 'Ini maksudnya apa...?',
    s2Analyzing: '⚡ Menganalisis...',
    s2SummaryTitle: '📋 Ringkasan AI (Bahasa Indonesia)',
    s2Detected: '🌏 Terdeteksi: Arab → Diterjemahkan ke Indonesia',
    s2Click: 'Klik!',
    s3ToneTitle: 'Pilih Nada Balasan',
    s3ToneDescs: ['Singkat & Langsung', 'Hangat & Ramah', 'Detail & Profesional'],
    s3Selected: '✓ Dipilih',
    s3AIReply: '✨ Balasan Buatan AI',
    s3InsertBtn: 'Masukkan ke Gmail',
    s4Header: '🌐 Ganti Bahasa — Satu Tombol',
    s4UILabels: ['Bandingkan Balasan', 'Balasan Cerdas·Pro', 'Ringkasan Thread', 'Tugas Terdeteksi'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Ekstraksi Tugas Otomatis',
    s5Tasks: [
      { icon: '📅', text: '15 Okt 10.00 Video Conference', type: 'Janji' },
      { icon: '📋', text: 'Tinjau draf kontrak & balas', type: 'Tugas' },
      { icon: '⚠️', text: '"Segera ditangani" — Peringatan', type: 'Guard' },
    ],
    s5Detected: 'Terdeteksi',
    s5Footer: 'Jangan lewatkan hal penting di email Anda',
    s6Tagline: 'Ekstensi Chrome Balasan Gmail AI',
    s6Scan: 'Pindai untuk Instal',
  },
  TH: {
    s1Badge: 'อีเมลต่างประเทศมาถึง',
    s1Confused: 'นี่คืออะไรนะ...?',
    s2Analyzing: '⚡ กำลังวิเคราะห์...',
    s2SummaryTitle: '📋 สรุปโดย AI (ภาษาไทย)',
    s2Detected: '🌏 ตรวจพบ: อาหรับ → แปลเป็นภาษาไทย',
    s2Click: 'คลิก!',
    s3ToneTitle: 'เลือกโทนตอบกลับ',
    s3ToneDescs: ['กระชับและตรงประเด็น', 'อบอุ่นและเป็นมิตร', 'ละเอียดและมืออาชีพ'],
    s3Selected: '✓ เลือกแล้ว',
    s3AIReply: '✨ ข้อความตอบโดย AI',
    s3InsertBtn: 'แทรกใน Gmail',
    s4Header: '🌐 เปลี่ยนภาษา — ปุ่มเดียว',
    s4UILabels: ['เปรียบเทียบ', 'ตอบอัจฉริยะ·Pro', 'สรุปเธรด', 'งานที่ตรวจพบ'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& แยกงาน/นัดหมายอัตโนมัติ',
    s5Tasks: [
      { icon: '📅', text: '15 ต.ค. 10.00 น. ประชุมทางวิดีโอ', type: 'นัดหมาย' },
      { icon: '📋', text: 'ตรวจสอบร่างสัญญาแล้วตอบกลับ', type: 'งาน' },
      { icon: '⚠️', text: '"ต้องดำเนินการด่วน"', type: 'Guard' },
    ],
    s5Detected: 'ตรวจพบ',
    s5Footer: 'ไม่พลาดสิ่งสำคัญในอีเมลของคุณ',
    s6Tagline: 'ส่วนขยาย Chrome ตอบ Gmail ด้วย AI',
    s6Scan: 'สแกนเพื่อติดตั้ง',
  },
  VN: {
    s1Badge: 'Email Nước Ngoài Đến',
    s1Confused: 'Cái này nghĩa là gì...?',
    s2Analyzing: '⚡ Đang phân tích...',
    s2SummaryTitle: '📋 Tóm tắt AI (Tiếng Việt)',
    s2Detected: '🌏 Phát hiện: Tiếng Ả Rập → Dịch sang Tiếng Việt',
    s2Click: 'Nhấp!',
    s3ToneTitle: 'Chọn Giọng Trả Lời',
    s3ToneDescs: ['Ngắn gọn & Trực tiếp', 'Ấm áp & Thân thiện', 'Chi tiết & Chuyên nghiệp'],
    s3Selected: '✓ Đã chọn',
    s3AIReply: '✨ Trả lời được AI tạo ra',
    s3InsertBtn: 'Chèn vào Gmail',
    s4Header: '🌐 Chuyển Ngôn Ngữ — Một Nút',
    s4UILabels: ['So sánh trả lời', 'Trả lời thông minh·Pro', 'Tóm tắt chủ đề', 'Nhiệm vụ phát hiện'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Trích xuất Lịch hẹn Tự động',
    s5Tasks: [
      { icon: '📅', text: '15/10 10:00 Họp video', type: 'Lịch hẹn' },
      { icon: '📋', text: 'Xem xét hợp đồng & trả lời', type: 'Việc cần làm' },
      { icon: '⚠️', text: '"Cần xử lý ngay" — Cảnh báo', type: 'Guard' },
    ],
    s5Detected: 'Phát hiện',
    s5Footer: 'Không bỏ lỡ điều quan trọng trong email',
    s6Tagline: 'Tiện ích Chrome Trả lời Gmail bằng AI',
    s6Scan: 'Quét để Cài đặt',
  },
  AR: {
    s1Badge: 'وصل بريد إلكتروني بلغة أجنبية',
    s1Confused: 'ماذا يعني هذا...؟',
    s2Analyzing: '⚡ جارٍ التحليل...',
    s2SummaryTitle: '📋 ملخص الذكاء الاصطناعي (عربي)',
    s2Detected: '🌏 تم الكشف: ياباني → تمت الترجمة إلى العربية',
    s2Click: '!انقر',
    s3ToneTitle: 'اختر نبرة الرد',
    s3ToneDescs: ['موجز ومباشر', 'دافئ وودود', 'مفصل ومهني'],
    s3Selected: '✓ تم الاختيار',
    s3AIReply: '✨ رد تم إنشاؤه بالذكاء الاصطناعي',
    s3InsertBtn: 'أدرج في Gmail',
    s4Header: '🌐 تبديل اللغة — زر واحد',
    s4UILabels: ['مقارنة الردود', 'رد ذكي·Pro', 'ملخص المحادثة', 'المهام المكتشفة'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& استخراج المهام تلقائياً',
    s5Tasks: [
      { icon: '📅', text: '١٥ أكت ١٠:٠٠ اجتماع فيديو', type: 'موعد' },
      { icon: '📋', text: 'مراجعة مسودة العقد والرد', type: 'مهمة' },
      { icon: '⚠️', text: '"يلزم اتخاذ إجراء عاجل"', type: 'Guard' },
    ],
    s5Detected: 'اكتُشف',
    s5Footer: 'لا تفوّت ما هو مهم في بريدك الإلكتروني',
    s6Tagline: 'ملحق Chrome للرد على Gmail بالذكاء الاصطناعي',
    s6Scan: 'امسح ضوئياً للتثبيت',
    rtl: true,
  },
  DE: {
    s1Badge: 'Fremdsprachige E-Mail angekommen',
    s1Confused: 'Was bedeutet das...?',
    s2Analyzing: '⚡ Analysiere...',
    s2SummaryTitle: '📋 KI-Zusammenfassung (Deutsch)',
    s2Detected: '🌏 Erkannt: Arabisch → Ins Deutsche übersetzt',
    s2Click: 'Klick!',
    s3ToneTitle: 'Antworton wählen',
    s3ToneDescs: ['Knapp & Direkt', 'Warm & Freundlich', 'Detailliert & Professionell'],
    s3Selected: '✓ Ausgewählt',
    s3AIReply: '✨ KI-generierte Antwort',
    s3InsertBtn: 'In Gmail einfügen',
    s4Header: '🌐 Sprache wechseln — Ein Knopf',
    s4UILabels: ['Antworten vergleichen', 'Smart Reply·Pro', 'Thread-Zusammenfassung', 'Erkannte Aufgaben'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Automatische Aufgabenextraktion',
    s5Tasks: [
      { icon: '📅', text: '15. Okt 10:00 Videokonferenz', type: 'Termin' },
      { icon: '📋', text: 'Vertragsentwurf prüfen & antworten', type: 'Aufgabe' },
      { icon: '⚠️', text: '"Sofortige Maßnahme erforderlich"', type: 'Guard' },
    ],
    s5Detected: 'Erkannt',
    s5Footer: 'Wichtiges in Ihren E-Mails nie übersehen',
    s6Tagline: 'KI Gmail-Antwort Chrome-Erweiterung',
    s6Scan: 'Scannen zum Installieren',
  },
  FR: {
    s1Badge: 'E-mail étranger reçu',
    s1Confused: 'Que signifie ceci...?',
    s2Analyzing: '⚡ Analyse en cours...',
    s2SummaryTitle: '📋 Résumé IA (Français)',
    s2Detected: '🌏 Détecté: Arabe → Traduit en Français',
    s2Click: 'Cliquez!',
    s3ToneTitle: 'Choisir le Ton',
    s3ToneDescs: ['Concis & Direct', 'Chaleureux & Amical', 'Détaillé & Professionnel'],
    s3Selected: '✓ Sélectionné',
    s3AIReply: '✨ Réponse générée par IA',
    s3InsertBtn: 'Insérer dans Gmail',
    s4Header: '🌐 Changer de langue — Un bouton',
    s4UILabels: ['Comparer les réponses', 'Réponse intelligente·Pro', 'Résumé du fil', 'Tâches détectées'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Extraction auto des tâches',
    s5Tasks: [
      { icon: '📅', text: '15 oct. 10h Visioconférence', type: 'RDV' },
      { icon: '📋', text: 'Réviser le contrat et répondre', type: 'Tâche' },
      { icon: '⚠️', text: '"Action urgente requise"', type: 'Guard' },
    ],
    s5Detected: 'Détecté',
    s5Footer: 'Ne manquez jamais l\'important dans vos e-mails',
    s6Tagline: 'Extension Chrome Réponse Gmail IA',
    s6Scan: 'Scanner pour Installer',
  },
  ES: {
    s1Badge: 'Correo extranjero recibido',
    s1Confused: '¿Qué significa esto...?',
    s2Analyzing: '⚡ Analizando...',
    s2SummaryTitle: '📋 Resumen IA (Español)',
    s2Detected: '🌏 Detectado: Árabe → Traducido al Español',
    s2Click: '¡Clic!',
    s3ToneTitle: 'Elegir tono de respuesta',
    s3ToneDescs: ['Conciso y Directo', 'Cálido y Amigable', 'Detallado y Profesional'],
    s3Selected: '✓ Seleccionado',
    s3AIReply: '✨ Respuesta generada por IA',
    s3InsertBtn: 'Insertar en Gmail',
    s4Header: '🌐 Cambiar idioma — Un botón',
    s4UILabels: ['Comparar respuestas', 'Respuesta inteligente·Pro', 'Resumen del hilo', 'Tareas detectadas'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Extracción automática de tareas',
    s5Tasks: [
      { icon: '📅', text: '15 oct. 10:00 Videoconferencia', type: 'Cita' },
      { icon: '📋', text: 'Revisar contrato y responder', type: 'Tarea' },
      { icon: '⚠️', text: '"Acción urgente requerida"', type: 'Guard' },
    ],
    s5Detected: 'Detectado',
    s5Footer: 'Nunca pierdas lo importante en tus correos',
    s6Tagline: 'Extensión Chrome Respuesta Gmail IA',
    s6Scan: 'Escanear para instalar',
  },
  IT: {
    s1Badge: 'Email straniera ricevuta',
    s1Confused: 'Cosa significa...?',
    s2Analyzing: '⚡ Analisi in corso...',
    s2SummaryTitle: '📋 Riepilogo IA (Italiano)',
    s2Detected: '🌏 Rilevato: Arabo → Tradotto in Italiano',
    s2Click: 'Clicca!',
    s3ToneTitle: 'Scegli il tono',
    s3ToneDescs: ['Conciso & Diretto', 'Caloroso & Amichevole', 'Dettagliato & Professionale'],
    s3Selected: '✓ Selezionato',
    s3AIReply: '✨ Risposta generata da IA',
    s3InsertBtn: 'Inserisci in Gmail',
    s4Header: '🌐 Cambia lingua — Un pulsante',
    s4UILabels: ['Confronta risposte', 'Risposta intelligente·Pro', 'Riepilogo thread', 'Attività rilevate'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Estrazione automatica attività',
    s5Tasks: [
      { icon: '📅', text: '15 ott. 10:00 Videoconferenza', type: 'Appuntamento' },
      { icon: '📋', text: 'Revisiona bozza contratto e rispondi', type: 'Attività' },
      { icon: '⚠️', text: '"Azione urgente richiesta"', type: 'Guard' },
    ],
    s5Detected: 'Rilevato',
    s5Footer: 'Non perdere mai l\'importante nelle tue email',
    s6Tagline: 'Estensione Chrome Risposta Gmail IA',
    s6Scan: 'Scansiona per installare',
  },
  TR: {
    s1Badge: 'Yabancı Dil E-postası Geldi',
    s1Confused: 'Bu ne demek...?',
    s2Analyzing: '⚡ Analiz ediliyor...',
    s2SummaryTitle: '📋 Yapay Zeka Özeti (Türkçe)',
    s2Detected: '🌏 Algılandı: Arapça → Türkçeye çevrildi',
    s2Click: 'Tıkla!',
    s3ToneTitle: 'Yanıt Tonu Seç',
    s3ToneDescs: ['Kısa & Doğrudan', 'Sıcak & Samimi', 'Ayrıntılı & Profesyonel'],
    s3Selected: '✓ Seçildi',
    s3AIReply: '✨ YZ Tarafından Oluşturulan Yanıt',
    s3InsertBtn: "Gmail'e Ekle",
    s4Header: '🌐 Dil Değiştir — Tek Düğme',
    s4UILabels: ['Yanıtları Karşılaştır', 'Akıllı Yanıt·Pro', 'Konu Özeti', 'Algılanan Görevler'],
    s5Title: 'Smart Reply Guard',
    s5Subtitle: '& Otomatik Görev Çıkarma',
    s5Tasks: [
      { icon: '📅', text: '15 Eki 10:00 Video Konferans', type: 'Randevu' },
      { icon: '📋', text: 'Sözleşme taslağını gözden geçir', type: 'Görev' },
      { icon: '⚠️', text: '"Acil işlem gerekli"', type: 'Guard' },
    ],
    s5Detected: 'Algılandı',
    s5Footer: "E-postalarınızdaki önemli şeyleri kaçırmayın",
    s6Tagline: 'YZ Gmail Yanıt Chrome Eklentisi',
    s6Scan: 'Yüklemek için Tara',
  },
};

function getLabels(lang) {
  return UI_LABELS[lang] || UI_LABELS['EN'];
}

// ─────────────────────────────────────────────────────────────────────
// Scene 1용 샘플 이메일 (14개 언어별)
// 각 영상의 "발신" 언어는 해당 언어 영상에서 외국어처럼 보일 언어로 설정
// ─────────────────────────────────────────────────────────────────────
const FOREIGN_EMAIL_MAP = {
  KR: { flag: '🇸🇦', subject: 'بخصوص طلبك', body: 'نود إبلاغك بأن طلبك قيد المراجعة...', from: 'ahmed@company.sa' },
  JP: { flag: '🇺🇸', subject: 'Important Notice Regarding Your Account', body: 'We would like to inform you that your request is currently under review...', from: 'john@corp.us' },
  EN: { flag: '🇯🇵', subject: '重要なお知らせについて', body: '先日のお問い合わせの件でご連絡をさせていただきます...', from: 'tanaka@corp.jp' },
  PT: { flag: '🇩🇪', subject: 'Wichtige Mitteilung', body: 'Hiermit möchten wir Sie über die aktuelle Situation informieren...', from: 'mueller@firma.de' },
  HI: { flag: '🇯🇵', subject: '重要なご連絡', body: 'お問い合わせいただきありがとうございます...', from: 'suzuki@jp.co' },
  ID: { flag: '🇸🇦', subject: 'بخصوص طلبك العاجل', body: 'نود إبلاغك بأن طلبك قيد المراجعة الآن...', from: 'ali@company.sa' },
  TH: { flag: '🇺🇸', subject: 'Urgent: Action Required', body: 'Please review the attached documents and respond at your earliest convenience...', from: 'smith@global.com' },
  VN: { flag: '🇩🇪', subject: 'Dringende Angelegenheit', body: 'Wir möchten Sie über eine wichtige Angelegenheit informieren...', from: 'schmidt@gmbh.de' },
  AR: { flag: '🇯🇵', subject: '緊急のお知らせ', body: 'お客様のご要望について、詳細をご確認ください...', from: 'yamamoto@jp.co' },
  DE: { flag: '🇸🇦', subject: 'طلب عاجل', body: 'يرجى مراجعة المستندات المرفقة والرد في أقرب وقت...', from: 'hassan@corp.sa' },
  FR: { flag: '🇯🇵', subject: 'お知らせ', body: '先日ご連絡いただいた件についてご確認をお願いします...', from: 'nakamura@jp.co' },
  ES: { flag: '🇩🇪', subject: 'Wichtige Nachricht', body: 'Bitte überprüfen Sie die beigefügten Dokumente und antworten Sie zeitnah...', from: 'wagner@firma.de' },
  IT: { flag: '🇺🇸', subject: 'Critical Update Required', body: 'Your immediate attention is required regarding the following matter...', from: 'johnson@corp.us' },
  TR: { flag: '🇸🇦', subject: 'عاجل: يرجى الرد', body: 'نرجو الاطلاع على الوثائق المرفقة والرد في أقرب وقت...', from: 'khalid@corp.sa' },
};

// 나레이션 라인 (언어별 variants.json에서 런타임에 로드되나, fallback으로 KR 사용)
const DEFAULT_SUBTITLES = [
  { start: 0,  end: 10, text: '외국어 이메일이 쏟아진다…' },
  { start: 10, end: 20, text: 'MailMind 클릭 한 번이면' },
  { start: 20, end: 35, text: '톤까지 골라서 완벽한 답장 자동 생성' },
  { start: 35, end: 45, text: '14개 언어, 버튼 하나로 전환' },
  { start: 45, end: 55, text: 'Smart Reply Guard · 약속 자동 추출' },
  { start: 55, end: 60, text: 'mailmind.yongcha.app' },
];

// 언어 전환 칩
const LANG_CHIPS = ['KR','EN','JP','CN','ES','DE','BR','SA','IT','TR','FR','VN','TH','ID'];
const LANG_CHIPS_LABEL = { KR: '한국어', EN: 'English', JP: '日本語', CN: '中文', ES: 'Español', DE: 'Deutsch', BR: 'PT(BR)', SA: 'العربية', IT: 'Italiano', TR: 'Türkçe', FR: 'Français', VN: 'Tiếng Việt', TH: 'ภาษาไทย', ID: 'Bahasa' };

// ─────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────
function fadeIn(frame, start, dur = 15) {
  return interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}
function slideUp(frame, start, dur = 20) {
  return interpolate(frame, [start, start + dur], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
}

// ─────────────────────────────────────────────────────────────────────
// Scene 1: 외국어 이메일 도착 (0~300f, 0~10s)
// ─────────────────────────────────────────────────────────────────────
function Scene1({ frame, lang }) {
  const L = getLabels(lang);
  const email = FOREIGN_EMAIL_MAP[lang] || FOREIGN_EMAIL_MAP['KR'];
  const opacity = fadeIn(frame, 0);
  const shake = frame > 200 ? Math.sin(frame * 0.8) * (3 * (1 - (frame - 200) / 100)) : 0;
  const isRTL = L.rtl;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${BRAND.blueDark} 0%, #0A1628 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      {/* 상단 레이블 */}
      <div style={{ opacity, transform: `translateY(${slideUp(frame, 0)}px)`, marginBottom: 40 }}>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 100, padding: '12px 32px', fontSize: 28, color: BRAND.cyan, fontFamily: 'Pretendard, sans-serif', fontWeight: 700, letterSpacing: 2 }}>
          {email.flag} {L.s1Badge}
        </div>
      </div>

      {/* 이메일 카드 */}
      <div style={{ width: '100%', maxWidth: 900, background: BRAND.white, borderRadius: 24, padding: 50, boxShadow: '0 20px 80px rgba(0,0,0,0.4)', transform: `translateX(${shake}px)`, opacity: fadeIn(frame, 10), direction: isRTL ? 'rtl' : 'ltr' }}>
        <div style={{ fontSize: 24, color: BRAND.textMid, marginBottom: 12, fontFamily: 'Pretendard, sans-serif' }}>from: {email.from}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: BRAND.textDark, marginBottom: 24, fontFamily: 'sans-serif', lineHeight: 1.3 }}>{email.subject}</div>
        <div style={{ fontSize: 28, color: BRAND.textMid, lineHeight: 1.7, fontFamily: 'sans-serif' }}>{email.body}</div>
      </div>

      {/* 당황 표시 */}
      {frame > 200 && (
        <div style={{ position: 'absolute', top: 200, right: 80, fontSize: 80, opacity: Math.min(1, (frame - 200) / 30) }}>😰</div>
      )}

      <div style={{ position: 'absolute', bottom: 120, opacity: fadeIn(frame, 240), fontSize: 32, color: 'rgba(255,255,255,0.6)', fontFamily: 'Pretendard, sans-serif' }}>
        {L.s1Confused}
      </div>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 2: MailMind 클릭 → 내 언어로 요약 (300~600f, 10~20s)
// ─────────────────────────────────────────────────────────────────────
function Scene2({ frame, lang }) {
  const L = getLabels(lang);
  const localFrame = frame - 300;
  const summaryVisible = localFrame > 80;
  const summaryOpacity = fadeIn(localFrame, 80);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #051233 0%, ${BRAND.blueDark} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      {/* MailMind 확장 패널 */}
      <div style={{ width: '100%', maxWidth: 900, opacity: fadeIn(localFrame, 0) }}>
        {/* 패널 헤더 */}
        <div style={{ background: BRAND.blue, borderRadius: '20px 20px 0 0', padding: '28px 40px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, background: BRAND.white, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✉️</div>
          <div style={{ color: BRAND.white, fontSize: 32, fontWeight: 800, fontFamily: 'Pretendard, sans-serif' }}>MailMind AI</div>
          <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 100, padding: '8px 24px', color: BRAND.cyan, fontSize: 22, fontFamily: 'sans-serif' }}>{L.s2Analyzing}</div>
        </div>

        {/* 요약 결과 */}
        <div style={{ background: BRAND.white, borderRadius: '0 0 20px 20px', padding: 50 }}>
          {summaryVisible ? (
            <div style={{ opacity: summaryOpacity }}>
              <div style={{ fontSize: 24, color: BRAND.blue, fontWeight: 700, marginBottom: 16, fontFamily: 'sans-serif' }}>{L.s2SummaryTitle}</div>
              <div style={{ fontSize: 30, color: BRAND.textDark, lineHeight: 1.8, fontFamily: 'Pretendard, sans-serif' }}>
                • {L.s5Tasks[0] ? L.s5Tasks[0].text : '...'}<br/>
                • {L.s5Tasks[1] ? L.s5Tasks[1].text : '...'}<br/>
                • {L.s5Tasks[2] ? <span style={{ color: BRAND.pink, fontWeight: 700 }}>{L.s5Tasks[2].text}</span> : '...'}
              </div>
              <div style={{ marginTop: 32, padding: '20px 28px', background: '#F0F4FF', borderRadius: 14, fontSize: 26, color: BRAND.textMid, fontFamily: 'sans-serif' }}>
                {L.s2Detected}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[200, 240, 120].map((w, i) => (
                <div key={i} style={{ height: 24, background: '#E8EEF7', borderRadius: 8, width: w + 'px' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 클릭 버튼 강조 */}
      {localFrame < 60 && (
        <div style={{ position: 'absolute', bottom: 200, right: 80, opacity: 1 - localFrame / 60 }}>
          <div style={{ background: BRAND.blue, borderRadius: 20, padding: '24px 48px', fontSize: 36, color: BRAND.white, fontFamily: 'sans-serif', fontWeight: 800, boxShadow: `0 0 40px ${BRAND.cyan}80` }}>
            {L.s2Click}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 3: 톤 선택 → 완벽한 답장 생성 (600~1050f, 20~35s)
// ─────────────────────────────────────────────────────────────────────
const TONE_ICONS = ['⚡', '🤝', '📋'];
const TONE_IDS = ['direct', 'warm', 'detailed'];
const GENERATED_REPLY = `Dear Ahmed,\n\nThank you for your message. I have received your request and I am currently reviewing the necessary documentation.\n\nI will submit the required documents within 2 business days.\n\nBest regards,`;

function Scene3({ frame, lang }) {
  const L = getLabels(lang);
  const localFrame = frame - 600;
  const selectedTone = localFrame < 200 ? null : 'warm';
  const replyVisible = localFrame > 300;
  const replyOpacity = fadeIn(localFrame, 300);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #030d20 0%, #0c2a5e 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '80px 60px 60px' }}>
      <div style={{ opacity: fadeIn(localFrame, 0), marginBottom: 40, alignSelf: 'flex-start' }}>
        <div style={{ color: BRAND.cyan, fontSize: 28, fontFamily: 'sans-serif', fontWeight: 700, marginBottom: 8 }}>{L.s3ToneTitle}</div>
      </div>

      {/* 톤 선택 카드 */}
      <div style={{ display: 'flex', gap: 24, width: '100%', marginBottom: 50, opacity: fadeIn(localFrame, 20) }}>
        {TONE_IDS.map((id, i) => {
          const isSelected = selectedTone === id;
          const cardOpacity = fadeIn(localFrame, 20 + i * 15);
          return (
            <div key={id} style={{ flex: 1, background: isSelected ? BRAND.blue : 'rgba(255,255,255,0.08)', border: isSelected ? `3px solid ${BRAND.cyan}` : '3px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '32px 24px', textAlign: 'center', opacity: cardOpacity, transform: isSelected ? 'scale(1.04)' : 'scale(1)' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>{TONE_ICONS[i]}</div>
              <div style={{ color: BRAND.white, fontSize: 28, fontWeight: 800, fontFamily: 'Pretendard, sans-serif', marginBottom: 8 }}>{id.charAt(0).toUpperCase() + id.slice(1)}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22, fontFamily: 'sans-serif' }}>{L.s3ToneDescs[i]}</div>
              {isSelected && <div style={{ marginTop: 16, color: BRAND.cyan, fontSize: 24, fontFamily: 'sans-serif' }}>{L.s3Selected}</div>}
            </div>
          );
        })}
      </div>

      {/* 생성된 답장 */}
      {replyVisible && (
        <div style={{ width: '100%', opacity: replyOpacity }}>
          <div style={{ background: 'rgba(26,107,255,0.15)', border: `2px solid ${BRAND.blue}`, borderRadius: 20, padding: 40 }}>
            <div style={{ color: BRAND.cyan, fontSize: 26, fontWeight: 700, marginBottom: 20, fontFamily: 'sans-serif' }}>{L.s3AIReply}</div>
            <div style={{ color: BRAND.white, fontSize: 26, lineHeight: 1.8, fontFamily: 'sans-serif', whiteSpace: 'pre-line' }}>
              {GENERATED_REPLY.slice(0, Math.min(GENERATED_REPLY.length, Math.floor((localFrame - 300) * 3)))}
              {localFrame < 680 && <span style={{ borderRight: `2px solid ${BRAND.cyan}` }}> </span>}
            </div>
          </div>

          {/* 삽입 버튼 */}
          {localFrame > 700 && (
            <div style={{ marginTop: 30, display: 'flex', gap: 20, justifyContent: 'center', opacity: fadeIn(localFrame, 700) }}>
              <div style={{ background: BRAND.pink, borderRadius: 16, padding: '24px 60px', fontSize: 32, color: BRAND.white, fontWeight: 800, fontFamily: 'sans-serif' }}>
                {L.s3InsertBtn}
              </div>
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 4: 언어 전환 → UI가 해당 언어로 변경 (1050~1350f, 35~45s)
// ─────────────────────────────────────────────────────────────────────
function Scene4({ frame, lang }) {
  const L = getLabels(lang);
  const localFrame = frame - 1050;
  const activeIdx = Math.floor(localFrame / 45) % LANG_CHIPS.length;
  const currentChip = LANG_CHIPS[activeIdx];
  // Scene4 shows UI labels for whichever chip is active — use that chip's lang
  const chipLang = currentChip === 'CN' ? 'KR' : currentChip === 'BR' ? 'PT' : currentChip === 'SA' ? 'AR' : currentChip;
  const chipLabels = getLabels(chipLang);

  return (
    <AbsoluteFill style={{ background: '#050E22', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '80px 60px 40px' }}>
      <div style={{ opacity: fadeIn(localFrame, 0), marginBottom: 40, textAlign: 'center' }}>
        <div style={{ color: BRAND.cyan, fontSize: 30, fontFamily: 'sans-serif', fontWeight: 700 }}>{L.s4Header}</div>
      </div>

      {/* 언어 칩 그리드 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', width: '100%', marginBottom: 50 }}>
        {LANG_CHIPS.map((chip, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={chip} style={{ background: isActive ? BRAND.blue : 'rgba(255,255,255,0.08)', border: isActive ? `2px solid ${BRAND.cyan}` : '2px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '14px 28px', color: isActive ? BRAND.white : 'rgba(255,255,255,0.6)', fontSize: 24, fontFamily: 'sans-serif', fontWeight: isActive ? 700 : 400, transform: isActive ? 'scale(1.12)' : 'scale(1)' }}>
              {LANG_CHIPS_LABEL[chip] || chip}
            </div>
          );
        })}
      </div>

      {/* UI 변환 데모 */}
      <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 20, border: '2px solid rgba(255,255,255,0.1)', padding: 40, opacity: fadeIn(localFrame, 30) }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, marginBottom: 24, fontFamily: 'Pretendard, sans-serif' }}>MailMind UI</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {chipLabels.s4UILabels.map((label, i) => (
            <div key={i} style={{ background: i === 0 ? BRAND.pink : 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 28px', fontSize: 28, color: BRAND.white, fontFamily: 'sans-serif', fontWeight: i === 0 ? 700 : 400 }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 5: Smart Reply Guard / 약속 추출 (1350~1650f, 45~55s)
// ─────────────────────────────────────────────────────────────────────
function Scene5({ frame, lang }) {
  const L = getLabels(lang);
  const localFrame = frame - 1350;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #031028 0%, #0c1e45 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '80px 60px 40px' }}>
      <div style={{ opacity: fadeIn(localFrame, 0), marginBottom: 50, textAlign: 'center' }}>
        <div style={{ color: BRAND.white, fontSize: 44, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1.3 }}>
          {L.s5Title}
          <br />
          <span style={{ color: BRAND.cyan, fontSize: 36 }}>{L.s5Subtitle}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: '100%' }}>
        {L.s5Tasks.map((task, i) => {
          const cardOpacity = fadeIn(localFrame, 60 + i * 80);
          const cardSlide = slideUp(localFrame, 60 + i * 80, 25);
          const typeColor = task.type === 'Guard' ? BRAND.pink : i === 0 ? BRAND.cyan : BRAND.green;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24, background: 'rgba(255,255,255,0.06)', border: `2px solid ${typeColor}40`, borderRadius: 20, padding: '30px 36px', opacity: cardOpacity, transform: `translateY(${cardSlide}px)` }}>
              <div style={{ fontSize: 52 }}>{task.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: typeColor, fontSize: 22, fontWeight: 700, fontFamily: 'sans-serif', marginBottom: 8 }}>{task.type}</div>
                <div style={{ color: BRAND.white, fontSize: 28, fontFamily: 'sans-serif', lineHeight: 1.5 }}>{task.text}</div>
              </div>
              <div style={{ background: typeColor + '20', border: `2px solid ${typeColor}`, borderRadius: 100, padding: '10px 24px', color: typeColor, fontSize: 22, fontWeight: 700, fontFamily: 'sans-serif' }}>
                {L.s5Detected}
              </div>
            </div>
          );
        })}
      </div>

      {localFrame > 200 && (
        <div style={{ marginTop: 50, opacity: fadeIn(localFrame, 200), textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 28, fontFamily: 'sans-serif' }}>
            {L.s5Footer}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scene 6: 로고 + 플랜 + URL (1650~1800f, 55~60s)
// ─────────────────────────────────────────────────────────────────────
function Scene6({ frame, lang, logoSrc }) {
  const L = getLabels(lang);
  const localFrame = frame - 1650;
  const logoScale = spring({ frame: localFrame, fps: 30, config: { damping: 14, mass: 0.8, stiffness: 120 } });
  const PLANS = [
    { name: 'Free', price: '₩0', desc: lang === 'EN' || lang === 'DE' || lang === 'FR' || lang === 'ES' || lang === 'IT' || lang === 'PT' || lang === 'TR' ? '10 uses/mo' : '10회/월', color: BRAND.textMid },
    { name: 'Pro', price: '₩9,900', desc: lang === 'EN' || lang === 'DE' || lang === 'FR' || lang === 'ES' || lang === 'IT' || lang === 'PT' || lang === 'TR' ? '300 uses/mo' : '300회/월', color: BRAND.blue, highlight: true },
  ];

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 60%, #030d20 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 90, paddingLeft: 80, paddingRight: 80 }}>
      {/* 상단 고정: URL + QR코드 */}
      <div style={{ opacity: fadeIn(localFrame, 20), textAlign: 'center', marginBottom: 36 }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '18px 52px', fontSize: 36, color: BRAND.white, fontFamily: 'Pretendard, monospace', fontWeight: 700, letterSpacing: 1, marginBottom: 20 }}>
          mailmind.yongcha.app
        </div>
        <img src={QR_CODE_BASE64} style={{ width: 180, height: 180, background: '#fff', borderRadius: 18, padding: 10 }} />
        <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.85)', fontSize: 22, fontFamily: 'sans-serif', fontWeight: 600 }}>{L.s6Scan}</div>
        <div style={{ marginTop: 6, color: BRAND.cyan, fontSize: 18, fontFamily: 'Pretendard, monospace' }}>Chrome Web Store</div>
      </div>

      {/* 로고 */}
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 28 }}>
        {logoSrc ? (
          <img src={logoSrc} style={{ width: 160, height: 160, borderRadius: 32 }} />
        ) : (
          <div style={{ width: 160, height: 160, background: BRAND.blue, borderRadius: 32, border: `4px solid ${BRAND.cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>✉️</div>
        )}
      </div>

      <div style={{ opacity: fadeIn(localFrame, 10), textAlign: 'center', marginBottom: 36 }}>
        <div style={{ color: BRAND.white, fontSize: 50, fontWeight: 900, fontFamily: 'Pretendard, sans-serif', letterSpacing: -1 }}>MailMind AI</div>
        <div style={{ color: BRAND.cyan, fontSize: 26, fontFamily: 'sans-serif', marginTop: 10 }}>{L.s6Tagline}</div>
      </div>

      {/* 플랜 카드 */}
      <div style={{ display: 'flex', gap: 28, opacity: fadeIn(localFrame, 40) }}>
        {PLANS.map((plan) => (
          <div key={plan.name} style={{ background: plan.highlight ? BRAND.white : 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 40px', textAlign: 'center', border: plan.highlight ? `3px solid ${BRAND.cyan}` : '3px solid rgba(255,255,255,0.15)', minWidth: 200 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: plan.highlight ? BRAND.blue : 'rgba(255,255,255,0.7)', fontFamily: 'Pretendard, sans-serif', marginBottom: 10 }}>{plan.name}</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: plan.highlight ? BRAND.blue : BRAND.white, fontFamily: 'Pretendard, sans-serif', marginBottom: 6 }}>{plan.price}</div>
            <div style={{ fontSize: 20, color: plan.highlight ? BRAND.textMid : 'rgba(255,255,255,0.6)', fontFamily: 'Pretendard, sans-serif' }}>{plan.desc}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 자막 오버레이
// ─────────────────────────────────────────────────────────────────────
function Subtitle({ frame, subtitles, fps = 30 }) {
  const currentSec = frame / fps;
  const sub = subtitles.find(s => currentSec >= s.start && currentSec < s.end);
  if (!sub) return null;
  const subFrame = frame - sub.start * fps;
  const opacity = fadeIn(subFrame, 0, 8);

  return (
    <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 60px', pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 16, padding: '18px 40px', maxWidth: 860, textAlign: 'center', opacity }}>
        <div style={{ color: BRAND.white, fontSize: 36, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
          {sub.text}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 메인 컴포지션
// ─────────────────────────────────────────────────────────────────────
function MailMindPromo({ lang = 'JP', variant = 'A', subtitles = DEFAULT_SUBTITLES, logoSrc = null }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily: 'Pretendard, "Noto Sans JP", "Noto Sans KR", sans-serif', background: '#030d20', overflow: 'hidden' }}>
      {/* 씬 시퀀스 */}
      <Sequence from={0} durationInFrames={300}><Scene1 frame={frame} lang={lang} /></Sequence>
      <Sequence from={300} durationInFrames={300}><Scene2 frame={frame} lang={lang} /></Sequence>
      <Sequence from={600} durationInFrames={450}><Scene3 frame={frame} lang={lang} /></Sequence>
      <Sequence from={1050} durationInFrames={300}><Scene4 frame={frame} lang={lang} /></Sequence>
      <Sequence from={1350} durationInFrames={300}><Scene5 frame={frame} lang={lang} /></Sequence>
      <Sequence from={1650} durationInFrames={150}><Scene6 frame={frame} lang={lang} logoSrc={logoSrc} /></Sequence>

      {/* 자막 */}
      <Subtitle frame={frame} subtitles={subtitles} fps={fps} />

      {/* MailMind 상단 배지 (씬 1~5) */}
      {frame < 1650 && (
        <div style={{ position: 'absolute', top: 60, left: 60, display: 'flex', alignItems: 'center', gap: 16, opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
          <div style={{ background: BRAND.blue, borderRadius: 16, padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>✉️</span>
            <span style={{ color: BRAND.white, fontSize: 26, fontWeight: 700, fontFamily: 'Pretendard, sans-serif' }}>MailMind AI</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// Remotion 컴포지션 등록
function Root() {
  return (
    <>
      <Composition
        id="MailMindPromo"
        component={MailMindPromo}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ lang: 'JP', variant: 'A', subtitles: DEFAULT_SUBTITLES, logoSrc: null }}
      />
      <Composition
        id="MailMindReels"
        component={MailMindPromo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ lang: 'JP', variant: 'A', subtitles: DEFAULT_SUBTITLES.map(s => ({ ...s, start: s.start / 2, end: s.end / 2 })), logoSrc: null }}
      />
    </>
  );
}

module.exports = { MailMindPromo, Root, DEFAULT_SUBTITLES };
