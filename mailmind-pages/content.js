/* eslint-disable */
// MailMind AI — content.js (resubmission build: sanitize() added for all dynamic innerHTML)

function sanitize(str) {
  if (str === undefined || str === null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}


const UI_STRINGS = {
  Korean: {
    tone: '답장 톤', country: '발신자 국가', myLang: '내 언어',
    generate: '✦ AI 답장 생성', generating: '✦ 생성 중...',
    compare: '✨ 답변 비교', smartReply: '👑 스마트 답장 · Pro',
    summary: '📝 메일 요약', summarizing: '📝 요약 중...',
    translate: '🌐 내 언어로 번역', translating: '🌐 번역 중...', translateClose: '🌐 번역 닫기',
    tasks: '📌 감지된 할 일 & 액션', settings: '⚙️ 설정 (서명 · 템플릿)',
    insert: '✉️ Gmail에 삽입', copy: '📋 복사', regen: '🔄',
    switchLang: '언어 전환:', upgrade: '플랜 업그레이드 →',
    limitMsg: '이번 달 사용 한도에 도달했어요.',
    guardTitle: '🛡️ 발송 전 확인',
    urgency: { high: '🔴 긴급', medium: '🟡 보통', low: '🟢 여유' },
    emotion: { angry: '😤 불만', urgent: '⚡ 급함', neutral: '😊 일반', positive: '👍 긍정' },
    promises: '📋 내가 약속한 것',
    score: '답변 품질', chars: '글자수',
    calendarAdd: '캘린더 추가', taskAdd: '할 일 등록', followup: '팔로업 메일',
    signature: '내 서명', sigSave: '서명 저장', template: '자주 쓰는 문구', save: '저장',
    shortcut: '⌨️ Alt+G 생성 · Alt+C 복사 · Alt+I 삽입',
    settingsClose: '⚙️ 설정 닫기',
    autoDetect: '🌐 자동 감지', sigPlaceholder: '서명을 입력하세요', templatePlaceholder: '자주 쓰는 문구 입력',
    editDone: '✅ 완료', refine: '✨ 다듬기', refining: '✨ 다듬기 중...',
    refineDone: '✨ 다듬기 완료!', refineFailed: '다듬기 실패. 다시 시도해주세요.',
    refineEmpty: '다듬기 실패: 결과가 비어있습니다.', refineInput: '다듬을 내용을 입력해주세요.',
    learnedLabel: '학습됨', tonePref: '톤 선호', learnedUnit: '회 학습',
    styleShort: '간결하게', styleMid: '보통 길이', styleLong: '상세하게',
    sendOriginal: '🌐 원본 언어로 보내기',
    newsletter_info: '📧 뉴스레터/마케팅 이메일로 감지됐어요. 직접 답장은 권장되지 않아요.',
    transactional_info: '📧 주문/결제 확인 이메일로 감지됐어요. AI 답장이 필요하지 않을 수 있어요.',
    smartPlanMsg: '스마트 답장은 Pro 플랜 이상에서 사용 가능합니다.',
    refinePlanMsg: '다듬기는 Basic 플랜 이상에서 사용 가능합니다.',
  },
  English: {
    tone: 'Reply Tone', country: "Sender's Country", myLang: 'My Language',
    generate: '✦ Generate AI Reply', generating: '✦ Generating...',
    compare: '✨ Compare Replies', smartReply: '👑 Smart Reply · Pro',
    summary: '📝 Mail Summary', summarizing: '📝 Summarizing...',
    translate: '🌐 Translate to My Language', translating: '🌐 Translating...', translateClose: '🌐 Close Translation',
    tasks: '📌 Detected Actions', settings: '⚙️ Settings',
    guardTitle: '🛡️ Pre-send Check',
    insert: '✉️ Insert into Gmail', copy: '📋 Copy', regen: '🔄',
    switchLang: 'Switch:', upgrade: 'Upgrade Plan →',
    limitMsg: 'Monthly limit reached.',
    errNotFound: 'Email content not found.',
    errFailed: 'Failed. Please try again.',
    errSummaryFailed: 'Summary failed. Please try again.',
    errTranslate: 'Translation failed.',
    msgCopied: 'Copied!',
    msgGenFirst: 'Please generate a reply first.',
    urgency: { high: '🔴 Urgent', medium: '🟡 Normal', low: '🟢 Low' },
    emotion: { angry: '😤 Complaint', urgent: '⚡ Urgent', neutral: '😊 Normal', positive: '👍 Positive' },
    promises: '📋 Your Commitments',
    score: 'Reply Score',
    chars: 'chars',
    calendarAdd: 'Add to Calendar', taskAdd: 'Add Task', followup: 'Follow-up',
    signature: 'My Signature', sigSave: 'Save Signature', template: 'Templates', save: 'Save',
    shortcut: '⌨️ Alt+G Generate · Alt+C Copy · Alt+I Insert',
    settingsClose: '⚙️ Close Settings',
    autoDetect: '🌐 Auto Detect', sigPlaceholder: 'Enter your signature', templatePlaceholder: 'Enter phrase',
    editDone: '✅ Done', refine: '✨ Polish', refining: '✨ Polishing...',
    refineDone: '✨ Polish complete!', refineFailed: 'Polish failed. Please try again.',
    refineEmpty: 'Polish failed: empty result.', refineInput: 'Please enter text to polish.',
    learnedLabel: 'Learned', tonePref: 'tone pref', learnedUnit: 'uses',
    styleShort: 'concise', styleMid: 'moderate', styleLong: 'detailed',
    sendOriginal: '🌐 Send in original language',
    newsletter_info: '📧 This appears to be a newsletter or marketing email.',
    transactional_info: '📧 This appears to be an order or payment confirmation email.',
    smartPlanMsg: 'Smart Reply is available on Pro plan or above.',
    refinePlanMsg: 'Draft polish is available on Basic plan or above.',
  },
  Japanese: {
    tone: '返信トーン', country: '送信者の国', myLang: '使用言語',
    generate: '✦ AI返信を生成', generating: '✦ 生成中...',
    compare: '✨ 返信を比較', smartReply: '👑 スマート返信 · Pro',
    summary: '📝 メール要約', summarizing: '📝 要約中...',
    translate: '🌐 自分の言語に翻訳', translating: '🌐 翻訳中...', translateClose: '🌐 翻訳を閉じる',
    tasks: '📌 検出されたアクション', settings: '⚙️ 設定',
    insert: '✉️ Gmailに挿入', copy: '📋 コピー', regen: '🔄',
    switchLang: '言語切替:', upgrade: 'アップグレード →',
    limitMsg: '今月の上限に達しました。',
    guardTitle: '🛡️ 送信前確認',
    urgency: { high: '🔴 緊急', medium: '🟡 普通', low: '🟢 余裕' },
    emotion: { angry: '😤 不満', urgent: '⚡ 急ぎ', neutral: '😊 通常', positive: '👍 ポジティブ' },
    promises: '📋 あなたの約束',
    score: '返信スコア', chars: '文字数',
    calendarAdd: 'カレンダー追加', taskAdd: 'タスク追加', followup: 'フォローアップ',
    signature: '署名', sigSave: '署名保存', template: 'テンプレート', save: '保存',
    shortcut: '⌨️ Alt+G 生成 · Alt+C コピー · Alt+I 挿入',
    settingsClose: '⚙️ 設定を閉じる',
    autoDetect: '🌐 自動検出', sigPlaceholder: '署名を入力してください', templatePlaceholder: 'フレーズを入力',
    editDone: '✅ 完了', refine: '✨ 磨く', refining: '✨ 磨き中...',
    refineDone: '✨ 磨き完了！', refineFailed: '磨き失敗。再試行してください。',
    refineEmpty: '磨き失敗：結果が空です。', refineInput: '磨く内容を入力してください。',
    learnedLabel: '学習済み', tonePref: 'トーン好み', learnedUnit: '回学習',
    styleShort: '簡潔', styleMid: '普通', styleLong: '詳細',
    sendOriginal: '🌐 元の言語で送信',
    newsletter_info: '📧 ニュースレター/マーケティングメールと検出されました。',
    transactional_info: '📧 注文/決済確認メールと検出されました。',
  },
  Chinese: {
    tone: '回复语气', country: '发件人国家', myLang: '我的语言',
    generate: '✦ 生成AI回复', generating: '✦ 生成中...',
    compare: '✨ 比较回复', smartReply: '👑 智能回复 · Pro',
    summary: '📝 邮件摘要', summarizing: '📝 摘要中...',
    translate: '🌐 翻译成我的语言', translating: '🌐 翻译中...', translateClose: '🌐 关闭翻译',
    tasks: '📌 检测到的操作', settings: '⚙️ 设置',
    insert: '✉️ 插入Gmail', copy: '📋 复制', regen: '🔄',
    switchLang: '切换语言:', upgrade: '升级计划 →',
    limitMsg: '本月使用限额已达到。',
    guardTitle: '🛡️ 发送前检查',
    urgency: { high: '🔴 紧急', medium: '🟡 普通', low: '🟢 轻松' },
    emotion: { angry: '😤 投诉', urgent: '⚡ 紧急', neutral: '😊 正常', positive: '👍 积极' },
    promises: '📋 您的承诺',
    score: '回复评分', chars: '字数',
    calendarAdd: '添加日历', taskAdd: '添加任务', followup: '跟进邮件',
    signature: '我的签名', sigSave: '保存签名', template: '模板', save: '保存',
    shortcut: '⌨️ Alt+G 生成 · Alt+C 复制 · Alt+I 插入',
    settingsClose: '⚙️ 关闭设置',
    autoDetect: '🌐 自动检测', sigPlaceholder: '请输入您的签名', templatePlaceholder: '输入常用短语',
    editDone: '✅ 完成', refine: '✨ 润色', refining: '✨ 润色中...',
    refineDone: '✨ 润色完成！', refineFailed: '润色失败，请重试。',
    refineEmpty: '润色失败：结果为空。', refineInput: '请输入要润色的内容。',
    learnedLabel: '已学习', tonePref: '语气偏好', learnedUnit: '次学习',
    styleShort: '简洁', styleMid: '适中', styleLong: '详细',
    sendOriginal: '🌐 以原语言发送',
    newsletter_info: '📧 检测为通讯邮件/营销邮件。',
    transactional_info: '📧 检测为订单/付款确认邮件。',
  },
  German: {
    tone: 'Antwortton', country: 'Absenderland', myLang: 'Meine Sprache',
    generate: '✦ KI-Antwort generieren', generating: '✦ Generiere...',
    compare: '✨ Antworten vergleichen', smartReply: '👑 Smart Reply · Pro',
    summary: '📝 E-Mail-Zusammenfassung', summarizing: '📝 Zusammenfassen...',
    translate: '🌐 In meine Sprache übersetzen', translating: '🌐 Übersetze...', translateClose: '🌐 Übersetzung schließen',
    tasks: '📌 Erkannte Aktionen', settings: '⚙️ Einstellungen',
    insert: '✉️ In Gmail einfügen', copy: '📋 Kopieren', regen: '🔄',
    switchLang: 'Wechseln:', upgrade: 'Plan upgraden →',
    limitMsg: 'Monatliches Limit erreicht.',
    guardTitle: '🛡️ Vor dem Senden prüfen',
    urgency: { high: '🔴 Dringend', medium: '🟡 Normal', low: '🟢 Entspannt' },
    emotion: { angry: '😤 Beschwerde', urgent: '⚡ Dringend', neutral: '😊 Normal', positive: '👍 Positiv' },
    promises: '📋 Ihre Zusagen',
    score: 'Antwortbewertung', chars: 'Zeichen',
    calendarAdd: 'Kalender', taskAdd: 'Aufgabe', followup: 'Nachfassen',
    signature: 'Meine Signatur', sigSave: 'Signatur speichern', template: 'Vorlagen', save: 'Speichern',
    shortcut: '⌨️ Alt+G Erstellen · Alt+C Kopieren · Alt+I Einfügen',
    settingsClose: '⚙️ Einstellungen schließen',
    autoDetect: '🌐 Auto-Erkennung', sigPlaceholder: 'Signatur eingeben', templatePlaceholder: 'Phrase eingeben',
    editDone: '✅ Fertig', refine: '✨ Verfeinern', refining: '✨ Verfeinere...',
    refineDone: '✨ Verfeinert!', refineFailed: 'Verfeinern fehlgeschlagen. Bitte erneut versuchen.',
    refineEmpty: 'Verfeinern fehlgeschlagen: Leeres Ergebnis.', refineInput: 'Bitte Text zum Verfeinern eingeben.',
    learnedLabel: 'Gelernt', tonePref: 'Ton-Vorliebe', learnedUnit: 'Mal gelernt',
    styleShort: 'prägnant', styleMid: 'mittel', styleLong: 'ausführlich',
    sendOriginal: '🌐 In Originalsprache senden',
    newsletter_info: '📧 Als Newsletter/Marketing-E-Mail erkannt.',
    transactional_info: '📧 Als Bestell-/Zahlungsbestätigung erkannt.',
  },
  French: {
    tone: 'Ton de réponse', country: "Pays de l'expéditeur", myLang: 'Ma langue',
    generate: '✦ Générer une réponse IA', generating: '✦ Génération...',
    compare: '✨ Comparer les réponses', smartReply: '👑 Réponse intelligente · Pro',
    summary: '📝 Résumé du mail', summarizing: '📝 Résumé en cours...',
    translate: '🌐 Traduire dans ma langue', translating: '🌐 Traduction...', translateClose: '🌐 Fermer la traduction',
    tasks: '📌 Actions détectées', settings: '⚙️ Paramètres',
    insert: '✉️ Insérer dans Gmail', copy: '📋 Copier', regen: '🔄',
    switchLang: 'Changer:', upgrade: 'Mettre à niveau →',
    limitMsg: 'Limite mensuelle atteinte.',
    guardTitle: '🛡️ Vérification avant envoi',
    urgency: { high: '🔴 Urgent', medium: '🟡 Normal', low: '🟢 Tranquille' },
    emotion: { angry: '😤 Plainte', urgent: '⚡ Urgent', neutral: '😊 Normal', positive: '👍 Positif' },
    promises: '📋 Vos engagements',
    score: 'Score de réponse', chars: 'caractères',
    calendarAdd: 'Calendrier', taskAdd: 'Tâche', followup: 'Suivi',
    signature: 'Ma signature', sigSave: 'Enregistrer', template: 'Modèles', save: 'Sauver',
    shortcut: '⌨️ Alt+G Générer · Alt+C Copier · Alt+I Insérer',
    settingsClose: '⚙️ Fermer les paramètres',
    autoDetect: '🌐 Détection auto', sigPlaceholder: 'Saisissez votre signature', templatePlaceholder: 'Saisir une phrase',
    editDone: '✅ Terminé', refine: '✨ Affiner', refining: '✨ Affinage...',
    refineDone: '✨ Affiné !', refineFailed: 'Échec du raffinage. Veuillez réessayer.',
    refineEmpty: 'Échec du raffinage : résultat vide.', refineInput: 'Veuillez saisir le texte à affiner.',
    learnedLabel: 'Appris', tonePref: 'préf. de ton', learnedUnit: 'apprentissages',
    styleShort: 'concis', styleMid: 'modéré', styleLong: 'détaillé',
    sendOriginal: '🌐 Envoyer en langue originale',
    newsletter_info: '📧 Détecté comme newsletter ou email marketing.',
    transactional_info: '📧 Détecté comme confirmation de commande ou de paiement.',
  },
  Portuguese: {
    tone: 'Tom de resposta', country: 'País do remetente', myLang: 'Meu idioma',
    generate: '✦ Gerar resposta IA', generating: '✦ Gerando...',
    compare: '✨ Comparar respostas', smartReply: '👑 Resposta inteligente · Pro',
    summary: '📝 Resumo do e-mail', summarizing: '📝 Resumindo...',
    translate: '🌐 Traduzir para meu idioma', translating: '🌐 Traduzindo...', translateClose: '🌐 Fechar tradução',
    tasks: '📌 Ações detectadas', settings: '⚙️ Configurações',
    insert: '✉️ Inserir no Gmail', copy: '📋 Copiar', regen: '🔄',
    switchLang: 'Mudar:', upgrade: 'Atualizar plano →',
    limitMsg: 'Limite mensal atingido.',
    guardTitle: '🛡️ Verificação antes do envio',
    urgency: { high: '🔴 Urgente', medium: '🟡 Normal', low: '🟢 Tranquilo' },
    emotion: { angry: '😤 Reclamação', urgent: '⚡ Urgente', neutral: '😊 Normal', positive: '👍 Positivo' },
    promises: '📋 Seus compromissos',
    score: 'Pontuação da resposta', chars: 'caracteres',
    calendarAdd: 'Calendário', taskAdd: 'Tarefa', followup: 'Acompanhamento',
    signature: 'Minha assinatura', sigSave: 'Salvar assinatura', template: 'Modelos', save: 'Salvar',
    shortcut: '⌨️ Alt+G Gerar · Alt+C Copiar · Alt+I Inserir',
    settingsClose: '⚙️ Fechar configurações',
    autoDetect: '🌐 Detecção auto', sigPlaceholder: 'Digite sua assinatura', templatePlaceholder: 'Digite uma frase',
    editDone: '✅ Concluído', refine: '✨ Refinar', refining: '✨ Refinando...',
    refineDone: '✨ Refinado!', refineFailed: 'Refinamento falhou. Tente novamente.',
    refineEmpty: 'Refinamento falhou: resultado vazio.', refineInput: 'Por favor insira o texto para refinar.',
    learnedLabel: 'Aprendido', tonePref: 'pref. de tom', learnedUnit: 'usos',
    styleShort: 'conciso', styleMid: 'moderado', styleLong: 'detalhado',
    sendOriginal: '🌐 Enviar no idioma original',
    newsletter_info: '📧 Detectado como newsletter ou e-mail de marketing.',
    transactional_info: '📧 Detectado como confirmação de pedido ou pagamento.',
  },
  Arabic: {
    tone: 'نبرة الرد', country: 'بلد المرسل', myLang: 'لغتي',
    generate: '✦ توليد رد ذكي', generating: '✦ جارٍ التوليد...',
    compare: '✨ مقارنة الردود', smartReply: '👑 الرد الذكي · Pro',
    summary: '📝 ملخص البريد', summarizing: '📝 جارٍ التلخيص...',
    translate: '🌐 ترجمة إلى لغتي', translating: '🌐 جارٍ الترجمة...', translateClose: '🌐 إغلاق الترجمة',
    tasks: '📌 الإجراءات المكتشفة', settings: '⚙️ الإعدادات',
    insert: '✉️ إدراج في Gmail', copy: '📋 نسخ', regen: '🔄',
    switchLang: 'تغيير:', upgrade: 'ترقية الخطة →',
    limitMsg: 'تم الوصول إلى الحد الشهري.',
    guardTitle: '🛡️ فحص ما قبل الإرسال',
    urgency: { high: '🔴 عاجل', medium: '🟡 عادي', low: '🟢 هادئ' },
    emotion: { angry: '😤 شكوى', urgent: '⚡ عاجل', neutral: '😊 عادي', positive: '👍 إيجابي' },
    promises: '📋 التزاماتك',
    score: 'تقييم الرد', chars: 'حرف',
    calendarAdd: 'إضافة للتقويم', taskAdd: 'إضافة مهمة', followup: 'متابعة',
    signature: 'توقيعي', sigSave: 'حفظ التوقيع', template: 'قوالب', save: 'حفظ',
    shortcut: '⌨️ Alt+G توليد · Alt+C نسخ · Alt+I إدراج',
    settingsClose: '⚙️ إغلاق الإعدادات',
    autoDetect: '🌐 كشف تلقائي', sigPlaceholder: 'أدخل توقيعك', templatePlaceholder: 'أدخل العبارة',
    editDone: '✅ تم', refine: '✨ تحسين', refining: '✨ جارٍ التحسين...',
    refineDone: '✨ تم التحسين!', refineFailed: 'فشل التحسين. يرجى المحاولة مجدداً.',
    refineEmpty: 'فشل التحسين: النتيجة فارغة.', refineInput: 'يرجى إدخال النص للتحسين.',
    learnedLabel: 'تم التعلم', tonePref: 'تفضيل النبرة', learnedUnit: 'مرة',
    styleShort: 'موجز', styleMid: 'متوسط', styleLong: 'مفصل',
    sendOriginal: '🌐 إرسال باللغة الأصلية',
    newsletter_info: '📧 تم الكشف عنه كرسالة إخبارية أو بريد تسويقي.',
    transactional_info: '📧 تم الكشف عنه كتأكيد طلب أو دفع.',
  },
  Spanish: {
    tone: 'Tono de respuesta', country: 'País del remitente', myLang: 'Mi idioma',
    generate: '✦ Generar respuesta IA', generating: '✦ Generando...',
    compare: '✨ Comparar respuestas', smartReply: '👑 Respuesta inteligente · Pro',
    summary: '📝 Resumen del correo', summarizing: '📝 Resumiendo...',
    translate: '🌐 Traducir a mi idioma', translating: '🌐 Traduciendo...', translateClose: '🌐 Cerrar traducción',
    tasks: '📌 Acciones detectadas', settings: '⚙️ Configuración',
    insert: '✉️ Insertar en Gmail', copy: '📋 Copiar', regen: '🔄',
    switchLang: 'Cambiar:', upgrade: 'Actualizar plan →',
    limitMsg: 'Límite mensual alcanzado.',
    guardTitle: '🛡️ Verificación previa al envío',
    urgency: { high: '🔴 Urgente', medium: '🟡 Normal', low: '🟢 Tranquilo' },
    emotion: { angry: '😤 Queja', urgent: '⚡ Urgente', neutral: '😊 Normal', positive: '👍 Positivo' },
    promises: '📋 Tus compromisos',
    score: 'Puntuación de respuesta', chars: 'caracteres',
    calendarAdd: 'Calendario', taskAdd: 'Tarea', followup: 'Seguimiento',
    signature: 'Mi firma', sigSave: 'Guardar firma', template: 'Plantillas', save: 'Guardar',
    shortcut: '⌨️ Alt+G Generar · Alt+C Copiar · Alt+I Insertar',
    settingsClose: '⚙️ Cerrar configuración',
    autoDetect: '🌐 Detección auto', sigPlaceholder: 'Ingrese su firma', templatePlaceholder: 'Ingrese frase',
    editDone: '✅ Listo', refine: '✨ Pulir', refining: '✨ Puliendo...',
    refineDone: '✨ ¡Pulido!', refineFailed: 'Error al pulir. Por favor inténtelo de nuevo.',
    refineEmpty: 'Error al pulir: resultado vacío.', refineInput: 'Por favor ingrese el texto a pulir.',
    learnedLabel: 'Aprendido', tonePref: 'pref. de tono', learnedUnit: 'usos',
    styleShort: 'conciso', styleMid: 'moderado', styleLong: 'detallado',
    sendOriginal: '🌐 Enviar en idioma original',
    newsletter_info: '📧 Detectado como newsletter o email de marketing.',
    transactional_info: '📧 Detectado como confirmación de pedido o pago.',
  },
  Vietnamese: {
    tone: 'Giọng điệu', country: 'Quốc gia người gửi', myLang: 'Ngôn ngữ của tôi',
    generate: '✦ Tạo phản hồi AI', generating: '✦ Đang tạo...',
    compare: '✨ So sánh phản hồi', smartReply: '👑 Phản hồi thông minh · Pro',
    summary: '📝 Tóm tắt email', summarizing: '📝 Đang tóm tắt...',
    translate: '🌐 Dịch sang ngôn ngữ của tôi', translating: '🌐 Đang dịch...', translateClose: '🌐 Đóng bản dịch',
    tasks: '📌 Hành động được phát hiện', settings: '⚙️ Cài đặt',
    insert: '✉️ Chèn vào Gmail', copy: '📋 Sao chép', regen: '🔄',
    switchLang: 'Chuyển đổi:', upgrade: 'Nâng cấp gói →',
    limitMsg: 'Đã đạt giới hạn hàng tháng.',
    guardTitle: '🛡️ Kiểm tra trước khi gửi',
    urgency: { high: '🔴 Khẩn cấp', medium: '🟡 Bình thường', low: '🟢 Thư thả' },
    emotion: { angry: '😤 Khiếu nại', urgent: '⚡ Khẩn cấp', neutral: '😊 Bình thường', positive: '👍 Tích cực' },
    promises: '📋 Cam kết của bạn',
    score: 'Điểm phản hồi', chars: 'ký tự',
    calendarAdd: 'Thêm lịch', taskAdd: 'Thêm nhiệm vụ', followup: 'Theo dõi',
    signature: 'Chữ ký của tôi', sigSave: 'Lưu chữ ký', template: 'Mẫu', save: 'Lưu',
    shortcut: '⌨️ Alt+G Tạo · Alt+C Sao chép · Alt+I Chèn',
    settingsClose: '⚙️ Đóng cài đặt',
    autoDetect: '🌐 Tự động phát hiện', sigPlaceholder: 'Nhập chữ ký của bạn', templatePlaceholder: 'Nhập cụm từ',
    editDone: '✅ Xong', refine: '✨ Tinh chỉnh', refining: '✨ Đang tinh chỉnh...',
    refineDone: '✨ Tinh chỉnh xong!', refineFailed: 'Tinh chỉnh thất bại. Vui lòng thử lại.',
    refineEmpty: 'Tinh chỉnh thất bại: kết quả trống.', refineInput: 'Vui lòng nhập nội dung cần tinh chỉnh.',
    learnedLabel: 'Đã học', tonePref: 'sở thích giọng', learnedUnit: 'lần học',
    styleShort: 'ngắn gọn', styleMid: 'vừa phải', styleLong: 'chi tiết',
    sendOriginal: '🌐 Gửi bằng ngôn ngữ gốc',
    newsletter_info: '📧 Được phát hiện là email bản tin hoặc tiếp thị.',
    transactional_info: '📧 Được phát hiện là email xác nhận đơn hàng hoặc thanh toán.',
  },
  Thai: {
    tone: 'น้ำเสียงการตอบ', country: 'ประเทศของผู้ส่ง', myLang: 'ภาษาของฉัน',
    generate: '✦ สร้างการตอบกลับ AI', generating: '✦ กำลังสร้าง...',
    compare: '✨ เปรียบเทียบการตอบกลับ', smartReply: '👑 ตอบกลับอัจฉริยะ · Pro',
    summary: '📝 สรุปอีเมล', summarizing: '📝 กำลังสรุป...',
    translate: '🌐 แปลเป็นภาษาของฉัน', translating: '🌐 กำลังแปล...', translateClose: '🌐 ปิดการแปล',
    tasks: '📌 การดำเนินการที่ตรวจพบ', settings: '⚙️ การตั้งค่า',
    insert: '✉️ แทรกใน Gmail', copy: '📋 คัดลอก', regen: '🔄',
    switchLang: 'เปลี่ยนภาษา:', upgrade: 'อัปเกรดแผน →',
    limitMsg: 'ถึงขีดจำกัดรายเดือนแล้ว',
    guardTitle: '🛡️ ตรวจสอบก่อนส่ง',
    urgency: { high: '🔴 เร่งด่วน', medium: '🟡 ปกติ', low: '🟢 ผ่อนคลาย' },
    emotion: { angry: '😤 ร้องเรียน', urgent: '⚡ เร่งด่วน', neutral: '😊 ปกติ', positive: '👍 เชิงบวก' },
    promises: '📋 ข้อผูกพันของคุณ',
    score: 'คะแนนการตอบกลับ', chars: 'ตัวอักษร',
    calendarAdd: 'เพิ่มในปฏิทิน', taskAdd: 'เพิ่มงาน', followup: 'ติดตาม',
    signature: 'ลายเซ็นของฉัน', sigSave: 'บันทึกลายเซ็น', template: 'เทมเพลต', save: 'บันทึก',
    shortcut: '⌨️ Alt+G สร้าง · Alt+C คัดลอก · Alt+I แทรก',
    settingsClose: '⚙️ ปิดการตั้งค่า',
    autoDetect: '🌐 ตรวจจับอัตโนมัติ', sigPlaceholder: 'ป้อนลายเซ็นของคุณ', templatePlaceholder: 'ป้อนวลี',
    editDone: '✅ เสร็จสิ้น', refine: '✨ ปรับแต่ง', refining: '✨ กำลังปรับแต่ง...',
    refineDone: '✨ ปรับแต่งเสร็จแล้ว!', refineFailed: 'การปรับแต่งล้มเหลว กรุณาลองอีกครั้ง',
    refineEmpty: 'การปรับแต่งล้มเหลว: ผลลัพธ์ว่างเปล่า', refineInput: 'กรุณาป้อนข้อความที่ต้องการปรับแต่ง',
    learnedLabel: 'เรียนรู้แล้ว', tonePref: 'ความชอบโทน', learnedUnit: 'ครั้ง',
    styleShort: 'กระชับ', styleMid: 'ปานกลาง', styleLong: 'ละเอียด',
    sendOriginal: '🌐 ส่งในภาษาต้นฉบับ',
    newsletter_info: '📧 ตรวจพบว่าเป็นอีเมลข่าวสารหรือการตลาด',
    transactional_info: '📧 ตรวจพบว่าเป็นอีเมลยืนยันคำสั่งซื้อหรือการชำระเงิน',
  },
  Indonesian: {
    tone: 'Nada balasan', country: 'Negara pengirim', myLang: 'Bahasa saya',
    generate: '✦ Buat balasan AI', generating: '✦ Membuat...',
    compare: '✨ Bandingkan balasan', smartReply: '👑 Balasan cerdas · Pro',
    summary: '📝 Ringkasan email', summarizing: '📝 Meringkas...',
    translate: '🌐 Terjemahkan ke bahasa saya', translating: '🌐 Menerjemahkan...', translateClose: '🌐 Tutup terjemahan',
    tasks: '📌 Tindakan terdeteksi', settings: '⚙️ Pengaturan',
    insert: '✉️ Sisipkan ke Gmail', copy: '📋 Salin', regen: '🔄',
    switchLang: 'Ganti bahasa:', upgrade: 'Upgrade paket →',
    limitMsg: 'Batas bulanan tercapai.',
    guardTitle: '🛡️ Pemeriksaan sebelum kirim',
    urgency: { high: '🔴 Mendesak', medium: '🟡 Normal', low: '🟢 Santai' },
    emotion: { angry: '😤 Keluhan', urgent: '⚡ Mendesak', neutral: '😊 Normal', positive: '👍 Positif' },
    promises: '📋 Komitmen Anda',
    score: 'Skor balasan', chars: 'karakter',
    calendarAdd: 'Tambah kalender', taskAdd: 'Tambah tugas', followup: 'Tindak lanjut',
    signature: 'Tanda tangan saya', sigSave: 'Simpan tanda tangan', template: 'Template', save: 'Simpan',
    shortcut: '⌨️ Alt+G Buat · Alt+C Salin · Alt+I Sisipkan',
    settingsClose: '⚙️ Tutup pengaturan',
    autoDetect: '🌐 Deteksi otomatis', sigPlaceholder: 'Masukkan tanda tangan Anda', templatePlaceholder: 'Masukkan frasa',
    editDone: '✅ Selesai', refine: '✨ Perhalus', refining: '✨ Memperhalus...',
    refineDone: '✨ Diperhalus!', refineFailed: 'Gagal memperhalus. Silakan coba lagi.',
    refineEmpty: 'Gagal memperhalus: hasil kosong.', refineInput: 'Silakan masukkan teks yang ingin diperhalus.',
    learnedLabel: 'Dipelajari', tonePref: 'pref. nada', learnedUnit: 'kali',
    styleShort: 'ringkas', styleMid: 'sedang', styleLong: 'rinci',
    sendOriginal: '🌐 Kirim dalam bahasa asli',
    newsletter_info: '📧 Terdeteksi sebagai email buletin atau pemasaran.',
    transactional_info: '📧 Terdeteksi sebagai email konfirmasi pesanan atau pembayaran.',
  },
  Italian: {
    tone: 'Tono di risposta', country: 'Paese del mittente', myLang: 'La mia lingua',
    generate: '✦ Genera risposta AI', generating: '✦ Generazione...',
    compare: '✨ Confronta risposte', smartReply: '👑 Risposta intelligente · Pro',
    summary: '📝 Riepilogo email', summarizing: '📝 Riepilogando...',
    translate: '🌐 Traduci nella mia lingua', translating: '🌐 Traduzione...', translateClose: '🌐 Chiudi traduzione',
    tasks: '📌 Azioni rilevate', settings: '⚙️ Impostazioni',
    insert: '✉️ Inserisci in Gmail', copy: '📋 Copia', regen: '🔄',
    switchLang: 'Cambia lingua:', upgrade: 'Aggiorna piano →',
    limitMsg: 'Limite mensile raggiunto.',
    guardTitle: '🛡️ Controllo pre-invio',
    urgency: { high: '🔴 Urgente', medium: '🟡 Normale', low: '🟢 Tranquillo' },
    emotion: { angry: '😤 Reclamo', urgent: '⚡ Urgente', neutral: '😊 Normale', positive: '👍 Positivo' },
    promises: '📋 I tuoi impegni',
    score: 'Punteggio risposta', chars: 'caratteri',
    calendarAdd: 'Aggiungi al calendario', taskAdd: 'Aggiungi attività', followup: 'Seguito',
    signature: 'La mia firma', sigSave: 'Salva firma', template: 'Modelli', save: 'Salva',
    shortcut: '⌨️ Alt+G Genera · Alt+C Copia · Alt+I Inserisci',
    settingsClose: '⚙️ Chiudi impostazioni',
    autoDetect: '🌐 Rilevamento auto', sigPlaceholder: 'Inserisci la tua firma', templatePlaceholder: 'Inserisci una frase',
    editDone: '✅ Fatto', refine: '✨ Raffina', refining: '✨ Raffinando...',
    refineDone: '✨ Raffinato!', refineFailed: 'Raffinamento fallito. Si prega di riprovare.',
    refineEmpty: 'Raffinamento fallito: risultato vuoto.', refineInput: 'Inserisci il testo da raffinare.',
    learnedLabel: 'Appreso', tonePref: 'pref. di tono', learnedUnit: 'usi',
    styleShort: 'conciso', styleMid: 'moderato', styleLong: 'dettagliato',
    sendOriginal: '🌐 Invia in lingua originale',
    newsletter_info: '📧 Rilevato come newsletter o email di marketing.',
    transactional_info: '📧 Rilevato come conferma ordine o pagamento.',
  },
  Turkish: {
    tone: 'Yanıt tonu', country: 'Gönderenin ülkesi', myLang: 'Dilim',
    generate: '✦ AI yanıtı oluştur', generating: '✦ Oluşturuluyor...',
    compare: '✨ Yanıtları karşılaştır', smartReply: '👑 Akıllı yanıt · Pro',
    summary: '📝 E-posta özeti', summarizing: '📝 Özetleniyor...',
    translate: '🌐 Kendi dilime çevir', translating: '🌐 Çeviriliyor...', translateClose: '🌐 Çeviriyi kapat',
    tasks: '📌 Tespit edilen eylemler', settings: '⚙️ Ayarlar',
    insert: '✉️ Gmail\'e ekle', copy: '📋 Kopyala', regen: '🔄',
    switchLang: 'Dil değiştir:', upgrade: 'Planı yükselt →',
    limitMsg: 'Aylık limite ulaşıldı.',
    guardTitle: '🛡️ Göndermeden önce kontrol',
    urgency: { high: '🔴 Acil', medium: '🟡 Normal', low: '🟢 Rahat' },
    emotion: { angry: '😤 Şikayet', urgent: '⚡ Acil', neutral: '😊 Normal', positive: '👍 Olumlu' },
    promises: '📋 Taahhütleriniz',
    score: 'Yanıt puanı', chars: 'karakter',
    calendarAdd: 'Takvime ekle', taskAdd: 'Görev ekle', followup: 'Takip',
    signature: 'İmzam', sigSave: 'İmzayı kaydet', template: 'Şablonlar', save: 'Kaydet',
    shortcut: '⌨️ Alt+G Oluştur · Alt+C Kopyala · Alt+I Ekle',
    settingsClose: '⚙️ Ayarları kapat',
    autoDetect: '🌐 Otomatik Algıla', sigPlaceholder: 'İmzanızı girin', templatePlaceholder: 'Cümle girin',
    editDone: '✅ Tamam', refine: '✨ İyileştir', refining: '✨ İyileştiriliyor...',
    refineDone: '✨ İyileştirildi!', refineFailed: 'İyileştirme başarısız. Lütfen tekrar deneyin.',
    refineEmpty: 'İyileştirme başarısız: sonuç boş.', refineInput: 'Lütfen iyileştirilecek metni girin.',
    learnedLabel: 'Öğrenildi', tonePref: 'ton tercihi', learnedUnit: 'öğrenme',
    styleShort: 'özlü', styleMid: 'orta', styleLong: 'ayrıntılı',
    sendOriginal: '🌐 Orijinal dilde gönder',
    newsletter_info: '📧 Bülten veya pazarlama e-postası olarak tespit edildi.',
    transactional_info: '📧 Sipariş veya ödeme onay e-postası olarak tespit edildi.',
  },
  Dutch: {
    tone: 'Antwoordtoon', country: 'Land van afzender', myLang: 'Mijn taal',
    generate: '✦ AI-antwoord genereren', generating: '✦ Genereren...',
    compare: '✨ Antwoorden vergelijken', smartReply: '👑 Slim antwoord · Pro',
    summary: '📝 E-mailsamenvatting', summarizing: '📝 Samenvatten...',
    translate: '🌐 Vertaal naar mijn taal', translating: '🌐 Vertalen...', translateClose: '🌐 Vertaling sluiten',
    tasks: '📌 Gedetecteerde acties', settings: '⚙️ Instellingen',
    insert: '✉️ Invoegen in Gmail', copy: '📋 Kopiëren', regen: '🔄',
    switchLang: 'Taal wijzigen:', upgrade: 'Plan upgraden →',
    limitMsg: 'Maandlimiet bereikt.',
    guardTitle: '🛡️ Controle voor verzending',
    urgency: { high: '🔴 Urgent', medium: '🟡 Normaal', low: '🟢 Rustig' },
    emotion: { angry: '😤 Klacht', urgent: '⚡ Urgent', neutral: '😊 Normaal', positive: '👍 Positief' },
    promises: '📋 Uw toezeggingen',
    score: 'Antwoordscore', chars: 'tekens',
    calendarAdd: 'Agenda', taskAdd: 'Taak toevoegen', followup: 'Opvolging',
    signature: 'Mijn handtekening', sigSave: 'Handtekening opslaan', template: 'Sjablonen', save: 'Opslaan',
    shortcut: '⌨️ Alt+G Genereren · Alt+C Kopiëren · Alt+I Invoegen',
    settingsClose: '⚙️ Instellingen sluiten',
    autoDetect: '🌐 Automatisch detecteren', sigPlaceholder: 'Voer uw handtekening in', templatePlaceholder: 'Voer zin in',
    editDone: '✅ Klaar', refine: '✨ Verfijnen', refining: '✨ Verfijnen...',
    refineDone: '✨ Verfijnd!', refineFailed: 'Verfijnen mislukt. Probeer opnieuw.',
    refineEmpty: 'Verfijnen mislukt: leeg resultaat.', refineInput: 'Voer de te verfijnen tekst in.',
    learnedLabel: 'Geleerd', tonePref: 'toonvoorkeur', learnedUnit: 'keer',
    styleShort: 'beknopt', styleMid: 'matig', styleLong: 'gedetailleerd',
    sendOriginal: '🌐 Versturen in oorspronkelijke taal',
    newsletter_info: '📧 Gedetecteerd als nieuwsbrief of marketing-e-mail.',
    transactional_info: '📧 Gedetecteerd als orderbevestiging of betalingsbevestiging.',
  },
  Polish: {
    tone: 'Ton odpowiedzi', country: 'Kraj nadawcy', myLang: 'Mój język',
    generate: '✦ Generuj odpowiedź AI', generating: '✦ Generowanie...',
    compare: '✨ Porównaj odpowiedzi', smartReply: '👑 Inteligentna odpowiedź · Pro',
    summary: '📝 Podsumowanie e-maila', summarizing: '📝 Podsumowywanie...',
    translate: '🌐 Przetłumacz na mój język', translating: '🌐 Tłumaczenie...', translateClose: '🌐 Zamknij tłumaczenie',
    tasks: '📌 Wykryte działania', settings: '⚙️ Ustawienia',
    insert: '✉️ Wstaw do Gmail', copy: '📋 Kopiuj', regen: '🔄',
    switchLang: 'Zmień język:', upgrade: 'Ulepsz plan →',
    limitMsg: 'Osiągnięto miesięczny limit.',
    guardTitle: '🛡️ Sprawdzenie przed wysłaniem',
    urgency: { high: '🔴 Pilne', medium: '🟡 Normalne', low: '🟢 Spokojne' },
    emotion: { angry: '😤 Skarga', urgent: '⚡ Pilne', neutral: '😊 Normalne', positive: '👍 Pozytywne' },
    promises: '📋 Twoje zobowiązania',
    score: 'Ocena odpowiedzi', chars: 'znaki',
    calendarAdd: 'Kalendarz', taskAdd: 'Dodaj zadanie', followup: 'Kontynuacja',
    signature: 'Mój podpis', sigSave: 'Zapisz podpis', template: 'Szablony', save: 'Zapisz',
    shortcut: '⌨️ Alt+G Generuj · Alt+C Kopiuj · Alt+I Wstaw',
    settingsClose: '⚙️ Zamknij ustawienia',
    autoDetect: '🌐 Automatyczne wykrywanie', sigPlaceholder: 'Wprowadź swój podpis', templatePlaceholder: 'Wprowadź frazę',
    editDone: '✅ Gotowe', refine: '✨ Dopracuj', refining: '✨ Dopracowywanie...',
    refineDone: '✨ Dopracowano!', refineFailed: 'Dopracowanie nieudane. Spróbuj ponownie.',
    refineEmpty: 'Dopracowanie nieudane: pusty wynik.', refineInput: 'Proszę wprowadzić tekst do dopracowania.',
    learnedLabel: 'Nauczono', tonePref: 'pref. tonu', learnedUnit: 'nauki',
    styleShort: 'zwięzły', styleMid: 'umiarkowany', styleLong: 'szczegółowy',
    sendOriginal: '🌐 Wyślij w oryginalnym języku',
    newsletter_info: '📧 Wykryto jako newsletter lub e-mail marketingowy.',
    transactional_info: '📧 Wykryto jako potwierdzenie zamówienia lub płatności.',
  },
  Hindi: {
    tone: 'जवाब का स्वर', country: 'प्रेषक का देश', myLang: 'मेरी भाषा',
    generate: '✦ AI जवाब बनाएं', generating: '✦ बना रहे हैं...',
    compare: '✨ जवाब की तुलना करें', smartReply: '👑 स्मार्ट जवाब · Pro',
    summary: '📝 ईमेल सारांश', summarizing: '📝 सारांश बना रहे हैं...',
    translate: '🌐 मेरी भाषा में अनुवाद', translating: '🌐 अनुवाद हो रहा है...', translateClose: '🌐 अनुवाद बंद करें',
    tasks: '📌 पता लगाई गई क्रियाएं', settings: '⚙️ सेटिंग्स',
    insert: '✉️ Gmail में डालें', copy: '📋 कॉपी करें', regen: '🔄',
    switchLang: 'भाषा बदलें:', upgrade: 'प्लान अपग्रेड करें →',
    limitMsg: 'मासिक सीमा पहुंच गई।',
    guardTitle: '🛡️ भेजने से पहले जांच',
    urgency: { high: '🔴 जरूरी', medium: '🟡 सामान्य', low: '🟢 आराम' },
    emotion: { angry: '😤 शिकायत', urgent: '⚡ जरूरी', neutral: '😊 सामान्य', positive: '👍 सकारात्मक' },
    promises: '📋 आपकी प्रतिबद्धताएं',
    score: 'जवाब का स्कोर', chars: 'अक्षर',
    calendarAdd: 'कैलेंडर', taskAdd: 'कार्य जोड़ें', followup: 'अनुवर्ती',
    signature: 'मेरा हस्ताक्षर', sigSave: 'हस्ताक्षर सहेजें', template: 'टेम्पलेट', save: 'सहेजें',
    shortcut: '⌨️ Alt+G बनाएं · Alt+C कॉपी · Alt+I डालें',
    settingsClose: '⚙️ सेटिंग्स बंद करें',
    autoDetect: '🌐 स्वतः पहचान', sigPlaceholder: 'अपना हस्ताक्षर दर्ज करें', templatePlaceholder: 'वाक्यांश दर्ज करें',
    editDone: '✅ हो गया', refine: '✨ परिष्कृत करें', refining: '✨ परिष्कृत हो रहा है...',
    refineDone: '✨ परिष्कृत हो गया!', refineFailed: 'परिष्करण विफल। कृपया फिर से प्रयास करें।',
    refineEmpty: 'परिष्करण विफल: परिणाम खाली है।', refineInput: 'कृपया परिष्कृत करने के लिए पाठ दर्ज करें।',
    learnedLabel: 'सीखा गया', tonePref: 'स्वर पसंद', learnedUnit: 'बार',
    styleShort: 'संक्षिप्त', styleMid: 'मध्यम', styleLong: 'विस्तृत',
    sendOriginal: '🌐 मूल भाषा में भेजें',
    newsletter_info: '📧 न्यूज़लेटर या मार्केटिंग ईमेल के रूप में पहचाना गया।',
    transactional_info: '📧 ऑर्डर या भुगतान पुष्टि ईमेल के रूप में पहचाना गया।',
  },
};


// 감정/긴급도 감지
function detectEmotion(text) {
  const t = text.toLowerCase();

  // ★ 공지/안내 이메일 패턴 — 긴급/불만 감지에서 제외
  const isNoticeEmail = /안내\s*드립니다|공지\s*사항|운영\s*전환|완료\s*안내|조치사항|사전\s*준비|환경설정|notice|announcement|we are pleased to inform|please be informed|this is to notify|update notice|system notice/i.test(text);

  // ★ 발신자가 사과하는 패턴 (내가 사과할 필요 없음)
  const senderApologizing = /we apologize|we are sorry|we sincerely apologize|저희가 사과|죄송합니다.*저희|불편을 드려|we regret|please accept our apologies/i.test(text);

  const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency',
    '긴급합니다', '빨리', '급합니다', '즉각', 'dringend', 'sofort',
    '至急', '緊急', 'عاجل'];

  // 긴급 단어가 있어도 공지 이메일이면 긴급으로 보지 않음
  const urgentMatched = !isNoticeEmail && urgentWords.some(w => t.includes(w));

  // 마감일은 명확한 액션 요청일 때만 긴급
  const deadlineUrgent = !isNoticeEmail && /deadline|due date|by end of (today|tomorrow)|마감.*오늘|오늘.*마감/i.test(text);

  const angryWords = ['disappointed', 'unacceptable', 'frustrated',
    '실망', '불만', '항의', 'enttäuscht', 'inacceptable', 'déçu',
    '失望', '不満', 'خيبة أمل'];

  const positiveWords = ['thank', 'great', 'excellent', 'appreciate', 'happy', 'pleased',
    '감사', '좋습니다', '훌륭', 'danke', 'merci', 'obrigado', 'gracias',
    'ありがとう', '谢谢', 'شكرا'];

  let urgency = 'low', emotion = 'neutral';

  if (urgentMatched || deadlineUrgent) urgency = 'high';
  else if (!isNoticeEmail && (t.includes('please') || t.includes('could you') || t.includes('would you'))) urgency = 'medium';

  if (!isNoticeEmail && angryWords.some(w => t.includes(w))) emotion = 'angry';
  else if (urgentMatched) emotion = 'urgent';
  else if (positiveWords.some(w => t.includes(w))) emotion = 'positive';

  return { urgency, emotion, isNoticeEmail, senderApologizing };
}


// 약속 추출
function extractPromises(text, lang) {
  const promises = [];
  // 언어별 약속 패턴
  const PROMISE_PATTERNS = {
    Korean:     [/확인하겠습니다/gi, /보내드리겠습니다/gi, /연락드리겠습니다/gi, /검토하겠습니다/gi, /준비하겠습니다/gi, /처리하겠습니다/gi],
    English:    [/i will (.{5,50})/gi, /we will (.{5,50})/gi, /i'll (.{5,50})/gi, /we'll (.{5,50})/gi, /will send (.{5,50})/gi, /will prepare (.{5,50})/gi],
    Japanese:   [/お送りします/gi, /ご連絡します/gi, /確認いたします/gi, /準備いたします/gi, /いたします/gi],
    Chinese:    [/发送给您/gi, /确认一下/gi, /我会发送/gi, /我将准备/gi, /我会确认/gi],
    German:     [/werde senden/gi, /werde bestätigen/gi, /werde vorbereiten/gi, /ich werde (.{5,50})/gi],
    French:     [/enverrai/gi, /confirmerai/gi, /préparerai/gi, /je vais (.{5,50})/gi, /nous allons (.{5,50})/gi],
    Portuguese: [/enviarei/gi, /confirmarei/gi, /prepararei/gi, /vou (.{5,50})/gi, /iremos (.{5,50})/gi],
    Spanish:    [/enviaré/gi, /confirmaré/gi, /prepararé/gi, /voy a (.{5,50})/gi, /enviaremos (.{5,50})/gi],
    Turkish:    [/göndereceğim/gi, /hazırlayacağım/gi, /onaylayacağım/gi, /ileteceğim/gi],
    Italian:    [/invierò/gi, /confermerò/gi, /preparerò/gi, /provvederò/gi],
    Arabic:     [/سأرسل/gi, /سأؤكد/gi, /سأحضّر/gi, /سنقوم/gi],
    Vietnamese: [/tôi sẽ gửi/gi, /tôi sẽ xác nhận/gi, /chúng tôi sẽ/gi],
    Thai:       [/จะส่ง/gi, /จะยืนยัน/gi, /จะเตรียม/gi],
    Indonesian: [/akan mengirim/gi, /akan mengkonfirmasi/gi, /akan menyiapkan/gi, /saya akan (.{5,50})/gi],
  };
  const patterns = PROMISE_PATTERNS[lang] || PROMISE_PATTERNS['English'];
  patterns.forEach(p => {
    const matches = text.match(p);
    if (matches) promises.push(...matches.slice(0, 2));
  });
  return [...new Set(promises)].slice(0, 3);
}


// 브라우저 언어 → MailMind 언어명 매핑
function detectBrowserLang() {
  const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase().split('-')[0];
  const navMap = {
    'ko': 'Korean', 'ja': 'Japanese', 'zh': 'Chinese',
    'de': 'German', 'fr': 'French', 'pt': 'Portuguese',
    'ar': 'Arabic', 'es': 'Spanish', 'vi': 'Vietnamese',
    'th': 'Thai', 'id': 'Indonesian', 'it': 'Italian',
    'tr': 'Turkish', 'nl': 'Dutch', 'pl': 'Polish', 'hi': 'Hindi',
  };
  return navMap[nav] || 'English';
}

// 현재 UI 언어 가져오기
function getUILang(myLang) {
  const resolved = (myLang === 'auto') ? detectBrowserLang() : myLang;
  const map = {
    'Korean': 'Korean', 'English': 'English', 'Japanese': 'Japanese',
    'Chinese': 'Chinese', 'German': 'German', 'French': 'French',
    'Portuguese': 'Portuguese', 'Arabic': 'Arabic', 'Spanish': 'Spanish',
    'Vietnamese': 'Vietnamese', 'Thai': 'Thai', 'Indonesian': 'Indonesian',
    'Italian': 'Italian', 'Turkish': 'Turkish', 'Dutch': 'Dutch',
    'Polish': 'Polish', 'Hindi': 'Hindi',
  };
  return UI_STRINGS[map[resolved]] || UI_STRINGS['English'];
}

const WORKER_URL = 'https://mailmind-api.kimdh4790.workers.dev';

// 서명·템플릿 인메모리 캐시 (extension context 재로드 시에도 유지)
let _cachedSignature = '';
let _cachedTemplates = [];

// ★ Extension context 무효화 안전 래퍼
function safeStorageSet(data) {
  try { if (chrome?.runtime?.id) chrome.storage.sync.set(data); } catch(e) {}
}
function safeStorageGet(keys, cb) {
  try { if (chrome?.runtime?.id) chrome.storage.sync.get(keys, cb); else cb({}); } catch(e) { cb({}); }
}
function safeStorageLocalGet(keys, cb) {
  try { if (chrome?.runtime?.id) chrome.storage.local.get(keys, cb); else cb({}); } catch(e) { cb({}); }
}
function safeStorageLocalSet(data) {
  try { if (chrome?.runtime?.id) chrome.storage.local.set(data); } catch(e) {}
}

const PLANS = {
  free:  { monthly: 35,  label: '무료' },
  basic: { monthly: 200, label: 'Basic' },
  pro:   { monthly: 300, label: 'Pro' }
};

const TONES_I18N = {
  Korean:     ['업무적','친근하게','간결하게','상세하게','거절하기','감사하게','사과하기','확인하기'],
  English:    ['Professional','Friendly','Concise','Detailed','Decline','Thankful','Apologetic','Acknowledge'],
  Japanese:   ['ビジネス','フレンドリー','簡潔に','詳しく','お断り','感謝','お詫び','確認'],
  Chinese:    ['专业','友好','简洁','详细','拒绝','感谢','道歉','确认'],
  German:     ['Professionell','Freundlich','Prägnant','Detailliert','Ablehnen','Dankend','Entschuldigend','Bestätigend'],
  French:     ['Professionnel','Amical','Concis','Détaillé','Refus','Reconnaissant','Apologétique','Accusé'],
  Portuguese: ['Profissional','Amigável','Conciso','Detalhado','Recusar','Grato','Apologético','Confirmar'],
  Arabic:     ['احترافي','ودي','موجز','مفصل','رفض','شكر','اعتذار','تأكيد'],
  Spanish:    ['Profesional','Amigable','Conciso','Detallado','Rechazar','Agradecido','Disculpa','Confirmar'],
  Turkish:    ['Profesyonel','Samimi','Kısa','Detaylı','Reddet','Teşekkür','Özür','Onayla'],
  Italian:    ['Professionale','Amichevole','Conciso','Dettagliato','Rifiuto','Grato','Scuse','Conferma'],
  Vietnamese: ['Chuyên nghiệp','Thân thiện','Ngắn gọn','Chi tiết','Từ chối','Cảm ơn','Xin lỗi','Xác nhận'],
  Thai:       ['เป็นมืออาชีพ','เป็นกันเอง','กระชับ','ละเอียด','ปฏิเสธ','ขอบคุณ','ขอโทษ','ยืนยัน'],
  Indonesian: ['Profesional','Ramah','Singkat','Rinci','Menolak','Berterima kasih','Meminta maaf','Konfirmasi'],
};
const TONE_KEYS = ['professional','friendly','concise','detailed','decline','thankful','apologetic','acknowledge'];

// ── 언어별 존댓말(Honorific) 옵션 ──────────────────────────────────────────
// formal = 가장 격식체 / polite = 표준 공손체 / casual = 친근한 반말
const HONORIFIC_OPTIONS = {
  Korean:     [ { v:'formal', l:'하십시오체' }, { v:'polite', l:'해요체' },    { v:'casual', l:'해체·반말' } ],
  Japanese:   [ { v:'formal', l:'敬語' },       { v:'polite', l:'丁寧語' },    { v:'casual', l:'タメ口' } ],
  Chinese:    [ { v:'formal', l:'正式' },        { v:'polite', l:'礼貌' },      { v:'casual', l:'口语' } ],
  German:     [ { v:'formal', l:'Sie' },         { v:'polite', l:'Höflich' },   { v:'casual', l:'Du' } ],
  French:     [ { v:'formal', l:'Vous' },        { v:'polite', l:'Poli' },      { v:'casual', l:'Tu' } ],
  Spanish:    [ { v:'formal', l:'Usted' },       { v:'polite', l:'Cortés' },    { v:'casual', l:'Tú' } ],
  Portuguese: [ { v:'formal', l:'O Senhor/a' },  { v:'polite', l:'Você' },      { v:'casual', l:'Tu' } ],
  Italian:    [ { v:'formal', l:'Lei' },         { v:'polite', l:'Gentile' },   { v:'casual', l:'Tu' } ],
  Arabic:     [ { v:'formal', l:'رسمي' },        { v:'polite', l:'مهذب' },      { v:'casual', l:'عامي' } ],
  Vietnamese: [ { v:'formal', l:'Quý vị' },      { v:'polite', l:'Bạn' },       { v:'casual', l:'Mày/Tao' } ],
  Thai:       [ { v:'formal', l:'ราชาศัพท์' },   { v:'polite', l:'สุภาพ' },     { v:'casual', l:'ทั่วไป' } ],
  Indonesian: [ { v:'formal', l:'Formal' },      { v:'polite', l:'Sopan' },     { v:'casual', l:'Santai' } ],
  Turkish:    [ { v:'formal', l:'Siz' },         { v:'polite', l:'Nazik' },     { v:'casual', l:'Sen' } ],
  Dutch:      [ { v:'formal', l:'U' },           { v:'polite', l:'Beleefd' },   { v:'casual', l:'Jij' } ],
  Polish:     [ { v:'formal', l:'Pan/Pani' },    { v:'polite', l:'Uprzejmy' },  { v:'casual', l:'Ty' } ],
  Hindi:      [ { v:'formal', l:'आप' },          { v:'polite', l:'तुम' },        { v:'casual', l:'तू' } ],
  Hebrew:     [ { v:'formal', l:'רשמי' },        { v:'polite', l:'מנומס' },     { v:'casual', l:'סלנג' } ],
  Malay:      [ { v:'formal', l:'Formal' },      { v:'polite', l:'Sopan' },     { v:'casual', l:'Santai' } ],
  English:    [ { v:'formal', l:'Formal' },      { v:'polite', l:'Polite' },    { v:'casual', l:'Casual' } ],
};

function getHonorificOptions(lang) {
  const opts = HONORIFIC_OPTIONS[lang] || HONORIFIC_OPTIONS['English'];
  return opts.map(o => `<option value="${o.v}">${o.l}</option>`).join('');
}

function getToneLabel(toneKey, lang) {
  const labels = TONES_I18N[lang] || TONES_I18N['English'];
  const idx = TONE_KEYS.indexOf(toneKey);
  return idx >= 0 ? labels[idx] : toneKey;
}

function getToneOptions(lang) {
  const labels = TONES_I18N[lang] || TONES_I18N['English'];
  return TONE_KEYS.map((key, i) => `<option value="${key}">${labels[i]}</option>`).join('');
}

const LANGUAGES = [
  { value: 'auto',       label: '🌐 Auto Detect' },
  { value: 'Korean',     label: '🇰🇷 한국어' },
  { value: 'English',    label: '🇺🇸 English' },
  { value: 'Japanese',   label: '🇯🇵 日本語' },
  { value: 'Chinese',    label: '🇨🇳 中文' },
  { value: 'Spanish',    label: '🇪🇸 Español' },
  { value: 'German',     label: '🇩🇪 Deutsch' },
  { value: 'Portuguese', label: '🇧🇷 Português' },
  { value: 'Arabic',     label: '🇸🇦 العربية' },
  { value: 'French',     label: '🇫🇷 Français' },
  { value: 'Italian',    label: '🇮🇹 Italiano' },
  { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
  { value: 'Thai',       label: '🇹🇭 ภาษาไทย' },
  { value: 'Indonesian', label: '🇮🇩 Bahasa Indonesia' },
  { value: 'Dutch',      label: '🇳🇱 Nederlands' },
  { value: 'Polish',     label: '🇵🇱 Polski' },
  { value: 'Turkish',    label: '🇹🇷 Türkçe' },
  { value: 'Hindi',      label: '🇮🇳 हिन्दी' },
];


const COUNTRIES = [
  { value: 'auto',       label: '🌐 Auto Detect' },
  { value: 'Korean',     label: '🇰🇷 Korea' },
  { value: 'English',    label: '🇺🇸 USA' },
  { value: 'Japanese',   label: '🇯🇵 Japan' },
  { value: 'Chinese',    label: '🇨🇳 China' },
  { value: 'Spanish',    label: '🇪🇸 Spain' },
  { value: 'German',     label: '🇩🇪 Germany' },
  { value: 'Portuguese', label: '🇧🇷 Brazil' },
  { value: 'Arabic',     label: '🇸🇦 Saudi Arabia' },
  { value: 'French',     label: '🇫🇷 France' },
  { value: 'Italian',    label: '🇮🇹 Italy' },
  { value: 'Vietnamese', label: '🇻🇳 Vietnam' },
  { value: 'Thai',       label: '🇹🇭 Thailand' },
  { value: 'Indonesian', label: '🇮🇩 Indonesia' },
  { value: 'Dutch',      label: '🇳🇱 Netherlands' },
  { value: 'Polish',     label: '🇵🇱 Poland' },
  { value: 'Turkish',    label: '🇹🇷 Turkey' },
  { value: 'Hindi',      label: '🇮🇳 India' },
];

let selectedTone = 'professional';
let selectedHonorific = 'polite';
let selectedCountry = 'auto';
let selectedMyLang = 'Korean';
const resolveAutoLang = l => l === 'auto' ? 'English' : l;

// 이메일 내용으로 발신자 국가 자동감지
function autoDetectCountry(emailContent) {
  if (!emailContent) return null;
  const text = emailContent.toLowerCase();
  // 발신자 이메일 도메인 추출
  const emailMatch = emailContent.match(/from:.*?@([\w.-]+)/i) || emailContent.match(/<([\w._%+-]+@[\w.-]+\.[a-z]{2,})>/i);
  const domain = emailMatch ? emailMatch[1].toLowerCase() : '';

  // 도메인 기반 감지
  if (domain.endsWith('.jp') || domain.includes('rakuten') || domain.includes('softbank') || domain.includes('docomo')) return 'Japanese';
  if (domain.endsWith('.cn') || domain.endsWith('.com.cn') || domain.includes('alibaba') || domain.includes('tencent') || domain.includes('baidu')) return 'Chinese';
  if (domain.endsWith('.de') || domain.endsWith('.at') || domain.endsWith('.ch')) return 'German';
  if (domain.endsWith('.fr')) return 'French';
  if (domain.endsWith('.br') || domain.endsWith('.com.br')) return 'Portuguese';
  if (domain.endsWith('.sa') || domain.endsWith('.ae') || domain.endsWith('.qa') || domain.endsWith('.kw')) return null;
  if (domain.endsWith('.kr') || domain.endsWith('.co.kr')) return 'Korean';
  if (domain.endsWith('.us') || domain.endsWith('.gov') || domain.endsWith('.edu')) return 'English';

  // 텍스트 언어 기반 감지
  const jaCount = (text.match(/[぀-ヿ]/g) || []).length;
  const zhCount = (text.match(/[一-鿿]/g) || []).length;
  const koCount = (text.match(/[가-힯]/g) || []).length;
  const arCount = (text.match(/[؀-ۿ]/g) || []).length;
  const deWords = (text.match(/\b(sehr geehrte|mit freundlichen|herzlichen|bitte|danke|vielen)\b/g) || []).length;
  const frWords = (text.match(/\b(bonjour|merci|cordialement|madame|monsieur|veuillez)\b/g) || []).length;
  const ptWords = (text.match(/\b(olá|obrigado|prezado|atenciosamente|por favor)\b/g) || []).length;
  const enWords = (text.match(/\b(dear|regards|sincerely|hello|please|thank you|best)\b/g) || []).length;

  if (jaCount > 2) return 'Japanese';
  if (zhCount > 2 && jaCount < 3) return 'Chinese';
  if (koCount > 0) return 'Korean';
  if (arCount > 2) return null;
  if (deWords >= 1) return 'German';
  if (frWords >= 1) return 'French';
  if (ptWords >= 1) return 'Portuguese';
  if (enWords >= 1) return 'English';

  // ASCII 비율 85% 이상이면 영어권으로 판단
  const cleanText = emailContent.replace(/\s+/g, '');
  const asciiRatio = (cleanText.match(/[\x20-\x7E]/g) || []).length / (cleanText.length || 1);
  if (asciiRatio > 0.85) return 'English';

  return null; // 감지 못하면 null (auto 유지)
}
let currentPanel = null;

function getEmailThread() {
  const messages = document.querySelectorAll('.a3s.aiL, .ii.gt .a3s');
  if (messages.length > 1) {
    let thread = '';
    messages.forEach((el, i) => { thread += `[메시지 ${i + 1}]\n${el.innerText.trim()}\n\n`; });
    return thread.slice(0, 6000);
  }
  for (const sel of ['.a3s.aiL', '.ii.gt .a3s', '[data-message-id] .a3s']) {
    const el = document.querySelector(sel);
    if (el) return el.innerText.trim().slice(0, 6000);
  }
  const main = document.querySelector('[role="main"]');
  return main ? main.innerText.trim().slice(0, 6000) : '';
}

function showToast(msg, type = 'info') {
  const existing = document.getElementById('mm-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'mm-toast';
  t.style.cssText = `position:fixed;bottom:24px;right:24px;padding:10px 18px;border-radius:8px;font-size:13px;font-family:Arial,sans-serif;font-weight:500;z-index:99999;color:#fff;background:${type==='success'?'#137333':type==='error'?'#c5221f':'#202124'}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function removePanel() {
  const p = document.getElementById('mm-panel');
  if (p) p.remove();
  currentPanel = null;
}

async function syncUsageFromServer(userEmail) {
  if (!userEmail) return;
  try {
    const res = await fetch(`${WORKER_URL}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });
    const data = await res.json();
    if (data.plan) {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const planConfig = PLANS[data.plan] || PLANS.free;
      const syncObj = {
        userPlan: data.plan,
        monthlyLimit: planConfig.monthly,
        monthlyCount: data.monthlyUsed || 0,
        monthlyMonth: thisMonth,
        translateCount: data.translateUsed || 0,
        translateLimit: data.translateLimit  // null = unlimited
      };
      // KV에 저장된 언어 설정이 있으면 로컬에 동기화
      const VALID_LANGS = ['auto','Korean','English','Japanese','Chinese','Spanish','German','Portuguese','Arabic','French','Italian','Vietnamese','Thai','Indonesian','Dutch','Polish','Turkish','Hindi'];
      if (data.myLanguage && VALID_LANGS.includes(data.myLanguage)) {
        syncObj.myLanguage = data.myLanguage;
      }
      if (data.replyLanguage && VALID_LANGS.includes(data.replyLanguage)) {
        syncObj.replyLanguage = data.replyLanguage;
      }
      safeStorageSet(syncObj);
    }
  } catch(e) { /* 서버 오류 시 로컬 값 사용 */ }
}

async function getUserData() {
  const data = await new Promise(r => safeStorageGet([
    'userId', 'userEmail', 'userPlan',
    'monthlyCount', 'monthlyMonth',
    'monthlyLimit', 'myLanguage',
    'translateCount', 'translateLimit',
    'businessCard'
  ], r));

  const thisMonth = new Date().toISOString().slice(0, 7);
  let monthlyCount = data.monthlyMonth === thisMonth ? (data.monthlyCount || 0) : 0;

  if (data.monthlyMonth !== thisMonth) {
    safeStorageSet({ monthlyMonth: thisMonth, monthlyCount: 0 });
    monthlyCount = 0;
  }

  let userId = data.userId;
  if (!userId) {
    userId = 'u_' + Math.random().toString(36).substr(2, 9);
    safeStorageSet({ userId });
  }

  const plan = data.userPlan || 'free';
  const planConfig = PLANS[plan] || PLANS.free;
  const monthlyLimit = data.monthlyLimit || planConfig.monthly;

  // phrases: 서버에서 가져오기 (email이 있을 때만)
  let phrases = [];
  if (data.userEmail) {
    try {
      const pr = await fetch(`${WORKER_URL}/phrases?email=${encodeURIComponent(data.userEmail)}`);
      if (pr.ok) { const pd = await pr.json(); if (pd.success) phrases = (pd.phrases || []).map(p => p.text || p).filter(Boolean); }
    } catch (_) {}
  }

  return {
    userId,
    userEmail: data.userEmail || null,
    plan,
    monthlyCount,
    monthlyLimit,
    thisMonth,
    myLanguage: data.myLanguage || 'Korean',
    translateCount: data.translateCount || 0,
    translateLimit: data.translateLimit || 10,
    businessCard: data.businessCard || '',
    phrases
  };
}

async function incrementUsage(serverCount) {
  const data = await getUserData();
  // 서버 응답값이 있으면 우선 사용, 없으면 로컬 +1
  const newCount = (typeof serverCount === 'number') ? serverCount : data.monthlyCount + 1;
  safeStorageSet({
    monthlyCount: newCount,
    monthlyMonth: data.thisMonth
  });
}

async function updateBadge() {
  if (!currentPanel) return;
  const data = await getUserData();
  const left = Math.max(0, data.monthlyLimit - data.monthlyCount);
  const pct = Math.min(100, Math.round((data.monthlyCount / data.monthlyLimit) * 100));
  const planLabel = PLANS[data.plan]?.label || 'Free';
  const badge = currentPanel.querySelector('#mm-badge');
  const progress = currentPanel.querySelector('#mm-progress');
  if (badge) {
    const trLeft = data.translateLimit != null ? Math.max(0, data.translateLimit - data.translateCount) : null;
    badge.textContent = trLeft != null ? `${planLabel} · ${left}/${data.monthlyLimit} replies · 🌐 ${trLeft}/${data.translateLimit}` : `${planLabel} · ${left}/${data.monthlyLimit} replies`;
    badge.style.color = pct >= 90 ? '#c5221f' : pct >= 70 ? '#e37400' : '#5f6368';
  }
  if (progress) {
    progress.style.width = pct + '%';
    progress.style.background = pct >= 90 ? '#c5221f' : pct >= 70 ? '#f9a825' : '#e91e8c';
  }
  // 90% 이상이면 업그레이드 유도
  if (pct >= 90 && left > 0) {
    const upgradeHint = currentPanel.querySelector('#mm-upgrade-hint');
    if (!upgradeHint) {
      const hint = document.createElement('div');
      hint.id = 'mm-upgrade-hint';
      hint.style.cssText = 'background:#fce8e6;border-radius:6px;padding:6px 10px;font-size:11px;color:#c5221f;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between';
      hint.innerHTML = `<span>⚠️ ${left} replies left</span><a href="https://mailmind.yongcha.app#pricing" target="_blank" style="color:#c5221f;font-weight:600;text-decoration:none">Upgrade →</a>`;
      const genBtn = currentPanel.querySelector('#mm-gen');
      if (genBtn) genBtn.before(hint);
    }
  }
}

function createPanel() {
  removePanel();

  const panel = document.createElement('div');
  panel.id = 'mm-panel';
  panel.style.cssText = 'font-family:Google Sans,Arial,sans-serif;background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:0;box-shadow:0 4px 16px rgba(0,0,0,.14);position:fixed;right:16px;top:70px;width:380px;height:calc(100vh - 90px);max-height:680px;overflow:hidden;z-index:99999;display:flex;flex-direction:column;';
  currentPanel = panel;
  // Gmail 키보드 단축키 차단 — 답변 패널 내 키 입력 보호 (capture phase)
  ['keydown','keypress','keyup'].forEach(type => {
    panel.addEventListener(type, e => {
      const tag = e.target?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') e.stopPropagation();
    }, true);
  });

  const toneOptions = getToneOptions(selectedMyLang || 'Korean');
  const langOptions = LANGUAGES.map(l => `<option value="${l.value}">${l.label}</option>`).join('');
  const countryOptions = COUNTRIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');

  panel.innerHTML = `
    <!-- Header: 드래그 핸들 + 로고 + 닫기 -->
    <div id="mm-drag-handle" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;background:linear-gradient(135deg,#fce4ec,#fff);border-bottom:1px solid #f0f0f0;border-radius:12px 12px 0 0;cursor:move;user-select:none;flex-shrink:0">
      <span style="font-size:14px;font-weight:700;color:#e91e8c;letter-spacing:-0.3px">✦ MailMind</span>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="text-align:right">
          <div id="mm-badge" style="font-size:11px;color:#5f6368;margin-bottom:3px">...</div>
          <div style="width:120px;height:4px;background:#f1f3f4;border-radius:2px;overflow:hidden">
            <div id="mm-progress" style="height:100%;background:#e91e8c;border-radius:2px;transition:width 0.3s;width:0%"></div>
          </div>
        </div>
        <button id="mm-close-btn" style="border:none;background:none;color:#9aa0a6;font-size:18px;cursor:pointer;padding:0 2px;line-height:1" title="닫기">×</button>
      </div>
    </div>
    <!-- 스크롤 가능한 본문 -->
    <div style="flex:1;overflow-y:auto;padding:12px 16px 14px;">

    <!-- 감정/긴급도 배지 -->
    <div id="mm-emotion-bar" style="display:none;margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap">
      <span id="mm-emotion-badge" style="font-size:11px;padding:3px 10px;border-radius:100px;background:#fff3e0;color:#e65100;font-weight:600"></span>
      <span id="mm-urgency-badge" style="font-size:11px;padding:3px 10px;border-radius:100px;background:#fce4ec;color:#c62828;font-weight:600"></span>
    </div>

    <!-- 옵션 Bar: 톤 + 존댓말 + 국가 + 내 언어 -->
    <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <div style="flex:1;min-width:90px">
        <label id="mm-label-tone" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">Tone</label>
        <select id="mm-tone-select" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">
          ${toneOptions}
        </select>
      </div>
      <div style="flex:1;min-width:80px">
        <label id="mm-label-honorific" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">존댓말</label>
        <select id="mm-honorific-select" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">
          ${getHonorificOptions(selectedMyLang)}
        </select>
      </div>
      <div style="flex:1;min-width:90px">
        <label id="mm-label-country" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">Sender's Country</label>
        <select id="mm-country-select" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">
          ${countryOptions}
        </select>
      </div>
      <div id="mm-mylang-wrap" style="flex:1;min-width:90px">
        <label id="mm-label-mylang" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">My Language</label>
        <select id="mm-mylang-select" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">
          ${langOptions}
        </select>
      </div>
    </div>

    <!-- 문화/업종/성향 감지 알림 -->
    <div id="mm-detect-info" style="display:none;margin-bottom:8px;padding:8px 10px;background:#f0f7ff;border-radius:8px;font-size:11px;color:#1a73e8;line-height:1.6;display:flex;align-items:center;justify-content:space-between">
      <span id="mm-detect-text"></span>
      <button id="mm-detect-change" style="font-size:10px;color:#1a73e8;background:none;border:1px solid #1a73e8;border-radius:4px;padding:2px 6px;cursor:pointer;white-space:nowrap;margin-left:8px"id="mm-btn-detect-change">Change ›</button>
    </div>

    <button id="mm-gen" title="선택한 톤으로 답장 1개 생성 (Alt+G)" style="width:100%;padding:10px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px">✦ Generate AI Reply</button>

    <div id="mm-pro-btns" style="display:flex;gap:8px;margin-bottom:8px"></div>

    <!-- 이메일 번역 버튼 -->
    <button id="mm-email-translate" style="width:100%;padding:7px;background:#fff;color:#1a73e8;border:1px solid #1a73e8;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;margin-bottom:8px">🌐 내 언어로 번역</button>
    <div id="mm-email-translated" style="display:none;margin-bottom:8px;padding:10px;background:#e8f0fe;border-radius:8px;font-size:12px;color:#202124;line-height:1.6;white-space:pre-wrap"></div>

    <!-- 스레드 요약 버튼 -->
    <button id="mm-summarize" style="width:100%;padding:7px;background:#fff;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;margin-bottom:8px">📝 Thread Summary</button>
    <div id="mm-thread-summary" style="display:none;margin-bottom:8px;padding:10px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#202124;line-height:1.6"></div>

    <div id="mm-summary" style="display:none;margin-bottom:8px;padding:10px;background:#e6f4ea;border-radius:8px;font-size:12px;color:#137333;line-height:1.6"></div>

    <div id="mm-lang-btn" style="display:none;margin-bottom:8px">
      <button id="mm-switch-lang" style="width:100%;padding:7px;background:#1a73e8;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer">🌐 Send in original language</button>
    </div>

    <div id="mm-versions" style="display:none;margin-bottom:8px">
      <div id="mm-ver-tabs" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"></div>
    </div>

    <!-- 약속 추출 섹션 -->
    <div id="mm-promises" style="display:none;margin-bottom:8px">
      <div id="mm-promises-title" style="font-size:11px;font-weight:600;color:#1a73e8;margin-bottom:6px">📋 Your Commitments</div>
      <div id="mm-promises-list" style="background:#e8f0fe;border-radius:8px;padding:8px 10px;font-size:11px;color:#1a73e8;line-height:1.8"></div>
    </div>

    <!-- 액션 시트: 할 일/일정 추출 -->
    <div id="mm-tasks" style="display:none;margin-bottom:8px">
      <div id="mm-tasks-title" style="font-size:11px;font-weight:600;color:#b8860b;margin-bottom:6px">📌 Actions</div>
      <div id="mm-tasks-list" style="display:flex;flex-direction:column;gap:4px"></div>
    </div>

    <div id="mm-result" style="display:none">
      <textarea id="mm-output" rows="6" style="width:100%;border:1px solid #dadce0;border-radius:8px;padding:10px;font-size:13px;line-height:1.6;color:#202124;background:#f8f9fa;font-family:inherit;box-sizing:border-box;resize:vertical"></textarea>

      <!-- 다국어 빠른 전환 드롭다운 -->
      <div id="mm-lang-switch" style="position:relative;margin-top:8px;">
        <button id="mm-reply-tl-trigger" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:1.5px solid #e8eaed;border-radius:8px;background:#fff;font-size:13px;cursor:pointer;font-family:inherit;box-sizing:border-box;">
          <span id="mm-reply-tl-flag" style="font-size:15px">🌐</span>
          <span id="mm-reply-tl-label" style="font-size:11px;color:#5f6368;flex:1;text-align:left">Switch Language</span>
          <span id="mm-reply-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>
        </button>
        <div id="mm-reply-tl-list" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e8eaed;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:9999;overflow:hidden;max-height:180px;overflow-y:auto;">
          ${COMPOSE_LANGS.map(l => `<button class="mm-lang-btn" data-lang="${l.value}" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 12px;border:none;border-bottom:1px solid #f8f9fa;background:#fff;font-size:13px;cursor:pointer;font-family:inherit;text-align:left;"><span style="font-size:14px">${l.flag}</span><span style="font-size:12px;color:#333;">${l.label}</span></button>`).join('')}
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:8px">
        <!-- 글자수 -->
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span id="mm-char-count" style="font-size:10px;color:#9aa0a6"></span>
        </div>
        <!-- Smart Reply Guard -->
        <div id="mm-guard" style="display:none;margin-bottom:8px;padding:8px 10px;background:#fff8e1;border-radius:8px;font-size:11px;color:#b8860b;line-height:1.7">
          <div id="mm-guard-title" style="font-weight:600;margin-bottom:4px">🛡️ Smart Reply Guard</div>
          <div id="mm-guard-text"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button id="mm-insert" style="flex:2;padding:9px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">✉️ Insert into Gmail</button>
          <button id="mm-copy" style="flex:1;padding:9px;background:#fff;color:#e91e8c;border:1.5px solid #e91e8c;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">📋 Copy</button>
          <button id="mm-edit-btn" title="편집/다듬기" style="padding:9px 12px;background:#f8f9fa;color:#673ab7;border:1px solid #dadce0;border-radius:8px;font-size:12px;cursor:pointer">✏️</button>
          <button id="mm-attach" title="파일 첨부" style="padding:9px 12px;background:#f8f9fa;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:12px;cursor:pointer">📎</button>
          <button id="mm-regen" title="톤 바꿔서 다시 생성" style="padding:9px 12px;background:#f8f9fa;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:12px;cursor:pointer">🔄</button>
        </div>
      </div>
      <div id="mm-edit-bar" style="display:none;gap:8px;margin-top:6px">
        <button id="mm-edit-done" style="flex:1;padding:8px;background:#34a853;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">✅ 완료</button>
        <button id="mm-refine-btn" style="flex:1;padding:8px;background:#673ab7;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">✨ 다듬기</button>
      </div>
    </div>

    <div id="mm-upgrade" style="display:none;margin-top:10px;text-align:center;padding:12px;background:#fef7e0;border-radius:8px">
      <p id="mm-limit-msg" style="font-size:12px;color:#5f6368;margin:0 0 8px">Monthly limit reached.</p>
      <a href="https://mailmind.yongcha.app#pricing" target="_blank" style="font-size:13px;font-weight:500;color:#1a73e8;text-decoration:none;padding:6px 16px;border:1px solid #1a73e8;border-radius:6px">Upgrade Plan →</a>
    </div>

    <!-- 설정 패널 -->
    <div id="mm-settings" style="display:none;margin-top:10px;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0">
      <div id="mm-settings-title" style="font-size:12px;font-weight:600;color:#202124;margin-bottom:8px">⚙️ Settings</div>

      <!-- 서명 관리 -->
      <div style="margin-bottom:10px">
        <label id="mm-label-sig" style="font-size:11px;color:#5f6368">Signature</label>
        <textarea id="mm-sig-input" rows="3" placeholder="Enter your signature" style="width:100%;margin-top:4px;padding:6px;border:1px solid #dadce0;border-radius:6px;font-size:11px;box-sizing:border-box;resize:vertical"></textarea>
        <button id="mm-save-signature" style="margin-top:4px;padding:4px 10px;background:#e91e8c;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer">Save</button>
      </div>



      <!-- 자주 쓰는 문구 (자동 학습, 읽기 전용) -->
      <div style="margin-bottom:10px">
        <label id="mm-label-template" style="font-size:11px;color:#5f6368">Templates</label>
        <div id="mm-templates-list" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px"></div>
      </div>

      <!-- 단축키 안내 -->
      <div style="font-size:10px;color:#9aa0a6;border-top:1px solid #e0e0e0;padding-top:6px">
        <span id="mm-shortcut-hint">⌨️ Alt+G · Alt+C · Alt+I</span>
      </div>
    </div>

    <!-- 설정 토글 버튼 -->
    <button id="mm-settings-toggle" style="width:100%;margin-top:8px;padding:6px;background:#f1f3f4;color:#202124;border:1px solid #bdc1c6;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer"id="mm-settings-toggle">⚙️ Settings</button>
    </div>
  `;

  document.body.appendChild(panel);

  // × 닫기 버튼 (CSP로 inline onclick 사용 불가 → addEventListener)
  const closeBtn = panel.querySelector('#mm-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => panel.remove());

  // Change 버튼 (CSP: inline onclick 금지)
  const detectChangeBtn = panel.querySelector('#mm-detect-change');
  if (detectChangeBtn) detectChangeBtn.addEventListener('click', () => {
    const sel = panel.querySelector('#mm-country-select');
    if (sel) sel.focus();
  });

  // 드래그 로직
  (function() {
    const handle = panel.querySelector('#mm-drag-handle');
    if (!handle) return;
    let dragging = false, ox = 0, oy = 0;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = r.left + 'px';
      panel.style.top = r.top + 'px';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(e.clientX - ox, window.innerWidth - panel.offsetWidth));
      const y = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - panel.offsetHeight));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  })();

  // 캐시 (언어 변경 시 재사용)
  let cachedEmailContent = '';
  let cachedEmotion = 'neutral';
  let cachedUrgency = 'low';
  let cachedIsNotice = false;
  let cachedOrigDate = null;
  let cachedReplyDate = null;

  // 초기화
  async function initPanel() {
    const userData = await getUserData();

    // ① selectedMyLang 제일 먼저 설정 (storage > 드롭다운 현재값 > 'Korean')
    const currentDropdownLang = panel.querySelector('#mm-mylang-select')?.value;
    selectedMyLang = userData.myLanguage || currentDropdownLang || 'Korean';
    const myLangSelect = panel.querySelector('#mm-mylang-select');
    if (myLangSelect) myLangSelect.value = selectedMyLang;

    // getUserData() 완료 후 확정된 언어를 즉시 로컬 변수로 고정
    // 'auto'인 경우 브라우저 언어로 실제 언어 결정
    const resolvedLang = (selectedMyLang === 'auto') ? detectBrowserLang() : selectedMyLang;

    // ② 서버 사용량 동기화 → 완료 후 배지 업데이트
    updateBadge(); // 로컬 캐시로 먼저 표시
    if (userData.userEmail) {
      syncUsageFromServer(userData.userEmail).then(() => {
        setTimeout(() => updateBadge(), 300); // 서버값으로 덮어쓰기
      });
    }

    // ③ 이메일 감정/긴급도 분석 (resolvedLang 사용으로 타이밍 무관)
    setTimeout(() => {
      const emailText = getEmailThread();
      if (emailText) {
        const { urgency, emotion, isNoticeEmail, senderApologizing } = detectEmotion(emailText);
        cachedEmotion = emotion;
        cachedUrgency = urgency;
        cachedIsNotice = isNoticeEmail;
        const ui2 = getUILang(resolvedLang);
        const emotionBar = panel.querySelector('#mm-emotion-bar');
        const emotionBadge = panel.querySelector('#mm-emotion-badge');
        const urgencyBadge = panel.querySelector('#mm-urgency-badge');
        if (!isNoticeEmail && emotionBar && (emotion !== 'neutral' || urgency !== 'low')) {
          emotionBar.style.display = 'flex';
          if (emotionBadge && emotion !== 'neutral') emotionBadge.textContent = ui2.emotion[emotion];
          if (urgencyBadge && urgency !== 'low') urgencyBadge.textContent = ui2.urgency[urgency];
        } else if (emotionBar) {
          emotionBar.style.display = 'none';
        }
      }
    }, 800);

    // ④ Free면 내 언어 드롭다운 숨김
    if (userData.plan === 'free') {
      panel.querySelector('#mm-mylang-wrap').style.display = 'none';
    }

    // ⑤ 플랜별 버튼 생성
    const container = panel.querySelector('#mm-pro-btns');
    if (userData.plan === 'pro' || userData.plan === 'team') {
      container.innerHTML = `
        <button id="mm-triple" style="flex:1;padding:8px;background:#e8f5e9;color:#2e7d32;border:1px solid #4caf50;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"> </button>
        <button id="mm-smart" style="flex:1;padding:8px;background:#fff8e1;color:#b8860b;border:1px solid #f9a825;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer"> </button>
      `;
      panel.querySelector('#mm-triple').addEventListener('click', () => generateTriple(userData));
      panel.querySelector('#mm-smart').addEventListener('click', () => generateSmart(userData));
    } else if (userData.plan === 'basic') {
      container.innerHTML = `
        <button id="mm-triple" style="flex:1;padding:8px;background:#e8f5e9;color:#2e7d32;border:1px solid #4caf50;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"> </button>
        <a href="https://mailmind.yongcha.app#pricing" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px;background:linear-gradient(135deg,#fff8e1,#fff3e0);color:#e65100;border:1px solid #ffb74d;border-radius:8px;font-size:11px;text-decoration:none;font-weight:600">👑 Smart Reply · Unlock Pro</a>
      `;
      panel.querySelector('#mm-triple').addEventListener('click', () => generateTriple(userData));
    } else {
      container.innerHTML = `
        <a href="https://mailmind.yongcha.app#pricing" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px;background:linear-gradient(135deg,#fff8e1,#fff3e0);color:#e65100;border:1px solid #ffb74d;border-radius:8px;font-size:11px;text-decoration:none;box-sizing:border-box;font-weight:600">👑 Compare & Smart Reply · Unlock Basic/Pro</a>
      `;
    }

    // ⑥ 플랜버튼 생성 완료 후 UI 언어 일괄 적용
    applyUILang(resolvedLang);

    // ⑦ 이메일 자동 감지 (resolvedLang으로 언어 확정)
    setTimeout(() => {
      const emailContent = getEmailThread();
      if (emailContent) {
        cachedEmailContent = emailContent; // 캐시 저장
        detectAndShowInfo(emailContent, resolvedLang);
        extractTasksAndDates(emailContent, resolvedLang);
        // ⑧ 이메일 키워드 기반 자주 쓰는 문구 자동 추천
        safeStorageGet(['templates'], (tplData) => {
          const tpls = tplData.templates || [];
          if (!tpls.length) return;
          const emailLower = emailContent.toLowerCase();
          const suggested = tpls.filter(tpl => {
            const words = tpl.replace(/[^\w가-힣]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
            return words.some(w => emailLower.includes(w.toLowerCase()));
          }).slice(0, 3);
          if (suggested.length > 0) {
            const suggestBar = panel.querySelector('#mm-suggest-bar');
            if (!suggestBar) {
              const bar = document.createElement('div');
              bar.id = 'mm-suggest-bar';
              bar.style.cssText = 'margin:6px 0 2px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;';
              bar.innerHTML = '<span style="font-size:10px;color:#9aa0a6;white-space:nowrap">💡추천:</span>';
              suggested.forEach(tpl => {
                const chip = document.createElement('span');
                chip.style.cssText = 'padding:3px 8px;background:#fff3e0;border:1px solid #ffcc80;border-radius:12px;font-size:11px;color:#e65100;cursor:pointer;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;';
                chip.title = tpl;
                chip.textContent = tpl.length > 20 ? tpl.slice(0, 20) + '…' : tpl;
                chip.addEventListener('click', () => {
                  const output = panel.querySelector('#mm-output');
                  if (output) { output.value += (output.value ? '\n' : '') + tpl; showToast('문구 추가!', 'success'); }
                });
                bar.appendChild(chip);
              });
              const actionRow = panel.querySelector('#mm-output');
              if (actionRow) actionRow.parentNode.insertBefore(bar, actionRow);
            }
          }
        });
      }
    }, 1200);
  }

  // UI 언어 일괄 적용 함수
  function applyUILang(lang) {
    const ui = getUILang(lang);
    const set = (id, val) => { const el = panel.querySelector(id); if (el) el.textContent = val; };
    set('#mm-label-tone', ui.tone);
    set('#mm-label-country', ui.country);
    set('#mm-label-mylang', ui.myLang);
    set('#mm-gen', ui.generate);
    set('#mm-summarize', ui.summary);
    set('#mm-email-translate', ui.translate);
    set('#mm-settings-toggle', ui.settingsClose || ui.settings);
    set('#mm-settings-title', ui.settings);
    set('#mm-promises-title', ui.promises);
    set('#mm-guard-title', ui.guardTitle || '🛡️ Smart Reply Guard');
    set('#mm-tasks-title', ui.tasks);
    set('#mm-switch-label', ui.switchLang);
    set('#mm-insert', ui.insert);
    set('#mm-copy', ui.copy);
    set('#mm-edit-done', ui.editDone);
    set('#mm-refine-btn', ui.refine);
    set('#mm-label-sig', ui.signature);
    set('#mm-label-template', ui.template);
    set('#mm-save-signature', ui.sigSave);
    set('#mm-shortcut-hint', ui.shortcut);
    // 플레이스홀더 다국어
    const sigInput = panel.querySelector('#mm-sig-input');
    if (sigInput) sigInput.placeholder = ui.sigPlaceholder || 'Enter your signature';
    // Auto Detect 옵션 텍스트 다국어
    const countryEl = panel.querySelector('#mm-country-select');
    if (countryEl) {
      const autoOpt = countryEl.querySelector('option[value="auto"]');
      if (autoOpt) autoOpt.textContent = ui.autoDetect || '🌐 Auto Detect';
    }
    // Pro 버튼
    const tripleBtn = panel.querySelector('#mm-triple');
    const smartBtn = panel.querySelector('#mm-smart');
    if (tripleBtn) tripleBtn.textContent = ui.compare;
    if (smartBtn) smartBtn.textContent = ui.smartReply;
    // 할 일 타이틀
    const tasksDiv = panel.querySelector('#mm-tasks-title');
    if (tasksDiv) tasksDiv.textContent = ui.tasks;
    // 설정 닫기 버튼
    const settingsClose = panel.querySelector('#mm-settings-toggle');
    if (settingsClose && true) settingsClose.textContent = ui.settings;
    // 톤 드롭다운 다국어
    const toneSelect = panel.querySelector('#mm-tone-select');
    if (toneSelect) {
      const currentTone = toneSelect.value;
      toneSelect.innerHTML = getToneOptions(lang);
      toneSelect.value = currentTone;
    }
    // 존댓말 셀렉터 갱신 (언어에 맞는 레이블로)
    const honorificSel = panel.querySelector('#mm-honorific-select');
    if (honorificSel) {
      const cur = honorificSel.value || selectedHonorific;
      honorificSel.innerHTML = getHonorificOptions(lang);
      honorificSel.value = cur;
      selectedHonorific = honorificSel.value; // 해당 언어에 없는 값이면 첫 번째로 초기화
    }
    // RTL
    panel.style.direction = lang === 'Arabic' ? 'rtl' : 'ltr';
  }

  initPanel();

  // 톤 변경
  panel.querySelector('#mm-tone-select').addEventListener('change', function() {
    selectedTone = this.value;
  });

  // 존댓말 변경
  panel.querySelector('#mm-honorific-select').addEventListener('change', function() {
    selectedHonorific = this.value;
  });

  // 국가 선택 변경
  const countrySelect = panel.querySelector('#mm-country-select');
  if (countrySelect) {
    // 패널 열릴 때마다 항상 재감지 → 드롭다운에 반영
    const emailForCountry = getEmailThread();
    const detectedCountry = autoDetectCountry(emailForCountry);
    selectedCountry = detectedCountry || 'auto';
    countrySelect.value = selectedCountry;
    countrySelect.addEventListener('change', function() {
      selectedCountry = this.value;
    });
  }

  // ★ 언어 변경 시 모든 UI 재렌더링
  function reRenderAll(lang) {
    // 1. 라벨/버튼
    applyUILang(lang);

    // 2. 감정 배지
    const ui2 = getUILang(lang);
    const emotionBar = panel.querySelector('#mm-emotion-bar');
    const emotionBadge = panel.querySelector('#mm-emotion-badge');
    const urgencyBadge = panel.querySelector('#mm-urgency-badge');
    if (!cachedIsNotice && emotionBar && (cachedEmotion !== 'neutral' || cachedUrgency !== 'low')) {
      emotionBar.style.display = 'flex';
      if (emotionBadge && cachedEmotion !== 'neutral') emotionBadge.textContent = ui2.emotion[cachedEmotion] || '';
      if (urgencyBadge && cachedUrgency !== 'low') urgencyBadge.textContent = ui2.urgency[cachedUrgency] || '';
    }

    // 3. 감지 배지 + Actions
    const emailTxt = getEmailThread() || cachedEmailContent;
    if (emailTxt) {
      cachedEmailContent = emailTxt;
      detectAndShowInfo(emailTxt, lang);
      extractTasksAndDates(emailTxt, lang);
    }

    // 3b. 약속 추출 재렌더링
    const outputVal = panel.querySelector('#mm-output')?.value || '';
    if (outputVal) {
      const promises = extractPromises(outputVal, lang);
      const promisesEl = panel.querySelector('#mm-promises');
      const promisesList = panel.querySelector('#mm-promises-list');
      const promisesTitle = panel.querySelector('#mm-promises-title');
      if (promisesEl && promisesList) {
        if (promises.length > 0) {
          promisesEl.style.display = 'block';
          if (promisesTitle) promisesTitle.textContent = getUILang(lang).promises || '📋 Your Commitments';
          promisesList.innerHTML = promises.map(p => `• ${sanitize(p)}`).join('<br>');
        } else {
          promisesEl.style.display = 'none';
        }
      }
    }

    // 4. Guard 타이틀
    const guardTitleEl = panel.querySelector('#mm-guard-title');
    if (guardTitleEl) guardTitleEl.textContent = ui2.guardTitle || '🛡️ Smart Reply Guard';

    // 4b. 서명 재번역
    const _sigElGM = panel.querySelector('#mm-sig-input');
    if (_sigElGM) {
      const _rawSigGM = _sigElGM.dataset.rawSig || _sigElGM.value;
      if (_rawSigGM && lang !== 'Korean') {
        fetch(`${WORKER_URL}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: _rawSigGM, targetLanguage: resolveAutoLang(lang), honorific: selectedHonorific }) }).then(r => r.json()).then(r => { if (r.success && r.translated) { _sigElGM.dataset.rawSig = _rawSigGM; _sigElGM.value = r.translated; } }).catch(() => {});
      } else if (lang === 'Korean') { _sigElGM.value = _rawSigGM; _sigElGM.dataset.rawSig = _rawSigGM; }
    }

    // 5. Guard 경고 텍스트 재렌더링
    const guardEl = panel.querySelector('#mm-guard');
    const guardText = panel.querySelector('#mm-guard-text');
    if (guardEl && guardText && guardEl.style.display !== 'none') {
      const _locale = {Korean:'ko-KR',Japanese:'ja-JP',Chinese:'zh-CN',German:'de-DE',French:'fr-FR',Turkish:'tr-TR',Italian:'it-IT',Portuguese:'pt-BR',Spanish:'es-ES',Arabic:'ar-SA',Vietnamese:'vi-VN',Thai:'th-TH',Indonesian:'id-ID'}[lang]||'en-US';
      // 캐시된 날짜 우선 사용, 없으면 재파싱
      const oDate = cachedOrigDate || parseDateFromText(emailTxt||'');
      const rDate = cachedReplyDate || parseDateFromText(panel.querySelector('#mm-output')?.value||'');
      if (oDate && rDate) {
        const diff = Math.abs((oDate - rDate) / 86400000);
        if (diff > 3) {
          const d1 = oDate.toLocaleDateString(_locale);
          const d2 = rDate.toLocaleDateString(_locale);
          const newMsg = {
            Korean: `⚠️ 날짜 불일치: 이메일에는 <strong>${sanitize(d1)}</strong>이 있는데 답장에는 <strong>${sanitize(d2)}</strong> — 확인하세요.`,
            Japanese: `⚠️ 日付の不一致: メールには <strong>${sanitize(d1)}</strong> がありますが、返信には <strong>${sanitize(d2)}</strong> があります。`,
            Chinese: `⚠️ 日期不一致: 邮件中为 <strong>${sanitize(d1)}</strong>，回复中为 <strong>${sanitize(d2)}</strong>。`,
            German: `⚠️ Datumsdiskrepanz: E-Mail enthält <strong>${sanitize(d1)}</strong>, Antwort sagt <strong>${sanitize(d2)}</strong> — bitte prüfen.`,
            French: `⚠️ Incohérence de date: l'e-mail mentionne <strong>${sanitize(d1)}</strong> mais la réponse dit <strong>${sanitize(d2)}</strong> — vérifiez.`,
            Turkish: `⚠️ Tarih uyuşmazlığı: E-postada <strong>${sanitize(d1)}</strong> var ama yanıtta <strong>${sanitize(d2)}</strong> — kontrol edin.`,
            Italian: `⚠️ Discrepanza di data: l'e-mail menziona <strong>${sanitize(d1)}</strong> ma la risposta dice <strong>${sanitize(d2)}</strong> — verificare.`,
            Spanish: `⚠️ Discrepancia de fecha: el correo menciona <strong>${sanitize(d1)}</strong> pero la respuesta dice <strong>${sanitize(d2)}</strong> — verifique.`,
            Portuguese: `⚠️ Discrepância de data: o e-mail menciona <strong>${sanitize(d1)}</strong> mas a resposta diz <strong>${sanitize(d2)}</strong> — verifique.`,
            Arabic: `⚠️ تناقض في التاريخ: البريد يذكر <strong>${sanitize(d1)}</strong> لكن الرد يقول <strong>${sanitize(d2)}</strong> — يرجى التحقق.`,
            Vietnamese: `⚠️ Không khớp ngày: email đề cập <strong>${sanitize(d1)}</strong> nhưng trả lời nói <strong>${sanitize(d2)}</strong> — kiểm tra lại.`,
            Thai: `⚠️ วันที่ไม่ตรงกัน: อีเมลกล่าวถึง <strong>${sanitize(d1)}</strong> แต่การตอบกลับระบุ <strong>${sanitize(d2)}</strong> — ตรวจสอบ`,
            Indonesian: `⚠️ Ketidakcocokan tanggal: email menyebut <strong>${sanitize(d1)}</strong> tapi balasan berkata <strong>${sanitize(d2)}</strong> — periksa kembali.`,
          }[lang] || `⚠️ Date mismatch: email mentions <strong>${sanitize(d1)}</strong> but reply says <strong>${sanitize(d2)}</strong> — verify.`;
          guardText.innerHTML = newMsg;
        }
      }
    }

    // 4c. 템플릿 칩 재번역
    safeStorageGet(['templates'], (tplData) => {
      const tpls = tplData.templates || [];
      if (tpls.length > 0) renderTemplates(tpls);
    });
  }

  // 내 언어 변경 → reRenderAll 호출 + KV 동기화
  panel.querySelector('#mm-mylang-select').addEventListener('change', function() {
    selectedMyLang = this.value;
    safeStorageSet({ myLanguage: this.value });
    reRenderAll(this.value);
    // 서버 KV에 언어 설정 동기화 (앱과 공유)
    safeStorageGet(['userEmail'], d => {
      if (d.userEmail) {
        fetch(`${WORKER_URL}/set-language`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: d.userEmail, myLanguage: this.value })
        }).catch(() => {});
      }
    });
  });

  // 기본 답장 생성
  async function generateReply() {
    const emailContent = getEmailThread();
    if (!emailContent) { showToast(getUILang(selectedMyLang).errNotFound || 'Email content not found.', 'error'); return; }

    const userData = await getUserData();
    if (userData.monthlyCount >= userData.monthlyLimit) {
      panel.querySelector('#mm-upgrade').style.display = 'block';
      return;
    }

    const genBtn = panel.querySelector('#mm-gen');
    genBtn.disabled = true;
    genBtn.textContent = getUILang(selectedMyLang).generating || '✦ Generating...';
    panel.querySelector('#mm-summary').style.display = 'none';
    panel.querySelector('#mm-lang-btn').style.display = 'none';
    panel.querySelector('#mm-versions').style.display = 'none';

    try {
      const storedSig = await new Promise(r => safeStorageGet(['signature'], r));
      const signature = storedSig.signature || '';
      const res = await fetch(`${WORKER_URL}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent, tone: selectedTone, honorific: selectedHonorific, language: selectedMyLang, myLanguage: selectedMyLang, country: selectedCountry, email: userData.userEmail, userId: userData.userId, ...(signature && { signature }) })
      });
      const data = await res.json();

      if (data.success) {
        // ★ 스팸/피싱 감지 경고
        const existingWarn = panel.querySelector('#mm-spam-warning');
        if (existingWarn) existingWarn.remove();
        if (data.isSpam && data.spamWarning) {
          const warnEl = document.createElement('div');
          warnEl.id = 'mm-spam-warning';
          warnEl.style.cssText = 'background:#fce8e6;border:1.5px solid #d93025;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#c5221f;line-height:1.6;white-space:pre-line;';
          warnEl.textContent = data.spamWarning;
          panel.querySelector('#mm-result').before(warnEl);
        }
        // ★ 자동발송/뉴스레터 감지 안내 배너
        const existingAutoInfo = panel.querySelector('#mm-auto-email-info');
        if (existingAutoInfo) existingAutoInfo.remove();
        if (data.isAutoEmail) {
          const uiAE = getUILang(selectedMyLang);
          const infoKey = data.emailType === 'transactional' ? 'transactional_info' : 'newsletter_info';
          const infoEl = document.createElement('div');
          infoEl.id = 'mm-auto-email-info';
          infoEl.style.cssText = 'background:#e8f0fe;border:1px solid #4285f4;color:#1a73e8;border-radius:8px;padding:12px;margin-bottom:10px;font-size:12px;line-height:1.6;';
          infoEl.textContent = uiAE[infoKey] || UI_STRINGS.English[infoKey];
          panel.querySelector('#mm-result').before(infoEl);
        }
        // Strip Korean/English recipient salutation that AI mistakenly echoes back
        let _rawReply = (data.reply || '').trim();
        // "형우님,\n..." or "형우님,\n\n..." — own line
        _rawReply = _rawReply.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]?\s*[\r\n]+/, '').trim();
        // "형우님, 안녕하세요" — same line
        _rawReply = _rawReply.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]\s*/, '').trim();
        // 발신자 자기소개 반복 방지: "안녕하세요, ○○입니다." 형태로 시작하는 첫 줄 제거
        _rawReply = _rawReply.replace(/^안녕하세요[,，]?\s*.{1,40}입니다[\.\!]*\s*[\r\n]*/i, '').trim();
        const replyWithSig = await appendSignature(_rawReply);
        _replySignature = replyWithSig.slice(_rawReply.length).replace(/^\n\n/, ''); // 서명만 추출
        panel.querySelector('#mm-output').value = replyWithSig;
        panel.querySelector('#mm-result').style.display = 'block';

        // Worker가 감지한 국가를 드롭다운에 반영 (frontend 감지 실패 시 보완)
        if (data.detectedCountry && selectedCountry === 'auto') {
          const dc = data.detectedCountry;
          const countryMap = { Japanese: 'Japanese', Korean: 'Korean', English: 'English', German: 'German', Portuguese: 'Portuguese', Chinese: 'Chinese', French: 'French', Italian: 'Italian', Vietnamese: 'Vietnamese', Dutch: 'Dutch', Polish: 'Polish', Turkish: 'Turkish', Hindi: 'Hindi', Spanish: 'Spanish' };
          const matched = Object.keys(countryMap).find(k => dc.includes(k));
          if (matched) {
            selectedCountry = matched;
            const cs = panel.querySelector('#mm-country-select');
            if (cs) cs.value = matched;
          }
        }

        // Smart Reply Guard
        const guardEl = panel.querySelector('#mm-guard');
        const guardText = panel.querySelector('#mm-guard-text');
        if (guardEl && guardText) {
          const guards = [];
          const uiG = getUILang(selectedMyLang);

          // 첨부파일 언급
          if (replyWithSig.includes('첨부') || replyWithSig.includes('견적') || replyWithSig.includes('attach') || replyWithSig.includes('quote')) {
            const msg = {
              Korean: '⚠️ 첨부파일 언급됨 — 발송 전 확인하세요.',
              Japanese: '⚠️ 添付ファイルが言及されています — 送信前に確認してください。',
              Chinese: '⚠️ 提到了附件 — 发送前请确认。',
              German: '⚠️ Anhang erwähnt — bitte vor dem Senden prüfen.',
              French: '⚠️ Pièce jointe mentionnée — vérifiez avant d\'envoyer.',
            }[selectedMyLang] || '⚠️ Attachment mentioned — please check before sending.';
            guards.push(msg);
          }

          // 문화 노트
          if (data.culturalNote) {
            guards.push(`💡 ${sanitize(data.culturalNote)}`);
          } else if (selectedCountry === 'Japanese' || (data.detectedCountry && data.detectedCountry.includes('Japanese'))) {
            const msg = {
              Korean: '💡 일본 경어체(敬語) 적용됨.',
              Japanese: '💡 日本語の敬語スタイルが適用されています。',
              Chinese: '💡 已应用日语敬语风格。',
            }[selectedMyLang] || '💡 Japanese Keigo (敬語) formality applied.';
            guards.push(msg);
          }

          // ★ 금액 불일치 감지
          const origAmounts = extractAmounts(emailContent);
          const replyAmounts = extractAmounts(replyWithSig);
          if (origAmounts.length > 0 && replyAmounts.length > 0) {
            const mismatched = replyAmounts.filter(a => !origAmounts.some(b => b.replace(/[,\s]/g,'') === a.replace(/[,\s]/g,'')));
            if (mismatched.length > 0) {
              const msg = {
                Korean: `⚠️ 금액 불일치: 원본 이메일의 <strong>${sanitize(origAmounts.join(', '))}</strong>와 답장의 <strong>${sanitize(mismatched.join(', '))}</strong>가 다릅니다 — 확인하세요.`,
                Japanese: `⚠️ 金額の不一致: 元メールの <strong>${sanitize(origAmounts.join(', '))}</strong> と返信の <strong>${sanitize(mismatched.join(', '))}</strong> が異なります。`,
                Chinese: `⚠️ 金额不一致: 原邮件为 <strong>${sanitize(origAmounts.join(', '))}</strong>，回复中为 <strong>${sanitize(mismatched.join(', '))}</strong>。`,
              }[selectedMyLang] || `⚠️ Amount mismatch: original has <strong>${sanitize(origAmounts.join(', '))}</strong> but reply says <strong>${sanitize(mismatched.join(', '))}</strong> — double check.`;
              guards.push(msg);
            }
          }

          // ★ 날짜 불일치 감지
          const origDate = parseDateFromText(emailContent);
          const replyDate = parseDateFromText(replyWithSig);
          cachedOrigDate = origDate;
          cachedReplyDate = replyDate;
          if (origDate && replyDate) {
            const diffDays = Math.abs((origDate - replyDate) / 86400000);
            if (diffDays > 3) {
              const _locale = {Korean:'ko-KR',Japanese:'ja-JP',Chinese:'zh-CN',German:'de-DE',French:'fr-FR',Turkish:'tr-TR',Italian:'it-IT'}[selectedMyLang]||'en-US';
              const _d1 = origDate.toLocaleDateString(_locale);
              const _d2 = replyDate.toLocaleDateString(_locale);
              const msg = {
                Korean: `⚠️ 날짜 불일치: 이메일에는 <strong>${sanitize(_d1)}</strong>이 있는데 답장에는 <strong>${sanitize(_d2)}</strong> — 확인하세요.`,
                Japanese: `⚠️ 日付の不一致: メールには <strong>${sanitize(_d1)}</strong> がありますが、返信には <strong>${sanitize(_d2)}</strong> があります。`,
                Chinese: `⚠️ 日期不一致: 邮件中为 <strong>${sanitize(_d1)}</strong>，回复中为 <strong>${sanitize(_d2)}</strong>。`,
                German: `⚠️ Datumsdiskrepanz: E-Mail enthält <strong>${sanitize(_d1)}</strong>, Antwort sagt <strong>${sanitize(_d2)}</strong> — bitte prüfen.`,
                French: `⚠️ Incohérence de date: l'e-mail mentionne <strong>${sanitize(_d1)}</strong> mais la réponse dit <strong>${sanitize(_d2)}</strong> — vérifiez.`,
                Turkish: `⚠️ Tarih uyuşmazlığı: E-postada <strong>${sanitize(_d1)}</strong> var ama yanıtta <strong>${sanitize(_d2)}</strong> — kontrol edin.`,
                Italian: `⚠️ Discrepanza di data: l'e-mail menziona <strong>${sanitize(_d1)}</strong> ma la risposta dice <strong>${sanitize(_d2)}</strong> — verificare.`,
              }[selectedMyLang] || `⚠️ Date mismatch: email mentions <strong>${sanitize(_d1)}</strong> but reply says <strong>${sanitize(_d2)}</strong> — verify.`;
              guards.push(msg);
            }
          }

          if (guards.length > 0) {
            guardText.innerHTML = guards.join('<br><br>');
            guardEl.style.display = 'block';
          } else {
            guardEl.style.display = 'none';
          }
        }
        panel.querySelector('#mm-upgrade').style.display = 'none';
        await incrementUsage(data.monthlyUsage);
        updateBadge();
        learnStyle(selectedTone, emailContent, data.reply);

        // 약속 추출
        const promises = extractPromises(replyWithSig, selectedMyLang);
        const promisesEl = panel.querySelector('#mm-promises');
        const promisesList = panel.querySelector('#mm-promises-list');
        if (promisesEl && promisesList && promises.length > 0) {
          promisesEl.style.display = 'block';
          promisesList.innerHTML = promises.map(p => `• ${sanitize(p)}`).join('<br>');
        }


      } else if (data.error === 'MONTHLY_LIMIT') {
        panel.querySelector('#mm-upgrade').style.display = 'block';
      } else {
        showToast((getUILang(selectedMyLang).errFailed || 'Failed') + ': ' + (data.error || ''), 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }

    genBtn.disabled = false;
    genBtn.textContent = getUILang(selectedMyLang).generate;
  }

  // 다중 답변 생성 (내 언어 → 원본 언어 번역)
  // 패널 레벨 공유 변수
  let _versions = [];
  let _translations = [];
  let _currentVerIdx = 0;
  let _isTranslated = false;
  let _replyTransCache = {}; // { lang: string[] } — 버전별 번역 캐시
  let _replyDisplayedLang = null; // 현재 표시 중인 언어
  let _replyOrigLang = null; // 최초 생성 언어 (중복 탭 방지용)
  let _replySignature = ''; // 번역 시 분리 보존용 서명
  let _replyOrigVersions = []; // 번역 소스 원본 버전 (번역 누적 방지)
  let _replyOrigSingleBody = ''; // 단일버전 원본 (일반 모드)

  async function generateTriple(userData) {
    const emailContent = getEmailThread();
    if (!emailContent) { showToast(getUILang(selectedMyLang).errNotFound || 'Email content not found.', 'error'); return; }

    if (userData.monthlyCount >= userData.monthlyLimit) {
      panel.querySelector('#mm-upgrade').style.display = 'block';
      return;
    }

    const btn = panel.querySelector('#mm-triple');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = getUILang(selectedMyLang).generating || '✨ Generating...';
    panel.querySelector('#mm-summary').style.display = 'none';
    panel.querySelector('#mm-lang-btn').style.display = 'none';
    panel.querySelector('#mm-versions').style.display = 'none';

    try {
      const res = await fetch(`${WORKER_URL}/generate-triple`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent,
          tone: selectedTone,
          honorific: selectedHonorific,
          myLanguage: selectedMyLang,
          country: selectedCountry,
          email: userData.userEmail,
          userId: userData.userId,
          ...(userData.businessCard ? { businessCard: userData.businessCard } : {}),
          ...(userData.phrases?.length ? { phrases: userData.phrases } : {})
        })
      });
      const data = await res.json();

      if (data.success && data.versions?.length > 0) {
        const _maxVer = (userData.plan === 'pro' || userData.plan === 'team') ? 3 : 2;
        _versions = data.versions.slice(0, _maxVer).map(_stripSalutation);
        _replyOrigVersions = _versions.map(v => v); // 원본 보존 (번역 소스)
        _replyOrigSingleBody = '';
        _translations = await Promise.all((data.translations || []).slice(0, _maxVer).map(t => t ? appendSignature(t) : t));
        _currentVerIdx = 0;
        _isTranslated = false;
        _replyTransCache = {}; _replyDisplayedLang = selectedMyLang; _replyOrigLang = selectedMyLang;
        const versions = _versions;
        const translations = _translations;

        const _tripleWithSig = await appendSignature(versions[0]);
        _replySignature = _tripleWithSig.slice(versions[0].length).replace(/^\n\n/, '');
        panel.querySelector('#mm-output').value = _tripleWithSig;
        panel.querySelector('#mm-result').style.display = 'block';
        panel.querySelector('#mm-upgrade').style.display = 'none';

        // 자동발송/뉴스레터 감지 배너
        const _existTripleAI = panel.querySelector('#mm-auto-email-info');
        if (_existTripleAI) _existTripleAI.remove();
        if (data.isAutoEmail) {
          const _uiAT = getUILang(selectedMyLang);
          const _infoKeyT = data.emailType === 'transactional' ? 'transactional_info' : 'newsletter_info';
          const _infoElT = document.createElement('div');
          _infoElT.id = 'mm-auto-email-info';
          _infoElT.style.cssText = 'background:#e8f0fe;border:1px solid #4285f4;color:#1a73e8;border-radius:8px;padding:12px;margin-bottom:10px;font-size:12px;line-height:1.6;';
          _infoElT.textContent = _uiAT[_infoKeyT] || UI_STRINGS.English[_infoKeyT];
          panel.querySelector('#mm-result').before(_infoElT);
        }

        // 탭 렌더링 (먼저 실행 — edit-bar 오류와 무관하게 탭 표시)
        const verTabs = panel.querySelector('#mm-ver-tabs');
        const toneName = getToneLabel(selectedTone, selectedMyLang);
        verTabs.innerHTML = versions.map((_, i) =>
          `<button class="mm-ver-btn" data-ver="${i}" style="font-size:11px;padding:4px 12px;border:1px solid ${i===0?'#e91e8c':'#dadce0'};border-radius:20px;background:${i===0?'#fce4ec':'#fff'};color:${i===0?'#e91e8c':'#5f6368'};cursor:pointer">${toneName} ${i+1}</button>`
        ).join('') + `<button id="mm-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
        panel.querySelector('#mm-versions').style.display = 'block';

        // edit-bar / edit-btn (null-safety)
        const _eb = panel.querySelector('#mm-edit-bar');
        const _ebn = panel.querySelector('#mm-edit-btn');
        if (_eb) _eb.style.display = 'flex';
        if (_ebn) _ebn.style.display = 'none';

        // Worker 감지 국가 드롭다운 반영
        if (data.detectedCountry && selectedCountry === 'auto') {
          const dc = data.detectedCountry;
          const matched = ['Japanese','Korean','English','German','Portuguese','Chinese','French','Italian','Vietnamese','Dutch','Polish','Turkish','Hindi','Spanish'].find(k => dc.includes(k));
          if (matched) { selectedCountry = matched; const cs = panel.querySelector('#mm-country-select'); if (cs) cs.value = matched; }
        }

        verTabs.querySelectorAll('.mm-ver-btn').forEach(btn => {
          btn.addEventListener('click', async function() {
            verTabs.querySelectorAll('.mm-ver-btn').forEach(b => {
              b.style.border = '1px solid #dadce0';
              b.style.background = '#fff';
              b.style.color = '#5f6368';
            });
            this.style.border = '1px solid #e91e8c';
            this.style.background = '#fce4ec';
            this.style.color = '#e91e8c';
            _currentVerIdx = parseInt(this.dataset.ver);
            panel.querySelector('#mm-output').value = (_isTranslated && _translations[_currentVerIdx])
              ? _translations[_currentVerIdx]
              : await appendSignature(_versions[_currentVerIdx]);
            const _ebv = panel.querySelector('#mm-edit-bar');
            const _ebnv = panel.querySelector('#mm-edit-btn');
            if (_ebv) _ebv.style.display = 'flex';
            if (_ebnv) _ebnv.style.display = 'none';
          });
        });
        verTabs.querySelector('#mm-ver-confirm')?.addEventListener('click', () => {
          panel.querySelector('#mm-versions').style.display = 'none';
        });

        // 번역 버튼 (이미 준비됨!)
        if (translations.length > 0) {
          const langBtnEl = panel.querySelector('#mm-lang-btn');
          langBtnEl.style.display = 'block';
          const switchBtn = panel.querySelector('#mm-switch-lang');
          const newBtn = switchBtn.cloneNode(true);
          switchBtn.parentNode.replaceChild(newBtn, switchBtn);
          newBtn.textContent = getUILang(selectedMyLang).sendOriginal || '🌐 Send in original language';
          newBtn.style.background = '#1a73e8';

          newBtn.addEventListener('click', async function() {
            if (_isTranslated) {
              panel.querySelector('#mm-output').value = await appendSignature(_versions[_currentVerIdx]);
              this.textContent = getUILang(selectedMyLang).sendOriginal || '🌐 Send in original language';
              this.style.background = '#1a73e8';
              _isTranslated = false;
              _replyDisplayedLang = _replyOrigLang;
            } else {
              panel.querySelector('#mm-output').value = _translations[_currentVerIdx] || _versions[_currentVerIdx];
              this.textContent = '🔄 Back to ' + selectedMyLang;
              this.style.background = '#34a853';
              _isTranslated = true;
              _replyDisplayedLang = null;
            }
          });
        }

        await incrementUsage(data.monthlyUsage);
        updateBadge();
      } else if (data.error === 'MONTHLY_LIMIT') {
        panel.querySelector('#mm-upgrade').style.display = 'block';
      } else {
        showToast((getUILang(selectedMyLang).errFailed || 'Failed') + ': ' + (data.error || ''), 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = origText;
  }

  // 이중언어 생성
  async function generateSmart(userData) {
    const emailContent = getEmailThread();
    if (!emailContent) { showToast(getUILang(selectedMyLang).errNotFound || 'Email content not found.', 'error'); return; }

    if (userData.plan !== 'pro' && userData.plan !== 'team') { showToast(getUILang(selectedMyLang).smartPlanMsg || 'Smart Reply requires Pro plan', 'error'); return; }
    if (userData.monthlyCount >= userData.monthlyLimit) {
      panel.querySelector('#mm-upgrade').style.display = 'block';
      return;
    }

    const btn = panel.querySelector('#mm-smart');
    btn.disabled = true;
    btn.textContent = '🌍 Analyzing...';
    panel.querySelector('#mm-versions').style.display = 'none';
    panel.querySelector('#mm-lang-btn').style.display = 'none';

    try {
      const res = await fetch(`${WORKER_URL}/generate-smart`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent,
          tone: selectedTone,
          honorific: selectedHonorific,
          myLanguage: selectedMyLang,
          country: selectedCountry,
          email: userData.userEmail,
          userId: userData.userId,
          ...(userData.businessCard ? { businessCard: userData.businessCard } : {}),
          ...(userData.phrases?.length ? { phrases: userData.phrases } : {})
        })
      });
      const data = await res.json();

      if (data.success) {
        _versions = (data.versions || []).map(_stripSalutation);
        _replyOrigVersions = _versions.map(v => v); // 원본 보존 (번역 소스)
        _replyOrigSingleBody = '';
        _translations = await Promise.all((data.translations || []).map(t => t ? appendSignature(t) : t));
        _currentVerIdx = 0;
        _isTranslated = false;
        _replyTransCache = {}; _replyDisplayedLang = selectedMyLang; _replyOrigLang = selectedMyLang;
        const versions = _versions;
        const translations = _translations;

        // 요약 표시
        const summaryEl = panel.querySelector('#mm-summary');
        summaryEl.style.display = 'block';
        summaryEl.innerHTML = `📋 <strong>Summary (${sanitize(data.detected_language || 'English')}):</strong><br>${sanitize(data.summary)}`;

        // 첫번째 버전 표시
        const _smartWithSig = await appendSignature(versions[0] || '');
        _replySignature = versions[0] ? _smartWithSig.slice(versions[0].length).replace(/^\n\n/, '') : '';
        panel.querySelector('#mm-output').value = _smartWithSig;
        panel.querySelector('#mm-result').style.display = 'block';
        panel.querySelector('#mm-upgrade').style.display = 'none';

        // 자동발송/뉴스레터 감지 배너
        const _existSmartAI = panel.querySelector('#mm-auto-email-info');
        if (_existSmartAI) _existSmartAI.remove();
        if (data.isAutoEmail) {
          const _uiAS = getUILang(selectedMyLang);
          const _infoKeyS = data.emailType === 'transactional' ? 'transactional_info' : 'newsletter_info';
          const _infoElS = document.createElement('div');
          _infoElS.id = 'mm-auto-email-info';
          _infoElS.style.cssText = 'background:#e8f0fe;border:1px solid #4285f4;color:#1a73e8;border-radius:8px;padding:12px;margin-bottom:10px;font-size:12px;line-height:1.6;';
          _infoElS.textContent = _uiAS[_infoKeyS] || UI_STRINGS.English[_infoKeyS];
          panel.querySelector('#mm-result').before(_infoElS);
        }

        // 버전 탭 표시 (edit-bar 코드보다 먼저)
        if (versions.length > 1) {
          const verTabs = panel.querySelector('#mm-ver-tabs');
          verTabs.innerHTML = versions.map((_, i) =>
            `<button class="mm-ver-tab${i===0?' active':''}" data-idx="${i}">버전 ${i+1}</button>`
          ).join('') + `<button id="mm-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
          panel.querySelector('#mm-versions').style.display = 'block';
          verTabs.querySelectorAll('.mm-ver-tab').forEach(tab => {
            tab.addEventListener('click', async function() {
              _currentVerIdx = parseInt(this.dataset.idx);
              verTabs.querySelectorAll('.mm-ver-tab').forEach(t => t.classList.remove('active'));
              this.classList.add('active');
              panel.querySelector('#mm-output').value = (_isTranslated && _translations[_currentVerIdx])
                ? _translations[_currentVerIdx]
                : await appendSignature(_versions[_currentVerIdx]);
            });
          });
          verTabs.querySelector('#mm-ver-confirm')?.addEventListener('click', () => {
            panel.querySelector('#mm-versions').style.display = 'none';
          });
        }

        // edit-bar / edit-btn (null-safety)
        const _ebS = panel.querySelector('#mm-edit-bar');
        const _ebnS = panel.querySelector('#mm-edit-btn');
        if (_ebS) _ebS.style.display = 'flex';
        if (_ebnS) _ebnS.style.display = 'none';

        // 번역 버튼
        if (translations.length > 0) {
          const langBtnEl = panel.querySelector('#mm-lang-btn');
          langBtnEl.style.display = 'block';
          const switchBtn = panel.querySelector('#mm-switch-lang');
          const newBtn = switchBtn.cloneNode(true);
          switchBtn.parentNode.replaceChild(newBtn, switchBtn);
          newBtn.textContent = getUILang(selectedMyLang).sendOriginal || `🌐 Send in ${data.detected_language || 'original language'}`;
          newBtn.style.background = '#34a853';

          newBtn.addEventListener('click', async function() {
            if (_isTranslated) {
              panel.querySelector('#mm-output').value = await appendSignature(_versions[_currentVerIdx]);
              this.textContent = getUILang(selectedMyLang).sendOriginal || `🌐 Send in ${data.detected_language || 'original language'}`;
              this.style.background = '#34a853';
              _isTranslated = false;
            } else {
              panel.querySelector('#mm-output').value = _translations[_currentVerIdx] || _versions[_currentVerIdx];
              this.textContent = `🔄 Back to ${selectedMyLang}`;
              this.style.background = '#1a73e8';
              _isTranslated = true;
              _replyDisplayedLang = null;
            }
          });
        }

        await incrementUsage(data.monthlyUsage);
        updateBadge();
      } else if (data.error === 'MONTHLY_LIMIT') {
        panel.querySelector('#mm-upgrade').style.display = 'block';
      } else {
        showToast((getUILang(selectedMyLang).errFailed || 'Failed') + ': ' + (data.error || ''), 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = getUILang(selectedMyLang || 'Korean').smartReply;
  }

  // ===== 다듬기 Diff 헬퍼 =====
  const _mmDiffI18n = {
    Korean:     { title:'✨ 다듬기 비교', hint:'변경된 부분이 표시됩니다', orig:'원본', result:'다듬기 결과', apply:'✅ 적용', cancel:'취소' },
    English:    { title:'✨ Polish Comparison', hint:'Changes are highlighted', orig:'Original', result:'Polished Result', apply:'✅ Apply', cancel:'Cancel' },
    Japanese:   { title:'✨ 修正比較', hint:'変更箇所が表示されます', orig:'元のテキスト', result:'修正結果', apply:'✅ 適用', cancel:'キャンセル' },
    Chinese:    { title:'✨ 润色对比', hint:'显示更改的部分', orig:'原文', result:'润色结果', apply:'✅ 应用', cancel:'取消' },
    Spanish:    { title:'✨ Comparación', hint:'Se muestran los cambios', orig:'Original', result:'Resultado pulido', apply:'✅ Aplicar', cancel:'Cancelar' },
    French:     { title:'✨ Comparaison', hint:'Les modifications sont affichées', orig:'Original', result:'Résultat affiné', apply:'✅ Appliquer', cancel:'Annuler' },
    German:     { title:'✨ Vergleich', hint:'Änderungen werden angezeigt', orig:'Original', result:'Verfeinertes Ergebnis', apply:'✅ Anwenden', cancel:'Abbrechen' },
    Portuguese: { title:'✨ Comparação', hint:'As alterações estão destacadas', orig:'Original', result:'Resultado refinado', apply:'✅ Aplicar', cancel:'Cancelar' },
    Arabic:     { title:'✨ مقارنة التحسين', hint:'تظهر التغييرات', orig:'الأصل', result:'نتيجة التحسين', apply:'✅ تطبيق', cancel:'إلغاء' },
    Vietnamese: { title:'✨ So sánh tinh chỉnh', hint:'Các thay đổi được hiển thị', orig:'Bản gốc', result:'Kết quả tinh chỉnh', apply:'✅ Áp dụng', cancel:'Hủy' },
    Thai:       { title:'✨ การเปรียบเทียบ', hint:'แสดงส่วนที่เปลี่ยนแปลง', orig:'ต้นฉบับ', result:'ผลการปรับแต่ง', apply:'✅ นำไปใช้', cancel:'ยกเลิก' },
    Indonesian: { title:'✨ Perbandingan', hint:'Perubahan ditampilkan', orig:'Asli', result:'Hasil poles', apply:'✅ Terapkan', cancel:'Batal' },
    Italian:    { title:'✨ Confronto', hint:'Le modifiche sono evidenziate', orig:'Originale', result:'Risultato raffinato', apply:'✅ Applica', cancel:'Annulla' },
    Turkish:    { title:'✨ Karşılaştırma', hint:'Değişiklikler gösterilmektedir', orig:'Orijinal', result:'İyileştirilmiş Sonuç', apply:'✅ Uygula', cancel:'İptal' },
    Dutch:      { title:'✨ Vergelijking', hint:'Wijzigingen zijn gemarkeerd', orig:'Origineel', result:'Verfijnd resultaat', apply:'✅ Toepassen', cancel:'Annuleren' },
    Polish:     { title:'✨ Porównanie', hint:'Zmiany są podświetlone', orig:'Oryginał', result:'Dopracowany wynik', apply:'✅ Zastosuj', cancel:'Anuluj' },
    Hindi:      { title:'✨ तुलना', hint:'परिवर्तन हाइलाइट किए गए हैं', orig:'मूल', result:'परिष्कृत परिणाम', apply:'✅ लागू करें', cancel:'रद्द करें' },
    Hebrew:     { title:'✨ השוואה', hint:'שינויים מודגשים', orig:'מקורי', result:'תוצאה משופרת', apply:'✅ החל', cancel:'ביטול' },
    Malay:      { title:'✨ Perbandingan', hint:'Perubahan dipaparkan', orig:'Asal', result:'Hasil dipoles', apply:'✅ Guna', cancel:'Batal' },
  };
  function _mmGetDiffI18n(lang) { return _mmDiffI18n[lang] || _mmDiffI18n['English']; }
  function _mmEsc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _mmDiffWords(a, b) {
    const wa = a.split(/(\s+)/), wb = b.split(/(\s+)/);
    const m = wa.length, n = wb.length;
    const dp = Array.from({length:m+1},()=>new Int16Array(n+1));
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
      dp[i][j] = wa[i-1]===wb[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
    const ops=[]; let i=m,j=n;
    while(i>0||j>0){
      if(i>0&&j>0&&wa[i-1]===wb[j-1]){ops.unshift({t:'eq',v:wb[j-1]});i--;j--;}
      else if(j>0&&(i===0||dp[i][j-1]>=dp[i-1][j])){ops.unshift({t:'add',v:wb[j-1]});j--;}
      else{ops.unshift({t:'del',v:wa[i-1]});i--;}
    }
    return ops;
  }
  function _mmBuildDiff(original, refined) {
    const ol = original.split('\n'), rl = refined.split('\n');
    const max = Math.max(ol.length, rl.length);
    let oH='', rH='';
    for(let i=0;i<max;i++){
      const a=ol[i]??'', b=rl[i]??'';
      if(a===b){
        oH+=`<div style="min-height:1.4em">${_mmEsc(a)||'&nbsp;'}</div>`;
        rH+=`<div style="min-height:1.4em">${_mmEsc(b)||'&nbsp;'}</div>`;
      } else if(!a){
        oH+=`<div style="min-height:1.4em">&nbsp;</div>`;
        rH+=`<div style="min-height:1.4em;background:#dcfce7;border-radius:3px;padding:0 2px">${_mmEsc(b)}</div>`;
      } else if(!b){
        oH+=`<div style="min-height:1.4em;background:#fee2e2;border-radius:3px;padding:0 2px;text-decoration:line-through;opacity:.6">${_mmEsc(a)}</div>`;
        rH+=`<div style="min-height:1.4em">&nbsp;</div>`;
      } else {
        const ops=_mmDiffWords(a,b);
        let ah='',bh='';
        ops.forEach(op=>{
          if(op.t==='eq'){ah+=_mmEsc(op.v);bh+=_mmEsc(op.v);}
          else if(op.t==='del'){ah+=`<span style="background:#fee2e2;text-decoration:line-through">${_mmEsc(op.v)}</span>`;}
          else{bh+=`<span style="background:#dcfce7;font-weight:600">${_mmEsc(op.v)}</span>`;}
        });
        oH+=`<div style="min-height:1.4em">${ah}</div>`;
        rH+=`<div style="min-height:1.4em">${bh}</div>`;
      }
    }
    return {oH, rH};
  }
  function _mmShowDiff(ta, backupText, refined, applyFn, lang) {
    let old = panel.querySelector('#mm-diff-panel');
    if (old) old.remove();
    const {oH,rH} = _mmBuildDiff(backupText, refined);
    const di = _mmGetDiffI18n(lang || selectedMyLang);
    const dp = document.createElement('div');
    dp.id = 'mm-diff-panel';
    dp.style.cssText = 'margin:8px 0;border:1.5px solid #e0d4f7;border-radius:10px;overflow:hidden;font-size:12px;background:#fafafa';
    dp.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;padding:7px 10px;background:#f3eeff;border-bottom:1px solid #e0d4f7">
        <span style="font-size:11px;font-weight:700;color:#673ab7">${_mmEsc(di.title)}</span>
        <span style="font-size:10px;color:#999;margin-left:auto">${_mmEsc(di.hint)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div style="padding:8px 10px;border-right:1px solid #e0d4f7">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#999;margin-bottom:5px">${_mmEsc(di.orig)}</div>
          <div style="line-height:1.6;word-break:break-word">${oH}</div>
        </div>
        <div style="padding:8px 10px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#673ab7;margin-bottom:5px">${_mmEsc(di.result)}</div>
          <div style="line-height:1.6;word-break:break-word">${rH}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding:8px 10px;border-top:1px solid #e0d4f7;background:#f9f9f9">
        <button id="mm-diff-apply" style="flex:1;padding:7px;background:#673ab7;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${_mmEsc(di.apply)}</button>
        <button id="mm-diff-cancel" style="padding:7px 14px;background:#fff;color:#666;border:1px solid #ddd;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit">${_mmEsc(di.cancel)}</button>
      </div>`;
    ta.after(dp);
    dp.querySelector('#mm-diff-apply').addEventListener('click', () => { dp.remove(); applyFn(); });
    dp.querySelector('#mm-diff-cancel').addEventListener('click', () => { dp.remove(); });
  }

  // ===== 다듬기 =====
  async function refineReply() {
    const ta = panel.querySelector('#mm-output');
    // 편집 모드 중이면 현재 textarea 내용을 _versions에 즉시 반영
    if (!ta.readOnly) { _versions[_currentVerIdx] = ta.value; }
    const draft = ta.value.trim(); // 현재 표시 중인 언어(하단언어) 그대로 사용
    const ui = getUILang(selectedMyLang);
    if (!draft) { showToast(ui.refineInput, 'error'); return; }
    const backupText = ta.value; // 실패 시 복원용 백업
    const ud = await getUserData();
    if (!ud.userEmail) { showToast(ui.errLogin || '로그인이 필요합니다.', 'error'); return; }
    if (ud.plan === 'free') { showToast(ui.refinePlanMsg || 'Draft polish requires Basic plan or above', 'error'); return; }
    // refine-compose는 서버에서 사용량 차감 안 함 → 월간 카운트 체크 불필요
    const btn = panel.querySelector('#mm-refine-btn');
    btn.disabled = true; btn.textContent = ui.refining;
    const _refineLang = _replyDisplayedLang || selectedMyLang; // 하단언어 유지
    try {
      const stored = await new Promise(r => chrome.storage.sync.get(['userInfo'], r));
      const res = await fetch(`${WORKER_URL}/refine-compose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, refineGoal: 'enhance', tone: selectedTone, honorific: selectedHonorific, myLanguage: _refineLang, email: ud.userEmail, country: selectedCountry, clientDate: new Date().toISOString(), ...(stored.userInfo ? { userInfo: stored.userInfo } : {}) })
      });
      const data = await res.json();
      if (data.success) {
        const refined = (data.body || data.reply || '').trim();
        if (!refined) { ta.value = backupText; showToast(ui.refineEmpty, 'error'); return; }
        // Diff 뷰 표시: 사용자가 확인 후 적용
        _mmShowDiff(ta, backupText, refined, async () => {
          ta.value = refined;
          _versions = [refined]; _replyOrigVersions = [refined]; _replyOrigSingleBody = ''; _translations = []; _currentVerIdx = 0; _isTranslated = false; _replyTransCache = {}; _replyDisplayedLang = _refineLang; _replyOrigLang = _refineLang;
          ta.readOnly = true; ta.style.background = '#f8f9fa'; ta.style.borderColor = '#dadce0';
          panel.querySelector('#mm-edit-btn').style.display = '';
          panel.querySelector('#mm-edit-bar').style.display = 'none';
          showToast(ui.refineDone, 'success');
          await incrementUsage(data.monthlyUsage ?? (ud.monthlyCount + 1));
          updateBadge();
        }, _refineLang);
      } else if (data.error === 'MONTHLY_LIMIT') {
        panel.querySelector('#mm-upgrade').style.display = 'block';
      } else {
        showToast(ui.refineFailed, 'error');
      }
    } catch(e) { ta.value = backupText; showToast(ui.refineFailed, 'error'); }
    btn.disabled = false; btn.textContent = ui.refine;
  }

  // ===== 문화/업종/성향 감지 =====
  function detectAndShowInfo(emailContent, forceLang) {
    const text = emailContent.toLowerCase();
    const infos = [];
    const lang = forceLang || selectedMyLang || 'Korean';

    // 업종/문화/성향 감지 텍스트 i18n 맵
    const DETECT_I18N = {
      Korean: {
        japan:    '🇯🇵 일본 비즈니스 문화 · 경어체 적용',
        china:    '🇨🇳 중국 · 격식체 적용',
        korean:   '🇰🇷 한국어 · 존댓말 적용',
        arabic:   '🇸🇦 아랍 · 이슬람 비즈니스 문화 적용',
        thai:     '🇹🇭 태국 · 공손한 표현 적용',
        trade:    '🏭 무역/물류 업종 감지',
        legal:    '⚖️ 법률 업종 감지',
        it:       '💻 IT 업종 감지 · 기술 용어 적용',
        finance:  '💰 금융/회계 업종 감지',
        medical:  '🏥 의료 업종 감지',
        urgent:   '⚡ 긴급 톤 감지 → 간결 답장 추천',
        positive: '😊 긍정 톤 감지 → 친근 답장 추천',
        complaint:'⚠️ 불만 감지 → 사과 답장 추천',
        negotiate:'🤝 협상 컨텍스트 감지',
      },
      English: {
        japan:    '🇯🇵 Japan business culture · Keigo applied',
        china:    '🇨🇳 China · Formal business style applied',
        korean:   '🇰🇷 Korean · Formal speech applied',
        arabic:   '🇸🇦 Arabic · Islamic business culture applied',
        thai:     '🇹🇭 Thai · Respectful expressions applied',
        trade:    '🏭 Trade/Logistics industry detected',
        legal:    '⚖️ Legal industry detected',
        it:       '💻 IT industry detected · Tech terms applied',
        finance:  '💰 Finance/Accounting industry detected',
        medical:  '🏥 Medical industry detected',
        urgent:   '⚡ Urgent tone detected → Concise recommended',
        positive: '😊 Positive tone detected → Friendly recommended',
        complaint:'⚠️ Complaint detected → Apologetic recommended',
        negotiate:'🤝 Negotiation context detected',
      },
      Japanese: {
        japan:    '🇯🇵 日本ビジネス文化 · 敬語適用',
        china:    '🇨🇳 中国 · フォーマルスタイル適用',
        korean:   '🇰🇷 韓国語 · 敬語適用',
        arabic:   '🇸🇦 アラビア語 · イスラムビジネス文化適用',
        thai:     '🇹🇭 タイ · 丁寧な表現適用',
        trade:    '🏭 貿易/物流業種を検出',
        legal:    '⚖️ 法律業種を検出',
        it:       '💻 IT業種を検出 · 技術用語適用',
        finance:  '💰 金融/会計業種を検出',
        medical:  '🏥 医療業種を検出',
        urgent:   '⚡ 緊急トーン検出 → 簡潔な返信を推奨',
        positive: '😊 ポジティブトーン検出 → フレンドリーを推奨',
        complaint:'⚠️ クレーム検出 → お詫びを推奨',
        negotiate:'🤝 交渉コンテキスト検出',
      },
      Chinese: {
        japan:    '🇯🇵 日本商务文化 · 敬语适用',
        china:    '🇨🇳 中文 · 正式商务风格适用',
        korean:   '🇰🇷 韩语 · 敬语适用',
        arabic:   '🇸🇦 阿拉伯语 · 伊斯兰商务文化适用',
        thai:     '🇹🇭 泰语 · 礼貌表达适用',
        trade:    '🏭 检测到贸易/物流行业',
        legal:    '⚖️ 检测到法律行业',
        it:       '💻 检测到IT行业 · 技术术语适用',
        finance:  '💰 检测到金融/会计行业',
        medical:  '🏥 检测到医疗行业',
        urgent:   '⚡ 检测到紧急语气 → 推荐简洁回复',
        positive: '😊 检测到积极语气 → 推荐友好回复',
        complaint:'⚠️ 检测到投诉 → 推荐致歉回复',
        negotiate:'🤝 检测到谈判背景',
      },
      Spanish: {
        japan:    '🇯🇵 Cultura empresarial japonesa · Keigo aplicado',
        china:    '🇨🇳 China · Estilo formal aplicado',
        korean:   '🇰🇷 Coreano · Lenguaje formal aplicado',
        arabic:   '🇸🇦 Árabe · Cultura empresarial islámica aplicada',
        thai:     '🇹🇭 Tailandés · Expresiones respetuosas aplicadas',
        trade:    '🏭 Industria comercio/logística detectada',
        legal:    '⚖️ Industria legal detectada',
        it:       '💻 Industria IT detectada · Términos técnicos aplicados',
        finance:  '💰 Industria finanzas/contabilidad detectada',
        medical:  '🏥 Industria médica detectada',
        urgent:   '⚡ Tono urgente detectado → Se recomienda respuesta concisa',
        positive: '😊 Tono positivo detectado → Se recomienda respuesta amigable',
        complaint:'⚠️ Queja detectada → Se recomienda respuesta de disculpa',
        negotiate:'🤝 Contexto de negociación detectado',
      },
      French: {
        japan:    '🇯🇵 Culture d\'affaires japonaise · Keigo appliqué',
        china:    '🇨🇳 Chine · Style formel appliqué',
        korean:   '🇰🇷 Coréen · Langage formel appliqué',
        arabic:   '🇸🇦 Arabe · Culture d\'affaires islamique appliquée',
        thai:     '🇹🇭 Thaï · Expressions respectueuses appliquées',
        trade:    '🏭 Industrie commerce/logistique détectée',
        legal:    '⚖️ Industrie juridique détectée',
        it:       '💻 Industrie IT détectée · Termes techniques appliqués',
        finance:  '💰 Industrie finance/comptabilité détectée',
        medical:  '🏥 Industrie médicale détectée',
        urgent:   '⚡ Ton urgent détecté → Réponse concise recommandée',
        positive: '😊 Ton positif détecté → Réponse amicale recommandée',
        complaint:'⚠️ Plainte détectée → Réponse d\'excuse recommandée',
        negotiate:'🤝 Contexte de négociation détecté',
      },
      German: {
        japan:    '🇯🇵 Japanische Geschäftskultur · Keigo angewendet',
        china:    '🇨🇳 China · Formeller Stil angewendet',
        korean:   '🇰🇷 Koreanisch · Formelle Sprache angewendet',
        arabic:   '🇸🇦 Arabisch · Islamische Geschäftskultur angewendet',
        thai:     '🇹🇭 Thailändisch · Respektvolle Ausdrücke angewendet',
        trade:    '🏭 Handels-/Logistikbranche erkannt',
        legal:    '⚖️ Rechtsbranche erkannt',
        it:       '💻 IT-Branche erkannt · Fachbegriffe angewendet',
        finance:  '💰 Finanz-/Buchhaltungsbranche erkannt',
        medical:  '🏥 Medizinische Branche erkannt',
        urgent:   '⚡ Dringender Ton erkannt → Knappe Antwort empfohlen',
        positive: '😊 Positiver Ton erkannt → Freundliche Antwort empfohlen',
        complaint:'⚠️ Beschwerde erkannt → Entschuldigende Antwort empfohlen',
        negotiate:'🤝 Verhandlungskontext erkannt',
      },
      Portuguese: {
        japan:    '🇯🇵 Cultura empresarial japonesa · Keigo aplicado',
        china:    '🇨🇳 China · Estilo formal aplicado',
        korean:   '🇰🇷 Coreano · Linguagem formal aplicada',
        arabic:   '🇸🇦 Árabe · Cultura empresarial islâmica aplicada',
        thai:     '🇹🇭 Tailandês · Expressões respeitosas aplicadas',
        trade:    '🏭 Indústria comércio/logística detectada',
        legal:    '⚖️ Indústria jurídica detectada',
        it:       '💻 Indústria de TI detectada · Termos técnicos aplicados',
        finance:  '💰 Indústria financeira/contabilidade detectada',
        medical:  '🏥 Indústria médica detectada',
        urgent:   '⚡ Tom urgente detectado → Resposta concisa recomendada',
        positive: '😊 Tom positivo detectado → Resposta amigável recomendada',
        complaint:'⚠️ Reclamação detectada → Resposta de desculpa recomendada',
        negotiate:'🤝 Contexto de negociação detectado',
      },
      Arabic: {
        japan:    '🇯🇵 ثقافة الأعمال اليابانية · تم تطبيق Keigo',
        china:    '🇨🇳 الصين · تم تطبيق الأسلوب الرسمي',
        korean:   '🇰🇷 الكورية · تم تطبيق اللغة الرسمية',
        arabic:   '🇸🇦 العربية · تم تطبيق ثقافة الأعمال الإسلامية',
        thai:     '🇹🇭 التايلاندية · تم تطبيق التعابير المحترمة',
        trade:    '🏭 تم اكتشاف صناعة التجارة/اللوجستيات',
        legal:    '⚖️ تم اكتشاف الصناعة القانونية',
        it:       '💻 تم اكتشاف صناعة تكنولوجيا المعلومات · المصطلحات التقنية مطبقة',
        finance:  '💰 تم اكتشاف صناعة المال/المحاسبة',
        medical:  '🏥 تم اكتشاف الصناعة الطبية',
        urgent:   '⚡ تم اكتشاف نبرة عاجلة → يُنصح بالرد الموجز',
        positive: '😊 تم اكتشاف نبرة إيجابية → يُنصح بالرد الودي',
        complaint:'⚠️ تم اكتشاف شكوى → يُنصح بالرد الاعتذاري',
        negotiate:'🤝 تم اكتشاف سياق تفاوضي',
      },
      Turkish: {
        japan:'🇯🇵 Japon iş kültürü · Keigo uygulandı', china:'🇨🇳 Çin · Resmi stil uygulandı',
        korean:'🇰🇷 Korece · Resmi dil uygulandı', arabic:'🇸🇦 Arapça · İslam iş kültürü uygulandı',
        thai:'🇹🇭 Tayca · Saygılı ifadeler uygulandı',
        trade:'🏭 Ticaret/Lojistik sektörü tespit edildi', legal:'⚖️ Hukuk sektörü tespit edildi',
        it:'💻 IT sektörü tespit edildi · Teknik terimler uygulandı',
        finance:'💰 Finans/Muhasebe sektörü tespit edildi', medical:'🏥 Tıp sektörü tespit edildi',
        urgent:'⚡ Acil ton tespit edildi → Kısa yanıt önerilir',
        positive:'😊 Olumlu ton tespit edildi → Dostça yanıt önerilir',
        complaint:'⚠️ Şikayet tespit edildi → Özür yanıtı önerilir',
        negotiate:'🤝 Müzakere bağlamı tespit edildi',
      },
      Italian: {
        japan:'🇯🇵 Cultura aziendale giapponese · Keigo applicato', china:'🇨🇳 Cina · Stile formale applicato',
        korean:'🇰🇷 Coreano · Lingua formale applicata', arabic:'🇸🇦 Arabo · Cultura islamica applicata',
        thai:'🇹🇭 Tailandese · Espressioni rispettose applicate',
        trade:'🏭 Settore commercio/logistica rilevato', legal:'⚖️ Settore legale rilevato',
        it:'💻 Settore IT rilevato · Termini tecnici applicati',
        finance:'💰 Settore finanza/contabilità rilevato', medical:'🏥 Settore medico rilevato',
        urgent:'⚡ Tono urgente rilevato → Risposta concisa consigliata',
        positive:'😊 Tono positivo rilevato → Risposta amichevole consigliata',
        complaint:'⚠️ Reclamo rilevato → Risposta di scuse consigliata',
        negotiate:'🤝 Contesto di negoziazione rilevato',
      },
      Vietnamese: {
        japan:'🇯🇵 Văn hóa kinh doanh Nhật Bản · Keigo được áp dụng', china:'🇨🇳 Trung Quốc · Phong cách trang trọng',
        korean:'🇰🇷 Tiếng Hàn · Ngôn ngữ trang trọng', arabic:'🇸🇦 Tiếng Ả Rập · Văn hóa Hồi giáo',
        thai:'🇹🇭 Tiếng Thái · Biểu đạt lịch sự',
        trade:'🏭 Phát hiện ngành thương mại/logistics', legal:'⚖️ Phát hiện ngành pháp lý',
        it:'💻 Phát hiện ngành IT · Thuật ngữ kỹ thuật',
        finance:'💰 Phát hiện ngành tài chính', medical:'🏥 Phát hiện ngành y tế',
        urgent:'⚡ Phát hiện giọng điệu khẩn cấp → Nên trả lời ngắn gọn',
        positive:'😊 Phát hiện giọng điệu tích cực → Nên trả lời thân thiện',
        complaint:'⚠️ Phát hiện khiếu nại → Nên trả lời xin lỗi',
        negotiate:'🤝 Phát hiện bối cảnh đàm phán',
      },
      Thai: {
        japan:'🇯🇵 วัฒนธรรมธุรกิจญี่ปุ่น · ใช้ Keigo', china:'🇨🇳 จีน · สไตล์เป็นทางการ',
        korean:'🇰🇷 ภาษาเกาหลี · ภาษาทางการ', arabic:'🇸🇦 ภาษาอาหรับ · วัฒนธรรมอิสลาม',
        thai:'🇹🇭 ไทย · การแสดงออกที่สุภาพ',
        trade:'🏭 ตรวจพบอุตสาหกรรมการค้า/โลจิสติกส์', legal:'⚖️ ตรวจพบอุตสาหกรรมกฎหมาย',
        it:'💻 ตรวจพบอุตสาหกรรม IT · คำศัพท์เทคนิค',
        finance:'💰 ตรวจพบอุตสาหกรรมการเงิน', medical:'🏥 ตรวจพบอุตสาหกรรมการแพทย์',
        urgent:'⚡ ตรวจพบน้ำเสียงเร่งด่วน → แนะนำตอบกระชับ',
        positive:'😊 ตรวจพบน้ำเสียงบวก → แนะนำตอบเป็นมิตร',
        complaint:'⚠️ ตรวจพบการร้องเรียน → แนะนำตอบขอโทษ',
        negotiate:'🤝 ตรวจพบบริบทการเจรจา',
      },
      Indonesian: {
        japan:'🇯🇵 Budaya bisnis Jepang · Keigo diterapkan', china:'🇨🇳 Tiongkok · Gaya formal',
        korean:'🇰🇷 Bahasa Korea · Bahasa formal', arabic:'🇸🇦 Bahasa Arab · Budaya Islam',
        thai:'🇹🇭 Bahasa Thai · Ekspresi sopan',
        trade:'🏭 Industri perdagangan/logistik terdeteksi', legal:'⚖️ Industri hukum terdeteksi',
        it:'💻 Industri IT terdeteksi · Istilah teknis diterapkan',
        finance:'💰 Industri keuangan terdeteksi', medical:'🏥 Industri medis terdeteksi',
        urgent:'⚡ Nada mendesak terdeteksi → Disarankan balasan singkat',
        positive:'😊 Nada positif terdeteksi → Disarankan balasan ramah',
        complaint:'⚠️ Keluhan terdeteksi → Disarankan balasan permohonan maaf',
        negotiate:'🤝 Konteks negosiasi terdeteksi',
      },
    };

    const d = DETECT_I18N[lang] || DETECT_I18N['English'];

    // 언어 감지
    const _csBadge = panel.querySelector('#mm-country-select');
    const _ecNs = emailContent.replace(/\s+/g,''); const _ecLen = _ecNs.length||1;
    const _hasLang = r => { const m = _ecNs.match(r); return m && m.length >= 5 && m.length/_ecLen >= 0.05; };
    if (_hasLang(/[\u3040-\u30ff]/g)) { infos.push(d.japan); if (selectedCountry === 'auto') { selectedCountry = 'Japanese'; if (_csBadge) _csBadge.value = 'Japanese'; } }
    else if (_hasLang(/[\u4e00-\u9fff]/g)) { infos.push(d.china); if (selectedCountry === 'auto') { selectedCountry = 'Chinese'; if (_csBadge) _csBadge.value = 'Chinese'; } }
    else if (_hasLang(/[\uAC00-\uD7AF]/g)) { infos.push(d.korean); if (selectedCountry === 'auto') { selectedCountry = 'Korean'; if (_csBadge) _csBadge.value = 'Korean'; } }
    else if (_hasLang(/[\u0600-\u06FF]/g)) { infos.push(d.arabic); if (selectedCountry === 'auto') { selectedCountry = 'auto'; if (_csBadge) _csBadge.value = 'auto'; } }
    else if (_hasLang(/[\u0E00-\u0E7F]/g)) { infos.push(d.thai); }

    // 업종 감지
    if (/lc|letter of credit|fob|cif|incoterm|invoice|shipping|customs|freight/.test(text)) infos.push(d.trade);
    else if (/contract|agreement|clause|legal|attorney|lawsuit|liability/.test(text)) infos.push(d.legal);
    else if (/api|sdk|bug|deploy|server|code|software|development/.test(text)) infos.push(d.it);
    else if (/invoice|payment|tax|vat|balance|accounting|revenue/.test(text)) infos.push(d.finance);
    else if (/patient|diagnosis|treatment|medical|hospital|clinical/.test(text)) infos.push(d.medical);

    // 성향 감지 + 톤 자동 추천
    const isNoticeEmail = /안내\s*드립니다|공지\s*사항|운영\s*전환|완료\s*안내|조치사항|사전\s*준비|환경설정|notice|announcement|please be informed|this is to notify|system notice/i.test(emailContent);
    if (!isNoticeEmail && /urgent|asap|immediately|critical|emergency|긴급합니다|급합니다|즉각/.test(text)) {
      infos.push(d.urgent);
      if (selectedTone === 'professional') {
        selectedTone = 'concise';
        panel.querySelector('#mm-tone-select').value = 'concise';
      }
    } else if (/thank|appreciate|grateful|wonderful/.test(text)) {
      infos.push(d.positive);
    } else if (/complain|disappointed|unacceptable|issue|problem|불만|문제가/.test(text)) {
      // ★ 발신자가 사과하는 경우 → 내 톤은 thankful 추천
      const senderApologizing = /we apologize|we are sorry|we sincerely apologize|저희가 사과|죄송합니다|불편을 드려|we regret|please accept our apologies/i.test(text);
      if (senderApologizing) {
        infos.push(d.positive); // 발신자가 사과 → 긍정적 답장
        if (selectedTone === 'professional') {
          selectedTone = 'thankful';
          panel.querySelector('#mm-tone-select').value = 'thankful';
        }
      } else {
        infos.push(d.complaint); // 내가 사과해야 하는 상황
        if (selectedTone === 'professional') {
          selectedTone = 'apologetic';
          panel.querySelector('#mm-tone-select').value = 'apologetic';
        }
      }
    } else if (/negotiate|price|discount|offer|proposal/.test(text)) {
      infos.push(d.negotiate);
    }

    const detectEl = panel.querySelector('#mm-detect-info');
    if (infos.length > 0) {
      detectEl.style.display = 'block';
      detectEl.innerHTML = infos.join('<br>');
    } else {
      detectEl.style.display = 'none';
    }
  }

  // ===== 태스크/일정 추출 =====
  // ===== 구글 캘린더 URL 생성 =====
  function makeCalendarUrl(title, dateStr, duration=60) {
    try {
      const now = new Date();
      let start = new Date(dateStr);
      if (isNaN(start.getTime())) start = new Date(now.getTime() + 86400000);
      const end = new Date(start.getTime() + duration * 60000);
      const fmt = d => d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: fmt(start) + '/' + fmt(end)
      });
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    } catch(e) {
      return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title);
    }
  }

  // ===== 날짜 파싱 =====
  // ===== 시간 파싱 헬퍼 =====
  function parseTimeFromText(text) {
    // "3pm", "3:30pm", "15:00", "오후 3시", "오전 10시30분"
    const t12 = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(text);
    if (t12) {
      let h = parseInt(t12[1]);
      const m = parseInt(t12[2]||'0');
      const isPM = /pm/i.test(t12[3]);
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return { h, m };
    }
    const t24 = /\b([01]?\d|2[0-3]):(\d{2})\b/.exec(text);
    if (t24) return { h: parseInt(t24[1]), m: parseInt(t24[2]) };
    const koTime = /오후\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/.exec(text);
    if (koTime) return { h: parseInt(koTime[1]) + 12, m: parseInt(koTime[2]||'0') };
    const koTimeAM = /오전\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/.exec(text);
    if (koTimeAM) return { h: parseInt(koTimeAM[1]), m: parseInt(koTimeAM[2]||'0') };
    return null;
  }

  function parseDateFromText(text) {
    const now = new Date();

    // ★ 날짜 관련 맥락 키워드 없으면 파싱 안 함 (오탐 방지)
    const hasDateContext = /tomorrow|내일|next week|다음\s*주|by |due |deadline|until|schedule|meeting|call|미팅|통화|회의|monday|tuesday|wednesday|thursday|friday|saturday|sunday|월요일|화요일|수요일|목요일|금요일/i.test(text);
    if (!hasDateContext) return null;

    const parsedTime = parseTimeFromText(text);
    const defaultH = parsedTime ? parsedTime.h : 10;
    const defaultM = parsedTime ? parsedTime.m : 0;

    const weekdays = { monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6, sunday:0,
                       월요일:1, 화요일:2, 수요일:3, 목요일:4, 금요일:5, 토요일:6, 일요일:0 };
    // ★ 전체 단어 매칭으로 오탐 방지 (jan/feb 등이 URL/단어 안에 포함되면 무시)
    const months = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7,
                     september:8, october:9, november:10, december:11 };
    // 한국어 월
    const koMonths = { '1월':0,'2월':1,'3월':2,'4월':3,'5월':4,'6월':5,'7월':6,'8월':7,'9월':8,'10월':9,'11월':10,'12월':11 };

    // 내일
    if (/tomorrow|내일/i.test(text)) {
      const d = new Date(now); d.setDate(d.getDate()+1); d.setHours(defaultH,defaultM,0,0); return d;
    }
    // 다음주
    if (/next week|다음\s*주/i.test(text)) {
      const d = new Date(now); d.setDate(d.getDate()+7); d.setHours(defaultH,defaultM,0,0); return d;
    }
    // 요일 감지
    for (const [day, num] of Object.entries(weekdays)) {
      if (new RegExp('\\b'+day+'\\b','i').test(text)) {
        const d = new Date(now);
        const diff = (num - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff); d.setHours(defaultH,defaultM,0,0); return d;
      }
    }
    // 한국어 날짜 "10월 15일"
    for (const [mon, idx] of Object.entries(koMonths)) {
      const m = new RegExp(mon+'\\s*(\\d{1,2})일').exec(text);
      if (m) {
        const d = new Date(now.getFullYear(), idx, parseInt(m[1]), 10, 0, 0);
        if (d < now) d.setFullYear(d.getFullYear()+1);
        return d;
      }
    }
    // 영어 월 — 전체 단어만 (\b 사용)
    for (const [mon, idx] of Object.entries(months)) {
      const m1 = new RegExp('\\b'+mon+'\\s+(\\d{1,2})\\b','i').exec(text);
      const m2 = new RegExp('\\b(\\d{1,2})\\s+'+mon+'\\b','i').exec(text);
      const match = m1 || m2;
      if (match) {
        const day = parseInt(match[1]);
        if (day < 1 || day > 31) continue;
        const d = new Date(now.getFullYear(), idx, day, defaultH, defaultM, 0);
        if (d < now) d.setFullYear(d.getFullYear()+1);
        return d;
      }
    }
    // YYYY-MM-DD 형식만 (MM/DD는 오탐 많아서 제거)
    const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (iso) {
      const d = new Date(parseInt(iso[1]), parseInt(iso[2])-1, parseInt(iso[3]), 10, 0, 0);
      if (!isNaN(d.getTime()) && d > now) return d;
    }
    return null;
  }

  // ===== 금액 추출 =====
  function extractAmounts(text) {
    const amounts = [];
    const patterns = [
      /\$[\d,]+(?:\.\d{2})?/g,
      /USD\s*[\d,]+/gi,
      /[\d,]+\s*(?:달러|원|엔|위안)/g,
      /[\d,]+\s*(?:USD|KRW|JPY|CNY|EUR|GBP)/gi
    ];
    patterns.forEach(p => {
      const m = text.match(p);
      if (m) amounts.push(...m.map(a => a.trim()));
    });
    return [...new Set(amounts)];
  }

  // ===== 발송 전 문화 체크 (5번) =====
  function checkCulturalTiming(country, emailText) {
    const now = new Date();
    const warnings = [];
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const txt = emailText || '';

    if (country === 'Japanese' || /japan/i.test(txt)) {
      if (dayOfWeek === 0 || dayOfWeek === 6) warnings.push('🇯🇵 Weekend in Japan — response may be delayed until Monday.');
    }
    if (/arabia|arab|saudi|uae|kuwait|qatar/i.test(txt)) {
      if (dayOfWeek === 5 && hour >= 11 && hour <= 13) warnings.push('🕌 Friday prayer time — avoid sending now.');
      if (dayOfWeek === 5 || dayOfWeek === 6) warnings.push('🇸🇦 Weekend in Arab countries (Fri–Sat) — response on Sunday.');
    }
    if (country === 'Israel' || /israel|hebrew/i.test(txt)) {
      if ((dayOfWeek === 5 && hour >= 17) || dayOfWeek === 6) {
        warnings.push('✡️ Shabbat — Israel is offline. Send Sunday morning instead.');
      }
    }
    return warnings;
  }

  function extractTasksAndDates(emailContent, forceLang) {
    const lang = forceLang || selectedMyLang || 'Korean';
    const uiTask = getUILang(lang);
    const text = emailContent;
    const textL = text.toLowerCase();
    const taskItems = []; // {html, type}

    // Actions i18n
    const ACT = {
      Korean:     { meeting:'미팅', meetingConfirm:'미팅/콜 언급 — 시간 확인 필요', deadline:'마감/팔로업', deadlineConfirm:'마감일 언급 — 날짜 확인 필요', send:'보내기', confirm:'확인 요청됨', calendar:'+ 캘린더 →' },
      English:    { meeting:'Meeting', meetingConfirm:'Meeting/Call mentioned — confirm time', deadline:'Deadline/Follow-up', deadlineConfirm:'Deadline mentioned — confirm date', send:'Send', confirm:'Confirmation requested', calendar:'+ Calendar →' },
      Japanese:   { meeting:'ミーティング', meetingConfirm:'ミーティング/通話 — 時間を確認', deadline:'締め切り/フォローアップ', deadlineConfirm:'締め切りが言及されています', send:'送信', confirm:'確認が求められています', calendar:'+ カレンダー →' },
      Chinese:    { meeting:'会议', meetingConfirm:'提到会议/通话 — 请确认时间', deadline:'截止日期/跟进', deadlineConfirm:'提到截止日期', send:'发送', confirm:'需要确认', calendar:'+ 日历 →' },
      German:     { meeting:'Meeting', meetingConfirm:'Meeting/Anruf erwähnt — Zeit bestätigen', deadline:'Frist/Follow-up', deadlineConfirm:'Frist erwähnt — Datum bestätigen', send:'Senden', confirm:'Bestätigung angefordert', calendar:'+ Kalender →' },
      French:     { meeting:'Réunion', meetingConfirm:'Réunion/Appel mentionné — confirmer l\'heure', deadline:'Échéance/Suivi', deadlineConfirm:'Échéance mentionnée — confirmer la date', send:'Envoyer', confirm:'Confirmation demandée', calendar:'+ Agenda →' },
      Portuguese: { meeting:'Reunião', meetingConfirm:'Reunião/Chamada mencionada — confirmar horário', deadline:'Prazo/Acompanhamento', deadlineConfirm:'Prazo mencionado — confirmar data', send:'Enviar', confirm:'Confirmação solicitada', calendar:'+ Calendário →' },
      Spanish:    { meeting:'Reunión', meetingConfirm:'Reunión/Llamada mencionada — confirmar hora', deadline:'Plazo/Seguimiento', deadlineConfirm:'Plazo mencionado — confirmar fecha', send:'Enviar', confirm:'Confirmación solicitada', calendar:'+ Calendario →' },
      Turkish:    { meeting:'Toplantı', meetingConfirm:'Toplantı/Arama belirtildi — zamanı onaylayın', deadline:'Son tarih/Takip', deadlineConfirm:'Son tarih belirtildi — tarihi onaylayın', send:'Gönder', confirm:'Onay istendi', calendar:'+ Takvim →' },
      Italian:    { meeting:'Riunione', meetingConfirm:'Riunione/Chiamata menzionata — confermare orario', deadline:'Scadenza/Follow-up', deadlineConfirm:'Scadenza menzionata — confermare data', send:'Invia', confirm:'Conferma richiesta', calendar:'+ Calendario →' },
      Arabic:     { meeting:'اجتماع', meetingConfirm:'تم ذكر اجتماع/مكالمة — تأكيد الوقت', deadline:'الموعد النهائي/متابعة', deadlineConfirm:'تم ذكر الموعد النهائي — تأكيد التاريخ', send:'إرسال', confirm:'تأكيد مطلوب', calendar:'+ تقويم →' },
      Vietnamese: { meeting:'Cuộc họp', meetingConfirm:'Đã đề cập cuộc họp — xác nhận giờ', deadline:'Hạn chót/Theo dõi', deadlineConfirm:'Đã đề cập hạn chót — xác nhận ngày', send:'Gửi', confirm:'Yêu cầu xác nhận', calendar:'+ Lịch →' },
      Thai:       { meeting:'การประชุม', meetingConfirm:'กล่าวถึงการประชุม — ยืนยันเวลา', deadline:'กำหนดเวลา/ติดตาม', deadlineConfirm:'กล่าวถึงกำหนดเวลา — ยืนยันวันที่', send:'ส่ง', confirm:'ขอการยืนยัน', calendar:'+ ปฏิทิน →' },
      Indonesian: { meeting:'Rapat', meetingConfirm:'Rapat/Panggilan disebutkan — konfirmasi waktu', deadline:'Tenggat/Tindak lanjut', deadlineConfirm:'Tenggat disebutkan — konfirmasi tanggal', send:'Kirim', confirm:'Konfirmasi diperlukan', calendar:'+ Kalender →' },
    };
    const a = ACT[lang] || ACT['English'];

    // ===== 1. 날짜/미팅/콜 감지 =====
    const meetingMatch = /meeting|call|conference|미팅|통화|회의|打电话|会议|ミーティング|通話/.test(textL);
    const dateObj = parseDateFromText(text);
    const dateLocale = {Korean:'ko-KR',Japanese:'ja-JP',Chinese:'zh-CN',German:'de-DE',French:'fr-FR',Portuguese:'pt-BR',Spanish:'es-ES',Arabic:'ar-SA',Turkish:'tr-TR',Italian:'it-IT',Vietnamese:'vi-VN',Thai:'th-TH',Indonesian:'id-ID'}[lang] || 'en-US';
    const dateStr = dateObj ? dateObj.toLocaleDateString(dateLocale, {weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : null;

    if (meetingMatch && dateObj) {
      const calUrl = makeCalendarUrl(a.meeting, dateObj.toISOString());
      taskItems.push({
        html: `<div style="display:flex;align-items:center;justify-content:space-between;background:#e8f0fe;border-radius:8px;padding:7px 10px;font-size:11px">
          <span>📅 <strong>${dateStr}</strong> — ${a.meeting}</span>
          <a href="${calUrl}" target="_blank" style="font-size:10px;color:#1a73e8;font-weight:600;text-decoration:none;white-space:nowrap;margin-left:8px">${a.calendar}</a>
        </div>`,
        type: 'calendar'
      });
    } else if (meetingMatch) {
      taskItems.push({
        html: `<div style="display:flex;align-items:center;justify-content:space-between;background:#e8f0fe;border-radius:8px;padding:7px 10px;font-size:11px">
          <span>📞 ${a.meetingConfirm}</span>
          <a href="${makeCalendarUrl(a.meeting, new Date(Date.now()+86400000).toISOString())}" target="_blank" style="font-size:10px;color:#1a73e8;font-weight:600;text-decoration:none;margin-left:8px">${a.calendar}</a>
        </div>`,
        type: 'calendar'
      });
    } else if (dateObj) {
      const calUrl = makeCalendarUrl(a.deadline, dateObj.toISOString());
      taskItems.push({
        html: `<div style="display:flex;align-items:center;justify-content:space-between;background:#e8f0fe;border-radius:8px;padding:7px 10px;font-size:11px">
          <span>📅 <strong>${dateStr}</strong> — ${a.deadline}</span>
          <a href="${calUrl}" target="_blank" style="font-size:10px;color:#1a73e8;font-weight:600;text-decoration:none;margin-left:8px">${a.calendar}</a>
        </div>`,
        type: 'calendar'
      });
    }

    // ===== 2. 마감일 =====
    if (/deadline|due date|by end of|마감|기한|期限|締め切り/.test(textL) && !dateObj) {
      taskItems.push({
        html: `<div style="background:#fff8e1;border-radius:8px;padding:7px 10px;font-size:11px;color:#b8860b">⏰ ${a.deadlineConfirm}</div>`,
        type: 'deadline'
      });
    }

    // ===== 3. 문서/파일 요청 =====
    const docMatch = text.match(/please (?:send|provide|forward)\s+(?:us\s+|me\s+)?(?:the\s+|a\s+)?([a-zA-Z가-힣\s]{3,40})|kindly (?:send|provide)\s+(?:the\s+|a\s+)?([a-zA-Z가-힣\s]{3,40})|보내주세요|첨부해주|제출해주/i);
    if (docMatch) {
      let what = (docMatch[1]||docMatch[2]||'').trim().replace(/\s+/g,' ').slice(0,40);
      if (!what || what.length < 3) what = ({Korean:'문서',Japanese:'書類',Chinese:'文件',German:'Dokument',French:'document'}[lang]||'document');
      // 키워드 번역
      const DOC_WORDS = {
        Korean: {'proposal':'제안서','quote':'견적서','invoice':'인보이스','report':'보고서','contract':'계약서',
                 'document':'문서','file':'파일','attachment':'첨부파일','schedule':'일정표',
                 'updated':'업데이트된','revised':'수정된','final':'최종','signed':'서명된',
                 'by the deadline':'(마감일까지)','by end of week':'(이번 주 안)','by friday':'(금요일까지)','asap':'(빠른 시일 내)','the updated':'업데이트된','the revised':'수정된','the final':'최종','the signed':'서명된'},
        Japanese: {'proposal':'提案書','quote':'見積書','invoice':'インボイス','report':'レポート','contract':'契約書',
                   'document':'書類','updated':'更新された','revised':'修正された','final':'最終',
                   'by the deadline':'(締め切りまでに)','asap':'(至急)','the updated':'更新された','the final':'最終'},
        Chinese: {'proposal':'提案书','quote':'报价单','invoice':'发票','report':'报告','contract':'合同',
                  'document':'文件','updated':'更新的','revised':'修改后的','final':'最终',
                  'by the deadline':'(截止日期前)','asap':'(尽快)','the updated':'更新的','the final':'最终'},
        German: {'proposal':'Angebot','quote':'Kostenvoranschlag','invoice':'Rechnung','report':'Bericht',
                 'contract':'Vertrag','document':'Dokument','updated':'aktualisiert','final':'endgültig',
                 'by the deadline':'(bis zur Frist)','asap':'(so schnell wie möglich)'},
        French: {'proposal':'proposition','quote':'devis','invoice':'facture','report':'rapport',
                 'contract':'contrat','document':'document','updated':'mis à jour','final':'final',
                 'by the deadline':'(avant la date limite)','asap':'(dès que possible)'},
        Turkish: {'proposal':'teklif','quote':'fiyat teklifi','invoice':'fatura','report':'rapor',
                  'contract':'sözleşme','document':'belge','updated':'güncellenmiş','final':'son',
                  'by the deadline':'(son tarihe kadar)','asap':'(en kısa sürede)'},
        Italian: {'proposal':'proposta','quote':'preventivo','invoice':'fattura','report':'rapporto',
                  'contract':'contratto','document':'documento','updated':'aggiornato','final':'finale',
                  'by the deadline':'(entro la scadenza)','asap':'(il prima possibile)'},
        Arabic: {'proposal':'اقتراح','quote':'عرض أسعار','invoice':'فاتورة','report':'تقرير',
                 'contract':'عقد','document':'وثيقة','updated':'محدّث','final':'نهائي',
                 'by the deadline':'(قبل الموعد النهائي)','asap':'(في أقرب وقت)'},
        Spanish: {'proposal':'propuesta','quote':'cotización','invoice':'factura','report':'informe',
                  'contract':'contrato','document':'documento','updated':'actualizado','final':'final',
                  'by the deadline':'(antes de la fecha límite)','asap':'(lo antes posible)'},
        Portuguese: {'proposal':'proposta','quote':'orçamento','invoice':'fatura','report':'relatório',
                     'contract':'contrato','document':'documento','updated':'atualizado','final':'final',
                     'by the deadline':'(antes do prazo)','asap':'(o mais rápido possível)'},
        Vietnamese: {'proposal':'đề xuất','quote':'báo giá','invoice':'hóa đơn','report':'báo cáo',
                     'contract':'hợp đồng','document':'tài liệu','updated':'cập nhật','final':'cuối cùng',
                     'by the deadline':'(trước hạn chót)','asap':'(càng sớm càng tốt)'},
        Thai: {'proposal':'ข้อเสนอ','quote':'ใบเสนอราคา','invoice':'ใบแจ้งหนี้','report':'รายงาน',
               'contract':'สัญญา','document':'เอกสาร','updated':'อัปเดต','final':'ขั้นสุดท้าย',
               'by the deadline':'(ก่อนกำหนด)','asap':'(โดยเร็วที่สุด)'},
        Indonesian: {'proposal':'proposal','quote':'penawaran','invoice':'faktur','report':'laporan',
                     'contract':'kontrak','document':'dokumen','updated':'diperbarui','final':'final',
                     'by the deadline':'(sebelum tenggat)','asap':'(sesegera mungkin)'},
      };
      const wm = DOC_WORDS[lang];
      let _what = what;
      if (wm) {
        let t = what.toLowerCase().trim();
        // ★ 핵심 문서 유형 먼저 치환 (어순 맞는 완성 구문으로)
        const FULL_PHRASES = {
          Korean: {'updated proposal':'업데이트된 제안서','revised proposal':'수정된 제안서','final proposal':'최종 제안서',
                   'updated quote':'업데이트된 견적서','updated contract':'업데이트된 계약서','updated report':'업데이트된 보고서'},
          German: {'updated proposal':'aktualisiertes Angebot','revised proposal':'überarbeitetes Angebot',
                   'final proposal':'endgültiges Angebot','updated quote':'aktualisierter Kostenvoranschlag',
                   'updated report':'aktualisierter Bericht','updated contract':'aktualisierter Vertrag'},
          French: {'updated proposal':'proposition mise à jour','revised proposal':'proposition révisée',
                   'final proposal':'proposition finale','updated quote':'devis mis à jour',
                   'updated report':'rapport mis à jour','updated contract':'contrat mis à jour'},
          Spanish: {'updated proposal':'propuesta actualizada','revised proposal':'propuesta revisada',
                    'final proposal':'propuesta final','updated quote':'cotización actualizada',
                    'updated report':'informe actualizado','updated contract':'contrato actualizado'},
          Portuguese: {'updated proposal':'proposta atualizada','revised proposal':'proposta revisada',
                       'final proposal':'proposta final','updated quote':'orçamento atualizado',
                       'updated report':'relatório atualizado','updated contract':'contrato atualizado'},
          Italian: {'updated proposal':'proposta aggiornata','revised proposal':'proposta revisionata',
                    'final proposal':'proposta finale','updated quote':'preventivo aggiornato',
                    'updated report':'rapporto aggiornato','updated contract':'contratto aggiornato'},
          Arabic: {'updated proposal':'الاقتراح المحدّث','revised proposal':'الاقتراح المعدّل',
                   'final proposal':'الاقتراح النهائي','updated quote':'عرض الأسعار المحدّث',
                   'updated report':'التقرير المحدّث','updated contract':'العقد المحدّث'},
          Indonesian: {'updated proposal':'proposal yang diperbarui','revised proposal':'proposal yang direvisi',
                       'final proposal':'proposal final','updated quote':'penawaran yang diperbarui',
                       'updated report':'laporan yang diperbarui'},
          Thai: {'updated proposal':'ข้อเสนอที่อัปเดต','revised proposal':'ข้อเสนอที่แก้ไข',
                 'final proposal':'ข้อเสนอสุดท้าย','updated quote':'ใบเสนอราคาที่อัปเดต'},
          Vietnamese: {'updated proposal':'đề xuất được cập nhật','revised proposal':'đề xuất được sửa đổi',
                       'final proposal':'đề xuất cuối cùng','updated quote':'báo giá được cập nhật'},
        };
        const fp = FULL_PHRASES[lang];
        let matched = false;
        if (fp) {
          for (const [en, loc] of Object.entries(fp)) {
            if (t.includes(en)) { _what = loc; matched = true; break; }
          }
        }
        if (!matched) {
          // 개별 단어 치환 (fallback)
          Object.entries(wm).forEach(([en,lo]) => { t = t.replace(new RegExp('\\b'+en+'\\b','gi'), lo); });
          _what = t.charAt(0).toUpperCase() + t.slice(1);
        }
        // by the deadline 추가
        const deadline = wm['by the deadline'];
        if (deadline && what.toLowerCase().includes('by the deadline') && !_what.includes(deadline)) {
          _what = _what.replace(/\(마감일까지\)|\(締め切りまでに\)|\(截止日期前\)|before the deadline|by the deadline/gi, '').trim();
          _what += ' ' + deadline;
        }
      }
      taskItems.push({
        html: `<div style="background:#f3e5f5;border-radius:8px;padding:7px 10px;font-size:11px;color:#6a1b9a">📎 ${a.send}: <strong>${sanitize(_what)}</strong></div>`,
        type: 'document'
      });
    }

    // ===== 4. 확인/검토 요청 =====
    if (/please confirm|kindly confirm|확인해주|검토해주|please review|ご確認|请确认/.test(textL)) {
      taskItems.push({
        html: `<div style="background:#e8f5e9;border-radius:8px;padding:7px 10px;font-size:11px;color:#2e7d32">✅ ${a.confirm}</div>`,
        type: 'confirm'
      });
    }

    // ===== 5. 발송 전 문화 타이밍 체크 =====
    const culturalWarnings = checkCulturalTiming(selectedCountry, emailContent);
    culturalWarnings.forEach(w => {
      taskItems.push({
        html: `<div style="background:#fce4ec;border-radius:8px;padding:7px 10px;font-size:11px;color:#c62828">⚠️ ${w}</div>`,
        type: 'culture'
      });
    });

    const tasksEl = panel.querySelector('#mm-tasks');
    const titleEl = tasksEl?.querySelector('#mm-tasks-title');
    const tasksList = tasksEl?.querySelector('#mm-tasks-list');
    if (tasksList) tasksList.innerHTML = '';

    if (taskItems.length > 0) {
      if (tasksEl) tasksEl.style.display = 'block';
      if (titleEl) titleEl.textContent = uiTask.tasks || '📌 Detected Actions';
      if (tasksList) tasksList.innerHTML = taskItems.map(t => t.html).join('');
    } else {
      if (tasksEl) tasksEl.style.display = 'none';
    }
  }

  // 답변 패널 언어 드롭다운 토글
  let _replyLangDropOpen = false;
  panel.querySelector('#mm-reply-tl-trigger')?.addEventListener('click', e => {
    e.stopPropagation();
    _replyLangDropOpen = !_replyLangDropOpen;
    const _rdList = panel.querySelector('#mm-reply-tl-list');
    const _rdArrow = panel.querySelector('#mm-reply-tl-arrow');
    if (_rdList) _rdList.style.display = _replyLangDropOpen ? 'block' : 'none';
    if (_rdArrow) _rdArrow.style.transform = _replyLangDropOpen ? 'rotate(180deg)' : '';
  });
  document.addEventListener('click', function _replyLangOutside(e) {
    if (!currentPanel) { document.removeEventListener('click', _replyLangOutside); return; }
    if (!panel.querySelector('#mm-lang-switch')?.contains(e.target)) {
      _replyLangDropOpen = false;
      const _rdl = panel.querySelector('#mm-reply-tl-list');
      const _rda = panel.querySelector('#mm-reply-tl-arrow');
      if (_rdl) _rdl.style.display = 'none';
      if (_rda) _rda.style.transform = '';
    }
  });

  // ===== 다국어 빠른 전환 =====
  panel.querySelectorAll('.mm-lang-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const targetLang = this.dataset.lang;
      const currentText = panel.querySelector('#mm-output').value;
      if (!currentText) { showToast(getUILang(selectedMyLang).msgGenFirst || 'Please generate a reply first.', 'info'); return; }
      // 원본 생성 언어 탭 클릭 (selectedMyLang 폴백)
      const _origLang = _replyOrigLang || selectedMyLang;
      if (targetLang === _origLang) {
        if (!_isTranslated) return; // 이미 원본 표시 중 → 무시 (API 호출·내용 변경 없음)
        const _restoreText = _versions[_currentVerIdx];
        if (!_restoreText) return; // 원본 텍스트 없으면 무시 (undefined 방지)
        panel.querySelector('#mm-output').value = await appendSignature(_restoreText);
        _isTranslated = false;
        _replyDisplayedLang = _origLang;
        { const _trig = panel.querySelector('#mm-reply-tl-trigger');
          if (_trig) { const _tf = _trig.querySelector('#mm-reply-tl-flag'); if (_tf) _tf.textContent = '🌐'; const _tl = _trig.querySelector('#mm-reply-tl-label'); if (_tl) _tl.textContent = 'Switch Language'; }
          const _rdlr = panel.querySelector('#mm-reply-tl-list'); if (_rdlr) _rdlr.style.display = 'none'; _replyLangDropOpen = false; }
        const sigInputRestore = panel.querySelector('#mm-sig-input');
        if (sigInputRestore) sigInputRestore.placeholder = getUILang(_origLang).sigPlaceholder || 'Enter your signature';
        return;
      }
      // 이미 이 언어로 번역 표시 중이면 중복 탭 무시
      if (targetLang === _replyDisplayedLang) return;

      const userData = await getUserData();
      if (userData.monthlyCount >= userData.monthlyLimit) {
        panel.querySelector('#mm-upgrade').style.display = 'block';
        return;
      }

      // 번역 모드에서만 편집 내용을 현재 언어 캐시에 저장
      if (_isTranslated && _replyDisplayedLang) {
        if (!_replyTransCache[_replyDisplayedLang]) _replyTransCache[_replyDisplayedLang] = [];
        _replyTransCache[_replyDisplayedLang][_currentVerIdx] = currentText;
      }

      // 캐시에 있으면 즉시 복원 (API 없음)
      if (_replyTransCache[targetLang]?.[_currentVerIdx] !== undefined) {
        // 탭 전환 시 정확히 표시되도록 _translations 전체 복원
        // 캐시 없는 버전은 _versions[i] (원본)로 폴백
        _versions.forEach((_, i) => {
          _translations[i] = _replyTransCache[targetLang]?.[i] !== undefined
            ? _replyTransCache[targetLang][i]
            : _versions[i];
        });
        _isTranslated = true;
        panel.querySelector('#mm-output').value = _replyTransCache[targetLang][_currentVerIdx];
        _replyDisplayedLang = targetLang;
        { const _selI = COMPOSE_LANGS.find(l => l.value === targetLang);
          const _trig2 = panel.querySelector('#mm-reply-tl-trigger');
          if (_trig2 && _selI) { const _tf2 = _trig2.querySelector('#mm-reply-tl-flag'); if (_tf2) _tf2.textContent = _selI.flag; const _tl2 = _trig2.querySelector('#mm-reply-tl-label'); if (_tl2) _tl2.textContent = _selI.label; }
          const _rdlc = panel.querySelector('#mm-reply-tl-list'); if (_rdlc) _rdlc.style.display = 'none'; _replyLangDropOpen = false; }
        return;
      }

      // 드롭다운 닫기 + 트리거 버튼 로딩 상태
      const _mainTrig = panel.querySelector('#mm-reply-tl-trigger');
      const _mainList = panel.querySelector('#mm-reply-tl-list');
      if (_mainList) _mainList.style.display = 'none';
      _replyLangDropOpen = false;
      if (_mainTrig) { _mainTrig.innerHTML = '<span style="font-size:15px">⏳</span><span style="font-size:11px;color:#5f6368;flex:1;text-align:left">번역 중...</span><span style="font-size:10px;color:#999;">▾</span>'; _mainTrig.disabled = true; }

      try {
        if (!_isTranslated) {
          // 원본 모드에서 수정: chrome 서명 제거 후 _versions + _replyOrigVersions 동기화
          const _rawText = (_replySignature && currentText.endsWith(_replySignature))
            ? currentText.slice(0, currentText.length - _replySignature.length).replace(/\n\n$/, '')
            : currentText;
          if (_versions.length > 0) {
            _versions[_currentVerIdx] = _rawText;
            _replyOrigVersions[_currentVerIdx] = _rawText;
          } else {
            // 일반 모드 최초 번역 — 원본 캡처
            _versions = [_rawText];
            _replyOrigVersions = [_rawText];
            _replyOrigSingleBody = _rawText;
            _currentVerIdx = 0;
          }
        }
        // 단일버전 원본 최초 캡처 (일반 모드: _versions가 처음 번역 시 설정됨)
        if (!_replyOrigSingleBody && _versions.length <= 1) {
          _replyOrigSingleBody = _replyOrigVersions[0] || _versions[0] || currentText;
        }

        // 본문·서명 모두 하단언어로 번역 (서명은 별도 번역 후 재조합)
        const stripSig = (text) => _replySignature && text.endsWith(_replySignature)
          ? text.slice(0, text.length - _replySignature.length).replace(/\n\n$/, '')
          : text;
        let _translatedSig = _replySignature;
        if (_replySignature) {
          try {
            const sr = await fetch(`${WORKER_URL}/translate`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: _replySignature, targetLanguage: resolveAutoLang(targetLang), honorific: selectedHonorific })
            }).then(r => r.json());
            if (sr.success && sr.translated) _translatedSig = sr.translated;
          } catch(e) {}
        }
        const _sigSuffix = '';
        // ⭐ 항상 원본에서 번역 — 번역본에서 재번역하지 않음
        const toTranslate = _replyOrigVersions.length > 0
          ? _replyOrigVersions.map(v => stripSig(v))
          : [stripSig(_replyOrigSingleBody || currentText)];
        const allResults = await Promise.all(toTranslate.map((text, i) =>
          fetch(`${WORKER_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, targetLanguage: resolveAutoLang(targetLang), honorific: selectedHonorific })
          })
            .then(r => r.json())
            .then(d => ({ i, translated: d.success ? (d.translated + _sigSuffix) : null }))
            .catch(() => ({ i, translated: null }))
        ));

        if (!_replyTransCache[targetLang]) _replyTransCache[targetLang] = [];
        allResults.forEach(({ i, translated }) => {
          if (translated) {
            _translations[i] = translated;
            _replyTransCache[targetLang][i] = translated;
          }
        });

        const curRes = _versions.length > 0 ? allResults[_currentVerIdx] : allResults[0];
        if (curRes?.translated) {
          panel.querySelector('#mm-output').value = curRes.translated;
          _isTranslated = true;
          _replyDisplayedLang = targetLang;
        } else {
          showToast(getUILang(selectedMyLang).errTranslate || '번역 실패. 다시 시도해주세요.', 'error');
        }
      } catch(e) {
        showToast('번역 오류: ' + e.message, 'error');
      }

      if (_mainTrig) {
        _mainTrig.disabled = false;
        const _selFinal = COMPOSE_LANGS.find(l => l.value === targetLang);
        _mainTrig.innerHTML = `<span id="mm-reply-tl-flag" style="font-size:15px">${_selFinal?.flag || '🌐'}</span><span id="mm-reply-tl-label" style="font-size:11px;color:#5f6368;flex:1;text-align:left">${_selFinal?.label || targetLang}</span><span id="mm-reply-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>`;
      }
      const sigInput = panel.querySelector('#mm-sig-input');
      if (sigInput) sigInput.placeholder = getUILang(selectedMyLang).sigPlaceholder || 'Enter your signature';
    });
  });

  // 답변 textarea 수정 시 캐시 무효화 (원본 변경 시 전체, 번역 중 수정 시 다른 언어만)
  panel.querySelector('#mm-output')?.addEventListener('input', () => {
    if (_isTranslated) {
      const cur = _replyDisplayedLang;
      Object.keys(_replyTransCache).forEach(lang => { if (lang !== cur) delete _replyTransCache[lang]; });
    } else {
      _replyTransCache = {};
    }
  });

  // ===== 단축키 =====
  document.addEventListener('keydown', function gmailKeydown(e) {
    if (!currentPanel) { document.removeEventListener('keydown', gmailKeydown); return; }
    if (e.altKey) {
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); removePanel(); }
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); generateReply(); }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const text = panel.querySelector('#mm-output')?.value;
        if (text) navigator.clipboard.writeText(text).then(() => showToast(getUILang(selectedMyLang).msgCopied || 'Copied!', 'success'));
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        panel.querySelector('#mm-insert')?.click();
      }
      if (e.key === '1') { e.preventDefault(); panel.querySelector('#mm-tone-select').value = 'professional'; selectedTone = 'professional'; }
      if (e.key === '2') { e.preventDefault(); panel.querySelector('#mm-tone-select').value = 'friendly'; selectedTone = 'friendly'; }
      if (e.key === '3') { e.preventDefault(); panel.querySelector('#mm-tone-select').value = 'concise'; selectedTone = 'concise'; }
    }
  });

  // ===== 이메일 번역 =====
  panel.querySelector('#mm-email-translate').addEventListener('click', async function() {
    const btn = this;
    const resultEl = panel.querySelector('#mm-email-translated');

    // 이미 번역 완료 상태면 토글만 (API 재호출 없음)
    if (resultEl._translated) {
      const ui2 = getUILang(selectedMyLang);
      if (resultEl.style.display === 'none') {
        resultEl.style.display = 'block';
        btn.textContent = ui2.translateClose || '🌐 번역 닫기';
      } else {
        resultEl.style.display = 'none';
        btn.textContent = ui2.translate || '🌐 내 언어로 번역';
      }
      return;
    }

    const emailContent = getEmailThread();
    if (!emailContent) { showToast('이메일 내용을 찾을 수 없습니다.', 'error'); return; }

    const ui = getUILang(selectedMyLang);
    btn.disabled = true;
    btn.textContent = ui.translating || '🌐 번역 중...';
    resultEl.style.display = 'none';

    try {
      const ud = await getUserData();
      const res = await fetch(`${WORKER_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: emailContent, targetLanguage: resolveAutoLang(selectedMyLang), honorific: selectedHonorific, email: ud.userEmail })
      });
      const data = await res.json();
      if (data.success && data.translated) {
        resultEl.textContent = data.translated;
        resultEl.style.display = 'block';
        resultEl._translated = true; // 번역 완료 플래그 — 재호출 방지
        btn.textContent = ui.translateClose || '🌐 번역 닫기';
        // 번역 카운터 로컬 업데이트
        safeStorageGet(['translateCount'], d => {
          safeStorageSet({ translateCount: (d.translateCount || 0) + 1 });
          updateBadge();
        });
      } else {
        showToast('번역 실패: ' + (data.error || ''), 'error');
        btn.textContent = ui.translate || '🌐 내 언어로 번역';
      }
    } catch (e) {
      showToast('번역 오류: ' + e.message, 'error');
      btn.textContent = ui.translate || '🌐 내 언어로 번역';
    }
    btn.disabled = false;
  });

  // ===== 스레드 요약 =====
  panel.querySelector('#mm-summarize').addEventListener('click', async function() {
    const summaryElCheck = panel.querySelector('#mm-thread-summary');
    // 이미 요약 결과가 있으면 토글만 (API 재호출 없음)
    if (summaryElCheck._summarized) {
      if (summaryElCheck.style.display === 'none') {
        summaryElCheck.style.display = 'block';
      } else {
        summaryElCheck.style.display = 'none';
      }
      return;
    }

    const emailContent = getEmailThread();
    if (!emailContent) { showToast(getUILang(selectedMyLang).errNotFound || 'Email content not found.', 'error'); return; }

    const btn = this;
    btn.disabled = true;
    btn.textContent = getUILang(selectedMyLang).summarizing || '📝 Summarizing...';

    try {
      const res = await fetch(`${WORKER_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent: `Summarize this email thread in 3-5 bullet points in ${selectedMyLang}. Be concise and focus on key points, action items, and decisions.\n\n${emailContent}`,
          tone: 'concise',
          language: selectedMyLang,
          email: (await getUserData()).userEmail,
          isSummary: true
        })
      });
      const data = await res.json();
      if (data.success) {
        const summaryEl = panel.querySelector('#mm-thread-summary');
        summaryEl.style.display = 'block';

        // 마크다운 → HTML 변환 + 중요 키워드 하이라이트
        function renderSummary(text) {
          return sanitize(text)
            // **굵게** → 굵게만 (색 없음)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // 마감/긴급 키워드 → 빨간색
            .replace(/\b(deadline|due|마감|긴급|필수|주의|중요|asap|urgent|critical|즉시|반드시|요청|필요)\b/gi,
              '<span style="color:#c5221f;font-weight:500">$1</span>')
            // 날짜/숫자/분기 → 파란색
            .replace(/(\d{1,2}월\s*\d{1,2}일|\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?|Q[1-4]|[0-9]+%|[0-9]+개월|[0-9]+주\s*[후뒤]?)/g,
              '<span style="color:#1a73e8;font-weight:500">$1</span>')
            // • 불릿 → 줄바꿈 정리
            .replace(/^•\s*/gm, '• ')
            // 긴급/중요 키워드 하이라이트
            .replace(/\b(urgent|asap|deadline|due|마감|긴급|중요|필수|주의|경고|critical|important)\b/gi,
              '<span style="background:#fce8e6;color:#c5221f;padding:0 3px;border-radius:3px;font-weight:600">$1</span>')
            // 날짜/숫자 강조
            .replace(/(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?|\b\d+월\s*\d+일\b|Q[1-4]\s*\d{4}?|October|November|December|January|February|March|April|May|June|July|August|September)/g,
              '<span style="background:#e8f0fe;color:#1a73e8;padding:0 3px;border-radius:3px">$1</span>')
            // 줄바꿈
            .replace(/\n/g, '<br>');
        }

        summaryEl.innerHTML = `<strong style="color:#202124">📝 ${getUILang(selectedMyLang).summary.replace(/📝\s?/, '')}:</strong><br><br>` + renderSummary(data.reply);
        summaryEl._summarized = true; // 요약 완료 플래그 — 재호출 방지
      } else {
        showToast(getUILang(selectedMyLang).errSummaryFailed || 'Summary failed.', 'error');
      }
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = getUILang(selectedMyLang).summary;
  });

  // ===== 설정 토글 =====
  panel.querySelector('#mm-settings-toggle').addEventListener('click', function() {
    const s = panel.querySelector('#mm-settings');
    const isOpen = s.style.display !== 'none';
    s.style.display = isOpen ? 'none' : 'block';
    const ui = getUILang(selectedMyLang); this.textContent = isOpen ? ui.settings : (ui.settingsClose || ui.settings);
  });

  // ===== 서명 관리 =====
  safeStorageGet(['signature'], async (data) => {
    if (!data.signature) return;
    _cachedSignature = data.signature; // 인메모리 캐시 갱신
    const sigEl = panel.querySelector('#mm-sig-input');
    if (!sigEl) return;
    sigEl.dataset.rawSig = data.signature;
    if (selectedMyLang && selectedMyLang !== 'Korean') {
      try {
        const r = await fetch(`${WORKER_URL}/translate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.signature, targetLanguage: resolveAutoLang(selectedMyLang), honorific: selectedHonorific })
        }).then(r => r.json());
        sigEl.value = (r.success && r.translated) ? r.translated : data.signature;
      } catch(e) { sigEl.value = data.signature; }
    } else {
      sigEl.value = data.signature;
    }
    sigEl.addEventListener('input', () => { delete sigEl.dataset.rawSig; }, { once: true });
  });

  panel.querySelector('#mm-save-signature').addEventListener('click', function() {
    const sigEl2 = panel.querySelector('#mm-sig-input');
    const sig = sigEl2.dataset.rawSig || sigEl2.value;
    if (sig) _cachedSignature = sig; // 인메모리 캐시 갱신
    safeStorageSet({ signature: sig });
    const ui2 = getUILang(selectedMyLang);
    showToast(ui2.sigSaved || '✓ Saved', 'success');
  });


  // ===== 템플릿 관리 =====
  let _tplRenderGen = 0; // 렌더 세대 번호 — 구세대 비동기 결과 무시
  function renderTemplates(templates) {
    const gen = ++_tplRenderGen;
    const list = panel.querySelector('#mm-templates-list');
    list.innerHTML = templates.map((t, i) =>
      `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#e8f0fe;border-radius:12px;font-size:11px;cursor:pointer" data-idx="${i}" data-raw="${sanitize(t)}">
        <span class="mm-tpl-use">${sanitize(t)}</span>
        <span class="mm-tpl-del" data-idx="${i}" style="color:#e91e8c;font-weight:bold">×</span>
      </span>`
    ).join('');

    // 비한국어 패널이면 칩 표시 텍스트도 번역 (세대 번호로 race condition 방지)
    if (selectedMyLang && selectedMyLang !== 'Korean' && templates.length > 0) {
      const lang = selectedMyLang;
      templates.forEach((t, i) => {
        fetch(`${WORKER_URL}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: t, targetLanguage: resolveAutoLang(lang), honorific: selectedHonorific })
        }).then(r => r.json()).then(d => {
          if (_tplRenderGen !== gen) return; // 구세대 결과 무시
          if (d.success && d.translated) {
            const el = list.querySelector(`[data-idx="${i}"] .mm-tpl-use`);
            if (el) el.textContent = d.translated;
          }
        }).catch(() => {});
      });
    }

    // 템플릿 클릭 → 출력창에 삽입 (data-raw 원문 기준으로 번역)
    list.querySelectorAll('.mm-tpl-use').forEach(el => {
      el.addEventListener('click', async function() {
        const output = panel.querySelector('#mm-output');
        if (!output) return;
        const resultDiv = panel.querySelector('#mm-result');
        // 출력창이 숨겨져 있으면 표시 (사용자가 내용을 볼 수 있도록)
        if (resultDiv && resultDiv.style.display === 'none') resultDiv.style.display = 'block';
        let text = this.textContent;
        output.value += (output.value ? '\n' : '') + text;
        output.scrollTop = output.scrollHeight;
        showToast('템플릿 추가됐어요!', 'success');
      });
    });

    // 삭제 버튼
    list.querySelectorAll('.mm-tpl-del').forEach(el => {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        safeStorageGet(['templates'], (data) => {
          const tpls = data.templates || [];
          tpls.splice(parseInt(this.dataset.idx), 1);
          safeStorageSet({ templates: tpls });
          renderTemplates(tpls);
        });
      });
    });
  }

  // 저장된 템플릿 불러오기
  safeStorageGet(['templates'], (data) => {
    const tpls = data.templates || _cachedTemplates;
    if (tpls.length) _cachedTemplates = tpls;
    renderTemplates(tpls);
  });


  // Strip Korean/English recipient salutation from reply text
  function _stripSalutation(text) {
    if (!text) return text;
    let t = text.trim();
    // "형우님,\n..." own line
    t = t.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]?\s*[\r\n]+/, '').trim();
    // "형우님, 안녕하세요" same line
    t = t.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]\s*/, '').trim();
    // English: "Dear Sir/Madam,\n" / "Dear [Name],\n" / "To Whom It May Concern,\n" / "Hi [Name],\n" / "Hello [Name],\n"
    t = t.replace(/^(?:Dear\s+(?:Sir\/Madam|Sir|Madam|Mr\.\s*[\w\s\[\]']{1,30}|Ms\.\s*[\w\s\[\]']{1,30}|Mrs\.\s*[\w\s\[\]']{1,30}|Dr\.\s*[\w\s\[\]']{1,30}|[\w\s\[\]']{1,40})|To\s+Whom\s+It\s+May\s+Concern|Hi\s+[\w\s\[\]']{1,30}|Hello\s+[\w\s\[\]']{1,30})\s*[,，]?\s*[\r\n]+/i, '').trim();
    // Japanese: "〇〇様\n" / "〇〇さん\n"
    t = t.replace(/^.{1,20}(?:様|さん)\s*[\r\n]+/, '').trim();
    // Chinese: "〇〇您好\n" / "尊敬的〇〇\n"
    t = t.replace(/^(?:尊敬的.{1,10}|.{1,10}您好)[，,]?\s*[\r\n]+/, '').trim();
    return t;
  }

  // ===== 서명 자동 삽입 (답장 생성 후) =====
  async function appendSignature(text) {
    return new Promise(resolve => {
      safeStorageGet(['signature'], async (data) => {
        // storage 읽기 실패 시 인메모리 캐시로 폴백
        const sig = data.signature || _cachedSignature;
        if (!sig) return resolve(text);
        if (sig && !_cachedSignature) _cachedSignature = sig; // 캐시 동기화
        if (selectedMyLang && selectedMyLang !== 'Korean') {
          try {
            const r = await fetch(`${WORKER_URL}/translate`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: sig, targetLanguage: resolveAutoLang(selectedMyLang), honorific: selectedHonorific })
            }).then(r => r.json());
            resolve(text + '\n\n' + ((r.success && r.translated) ? r.translated : sig));
          } catch(e) { resolve(text + '\n\n' + sig); }
        } else {
          resolve(text + '\n\n' + sig);
        }
      });
    });
  }

  // ===== 스타일 학습 =====
  function learnStyle(tone, emailContent, reply) {
    safeStorageLocalGet(['styleHistory'], (data) => {
      const history = data.styleHistory || [];
      history.push({
        tone,
        emailLen: emailContent.length,
        replyLen: reply.length,
        time: Date.now()
      });
      // 최근 20개만 유지
      if (history.length > 20) history.shift();
      safeStorageLocalSet({ styleHistory: history });

      // 3회 이상이면 패턴 분석
      if (history.length >= 3) analyzeStyle(history);
    });
  }

  function analyzeStyle(history) {
    const ui = getUILang(selectedMyLang);
    // 가장 많이 쓰는 톤 찾기
    const toneCounts = {};
    history.forEach(h => {
      toneCounts[h.tone] = (toneCounts[h.tone] || 0) + 1;
    });
    const favTone = Object.keys(toneCounts).sort((a,b) => toneCounts[b]-toneCounts[a])[0];

    // 평균 답장 길이
    const avgLen = Math.round(history.reduce((s,h) => s + h.replyLen, 0) / history.length);
    const style = avgLen < 200 ? (ui.styleShort||'간결하게') : avgLen < 500 ? (ui.styleMid||'보통 길이') : (ui.styleLong||'상세하게');

    // 저장
    safeStorageLocalSet({ learnedStyle: { favTone, style, count: history.length } });

    // 패턴 감지 알림 (처음 3회 달성 시)
    if (history.length === 3) {
      showToast(`✨ ${ui.learnedLabel||'학습됨'}: ${favTone} ${ui.tonePref||'톤 선호'}, ${style}`, 'success');
    }

    // 기본 톤 자동 적용
    if (favTone && panel.querySelector('#mm-tone-select').value !== favTone) {
      safeStorageLocalGet(['toneOverride'], (d) => {
        if (!d.toneOverride) { // 유저가 수동으로 바꾼 게 아니면 자동 적용
          panel.querySelector('#mm-tone-select').value = favTone;
          selectedTone = favTone;
        }
      });
    }
  }

  // 페이지 로드 시 학습된 스타일 적용
  safeStorageLocalGet(['learnedStyle'], (data) => {
    if (data.learnedStyle && data.learnedStyle.count >= 3) {
      const ls = data.learnedStyle;
      // 설정 패널에 학습 현황 표시
      const sigInput = panel.querySelector('#mm-sig-input');
      if (sigInput) {
        const learnDiv = document.createElement('div');
        learnDiv.style.cssText = 'font-size:10px;color:#137333;margin-top:6px;padding:4px 8px;background:#e6f4ea;border-radius:6px;';
        const uiL = getUILang(selectedMyLang);
        learnDiv.textContent = `✨ ${uiL.learnedLabel||'학습됨'}: ${ls.favTone} ${uiL.tonePref||'톤 선호'} · ${ls.style} (${ls.count}${uiL.learnedUnit||'회 학습'})`;
        sigInput.parentNode.appendChild(learnDiv);
      }
    }
  });

  // 이메일 자동 감지 - initPanel 완료 후 실행 (initPanel 안에서 호출)

  // 이벤트
  panel.querySelector('#mm-output').addEventListener('input', updateCharCount);
  panel.querySelector('#mm-gen').addEventListener('click', generateReply);
  panel.querySelector('#mm-regen').addEventListener('click', generateReply);

  // ===== Edit / Refine button =====
  panel.querySelector('#mm-edit-btn').addEventListener('click', () => {
    const ta = panel.querySelector('#mm-output');
    ta.readOnly = false;
    ta.style.background = '#fff';
    ta.style.borderColor = '#673ab7';
    panel.querySelector('#mm-edit-btn').style.display = 'none';
    panel.querySelector('#mm-edit-bar').style.display = 'flex';
    ta.focus();
  });
  panel.querySelector('#mm-edit-done').addEventListener('click', () => {
    const ta = panel.querySelector('#mm-output');
    ta.readOnly = true;
    ta.style.background = '#f8f9fa';
    ta.style.borderColor = '#dadce0';
    panel.querySelector('#mm-edit-btn').style.display = '';
    panel.querySelector('#mm-edit-bar').style.display = 'none';
    _versions = [ta.value]; _replyOrigVersions = [ta.value]; _replyOrigSingleBody = ''; _translations = []; _currentVerIdx = 0; _isTranslated = false; _replyTransCache = {}; _replyDisplayedLang = _replyOrigLang;
  });
  panel.querySelector('#mm-refine-btn').addEventListener('click', refineReply);

  // 삽입
  panel.querySelector('#mm-insert').addEventListener('click', function() {
    const text = panel.querySelector('#mm-output').value;
    const box = document.querySelector('[role="textbox"][g_editable="true"]') ||
                document.querySelector('.Am.Al.editable') ||
                document.querySelector('div[contenteditable="true"]');
    if (box) {
      box.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
      showToast('삽입됐어요!', 'success');
    } else {
      navigator.clipboard.writeText(text).then(() => {
        showToast('답장창을 열어주세요. 텍스트는 복사됐어요!', 'info');
      });
    }
  });

  // 복사
  panel.querySelector('#mm-copy').addEventListener('click', function() {
    navigator.clipboard.writeText(panel.querySelector('#mm-output').value)
      .then(() => showToast(getUILang(selectedMyLang).msgCopied || 'Copied!', 'success'));
  });

  // 📎 파일 첨부 — Gmail compose의 네이티브 첨부 버튼 클릭
  panel.querySelector('#mm-attach').addEventListener('click', function() {
    // Gmail 답장창의 첨부 버튼 (aria-label 기반)
    const attachBtn =
      document.querySelector('[aria-label="파일 첨부"]') ||
      document.querySelector('[aria-label="Attach files"]') ||
      document.querySelector('[data-tooltip="Attach files"]') ||
      document.querySelector('[data-tooltip="파일 첨부"]') ||
      document.querySelector('input[type="file"]');
    if (attachBtn) {
      attachBtn.click();
      showToast('📎 파일 첨부창이 열립니다', 'info');
    } else {
      // 답장창이 열려있지 않은 경우 안내
      showToast('📎 먼저 답장 버튼을 눌러 답장창을 열어주세요', 'info');
    }
  });
}

// URL 변경 감지
let lastUrl = '';
let initialized = false;

function checkAndInit() {
  const url = location.href;
  if (url !== lastUrl) { lastUrl = url; initialized = false; removePanel(); }
  if (!initialized) {
    const emailOpen = document.querySelector('.a3s.aiL') || document.querySelector('.ii.gt');
    if (emailOpen) {
      // 중복 패널 제거
      document.querySelectorAll('#mm-panel').forEach(p => p.remove());
      initialized = true;
      createPanel();
    }
  }
}

const observer = new MutationObserver(checkAndInit);
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(checkAndInit, 1500);
setTimeout(checkAndInit, 3000);

// ===== 이메일 작성 기능 (v1.3.0) =====

let composeObserver = null;
let activeComposePanel = null;

// Gmail 작성창 감지
// ─── MailMind 드래그 가능 플로팅 패널 v7 ────────────────────────────────────

const VALID_COMPOSE_LANGS = ['Korean','English','Japanese','Chinese','Spanish','French','German','Portuguese','Arabic','Vietnamese','Thai','Indonesian','Italian','Turkish'];

const COMPOSE_I18N = {
  Korean:     { tab1:'✨ AI 작성', tab2:'✏️ 손질', composePlaceholder:'예: 거래처에 납품 일정 확인 요청. 다음 주까지 답변 필요.', refinePlaceholder:'손질할 이메일을 입력하세요.', toneLabel:'톤', langLabel:'언어', composeBtn:'✨ AI 이메일 작성', refineBtn:'✏️ 손질', generatingText:'⏳ 작성 중...', subjectLabel:'제목', bodyLabel:'본문', insertBtn:'✉️ Gmail 삽입', copyBtn:'📋 복사', regenBtn:'🔄', translateLabel:'번역', usageText:(u,l)=>`이번 달 ${u}/${l}회`, errLogin:'팝업에서 로그인해주세요.', errEmpty:'내용을 입력해주세요.', errLimit:'이번 달 한도 초과. 업그레이드해주세요.', errFail:'생성 실패. 잠시 후 다시 시도해주세요.', successInsert:'✦ Gmail에 삽입했습니다!', successCopy:'복사했습니다!', errNoBody:'Gmail 작성창이 없어요. 클립보드에 복사했습니다.' },
  English:    { tab1:'✨ AI Write', tab2:'✏️ Refine', composePlaceholder:'e.g. Ask supplier to confirm delivery by next Tuesday.', refinePlaceholder:'Paste the email you want to refine.', toneLabel:'Tone', langLabel:'Language', composeBtn:'✨ Compose Email', refineBtn:'✏️ Refine Email', generatingText:'⏳ Writing...', subjectLabel:'Subject', bodyLabel:'Body', insertBtn:'✉️ Insert to Gmail', copyBtn:'📋 Copy', regenBtn:'🔄', translateLabel:'Translate', usageText:(u,l)=>`${u}/${l} this month`, errLogin:'Please log in from the popup.', errEmpty:'Please enter content.', errLimit:'Monthly limit reached. Please upgrade.', errFail:'Generation failed. Please try again.', successInsert:'✦ Inserted to Gmail!', successCopy:'Copied!', errNoBody:'Compose window not found. Copied to clipboard.' },
  Japanese:   { tab1:'✨ AI作成', tab2:'✏️ 修正', composePlaceholder:'例：取引先に納品日程の確認を依頼。来週火曜日までに返信が必要。', refinePlaceholder:'修正するメールを入力してください。', toneLabel:'トーン', langLabel:'言語', composeBtn:'✨ メール作成', refineBtn:'✏️ メール修正', generatingText:'⏳ 作成中...', subjectLabel:'件名', bodyLabel:'本文', insertBtn:'✉️ Gmailに挿入', copyBtn:'📋 コピー', regenBtn:'🔄', translateLabel:'翻訳', usageText:(u,l)=>`今月 ${u}/${l}回`, errLogin:'ポップアップからログインしてください。', errEmpty:'内容を入力してください。', errLimit:'月間上限に達しました。', errFail:'生成に失敗しました。', successInsert:'✦ Gmailに挿入しました！', successCopy:'コピーしました！', errNoBody:'作成欄が見つかりません。クリップボードにコピーしました。' },
  Chinese:    { tab1:'✨ AI写信', tab2:'✏️ 润色', composePlaceholder:'例：请求供应商确认下周二前的交货时间。', refinePlaceholder:'粘贴要润色的邮件草稿。', toneLabel:'语气', langLabel:'语言', composeBtn:'✨ 撰写邮件', refineBtn:'✏️ 润色邮件', generatingText:'⏳ 撰写中...', subjectLabel:'主题', bodyLabel:'正文', insertBtn:'✉️ 插入Gmail', copyBtn:'📋 复制', regenBtn:'🔄', translateLabel:'翻译', usageText:(u,l)=>`本月 ${u}/${l}次`, errLogin:'请从弹出窗口登录。', errEmpty:'请输入内容。', errLimit:'本月使用次数已达上限。', errFail:'生成失败，请稍后重试。', successInsert:'✦ 已插入Gmail！', successCopy:'已复制！', errNoBody:'未找到Gmail撰写窗口。已复制到剪贴板。' },
  Spanish:    { tab1:'✨ IA Redactar', tab2:'✏️ Refinar', composePlaceholder:'Ej: Solicitar confirmación de entrega al proveedor para el próximo martes.', refinePlaceholder:'Pega el borrador que quieres refinar.', toneLabel:'Tono', langLabel:'Idioma', composeBtn:'✨ Redactar correo', refineBtn:'✏️ Refinar correo', generatingText:'⏳ Redactando...', subjectLabel:'Asunto', bodyLabel:'Cuerpo', insertBtn:'✉️ Insertar en Gmail', copyBtn:'📋 Copiar', regenBtn:'🔄', translateLabel:'Traducir', usageText:(u,l)=>`${u}/${l} este mes`, errLogin:'Inicia sesión desde el popup.', errEmpty:'Por favor ingresa contenido.', errLimit:'Límite mensual alcanzado.', errFail:'Error al generar. Inténtalo de nuevo.', successInsert:'✦ ¡Insertado en Gmail!', successCopy:'¡Copiado!', errNoBody:'Ventana de redacción no encontrada. Copiado al portapapeles.' },
  French:     { tab1:'✨ IA Rédiger', tab2:'✏️ Affiner', composePlaceholder:'Ex: Demander au fournisseur de confirmer la livraison avant mardi.', refinePlaceholder:'Collez le brouillon à affiner.', toneLabel:'Ton', langLabel:'Langue', composeBtn:'✨ Rédiger l\'email', refineBtn:'✏️ Affiner l\'email', generatingText:'⏳ Rédaction...', subjectLabel:'Objet', bodyLabel:'Corps', insertBtn:'✉️ Insérer dans Gmail', copyBtn:'📋 Copier', regenBtn:'🔄', translateLabel:'Traduire', usageText:(u,l)=>`${u}/${l} ce mois`, errLogin:'Connectez-vous depuis le popup.', errEmpty:'Veuillez saisir du contenu.', errLimit:'Limite mensuelle atteinte.', errFail:'Échec de la génération.', successInsert:'✦ Inséré dans Gmail !', successCopy:'Copié !', errNoBody:'Fenêtre de composition introuvable. Copié dans le presse-papiers.' },
  German:     { tab1:'✨ KI Verfassen', tab2:'✏️ Verfeinern', composePlaceholder:'Z.B.: Lieferant um Bestätigung des Liefertermins bis Dienstag bitten.', refinePlaceholder:'Entwurf zum Verfeinern einfügen.', toneLabel:'Ton', langLabel:'Sprache', composeBtn:'✨ E-Mail verfassen', refineBtn:'✏️ E-Mail verfeinern', generatingText:'⏳ Wird verfasst...', subjectLabel:'Betreff', bodyLabel:'Text', insertBtn:'✉️ In Gmail einfügen', copyBtn:'📋 Kopieren', regenBtn:'🔄', translateLabel:'Übersetzen', usageText:(u,l)=>`${u}/${l} diesen Monat`, errLogin:'Bitte im Popup anmelden.', errEmpty:'Bitte Inhalt eingeben.', errLimit:'Monatliches Limit erreicht.', errFail:'Generierung fehlgeschlagen.', successInsert:'✦ In Gmail eingefügt!', successCopy:'Kopiert!', errNoBody:'Verfassenfenster nicht gefunden. In Zwischenablage kopiert.' },
  Portuguese: { tab1:'✨ IA Redigir', tab2:'✏️ Refinar', composePlaceholder:'Ex: Solicitar confirmação de entrega ao fornecedor até terça-feira.', refinePlaceholder:'Cole o rascunho para refinar.', toneLabel:'Tom', langLabel:'Idioma', composeBtn:'✨ Redigir e-mail', refineBtn:'✏️ Refinar e-mail', generatingText:'⏳ Redigindo...', subjectLabel:'Assunto', bodyLabel:'Corpo', insertBtn:'✉️ Inserir no Gmail', copyBtn:'📋 Copiar', regenBtn:'🔄', translateLabel:'Traduzir', usageText:(u,l)=>`${u}/${l} este mês`, errLogin:'Faça login no popup.', errEmpty:'Por favor insira conteúdo.', errLimit:'Limite mensal atingido.', errFail:'Falha na geração.', successInsert:'✦ Inserido no Gmail!', successCopy:'Copiado!', errNoBody:'Janela de composição não encontrada. Copiado para área de transferência.' },
  Arabic:     { tab1:'✨ كتابة AI', tab2:'✏️ تحسين', composePlaceholder:'مثال: طلب تأكيد موعد التسليم من المورد قبل الثلاثاء.', refinePlaceholder:'الصق المسودة للتحسين.', toneLabel:'النبرة', langLabel:'اللغة', composeBtn:'✨ كتابة البريد', refineBtn:'✏️ تحسين البريد', generatingText:'⏳ جارٍ الكتابة...', subjectLabel:'الموضوع', bodyLabel:'النص', insertBtn:'✉️ إدراج في Gmail', copyBtn:'📋 نسخ', regenBtn:'🔄', translateLabel:'ترجمة', usageText:(u,l)=>`${u}/${l} هذا الشهر`, errLogin:'يرجى تسجيل الدخول.', errEmpty:'يرجى إدخال محتوى.', errLimit:'تم الوصول إلى الحد الشهري.', errFail:'فشل الإنشاء.', successInsert:'✦ تم الإدراج في Gmail!', successCopy:'تم النسخ!', errNoBody:'لم يتم العثور على نافذة الإنشاء. تم النسخ إلى الحافظة.' },
  Vietnamese: { tab1:'✨ AI Soạn', tab2:'✏️ Tinh chỉnh', composePlaceholder:'VD: Yêu cầu nhà cung cấp xác nhận lịch giao hàng trước thứ Ba.', refinePlaceholder:'Dán bản nháp cần tinh chỉnh.', toneLabel:'Giọng điệu', langLabel:'Ngôn ngữ', composeBtn:'✨ Soạn email', refineBtn:'✏️ Tinh chỉnh email', generatingText:'⏳ Đang soạn...', subjectLabel:'Chủ đề', bodyLabel:'Nội dung', insertBtn:'✉️ Chèn vào Gmail', copyBtn:'📋 Sao chép', regenBtn:'🔄', translateLabel:'Dịch', usageText:(u,l)=>`${u}/${l} tháng này`, errLogin:'Vui lòng đăng nhập.', errEmpty:'Vui lòng nhập nội dung.', errLimit:'Đã đạt giới hạn tháng.', errFail:'Tạo thất bại.', successInsert:'✦ Đã chèn vào Gmail!', successCopy:'Đã sao chép!', errNoBody:'Không tìm thấy cửa sổ soạn thảo. Đã sao chép vào clipboard.' },
  Thai:       { tab1:'✨ AI เขียน', tab2:'✏️ ปรับแต่ง', composePlaceholder:'เช่น: ขอให้ซัพพลายเออร์ยืนยันกำหนดส่งก่อนวันอังคาร', refinePlaceholder:'วางร่างอีเมลที่ต้องการปรับแต่ง', toneLabel:'โทน', langLabel:'ภาษา', composeBtn:'✨ เขียนอีเมล', refineBtn:'✏️ ปรับแต่งอีเมล', generatingText:'⏳ กำลังเขียน...', subjectLabel:'หัวข้อ', bodyLabel:'เนื้อหา', insertBtn:'✉️ แทรกใน Gmail', copyBtn:'📋 คัดลอก', regenBtn:'🔄', translateLabel:'แปลภาษา', usageText:(u,l)=>`${u}/${l} เดือนนี้`, errLogin:'กรุณาเข้าสู่ระบบ', errEmpty:'กรุณาใส่เนื้อหา', errLimit:'ถึงขีดจำกัดรายเดือนแล้ว', errFail:'การสร้างล้มเหลว', successInsert:'✦ แทรกใน Gmail แล้ว!', successCopy:'คัดลอกแล้ว!', errNoBody:'ไม่พบหน้าต่างเขียน คัดลอกไปยังคลิปบอร์ดแล้ว' },
  Indonesian: { tab1:'✨ AI Tulis', tab2:'✏️ Poles', composePlaceholder:'Cth: Minta konfirmasi jadwal pengiriman dari pemasok sebelum Selasa.', refinePlaceholder:'Tempel draf yang ingin dipoles.', toneLabel:'Nada', langLabel:'Bahasa', composeBtn:'✨ Tulis Email', refineBtn:'✏️ Poles Email', generatingText:'⏳ Sedang menulis...', subjectLabel:'Subjek', bodyLabel:'Isi', insertBtn:'✉️ Masukkan ke Gmail', copyBtn:'📋 Salin', regenBtn:'🔄', translateLabel:'Terjemahkan', usageText:(u,l)=>`${u}/${l} bulan ini`, errLogin:'Silakan masuk dari popup.', errEmpty:'Silakan masukkan konten.', errLimit:'Batas bulanan tercapai.', errFail:'Gagal menghasilkan.', successInsert:'✦ Dimasukkan ke Gmail!', successCopy:'Disalin!', errNoBody:'Jendela compose tidak ditemukan. Disalin ke clipboard.' },
  Italian:    { tab1:'✨ IA Scrivi', tab2:'✏️ Rifinisci', composePlaceholder:'Es: Chiedere al fornitore conferma della consegna entro martedì.', refinePlaceholder:'Incolla la bozza da rifinire.', toneLabel:'Tono', langLabel:'Lingua', composeBtn:'✨ Scrivi email', refineBtn:'✏️ Rifinisci email', generatingText:'⏳ Scrittura...', subjectLabel:'Oggetto', bodyLabel:'Corpo', insertBtn:'✉️ Inserisci in Gmail', copyBtn:'📋 Copia', regenBtn:'🔄', translateLabel:'Traduci', usageText:(u,l)=>`${u}/${l} questo mese`, errLogin:'Accedi dal popup.', errEmpty:'Inserisci il contenuto.', errLimit:'Limite mensile raggiunto.', errFail:'Generazione fallita.', successInsert:'✦ Inserito in Gmail!', successCopy:'Copiato!', errNoBody:'Finestra di composizione non trovata. Copiato negli appunti.' },
  Turkish:    { tab1:'✨ AI Yaz', tab2:'✏️ İyileştir', composePlaceholder:'Örn: Tedarikçiden Salı\'ya kadar teslimat takvimine onay isteyin.', refinePlaceholder:'İyileştirmek istediğiniz taslağı yapıştırın.', toneLabel:'Ton', langLabel:'Dil', composeBtn:'✨ E-posta Yaz', refineBtn:'✏️ E-postayı İyileştir', generatingText:'⏳ Yazılıyor...', subjectLabel:'Konu', bodyLabel:'İçerik', insertBtn:'✉️ Gmail\'e Ekle', copyBtn:'📋 Kopyala', regenBtn:'🔄', translateLabel:'Çevir', usageText:(u,l)=>`Bu ay ${u}/${l}`, errLogin:'Lütfen popup\'tan giriş yapın.', errEmpty:'Lütfen içerik girin.', errLimit:'Aylık limit doldu.', errFail:'Oluşturma başarısız.', successInsert:'✦ Gmail\'e eklendi!', successCopy:'Kopyalandı!', errNoBody:'Oluşturma penceresi bulunamadı. Panoya kopyalandı.' },
};

const COMPOSE_TONES = [
  { value:'professional', ko:'업무적',   en:'Professional', ja:'ビジネス', zh:'正式',    es:'Profesional', fr:'Professionnel', de:'Professionell', pt:'Profissional', ar:'رسمي',      vi:'Chuyên nghiệp', th:'เป็นทางการ',  id:'Profesional', it:'Professionale', tr:'Profesyonel' },
  { value:'friendly',     ko:'친근하게', en:'Friendly',     ja:'フレンドリー', zh:'友好', es:'Amigable',    fr:'Amical',        de:'Freundlich',   pt:'Amigável',    ar:'ودي',       vi:'Thân thiện',    th:'เป็นกันเอง',  id:'Ramah',       it:'Amichevole',    tr:'Samimi' },
  { value:'concise',      ko:'간결하게', en:'Concise',      ja:'簡潔',     zh:'简洁',    es:'Conciso',     fr:'Concis',        de:'Prägnant',     pt:'Conciso',     ar:'موجز',      vi:'Súc tích',      th:'กระชับ',      id:'Singkat',     it:'Conciso',       tr:'Kısa' },
  { value:'detailed',     ko:'상세하게', en:'Detailed',     ja:'詳細',     zh:'详细',    es:'Detallado',   fr:'Détaillé',      de:'Detailliert',  pt:'Detalhado',   ar:'مفصل',      vi:'Chi tiết',      th:'ละเอียด',     id:'Terperinci',  it:'Dettagliato',   tr:'Ayrıntılı' },
  { value:'decline',      ko:'거절하기', en:'Decline',      ja:'断り',     zh:'拒绝',    es:'Declinar',    fr:'Décliner',      de:'Ablehnen',     pt:'Recusar',     ar:'رفض',       vi:'Từ chối',       th:'ปฏิเสธ',      id:'Tolak',       it:'Rifiutare',     tr:'Reddet' },
  { value:'thankful',     ko:'감사하게', en:'Thankful',     ja:'感謝',     zh:'感谢',    es:'Agradecido',  fr:'Reconnaissant', de:'Dankbar',      pt:'Grato',       ar:'ممتنن',     vi:'Cảm ơn',        th:'ขอบคุณ',      id:'Berterima kasih', it:'Grato',      tr:'Teşekkür' },
];

const COMPOSE_LANGS = [
  { value:'Korean',     flag:'🇰🇷', label:'한국어' },
  { value:'English',    flag:'🇺🇸', label:'English' },
  { value:'Japanese',   flag:'🇯🇵', label:'日本語' },
  { value:'Chinese',    flag:'🇨🇳', label:'中文' },
  { value:'Spanish',    flag:'🇪🇸', label:'Español' },
  { value:'French',     flag:'🇫🇷', label:'Français' },
  { value:'German',     flag:'🇩🇪', label:'Deutsch' },
  { value:'Portuguese', flag:'🇧🇷', label:'Português' },
  { value:'Arabic',     flag:'🇸🇦', label:'العربية' },
  { value:'Vietnamese', flag:'🇻🇳', label:'Tiếng Việt' },
  { value:'Thai',       flag:'🇹🇭', label:'ภาษาไทย' },
  { value:'Indonesian', flag:'🇮🇩', label:'Indonesia' },
  { value:'Italian',    flag:'🇮🇹', label:'Italiano' },
  { value:'Turkish',    flag:'🇹🇷', label:'Türkçe' },
];

// 드래그 가능 패널 생성 — 초기 위치: 우하단 (Gmail compose와 겹치지 않도록)
function createFloatPanel() {
  if (document.getElementById('mm-float-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'mm-float-panel';
  panel.style.cssText = `
    position:fixed;right:20px;bottom:80px;
    width:360px;max-height:88vh;
    background:#fff;border:1.5px solid #e91e8c;border-radius:14px;
    box-shadow:0 8px 40px rgba(233,30,140,.18);
    z-index:99999;display:none;flex-direction:column;
    font-family:Google Sans,Arial,sans-serif;font-size:13px;
    overflow:hidden;
  `;
  document.body.appendChild(panel);
  // Gmail 키보드 단축키 차단 — 패널 내 키 입력 보호 (capture phase)
  ['keydown','keypress','keyup'].forEach(type => {
    panel.addEventListener(type, e => {
      const tag = e.target?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') e.stopPropagation();
    }, true);
  });
  makeDraggable(panel);
  return panel;
}

function makeDraggable(el) {
  let dragging = false, ox = 0, oy = 0, startX = 0, startY = 0;

  el.addEventListener('mousedown', e => {
    const hdr = el.querySelector('#mm-fp-header');
    if (!hdr || !hdr.contains(e.target)) return;
    if (e.target.closest('button')) return;
    dragging = true;
    const rect = el.getBoundingClientRect();
    el.style.transform = 'none';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
    ox = rect.left; oy = rect.top;
    startX = e.clientX; startY = e.clientY;
    el.style.transition = 'none';
    el.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, ox + e.clientX - startX)) + 'px';
    el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, oy + e.clientY - startY)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (dragging) { dragging = false; el.style.userSelect = ''; }
  });
}

function openFloatPanel() {
  let panel = document.getElementById('mm-float-panel');
  if (!panel) panel = createFloatPanel();

  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    return;
  }

  // 드래그 후 위치 초기화 시 우하단으로 복귀
  if (!panel.style.left || panel.style.left === 'auto') {
    panel.style.right = '20px';
    panel.style.bottom = '80px';
    panel.style.left = 'auto';
    panel.style.top = 'auto';
    panel.style.transform = 'none';
  }
  panel.style.display = 'flex';

  if (!panel.querySelector('#mm-fp-inner')) {
    renderFloatPanel(panel);
  }
}

function _stripSalutation(text) {
  if (!text) return text;
  let t = text.trim();
  t = t.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]?\s*[\r\n]+/, '').trim();
  t = t.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]\s*/, '').trim();
  t = t.replace(/^(?:Dear\s+(?:Sir\/Madam|Sir|Madam|Mr\.\s*[\w\s\[\]']{1,30}|Ms\.\s*[\w\s\[\]']{1,30}|Mrs\.\s*[\w\s\[\]']{1,30}|Dr\.\s*[\w\s\[\]']{1,30}|[\w\s\[\]']{1,40})|To\s+Whom\s+It\s+May\s+Concern|Hi\s+[\w\s\[\]']{1,30}|Hello\s+[\w\s\[\]']{1,30})\s*[,，]?\s*[\r\n]+/i, '').trim();
  t = t.replace(/^.{1,20}(?:様|さん)\s*[\r\n]+/, '').trim();
  t = t.replace(/^(?:尊敬的.{1,10}|.{1,10}您好)[，,]?\s*[\r\n]+/, '').trim();
  return t;
}

async function renderFloatPanel(panel) {
  const userData = await getUserData();
  const userInfo = await new Promise(r => safeStorageGet('userInfo', d => r(d.userInfo || '')));

  let curLang = userData.myLanguage || 'Korean';
  if (!VALID_COMPOSE_LANGS.includes(curLang)) curLang = 'Korean';
  let curOutputLang = curLang; // 작성 출력 언어 — 내 언어와 별개, 저장하지 않음
  let curTone = 'professional';
  let curMode = 'compose';
  let langDropOpen = false;
  let toneDropOpen = false;
  let transLangDropOpen = false;
  let _gmFpVersions = [];
  let _gmFpOrigVersions = []; // 번역 전 원본 버전 (번역할 때마다 이 원본에서 번역)
  let _gmFpOrigSingleBody = ''; // 단일버전 원본 body (첫 번역 시 캡처, 이후 모든 번역의 소스)
  let _gmFpCurrentVerIdx = 0;
  let _gmFpTransCache = {}; // { lang: { [verIdx]: { body, subject } } } — AI 번역 캐시 (사용자 편집 저장 안 함)
  let _gmFpAiSaved = {}; // { lang: { body, subject } } — AI가 생성/번역한 원본 (원래대로 버튼용)
  let _gmFpDisplayedLang = null; // 현재 textarea에 표시 중인 언어
  const COMPARE_BTN_LABELS_GM = { Korean:'🔀 비교 3종', English:'🔀 Compare ×3', Japanese:'🔀 3種比較', Chinese:'🔀 比较×3', Spanish:'🔀 Comparar ×3', French:'🔀 Comparer ×3', German:'🔀 Vergl. ×3', Portuguese:'🔀 Comparar ×3', Arabic:'🔀 مقارنة ×3', Vietnamese:'🔀 So sánh ×3', Thai:'🔀 เปรียบ ×3', Indonesian:'🔀 Bandingan ×3', Italian:'🔀 Confronta ×3', Turkish:'🔀 Karşılaştır ×3' };

  function T() { return COMPOSE_I18N[curLang] || COMPOSE_I18N['English']; }
  function TOut() { return COMPOSE_I18N[curOutputLang] || COMPOSE_I18N['English']; }

  // 언어 변경 시 패널 UI 라벨 in-place 업데이트 (render() 없이 결과 보존)
  function updateUILabels() {
    const t = T();
    const tabCompose = panel.querySelector('#mm-fp-tab-compose');
    const tabRefine  = panel.querySelector('#mm-fp-tab-refine');
    if (tabCompose) tabCompose.textContent = t.tab1;
    if (tabRefine)  tabRefine.textContent  = t.tab2;
    const lblTone  = panel.querySelector('#mm-fp-lbl-tone');
    const lblLang  = panel.querySelector('#mm-fp-lbl-lang');
    const lblSubj  = panel.querySelector('#mm-fp-lbl-subj');
    const lblBody  = panel.querySelector('#mm-fp-lbl-body');
    const lblTrans = panel.querySelector('#mm-fp-lbl-trans');
    if (lblTone)  lblTone.textContent  = t.toneLabel;
    if (lblLang)  lblLang.textContent  = t.langLabel;
    if (lblSubj)  lblSubj.textContent  = t.subjectLabel;
    if (lblBody)  lblBody.textContent  = t.bodyLabel;
    if (lblTrans) lblTrans.textContent = t.translateLabel;
    const genBtn     = panel.querySelector('#mm-fp-gen-btn');
    const compareBtn = panel.querySelector('#mm-fp-compare');
    const insertBtn  = panel.querySelector('#mm-fp-insert');
    const copyBtn    = panel.querySelector('#mm-fp-copy');
    const inputArea  = panel.querySelector('#mm-fp-input');
    if (genBtn)     genBtn.textContent     = curMode === 'compose' ? t.composeBtn : t.refineBtn;
    if (compareBtn) compareBtn.textContent = COMPARE_BTN_LABELS_GM[curLang] || '🔀 비교 3종';
    if (insertBtn)  insertBtn.textContent  = t.insertBtn;
    if (copyBtn)    copyBtn.textContent    = t.copyBtn;
    if (inputArea)  inputArea.placeholder  = curMode === 'compose' ? t.composePlaceholder : t.refinePlaceholder;
    panel.querySelectorAll('#mm-fp-tone-list button[data-val]').forEach(btn => {
      const sp = btn.querySelector('span:first-child');
      if (sp) sp.textContent = toneLabel(btn.dataset.val);
    });
    const toneTrigSp = panel.querySelector('#mm-fp-tone-trigger span:first-child');
    if (toneTrigSp) toneTrigSp.textContent = toneLabel(curTone);
  }

  function toneLabel(val) {
    const item = COMPOSE_TONES.find(t => t.value === val);
    if (!item) return val;
    const map = { Korean:'ko', English:'en', Japanese:'ja', Chinese:'zh', Spanish:'es', French:'fr', German:'de', Portuguese:'pt', Arabic:'ar', Vietnamese:'vi', Thai:'th', Indonesian:'id', Italian:'it', Turkish:'tr' };
    const key = map[curLang] || 'en';
    return item[key] || item.en;
  }

  function currentLangItem() {
    return COMPOSE_LANGS.find(l => l.value === curOutputLang) || COMPOSE_LANGS[0];
  }

  // 톤 드롭다운 (세로 목록)
  function toneDropdown() {
    const curItem = COMPOSE_TONES.find(t => t.value === curTone) || COMPOSE_TONES[0];
    const curLabel = toneLabel(curTone);
    return `
      <div style="position:relative">
        <button id="mm-fp-tone-trigger" style="
          display:flex;align-items:center;gap:6px;
          padding:6px 12px 6px 10px;border-radius:20px;
          font-size:12px;font-weight:600;cursor:pointer;
          border:1.5px solid #e91e8c;background:#fff5fb;
          color:#e91e8c;font-family:inherit;
          transition:all .12s;width:100%;
        ">
          <span style="flex:1;text-align:left">${sanitize(curLabel)}</span>
          <span id="mm-fp-tone-arrow" style="font-size:10px;transition:transform .15s;${toneDropOpen ? 'transform:rotate(180deg)' : ''}">▼</span>
        </button>
        <div id="mm-fp-tone-list" style="
          display:${toneDropOpen ? 'block' : 'none'};
          position:absolute;top:calc(100% + 4px);left:0;right:0;
          background:#fff;border:1.5px solid #e91e8c;border-radius:10px;
          box-shadow:0 4px 20px rgba(233,30,140,.15);
          z-index:101;overflow:hidden;
        ">
          ${COMPOSE_TONES.map(item => `
            <button data-val="${item.value}" style="
              display:flex;align-items:center;gap:8px;
              width:100%;padding:9px 14px;
              font-size:12px;font-weight:${item.value === curTone ? '700' : '500'};
              cursor:pointer;border:none;font-family:inherit;text-align:left;
              background:${item.value === curTone ? '#fce4f3' : '#fff'};
              color:${item.value === curTone ? '#e91e8c' : '#333'};
              transition:background .1s;
            " onmouseenter="if(this.dataset.val!=='${curTone}')this.style.background='#fafafa'" onmouseleave="if(this.dataset.val!=='${curTone}')this.style.background='#fff'">
              <span style="flex:1">${sanitize(toneLabel(item.value))}</span>
              ${item.value === curTone ? '<span style="color:#e91e8c">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  // 언어 드롭다운 (버튼 클릭 시 세로 목록)
  function langDropdown() {
    const cur = currentLangItem();
    return `
      <div style="position:relative">
        <button id="mm-fp-lang-trigger" style="
          display:flex;align-items:center;gap:6px;
          padding:6px 12px 6px 10px;border-radius:20px;
          font-size:12px;font-weight:600;cursor:pointer;
          border:1.5px solid #e91e8c;background:#fff5fb;
          color:#e91e8c;font-family:inherit;
          transition:all .12s;width:100%;
        ">
          <span style="font-size:16px;line-height:1">${cur.flag}</span>
          <span style="flex:1;text-align:left">${sanitize(cur.label)}</span>
          <span id="mm-fp-lang-arrow" style="font-size:10px;transition:transform .15s;${langDropOpen ? 'transform:rotate(180deg)' : ''}">▼</span>
        </button>
        <div id="mm-fp-lang-list" style="
          display:${langDropOpen ? 'block' : 'none'};
          position:absolute;top:calc(100% + 4px);left:0;right:0;
          background:#fff;border:1.5px solid #e91e8c;border-radius:10px;
          box-shadow:0 4px 20px rgba(233,30,140,.15);
          z-index:100;overflow:hidden;max-height:240px;overflow-y:auto;
          scrollbar-width:thin;
        ">
          ${COMPOSE_LANGS.map(l => `
            <button data-val="${l.value}" style="
              display:flex;align-items:center;gap:8px;
              width:100%;padding:9px 14px;
              font-size:12px;font-weight:${l.value === curOutputLang ? '700' : '500'};
              cursor:pointer;border:none;font-family:inherit;text-align:left;
              background:${l.value === curOutputLang ? '#fce4f3' : '#fff'};
              color:${l.value === curOutputLang ? '#e91e8c' : '#333'};
              transition:background .1s;
            " onmouseenter="if(this.dataset.val!=='${curOutputLang}')this.style.background='#fafafa'" onmouseleave="if(this.dataset.val!=='${curOutputLang}')this.style.background='#fff'">
              <span style="font-size:16px;line-height:1">${l.flag}</span>
              <span>${sanitize(l.label)}</span>
              ${l.value === curOutputLang ? '<span style="margin-left:auto;color:#e91e8c">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  // 번역 플래그 드롭다운 (탭해서 열기)
  function flagScroll(selectedVal) {
    const sel = COMPOSE_LANGS.find(l => l.value === selectedVal) || COMPOSE_LANGS[0];
    return `<div id="mm-fp-translate" style="position:relative;">
      <button id="mm-fp-tl-trigger" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:1.5px solid #e8eaed;border-radius:8px;background:#fff;font-size:13px;cursor:pointer;font-family:inherit;transition:all .12s;box-sizing:border-box;">
        <span style="font-size:15px">${sel.flag}</span>
        <span style="font-size:12px;color:#333;flex:1;text-align:left">${sanitize(sel.label)}</span>
        <span id="mm-fp-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>
      </button>
      <div id="mm-fp-tl-list" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e8eaed;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:9999;overflow:hidden;max-height:180px;overflow-y:auto;">
        ${COMPOSE_LANGS.map(l => `
          <button data-val="${l.value}" class="mm-fp-tl-btn" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:none;border-bottom:1px solid #f0f0f0;background:${l.value === selectedVal ? '#fce4f3' : '#fff'};font-size:13px;cursor:pointer;text-align:left;font-family:inherit;box-sizing:border-box;"><span style="font-size:15px">${l.flag}</span><span style="font-size:12px;color:#333">${sanitize(l.label)}</span>${l.value === selectedVal ? '<span style="margin-left:auto;color:#e91e8c">✓</span>' : ''}</button>
        `).join('')}
      </div>
    </div>`;
  }

  function render() {
    const t = T();
    panel.innerHTML = `
      <div id="mm-fp-inner" style="display:flex;flex-direction:column;max-height:88vh">

        <!-- 헤더 -->
        <div id="mm-fp-header" style="
          padding:13px 16px 11px;border-bottom:1px solid #f0f0f0;
          display:flex;align-items:center;justify-content:space-between;
          flex-shrink:0;cursor:grab;
          background:linear-gradient(135deg,#fff5fb,#fff);
          border-radius:13px 13px 0 0;
        ">
          <span style="font-weight:700;color:#e91e8c;font-size:14px;pointer-events:none">✦ MailMind</span>
          <button id="mm-fp-close" style="
            background:none;border:none;cursor:pointer;
            color:#bbb;font-size:18px;line-height:1;padding:2px 4px;border-radius:5px;
          " onmouseenter="this.style.color='#e91e8c'" onmouseleave="this.style.color='#bbb'">✕</button>
        </div>

        <!-- 스크롤 본문 -->
        <div style="padding:14px 16px 16px;overflow-y:auto;flex:1">

          <!-- 탭 -->
          <div style="display:flex;gap:6px;margin-bottom:13px;background:#f3f3f3;border-radius:10px;padding:3px">
            <button id="mm-fp-tab-compose" style="flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${curMode==='compose'?'background:#e91e8c;color:#fff;box-shadow:0 2px 6px rgba(233,30,140,.3)':'background:transparent;color:#666'}">${sanitize(t.tab1)}</button>
            <button id="mm-fp-tab-refine" style="flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${curMode==='refine'?'background:#e91e8c;color:#fff;box-shadow:0 2px 6px rgba(233,30,140,.3)':'background:transparent;color:#666'}">${sanitize(t.tab2)}</button>
          </div>

          <!-- 입력 -->
          <textarea id="mm-fp-input" placeholder="${sanitize(curMode==='compose' ? t.composePlaceholder : t.refinePlaceholder)}" style="
            width:100%;box-sizing:border-box;padding:9px 11px;
            border:1.5px solid #e8e8e8;border-radius:9px;font-size:12px;
            resize:vertical;min-height:${curMode==='refine' ? '110' : '70'}px;
            font-family:inherit;outline:none;line-height:1.55;color:#333;
            background:#fafafa;transition:border-color .15s,background .15s;
          " onfocus="this.style.borderColor='#e91e8c';this.style.background='#fff'" onblur="this.style.borderColor='#e8e8e8';this.style.background='#fafafa'"></textarea>

          <!-- 톤 드롭다운 -->
          <div style="margin-top:11px">
            <div id="mm-fp-lbl-tone" style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">${sanitize(t.toneLabel)}</div>
            ${toneDropdown()}
          </div>

          <!-- 언어 드롭다운 -->
          <div style="margin-top:11px;margin-bottom:13px">
            <div id="mm-fp-lbl-lang" style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">${sanitize(t.langLabel)}</div>
            ${langDropdown()}
          </div>

          <!-- 작성 버튼 -->
          <div style="display:flex;gap:7px">
            <button id="mm-fp-gen-btn" style="
              flex:1;padding:11px;
              background:linear-gradient(135deg,#e91e8c,#c2185b);color:#fff;
              border:none;border-radius:9px;font-size:13px;font-weight:700;
              cursor:pointer;font-family:inherit;letter-spacing:.2px;
              box-shadow:0 3px 12px rgba(233,30,140,.3);
            " onmouseenter="this.style.opacity='.9'" onmouseleave="this.style.opacity='1'"
            >${sanitize(curMode === 'compose' ? t.composeBtn : t.refineBtn)}</button>
            <button id="mm-fp-compare" style="
              flex:1;padding:11px;
              background:#fff3e0;color:#f57c00;
              border:1.5px solid #ffb74d;border-radius:9px;font-size:12px;font-weight:700;
              cursor:pointer;font-family:inherit;white-space:nowrap;
            ">${COMPARE_BTN_LABELS_GM[curLang]||'🔀 비교 3종'}</button>
          </div>

          <!-- 결과 -->
          <div id="mm-fp-result" style="display:none;margin-top:14px;border-top:1px solid #f0f0f0;padding-top:14px">
            <div id="mm-fp-ver-tabs" style="display:none;gap:6px;margin-bottom:10px;flex-wrap:wrap"></div>

            <div style="margin-bottom:9px">
              <div id="mm-fp-lbl-subj" style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">${sanitize(t.subjectLabel)}</div>
              <input id="mm-fp-subject" type="text" style="
                width:100%;box-sizing:border-box;padding:8px 10px;
                border:1.5px solid #e8e8e8;border-radius:8px;font-size:12px;font-family:inherit;outline:none;
                background:#fafafa;transition:border-color .15s;
              " onfocus="this.style.borderColor='#e91e8c';this.style.background='#fff'" onblur="this.style.borderColor='#e8e8e8';this.style.background='#fafafa'">
            </div>

            <div style="margin-bottom:11px">
              <div id="mm-fp-lbl-body" style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">${sanitize(t.bodyLabel)}</div>
              <textarea id="mm-fp-output" style="
                width:100%;box-sizing:border-box;padding:9px 10px;
                border:1.5px solid #e8e8e8;border-radius:8px;font-size:12px;
                resize:vertical;min-height:110px;font-family:inherit;line-height:1.6;outline:none;
                background:#fafafa;transition:border-color .15s;
              " onfocus="this.style.borderColor='#e91e8c';this.style.background='#fff'" onblur="this.style.borderColor='#e8e8e8';this.style.background='#fafafa'"></textarea>
            </div>

            <!-- 번역 -->
            <div style="margin-bottom:11px">
              <div id="mm-fp-lbl-trans" style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">${sanitize(t.translateLabel)}</div>
              ${flagScroll(curOutputLang)}
            </div>

            <!-- 액션 -->
            <div style="display:flex;gap:6px">
              <button id="mm-fp-insert" style="flex:3;padding:10px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;" onmouseenter="this.style.opacity='.85'" onmouseleave="this.style.opacity='1'">${sanitize(t.insertBtn)}</button>
              <button id="mm-fp-copy" style="flex:2;padding:10px;background:#fff;color:#e91e8c;border:1.5px solid #e91e8c;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">${sanitize(t.copyBtn)}</button>
              <button id="mm-fp-restore" style="display:none;padding:10px 11px;background:#fff5fb;color:#e91e8c;border:1.5px solid #f8c8e8;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;" title="AI 원본으로 복원">↩</button>
              <button id="mm-fp-refine" style="padding:10px 12px;background:#f5f5f5;color:#673ab7;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;cursor:pointer;" title="✨ 다듬기">✨</button>
              <button id="mm-fp-regen" style="padding:10px 12px;background:#f5f5f5;color:#666;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;cursor:pointer;">${sanitize(t.regenBtn)}</button>
            </div>
          </div>

          <div id="mm-fp-usage" style="text-align:right;font-size:10px;color:#bbb;margin-top:9px"></div>
        </div>
      </div>
    `;
    bindEvents();
  }

  function bindEvents() {
    const t = T();

    panel.querySelector('#mm-fp-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });

    panel.querySelector('#mm-fp-tab-compose').addEventListener('click', () => {
      if (curMode === 'compose') return;
      curMode = 'compose';
      const saved = panel.querySelector('#mm-fp-input')?.value || '';
      render();
      if (saved) panel.querySelector('#mm-fp-input').value = saved;
    });

    panel.querySelector('#mm-fp-tab-refine').addEventListener('click', () => {
      if (curMode === 'refine') return;
      curMode = 'refine';
      const _savedOut = panel.querySelector('#mm-fp-output')?.value || '';
      const _savedSubj = panel.querySelector('#mm-fp-subject')?.value || '';
      const _resultVis = panel.querySelector('#mm-fp-result')?.style.display !== 'none';
      render();
      if (_savedOut) {
        const _outEl = panel.querySelector('#mm-fp-output');
        const _subjEl = panel.querySelector('#mm-fp-subject');
        const _resDiv = panel.querySelector('#mm-fp-result');
        if (_outEl) _outEl.value = _savedOut;
        if (_subjEl) _subjEl.value = _savedSubj;
        if (_resDiv && _resultVis) _resDiv.style.display = 'block';
      }
    });

    // 톤 드롭다운 토글
    panel.querySelector('#mm-fp-tone-trigger').addEventListener('click', e => {
      e.stopPropagation();
      toneDropOpen = !toneDropOpen;
      langDropOpen = false;
      const list = panel.querySelector('#mm-fp-tone-list');
      const arrow = panel.querySelector('#mm-fp-tone-arrow');
      const langList = panel.querySelector('#mm-fp-lang-list');
      const langArrow = panel.querySelector('#mm-fp-lang-arrow');
      if (list) list.style.display = toneDropOpen ? 'block' : 'none';
      if (arrow) arrow.style.transform = toneDropOpen ? 'rotate(180deg)' : '';
      if (langList) langList.style.display = 'none';
      if (langArrow) langArrow.style.transform = '';
    });

    // 톤 선택
    panel.querySelectorAll('#mm-fp-tone-list button').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        curTone = btn.dataset.val;
        toneDropOpen = false;
        const saved = panel.querySelector('#mm-fp-input')?.value || '';
        render();
        if (saved) panel.querySelector('#mm-fp-input').value = saved;
      });
    });

    // 언어 드롭다운 토글
    panel.querySelector('#mm-fp-lang-trigger').addEventListener('click', e => {
      e.stopPropagation();
      langDropOpen = !langDropOpen;
      toneDropOpen = false;
      const list = panel.querySelector('#mm-fp-lang-list');
      const arrow = panel.querySelector('#mm-fp-lang-arrow');
      const toneList = panel.querySelector('#mm-fp-tone-list');
      const toneArrow = panel.querySelector('#mm-fp-tone-arrow');
      if (list) list.style.display = langDropOpen ? 'block' : 'none';
      if (arrow) arrow.style.transform = langDropOpen ? 'rotate(180deg)' : '';
      if (toneList) toneList.style.display = 'none';
      if (toneArrow) toneArrow.style.transform = '';
    });

    // 언어 선택 (출력 언어만 변경 — UI 언어·결과 섹션 보존)
    panel.querySelectorAll('#mm-fp-lang-list button').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const newLang = btn.dataset.val;
        curOutputLang = newLang;
        curLang = newLang; // UI 라벨도 선택 언어로 변경 (myLanguage 저장 안 함)
        langDropOpen = false;
        // 드롭다운 닫기
        const list = panel.querySelector('#mm-fp-lang-list');
        const arrow = panel.querySelector('#mm-fp-lang-arrow');
        if (list) list.style.display = 'none';
        if (arrow) arrow.style.transform = '';
        // 트리거 버튼 텍스트 수동 업데이트 (render() 없음 → 결과 보존)
        const langItem = COMPOSE_LANGS.find(l => l.value === newLang);
        const trigger = panel.querySelector('#mm-fp-lang-trigger');
        if (trigger && langItem) {
          const spans = trigger.querySelectorAll('span');
          if (spans[0]) spans[0].textContent = langItem.flag;
          if (spans[1]) spans[1].textContent = langItem.label;
        }
        // 리스트 선택 상태 업데이트
        panel.querySelectorAll('#mm-fp-lang-list button').forEach(b => {
          const isSel = b.dataset.val === newLang;
          b.style.background = isSel ? '#fce4f3' : '#fff';
          b.style.fontWeight = isSel ? '700' : '500';
          b.style.color = isSel ? '#e91e8c' : '#333';
        });
        // 패널 UI 라벨 전체 업데이트
        updateUILabels();
      });
    });

    // 패널 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', () => {
      let changed = false;
      if (toneDropOpen) { toneDropOpen = false; changed = true; }
      if (langDropOpen) { langDropOpen = false; changed = true; }
      if (transLangDropOpen) { transLangDropOpen = false; changed = true; }
      if (changed) {
        const tl = panel.querySelector('#mm-fp-tone-list');
        const ta = panel.querySelector('#mm-fp-tone-arrow');
        const ll = panel.querySelector('#mm-fp-lang-list');
        const la = panel.querySelector('#mm-fp-lang-arrow');
        const xl = panel.querySelector('#mm-fp-tl-list');
        const xa = panel.querySelector('#mm-fp-tl-arrow');
        if (tl) tl.style.display = 'none';
        if (ta) ta.style.transform = '';
        if (ll) ll.style.display = 'none';
        if (la) la.style.transform = '';
        if (xl) xl.style.display = 'none';
        if (xa) xa.style.transform = '';
      }
    }, { once: false, capture: true });

    // 번역 언어 드롭다운 트리거
    panel.querySelector('#mm-fp-tl-trigger')?.addEventListener('click', e => {
      e.stopPropagation();
      transLangDropOpen = !transLangDropOpen;
      const list = panel.querySelector('#mm-fp-tl-list');
      const arrow = panel.querySelector('#mm-fp-tl-arrow');
      if (list) list.style.display = transLangDropOpen ? 'block' : 'none';
      if (arrow) arrow.style.transform = transLangDropOpen ? 'rotate(180deg)' : '';
    });

    // 번역 칩
    panel.querySelectorAll('.mm-fp-tl-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetLang = btn.dataset.val;
        const currentBody = panel.querySelector('#mm-fp-output')?.value;
        const currentSubj = panel.querySelector('#mm-fp-subject')?.value;
        if (!currentBody) return;
        // 동일 언어 재탭 시 번역 스킵
        if (targetLang === _gmFpDisplayedLang) {
          transLangDropOpen = false;
          const _slx = panel.querySelector('#mm-fp-tl-list');
          const _sla = panel.querySelector('#mm-fp-tl-arrow');
          if (_slx) _slx.style.display = 'none';
          if (_sla) _sla.style.transform = '';
          return;
        }

        // 캐시에 targetLang이 있으면 바로 복원 (API 호출 없음)
        if (_gmFpTransCache[targetLang]?.[_gmFpCurrentVerIdx]) {
          const cached = _gmFpTransCache[targetLang][_gmFpCurrentVerIdx];
          const subj = panel.querySelector('#mm-fp-subject');
          const out = panel.querySelector('#mm-fp-output');
          if (subj) subj.value = cached.subject || currentSubj || '';
          if (out) out.value = _stripSalutation(cached.body);
          _gmFpDisplayedLang = targetLang;
          panel.querySelectorAll('.mm-fp-tl-btn').forEach(b => {
            b.style.background = b.dataset.val === targetLang ? '#fce4f3' : '#fff';
          });
          transLangDropOpen = false;
          const _xl = panel.querySelector('#mm-fp-tl-list');
          const _xa = panel.querySelector('#mm-fp-tl-arrow');
          const _xt = panel.querySelector('#mm-fp-tl-trigger');
          if (_xl) _xl.style.display = 'none';
          if (_xa) _xa.style.transform = '';
          if (_xt) {
            const selL = COMPOSE_LANGS.find(l => l.value === targetLang) || COMPOSE_LANGS[0];
            _xt.innerHTML = `<span style="font-size:15px">${selL.flag}</span><span style="font-size:12px;color:#333;flex:1;text-align:left">${sanitize(selL.label)}</span><span id="mm-fp-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>`;
          }
          return;
        }

        const origFlag = btn.innerHTML;
        btn.innerHTML = '⏳';
        btn.disabled = true;
        const freshData = await getUserData();
        try {
          // 비교 3종 모드: 원본(번역 아닌 상태)에서만 편집 내용 반영. 번역 중일 때는 덮어쓰지 않음
          if (_gmFpVersions.length > 1 && _gmFpVersions[_gmFpCurrentVerIdx] && !_gmFpDisplayedLang) {
            _gmFpVersions[_gmFpCurrentVerIdx].body = currentBody;
            _gmFpOrigVersions[_gmFpCurrentVerIdx] = { ..._gmFpVersions[_gmFpCurrentVerIdx] };
            if (currentSubj) _gmFpVersions[_gmFpCurrentVerIdx].subject = currentSubj;
          }
          // 단일버전 원본 캡처 (최초 1회만 — 이후 모든 번역은 이 원본에서)
          if (_gmFpVersions.length <= 1 && !_gmFpOrigSingleBody) _gmFpOrigSingleBody = currentBody;
          // ⭐ 항상 원본(최초 생성된 텍스트)에서 번역 — 번역본에서 재번역하지 않음
          const versionsToTranslate = _gmFpVersions.length > 1
            ? _gmFpVersions.map((v, i) => ({ idx: i, draft: (_gmFpOrigVersions[i]?.body || v.body), subject: (_gmFpOrigVersions[i]?.subject || v.subject || ''), tone: v.tone }))
            : [{ idx: -1, draft: _gmFpOrigSingleBody || currentBody, subject: currentSubj || '', tone: curTone }];

          const results = await Promise.all(versionsToTranslate.map(async ({ idx, draft, subject }) => {
            const bodyData = await fetch(`${WORKER_URL}/translate`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: draft, targetLanguage: resolveAutoLang(targetLang), honorific: selectedHonorific })
            }).then(r => r.json()).catch(() => null);
            let subjData = null;
            if (subject) {
              subjData = await fetch(`${WORKER_URL}/translate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: subject, targetLanguage: resolveAutoLang(targetLang), honorific: selectedHonorific })
              }).then(r => r.json()).catch(() => null);
            }
            return { idx, data: bodyData, subjData };
          }));

          // 모든 버전 번역 결과를 캐시에 저장
          if (!_gmFpTransCache[targetLang]) _gmFpTransCache[targetLang] = {};
          results.forEach(({ idx, data, subjData }) => {
            if (data?.success && data.translated) {
              const key = idx === -1 ? 0 : idx;
              _gmFpTransCache[targetLang][key] = {
                body: _stripSalutation(data.translated),
                subject: subjData?.success ? (subjData.translated || '') : ''
              };
            }
          });

          const displayResult = _gmFpVersions.length > 1
            ? results.find(r => r.idx === _gmFpCurrentVerIdx)?.data
            : results[0]?.data;
          const displaySubjResult = _gmFpVersions.length > 1
            ? results.find(r => r.idx === _gmFpCurrentVerIdx)?.subjData
            : results[0]?.subjData;
          const subj = panel.querySelector('#mm-fp-subject');
          const out = panel.querySelector('#mm-fp-output');
          if (displayResult?.success && displayResult.translated) {
            if (subj) subj.value = displaySubjResult?.success ? (displaySubjResult.translated || currentSubj || '') : (currentSubj || '');
            if (out) out.value = _stripSalutation(displayResult.translated);
            _gmFpDisplayedLang = targetLang;
            // AI 번역 결과 저장 (원래대로 버튼용)
            _gmFpAiSaved[targetLang] = {
              body: _stripSalutation(displayResult.translated),
              subject: displaySubjResult?.success ? (displaySubjResult.translated || '') : (currentSubj || '')
            };
            const restoreBtn = panel.querySelector('#mm-fp-restore');
            if (restoreBtn) restoreBtn.style.display = 'block';
          } else if (displayResult?.success && !displayResult.translated) {
            showToast('번역 결과가 없습니다. 다시 시도해주세요.', 'error');
          } else {
            showToast('번역 실패. 다시 시도해주세요.', 'error');
          }
        } catch(e) { showToast('번역 오류: ' + e.message, 'error'); }
        btn.innerHTML = origFlag;
        btn.disabled = false;
        transLangDropOpen = false;
        const _xl2 = panel.querySelector('#mm-fp-tl-list');
        const _xa2 = panel.querySelector('#mm-fp-tl-arrow');
        const _xt2 = panel.querySelector('#mm-fp-tl-trigger');
        if (_xl2) _xl2.style.display = 'none';
        if (_xa2) _xa2.style.transform = '';
        if (_xt2) {
          const selL2 = COMPOSE_LANGS.find(l => l.value === targetLang) || COMPOSE_LANGS[0];
          _xt2.innerHTML = `<span style="font-size:15px">${selL2.flag}</span><span style="font-size:12px;color:#333;flex:1;text-align:left">${sanitize(selL2.label)}</span><span id="mm-fp-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>`;
        }
        panel.querySelectorAll('.mm-fp-tl-btn').forEach(b => {
          b.style.background = b.dataset.val === targetLang ? '#fce4f3' : '#fff';
        });
      });
    });

    // textarea 수정 시 모든 번역 캐시 무효화 + 표시 언어 초기화 + 원래대로 버튼 표시
    panel.querySelector('#mm-fp-output')?.addEventListener('input', () => {
      _gmFpTransCache = {};
      _gmFpDisplayedLang = null;
    });
    panel.querySelector('#mm-fp-subject')?.addEventListener('input', () => {
      _gmFpTransCache = {};
      _gmFpDisplayedLang = null;
    });

    // 원래대로 버튼: AI 저장 결과 복원
    panel.querySelector('#mm-fp-restore')?.addEventListener('click', () => {
      const lang = _gmFpDisplayedLang || curOutputLang;
      // 현재 언어의 AI 저장본 우선, 없으면 어떤 언어든 첫 번째
      const saved = _gmFpAiSaved[lang] || _gmFpAiSaved[Object.keys(_gmFpAiSaved)[0]];
      if (!saved) return;
      const subj = panel.querySelector('#mm-fp-subject');
      const out = panel.querySelector('#mm-fp-output');
      if (subj) subj.value = saved.subject || '';
      if (out) out.value = saved.body || '';
      _gmFpTransCache = {};
      _gmFpDisplayedLang = null;
      const restoreBtn = panel.querySelector('#mm-fp-restore');
      if (restoreBtn) restoreBtn.style.display = 'none';
      showToast('AI 원본으로 복원했습니다.', 'success');
    });

    // ✨ 다듬기: refine 모드로 전환 (render() 호출 없이 UI만 수동 업데이트 — 결과창 유지)
    panel.querySelector('#mm-fp-refine')?.addEventListener('click', () => {
      const currentOutput = panel.querySelector('#mm-fp-output')?.value.trim();
      if (!currentOutput) { showToast('먼저 내용을 생성해주세요', 'error'); return; }
      curMode = 'refine';
      // 탭 스타일 수동 전환 (render() 없이)
      const tabC = panel.querySelector('#mm-fp-tab-compose');
      const tabR = panel.querySelector('#mm-fp-tab-refine');
      if (tabC) { tabC.style.background = 'transparent'; tabC.style.color = '#666'; tabC.style.boxShadow = 'none'; }
      if (tabR) { tabR.style.background = '#e91e8c'; tabR.style.color = '#fff'; tabR.style.boxShadow = '0 2px 6px rgba(233,30,140,.3)'; }
      // 버튼 텍스트·플레이스홀더 업데이트
      const t2 = T();
      const genBtn = panel.querySelector('#mm-fp-gen-btn');
      if (genBtn) genBtn.textContent = t2.refineBtn;
      const inputEl = panel.querySelector('#mm-fp-input');
      if (inputEl) { inputEl.value = ''; inputEl.placeholder = t2.refinePlaceholder; inputEl.focus(); }
      showToast('다듬기 모드로 전환했습니다. 수정 사항을 입력하세요.', 'success');
    });

    panel.querySelector('#mm-fp-gen-btn').addEventListener('click', doGenerate);
    panel.querySelector('#mm-fp-regen')?.addEventListener('click', doGenerate);
    panel.querySelector('#mm-fp-compare')?.addEventListener('click', doGMFpCompare);

    panel.querySelector('#mm-fp-insert')?.addEventListener('click', () => {
      const t2 = T();
      const subject = panel.querySelector('#mm-fp-subject').value.trim();
      const bodyText = panel.querySelector('#mm-fp-output').value;
      const bodyEl = document.querySelector(
        '[contenteditable="true"][role="textbox"][g_editable="true"], div[role="dialog"] [contenteditable="true"][role="textbox"], .Am [contenteditable="true"]'
      );
      if (bodyEl) {
        bodyEl.focus();
        bodyEl.innerHTML = sanitize(bodyText).replace(/\n/g, '<br>');
        if (subject) {
          const subjectInput = document.querySelector('input[name="subjectbox"]');
          if (subjectInput && !subjectInput.value) {
            subjectInput.value = subject;
            subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        showToast(t2.successInsert, 'success');
        panel.style.display = 'none';
      } else {
        const full = subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
        navigator.clipboard.writeText(full).then(() => showToast(t2.errNoBody, 'success'));
      }
    });

    panel.querySelector('#mm-fp-copy')?.addEventListener('click', () => {
      const t2 = T();
      const subject = panel.querySelector('#mm-fp-subject').value.trim();
      const bodyText = panel.querySelector('#mm-fp-output').value;
      const full = subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
      navigator.clipboard.writeText(full).then(() => showToast(t2.successCopy, 'success'));
    });
  }

  async function doGenerate() {
    const t = T();
    const input = panel.querySelector('#mm-fp-input')?.value.trim() || '';
    if (!input || input.length < 3) { showToast(t.errEmpty, 'error'); return; }

    const freshData = await getUserData();
    if (!freshData.userEmail) { showToast(t.errLogin, 'error'); return; }

    const genBtn = panel.querySelector('#mm-fp-gen-btn');
    const origText = genBtn.textContent;
    genBtn.textContent = t.generatingText;
    genBtn.disabled = true;
    genBtn.style.opacity = '0.65';
    _gmFpVersions = []; _gmFpOrigVersions = []; _gmFpOrigSingleBody = ''; _gmFpCurrentVerIdx = 0; _gmFpTransCache = {}; _gmFpDisplayedLang = null; _gmFpAiSaved = {};
    const _vtGM = panel.querySelector('#mm-fp-ver-tabs');
    if (_vtGM) { _vtGM.style.display = 'none'; _vtGM.innerHTML = ''; }

    const endpoint = curMode === 'compose' ? '/generate-compose' : '/refine-compose';
    const refineCurrentDraft = panel.querySelector('#mm-fp-output')?.value.trim() || input;
    const bodyPayload = curMode === 'compose'
      ? { prompt: input, tone: curTone, length: 'medium', myLanguage: curOutputLang, email: freshData.userEmail, country: selectedCountry, clientDate: new Date().toISOString(), ...(userInfo ? { userInfo } : {}), ...(freshData.businessCard ? { businessCard: freshData.businessCard } : {}), ...(freshData.phrases?.length ? { phrases: freshData.phrases } : {}) }
      : { draft: refineCurrentDraft, instruction: input, tone: curTone, length: 'medium', myLanguage: curOutputLang, email: freshData.userEmail, country: selectedCountry, clientDate: new Date().toISOString(), ...(userInfo ? { userInfo } : {}), ...(freshData.businessCard ? { businessCard: freshData.businessCard } : {}), ...(freshData.phrases?.length ? { phrases: freshData.phrases } : {}) };

    try {
      const res = await fetch(`${WORKER_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.success) {
        const genBody = _stripSalutation(data.body || data.reply || '');
        const genSubj = data.subject || '';
        const applyResult = () => {
          panel.querySelector('#mm-fp-subject').value = genSubj;
          panel.querySelector('#mm-fp-output').value = genBody;
          // 서명 자동 삽입 (작성 모드)
          safeStorageGet(['signature'], (sd) => {
            if (sd.signature) {
              const outEl = panel.querySelector('#mm-fp-output');
              if (outEl && !outEl.value.includes(sd.signature)) {
                outEl.value = outEl.value + '\n\n' + sd.signature;
              }
            }
          });
          panel.querySelector('#mm-fp-result').style.display = 'block';
          panel.querySelector('#mm-fp-usage').textContent = t.usageText(data.monthlyUsage, data.monthlyLimit);
          panel.querySelector('#mm-fp-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          _gmFpAiSaved = {};
          _gmFpAiSaved[curOutputLang] = { body: genBody, subject: genSubj };
          const restoreBtn = panel.querySelector('#mm-fp-restore');
          if (restoreBtn) restoreBtn.style.display = 'block';
        };
        // Refine 모드: Diff 뷰 표시. Compose 모드: 바로 적용
        if (curMode === 'refine') {
          const outEl = panel.querySelector('#mm-fp-output');
          const origVal = refineCurrentDraft;
          let fpDiff = panel.querySelector('#mm-fp-diff-panel');
          if (fpDiff) fpDiff.remove();
          const {oH,rH} = _mmBuildDiff(origVal, genBody);
          fpDiff = document.createElement('div');
          fpDiff.id = 'mm-fp-diff-panel';
          fpDiff.style.cssText = 'margin:8px 0;border:1.5px solid #e0d4f7;border-radius:10px;overflow:hidden;font-size:12px;background:#fafafa';
          const _fpDi = _mmGetDiffI18n(curOutputLang || selectedMyLang);
          fpDiff.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;padding:7px 10px;background:#f3eeff;border-bottom:1px solid #e0d4f7">
              <span style="font-size:11px;font-weight:700;color:#673ab7">${_mmEsc(_fpDi.title)}</span>
              <span style="font-size:10px;color:#999;margin-left:auto">${_mmEsc(_fpDi.hint)}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
              <div style="padding:8px 10px;border-right:1px solid #e0d4f7">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#999;margin-bottom:5px">${_mmEsc(_fpDi.orig)}</div>
                <div style="line-height:1.6;word-break:break-word">${oH}</div>
              </div>
              <div style="padding:8px 10px">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#673ab7;margin-bottom:5px">${_mmEsc(_fpDi.result)}</div>
                <div style="line-height:1.6;word-break:break-word">${rH}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;padding:8px 10px;border-top:1px solid #e0d4f7;background:#f9f9f9">
              <button id="mm-fp-diff-apply" style="flex:1;padding:7px;background:#673ab7;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${_mmEsc(_fpDi.apply)}</button>
              <button id="mm-fp-diff-cancel" style="padding:7px 14px;background:#fff;color:#666;border:1px solid #ddd;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit">${_mmEsc(_fpDi.cancel)}</button>
            </div>`;
          if (outEl) outEl.after(fpDiff);
          else panel.querySelector('#mm-fp-result')?.before(fpDiff);
          fpDiff.querySelector('#mm-fp-diff-apply').addEventListener('click', () => { fpDiff.remove(); applyResult(); });
          fpDiff.querySelector('#mm-fp-diff-cancel').addEventListener('click', () => { fpDiff.remove(); });
        } else {
          applyResult();
        }
      } else if (data.error === 'EMPTY_PROMPT') {
        showToast(t.errEmpty, 'error');
      } else if (data.error === 'MONTHLY_LIMIT') {
        showToast(t.errLimit, 'error');
      } else {
        showToast((data.message || t.errFail), 'error');
      }
    } catch(e) { showToast('네트워크 오류: ' + e.message, 'error'); }

    genBtn.textContent = origText;
    genBtn.disabled = false;
    genBtn.style.opacity = '1';
  }

  async function doGMFpCompare() {
    const input = panel.querySelector('#mm-fp-input')?.value.trim();
    if (!input) { showToast('내용을 입력하세요', 'error'); return; }
    const compareBtn = panel.querySelector('#mm-fp-compare');
    if (compareBtn) { compareBtn.disabled = true; compareBtn.textContent = '⏳ 생성 중…'; }
    const freshData = await getUserData();
    const userInfo = freshData?.userInfo || null;
    const tones = ['professional', 'friendly', curTone === 'professional' ? 'concise' : curTone === 'friendly' ? 'detailed' : 'professional'];
    const uniqueTones = [...new Set(tones)].slice(0, 3);
    const toneLabelMap = { Korean:{professional:'업무적',friendly:'친근하게',concise:'간결하게',detailed:'상세하게',decline:'거절하기',thankful:'감사하게'}, English:{professional:'Professional',friendly:'Friendly',concise:'Concise',detailed:'Detailed',decline:'Decline',thankful:'Thankful'}, Japanese:{professional:'ビジネス',friendly:'フレンドリー',concise:'簡潔',detailed:'詳細',decline:'断り',thankful:'感謝'} };
    const tlMap = toneLabelMap[curLang] || toneLabelMap['English'];
    const endpoint = curMode === 'compose' ? '/generate-compose' : '/refine-compose';
    try {
      const results = await Promise.all(uniqueTones.map(tone => {
        const body = curMode === 'compose'
          ? { prompt: input, tone, myLanguage: curOutputLang, email: freshData.userEmail, country: selectedCountry, clientDate: new Date().toISOString(), ...(userInfo ? { userInfo } : {}), ...(freshData.businessCard ? { businessCard: freshData.businessCard } : {}), ...(freshData.phrases?.length ? { phrases: freshData.phrases } : {}) }
          : { draft: input, tone, myLanguage: curOutputLang, email: freshData.userEmail, country: selectedCountry, clientDate: new Date().toISOString(), ...(userInfo ? { userInfo } : {}), ...(freshData.businessCard ? { businessCard: freshData.businessCard } : {}), ...(freshData.phrases?.length ? { phrases: freshData.phrases } : {}) };
        return fetch(`${WORKER_URL}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()).then(d => ({ tone, subject: d.subject||'', body: _stripSalutation(d.body||d.reply||'') })).catch(() => null);
      }));
      _gmFpVersions = results.filter(Boolean);
      _gmFpOrigVersions = _gmFpVersions.map(v => ({ ...v })); // 원본 보존 (번역 소스)
      _gmFpOrigSingleBody = '';
      _gmFpCurrentVerIdx = 0;
      if (!_gmFpVersions.length) { showToast('생성 실패', 'error'); return; }
      const _vtGM = panel.querySelector('#mm-fp-ver-tabs');
      if (_vtGM) {
        _vtGM.style.display = 'flex';
        const _fpTlGM = panel.querySelector('#mm-fp-translate');
        if (_fpTlGM) { _fpTlGM.style.pointerEvents = 'none'; _fpTlGM.style.opacity = '0.4'; }
        _vtGM.innerHTML = _gmFpVersions.map((v, i) => `<button class="mm-gm-fp-ver-btn" data-idx="${i}" style="padding:5px 10px;border-radius:16px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${i===0?'#f57c00':'#e0e0e0'};background:${i===0?'#fff3e0':'#f5f5f5'};color:${i===0?'#f57c00':'#666'};font-family:inherit">${tlMap[v.tone]||v.tone}</button>`).join('') + `<button id="mm-gm-fp-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-family:inherit;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
        _vtGM.querySelectorAll('.mm-gm-fp-ver-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            // 탭 전환 전 현재 내용 저장
            if (_gmFpVersions[_gmFpCurrentVerIdx]) {
              const curSubj = panel.querySelector('#mm-fp-subject')?.value;
              const curOut = panel.querySelector('#mm-fp-output')?.value;
              if (curSubj !== undefined) _gmFpVersions[_gmFpCurrentVerIdx].subject = curSubj;
              if (curOut !== undefined) _gmFpVersions[_gmFpCurrentVerIdx].body = curOut;
            }
            _gmFpCurrentVerIdx = parseInt(btn.dataset.idx);
            const ver = _gmFpVersions[_gmFpCurrentVerIdx];
            const transVer = _gmFpDisplayedLang && _gmFpTransCache[_gmFpDisplayedLang]?.[_gmFpCurrentVerIdx];
            panel.querySelector('#mm-fp-subject').value = transVer?.subject ?? ver.subject;
            panel.querySelector('#mm-fp-output').value = transVer?.body ?? ver.body;
            _vtGM.querySelectorAll('.mm-gm-fp-ver-btn').forEach((b, bi) => {
              b.style.borderColor = bi === _gmFpCurrentVerIdx ? '#f57c00' : '#e0e0e0';
              b.style.background = bi === _gmFpCurrentVerIdx ? '#fff3e0' : '#f5f5f5';
              b.style.color = bi === _gmFpCurrentVerIdx ? '#f57c00' : '#666';
            });
          });
        });
        _vtGM.querySelector('#mm-gm-fp-ver-confirm')?.addEventListener('click', () => {
          _gmFpVersions = [];
          _gmFpCurrentVerIdx = 0;
          _vtGM.style.display = 'none';
          _vtGM.innerHTML = '';
          const _fpTlRestoreGM = panel.querySelector('#mm-fp-translate');
          if (_fpTlRestoreGM) { _fpTlRestoreGM.style.pointerEvents = ''; _fpTlRestoreGM.style.opacity = ''; }
        });
      }
      const first = _gmFpVersions[0];
      panel.querySelector('#mm-fp-subject').value = first.subject;
      panel.querySelector('#mm-fp-output').value = first.body;
      // 서명 자동 삽입 (비교 3종 모드 — 각 버전 body에도 추가)
      safeStorageGet(['signature'], (sd) => {
        if (sd.signature) {
          _gmFpVersions.forEach((v, i) => {
            if (!v.body.includes(sd.signature)) {
              v.body = v.body + '\n\n' + sd.signature;
              if (_gmFpOrigVersions[i]) _gmFpOrigVersions[i].body = v.body;
            }
          });
          const _cmpOut = panel.querySelector('#mm-fp-output');
          if (_cmpOut && !_cmpOut.value.includes(sd.signature)) {
            _cmpOut.value = _cmpOut.value + '\n\n' + sd.signature;
          }
        }
      });
      panel.querySelector('#mm-fp-result').style.display = 'block';
    } catch(e) { showToast('오류 발생', 'error'); }
    if (compareBtn) { compareBtn.disabled = false; compareBtn.textContent = COMPARE_BTN_LABELS_GM[curLang]||'🔀 비교 3종'; }
  }

  render();
}

// Gmail 작성창 툴바 버튼 주입
function watchCompose() {
  const seen = new WeakSet();
  const observer = new MutationObserver(() => {
    document.querySelectorAll('div[role="dialog"] .Am, .AD').forEach(form => {
      if (!seen.has(form) && !form.querySelector('#mm-compose-btn')) {
        seen.add(form);
        injectComposeButton(form);
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function injectComposeButton(form) {
  const toolbar = form.querySelector('.btC, .aG, .aDh, [role="toolbar"]') || form;
  const btn = document.createElement('div');
  btn.id = 'mm-compose-btn';
  btn.style.cssText = `
    display:inline-flex;align-items:center;gap:4px;
    padding:5px 11px;border-radius:20px;cursor:pointer;
    background:#e91e8c;color:#fff;font-size:11px;font-weight:700;
    margin:0 4px;font-family:Google Sans,Arial,sans-serif;
    box-shadow:0 2px 8px rgba(233,30,140,.25);
    transition:background .15s,transform .1s;user-select:none;
  `;
  btn.innerHTML = '✦ MailMind';
  btn.onmouseenter = () => { btn.style.background = '#c2185b'; btn.style.transform = 'scale(1.03)'; };
  btn.onmouseleave = () => { btn.style.background = '#e91e8c'; btn.style.transform = 'scale(1)'; };
  btn.addEventListener('click', () => openFloatPanel());
  toolbar.prepend(btn);
}

// Gmail FAB 쌍 — 핑크(AI 답장) + 보라(AI 작성), 아웃룩과 동일한 방식
function addGmailComposeFab() {
  // 보라색 작성 FAB
  if (!document.getElementById('mm-gm-compose-fab')) {
    const fab = document.createElement('button');
    fab.id = 'mm-gm-compose-fab';
    fab.title = 'MailMind AI 작성';
    fab.innerHTML = '<div style="font-size:16px;line-height:1">✍</div><div style="font-size:9px;margin-top:1px">작성</div>';
    fab.style.cssText = `
      position:fixed;right:16px;bottom:80px;
      width:44px;height:44px;border-radius:50%;border:none;
      background:linear-gradient(135deg,#7c4dff,#b388ff);color:#fff;
      cursor:pointer;z-index:999997;
      box-shadow:0 4px 16px rgba(124,77,255,0.4);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:Google Sans,Arial,sans-serif;
      transition:transform .15s,box-shadow .15s;
    `;
    fab.onmouseenter = () => { fab.style.transform = 'scale(1.1)'; fab.style.boxShadow = '0 6px 24px rgba(124,77,255,0.55)'; };
    fab.onmouseleave = () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 4px 16px rgba(124,77,255,0.4)'; };
    fab.addEventListener('click', () => {
      const panel = document.getElementById('mm-float-panel');
      if (panel && panel.style.display !== 'none') {
        panel.style.display = 'none';
      } else {
        openFloatPanel();
      }
    });
    document.body.appendChild(fab);
  }

  // 핑크색 AI 답장 FAB (이메일 열려있을 때만 표시)
  if (!document.getElementById('mm-gm-reply-fab')) {
    const replyFab = document.createElement('button');
    replyFab.id = 'mm-gm-reply-fab';
    replyFab.title = 'MailMind AI 답장';
    replyFab.innerHTML = '<div style="font-size:14px;line-height:1">AI</div><div style="font-size:9px;margin-top:1px">답장</div>';
    replyFab.style.cssText = `
      position:fixed;right:16px;bottom:132px;
      width:44px;height:44px;border-radius:50%;border:none;
      background:linear-gradient(135deg,#e91e8c,#f06292);color:#fff;
      cursor:pointer;z-index:999997;
      box-shadow:0 4px 16px rgba(233,30,140,0.4);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:Google Sans,Arial,sans-serif;font-weight:700;
      transition:transform .15s,box-shadow .15s;
    `;
    replyFab.onmouseenter = () => { replyFab.style.transform = 'scale(1.1)'; replyFab.style.boxShadow = '0 6px 24px rgba(233,30,140,0.55)'; };
    replyFab.onmouseleave = () => { replyFab.style.transform = 'scale(1)'; replyFab.style.boxShadow = '0 4px 16px rgba(233,30,140,0.4)'; };
    replyFab.addEventListener('click', () => {
      const panel = document.getElementById('mm-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      } else {
        showToast('이메일을 먼저 열어주세요', 'error');
      }
    });
    document.body.appendChild(replyFab);
  }
}

createFloatPanel();
watchCompose();
setTimeout(addGmailComposeFab, 1500);

// URL 변경 감지 (Gmail SPA — compose 탭 이동 시 FAB 유지)
(function watchGmailNav() {
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      setTimeout(addGmailComposeFab, 800);
    }
  }, 1000);
})();

// 글자수 카운터
function updateCharCount() {
  const panel = document.getElementById('mm-panel');
  if (!panel) return;
  const output = panel.querySelector('#mm-output');
  const counter = panel.querySelector('#mm-char-count');
  if (output && counter) {
    const len = output.value.length;
    counter.textContent = `${len} chars`;
    counter.style.color = len > 500 ? '#e37400' : '#9aa0a6';
  }
}
