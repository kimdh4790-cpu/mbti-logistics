// MailMind AI — Outlook Web content script v1.4.0 (Full feature parity with Gmail)
// outlook.live.com / outlook.office.com / outlook.office365.com

const WORKER_URL_OL = 'https://mailmind-api.kimdh4790.workers.dev';
function escapeHtmlOL(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ===== UI 문자열 (Gmail content.js와 동일) =====
const UI_STRINGS_OL = {
  Korean:     { tone: '답장 톤', country: '발신자 국가', myLang: '내 언어', generate: '✦ AI 답장 생성', generating: '✦ 생성 중...', compare: '✨ 답변 비교', smartReply: '👑 스마트 답장 · Pro', summary: '📝 메일 요약', summarizing: '📝 요약 중...', tasks: '📌 감지된 할 일 & 액션', settings: '⚙️ 설정 (서명 · 템플릿)', insert: '✉️ Outlook에 삽입', copy: '📋 복사', regen: '🔄', switchLang: '언어 전환:', upgrade: '플랜 업그레이드 →', limitMsg: '이번 달 사용 한도에 도달했어요.', promises: '📋 내가 약속한 것', signature: '내 서명', sigSave: '서명 저장', template: '자주 쓰는 문구', save: '저장', shortcut: '⌨️ Alt+G 생성 · Alt+C 복사 · Alt+I 삽입', settingsClose: '⚙️ 설정 닫기', translateBtn: '🌐 내 언어로 번역', translateClose: '🌐 번역 닫기', urgency: { high: '🔴 긴급', medium: '🟡 보통', low: '🟢 여유' }, emotion: { angry: '😤 불만', urgent: '⚡ 급함', neutral: '😊 일반', positive: '👍 긍정', learnedLabel: '학습됨', tonePref: '톤 선호', learnedUnit: '회 학습', styleShort: '간결하게', styleMid: '보통 길이', styleLong: '상세하게' }, refine:'✨ 다듬기', refining:'✨ 다듬기 중...', refineDone:'✨ 다듬기 완료!', refineFailed:'다듬기 실패. 다시 시도해주세요.', refineEmpty:'다듬기 실패: 결과가 비어있습니다.', refineInput:'다듬을 내용을 입력해주세요.', refinePlanMsg:'초안 다듬기는 Basic 이상 플랜에서 사용 가능합니다', smartGenerating:'🌍 분석 중...' },
  English:    { tone: 'Reply Tone', country: "Sender's Country", myLang: 'My Language', generate: '✦ Generate AI Reply', generating: '✦ Generating...', compare: '✨ Compare Replies', smartReply: '👑 Smart Reply · Pro', summary: '📝 Mail Summary', summarizing: '📝 Summarizing...', tasks: '📌 Detected Actions', settings: '⚙️ Settings', insert: '✉️ Insert into Outlook', copy: '📋 Copy', regen: '🔄', switchLang: 'Switch:', upgrade: 'Upgrade Plan →', limitMsg: 'Monthly limit reached.', promises: '📋 Your Commitments', signature: 'My Signature', sigSave: 'Save', template: 'Templates', save: 'Save', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Close Settings', translateBtn: '🌐 Translate to My Language', translateClose: '🌐 Close Translation', urgency: { high: '🔴 Urgent', medium: '🟡 Normal', low: '🟢 Low' }, emotion: { angry: '😤 Complaint', urgent: '⚡ Urgent', neutral: '😊 Normal', positive: '👍 Positive', learnedLabel: 'Learned', tonePref: 'tone pref', learnedUnit: 'uses', styleShort: 'concise', styleMid: 'moderate', styleLong: 'detailed' }, refine:'✨ Polish', refining:'✨ Polishing...', refineDone:'✨ Polish complete!', refineFailed:'Polish failed. Please try again.', refineEmpty:'Polish failed: empty result.', refineInput:'Please enter text to polish.', refinePlanMsg:'Refine is available on Basic or higher plans.', smartGenerating:'🌍 Analyzing...' },
  Japanese:   { tone: '返信トーン', country: '送信者の国', myLang: '使用言語', generate: '✦ AI返信を生成', generating: '✦ 生成中...', compare: '✨ 返信を比較', smartReply: '👑 スマート返信 · Pro', summary: '📝 メール要約', summarizing: '📝 要約中...', tasks: '📌 検出されたアクション', settings: '⚙️ 設定', insert: '✉️ Outlookに挿入', copy: '📋 コピー', regen: '🔄', switchLang: '言語切替:', upgrade: 'アップグレード →', limitMsg: '今月の上限に達しました。', promises: '📋 あなたの約束', signature: '署名', sigSave: '保存', template: 'テンプレート', save: '保存', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ 設定を閉じる', translateBtn: '🌐 自分の言語に翻訳', translateClose: '🌐 翻訳を閉じる', urgency: { high: '🔴 緊急', medium: '🟡 普通', low: '🟢 余裕' }, emotion: { angry: '😤 不満', urgent: '⚡ 急ぎ', neutral: '😊 通常', positive: '👍 ポジティブ', learnedLabel: '学習済み', tonePref: 'トーン好み', learnedUnit: '回学習', styleShort: '簡潔', styleMid: '普通', styleLong: '詳細' }, refine:'✨ 磨く', refining:'✨ 磨き中...', refineDone:'✨ 磨き完了！', refineFailed:'磨き失敗。再試行してください。', refineEmpty:'磨き失敗：結果が空です。', refineInput:'磨く内容を入力してください。', refinePlanMsg:'ブラッシュアップはBasicプラン以上でご利用いただけます。', smartGenerating:'🌍 分析中...' },
  Chinese:    { tone: '回复语气', country: '发件人国家', myLang: '我的语言', generate: '✦ 生成AI回复', generating: '✦ 生成中...', compare: '✨ 比较回复', smartReply: '👑 智能回复 · Pro', summary: '📝 邮件摘要', summarizing: '📝 摘要中...', tasks: '📌 检测到的操作', settings: '⚙️ 设置', insert: '✉️ 插入Outlook', copy: '📋 复制', regen: '🔄', switchLang: '切换语言:', upgrade: '升级计划 →', limitMsg: '本月使用限额已达到。', promises: '📋 您的承诺', signature: '我的签名', sigSave: '保存', template: '模板', save: '保存', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ 关闭设置', translateBtn: '🌐 翻译成我的语言', translateClose: '🌐 关闭翻译', urgency: { high: '🔴 紧急', medium: '🟡 普通', low: '🟢 轻松' }, emotion: { angry: '😤 投诉', urgent: '⚡ 紧急', neutral: '😊 正常', positive: '👍 积极', learnedLabel: '已学习', tonePref: '语气偏好', learnedUnit: '次学习', styleShort: '简洁', styleMid: '适中', styleLong: '详细' }, refine:'✨ 润色', refining:'✨ 润色中...', refineDone:'✨ 润色完成！', refineFailed:'润色失败，请重试。', refineEmpty:'润色失败：结果为空。', refineInput:'请输入要润色的内容。', refinePlanMsg:'润色功能在Basic或更高版本中可用。', smartGenerating:'🌍 分析中...' },
  German:     { tone: 'Antwortton', country: 'Absenderland', myLang: 'Meine Sprache', generate: '✦ KI-Antwort generieren', generating: '✦ Generiere...', compare: '✨ Antworten vergleichen', smartReply: '👑 Smart Reply · Pro', summary: '📝 E-Mail-Zusammenfassung', summarizing: '📝 Zusammenfassen...', tasks: '📌 Erkannte Aktionen', settings: '⚙️ Einstellungen', insert: '✉️ In Outlook einfügen', copy: '📋 Kopieren', regen: '🔄', switchLang: 'Wechseln:', upgrade: 'Plan upgraden →', limitMsg: 'Monatliches Limit erreicht.', promises: '📋 Ihre Zusagen', signature: 'Meine Signatur', sigSave: 'Speichern', template: 'Vorlagen', save: 'Speichern', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Einstellungen schließen', translateBtn: '🌐 In meine Sprache übersetzen', translateClose: '🌐 Übersetzung schließen', urgency: { high: '🔴 Dringend', medium: '🟡 Normal', low: '🟢 Entspannt' }, emotion: { angry: '😤 Beschwerde', urgent: '⚡ Dringend', neutral: '😊 Normal', positive: '👍 Positiv', learnedLabel: 'Gelernt', tonePref: 'Ton-Vorliebe', learnedUnit: 'Mal gelernt', styleShort: 'prägnant', styleMid: 'mittel', styleLong: 'ausführlich' }, refine:'✨ Verfeinern', refining:'✨ Verfeinere...', refineDone:'✨ Verfeinert!', refineFailed:'Verfeinern fehlgeschlagen. Bitte erneut versuchen.', refineEmpty:'Verfeinern fehlgeschlagen: Leeres Ergebnis.', refineInput:'Bitte Text zum Verfeinern eingeben.', refinePlanMsg:'Verfeinern ist ab dem Basic-Plan verfügbar.', smartGenerating:'🌍 Analysiere...' },
  French:     { tone: 'Ton de réponse', country: "Pays de l'expéditeur", myLang: 'Ma langue', generate: '✦ Générer une réponse IA', generating: '✦ Génération...', compare: '✨ Comparer les réponses', smartReply: '👑 Réponse intelligente · Pro', summary: '📝 Résumé du mail', summarizing: '📝 Résumé en cours...', tasks: '📌 Actions détectées', settings: '⚙️ Paramètres', insert: '✉️ Insérer dans Outlook', copy: '📋 Copier', regen: '🔄', switchLang: 'Changer:', upgrade: 'Mettre à niveau →', limitMsg: 'Limite mensuelle atteinte.', promises: '📋 Vos engagements', signature: 'Ma signature', sigSave: 'Enregistrer', template: 'Modèles', save: 'Sauver', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Fermer', translateBtn: '🌐 Traduire dans ma langue', translateClose: '🌐 Fermer la traduction', urgency: { high: '🔴 Urgent', medium: '🟡 Normal', low: '🟢 Tranquille' }, emotion: { angry: '😤 Plainte', urgent: '⚡ Urgent', neutral: '😊 Normal', positive: '👍 Positif', learnedLabel: 'Appris', tonePref: 'préf. de ton', learnedUnit: 'apprentissages', styleShort: 'concis', styleMid: 'modéré', styleLong: 'détaillé' }, refine:'✨ Affiner', refining:'✨ Affinage...', refineDone:'✨ Affiné !', refineFailed:'Échec du raffinage. Veuillez réessayer.', refineEmpty:'Échec du raffinage : résultat vide.', refineInput:'Veuillez saisir le texte à affiner.', refinePlanMsg:'L\'affinement est disponible sur le plan Basic ou supérieur.', smartGenerating:'🌍 Analyse...' },
  Portuguese: { tone: 'Tom de resposta', country: 'País do remetente', myLang: 'Meu idioma', generate: '✦ Gerar resposta IA', generating: '✦ Gerando...', compare: '✨ Comparar respostas', smartReply: '👑 Resposta inteligente · Pro', summary: '📝 Resumo do e-mail', summarizing: '📝 Resumindo...', tasks: '📌 Ações detectadas', settings: '⚙️ Configurações', insert: '✉️ Inserir no Outlook', copy: '📋 Copiar', regen: '🔄', switchLang: 'Mudar:', upgrade: 'Atualizar plano →', limitMsg: 'Limite mensal atingido.', promises: '📋 Seus compromissos', signature: 'Minha assinatura', sigSave: 'Salvar', template: 'Modelos', save: 'Salvar', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Fechar', translateBtn: '🌐 Traduzir para meu idioma', translateClose: '🌐 Fechar tradução', urgency: { high: '🔴 Urgente', medium: '🟡 Normal', low: '🟢 Tranquilo' }, emotion: { angry: '😤 Reclamação', urgent: '⚡ Urgente', neutral: '😊 Normal', positive: '👍 Positivo', learnedLabel: 'Aprendido', tonePref: 'pref. de tom', learnedUnit: 'usos', styleShort: 'conciso', styleMid: 'moderado', styleLong: 'detalhado' }, refine:'✨ Refinar', refining:'✨ Refinando...', refineDone:'✨ Refinado!', refineFailed:'Refinamento falhou. Tente novamente.', refineEmpty:'Refinamento falhou: resultado vazio.', refineInput:'Por favor insira o texto para refinar.', refinePlanMsg:'Refinar está disponível no plano Basic ou superior.', smartGenerating:'🌍 Analisando...' },
  Arabic:     { tone: 'نبرة الرد', country: 'بلد المرسل', myLang: 'لغتي', generate: '✦ توليد رد ذكي', generating: '✦ جارٍ التوليد...', compare: '✨ مقارنة الردود', smartReply: '👑 الرد الذكي · Pro', summary: '📝 ملخص البريد', summarizing: '📝 جارٍ التلخيص...', tasks: '📌 الإجراءات المكتشفة', settings: '⚙️ الإعدادات', insert: '✉️ إدراج في Outlook', copy: '📋 نسخ', regen: '🔄', switchLang: 'تغيير:', upgrade: 'ترقية الخطة →', limitMsg: 'تم الوصول إلى الحد الشهري.', promises: '📋 التزاماتك', signature: 'توقيعي', sigSave: 'حفظ', template: 'قوالب', save: 'حفظ', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ إغلاق', translateBtn: '🌐 ترجم إلى لغتي', translateClose: '🌐 إغلاق الترجمة', urgency: { high: '🔴 عاجل', medium: '🟡 عادي', low: '🟢 هادئ' }, emotion: { angry: '😤 شكوى', urgent: '⚡ عاجل', neutral: '😊 عادي', positive: '👍 إيجابي', learnedLabel: 'تم التعلم', tonePref: 'تفضيل النبرة', learnedUnit: 'مرة', styleShort: 'موجز', styleMid: 'متوسط', styleLong: 'مفصل' }, refine:'✨ تحسين', refining:'✨ جارٍ التحسين...', refineDone:'✨ تم التحسين!', refineFailed:'فشل التحسين. يرجى المحاولة مجدداً.', refineEmpty:'فشل التحسين: النتيجة فارغة.', refineInput:'يرجى إدخال النص للتحسين.', refinePlanMsg:'التحسين متاح في الخطة Basic أو أعلى.', smartGenerating:'🌍 جارٍ التحليل...' },
  Spanish:    { tone: 'Tono de respuesta', country: 'País del remitente', myLang: 'Mi idioma', generate: '✦ Generar respuesta IA', generating: '✦ Generando...', compare: '✨ Comparar respuestas', smartReply: '👑 Respuesta inteligente · Pro', summary: '📝 Resumen del correo', summarizing: '📝 Resumiendo...', tasks: '📌 Acciones detectadas', settings: '⚙️ Configuración', insert: '✉️ Insertar en Outlook', copy: '📋 Copiar', regen: '🔄', switchLang: 'Cambiar:', upgrade: 'Actualizar plan →', limitMsg: 'Límite mensual alcanzado.', promises: '📋 Tus compromisos', signature: 'Mi firma', sigSave: 'Guardar', template: 'Plantillas', save: 'Guardar', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Cerrar', translateBtn: '🌐 Traducir a mi idioma', translateClose: '🌐 Cerrar traducción', urgency: { high: '🔴 Urgente', medium: '🟡 Normal', low: '🟢 Tranquilo' }, emotion: { angry: '😤 Queja', urgent: '⚡ Urgente', neutral: '😊 Normal', positive: '👍 Positivo', learnedLabel: 'Aprendido', tonePref: 'pref. de tono', learnedUnit: 'usos', styleShort: 'conciso', styleMid: 'moderado', styleLong: 'detallado' }, refine:'✨ Pulir', refining:'✨ Puliendo...', refineDone:'✨ ¡Pulido!', refineFailed:'Error al pulir. Por favor inténtelo de nuevo.', refineEmpty:'Error al pulir: resultado vacío.', refineInput:'Por favor ingrese el texto a pulir.', refinePlanMsg:'Pulir está disponible en el plan Basic o superior.', smartGenerating:'🌍 Analizando...' },
  Vietnamese: { tone: 'Giọng điệu', country: 'Quốc gia người gửi', myLang: 'Ngôn ngữ của tôi', generate: '✦ Tạo phản hồi AI', generating: '✦ Đang tạo...', compare: '✨ So sánh phản hồi', smartReply: '👑 Phản hồi thông minh · Pro', summary: '📝 Tóm tắt email', summarizing: '📝 Đang tóm tắt...', tasks: '📌 Hành động được phát hiện', settings: '⚙️ Cài đặt', insert: '✉️ Chèn vào Outlook', copy: '📋 Sao chép', regen: '🔄', switchLang: 'Chuyển đổi:', upgrade: 'Nâng cấp gói →', limitMsg: 'Đã đạt giới hạn hàng tháng.', promises: '📋 Cam kết của bạn', signature: 'Chữ ký', sigSave: 'Lưu', template: 'Mẫu', save: 'Lưu', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Đóng', translateBtn: '🌐 Dịch sang ngôn ngữ của tôi', translateClose: '🌐 Đóng bản dịch', urgency: { high: '🔴 Khẩn cấp', medium: '🟡 Bình thường', low: '🟢 Thư thả' }, emotion: { angry: '😤 Khiếu nại', urgent: '⚡ Khẩn cấp', neutral: '😊 Bình thường', positive: '👍 Tích cực', learnedLabel: 'Đã học', tonePref: 'sở thích giọng', learnedUnit: 'lần học', styleShort: 'ngắn gọn', styleMid: 'vừa phải', styleLong: 'chi tiết' }, refine:'✨ Tinh chỉnh', refining:'✨ Đang tinh chỉnh...', refineDone:'✨ Tinh chỉnh xong!', refineFailed:'Tinh chỉnh thất bại. Vui lòng thử lại.', refineEmpty:'Tinh chỉnh thất bại: kết quả trống.', refineInput:'Vui lòng nhập nội dung cần tinh chỉnh.', refinePlanMsg:'Tinh chỉnh có sẵn trên gói Basic trở lên.', smartGenerating:'🌍 Đang phân tích...' },
  Thai:       { tone: 'น้ำเสียงการตอบ', country: 'ประเทศของผู้ส่ง', myLang: 'ภาษาของฉัน', generate: '✦ สร้างการตอบกลับ AI', generating: '✦ กำลังสร้าง...', compare: '✨ เปรียบเทียบ', smartReply: '👑 ตอบกลับอัจฉริยะ · Pro', summary: '📝 สรุปอีเมล', summarizing: '📝 กำลังสรุป...', tasks: '📌 การดำเนินการที่ตรวจพบ', settings: '⚙️ การตั้งค่า', insert: '✉️ แทรกใน Outlook', copy: '📋 คัดลอก', regen: '🔄', switchLang: 'เปลี่ยนภาษา:', upgrade: 'อัปเกรด →', limitMsg: 'ถึงขีดจำกัดรายเดือนแล้ว', promises: '📋 ข้อผูกพันของคุณ', signature: 'ลายเซ็น', sigSave: 'บันทึก', template: 'เทมเพลต', save: 'บันทึก', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ ปิด', translateBtn: '🌐 แปลเป็นภาษาของฉัน', translateClose: '🌐 ปิดการแปล', urgency: { high: '🔴 เร่งด่วน', medium: '🟡 ปกติ', low: '🟢 ผ่อนคลาย' }, emotion: { angry: '😤 ร้องเรียน', urgent: '⚡ เร่งด่วน', neutral: '😊 ปกติ', positive: '👍 เชิงบวก', learnedLabel: 'เรียนรู้แล้ว', tonePref: 'ความชอบโทน', learnedUnit: 'ครั้ง', styleShort: 'กระชับ', styleMid: 'ปานกลาง', styleLong: 'ละเอียด' }, refine:'✨ ปรับแต่ง', refining:'✨ กำลังปรับแต่ง...', refineDone:'✨ ปรับแต่งเสร็จแล้ว!', refineFailed:'การปรับแต่งล้มเหลว กรุณาลองอีกครั้ง', refineEmpty:'การปรับแต่งล้มเหลว: ผลลัพธ์ว่างเปล่า', refineInput:'กรุณาป้อนข้อความที่ต้องการปรับแต่ง', refinePlanMsg:'การปรับแต่งใช้ได้กับแผน Basic ขึ้นไป', smartGenerating:'🌍 กำลังวิเคราะห์...' },
  Indonesian: { tone: 'Nada balasan', country: 'Negara pengirim', myLang: 'Bahasa saya', generate: '✦ Buat balasan AI', generating: '✦ Membuat...', compare: '✨ Bandingkan balasan', smartReply: '👑 Balasan cerdas · Pro', summary: '📝 Ringkasan email', summarizing: '📝 Meringkas...', tasks: '📌 Tindakan terdeteksi', settings: '⚙️ Pengaturan', insert: '✉️ Sisipkan ke Outlook', copy: '📋 Salin', regen: '🔄', switchLang: 'Ganti bahasa:', upgrade: 'Upgrade paket →', limitMsg: 'Batas bulanan tercapai.', promises: '📋 Komitmen Anda', signature: 'Tanda tangan', sigSave: 'Simpan', template: 'Template', save: 'Simpan', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Tutup', translateBtn: '🌐 Terjemahkan ke bahasa saya', translateClose: '🌐 Tutup terjemahan', urgency: { high: '🔴 Mendesak', medium: '🟡 Normal', low: '🟢 Santai' }, emotion: { angry: '😤 Keluhan', urgent: '⚡ Mendesak', neutral: '😊 Normal', positive: '👍 Positif', learnedLabel: 'Dipelajari', tonePref: 'pref. nada', learnedUnit: 'kali', styleShort: 'ringkas', styleMid: 'sedang', styleLong: 'rinci' }, refine:'✨ Perhalus', refining:'✨ Memperhalus...', refineDone:'✨ Diperhalus!', refineFailed:'Gagal memperhalus. Silakan coba lagi.', refineEmpty:'Gagal memperhalus: hasil kosong.', refineInput:'Silakan masukkan teks yang ingin diperhalus.', refinePlanMsg:'Perhalus tersedia di paket Basic atau lebih tinggi.', smartGenerating:'🌍 Menganalisis...' },
  Italian:    { tone: 'Tono di risposta', country: 'Paese del mittente', myLang: 'La mia lingua', generate: '✦ Genera risposta AI', generating: '✦ Generazione...', compare: '✨ Confronta risposte', smartReply: '👑 Risposta intelligente · Pro', summary: '📝 Riepilogo email', summarizing: '📝 Riepilogando...', tasks: '📌 Azioni rilevate', settings: '⚙️ Impostazioni', insert: '✉️ Inserisci in Outlook', copy: '📋 Copia', regen: '🔄', switchLang: 'Cambia lingua:', upgrade: 'Aggiorna piano →', limitMsg: 'Limite mensile raggiunto.', promises: '📋 I tuoi impegni', signature: 'La mia firma', sigSave: 'Salva', template: 'Modelli', save: 'Salva', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Chiudi', translateBtn: '🌐 Traduci nella mia lingua', translateClose: '🌐 Chiudi traduzione', urgency: { high: '🔴 Urgente', medium: '🟡 Normale', low: '🟢 Tranquillo' }, emotion: { angry: '😤 Reclamo', urgent: '⚡ Urgente', neutral: '😊 Normale', positive: '👍 Positivo', learnedLabel: 'Appreso', tonePref: 'pref. di tono', learnedUnit: 'usi', styleShort: 'conciso', styleMid: 'moderato', styleLong: 'dettagliato' }, refine:'✨ Raffina', refining:'✨ Raffinando...', refineDone:'✨ Raffinato!', refineFailed:'Raffinamento fallito. Si prega di riprovare.', refineEmpty:'Raffinamento fallito: risultato vuoto.', refineInput:'Inserisci il testo da raffinare.', refinePlanMsg:'Il raffinamento è disponibile nel piano Basic o superiore.', smartGenerating:'🌍 Analizzando...' },
  Turkish:    { tone: 'Yanıt tonu', country: 'Gönderenin ülkesi', myLang: 'Dilim', generate: '✦ AI yanıtı oluştur', generating: '✦ Oluşturuluyor...', compare: '✨ Yanıtları karşılaştır', smartReply: '👑 Akıllı yanıt · Pro', summary: '📝 E-posta özeti', summarizing: '📝 Özetleniyor...', tasks: '📌 Tespit edilen eylemler', settings: '⚙️ Ayarlar', insert: '✉️ Outlook\'a ekle', copy: '📋 Kopyala', regen: '🔄', switchLang: 'Dil değiştir:', upgrade: 'Planı yükselt →', limitMsg: 'Aylık limite ulaşıldı.', promises: '📋 Taahhütleriniz', signature: 'İmzam', sigSave: 'Kaydet', template: 'Şablonlar', save: 'Kaydet', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Kapat', translateBtn: '🌐 Dilime çevir', translateClose: '🌐 Çeviriyi kapat', urgency: { high: '🔴 Acil', medium: '🟡 Normal', low: '🟢 Rahat' }, emotion: { angry: '😤 Şikayet', urgent: '⚡ Acil', neutral: '😊 Normal', positive: '👍 Olumlu', learnedLabel: 'Öğrenildi', tonePref: 'ton tercihi', learnedUnit: 'öğrenme', styleShort: 'özlü', styleMid: 'orta', styleLong: 'ayrıntılı' }, refine:'✨ İyileştir', refining:'✨ İyileştiriliyor...', refineDone:'✨ İyileştirildi!', refineFailed:'İyileştirme başarısız. Lütfen tekrar deneyin.', refineEmpty:'İyileştirme başarısız: sonuç boş.', refineInput:'Lütfen iyileştirilecek metni girin.', refinePlanMsg:'İyileştirme Basic veya üzeri planda mevcuttur.', smartGenerating:'🌍 Analiz ediliyor...' },
  Dutch:      { tone: 'Antwoordtoon', country: 'Afzenderland', myLang: 'Mijn taal', generate: '✦ AI-antwoord genereren', generating: '✦ Genereren...', compare: '✨ Antwoorden vergelijken', smartReply: '👑 Slim antwoord · Pro', summary: '📝 E-mailsamenvatting', summarizing: '📝 Samenvatten...', tasks: '📌 Gedetecteerde acties', settings: '⚙️ Instellingen', insert: '✉️ Invoegen in Outlook', copy: '📋 Kopiëren', regen: '🔄', switchLang: 'Taal wijzigen:', upgrade: 'Plan upgraden →', limitMsg: 'Maandlimiet bereikt.', promises: '📋 Uw toezeggingen', signature: 'Mijn handtekening', sigSave: 'Opslaan', template: 'Sjablonen', save: 'Opslaan', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Sluiten', translateBtn: '🌐 Vertaal naar mijn taal', translateClose: '🌐 Vertaling sluiten', urgency: { high: '🔴 Urgent', medium: '🟡 Normaal', low: '🟢 Rustig' }, emotion: { angry: '😤 Klacht', urgent: '⚡ Urgent', neutral: '😊 Normaal', positive: '👍 Positief', learnedLabel: 'Geleerd', tonePref: 'toonvoorkeur', learnedUnit: 'gebruik', styleShort: 'beknopt', styleMid: 'matig', styleLong: 'gedetailleerd' }, refine:'✨ Verfijnen', refining:'✨ Verfijnen...', refineDone:'✨ Verfijnd!', refineFailed:'Verfijnen mislukt. Probeer opnieuw.', refineEmpty:'Verfijnen mislukt: leeg resultaat.', refineInput:'Voer de te verfijnen tekst in.', refinePlanMsg:'Verfijnen is beschikbaar op het Basic-plan of hoger.', smartGenerating:'🌍 Analyseren...' },
  Polish:     { tone: 'Ton odpowiedzi', country: 'Kraj nadawcy', myLang: 'Mój język', generate: '✦ Generuj odpowiedź AI', generating: '✦ Generowanie...', compare: '✨ Porównaj odpowiedzi', smartReply: '👑 Inteligentna odpowiedź · Pro', summary: '📝 Podsumowanie e-maila', summarizing: '📝 Podsumowywanie...', tasks: '📌 Wykryte działania', settings: '⚙️ Ustawienia', insert: '✉️ Wstaw do Outlook', copy: '📋 Kopiuj', regen: '🔄', switchLang: 'Zmień język:', upgrade: 'Ulepsz plan →', limitMsg: 'Osiągnięto limit miesięczny.', promises: '📋 Twoje zobowiązania', signature: 'Mój podpis', sigSave: 'Zapisz', template: 'Szablony', save: 'Zapisz', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ Zamknij', translateBtn: '🌐 Przetłumacz na mój język', translateClose: '🌐 Zamknij tłumaczenie', urgency: { high: '🔴 Pilny', medium: '🟡 Normalny', low: '🟢 Spokojny' }, emotion: { angry: '😤 Skarga', urgent: '⚡ Pilny', neutral: '😊 Normalny', positive: '👍 Pozytywny', learnedLabel: 'Nauczone', tonePref: 'pref. tonu', learnedUnit: 'użyć', styleShort: 'zwięzły', styleMid: 'umiarkowany', styleLong: 'szczegółowy' }, refine:'✨ Dopracuj', refining:'✨ Dopracowywanie...', refineDone:'✨ Dopracowano!', refineFailed:'Dopracowanie nieudane. Spróbuj ponownie.', refineEmpty:'Dopracowanie nieudane: pusty wynik.', refineInput:'Proszę wprowadzić tekst do dopracowania.', refinePlanMsg:'Dopracowanie jest dostępne w planie Basic lub wyższym.', smartGenerating:'🌍 Analizowanie...' },
  Hindi:      { tone: 'उत्तर स्वर', country: 'प्रेषक देश', myLang: 'मेरी भाषा', generate: '✦ AI उत्तर बनाएं', generating: '✦ बना रहे हैं...', compare: '✨ उत्तर तुलना करें', smartReply: '👑 स्मार्ट उत्तर · Pro', summary: '📝 ईमेल सारांश', summarizing: '📝 सारांश बना रहे हैं...', tasks: '📌 पहचाने गए कार्य', settings: '⚙️ सेटिंग्स', insert: '✉️ Outlook में डालें', copy: '📋 कॉपी करें', regen: '🔄', switchLang: 'भाषा बदलें:', upgrade: 'प्लान अपग्रेड करें →', limitMsg: 'मासिक सीमा पहुंच गई।', promises: '📋 आपकी प्रतिबद्धताएं', signature: 'मेरा हस्ताक्षर', sigSave: 'सहेजें', template: 'टेम्पलेट', save: 'सहेजें', shortcut: '⌨️ Alt+G · Alt+C · Alt+I', settingsClose: '⚙️ बंद करें', translateBtn: '🌐 मेरी भाषा में अनुवाद करें', translateClose: '🌐 अनुवाद बंद करें', urgency: { high: '🔴 तत्काल', medium: '🟡 सामान्य', low: '🟢 शांत' }, emotion: { angry: '😤 शिकायत', urgent: '⚡ तत्काल', neutral: '😊 सामान्य', positive: '👍 सकारात्मक', learnedLabel: 'सीखा', tonePref: 'स्वर प्राथमिकता', learnedUnit: 'उपयोग', styleShort: 'संक्षिप्त', styleMid: 'मध्यम', styleLong: 'विस्तृत' }, refine:'✨ परिष्कृत करें', refining:'✨ परिष्कृत हो रहा है...', refineDone:'✨ परिष्कृत हो गया!', refineFailed:'परिष्करण विफल। कृपया फिर से प्रयास करें।', refineEmpty:'परिष्करण विफल: परिणाम खाली है।', refineInput:'कृपया परिष्कृत करने के लिए पाठ दर्ज करें।', refinePlanMsg:'परिष्करण Basic या उससे ऊपर के प्लान में उपलब्ध है।', smartGenerating:'🌍 विश्लेषण हो रहा है...' },
};

const TONE_KEYS_OL = ['professional','friendly','concise','detailed','decline','thankful','apologetic','acknowledge'];
const TONES_I18N_OL = {
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
  Dutch:      ['Professioneel','Vriendelijk','Beknopt','Gedetailleerd','Afwijzen','Dankbaar','Verontschuldigend','Bevestigen'],
  Polish:     ['Profesjonalny','Przyjazny','Zwięzły','Szczegółowy','Odmowa','Wdzięczny','Przepraszający','Potwierdzający'],
  Hindi:      ['पेशेवर','मैत्रीपूर्ण','संक्षिप्त','विस्तृत','अस्वीकार','आभारी','क्षमाप्रार्थी','पुष्टि करें'],
};

const LANGUAGES_OL = [
  { value: 'Korean', label: '🇰🇷 한국어' }, { value: 'English', label: '🇺🇸 English' },
  { value: 'Japanese', label: '🇯🇵 日本語' }, { value: 'Chinese', label: '🇨🇳 中文' },
  { value: 'Spanish', label: '🇪🇸 Español' }, { value: 'French', label: '🇫🇷 Français' },
  { value: 'German', label: '🇩🇪 Deutsch' }, { value: 'Portuguese', label: '🇧🇷 Português' },
  { value: 'Arabic', label: '🇸🇦 العربية' }, { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
  { value: 'Thai', label: '🇹🇭 ภาษาไทย' }, { value: 'Indonesian', label: '🇮🇩 Bahasa Indonesia' },
  { value: 'Italian', label: '🇮🇹 Italiano' }, { value: 'Turkish', label: '🇹🇷 Türkçe' },
  { value: 'Dutch', label: '🇳🇱 Nederlands' }, { value: 'Polish', label: '🇵🇱 Polski' },
  { value: 'Hindi', label: '🇮🇳 हिंदी' },
];

const COUNTRIES_OL = [
  { value: 'auto', label: '🌐 Auto Detect' }, { value: 'Japan', label: '🇯🇵 Japan (Keigo)' },
  { value: 'Korea', label: '🇰🇷 Korea' }, { value: 'USA', label: '🇺🇸 USA' },
  { value: 'Germany', label: '🇩🇪 Germany' }, { value: 'Brazil', label: '🇧🇷 Brazil' },
  { value: 'Arabia', label: '🇸🇦 Arab World' }, { value: 'China', label: '🇨🇳 China' },
  { value: 'France', label: '🇫🇷 France' },
];

const AUTODETECT_LABELS_OL = {
  Korean:'🌐 자동 감지', English:'🌐 Auto Detect', Japanese:'🌐 自動検出',
  Chinese:'🌐 自动检测', Spanish:'🌐 Detección automática', French:'🌐 Détection auto',
  German:'🌐 Automatisch erkennen', Portuguese:'🌐 Detecção automática',
  Arabic:'🌐 كشف تلقائي', Italian:'🌐 Rilevamento auto', Turkish:'🌐 Otomatik algıla',
  Vietnamese:'🌐 Tự động phát hiện', Thai:'🌐 ตรวจจับอัตโนมัติ', Indonesian:'🌐 Deteksi otomatis',
  Dutch:'🌐 Automatisch detecteren', Polish:'🌐 Automatyczne wykrywanie', Hindi:'🌐 स्वचालित पहचान'
};

const PLANS_OL = { free: { monthly: 35, label: 'Starter' }, basic: { monthly: 200, label: 'Basic' }, pro: { monthly: 300, label: 'Pro' } };

const LANG_FLAGS = { Korean:'🇰🇷', English:'🇺🇸', Japanese:'🇯🇵', Chinese:'🇨🇳', Spanish:'🇪🇸', German:'🇩🇪', Portuguese:'🇧🇷', Arabic:'🇸🇦', Italian:'🇮🇹', Turkish:'🇹🇷', Vietnamese:'🇻🇳', Thai:'🇹🇭', Indonesian:'🇮🇩', Dutch:'🇳🇱', Polish:'🇵🇱', Hindi:'🇮🇳' };

function detectBrowserLang() {
  const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase().split('-')[0];
  const m = {'ko':'Korean','ja':'Japanese','zh':'Chinese','de':'German','fr':'French','pt':'Portuguese','ar':'Arabic','es':'Spanish','vi':'Vietnamese','th':'Thai','id':'Indonesian','it':'Italian','tr':'Turkish','nl':'Dutch','pl':'Polish','hi':'Hindi'};
  return m[nav] || 'English';
}
function getUILangOL(myLang) {
  const r = myLang === 'auto' ? detectBrowserLang() : myLang;
  return UI_STRINGS_OL[r] || UI_STRINGS_OL['English'];
}

function getToneOptionsOL(lang) {
  const labels = TONES_I18N_OL[lang] || TONES_I18N_OL['English'];
  return TONE_KEYS_OL.map((key,i) => `<option value="${key}">${labels[i]}</option>`).join('');
}

// ===== 전역 상태 =====
let olSelectedTone = 'professional';
let olSelectedCountry = 'auto';
let olSelectedMyLang = 'Korean';

// 이메일 내용으로 발신자 국가 자동감지
function autoDetectCountryOL(emailContent) {
  if (!emailContent) return null;
  const text = emailContent.toLowerCase();
  const emailMatch = emailContent.match(/from:.*?@([\w.-]+)/i) || emailContent.match(/<([\w._%+-]+@[\w.-]+\.[a-z]{2,})>/i);
  const domain = emailMatch ? emailMatch[1].toLowerCase() : '';

  if (domain.endsWith('.jp') || domain.includes('rakuten') || domain.includes('softbank')) return 'Japan';
  if (domain.endsWith('.cn') || domain.endsWith('.com.cn') || domain.includes('alibaba')) return 'China';
  if (domain.endsWith('.de') || domain.endsWith('.at') || domain.endsWith('.ch')) return 'Germany';
  if (domain.endsWith('.fr')) return 'France';
  if (domain.endsWith('.br') || domain.endsWith('.com.br')) return 'Brazil';
  if (domain.endsWith('.sa') || domain.endsWith('.ae') || domain.endsWith('.qa')) return 'Arabia';
  if (domain.endsWith('.kr') || domain.endsWith('.co.kr')) return 'Korea';
  if (domain.endsWith('.us') || domain.endsWith('.gov') || domain.endsWith('.edu')) return 'USA';

  const jaCount = (text.match(/[぀-ヿ]/g) || []).length;
  const zhCount = (text.match(/[一-鿿]/g) || []).length;
  const koCount = (text.match(/[가-힯]/g) || []).length;
  const arCount = (text.match(/[؀-ۿ]/g) || []).length;
  const deWords = (text.match(/\b(sehr geehrte|mit freundlichen|herzlichen|bitte|danke|vielen)\b/g) || []).length;
  const frWords = (text.match(/\b(bonjour|merci|cordialement|madame|monsieur|veuillez)\b/g) || []).length;
  const ptWords = (text.match(/\b(olá|obrigado|prezado|atenciosamente|por favor)\b/g) || []).length;
  const enWords = (text.match(/\b(dear|regards|sincerely|hello|please|thank you|best)\b/g) || []).length;

  if (jaCount > 5) return 'Japan';
  if (zhCount > 5 && jaCount < 3) return 'China';
  if (koCount > 5) return 'Korea';
  if (arCount > 5) return 'Arabia';
  if (deWords >= 2) return 'Germany';
  if (frWords >= 2) return 'France';
  if (ptWords >= 2) return 'Brazil';
  if (enWords >= 2) return 'USA';

  // ASCII 비율 85% 이상이면 영어권으로 판단
  const cleanText = emailContent.replace(/\s+/g, '');
  const asciiRatio = (cleanText.match(/[\x20-\x7E]/g) || []).length / (cleanText.length || 1);
  if (asciiRatio > 0.85) return 'USA';

  return null;
}
let olCurrentPanel = null;
let olCachedEmotion = 'neutral';
let olCachedUrgency = 'low';
let olComposeOutputLang = null; // 작성 출력 언어 — 내 언어(myLanguage)와 별개, 저장 안 함
let olTransLang = null; // 번역 대상 언어 — 작성 출력 언어와 독립

// ===== Outlook DOM 이메일 본문 추출 =====
function getOutlookEmailThread() {
  const main = document.querySelector('[role="main"]');
  if (main) { const t = main.innerText?.trim(); if (t && t.length > 20) return t.slice(0, 6000); }
  const sels = ['[aria-label="Message body"]','.ReadingPaneContent .allowTextSelection','.x_WordSection1','.rps_0f57','.ReadMsgBody','[role="document"]'];
  for (const sel of sels) {
    const els = document.querySelectorAll(sel);
    if (els.length > 0) {
      let thread = '';
      els.forEach((el,i) => { const t = el.innerText?.trim(); if (t && t.length > 20) thread += `[Message ${i+1}]\n${t}\n\n`; });
      if (thread.length > 50) return thread.slice(0, 6000);
    }
  }
  return null;
}

// ===== Outlook 답장 삽입 =====
function insertReplyOutlook(text) {
  function _findEditor() {
    return document.querySelector('[aria-label="Message body, "]') ||
           document.querySelector('[contenteditable="true"][aria-multiline="true"]') ||
           document.querySelector('[data-testid="compose-editor"] [contenteditable]') ||
           document.querySelector('[aria-label*="Message body"]') ||
           document.querySelector('[role="textbox"][contenteditable="true"]');
  }
  function _doInsert() {
    const editor = _findEditor();
    if (!editor) return false;
    editor.focus();
    const ownerDoc = editor.ownerDocument || document;
    try {
      const range = ownerDoc.createRange();
      range.setStart(editor, 0);
      range.collapse(true);
      const sel = ownerDoc.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    } catch(e) {}
    ownerDoc.execCommand('insertText', false, text + '\n\n');
    showToastOL('삽입됐어요!', 'success');
    return true;
  }
  if (_doInsert()) return;
  const replyBtn = document.querySelector('[aria-label="Reply"]') ||
                   document.querySelector('button[title="Reply"]') ||
                   document.querySelector('[data-icon-name="Reply"]')?.closest('button');
  if (replyBtn) replyBtn.click();
  let attempts = 0;
  const delays = [400, 800, 1500];
  function tryInsert() {
    if (_doInsert()) return;
    if (attempts < delays.length) {
      setTimeout(tryInsert, delays[attempts++]);
    } else {
      navigator.clipboard.writeText(text).then(() => showToastOL('답장창을 열어주세요. 텍스트는 복사됐어요!', 'info'));
    }
  }
  setTimeout(tryInsert, delays[attempts++]);
}

// ===== 유저 데이터 =====
async function getUserDataOL() {
  const data = await new Promise(r => chrome.storage.sync.get(['userId','userEmail','userPlan','monthlyCount','monthlyMonth','monthlyLimit','myLanguage','translateCount','translateLimit','businessCard'], r));
  const thisMonth = new Date().toISOString().slice(0,7);
  let monthlyCount = data.monthlyMonth === thisMonth ? (data.monthlyCount || 0) : 0;
  if (data.monthlyMonth !== thisMonth) { chrome.storage.sync.set({ monthlyMonth: thisMonth, monthlyCount: 0 }); monthlyCount = 0; }
  let userId = data.userId;
  if (!userId) { userId = 'u_' + Math.random().toString(36).substr(2,9); chrome.storage.sync.set({ userId }); }
  const plan = data.userPlan || 'free';
  const monthlyLimit = data.monthlyLimit || PLANS_OL[plan]?.monthly || 35;
  let phrases = [];
  if (data.userEmail) {
    try {
      const pr = await fetch(`${WORKER_URL_OL}/phrases?email=${encodeURIComponent(data.userEmail)}`);
      if (pr.ok) { const pd = await pr.json(); if (pd.success) phrases = (pd.phrases || []).map(p => p.text || p).filter(Boolean); }
    } catch (_) {}
  }
  return { userId, userEmail: data.userEmail||null, plan, monthlyCount, monthlyLimit, thisMonth, myLanguage: data.myLanguage||'Korean', translateCount: data.translateCount||0, translateLimit: data.translateLimit !== undefined ? data.translateLimit : 50, businessCard: data.businessCard || '', phrases };
}

async function syncUsageOL(userEmail) {
  if (!userEmail) return;
  try {
    const res = await fetch(`${WORKER_URL_OL}/status`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: userEmail }) });
    const data = await res.json();
    if (data.plan) {
      const thisMonth = new Date().toISOString().slice(0,7);
      await chrome.storage.sync.set({ userPlan: data.plan, monthlyLimit: PLANS_OL[data.plan]?.monthly || 35, monthlyCount: data.monthlyUsed || 0, monthlyMonth: thisMonth, translateCount: data.translateUsed || 0, translateLimit: data.translateLimit });
    }
  } catch(e) {}
}

async function incrementUsageOL(serverCount) {
  const data = await getUserDataOL();
  const newCount = (typeof serverCount === 'number') ? serverCount : data.monthlyCount + 1;
  chrome.storage.sync.set({ monthlyCount: newCount, monthlyMonth: data.thisMonth });
}


// Strip Korean/English recipient salutation from reply text
function _stripSalutationOL(text) {
  if (!text) return text;
  let t = text.trim();
  t = t.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]?\s*[\r\n]+/, '').trim();
  t = t.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]\s*/, '').trim();
  t = t.replace(/^(?:Dear\s+(?:Sir\/Madam|Sir|Madam|Mr\.\s*\w+|Ms\.\s*\w+|Mrs\.\s*\w+|Dr\.\s*\w+|[\w\s]{1,30})|To\s+Whom\s+It\s+May\s+Concern|Hi\s+[\w\s]{1,20}|Hello\s+[\w\s]{1,20})\s*[,，]?\s*[\r\n]+/i, '').trim();
  t = t.replace(/^.{1,20}(?:様|さん)\s*[\r\n]+/, '').trim();
  t = t.replace(/^(?:尊敬的.{1,10}|.{1,10}您好)[，,]?\s*[\r\n]+/, '').trim();
  return t;
}

function appendSignatureOL(text) {
  return new Promise(r => chrome.storage.sync.get(['signature'], d => r(d.signature ? text + '\n\n' + d.signature : text)));
}

// ===== 토스트 =====
function showToastOL(msg, type='info') {
  document.querySelector('#mm-ol-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'mm-ol-toast';
  const colors = { info:'#1a73e8', success:'#34a853', error:'#ea4335', warning:'#fbbc04' };
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999999;padding:10px 18px;border-radius:8px;background:${colors[type]||colors.info};color:#fff;font-size:13px;font-family:Google Sans,Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.2);pointer-events:none;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===== 배지 업데이트 =====
async function updateBadgeOL() {
  if (!olCurrentPanel) return;
  const data = await getUserDataOL();
  const left = Math.max(0, data.monthlyLimit - data.monthlyCount);
  const pct = Math.min(100, Math.round((data.monthlyCount / data.monthlyLimit) * 100));
  const planLabel = PLANS_OL[data.plan]?.label || 'Starter';
  const badge = olCurrentPanel.querySelector('#mm-ol-badge');
  const progress = olCurrentPanel.querySelector('#mm-ol-progress');
  if (badge) { badge.textContent = `${planLabel} · ${left}/${data.monthlyLimit} replies`; badge.style.color = pct>=90?'#c5221f':pct>=70?'#e37400':'#5f6368'; }
  if (progress) { progress.style.width = pct+'%'; progress.style.background = pct>=90?'#c5221f':pct>=70?'#f9a825':'#e91e8c'; }
}

// ===== 약속 추출 =====
function extractPromisesOL(text, lang) {
  const promises = [];
  const PROMISE_PATTERNS = {
    Korean:     [/확인하겠습니다/gi, /보내드리겠습니다/gi, /연락드리겠습니다/gi, /검토하겠습니다/gi, /준비하겠습니다/gi],
    English:    [/i will (.{5,50})/gi, /we will (.{5,50})/gi, /i'll (.{5,50})/gi, /we'll (.{5,50})/gi, /will send (.{5,50})/gi, /will prepare (.{5,50})/gi],
    Japanese:   [/お送りします/gi, /ご連絡します/gi, /確認いたします/gi, /準備いたします/gi],
    Chinese:    [/发送给您/gi, /确认一下/gi, /我会发送/gi, /我将准备/gi],
    German:     [/werde senden/gi, /werde bestätigen/gi, /ich werde (.{5,50})/gi],
    French:     [/enverrai/gi, /confirmerai/gi, /je vais (.{5,50})/gi],
    Portuguese: [/enviarei/gi, /confirmarei/gi, /vou (.{5,50})/gi],
    Spanish:    [/enviaré/gi, /confirmaré/gi, /voy a (.{5,50})/gi],
    Turkish:    [/göndereceğim/gi, /hazırlayacağım/gi, /onaylayacağım/gi],
    Italian:    [/invierò/gi, /confermerò/gi, /preparerò/gi],
    Arabic:     [/سأرسل/gi, /سأؤكد/gi, /سأحضّر/gi],
    Vietnamese: [/tôi sẽ gửi/gi, /tôi sẽ xác nhận/gi],
    Thai:       [/จะส่ง/gi, /จะยืนยัน/gi],
    Indonesian: [/akan mengirim/gi, /akan mengkonfirmasi/gi, /saya akan (.{5,50})/gi],
  };
  const patterns = PROMISE_PATTERNS[lang] || PROMISE_PATTERNS['English'];
  patterns.forEach(p => { const m = text.match(p); if (m) promises.push(...m.slice(0,2)); });
  return [...new Set(promises)].slice(0,3);
}

// ===== 감정 감지 =====
function detectEmotionOL(text) {
  const t = text.toLowerCase();
  const urgentWords = ['urgent','asap','immediately','deadline','critical','emergency','긴급','즉시','마감','급합니다','至急','紧急','عاجل'];
  const angryWords = ['disappointed','unacceptable','frustrated','complaint','실망','불만','항의','失望','خيبة أمل'];
  const positiveWords = ['thank','great','appreciate','happy','pleased','감사','좋습니다','ありがとう','谢谢','شكرا'];
  let urgency = 'low', emotion = 'neutral';
  if (urgentWords.some(w => t.includes(w))) urgency = 'high';
  else if (t.includes('please') || t.includes('could you')) urgency = 'medium';
  if (angryWords.some(w => t.includes(w))) emotion = 'angry';
  else if (urgentWords.some(w => t.includes(w))) emotion = 'urgent';
  else if (positiveWords.some(w => t.includes(w))) emotion = 'positive';
  return { urgency, emotion };
}

// ===== 스타일 학습 =====
function learnStyleOL(tone, emailContent, reply) {
  chrome.storage.local.get(['styleHistory'], data => {
    const history = data.styleHistory || [];
    history.push({ tone, emailLen: emailContent.length, replyLen: reply.length, time: Date.now() });
    if (history.length > 20) history.shift();
    chrome.storage.local.set({ styleHistory: history });
    if (history.length >= 3) {
      const toneCounts = {};
      history.forEach(h => { toneCounts[h.tone] = (toneCounts[h.tone]||0)+1; });
      const favTone = Object.keys(toneCounts).sort((a,b) => toneCounts[b]-toneCounts[a])[0];
      const avgLen = Math.round(history.reduce((s,h) => s+h.replyLen,0)/history.length);
      const uiOL = getUILangOL(olSelectedMyLang);
      const styleOL = avgLen<200?(uiOL.styleShort||'간결하게'):avgLen<500?(uiOL.styleMid||'보통 길이'):(uiOL.styleLong||'상세하게');
      chrome.storage.local.set({ learnedStyle: { favTone, style: styleOL, count: history.length } });
      if (history.length === 3) showToastOL(`✨ ${uiOL.learnedLabel||'학습됨'}: ${favTone} ${uiOL.tonePref||'톤 선호'}`, 'success');
    }
  });
}

// ===== 패널 제거 =====
function removeOLPanel() {
  document.querySelector('#mm-ol-panel')?.remove();
  olCurrentPanel = null;
}

// ===== 패널 생성 =====
async function createOutlookPanel() {
  removeOLPanel();
  const userData = await getUserDataOL();
  olSelectedMyLang = userData.myLanguage || 'Korean';
  const ui = getUILangOL(olSelectedMyLang);
  const toneOptions = getToneOptionsOL(olSelectedMyLang);
  const langOptions = LANGUAGES_OL.map(l => `<option value="${l.value}"${l.value===olSelectedMyLang?' selected':''}>${l.label}</option>`).join('');
  const countryOptions = COUNTRIES_OL.map(c => `<option value="${c.value}">${c.label}</option>`).join('');

  const panel = document.createElement('div');
  panel.id = 'mm-ol-panel';
  panel.style.cssText = 'font-family:Google Sans,Arial,sans-serif;background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,.08);width:360px;position:fixed;right:16px;top:70px;bottom:16px;z-index:999998;overflow-y:auto;';
  panel.style.direction = olSelectedMyLang === 'Arabic' ? 'rtl' : 'ltr';
  olCurrentPanel = panel;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:14px;font-weight:700;color:#e91e8c;letter-spacing:-0.3px">✦ MailMind</span>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="text-align:right">
          <div id="mm-ol-badge" style="font-size:11px;color:#5f6368;margin-bottom:3px">...</div>
          <div style="width:120px;height:4px;background:#f1f3f4;border-radius:2px;overflow:hidden">
            <div id="mm-ol-progress" style="height:100%;background:#e91e8c;border-radius:2px;width:0%;transition:width 0.3s"></div>
          </div>
        </div>
        <button id="mm-ol-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:#5f6368;padding:0;line-height:1">×</button>
      </div>
    </div>

    <div id="mm-ol-emotion-bar" style="display:none;margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap">
      <span id="mm-ol-emotion-badge" style="font-size:11px;padding:3px 10px;border-radius:100px;background:#fff3e0;color:#e65100;font-weight:600"></span>
      <span id="mm-ol-urgency-badge" style="font-size:11px;padding:3px 10px;border-radius:100px;background:#fce4ec;color:#c62828;font-weight:600"></span>
    </div>

    <div id="mm-ol-spam" style="display:none;background:#fce8e6;border:1.5px solid #d93025;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#c5221f;line-height:1.6;white-space:pre-line"></div>

    <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
      <div style="flex:1;min-width:90px">
        <label id="mm-ol-label-tone" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">${ui.tone}</label>
        <select id="mm-ol-tone" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">${toneOptions}</select>
      </div>
      <div style="flex:1;min-width:90px">
        <label id="mm-ol-label-country" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">${ui.country}</label>
        <select id="mm-ol-country" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">${countryOptions}</select>
      </div>
      <div id="mm-ol-mylang-wrap" style="flex:1;min-width:90px">
        <label id="mm-ol-label-mylang" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">${ui.myLang}</label>
        <select id="mm-ol-lang" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">${langOptions}</select>
      </div>
    </div>

    <div id="mm-ol-detect-info" style="display:none;margin-bottom:8px;padding:8px 10px;background:#f0f7ff;border-radius:8px;font-size:11px;color:#1a73e8;line-height:1.6"></div>

    <button id="mm-ol-gen" style="width:100%;padding:10px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px">${ui.generate}</button>

    <div id="mm-ol-pro-btns" style="display:flex;gap:8px;margin-bottom:8px"></div>

    <!-- 이메일 번역 버튼 -->
    <button id="mm-ol-email-translate" style="width:100%;padding:7px;background:#fff;color:#1a73e8;border:1px solid #1a73e8;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;margin-bottom:8px">🌐 내 언어로 번역</button>
    <div id="mm-ol-email-translated" style="display:none;margin-bottom:8px;padding:10px;background:#e8f0fe;border-radius:8px;font-size:12px;color:#202124;line-height:1.6;white-space:pre-wrap"></div>

    <button id="mm-ol-summarize" style="width:100%;padding:7px;background:#fff;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;margin-bottom:8px">${ui.summary}</button>
    <div id="mm-ol-thread-summary" style="display:none;margin-bottom:8px;padding:10px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#202124;line-height:1.6"></div>

    <div id="mm-ol-summary" style="display:none;margin-bottom:8px;padding:10px;background:#e6f4ea;border-radius:8px;font-size:12px;color:#137333;line-height:1.6"></div>

    <div id="mm-ol-lang-btn" style="display:none;margin-bottom:8px">
      <button id="mm-ol-switch-lang" style="width:100%;padding:7px;background:#1a73e8;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer">🌐 Send in original language</button>
    </div>

    <div id="mm-ol-versions" style="display:none;margin-bottom:8px">
      <div id="mm-ol-ver-tabs" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"></div>
    </div>

    <div id="mm-ol-promises" style="display:none;margin-bottom:8px">
      <div id="mm-ol-promises-title" style="font-size:11px;font-weight:600;color:#1a73e8;margin-bottom:6px">${ui.promises}</div>
      <div id="mm-ol-promises-list" style="background:#e8f0fe;border-radius:8px;padding:8px 10px;font-size:11px;color:#1a73e8;line-height:1.8"></div>
    </div>

    <div id="mm-ol-tasks" style="display:none;margin-bottom:8px">
      <div id="mm-ol-tasks-title" style="font-size:11px;font-weight:600;color:#b8860b;margin-bottom:6px">${ui.tasks}</div>
      <div id="mm-ol-tasks-list" style="display:flex;flex-direction:column;gap:4px"></div>
    </div>

    <div id="mm-ol-result" style="display:none">
      <textarea id="mm-ol-output" rows="6" oninput="updateCharCountOL()" readonly style="width:100%;border:1px solid #dadce0;border-radius:8px;padding:10px;font-size:13px;line-height:1.6;color:#202124;background:#f8f9fa;font-family:inherit;box-sizing:border-box;resize:vertical"></textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:4px">
        <button id="mm-ol-edit-btn" style="display:none;padding:4px 10px;background:#fff;color:#e91e8c;border:1.5px solid #e91e8c;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer">✏️ 직접수정</button>
      </div>
      <div id="mm-ol-edit-bar" style="display:none;gap:6px;margin-top:4px;justify-content:flex-end">
        <button id="mm-ol-edit-done" style="padding:4px 10px;background:#fff;color:#34a853;border:1.5px solid #34a853;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer">✅ 완료</button>
        <button id="mm-ol-refine-btn" style="padding:4px 10px;background:#e91e8c;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer">✨ 다듬기</button>
      </div>

      <div id="mm-ol-lang-switch" style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap">
        <span id="mm-ol-switch-label" style="font-size:10px;color:#5f6368;align-self:center;margin-right:2px">${ui.switchLang}</span>
        ${['Korean','English','Japanese','Chinese','Spanish','French','German','Portuguese','Arabic','Italian','Turkish','Vietnamese','Thai','Indonesian'].map(l => `<button class="mm-ol-lang-btn" data-lang="${l}" style="padding:3px 8px;border:1px solid #dadce0;border-radius:12px;font-size:11px;cursor:pointer;background:#fff">${LANG_FLAGS[l]||l}</button>`).join('')}
      </div>

      <div style="display:flex;gap:6px;margin-top:8px">
        <span id="mm-ol-char-count" style="font-size:10px;color:#9aa0a6;align-self:center;flex:1"></span>
        <div id="mm-ol-guard" style="display:none;background:#fff8e1;border-radius:6px;padding:6px 10px;font-size:11px;color:#b8860b;line-height:1.5">
          <div id="mm-ol-guard-title" style="font-weight:600;margin-bottom:2px">🛡️ Smart Reply Guard</div>
          <div id="mm-ol-guard-text"></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button id="mm-ol-insert" style="flex:2;padding:9px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">${ui.insert}</button>
        <button id="mm-ol-copy" style="flex:1;padding:9px;background:#fff;color:#e91e8c;border:1.5px solid #e91e8c;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">${ui.copy}</button>
        <button id="mm-ol-attach" title="파일 첨부" style="padding:9px 12px;background:#f8f9fa;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:12px;cursor:pointer">📎</button>
        <button id="mm-ol-regen" style="padding:9px 12px;background:#f8f9fa;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:12px;cursor:pointer">${ui.regen}</button>
      </div>
    </div>

    <div id="mm-ol-upgrade" style="display:none;margin-top:10px;text-align:center;padding:12px;background:#fef7e0;border-radius:8px">
      <p id="mm-ol-limit-msg" style="font-size:12px;color:#5f6368;margin:0 0 8px">${ui.limitMsg}</p>
      <a href="https://mailmind.yongcha.app#pricing" target="_blank" style="font-size:13px;font-weight:500;color:#1a73e8;text-decoration:none;padding:6px 16px;border:1px solid #1a73e8;border-radius:6px">${ui.upgrade}</a>
    </div>

    <div id="mm-ol-settings" style="display:none;margin-top:10px;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0">
      <div id="mm-ol-settings-title" style="font-size:12px;font-weight:600;color:#202124;margin-bottom:8px">${ui.settings}</div>
      <div style="margin-bottom:10px">
        <label id="mm-ol-label-sig" style="font-size:11px;color:#5f6368">${ui.signature}</label>
        <textarea id="mm-ol-signature-input" rows="3" placeholder="Enter your signature" style="width:100%;margin-top:4px;padding:6px;border:1px solid #dadce0;border-radius:6px;font-size:11px;box-sizing:border-box;resize:vertical"></textarea>
        <button id="mm-ol-save-signature" style="margin-top:4px;padding:4px 10px;background:#e91e8c;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer">${ui.sigSave}</button>
      </div>
      <div style="margin-bottom:10px">
        <label id="mm-ol-label-template" style="font-size:11px;color:#5f6368">${ui.template}</label>
        <div id="mm-ol-templates-list" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px"></div>
      </div>
      <div style="font-size:10px;color:#9aa0a6;border-top:1px solid #e0e0e0;padding-top:6px">
        <span id="mm-ol-shortcut-hint">${ui.shortcut}</span>
      </div>
    </div>

    <button id="mm-ol-settings-toggle" style="width:100%;margin-top:8px;padding:6px;background:#f1f3f4;color:#202124;border:1px solid #bdc1c6;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer">${ui.settings}</button>
  `;

  document.body.appendChild(panel);

  // ===== initPanel =====
  async function initPanelOL() {
    updateBadgeOL();
    if (userData.userEmail) syncUsageOL(userData.userEmail).then(() => updateBadgeOL());

    // 감정 감지
    setTimeout(() => {
      const emailText = getOutlookEmailThread();
      if (emailText) {
        const { urgency, emotion } = detectEmotionOL(emailText);
        olCachedEmotion = emotion;
        olCachedUrgency = urgency;
        const ui2 = getUILangOL(olSelectedMyLang);
        const emotionBar = panel.querySelector('#mm-ol-emotion-bar');
        const emotionBadge = panel.querySelector('#mm-ol-emotion-badge');
        const urgencyBadge = panel.querySelector('#mm-ol-urgency-badge');
        if (emotionBar && (emotion !== 'neutral' || urgency !== 'low')) {
          emotionBar.style.display = 'flex';
          if (emotionBadge && emotion !== 'neutral') emotionBadge.textContent = ui2.emotion[emotion];
          if (urgencyBadge && urgency !== 'low') urgencyBadge.textContent = ui2.urgency[urgency];
        }
      }
    }, 800);

    // (Free도 언어 선택 가능 — 숨기지 않음)

    // 플랜별 버튼
    const container = panel.querySelector('#mm-ol-pro-btns');
    if (userData.plan === 'pro') {
      container.innerHTML = `
        <button id="mm-ol-triple" style="flex:1;padding:8px;background:#e8f5e9;color:#2e7d32;border:1px solid #4caf50;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"> </button>
        <button id="mm-ol-smart" style="flex:1;padding:8px;background:#fff8e1;color:#b8860b;border:1px solid #f9a825;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer"> </button>
      `;
      panel.querySelector('#mm-ol-triple').addEventListener('click', () => generateTripleOL());
      panel.querySelector('#mm-ol-smart').addEventListener('click', () => generateSmartOL());
    } else if (userData.plan === 'basic') {
      container.innerHTML = `
        <button id="mm-ol-triple" style="flex:1;padding:8px;background:#e8f5e9;color:#2e7d32;border:1px solid #4caf50;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"> </button>
        <a href="https://mailmind.yongcha.app#pricing" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px;background:linear-gradient(135deg,#fff8e1,#fff3e0);color:#e65100;border:1px solid #ffb74d;border-radius:8px;font-size:11px;text-decoration:none;font-weight:600">👑 Smart Reply · Unlock Pro</a>
      `;
      panel.querySelector('#mm-ol-triple').addEventListener('click', () => generateTripleOL());
    } else {
      container.innerHTML = `<a href="https://mailmind.yongcha.app#pricing" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px;background:linear-gradient(135deg,#fff8e1,#fff3e0);color:#e65100;border:1px solid #ffb74d;border-radius:8px;font-size:11px;text-decoration:none;box-sizing:border-box;font-weight:600">👑 Compare & Smart Reply · Unlock Basic/Pro</a>`;
    }

    applyUILangOL(olSelectedMyLang);

    // 이메일 감지 & 할일 추출
    setTimeout(() => {
      const emailContent = getOutlookEmailThread();
      if (emailContent) {
        detectAndShowInfoOL(emailContent, olSelectedMyLang);
        extractTasksAndDatesOL(emailContent, olSelectedMyLang);
      }
    }, 1200);

    // 스타일 학습 현황 표시
    chrome.storage.local.get(['learnedStyle'], data => {
      if (data.learnedStyle && data.learnedStyle.count >= 3) {
        const ls = data.learnedStyle;
        const sigInput = panel.querySelector('#mm-ol-signature-input');
        if (sigInput) {
          const learnDiv = document.createElement('div');
          learnDiv.style.cssText = 'font-size:10px;color:#137333;margin-top:6px;padding:4px 8px;background:#e6f4ea;border-radius:6px;';
          const uiLS = getUILangOL(olSelectedMyLang);
          learnDiv.textContent = `✨ ${uiLS.learnedLabel||'학습됨'}: ${ls.favTone} ${uiLS.tonePref||'톤 선호'} · ${ls.style} (${ls.count}${uiLS.learnedUnit||'회'})`;
          sigInput.parentNode.appendChild(learnDiv);
        }
        // 학습된 톤 자동 적용
        if (ls.favTone) { olSelectedTone = ls.favTone; panel.querySelector('#mm-ol-tone').value = ls.favTone; }
      }
    });

    // 서명 불러오기
    chrome.storage.sync.get(['signature'], d => {
      if (d.signature) panel.querySelector('#mm-ol-signature-input').value = d.signature;
    });
    renderTemplatesOL();
  }

  // ===== UI 언어 일괄 적용 =====
  function applyUILangOL(lang) {
    const ui = getUILangOL(lang);
    const set = (id, val) => { const el = panel.querySelector(id); if (el) el.textContent = val; };
    set('#mm-ol-label-tone', ui.tone);
    set('#mm-ol-label-country', ui.country);
    set('#mm-ol-label-mylang', ui.myLang);
    set('#mm-ol-gen', ui.generate);
    set('#mm-ol-summarize', ui.summary);
    set('#mm-ol-settings-toggle', ui.settings);
    set('#mm-ol-settings-title', ui.settings);
    set('#mm-ol-promises-title', ui.promises);
    set('#mm-ol-switch-label', ui.switchLang);
    set('#mm-ol-insert', ui.insert);
    set('#mm-ol-copy', ui.copy);
    set('#mm-ol-label-sig', ui.signature);
    set('#mm-ol-label-template', ui.template);
    set('#mm-ol-save-signature', ui.sigSave);
    set('#mm-ol-shortcut-hint', ui.shortcut);
    set('#mm-ol-tasks-title', ui.tasks);
    set('#mm-ol-email-translate', ui.translateBtn);
    const tripleBtn = panel.querySelector('#mm-ol-triple');
    const smartBtn = panel.querySelector('#mm-ol-smart');
    if (tripleBtn) tripleBtn.textContent = ui.compare;
    if (smartBtn) smartBtn.textContent = ui.smartReply;
    const toneSelect = panel.querySelector('#mm-ol-tone');
    if (toneSelect) { const cur = toneSelect.value; toneSelect.innerHTML = getToneOptionsOL(lang); toneSelect.value = cur; }
    const _olGuardTitleLabels = {Korean:'🛡️ 스마트 가드',Japanese:'🛡️ スマートガード',Chinese:'🛡️ 智能防护',Spanish:'🛡️ Guardia de respuesta',French:'🛡️ Garde de réponse',German:'🛡️ Antwort-Schutz',Portuguese:'🛡️ Guarda de resposta',Arabic:'🛡️ حارس الرد',Italian:'🛡️ Guardia risposta',Turkish:'🛡️ Yanıt Koruyucu',Vietnamese:'🛡️ Bộ bảo vệ',Thai:'🛡️ ตัวป้องกัน',Indonesian:'🛡️ Penjaga balasan'};
    const _olGuardTitleEl = panel.querySelector('#mm-ol-guard-title');
    if (_olGuardTitleEl) _olGuardTitleEl.textContent = _olGuardTitleLabels[lang] || '🛡️ Smart Reply Guard';
    const _olSendOrigLabels = {Korean:'🌐 원문으로 전송',Japanese:'🌐 原文で送信',Chinese:'🌐 以原文发送',Spanish:'🌐 Enviar en original',French:'🌐 Envoyer en original',German:'🌐 Original senden',Portuguese:'🌐 Enviar original',Arabic:'🌐 إرسال النص الأصلي',Italian:'🌐 Invia in originale',Turkish:'🌐 Orijinal gönder',Vietnamese:'🌐 Gửi bản gốc',Thai:'🌐 ส่งต้นฉบับ',Indonesian:'🌐 Kirim asli'};
    const _olSwitchBtn = panel.querySelector('#mm-ol-switch-lang');
    if (_olSwitchBtn) _olSwitchBtn.textContent = _olSendOrigLabels[lang] || '🌐 Send in original language';
    const _olGuardEl2=panel.querySelector('#mm-ol-guard'); const _olGuardTxtEl=panel.querySelector('#mm-ol-guard-text');
    if (_olGuardEl2&&_olGuardEl2.style.display!=='none'&&_olGuardTxtEl&&_olGuardConditions.length>0) {
      const _olAW2={Korean:'⚠️ 첨부 파일 언급 — 전송 전 확인',Japanese:'⚠️ 添付ファイルの言及 — 送信前に確認',Chinese:'⚠️ 提及附件 — 发送前确认',Spanish:'⚠️ Se menciona adjunto — verifica antes de enviar',French:"⚠️ Pièce jointe mentionnée — vérifiez avant d'envoyer",German:'⚠️ Anhang erwähnt — vor dem Senden prüfen',Portuguese:'⚠️ Anexo mencionado — verifique antes de enviar',Arabic:'⚠️ تم ذكر مرفق — تحقق قبل الإرسال',Italian:'⚠️ Allegato menzionato — controlla prima di inviare',Turkish:'⚠️ Ek belirtildi — göndermeden önce kontrol et',Vietnamese:'⚠️ Đề cập tệp đính kèm — kiểm tra trước khi gửi',Thai:'⚠️ กล่าวถึงไฟล์แนบ — ตรวจสอบก่อนส่ง',Indonesian:'⚠️ Lampiran disebutkan — periksa sebelum mengirim'};
      const _olKN2={Korean:'💡 일본어 경어(敬語)가 적용되었습니다.',Chinese:'💡 已应用日语敬语（敬語）。',Spanish:'💡 Se aplicó el keigo japonés (敬語).',French:'💡 Le keigo japonais (敬語) a été appliqué.',German:'💡 Japanisches Keigo (敬語) wurde angewendet.'};
      _olGuardTxtEl.innerHTML=_olGuardConditions.map(c=>c==='attach'?(_olAW2[lang]||'⚠️ Attachment mentioned — check before sending.'):(_olKN2[lang]||'💡 Japanese Keigo (敬語) applied.')).join('<br>');
    }
    panel.style.direction = lang === 'Arabic' ? 'rtl' : 'ltr';
  }

  // ===== 이벤트 =====
  panel.querySelector('#mm-ol-close').addEventListener('click', () => { removeOLPanel(); document.querySelector('#mm-ol-fab')?.style && (document.querySelector('#mm-ol-fab').style.display = 'flex'); });
  panel.querySelector('#mm-ol-tone').addEventListener('change', function() { olSelectedTone = this.value; });
  // 발신자 국가 자동감지
  const olCountrySelect = panel.querySelector('#mm-ol-country');
  if (olCountrySelect) {
    const emailForCountry = getOutlookEmailThread();
    const detectedOL = autoDetectCountryOL(emailForCountry);
    olSelectedCountry = detectedOL || 'auto';
    olCountrySelect.value = olSelectedCountry;
    olCountrySelect.addEventListener('change', function() { olSelectedCountry = this.value; });
  }
  panel.querySelector('#mm-ol-lang').addEventListener('change', function() {
    olSelectedMyLang = this.value;
    chrome.storage.sync.set({ myLanguage: this.value });
    applyUILangOL(this.value);
    const autoOptOL = panel.querySelector('#mm-ol-country option[value="auto"]');
    if (autoOptOL) autoOptOL.textContent = AUTODETECT_LABELS_OL[this.value] || '🌐 Auto Detect';
    const emailContent = getOutlookEmailThread();
    if (emailContent) {
      detectAndShowInfoOL(emailContent, this.value);
      extractTasksAndDatesOL(emailContent, this.value);
      // 감정 배지 업데이트
      const ui2ol = getUILangOL(this.value);
      const emotionBadgeOL = olCurrentPanel.querySelector('#mm-ol-emotion-badge');
      const urgencyBadgeOL = olCurrentPanel.querySelector('#mm-ol-urgency-badge');
      if (emotionBadgeOL && olCachedEmotion && olCachedEmotion !== 'neutral') emotionBadgeOL.textContent = ui2ol.emotion[olCachedEmotion] || '';
      if (urgencyBadgeOL && olCachedUrgency && olCachedUrgency !== 'low') urgencyBadgeOL.textContent = ui2ol.urgency[olCachedUrgency] || '';
    }
  });

  panel.querySelector('#mm-ol-gen').addEventListener('click', generateReplyOL);
  panel.querySelector('#mm-ol-regen').addEventListener('click', generateReplyOL);

  panel.querySelector('#mm-ol-edit-btn').addEventListener('click', () => {
    const ta = panel.querySelector('#mm-ol-output');
    ta.readOnly = false; ta.style.background = '#fff'; ta.style.borderColor = '#e91e8c';
    panel.querySelector('#mm-ol-edit-btn').style.display = 'none';
    panel.querySelector('#mm-ol-edit-bar').style.display = 'flex';
    ta.focus();
  });
  panel.querySelector('#mm-ol-edit-done').addEventListener('click', () => {
    const ta = panel.querySelector('#mm-ol-output');
    ta.readOnly = true; ta.style.background = '#f8f9fa'; ta.style.borderColor = '#dadce0';
    panel.querySelector('#mm-ol-edit-btn').style.display = '';
    panel.querySelector('#mm-ol-edit-bar').style.display = 'none';
    _olVersions = [ta.value]; _olTranslations = []; _olCurrentVerIdx = 0; _olIsTranslated = false; _olCurrentDisplayLang = olSelectedMyLang; _olOrigLang = olSelectedMyLang;
  });
  panel.querySelector('#mm-ol-refine-btn').addEventListener('click', refineReplyOL);
  panel.querySelector('#mm-ol-insert').addEventListener('click', () => { const t = panel.querySelector('#mm-ol-output').value; if (t) insertReplyOutlook(t); });
  panel.querySelector('#mm-ol-copy').addEventListener('click', () => { navigator.clipboard.writeText(panel.querySelector('#mm-ol-output').value).then(() => showToastOL('Copied!', 'success')); });

  // 📎 파일 첨부 — Outlook Web의 네이티브 첨부 버튼 클릭
  panel.querySelector('#mm-ol-attach').addEventListener('click', () => {
    const attachBtn =
      document.querySelector('[aria-label="파일 첨부"]') ||
      document.querySelector('[aria-label="Attach"]') ||
      document.querySelector('[aria-label="Attach file"]') ||
      document.querySelector('[title="Attach"]') ||
      document.querySelector('button[data-icon-name="Attach"]') ||
      document.querySelector('[data-testid="AttachmentButton"]');
    if (attachBtn) {
      attachBtn.click();
      showToastOL('📎 파일 첨부창이 열립니다', 'info');
    } else {
      showToastOL('📎 먼저 답장 버튼을 눌러 답장창을 열어주세요', 'info');
    }
  });

  // 패널 레벨 공유 변수
  let _olVersions = [];
  let _olTranslations = [];
  let _olCurrentVerIdx = 0;
  let _olIsTranslated = false;
  let _olCurrentDisplayLang = '';
  let _olOrigLang = null;
  let _olGuardConditions = [];

  // 다국어 버튼
  panel.querySelectorAll('.mm-ol-lang-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const targetLang = this.dataset.lang;
      const currentText = panel.querySelector('#mm-ol-output').value;
      if (!currentText) { showToastOL('Please generate a reply first.', 'info'); return; }
      const _olOrig = _olOrigLang || olSelectedMyLang;
      if (targetLang === _olOrig) {
        if (!_olIsTranslated) return;
        const _olRestoreText = _olVersions[_olCurrentVerIdx];
        if (!_olRestoreText) return;
        panel.querySelector('#mm-ol-output').value = await appendSignatureOL(_olRestoreText);
        _olIsTranslated = false; _olCurrentDisplayLang = _olOrig;
        panel.querySelectorAll('.mm-ol-lang-btn').forEach(b => { b.style.background='#fff'; b.style.borderColor='#dadce0'; b.style.color='#202124'; });
        return;
      }
      if (targetLang === _olCurrentDisplayLang) return;
      panel.querySelectorAll('.mm-ol-lang-btn').forEach(b => { b.style.background='#fff'; b.style.borderColor='#dadce0'; b.style.color='#202124'; });
      this.style.background='#fce4ec'; this.style.borderColor='#e91e8c'; this.style.color='#e91e8c';
      const origText = this.textContent;
      this.textContent = '⏳'; this.disabled = true;
      if (!_olIsTranslated) {
        if (_olVersions.length > 0) { _olVersions[_olCurrentVerIdx] = currentText; }
        else { _olVersions = [currentText]; _olCurrentVerIdx = 0; }
      }
      try {
        const res = await fetch(`${WORKER_URL_OL}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: currentText, targetLanguage: targetLang }) });
        const data = await res.json();
        if (data.success && data.translated) {
          panel.querySelector('#mm-ol-output').value = data.translated;
          _olTranslations[_olCurrentVerIdx] = data.translated;
          _olIsTranslated = true;
          _olCurrentDisplayLang = targetLang;
          showToastOL(`Translated to ${targetLang}!`, 'success');
          // 나머지 버전 병렬 번역
          const otherIdxs = [...Array(_olVersions.length).keys()].filter(i => i !== _olCurrentVerIdx && _olVersions[i]);
          Promise.all(otherIdxs.map(async (i) => {
            try {
              const r2 = await fetch(`${WORKER_URL_OL}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: _olVersions[i], targetLanguage: targetLang }) });
              const d2 = await r2.json();
              if (d2.success && d2.translated) {
                _olTranslations[i] = d2.translated;
                if (_olCurrentVerIdx === i) panel.querySelector('#mm-ol-output').value = d2.translated;
              }
            } catch(e) {}
          }));
        }
      } catch(e) { showToastOL('Translation failed.', 'error'); }
      this.textContent = origText; this.disabled = false;
    });
  });

  // ===== 이메일 번역 =====
  panel.querySelector('#mm-ol-email-translate').addEventListener('click', async function() {
    const btn = this;
    const resultEl = panel.querySelector('#mm-ol-email-translated');
    // 이미 번역 완료 상태면 토글만 (API 재호출 없음)
    if (resultEl._translated) {
      const uiTr2 = getUILangOL(olSelectedMyLang);
      if (resultEl.style.display === 'none') { resultEl.style.display = 'block'; btn.textContent = uiTr2.translateClose; }
      else { resultEl.style.display = 'none'; btn.textContent = uiTr2.translateBtn; }
      return;
    }
    const emailContent = getOutlookEmailThread();
    if (!emailContent) { showToastOL('이메일 내용을 찾을 수 없습니다.', 'error'); return; }

    const uiTr = getUILangOL(olSelectedMyLang);
    btn.disabled = true;
    btn.textContent = uiTr.translating || '🌐 번역 중...';
    resultEl.style.display = 'none';

    try {
      const ud = await getUserDataOL();
      const res = await fetch(`${WORKER_URL_OL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: emailContent, targetLanguage: olSelectedMyLang, email: ud.userEmail })
      });
      const data = await res.json();
      if (data.success && data.translated) {
        resultEl.textContent = data.translated;
        resultEl.style.display = 'block';
        resultEl._translated = true; // 번역 완료 플래그
        btn.textContent = getUILangOL(olSelectedMyLang).translateClose;
      } else {
        showToastOL('번역 실패: ' + (data.error || ''), 'error');
        btn.textContent = getUILangOL(olSelectedMyLang).translateBtn;
      }
    } catch (e) {
      showToastOL('번역 오류: ' + e.message, 'error');
      btn.textContent = getUILangOL(olSelectedMyLang).translateBtn;
    }
    btn.disabled = false;
  });

  // 스레드 요약
  panel.querySelector('#mm-ol-summarize').addEventListener('click', async function() {
    const summaryElCheck = panel.querySelector('#mm-ol-thread-summary');
    // 이미 요약 완료 상태면 토글만 (API 재호출 없음)
    if (summaryElCheck._summarized) {
      summaryElCheck.style.display = summaryElCheck.style.display === 'none' ? 'block' : 'none';
      return;
    }
    const emailContent = getOutlookEmailThread();
    if (!emailContent) { showToastOL('Email not found.', 'error'); return; }
    const btn = this;
    btn.disabled = true; btn.textContent = getUILangOL(olSelectedMyLang).summarizing;
    try {
      const ud = await getUserDataOL();
      const res = await fetch(`${WORKER_URL_OL}/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ emailContent: `Summarize this email thread in 3-5 bullet points in ${olSelectedMyLang}. Be concise.\n\n${emailContent}`, tone:'concise', language:olSelectedMyLang, email:ud.userEmail, isSummary:true }) });
      const data = await res.json();
      if (data.success) {
        const summaryEl = panel.querySelector('#mm-ol-thread-summary');
        summaryEl.style.display = 'block';
        summaryEl.textContent = '';
        const _srStrong = document.createElement('strong');
        _srStrong.style.color = '#202124';
        _srStrong.textContent = '📝 ' + getUILangOL(olSelectedMyLang).summary.replace(/📝\s?/,'') + ':';
        summaryEl.appendChild(_srStrong);
        summaryEl.appendChild(document.createElement('br'));
        summaryEl.appendChild(document.createElement('br'));
        data.reply.split('\n').forEach((line, i, arr) => { summaryEl.appendChild(document.createTextNode(line)); if (i < arr.length - 1) summaryEl.appendChild(document.createElement('br')); });
        summaryEl._summarized = true; // 요약 완료 플래그
      }
    } catch(e) { showToastOL('Failed.', 'error'); }
    btn.disabled = false; btn.textContent = getUILangOL(olSelectedMyLang).summary;
  });

  // 설정 토글
  panel.querySelector('#mm-ol-settings-toggle').addEventListener('click', function() {
    const s = panel.querySelector('#mm-ol-settings');
    const isOpen = s.style.display !== 'none';
    s.style.display = isOpen ? 'none' : 'block';
    const ui = getUILangOL(olSelectedMyLang);
    this.textContent = isOpen ? ui.settings : (ui.settingsClose || ui.settings);
  });

  // 서명 저장
  panel.querySelector('#mm-ol-save-signature').addEventListener('click', function() {
    const sig = panel.querySelector('#mm-ol-signature-input').value;
    chrome.storage.sync.set({ signature: sig });
    showToastOL('서명이 저장됐어요!', 'success');
  });


  // 템플릿
  function renderTemplatesOL() {
    chrome.storage.sync.get(['templates'], data => {
      const tpls = data.templates || [];
      const list = panel.querySelector('#mm-ol-templates-list');
      list.innerHTML = tpls.map((t,i) => `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#e8f0fe;border-radius:12px;font-size:11px;cursor:pointer" data-idx="${i}"><span class="mm-ol-tpl-use">${escapeHtmlOL(t)}</span><span class="mm-ol-tpl-del" data-idx="${i}" style="color:#e91e8c;font-weight:bold">×</span></span>`).join('');
      list.querySelectorAll('.mm-ol-tpl-use').forEach(el => { el.addEventListener('click', function() { panel.querySelector('#mm-ol-output').value += '\n'+this.textContent; showToastOL('템플릿 추가됐어요!', 'success'); }); });
      list.querySelectorAll('.mm-ol-tpl-del').forEach(el => { el.addEventListener('click', function(e) { e.stopPropagation(); chrome.storage.sync.get(['templates'], d => { const t2 = d.templates||[]; t2.splice(parseInt(this.dataset.idx),1); chrome.storage.sync.set({ templates: t2 }); renderTemplatesOL(); }); }); });
    });
  }

  // 단축키
  document.addEventListener('keydown', function olKeydown(e) {
    if (!olCurrentPanel) { document.removeEventListener('keydown', olKeydown); return; }
    if (e.altKey) {
      if (e.key==='g'||e.key==='G') { e.preventDefault(); generateReplyOL(); }
      if (e.key==='c'||e.key==='C') { e.preventDefault(); const t = panel.querySelector('#mm-ol-output')?.value; if (t) navigator.clipboard.writeText(t).then(()=>showToastOL('Copied!','success')); }
      if (e.key==='i'||e.key==='I') { e.preventDefault(); const t = panel.querySelector('#mm-ol-output')?.value; if (t) insertReplyOutlook(t); }
    }
  });

  initPanelOL();

  // ===== 기본 답장 생성 =====
  async function generateReplyOL() {
    const emailContent = getOutlookEmailThread();
    if (!emailContent) { showToastOL('Email content not found.', 'error'); return; }
    const ud = await getUserDataOL();
    if (ud.monthlyCount >= ud.monthlyLimit) { panel.querySelector('#mm-ol-upgrade').style.display='block'; return; }
    const genBtn = panel.querySelector('#mm-ol-gen');
    genBtn.disabled=true; genBtn.textContent=getUILangOL(olSelectedMyLang).generating;
    panel.querySelector('#mm-ol-summary').style.display='none';
    panel.querySelector('#mm-ol-lang-btn').style.display='none';
    panel.querySelector('#mm-ol-versions').style.display='none';
    try {
      const storedSigOL = await new Promise(r => chrome.storage.sync.get(['signature','userInfo'], r));
      const signatureOL = storedSigOL.signature || '';
      const userInfoOL = storedSigOL.userInfo || '';
      const res = await fetch(`${WORKER_URL_OL}/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ emailContent, tone:olSelectedTone, language:olSelectedMyLang, myLanguage:olSelectedMyLang, country:olSelectedCountry, email:ud.userEmail, userId:ud.userId, ...(signatureOL && { signature: signatureOL }), ...(userInfoOL && { userInfo: userInfoOL }), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) }) });
      const data = await res.json();
      if (data.success) {
        // 스팸
        const spamEl = panel.querySelector('#mm-ol-spam');
        if (data.isSpam && data.spamWarning) { spamEl.textContent=data.spamWarning; spamEl.style.display='block'; } else spamEl.style.display='none';
        let _rawOL = (data.reply||'').trim();
        _rawOL = _rawOL.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]?\s*[\r\n]+/, '').trim();
        _rawOL = _rawOL.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]\s*/, '').trim();
        const replyWithSig = await appendSignatureOL(_rawOL);
        panel.querySelector('#mm-ol-output').value = replyWithSig;
        panel.querySelector('#mm-ol-result').style.display='block';
        // 언어 전환용 버전 저장
        _olVersions = [replyWithSig];
        _olTranslations = [];
        _olCurrentVerIdx = 0;
        _olIsTranslated = false;
        _olCurrentDisplayLang = olSelectedMyLang; _olOrigLang = olSelectedMyLang;
        panel.querySelector('#mm-ol-edit-btn').style.display = '';
        panel.querySelector('#mm-ol-edit-bar').style.display = 'none';
        panel.querySelector('#mm-ol-lang-btn').style.display = 'block';
        // Worker 감지 국가 드롭다운 반영
        if (data.detectedCountry && olSelectedCountry === 'auto') {
          const matched = ['Japan','Korea','USA','Germany','Brazil','Arabia','China','France'].find(k => data.detectedCountry.includes(k));
          if (matched) { olSelectedCountry = matched; const cs = panel.querySelector('#mm-ol-country'); if (cs) cs.value = matched; }
        }
        // Guard
        _olGuardConditions=[];
        if (replyWithSig.includes('첨부')||replyWithSig.includes('attach')) _olGuardConditions.push('attach');
        if (olSelectedCountry==='Japan') _olGuardConditions.push('keigo');
        const _olAW={Korean:'⚠️ 첨부 파일 언급 — 전송 전 확인',Japanese:'⚠️ 添付ファイルの言及 — 送信前に確認',Chinese:'⚠️ 提及附件 — 发送前确认',Spanish:'⚠️ Se menciona adjunto — verifica antes de enviar',French:"⚠️ Pièce jointe mentionnée — vérifiez avant d'envoyer",German:'⚠️ Anhang erwähnt — vor dem Senden prüfen',Portuguese:'⚠️ Anexo mencionado — verifique antes de enviar',Arabic:'⚠️ تم ذكر مرفق — تحقق قبل الإرسال',Italian:'⚠️ Allegato menzionato — controlla prima di inviare',Turkish:'⚠️ Ek belirtildi — göndermeden önce kontrol et',Vietnamese:'⚠️ Đề cập tệp đính kèm — kiểm tra trước khi gửi',Thai:'⚠️ กล่าวถึงไฟล์แนบ — ตรวจสอบก่อนส่ง',Indonesian:'⚠️ Lampiran disebutkan — periksa sebelum mengirim'};
        const _olKN={Korean:'💡 일본어 경어(敬語)가 적용되었습니다.',Chinese:'💡 已应用日语敬语（敬語）。',Spanish:'💡 Se aplicó el keigo japonés (敬語).',French:'💡 Le keigo japonais (敬語) a été appliqué.',German:'💡 Japanisches Keigo (敬語) wurde angewendet.'};
        const guards = _olGuardConditions.map(c=>c==='attach'?(_olAW[olSelectedMyLang]||'⚠️ Attachment mentioned — check before sending.'):(_olKN[olSelectedMyLang]||'💡 Japanese Keigo (敬語) applied.'));
        const guardEl = panel.querySelector('#mm-ol-guard');
        const guardText = panel.querySelector('#mm-ol-guard-text');
        if (guards.length > 0) { guardText.innerHTML = guards.join('<br>'); guardEl.style.display='block'; } else guardEl.style.display='none';
        // 약속 추출
        const promises = extractPromisesOL(replyWithSig, olSelectedMyLang);
        const promisesEl = panel.querySelector('#mm-ol-promises');
        if (promises.length > 0) { promisesEl.style.display='block'; const _pl=panel.querySelector('#mm-ol-promises-list'); _pl.textContent=''; promises.forEach((p,i)=>{ if(i>0)_pl.appendChild(document.createElement('br')); _pl.appendChild(document.createTextNode('• '+p)); }); }
        panel.querySelector('#mm-ol-upgrade').style.display='none';
        await incrementUsageOL(data.monthlyUsage);
        updateBadgeOL();
        learnStyleOL(olSelectedTone, emailContent, data.reply);
      } else if (data.error==='MONTHLY_LIMIT') {
        panel.querySelector('#mm-ol-upgrade').style.display='block';
      } else { showToastOL('Failed: '+(data.error||'Try again.'), 'error'); }
    } catch(e) { showToastOL('Error: '+e.message, 'error'); }
    genBtn.disabled=false; genBtn.textContent=getUILangOL(olSelectedMyLang).generate;
  }

  // ===== 답변 비교 (Triple) =====
  async function generateTripleOL() {
    const emailContent = getOutlookEmailThread();
    if (!emailContent) { showToastOL('Email not found.', 'error'); return; }
    const ud = await getUserDataOL();
    if (ud.monthlyCount >= ud.monthlyLimit) { panel.querySelector('#mm-ol-upgrade').style.display='block'; return; }
    const btn = panel.querySelector('#mm-ol-triple');
    const origText = btn.textContent;
    btn.disabled=true; btn.textContent=getUILangOL(olSelectedMyLang).generating;
    panel.querySelector('#mm-ol-summary').style.display='none';
    panel.querySelector('#mm-ol-lang-btn').style.display='none';
    panel.querySelector('#mm-ol-versions').style.display='none';
    try {
      const storedTripleOL = await new Promise(r => chrome.storage.sync.get(['userInfo'], r));
      const userInfoTripleOL = storedTripleOL.userInfo || '';
      const res = await fetch(`${WORKER_URL_OL}/generate-triple`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ emailContent, tone:olSelectedTone, myLanguage:olSelectedMyLang, country:olSelectedCountry, email:ud.userEmail, userId:ud.userId, ...(userInfoTripleOL && { userInfo: userInfoTripleOL }), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) }) });
      const data = await res.json();
      if (data.success && data.versions?.length > 0) {
        const _maxVer = userData.plan === 'pro' ? 3 : 2;
        _olVersions = data.versions.slice(0, _maxVer).map(_stripSalutationOL);
        _olTranslations = await Promise.all((data.translations || []).slice(0, _maxVer).map(t => t ? appendSignatureOL(t) : t));
        _olCurrentVerIdx = 0;
        _olIsTranslated = false;
        _olCurrentDisplayLang = olSelectedMyLang; _olOrigLang = olSelectedMyLang;
        const versions = _olVersions;
        const translations = _olTranslations;
        panel.querySelector('#mm-ol-output').value = await appendSignatureOL(versions[0]);
        panel.querySelector('#mm-ol-result').style.display='block';
        panel.querySelector('#mm-ol-upgrade').style.display='none';
        // 탭 렌더링 (먼저 실행)
        const verTabs = panel.querySelector('#mm-ol-ver-tabs');
        const toneName = (TONES_I18N_OL[olSelectedMyLang]||TONES_I18N_OL['English'])[TONE_KEYS_OL.indexOf(olSelectedTone)] || olSelectedTone;
        verTabs.innerHTML = versions.map((_,i) => `<button class="mm-ol-ver-btn" data-ver="${i}" style="font-size:11px;padding:4px 12px;border:1px solid ${i===0?'#e91e8c':'#dadce0'};border-radius:20px;background:${i===0?'#fce4ec':'#fff'};color:${i===0?'#e91e8c':'#5f6368'};cursor:pointer">${toneName} ${i+1}</button>`).join('') + `<button id="mm-ol-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
        panel.querySelector('#mm-ol-versions').style.display='block';
        // edit-bar / edit-btn (null-safety)
        const _ebOL = panel.querySelector('#mm-ol-edit-bar');
        const _ebnOL = panel.querySelector('#mm-ol-edit-btn');
        if (_ebOL) _ebOL.style.display = 'flex';
        if (_ebnOL) _ebnOL.style.display = 'none';
        verTabs.querySelectorAll('.mm-ol-ver-btn').forEach(b => {
          b.addEventListener('click', async function() {
            verTabs.querySelectorAll('.mm-ol-ver-btn').forEach(b2 => { b2.style.border='1px solid #dadce0'; b2.style.background='#fff'; b2.style.color='#5f6368'; });
            this.style.border='1px solid #e91e8c'; this.style.background='#fce4ec'; this.style.color='#e91e8c';
            _olCurrentVerIdx = parseInt(this.dataset.ver);
            panel.querySelector('#mm-ol-output').value = (_olIsTranslated && _olTranslations[_olCurrentVerIdx])
              ? _olTranslations[_olCurrentVerIdx]
              : await appendSignatureOL(_olVersions[_olCurrentVerIdx]);
            const _ebOLv = panel.querySelector('#mm-ol-edit-bar');
            const _ebnOLv = panel.querySelector('#mm-ol-edit-btn');
            if (_ebOLv) _ebOLv.style.display = 'flex';
            if (_ebnOLv) _ebnOLv.style.display = 'none';
          });
        });
        verTabs.querySelector('#mm-ol-ver-confirm')?.addEventListener('click', () => {
          panel.querySelector('#mm-ol-versions').style.display = 'none';
        });
        if (translations.length > 0) {
          const langBtnEl = panel.querySelector('#mm-ol-lang-btn');
          langBtnEl.style.display='block';
          const switchBtn = panel.querySelector('#mm-ol-switch-lang');
          const newBtn = switchBtn.cloneNode(true);
          switchBtn.parentNode.replaceChild(newBtn, switchBtn);
          const _olSendOrigLabel2=(()=>{const m={Korean:'🌐 원문으로 전송',Japanese:'🌐 原文で送信',Chinese:'🌐 以原文发送',Spanish:'🌐 Enviar en original',French:'🌐 Envoyer en original',German:'🌐 Original senden',Portuguese:'🌐 Enviar original',Arabic:'🌐 إرسال النص الأصلي',Italian:'🌐 Invia in originale',Turkish:'🌐 Orijinal gönder',Vietnamese:'🌐 Gửi bản gốc',Thai:'🌐 ส่งต้นฉบับ',Indonesian:'🌐 Kirim asli'};return m[olSelectedMyLang]||'🌐 Send in original language';})();
          newBtn.textContent=_olSendOrigLabel2; newBtn.style.background='#1a73e8';
          newBtn.addEventListener('click', async function() {
            if (_olIsTranslated) { panel.querySelector('#mm-ol-output').value=await appendSignatureOL(_olVersions[_olCurrentVerIdx]); this.textContent=_olSendOrigLabel2; this.style.background='#1a73e8'; _olIsTranslated=false; }
            else { panel.querySelector('#mm-ol-output').value=_olTranslations[_olCurrentVerIdx]||(await appendSignatureOL(_olVersions[_olCurrentVerIdx])); this.textContent=`🔄 Back to ${olSelectedMyLang}`; this.style.background='#34a853'; _olCurrentDisplayLang=null; _olIsTranslated=true; }
          });
        }
        await incrementUsageOL(data.monthlyUsage);
        updateBadgeOL();
      } else if (data.error==='MONTHLY_LIMIT') { panel.querySelector('#mm-ol-upgrade').style.display='block'; }
      else { showToastOL('Failed. Try again.', 'error'); }
    } catch(e) { showToastOL('Error: '+e.message, 'error'); }
    btn.disabled=false; btn.textContent=origText;
  }

  // ===== 스마트 답장 =====
  async function generateSmartOL() {
    const emailContent = getOutlookEmailThread();
    if (!emailContent) { showToastOL('Email not found.', 'error'); return; }
    const ud = await getUserDataOL();
    if (ud.plan !== 'pro' && ud.plan !== 'team') { showToastOL(getUILangOL(olSelectedMyLang).smartPlanMsg || 'Smart Reply is available on Pro plan or above.', 'error'); return; }
    if (ud.monthlyCount >= ud.monthlyLimit) { panel.querySelector('#mm-ol-upgrade').style.display='block'; return; }
    const btn = panel.querySelector('#mm-ol-smart');
    btn.disabled=true; btn.textContent=getUILangOL(olSelectedMyLang).smartGenerating||'🌍 Analyzing...';
    panel.querySelector('#mm-ol-versions').style.display='none';
    panel.querySelector('#mm-ol-lang-btn').style.display='none';
    try {
      const storedSmartOL = await new Promise(r => chrome.storage.sync.get(['userInfo'], r));
      const userInfoSmartOL = storedSmartOL.userInfo || '';
      const res = await fetch(`${WORKER_URL_OL}/generate-smart`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ emailContent, tone:olSelectedTone, myLanguage:olSelectedMyLang, country:olSelectedCountry, email:ud.userEmail, userId:ud.userId, ...(userInfoSmartOL && { userInfo: userInfoSmartOL }), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) }) });
      const data = await res.json();
      if (data.success) {
        _olVersions = (data.versions || []).map(_stripSalutationOL);
        _olTranslations = await Promise.all((data.translations || []).map(t => t ? appendSignatureOL(t) : t));
        _olCurrentVerIdx = 0;
        _olIsTranslated = false;
        _olCurrentDisplayLang = olSelectedMyLang; _olOrigLang = olSelectedMyLang;
        const versions = _olVersions;
        const translations = _olTranslations;
        const summaryEl = panel.querySelector('#mm-ol-summary');
        summaryEl.style.display='block';
        summaryEl.textContent = '';
        summaryEl.appendChild(document.createTextNode('📋 '));
        const _smStrong = document.createElement('strong');
        _smStrong.textContent = `Summary (${data.detected_language||'English'}):`;
        summaryEl.appendChild(_smStrong);
        summaryEl.appendChild(document.createElement('br'));
        data.summary.split('\n').forEach((line, i, arr) => { summaryEl.appendChild(document.createTextNode(line)); if (i < arr.length - 1) summaryEl.appendChild(document.createElement('br')); });
        panel.querySelector('#mm-ol-output').value = await appendSignatureOL(versions[0]||'');
        panel.querySelector('#mm-ol-result').style.display='block';
        panel.querySelector('#mm-ol-upgrade').style.display='none';
        if (versions.length > 1) {
          const verTabs = panel.querySelector('#mm-ol-ver-tabs');
          verTabs.innerHTML = versions.map((_,i) => `<button class="mm-ol-ver-tab${i===0?' active':''}" data-idx="${i}" style="font-size:11px;padding:4px 12px;border:1px solid ${i===0?'#e91e8c':'#dadce0'};border-radius:20px;background:${i===0?'#fce4ec':'#fff'};color:${i===0?'#e91e8c':'#5f6368'};cursor:pointer">v${i+1}</button>`).join('') + `<button id="mm-ol-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
          panel.querySelector('#mm-ol-versions').style.display='block';
          verTabs.querySelectorAll('.mm-ol-ver-tab').forEach(tab => {
            tab.addEventListener('click', async function() {
              _olCurrentVerIdx=parseInt(this.dataset.idx);
              verTabs.querySelectorAll('.mm-ol-ver-tab').forEach(t => { t.style.border='1px solid #dadce0'; t.style.background='#fff'; t.style.color='#5f6368'; });
              this.style.border='1px solid #e91e8c'; this.style.background='#fce4ec'; this.style.color='#e91e8c';
              panel.querySelector('#mm-ol-output').value = (_olIsTranslated && _olTranslations[_olCurrentVerIdx])
                ? _olTranslations[_olCurrentVerIdx]
                : await appendSignatureOL(_olVersions[_olCurrentVerIdx]);
            });
          });
          verTabs.querySelector('#mm-ol-ver-confirm')?.addEventListener('click', () => {
            panel.querySelector('#mm-ol-versions').style.display = 'none';
          });
        }
        // edit-bar / edit-btn (null-safety)
        const _ebOLS = panel.querySelector('#mm-ol-edit-bar');
        const _ebnOLS = panel.querySelector('#mm-ol-edit-btn');
        if (_ebOLS) _ebOLS.style.display='flex';
        if (_ebnOLS) _ebnOLS.style.display='none';
        if (translations.length > 0) {
          const langBtnEl = panel.querySelector('#mm-ol-lang-btn');
          langBtnEl.style.display='block';
          const switchBtn = panel.querySelector('#mm-ol-switch-lang');
          const newBtn = switchBtn.cloneNode(true);
          switchBtn.parentNode.replaceChild(newBtn, switchBtn);
          const _olSmartSendOrigLabel=(()=>{const m={Korean:'🌐 원문으로 전송',Japanese:'🌐 原文で送信',Chinese:'🌐 以原文发送',Spanish:'🌐 Enviar en original',French:'🌐 Envoyer en original',German:'🌐 Original senden',Portuguese:'🌐 Enviar original',Arabic:'🌐 إرسال النص الأصلي',Italian:'🌐 Invia in originale',Turkish:'🌐 Orijinal gönder',Vietnamese:'🌐 Gửi bản gốc',Thai:'🌐 ส่งต้นฉบับ',Indonesian:'🌐 Kirim asli'};return m[olSelectedMyLang]||'🌐 Send in original language';})();
          newBtn.textContent=_olSmartSendOrigLabel; newBtn.style.background='#34a853';
          newBtn.addEventListener('click', async function() {
            if (_olIsTranslated) {
              panel.querySelector('#mm-ol-output').value=await appendSignatureOL(_olVersions[_olCurrentVerIdx]);
              this.textContent=_olSmartSendOrigLabel;
              this.style.background='#34a853';
              _olIsTranslated=false;
            } else {
              // 현재 버전 번역
              const targetLang = data.detected_language || 'English';
              if (_olTranslations[_olCurrentVerIdx]) {
                panel.querySelector('#mm-ol-output').value = _olTranslations[_olCurrentVerIdx];
                _olCurrentDisplayLang=null; _olIsTranslated=true;
              } else {
                this.textContent='⏳'; this.disabled=true;
                try {
                  const tr = await fetch(`${WORKER_URL_OL}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: _olVersions[_olCurrentVerIdx], targetLanguage: targetLang }) });
                  const td = await tr.json();
                  if (td.success && td.translated) {
                    _olTranslations[_olCurrentVerIdx] = td.translated;
                    panel.querySelector('#mm-ol-output').value = td.translated;
                    _olCurrentDisplayLang=null; _olIsTranslated=true;
                    // 나머지 버전 병렬 번역
                    const others = [...Array(_olVersions.length).keys()].filter(i => i !== _olCurrentVerIdx && _olVersions[i]);
                    Promise.all(others.map(async (i) => {
                      try {
                        const r2 = await fetch(`${WORKER_URL_OL}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: _olVersions[i], targetLanguage: targetLang }) });
                        const d2 = await r2.json();
                        if (d2.success && d2.translated) {
                          _olTranslations[i] = d2.translated;
                          if (_olCurrentVerIdx === i) panel.querySelector('#mm-ol-output').value = d2.translated;
                        }
                      } catch(e) {}
                    }));
                  }
                } catch(e) {}
                this.disabled=false;
              }
              this.textContent=`🔄 Back to ${olSelectedMyLang}`;
              this.style.background='#1a73e8';
            }
          });
        }
        await incrementUsageOL(data.monthlyUsage);
        updateBadgeOL();
      } else if (data.error==='MONTHLY_LIMIT') { panel.querySelector('#mm-ol-upgrade').style.display='block'; }
      else { showToastOL('Failed. Try again.', 'error'); }
    } catch(e) { showToastOL('Error: '+e.message, 'error'); }
    btn.disabled=false; btn.textContent=getUILangOL(olSelectedMyLang).smartReply;
  }

  // ===== 답변 다듬기 (Refine) =====
  async function refineReplyOL() {
    const draft = panel.querySelector('#mm-ol-output').value.trim();
    if (!draft) { showToastOL('수정할 답장이 없습니다.', 'info'); return; }
    const ud = await getUserDataOL();
    if (ud.monthlyCount >= ud.monthlyLimit) { panel.querySelector('#mm-ol-upgrade').style.display='block'; return; }
    if (ud.plan === 'free') { showToastOL(getUILangOL(olSelectedMyLang).refinePlanMsg||'초안 다듬기는 Basic 이상 플랜에서 사용 가능합니다', 'error'); return; }
    const refineBtn = panel.querySelector('#mm-ol-refine-btn');
    refineBtn.disabled = true; refineBtn.textContent = '⏳';
    try {
      const res = await fetch(`${WORKER_URL_OL}/refine-compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, refineGoal: 'enhance', tone: olSelectedTone, myLanguage: _olCurrentDisplayLang || olSelectedMyLang, email: ud.userEmail, userId: ud.userId, ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) })
      });
      const data = await res.json();
      if (data.success && data.refined) {
        const ta = panel.querySelector('#mm-ol-output');
        const _refineLangOL = _olCurrentDisplayLang || olSelectedMyLang;
        ta.readOnly = true; ta.style.background = '#f8f9fa'; ta.style.borderColor = '#dadce0';
        panel.querySelector('#mm-ol-edit-btn').style.display = '';
        panel.querySelector('#mm-ol-edit-bar').style.display = 'none';
        ta.value = data.refined;
        _olVersions = [data.refined]; _olTranslations = []; _olCurrentVerIdx = 0; _olIsTranslated = false; _olCurrentDisplayLang = _refineLangOL; _olOrigLang = _refineLangOL;
        await incrementUsageOL(data.monthlyUsage);
        updateBadgeOL();
        showToastOL(getUILangOL(olSelectedMyLang).refineDone||'✨ 다듬기 완료!', 'success');
      } else if (data.error === 'MONTHLY_LIMIT') {
        panel.querySelector('#mm-ol-upgrade').style.display = 'block';
      } else { showToastOL('Failed: ' + (data.error || 'Try again.'), 'error'); }
    } catch(e) { showToastOL('Error: ' + e.message, 'error'); }
    refineBtn.disabled = false; refineBtn.textContent = getUILangOL(olSelectedMyLang).refine||'✨ 다듬기';
  }
}

// ===== 문화/업종/성향 감지 =====
function detectAndShowInfoOL(emailContent, lang) {
  if (!olCurrentPanel) return;
  const text = emailContent.toLowerCase();
  const infos = [];
  const DETECT_I18N = {
    Korean:     { japan:'🇯🇵 일본 비즈니스 문화 · 경어체 적용', china:'🇨🇳 중국 · 격식체 적용', korean:'🇰🇷 한국어 · 존댓말 적용', arabic:'🇸🇦 아랍 · 이슬람 비즈니스 문화 적용', thai:'🇹🇭 태국 · 공손한 표현 적용', trade:'🏭 무역/물류 업종 감지', legal:'⚖️ 법률 업종 감지', it:'💻 IT 업종 감지 · 기술 용어 적용', finance:'💰 금융/회계 업종 감지', medical:'🏥 의료 업종 감지', urgent:'⚡ 긴급 톤 감지 → 간결 답장 추천', positive:'😊 긍정 톤 감지 → 친근 답장 추천', complaint:'⚠️ 불만 감지 → 사과 답장 추천', negotiate:'🤝 협상 컨텍스트 감지' },
    English:    { japan:'🇯🇵 Japan business culture · Keigo applied', china:'🇨🇳 China · Formal style applied', korean:'🇰🇷 Korean · Formal speech applied', arabic:'🇸🇦 Arabic · Islamic business culture applied', thai:'🇹🇭 Thai · Respectful expressions applied', trade:'🏭 Trade/Logistics detected', legal:'⚖️ Legal industry detected', it:'💻 IT industry detected', finance:'💰 Finance/Accounting detected', medical:'🏥 Medical industry detected', urgent:'⚡ Urgent tone → Concise recommended', positive:'😊 Positive tone → Friendly recommended', complaint:'⚠️ Complaint → Apologetic recommended', negotiate:'🤝 Negotiation context detected' },
    Japanese:   { japan:'🇯🇵 日本ビジネス文化 · 敬語適用', china:'🇨🇳 中国 · フォーマルスタイル', korean:'🇰🇷 韓国語 · 敬語適用', arabic:'🇸🇦 アラビア語 · イスラム文化', thai:'🇹🇭 タイ · 丁寧な表現', trade:'🏭 貿易/物流業種を検出', legal:'⚖️ 法律業種を検出', it:'💻 IT業種を検出', finance:'💰 金融/会計業種を検出', medical:'🏥 医療業種を検出', urgent:'⚡ 緊急トーン検出', positive:'😊 ポジティブトーン検出', complaint:'⚠️ クレーム検出', negotiate:'🤝 交渉コンテキスト検出' },
    Chinese:    { japan:'🇯🇵 日本商务文化 · 敬语适用', china:'🇨🇳 中文 · 正式风格', korean:'🇰🇷 韩语 · 敬语适用', arabic:'🇸🇦 阿拉伯语 · 伊斯兰文化', thai:'🇹🇭 泰语 · 礼貌表达', trade:'🏭 检测到贸易/物流行业', legal:'⚖️ 检测到法律行业', it:'💻 检测到IT行业', finance:'💰 检测到金融行业', medical:'🏥 检测到医疗行业', urgent:'⚡ 检测到紧急语气', positive:'😊 检测到积极语气', complaint:'⚠️ 检测到投诉', negotiate:'🤝 检测到谈判背景' },
    German:     { japan:'🇯🇵 Japanische Geschäftskultur', china:'🇨🇳 China · Formell', korean:'🇰🇷 Koreanisch · Formell', arabic:'🇸🇦 Arabisch · Islam', thai:'🇹🇭 Thailändisch · Respektvoll', trade:'🏭 Handelsbranche erkannt', legal:'⚖️ Rechtsbranche erkannt', it:'💻 IT-Branche erkannt', finance:'💰 Finanzbranche erkannt', medical:'🏥 Medizinische Branche erkannt', urgent:'⚡ Dringender Ton erkannt', positive:'😊 Positiver Ton erkannt', complaint:'⚠️ Beschwerde erkannt', negotiate:'🤝 Verhandlungskontext erkannt' },
    French:     { japan:'🇯🇵 Culture japonaise · Keigo', china:'🇨🇳 Chine · Style formel', korean:'🇰🇷 Coréen · Formel', arabic:'🇸🇦 Arabe · Culture islamique', thai:'🇹🇭 Thaï · Respectueux', trade:'🏭 Commerce/logistique détecté', legal:'⚖️ Juridique détecté', it:'💻 IT détecté', finance:'💰 Finance détectée', medical:'🏥 Médical détecté', urgent:'⚡ Ton urgent détecté', positive:'😊 Ton positif détecté', complaint:'⚠️ Plainte détectée', negotiate:'🤝 Négociation détectée' },
    Spanish:    { japan:'🇯🇵 Cultura japonesa · Keigo', china:'🇨🇳 China · Formal', korean:'🇰🇷 Coreano · Formal', arabic:'🇸🇦 Árabe · Cultura islámica', thai:'🇹🇭 Tailandés · Respetuoso', trade:'🏭 Comercio/logística detectado', legal:'⚖️ Legal detectado', it:'💻 IT detectado', finance:'💰 Finanzas detectadas', medical:'🏥 Médico detectado', urgent:'⚡ Tono urgente detectado', positive:'😊 Tono positivo detectado', complaint:'⚠️ Queja detectada', negotiate:'🤝 Negociación detectada' },
    Portuguese: { japan:'🇯🇵 Cultura japonesa · Keigo', china:'🇨🇳 China · Formal', korean:'🇰🇷 Coreano · Formal', arabic:'🇸🇦 Árabe · Cultura islâmica', thai:'🇹🇭 Tailandês · Respeitoso', trade:'🏭 Comércio/logística detectado', legal:'⚖️ Jurídico detectado', it:'💻 TI detectado', finance:'💰 Finanças detectadas', medical:'🏥 Médico detectado', urgent:'⚡ Tom urgente detectado', positive:'😊 Tom positivo detectado', complaint:'⚠️ Reclamação detectada', negotiate:'🤝 Negociação detectada' },
    Turkish:    { japan:'🇯🇵 Japon iş kültürü', china:'🇨🇳 Çin · Resmi', korean:'🇰🇷 Korece · Resmi', arabic:'🇸🇦 Arapça · İslam kültürü', thai:'🇹🇭 Tayca · Saygılı', trade:'🏭 Ticaret/lojistik tespit edildi', legal:'⚖️ Hukuk tespit edildi', it:'💻 IT tespit edildi', finance:'💰 Finans tespit edildi', medical:'🏥 Tıp tespit edildi', urgent:'⚡ Acil ton tespit edildi', positive:'😊 Olumlu ton tespit edildi', complaint:'⚠️ Şikayet tespit edildi', negotiate:'🤝 Müzakere bağlamı tespit edildi' },
    Italian:    { japan:'🇯🇵 Cultura giapponese', china:'🇨🇳 Cina · Formale', korean:'🇰🇷 Coreano · Formale', arabic:'🇸🇦 Arabo · Cultura islamica', thai:'🇹🇭 Tailandese · Rispettoso', trade:'🏭 Commercio/logistica rilevato', legal:'⚖️ Legale rilevato', it:'💻 IT rilevato', finance:'💰 Finanza rilevata', medical:'🏥 Medico rilevato', urgent:'⚡ Tono urgente rilevato', positive:'😊 Tono positivo rilevato', complaint:'⚠️ Reclamo rilevato', negotiate:'🤝 Negoziazione rilevata' },
    Arabic:     { japan:'🇯🇵 الثقافة اليابانية', china:'🇨🇳 الصين · رسمي', korean:'🇰🇷 الكورية · رسمي', arabic:'🇸🇦 العربية · ثقافة إسلامية', thai:'🇹🇭 التايلاندية · مهذب', trade:'🏭 تم اكتشاف التجارة', legal:'⚖️ تم اكتشاف القانوني', it:'💻 تم اكتشاف IT', finance:'💰 تم اكتشاف المالية', medical:'🏥 تم اكتشاف الطبي', urgent:'⚡ نبرة عاجلة', positive:'😊 نبرة إيجابية', complaint:'⚠️ شكوى', negotiate:'🤝 سياق تفاوضي' },
    Vietnamese: { japan:'🇯🇵 Văn hóa Nhật Bản', china:'🇨🇳 Trung Quốc · Trang trọng', korean:'🇰🇷 Tiếng Hàn · Trang trọng', arabic:'🇸🇦 Tiếng Ả Rập', thai:'🇹🇭 Tiếng Thái · Lịch sự', trade:'🏭 Phát hiện ngành thương mại', legal:'⚖️ Phát hiện ngành pháp lý', it:'💻 Phát hiện ngành IT', finance:'💰 Phát hiện ngành tài chính', medical:'🏥 Phát hiện ngành y tế', urgent:'⚡ Phát hiện giọng khẩn', positive:'😊 Phát hiện giọng tích cực', complaint:'⚠️ Phát hiện khiếu nại', negotiate:'🤝 Phát hiện đàm phán' },
    Thai:       { japan:'🇯🇵 วัฒนธรรมญี่ปุ่น', china:'🇨🇳 จีน · เป็นทางการ', korean:'🇰🇷 ภาษาเกาหลี', arabic:'🇸🇦 ภาษาอาหรับ', thai:'🇹🇭 ไทย · สุภาพ', trade:'🏭 ตรวจพบการค้า', legal:'⚖️ ตรวจพบกฎหมาย', it:'💻 ตรวจพบ IT', finance:'💰 ตรวจพบการเงิน', medical:'🏥 ตรวจพบการแพทย์', urgent:'⚡ ตรวจพบน้ำเสียงเร่งด่วน', positive:'😊 ตรวจพบน้ำเสียงบวก', complaint:'⚠️ ตรวจพบร้องเรียน', negotiate:'🤝 ตรวจพบการเจรจา' },
    Indonesian: { japan:'🇯🇵 Budaya Jepang', china:'🇨🇳 Tiongkok · Formal', korean:'🇰🇷 Bahasa Korea', arabic:'🇸🇦 Bahasa Arab', thai:'🇹🇭 Bahasa Thai', trade:'🏭 Industri perdagangan terdeteksi', legal:'⚖️ Industri hukum terdeteksi', it:'💻 Industri IT terdeteksi', finance:'💰 Industri keuangan terdeteksi', medical:'🏥 Industri medis terdeteksi', urgent:'⚡ Nada mendesak terdeteksi', positive:'😊 Nada positif terdeteksi', complaint:'⚠️ Keluhan terdeteksi', negotiate:'🤝 Konteks negosiasi terdeteksi' },
  };
  const d = DETECT_I18N[lang] || DETECT_I18N['English'];
  const _csOL = olCurrentPanel ? olCurrentPanel.querySelector('#mm-ol-country') : null;
  const _ecNsOL = emailContent.replace(/\s+/g,''); const _ecLenOL = _ecNsOL.length||1;
  const _hasLangOL = r => { const m = _ecNsOL.match(r); return m && m.length >= 5 && m.length/_ecLenOL >= 0.05; };
  if (_hasLangOL(/[\u3040-\u30ff]/g)) { infos.push(d.japan); if (olSelectedCountry === 'auto') { olSelectedCountry = 'Japan'; if (_csOL) _csOL.value = 'Japan'; } }
  else if (_hasLangOL(/[\u4e00-\u9fff]/g)) { infos.push(d.china); if (olSelectedCountry === 'auto') { olSelectedCountry = 'China'; if (_csOL) _csOL.value = 'China'; } }
  else if (_hasLangOL(/[\uAC00-\uD7AF]/g)) { infos.push(d.korean); if (olSelectedCountry === 'auto') { olSelectedCountry = 'Korea'; if (_csOL) _csOL.value = 'Korea'; } }
  else if (_hasLangOL(/[\u0600-\u06FF]/g)) { infos.push(d.arabic); if (olSelectedCountry === 'auto') { olSelectedCountry = 'Arabia'; if (_csOL) _csOL.value = 'Arabia'; } }
  else if (_hasLangOL(/[\u0E00-\u0E7F]/g)) { infos.push(d.thai); }
  if (/lc|letter of credit|fob|cif|incoterm|invoice|shipping|customs|freight/.test(text)) infos.push(d.trade);
  else if (/contract|agreement|clause|legal|attorney|liability/.test(text)) infos.push(d.legal);
  else if (/api|sdk|bug|deploy|server|software|development/.test(text)) infos.push(d.it);
  else if (/invoice|payment|tax|vat|accounting|revenue/.test(text)) infos.push(d.finance);
  else if (/patient|diagnosis|treatment|medical|hospital/.test(text)) infos.push(d.medical);
  if (/urgent|asap|immediately|critical|emergency/.test(text)) {
    infos.push(d.urgent);
    if (olSelectedTone==='professional') { olSelectedTone='concise'; olCurrentPanel.querySelector('#mm-ol-tone').value='concise'; }
  } else if (/thank|appreciate|grateful|wonderful/.test(text)) { infos.push(d.positive); }
  else if (/complain|disappointed|unacceptable|issue|problem/.test(text)) {
    infos.push(d.complaint);
    if (olSelectedTone==='professional') { olSelectedTone='apologetic'; olCurrentPanel.querySelector('#mm-ol-tone').value='apologetic'; }
  } else if (/negotiate|price|discount|offer|proposal/.test(text)) { infos.push(d.negotiate); }
  const detectEl = olCurrentPanel.querySelector('#mm-ol-detect-info');
  if (infos.length > 0) { detectEl.style.display='block'; detectEl.innerHTML=infos.join('<br>'); } else detectEl.style.display='none';
}

// ===== 태스크/일정 추출 =====
function extractTasksAndDatesOL(emailContent, lang) {
  if (!olCurrentPanel) return;
  const taskItems = [];
  const text = emailContent;
  const textL = text.toLowerCase();
  const ui = getUILangOL(lang);

  const ACT_OL = {
    Korean:     { meeting:'미팅', deadline:'마감/팔로업', send:'보내기', confirm:'확인 요청됨', calendar:'+ 캘린더 →', meetingConfirm:'미팅/콜 언급 — 시간 확인 필요', deadlineConfirm:'마감일 언급 — 날짜 확인 필요' },
    English:    { meeting:'Meeting', deadline:'Deadline/Follow-up', send:'Send', confirm:'Confirmation requested', calendar:'+ Calendar →', meetingConfirm:'Meeting/Call mentioned — confirm time', deadlineConfirm:'Deadline mentioned — confirm date' },
    Japanese:   { meeting:'ミーティング', deadline:'締め切り', send:'送信', confirm:'確認が求められています', calendar:'+ カレンダー →', meetingConfirm:'ミーティング/通話 — 時間を確認', deadlineConfirm:'締め切りが言及されています' },
    Chinese:    { meeting:'会议', deadline:'截止日期', send:'发送', confirm:'需要确认', calendar:'+ 日历 →', meetingConfirm:'提到会议 — 请确认时间', deadlineConfirm:'提到截止日期' },
    German:     { meeting:'Meeting', deadline:'Frist', send:'Senden', confirm:'Bestätigung angefordert', calendar:'+ Kalender →', meetingConfirm:'Meeting erwähnt — Zeit bestätigen', deadlineConfirm:'Frist erwähnt' },
    French:     { meeting:'Réunion', deadline:'Échéance', send:'Envoyer', confirm:'Confirmation demandée', calendar:'+ Agenda →', meetingConfirm:'Réunion mentionnée — confirmer', deadlineConfirm:'Échéance mentionnée' },
    Spanish:    { meeting:'Reunión', deadline:'Plazo', send:'Enviar', confirm:'Confirmación solicitada', calendar:'+ Calendario →', meetingConfirm:'Reunión mencionada — confirmar', deadlineConfirm:'Plazo mencionado' },
    Portuguese: { meeting:'Reunião', deadline:'Prazo', send:'Enviar', confirm:'Confirmação solicitada', calendar:'+ Calendário →', meetingConfirm:'Reunião mencionada — confirmar', deadlineConfirm:'Prazo mencionado' },
    Turkish:    { meeting:'Toplantı', deadline:'Son tarih', send:'Gönder', confirm:'Onay istendi', calendar:'+ Takvim →', meetingConfirm:'Toplantı belirtildi — zamanı onaylayın', deadlineConfirm:'Son tarih belirtildi' },
    Italian:    { meeting:'Riunione', deadline:'Scadenza', send:'Invia', confirm:'Conferma richiesta', calendar:'+ Calendario →', meetingConfirm:'Riunione menzionata — confermare', deadlineConfirm:'Scadenza menzionata' },
    Arabic:     { meeting:'اجتماع', deadline:'الموعد النهائي', send:'إرسال', confirm:'تأكيد مطلوب', calendar:'+ تقويم →', meetingConfirm:'تم ذكر اجتماع — تأكيد الوقت', deadlineConfirm:'تم ذكر الموعد النهائي' },
    Vietnamese: { meeting:'Cuộc họp', deadline:'Hạn chót', send:'Gửi', confirm:'Yêu cầu xác nhận', calendar:'+ Lịch →', meetingConfirm:'Đã đề cập cuộc họp', deadlineConfirm:'Đã đề cập hạn chót' },
    Thai:       { meeting:'การประชุม', deadline:'กำหนดเวลา', send:'ส่ง', confirm:'ขอการยืนยัน', calendar:'+ ปฏิทิน →', meetingConfirm:'กล่าวถึงการประชุม', deadlineConfirm:'กล่าวถึงกำหนดเวลา' },
    Indonesian: { meeting:'Rapat', deadline:'Tenggat', send:'Kirim', confirm:'Konfirmasi diperlukan', calendar:'+ Kalender →', meetingConfirm:'Rapat disebutkan — konfirmasi', deadlineConfirm:'Tenggat disebutkan' },
  };
  const a = ACT_OL[lang] || ACT_OL['English'];
  const dateLocale = {Korean:'ko-KR',Japanese:'ja-JP',Chinese:'zh-CN',German:'de-DE',French:'fr-FR',Portuguese:'pt-BR',Spanish:'es-ES',Arabic:'ar-SA',Turkish:'tr-TR',Italian:'it-IT',Vietnamese:'vi-VN',Thai:'th-TH',Indonesian:'id-ID'}[lang]||'en-US';

  // 날짜 파싱 (간단버전)
  const hasMeeting = /meeting|call|conference|미팅|통화|회의|会议|ミーティング/.test(textL);
  const hasDeadline = /deadline|due date|마감|기한|締め切り/.test(textL);
  const hasDate = /monday|tuesday|wednesday|thursday|friday|tomorrow|next week|내일|다음\s*주|월요일|화요일|수요일|목요일|금요일|\d{1,2}월\s*\d{1,2}일|october|november|december|january/i.test(text);

  if (hasMeeting && hasDate) {
    taskItems.push(`<div style="display:flex;align-items:center;justify-content:space-between;background:#e8f0fe;border-radius:8px;padding:7px 10px;font-size:11px"><span>📅 ${a.meeting}</span><a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(a.meeting)}" target="_blank" style="font-size:10px;color:#1a73e8;font-weight:600;text-decoration:none">${a.calendar}</a></div>`);
  } else if (hasMeeting) {
    taskItems.push(`<div style="background:#e8f0fe;border-radius:8px;padding:7px 10px;font-size:11px">📞 ${a.meetingConfirm}</div>`);
  } else if (hasDate) {
    taskItems.push(`<div style="display:flex;align-items:center;justify-content:space-between;background:#e8f0fe;border-radius:8px;padding:7px 10px;font-size:11px"><span>📅 ${a.deadline}</span><a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(a.deadline)}" target="_blank" style="font-size:10px;color:#1a73e8;font-weight:600;text-decoration:none">${a.calendar}</a></div>`);
  }

  if (hasDeadline && !hasDate) {
    taskItems.push(`<div style="background:#fff8e1;border-radius:8px;padding:7px 10px;font-size:11px;color:#b8860b">⏰ ${a.deadlineConfirm}</div>`);
  }

  const docMatch = text.match(/please (?:send|provide|forward)\s+(?:us\s+|me\s+)?(?:the\s+|a\s+)?([a-zA-Z가-힣\s]{3,40})|kindly (?:send|provide)\s+(?:the\s+|a\s+)?([a-zA-Z가-힣\s]{3,40})|보내주세요|첨부해주|제출해주/i);
  if (docMatch) {
    const what = (docMatch[1]||docMatch[2]||'document').trim().slice(0,40);
    taskItems.push(`<div style="background:#f3e5f5;border-radius:8px;padding:7px 10px;font-size:11px;color:#6a1b9a">📎 ${a.send}: <strong>${escapeHtmlOL(what)}</strong></div>`);
  }

  if (/please confirm|kindly confirm|확인해주|검토해주|please review/.test(textL)) {
    taskItems.push(`<div style="background:#e8f5e9;border-radius:8px;padding:7px 10px;font-size:11px;color:#2e7d32">✅ ${a.confirm}</div>`);
  }

  const tasksEl = olCurrentPanel.querySelector('#mm-ol-tasks');
  const tasksList = olCurrentPanel.querySelector('#mm-ol-tasks-list');
  if (tasksList) tasksList.innerHTML = '';
  if (taskItems.length > 0) {
    if (tasksEl) tasksEl.style.display='block';
    if (tasksList) tasksList.innerHTML = taskItems.join('');
  } else {
    if (tasksEl) tasksEl.style.display='none';
  }
}

// ===== 글자수 카운터 =====
function updateCharCountOL() {
  if (!olCurrentPanel) return;
  const output = olCurrentPanel.querySelector('#mm-ol-output');
  const counter = olCurrentPanel.querySelector('#mm-ol-char-count');
  if (output && counter) { const len=output.value.length; counter.textContent=`${len} chars`; counter.style.color=len>500?'#e37400':'#9aa0a6'; }
}

// ===== 플로팅 버튼 =====
function addOutlookFloatingBtn() {
  if (document.querySelector('#mm-ol-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'mm-ol-fab';
  fab.title = 'MailMind AI Reply';
  fab.innerHTML = '<div style="font-size:16px;line-height:1">✦</div><div style="font-size:9px;margin-top:1px">AI</div>';
  fab.style.cssText = `position:fixed;right:16px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:none;background:linear-gradient(135deg,#e91e8c,#ff6b9d);color:#fff;cursor:pointer;z-index:999997;box-shadow:0 4px 16px rgba(233,30,140,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;`;
  fab.addEventListener('click', () => {
    const existing = document.querySelector('#mm-ol-panel');
    if (existing) { removeOLPanel(); fab.style.display='flex'; } else { fab.style.display='none'; createOutlookPanel(); }
  });
  document.body.appendChild(fab);

  // Compose FAB
  if (!document.querySelector('#mm-ol-compose-fab')) {
    const composeFab = document.createElement('button');
    composeFab.id = 'mm-ol-compose-fab';
    composeFab.title = 'MailMind AI 새 메일 작성';
    composeFab.innerHTML = '<div style="font-size:16px;line-height:1">✍</div><div style="font-size:9px;margin-top:1px">작성</div>';
    composeFab.style.cssText = `position:fixed;right:16px;top:calc(50% + 56px);transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:none;background:linear-gradient(135deg,#7c4dff,#b388ff);color:#fff;cursor:pointer;z-index:999997;box-shadow:0 4px 16px rgba(124,77,255,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;`;
    composeFab.addEventListener('click', () => openOutlookComposePanel());
    document.body.appendChild(composeFab);
  }
}

// ===== Outlook Compose Panel (Gmail과 동일한 구조) =====

const COMPOSE_I18N_OL = {
  Korean:     { tab1:'✨ AI 작성', tab2:'✏️ 손질', composePlaceholder:'예: 거래처에 납품 일정 확인 요청. 다음 주까지 답변 필요.', refinePlaceholder:'손질할 이메일을 입력하세요.', toneLabel:'톤', langLabel:'언어', composeBtn:'✨ AI 이메일 작성', refineBtn:'✏️ 손질', generatingText:'⏳ 작성 중...', subjectLabel:'제목', bodyLabel:'본문', insertBtn:'✉️ Outlook 삽입', copyBtn:'📋 복사', regenBtn:'🔄', translateLabel:'번역', usageText:(u,l)=>`이번 달 ${u}/${l}회`, errEmpty:'내용을 입력해주세요.', errLimit:'이번 달 한도 초과. 업그레이드해주세요.', errFail:'생성 실패. 잠시 후 다시 시도해주세요.' },
  English:    { tab1:'✨ AI Write', tab2:'✏️ Refine', composePlaceholder:'e.g. Ask supplier to confirm delivery by next Tuesday.', refinePlaceholder:'Paste the email you want to refine.', toneLabel:'Tone', langLabel:'Language', composeBtn:'✨ Compose Email', refineBtn:'✏️ Refine Email', generatingText:'⏳ Writing...', subjectLabel:'Subject', bodyLabel:'Body', insertBtn:'✉️ Insert to Outlook', copyBtn:'📋 Copy', regenBtn:'🔄', translateLabel:'Translate', usageText:(u,l)=>`${u}/${l} this month`, errEmpty:'Please enter content.', errLimit:'Monthly limit reached. Please upgrade.', errFail:'Generation failed. Please try again.' },
  Japanese:   { tab1:'✨ AI作成', tab2:'✏️ 修正', composePlaceholder:'例：取引先に納品日程の確認を依頼。来週火曜日までに返信が必要。', refinePlaceholder:'修正するメールを入力してください。', toneLabel:'トーン', langLabel:'言語', composeBtn:'✨ メール作成', refineBtn:'✏️ メール修正', generatingText:'⏳ 作成中...', subjectLabel:'件名', bodyLabel:'本文', insertBtn:'✉️ Outlookに挿入', copyBtn:'📋 コピー', regenBtn:'🔄', translateLabel:'翻訳', usageText:(u,l)=>`今月 ${u}/${l}回`, errEmpty:'内容を入力してください。', errLimit:'月間上限に達しました。', errFail:'生成に失敗しました。' },
  Chinese:    { tab1:'✨ AI写信', tab2:'✏️ 润色', composePlaceholder:'例：请求供应商确认下周二前的交货时间。', refinePlaceholder:'粘贴要润色的邮件草稿。', toneLabel:'语气', langLabel:'语言', composeBtn:'✨ 撰写邮件', refineBtn:'✏️ 润色邮件', generatingText:'⏳ 撰写中...', subjectLabel:'主题', bodyLabel:'正文', insertBtn:'✉️ 插入Outlook', copyBtn:'📋 复制', regenBtn:'🔄', translateLabel:'翻译', usageText:(u,l)=>`本月 ${u}/${l}次`, errEmpty:'请输入内容。', errLimit:'本月使用次数已达上限。', errFail:'生成失败，请稍后重试。' },
  Spanish:    { tab1:'✨ IA Redactar', tab2:'✏️ Refinar', composePlaceholder:'Ej: Solicitar confirmación de entrega al proveedor para el próximo martes.', refinePlaceholder:'Pega el borrador que quieres refinar.', toneLabel:'Tono', langLabel:'Idioma', composeBtn:'✨ Redactar correo', refineBtn:'✏️ Refinar correo', generatingText:'⏳ Redactando...', subjectLabel:'Asunto', bodyLabel:'Cuerpo', insertBtn:'✉️ Insertar en Outlook', copyBtn:'📋 Copiar', regenBtn:'🔄', translateLabel:'Traducir', usageText:(u,l)=>`${u}/${l} este mes`, errEmpty:'Por favor ingresa contenido.', errLimit:'Límite mensual alcanzado.', errFail:'Error al generar.' },
  French:     { tab1:'✨ IA Rédiger', tab2:'✏️ Affiner', composePlaceholder:'Ex: Demander au fournisseur de confirmer la livraison avant mardi.', refinePlaceholder:'Collez le brouillon à affiner.', toneLabel:'Ton', langLabel:'Langue', composeBtn:'✨ Rédiger l\'email', refineBtn:'✏️ Affiner', generatingText:'⏳ Rédaction...', subjectLabel:'Objet', bodyLabel:'Corps', insertBtn:'✉️ Insérer dans Outlook', copyBtn:'📋 Copier', regenBtn:'🔄', translateLabel:'Traduire', usageText:(u,l)=>`${u}/${l} ce mois`, errEmpty:'Veuillez saisir du contenu.', errLimit:'Limite mensuelle atteinte.', errFail:'Échec de la génération.' },
  German:     { tab1:'✨ KI Verfassen', tab2:'✏️ Verfeinern', composePlaceholder:'Z.B.: Lieferant um Bestätigung bis Dienstag bitten.', refinePlaceholder:'Entwurf zum Verfeinern einfügen.', toneLabel:'Ton', langLabel:'Sprache', composeBtn:'✨ E-Mail verfassen', refineBtn:'✏️ Verfeinern', generatingText:'⏳ Wird verfasst...', subjectLabel:'Betreff', bodyLabel:'Text', insertBtn:'✉️ In Outlook einfügen', copyBtn:'📋 Kopieren', regenBtn:'🔄', translateLabel:'Übersetzen', usageText:(u,l)=>`${u}/${l} diesen Monat`, errEmpty:'Bitte Inhalt eingeben.', errLimit:'Monatliches Limit erreicht.', errFail:'Generierung fehlgeschlagen.' },
  Portuguese: { tab1:'✨ IA Redigir', tab2:'✏️ Refinar', composePlaceholder:'Ex: Solicitar confirmação de entrega ao fornecedor até terça.', refinePlaceholder:'Cole o rascunho para refinar.', toneLabel:'Tom', langLabel:'Idioma', composeBtn:'✨ Redigir e-mail', refineBtn:'✏️ Refinar', generatingText:'⏳ Redigindo...', subjectLabel:'Assunto', bodyLabel:'Corpo', insertBtn:'✉️ Inserir no Outlook', copyBtn:'📋 Copiar', regenBtn:'🔄', translateLabel:'Traduzir', usageText:(u,l)=>`${u}/${l} este mês`, errEmpty:'Por favor insira conteúdo.', errLimit:'Limite mensal atingido.', errFail:'Falha na geração.' },
  Arabic:     { tab1:'✨ كتابة AI', tab2:'✏️ تحسين', composePlaceholder:'مثال: طلب تأكيد موعد التسليم قبل الثلاثاء.', refinePlaceholder:'الصق المسودة للتحسين.', toneLabel:'النبرة', langLabel:'اللغة', composeBtn:'✨ كتابة البريد', refineBtn:'✏️ تحسين', generatingText:'⏳ جارٍ الكتابة...', subjectLabel:'الموضوع', bodyLabel:'النص', insertBtn:'✉️ إدراج في Outlook', copyBtn:'📋 نسخ', regenBtn:'🔄', translateLabel:'ترجمة', usageText:(u,l)=>`${u}/${l} هذا الشهر`, errEmpty:'يرجى إدخال محتوى.', errLimit:'تم الوصول إلى الحد الشهري.', errFail:'فشل الإنشاء.' },
  Vietnamese: { tab1:'✨ AI Soạn', tab2:'✏️ Tinh chỉnh', composePlaceholder:'VD: Yêu cầu nhà cung cấp xác nhận lịch giao hàng trước thứ Ba.', refinePlaceholder:'Dán bản nháp cần tinh chỉnh.', toneLabel:'Giọng điệu', langLabel:'Ngôn ngữ', composeBtn:'✨ Soạn email', refineBtn:'✏️ Tinh chỉnh', generatingText:'⏳ Đang soạn...', subjectLabel:'Chủ đề', bodyLabel:'Nội dung', insertBtn:'✉️ Chèn vào Outlook', copyBtn:'📋 Sao chép', regenBtn:'🔄', translateLabel:'Dịch', usageText:(u,l)=>`${u}/${l} tháng này`, errEmpty:'Vui lòng nhập nội dung.', errLimit:'Đã đạt giới hạn tháng.', errFail:'Tạo thất bại.' },
  Thai:       { tab1:'✨ AI เขียน', tab2:'✏️ ปรับแต่ง', composePlaceholder:'เช่น: ขอให้ซัพพลายเออร์ยืนยันกำหนดส่งก่อนวันอังคาร', refinePlaceholder:'วางร่างอีเมลที่ต้องการปรับแต่ง', toneLabel:'โทน', langLabel:'ภาษา', composeBtn:'✨ เขียนอีเมล', refineBtn:'✏️ ปรับแต่ง', generatingText:'⏳ กำลังเขียน...', subjectLabel:'หัวข้อ', bodyLabel:'เนื้อหา', insertBtn:'✉️ แทรกใน Outlook', copyBtn:'📋 คัดลอก', regenBtn:'🔄', translateLabel:'แปลภาษา', usageText:(u,l)=>`${u}/${l} เดือนนี้`, errEmpty:'กรุณาใส่เนื้อหา', errLimit:'ถึงขีดจำกัดรายเดือนแล้ว', errFail:'การสร้างล้มเหลว' },
  Indonesian: { tab1:'✨ AI Tulis', tab2:'✏️ Poles', composePlaceholder:'Cth: Minta konfirmasi jadwal pengiriman dari pemasok sebelum Selasa.', refinePlaceholder:'Tempel draf yang ingin dipoles.', toneLabel:'Nada', langLabel:'Bahasa', composeBtn:'✨ Tulis Email', refineBtn:'✏️ Poles', generatingText:'⏳ Sedang menulis...', subjectLabel:'Subjek', bodyLabel:'Isi', insertBtn:'✉️ Masukkan ke Outlook', copyBtn:'📋 Salin', regenBtn:'🔄', translateLabel:'Terjemahkan', usageText:(u,l)=>`${u}/${l} bulan ini`, errEmpty:'Silakan masukkan konten.', errLimit:'Batas bulanan tercapai.', errFail:'Gagal menghasilkan.' },
  Italian:    { tab1:'✨ IA Scrivi', tab2:'✏️ Rifinisci', composePlaceholder:'Es: Chiedere al fornitore conferma della consegna entro martedì.', refinePlaceholder:'Incolla la bozza da rifinire.', toneLabel:'Tono', langLabel:'Lingua', composeBtn:'✨ Scrivi email', refineBtn:'✏️ Rifinisci', generatingText:'⏳ Scrittura...', subjectLabel:'Oggetto', bodyLabel:'Corpo', insertBtn:'✉️ Inserisci in Outlook', copyBtn:'📋 Copia', regenBtn:'🔄', translateLabel:'Traduci', usageText:(u,l)=>`${u}/${l} questo mese`, errEmpty:'Inserisci il contenuto.', errLimit:'Limite mensile raggiunto.', errFail:'Generazione fallita.' },
  Turkish:    { tab1:'✨ AI Yaz', tab2:'✏️ İyileştir', composePlaceholder:'Örn: Tedarikçiden Salı\'ya kadar teslimat takvimine onay isteyin.', refinePlaceholder:'İyileştirmek istediğiniz taslağı yapıştırın.', toneLabel:'Ton', langLabel:'Dil', composeBtn:'✨ E-posta Yaz', refineBtn:'✏️ İyileştir', generatingText:'⏳ Yazılıyor...', subjectLabel:'Konu', bodyLabel:'İçerik', insertBtn:'✉️ Outlook\'a Ekle', copyBtn:'📋 Kopyala', regenBtn:'🔄', translateLabel:'Çevir', usageText:(u,l)=>`Bu ay ${u}/${l}`, errEmpty:'Lütfen içerik girin.', errLimit:'Aylık limit doldu.', errFail:'Oluşturma başarısız.' },
};

const COMPOSE_TONES_OL = [
  { value:'professional', ko:'업무적',   en:'Professional', ja:'ビジネス', zh:'正式',    es:'Profesional', fr:'Professionnel', de:'Professionell', pt:'Profissional', ar:'رسمي',      vi:'Chuyên nghiệp', th:'เป็นทางการ',  id:'Profesional', it:'Professionale', tr:'Profesyonel' },
  { value:'friendly',     ko:'친근하게', en:'Friendly',     ja:'フレンドリー', zh:'友好', es:'Amigable',    fr:'Amical',        de:'Freundlich',   pt:'Amigável',    ar:'ودي',       vi:'Thân thiện',    th:'เป็นกันเอง',  id:'Ramah',       it:'Amichevole',    tr:'Samimi' },
  { value:'concise',      ko:'간결하게', en:'Concise',      ja:'簡潔',     zh:'简洁',    es:'Conciso',     fr:'Concis',        de:'Prägnant',     pt:'Conciso',     ar:'موجز',      vi:'Súc tích',      th:'กระชับ',      id:'Singkat',     it:'Conciso',       tr:'Kısa' },
  { value:'detailed',     ko:'상세하게', en:'Detailed',     ja:'詳細',     zh:'详细',    es:'Detallado',   fr:'Détaillé',      de:'Detailliert',  pt:'Detalhado',   ar:'مفصل',      vi:'Chi tiết',      th:'ละเอียด',     id:'Terperinci',  it:'Dettagliato',   tr:'Ayrıntılı' },
  { value:'decline',      ko:'거절하기', en:'Decline',      ja:'断り',     zh:'拒绝',    es:'Declinar',    fr:'Décliner',      de:'Ablehnen',     pt:'Recusar',     ar:'رفض',       vi:'Từ chối',       th:'ปฏิเสธ',      id:'Tolak',       it:'Rifiutare',     tr:'Reddet' },
  { value:'thankful',     ko:'감사하게', en:'Thankful',     ja:'感謝',     zh:'感谢',    es:'Agradecido',  fr:'Reconnaissant', de:'Dankbar',      pt:'Grato',       ar:'ممتنن',     vi:'Cảm ơn',        th:'ขอบคุณ',      id:'Berterima kasih', it:'Grato',      tr:'Teşekkür' },
];

const COMPOSE_LANGS_OL = [
  { value:'Korean',     flag:'🇰🇷', label:'한국어' },    { value:'English',    flag:'🇺🇸', label:'English' },
  { value:'Japanese',   flag:'🇯🇵', label:'日本語' },    { value:'Chinese',    flag:'🇨🇳', label:'中文' },
  { value:'Spanish',    flag:'🇪🇸', label:'Español' },   { value:'French',     flag:'🇫🇷', label:'Français' },
  { value:'German',     flag:'🇩🇪', label:'Deutsch' },   { value:'Portuguese', flag:'🇧🇷', label:'Português' },
  { value:'Arabic',     flag:'🇸🇦', label:'العربية' },   { value:'Vietnamese', flag:'🇻🇳', label:'Tiếng Việt' },
  { value:'Thai',       flag:'🇹🇭', label:'ภาษาไทย' },  { value:'Indonesian', flag:'🇮🇩', label:'Indonesia' },
  { value:'Italian',    flag:'🇮🇹', label:'Italiano' },  { value:'Turkish',    flag:'🇹🇷', label:'Türkçe' },
];

async function openOutlookComposePanel() {
  const existing = document.getElementById('mm-ol-compose-panel');
  if (existing) { existing.remove(); return; }

  const userData = await getUserDataOL();
  const userInfo = await new Promise(r => chrome.storage.sync.get(['userInfo'], d => r(d.userInfo || '')));
  // myLanguage를 직접 storage에서 다시 읽어 확실히 적용
  const storedLang = await new Promise(r => chrome.storage.sync.get(['myLanguage'], d => r(d.myLanguage || 'Korean')));
  let uiLang = storedLang;
  console.log('[MailMind Compose] uiLang:', uiLang, '/ storedLang:', storedLang, '/ userData.myLanguage:', userData.myLanguage);

  // 작성 출력 언어: 이전 선택값 유지, 처음이면 UI언어 기본값
  if (!olComposeOutputLang) olComposeOutputLang = uiLang;
  if (!olTransLang) olTransLang = olComposeOutputLang;
  let curToneOL = 'professional';
  let curMode = 'compose';
  let toneDropOpenOL = false;
  let langDropOpenOL = false;
  let transLangDropOpenOL = false;
  let _olCpVersions = [];
  let _olCpCurrentVerIdx = 0;
  const COMPARE_BTN_LABELS_OL = { Korean:'🔀 비교 3종', English:'🔀 Compare ×3', Japanese:'🔀 3種比較', Chinese:'🔀 比较×3', Spanish:'🔀 Comparar ×3', French:'🔀 Comparer ×3', German:'🔀 Vergl. ×3', Portuguese:'🔀 Comparar ×3', Arabic:'🔀 مقارنة ×3', Vietnamese:'🔀 So sánh ×3', Thai:'🔀 เปรียบ ×3', Indonesian:'🔀 Bandingan ×3', Italian:'🔀 Confronta ×3', Turkish:'🔀 Karşılaştır ×3' };

  function T() { return COMPOSE_I18N_OL[uiLang] || COMPOSE_I18N_OL['English']; }

  function toneLabelOL(val) {
    const item = COMPOSE_TONES_OL.find(t => t.value === val);
    if (!item) return val;
    const map = { Korean:'ko', English:'en', Japanese:'ja', Chinese:'zh', Spanish:'es', French:'fr', German:'de', Portuguese:'pt', Arabic:'ar', Vietnamese:'vi', Thai:'th', Indonesian:'id', Italian:'it', Turkish:'tr' };
    const key = map[uiLang] || 'en';
    return item[key] || item.en;
  }

  function _olRestoreGen(savedSubj, savedOut, savedResVis) {
    if (savedResVis !== 'block') return;
    const _r = panel.querySelector('#mm-ol-cp-result');
    if (_r) _r.style.display = 'block';
    const _sj = panel.querySelector('#mm-ol-cp-subject');
    if (_sj !== null) _sj.value = savedSubj || '';
    const _op = panel.querySelector('#mm-ol-cp-output');
    if (_op !== null) _op.value = savedOut || '';
    if (_olCpVersions.length > 1) {
      const _vt = panel.querySelector('#mm-ol-cp-ver-tabs');
      if (_vt) {
        _vt.style.display = 'flex';
        const _fpTlRstOL = panel.querySelector('#mm-ol-tl-wrap');
        if (_fpTlRstOL) { _fpTlRstOL.style.pointerEvents = 'none'; _fpTlRstOL.style.opacity = '0.4'; }
        _vt.innerHTML = _olCpVersions.map((v, i) =>
          `<button class="mm-ol-cp-ver-btn" data-idx="${i}" style="padding:5px 10px;border-radius:16px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${i===_olCpCurrentVerIdx?'#f57c00':'#e0e0e0'};background:${i===_olCpCurrentVerIdx?'#fff3e0':'#f5f5f5'};color:${i===_olCpCurrentVerIdx?'#f57c00':'#666'};font-family:inherit">${toneLabelOL(v.tone)}</button>`
        ).join('') + `<button id="mm-ol-cp-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-family:inherit;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
        _vt.querySelectorAll('.mm-ol-cp-ver-btn').forEach(vBtn => {
          vBtn.addEventListener('click', () => {
            _olCpCurrentVerIdx = parseInt(vBtn.dataset.idx);
            const sj = panel.querySelector('#mm-ol-cp-subject');
            const op = panel.querySelector('#mm-ol-cp-output');
            if (sj) sj.value = _olCpVersions[_olCpCurrentVerIdx].subject;
            if (op) op.value = _olCpVersions[_olCpCurrentVerIdx].body;
            _vt.querySelectorAll('.mm-ol-cp-ver-btn').forEach((b, j) => {
              b.style.borderColor = j === _olCpCurrentVerIdx ? '#f57c00' : '#e0e0e0';
              b.style.background = j === _olCpCurrentVerIdx ? '#fff3e0' : '#f5f5f5';
              b.style.color = j === _olCpCurrentVerIdx ? '#f57c00' : '#666';
            });
          });
        });
        _vt.querySelector('#mm-ol-cp-ver-confirm')?.addEventListener('click', () => {
          _olCpVersions = []; _olCpCurrentVerIdx = 0;
          _vt.style.display = 'none'; _vt.innerHTML = '';
          const _fpTlRstOL2 = panel.querySelector('#mm-ol-tl-wrap');
          if (_fpTlRstOL2) { _fpTlRstOL2.style.pointerEvents = ''; _fpTlRstOL2.style.opacity = ''; }
        });
      }
    }
  }

  function currentLangItemOL() {
    return COMPOSE_LANGS_OL.find(l => l.value === olComposeOutputLang) || COMPOSE_LANGS_OL[0];
  }

  function toneDropdownOL() {
    const curLabel = toneLabelOL(curToneOL);
    return `<div style="position:relative">
      <button id="mm-ol-cp-tone-trigger" style="display:flex;align-items:center;gap:6px;padding:6px 12px 6px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid #e91e8c;background:#fff5fb;color:#e91e8c;font-family:inherit;transition:all .12s;width:100%">
        <span style="flex:1;text-align:left">${curLabel}</span>
        <span id="mm-ol-cp-tone-arrow" style="font-size:10px;transition:transform .15s;${toneDropOpenOL ? 'transform:rotate(180deg)' : ''}">▼</span>
      </button>
      <div id="mm-ol-cp-tone-list" style="display:${toneDropOpenOL ? 'block' : 'none'};position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e91e8c;border-radius:10px;box-shadow:0 4px 20px rgba(233,30,140,.15);z-index:101;overflow:hidden">
        ${COMPOSE_TONES_OL.map(item => `<button data-val="${item.value}" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;font-size:12px;font-weight:${item.value === curToneOL ? '700' : '500'};cursor:pointer;border:none;font-family:inherit;text-align:left;background:${item.value === curToneOL ? '#fce4f3' : '#fff'};color:${item.value === curToneOL ? '#e91e8c' : '#333'}">${toneLabelOL(item.value)}${item.value === curToneOL ? ' <span style="margin-left:auto;color:#e91e8c">✓</span>' : ''}</button>`).join('')}
      </div>
    </div>`;
  }

  function langDropdownOL() {
    const cur = currentLangItemOL();
    return `<div style="position:relative">
      <button id="mm-ol-cp-lang-trigger" style="display:flex;align-items:center;gap:6px;padding:6px 12px 6px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid #e91e8c;background:#fff5fb;color:#e91e8c;font-family:inherit;transition:all .12s;width:100%">
        <span style="font-size:16px;line-height:1">${cur.flag}</span>
        <span style="flex:1;text-align:left">${cur.label}</span>
        <span style="font-size:10px;transition:transform .15s;${langDropOpenOL ? 'transform:rotate(180deg)' : ''}">▼</span>
      </button>
      <div id="mm-ol-cp-lang-list" style="display:${langDropOpenOL ? 'block' : 'none'};position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e91e8c;border-radius:10px;box-shadow:0 4px 20px rgba(233,30,140,.15);z-index:100;overflow:hidden;max-height:220px;overflow-y:auto">
        ${COMPOSE_LANGS_OL.map(l => `<button data-val="${l.value}" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;font-size:12px;font-weight:${l.value === uiLang ? '700' : '500'};cursor:pointer;border:none;font-family:inherit;text-align:left;background:${l.value === uiLang ? '#fce4f3' : '#fff'};color:${l.value === uiLang ? '#e91e8c' : '#333'}"><span style="font-size:16px">${l.flag}</span><span>${l.label}</span>${l.value === uiLang ? '<span style="margin-left:auto;color:#e91e8c">✓</span>' : ''}</button>`).join('')}
      </div>
    </div>`;
  }

  function flagScrollOL(sel) {
    const selItem = COMPOSE_LANGS_OL.find(l => l.value === sel) || COMPOSE_LANGS_OL[0];
    return `<div id="mm-ol-tl-wrap" style="position:relative;">
      <button id="mm-ol-tl-trigger" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:1.5px solid #e8e8e8;border-radius:8px;background:#fff;font-size:13px;cursor:pointer;font-family:inherit;box-sizing:border-box;">
        <span style="font-size:15px">${selItem.flag}</span>
        <span style="font-size:12px;color:#333;flex:1;text-align:left">${selItem.label}</span>
        <span id="mm-ol-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>
      </button>
      <div id="mm-ol-tl-list" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e8e8e8;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:9999;overflow:hidden;max-height:180px;overflow-y:auto;">
        ${COMPOSE_LANGS_OL.map(l => `<button data-val="${l.value}" class="mm-ol-tl-btn" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:none;border-bottom:1px solid #f0f0f0;background:${l.value === sel ? '#fce4f3' : '#fff'};font-size:13px;cursor:pointer;text-align:left;font-family:inherit;box-sizing:border-box;"><span style="font-size:15px">${l.flag}</span><span style="font-size:12px;color:#333">${l.label}</span>${l.value === sel ? '<span style="margin-left:auto;color:#e91e8c">✓</span>' : ''}</button>`).join('')}
      </div>
    </div>`;
  }

  const panel = document.createElement('div');
  panel.id = 'mm-ol-compose-panel';
  panel.style.cssText = `position:fixed;right:16px;bottom:80px;width:360px;max-height:88vh;background:#fff;border:1.5px solid #e91e8c;border-radius:14px;box-shadow:0 8px 40px rgba(233,30,140,.18);z-index:999999;display:flex;flex-direction:column;font-family:Google Sans,Arial,sans-serif;font-size:13px;overflow:hidden`;

  // 드래그 기능
  function makeDraggableOL(panelEl, handleId) {
    let isDragging = false, startX, startY, startLeft, startTop;
    panelEl.addEventListener('mousedown', (e) => {
      const handle = panelEl.querySelector(handleId);
      if (!handle || !handle.contains(e.target)) return;
      if (e.target.closest('button')) return;
      isDragging = true;
      const rect = panelEl.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left; startTop = rect.top;
      panelEl.style.right = 'auto';
      panelEl.style.bottom = 'auto';
      panelEl.style.left = startLeft + 'px';
      panelEl.style.top = startTop + 'px';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      panelEl.style.left = Math.max(0, Math.min(window.innerWidth - panelEl.offsetWidth, startLeft + dx)) + 'px';
      panelEl.style.top = Math.max(0, Math.min(window.innerHeight - 60, startTop + dy)) + 'px';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
  }

  function renderOLCompose() {
    const t = T();
    panel.innerHTML = `
      <div id="mm-ol-cp-header" style="padding:13px 16px 11px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:linear-gradient(135deg,#fff5fb,#fff);border-radius:13px 13px 0 0;cursor:move;user-select:none">
        <span style="font-weight:700;color:#e91e8c;font-size:14px">✦ MailMind</span>
        <button id="mm-ol-cp-close" style="background:none;border:none;cursor:pointer;color:#bbb;font-size:18px;line-height:1;padding:2px 4px;border-radius:5px" onmouseenter="this.style.color='#e91e8c'" onmouseleave="this.style.color='#bbb'">✕</button>
      </div>
      <div style="padding:14px 16px 16px;overflow-y:auto;flex:1">
        <div style="display:flex;gap:6px;margin-bottom:13px;background:#f3f3f3;border-radius:10px;padding:3px">
          <button id="mm-ol-cp-tab-compose" style="flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${curMode==='compose'?'background:#e91e8c;color:#fff;box-shadow:0 2px 6px rgba(233,30,140,.3)':'background:transparent;color:#666'}">${t.tab1}</button>
          <button id="mm-ol-cp-tab-refine" style="flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${curMode==='refine'?'background:#e91e8c;color:#fff;box-shadow:0 2px 6px rgba(233,30,140,.3)':'background:transparent;color:#666'}">${t.tab2}</button>
        </div>
        <textarea id="mm-ol-cp-input" placeholder="${curMode==='compose' ? t.composePlaceholder : t.refinePlaceholder}" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1.5px solid #e8e8e8;border-radius:9px;font-size:12px;resize:vertical;min-height:${curMode==='refine'?'110':'70'}px;font-family:inherit;outline:none;line-height:1.55;color:#333;background:#fafafa" onfocus="this.style.borderColor='#e91e8c';this.style.background='#fff'" onblur="this.style.borderColor='#e8e8e8';this.style.background='#fafafa'"></textarea>
        <div style="margin-top:11px">
          <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">${t.toneLabel}</div>
          ${toneDropdownOL()}
        </div>
        <div style="margin-top:11px;margin-bottom:13px">
          <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">${t.langLabel}</div>
          ${langDropdownOL()}
        </div>
        <div style="display:flex;gap:7px">
          <button id="mm-ol-cp-gen-btn" style="flex:1;padding:11px;background:linear-gradient(135deg,#e91e8c,#c2185b);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 3px 12px rgba(233,30,140,.3)" onmouseenter="this.style.opacity='.9'" onmouseleave="this.style.opacity='1'">${curMode==='compose' ? t.composeBtn : t.refineBtn}</button>
          <button id="mm-ol-cp-compare" style="flex:1;padding:11px;background:#fff3e0;color:#f57c00;border:1.5px solid #ffb74d;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">${COMPARE_BTN_LABELS_OL[uiLang]||'🔀 비교 3종'}</button>
        </div>
        <div id="mm-ol-cp-result" style="display:none;margin-top:14px;border-top:1px solid #f0f0f0;padding-top:14px">
          <div id="mm-ol-cp-ver-tabs" style="display:none;gap:6px;margin-bottom:10px;flex-wrap:wrap"></div>
          <div style="margin-bottom:9px">
            <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">${t.subjectLabel}</div>
            <input id="mm-ol-cp-subject" type="text" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #e8e8e8;border-radius:8px;font-size:12px;font-family:inherit;outline:none;background:#fafafa" onfocus="this.style.borderColor='#e91e8c';this.style.background='#fff'" onblur="this.style.borderColor='#e8e8e8';this.style.background='#fafafa'">
          </div>
          <div style="margin-bottom:11px">
            <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">${t.bodyLabel}</div>
            <textarea id="mm-ol-cp-output" style="width:100%;box-sizing:border-box;padding:9px 10px;border:1.5px solid #e8e8e8;border-radius:8px;font-size:12px;resize:vertical;min-height:110px;font-family:inherit;line-height:1.6;outline:none;background:#fafafa" onfocus="this.style.borderColor='#e91e8c';this.style.background='#fff'" onblur="this.style.borderColor='#e8e8e8';this.style.background='#fafafa'"></textarea>
          </div>
          <div style="margin-bottom:11px">
            <div style="font-size:10px;color:#aaa;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">${t.translateLabel}</div>
            ${flagScrollOL(olTransLang || olComposeOutputLang)}
          </div>
          <div style="display:flex;gap:6px">
            <button id="mm-ol-cp-insert" style="flex:3;padding:10px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit" onmouseenter="this.style.opacity='.85'" onmouseleave="this.style.opacity='1'">${t.insertBtn}</button>
            <button id="mm-ol-cp-copy" style="flex:2;padding:10px;background:#fff;color:#e91e8c;border:1.5px solid #e91e8c;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${t.copyBtn}</button>
            <button id="mm-ol-cp-restore" style="display:none;padding:10px 11px;background:#fff5fb;color:#e91e8c;border:1.5px solid #f8c8e8;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;" title="AI 원본으로 복원">↩</button>
            <button id="mm-ol-cp-refine" style="padding:10px 12px;background:#f5f5f5;color:#673ab7;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;cursor:pointer;" title="✨ 다듬기">✨</button>
            <button id="mm-ol-cp-regen" style="padding:10px 12px;background:#f5f5f5;color:#666;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;cursor:pointer">${t.regenBtn}</button>
          </div>
        </div>
        <div id="mm-ol-cp-usage" style="text-align:right;font-size:10px;color:#bbb;margin-top:9px"></div>
      </div>
    `;
    bindOLComposeEvents();
  }

  function bindOLComposeEvents() {
    const t = T();
    makeDraggableOL(panel, '#mm-ol-cp-header');
    panel.querySelector('#mm-ol-cp-close').addEventListener('click', () => panel.remove());

    panel.querySelector('#mm-ol-cp-tab-compose').addEventListener('click', () => { curMode = 'compose'; renderOLCompose(); });
    panel.querySelector('#mm-ol-cp-tab-refine').addEventListener('click', () => { curMode = 'refine'; renderOLCompose(); });

    // 톤 드롭다운
    panel.querySelector('#mm-ol-cp-tone-trigger').addEventListener('click', (e) => {
      e.stopPropagation();
      toneDropOpenOL = !toneDropOpenOL; langDropOpenOL = false;
      renderOLCompose();
    });
    panel.querySelectorAll('#mm-ol-cp-tone-list button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        curToneOL = btn.dataset.val;
        toneDropOpenOL = false;
        renderOLCompose();
      });
    });

    // 언어 드롭다운 (작성 출력 언어 — 저장 안 함)
    panel.querySelector('#mm-ol-cp-lang-trigger').addEventListener('click', (e) => {
      e.stopPropagation();
      const _olrVis = panel.querySelector('#mm-ol-cp-result')?.style.display;
      const _olrSubj = panel.querySelector('#mm-ol-cp-subject')?.value;
      const _olrOut = panel.querySelector('#mm-ol-cp-output')?.value;
      langDropOpenOL = !langDropOpenOL; toneDropOpenOL = false;
      renderOLCompose();
      _olRestoreGen(_olrSubj, _olrOut, _olrVis);
    });
    panel.querySelectorAll('#mm-ol-cp-lang-list button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newLang = btn.dataset.val;
        const _olrVis = panel.querySelector('#mm-ol-cp-result')?.style.display;
        const _olrSubj = panel.querySelector('#mm-ol-cp-subject')?.value;
        const _olrOut = panel.querySelector('#mm-ol-cp-output')?.value;
        uiLang = newLang; olComposeOutputLang = newLang; langDropOpenOL = false;
        renderOLCompose();
        _olRestoreGen(_olrSubj, _olrOut, _olrVis);
      });
    });

    // 번역 언어 드롭다운 트리거 (이벤트 위임)
    if (!panel._tlTriggerBound) {
      panel._tlTriggerBound = true;
      panel.addEventListener('click', (e) => {
        const trigger = e.target.closest('#mm-ol-tl-trigger');
        if (!trigger) return;
        e.stopPropagation();
        transLangDropOpenOL = !transLangDropOpenOL;
        const list = panel.querySelector('#mm-ol-tl-list');
        const arrow = panel.querySelector('#mm-ol-tl-arrow');
        if (list) list.style.display = transLangDropOpenOL ? 'block' : 'none';
        if (arrow) arrow.style.transform = transLangDropOpenOL ? 'rotate(180deg)' : '';
      });
    }

    // 번역 플래그 — 이벤트 위임, 중복 방지
    if (!panel._translateBound) {
      panel._translateBound = true;
      panel.addEventListener('click', async (e) => {
        const btn = e.target.closest('.mm-ol-tl-btn');
        if (!btn) return;
        const targetLang = btn.dataset.val;
        const bodyText = panel.querySelector('#mm-ol-cp-output')?.value;
        if (!bodyText) return;
        if (targetLang === olTransLang) {
          transLangDropOpenOL = false;
          const listEl2 = panel.querySelector('#mm-ol-tl-list');
          const arrowEl2 = panel.querySelector('#mm-ol-tl-arrow');
          if (listEl2) listEl2.style.display = 'none';
          if (arrowEl2) arrowEl2.style.transform = '';
          return;
        }
        const origText = btn.innerHTML;
        btn.innerHTML = '⏳';
        btn.disabled = true;
        try {
          const subjectEl = panel.querySelector('#mm-ol-cp-subject');
          const existingSubject = subjectEl?.value?.trim() || '';
          const [bodyData, subjData] = await Promise.all([
            fetch(`${WORKER_URL_OL}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: bodyText, targetLanguage: targetLang }) }).then(r => r.json()),
            existingSubject ? fetch(`${WORKER_URL_OL}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: existingSubject, targetLanguage: targetLang }) }).then(r => r.json()) : Promise.resolve(null)
          ]);
          if (bodyData.success) panel.querySelector('#mm-ol-cp-output').value = _stripSalutationOL(bodyData.translated || '');
          if (subjData?.success && subjectEl) subjectEl.value = subjData.translated || '';
        } catch(e) {}
        btn.innerHTML = origText;
        btn.disabled = false;
        // 드롭다운 닫기 + 트리거 라벨 업데이트
        transLangDropOpenOL = false;
        olTransLang = targetLang; olComposeOutputLang = targetLang;
        const list = panel.querySelector('#mm-ol-tl-list');
        const arrow = panel.querySelector('#mm-ol-tl-arrow');
        const trg = panel.querySelector('#mm-ol-tl-trigger');
        if (list) list.style.display = 'none';
        if (arrow) arrow.style.transform = '';
        if (trg) {
          const selL = COMPOSE_LANGS_OL.find(l=>l.value===targetLang)||COMPOSE_LANGS_OL[0];
          trg.innerHTML = `<span style="font-size:15px">${selL.flag}</span><span style="font-size:12px;color:#333;flex:1;text-align:left">${selL.label}</span><span id="mm-ol-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>`;
        }
        panel.querySelectorAll('.mm-ol-tl-btn').forEach(b => {
          b.style.background = b.dataset.val === targetLang ? '#fce4f3' : '#fff';
        });
      });
    }

    // 드롭다운 외부 클릭 닫기
    document.addEventListener('click', function closeDrops() {
      let changed = false;
      if (toneDropOpenOL || langDropOpenOL) { toneDropOpenOL = false; langDropOpenOL = false; changed = true; }
      if (transLangDropOpenOL) {
        transLangDropOpenOL = false;
        const xl = panel.querySelector('#mm-ol-tl-list');
        const xa = panel.querySelector('#mm-ol-tl-arrow');
        if (xl) xl.style.display = 'none';
        if (xa) xa.style.transform = '';
      }
      if (changed) renderOLCompose();
      document.removeEventListener('click', closeDrops);
    });

    // 생성 버튼
    panel.querySelector('#mm-ol-cp-gen-btn').addEventListener('click', async () => {
      const tone = curToneOL;
      const myLanguage = olComposeOutputLang;
      const genBtn = panel.querySelector('#mm-ol-cp-gen-btn');
      const input = panel.querySelector('#mm-ol-cp-input').value.trim();
      if (!input) { showToastOL(t.errEmpty, 'error'); return; }

      const endpoint = curMode === 'compose' ? '/generate-compose' : '/refine-compose';
      const body = curMode === 'compose'
        ? { prompt: input, tone, myLanguage, email: userData.userEmail, country: olSelectedCountry, ...(userInfo ? { userInfo } : {}), ...(userData.businessCard ? { businessCard: userData.businessCard } : {}), ...(userData.phrases?.length ? { phrases: userData.phrases } : {}) }
        : { draft: input, tone, myLanguage, email: userData.userEmail, country: olSelectedCountry, ...(userInfo ? { userInfo } : {}), ...(userData.businessCard ? { businessCard: userData.businessCard } : {}), ...(userData.phrases?.length ? { phrases: userData.phrases } : {}) };

      _olCpVersions = []; _olCpCurrentVerIdx = 0;
      const _vtOL = panel.querySelector('#mm-ol-cp-ver-tabs');
      if (_vtOL) { _vtOL.style.display = 'none'; _vtOL.innerHTML = ''; }
      const originalText = genBtn.textContent;
      genBtn.textContent = t.generatingText;
      genBtn.disabled = true;

      try {
        const res = await fetch(`${WORKER_URL_OL}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        const data = await res.json();
        if (data.success) {
          panel.querySelector('#mm-ol-cp-subject').value = data.subject || '';
          panel.querySelector('#mm-ol-cp-output').value = _stripSalutationOL(data.body || data.reply || '');
          panel.querySelector('#mm-ol-cp-result').style.display = 'block';
          panel.querySelector('#mm-ol-cp-usage').textContent = t.usageText(data.monthlyUsage, data.monthlyLimit);
        } else if (data.error === 'MONTHLY_LIMIT') {
          showToastOL(t.errLimit, 'error');
        } else {
          showToastOL(t.errFail, 'error');
        }
      } catch(e) { showToastOL(t.errFail, 'error'); }

      genBtn.textContent = originalText;
      genBtn.disabled = false;
    });

    // 삽입 버튼
    panel.querySelector('#mm-ol-cp-insert').addEventListener('click', () => {
      const subject = panel.querySelector('#mm-ol-cp-subject').value.trim();
      const bodyText = panel.querySelector('#mm-ol-cp-output').value;
      const newMailBtn = document.querySelector('[aria-label="새 메일"]') || document.querySelector('[aria-label="New mail"]') || document.querySelector('[aria-label="New message"]');
      if (newMailBtn) newMailBtn.click();
      setTimeout(() => {
        const editor = document.querySelector('[aria-label="Message body, "]') ||
                       document.querySelector('[contenteditable="true"][aria-multiline="true"]') ||
                       document.querySelector('[data-testid="compose-editor"] [contenteditable]');
        if (editor) {
          editor.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, bodyText);
          if (subject) {
            const SUBJ_PANEL = ['#mm-ol-float-panel', '#mm-float-panel', '#mm-ol-compose-panel'];
            const isSubjPanel = el => { try { return SUBJ_PANEL.some(s => el.closest(s)); } catch(e) { return false; } };
            function findSubjectAboveBodyOL(root, bodyEditor) {
              const SUBJ_SELS = ['input[name="subject"]','input[name="title"]','input#subject','input#title','input[placeholder*="제목"]','input[placeholder*="Subject" i]','input[aria-label*="제목"]','input[aria-label*="Subject" i]','input[class*="subject" i]','input[class*="title" i]','[contenteditable][aria-label*="Subject" i]','[role="textbox"][aria-label*="Subject" i]'];
              for (const sel of SUBJ_SELS) { try { const el = root.querySelector(sel); if (el && !isSubjPanel(el)) { const r = el.getBoundingClientRect(); if (r.width > 80 && r.height > 0) return el; } } catch(e) {} }
              const bodyRect = bodyEditor?.getBoundingClientRect();
              const els = [...root.querySelectorAll('input[type="text"],input:not([type]),input[type=""]'),...root.querySelectorAll('[contenteditable="true"],[role="textbox"]')];
              const cands = [];
              for (const el of els) { if (isSubjPanel(el)) continue; if (el === bodyEditor) continue; const r = el.getBoundingClientRect(); if (r.width < 100 || r.height <= 0 || r.height > 100) continue; if (bodyRect && r.top >= bodyRect.top) continue; cands.push({ el, top: r.top }); }
              if (!cands.length) return null; cands.sort((a, b) => b.top - a.top); return cands[0].el;
            }
            function setSubjectValOL(el, val) {
              el.focus();
              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { const win = el.ownerDocument?.defaultView || window; const ns = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')?.set; if (ns) ns.call(el, val); else el.value = val; }
              else { const ownerDoc = el.ownerDocument || document; const range = ownerDoc.createRange(); range.selectNodeContents(el); const sel2 = ownerDoc.getSelection(); if (sel2) { sel2.removeAllRanges(); sel2.addRange(range); } if (!ownerDoc.execCommand('insertText', false, val)) el.textContent = val; }
              el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // editor는 이미 찾은 body editor — 그것보다 위에 있는 요소를 제목으로 간주
            const sEl = findSubjectAboveBodyOL(editor.ownerDocument || document, editor);
            if (sEl) setSubjectValOL(sEl, subject);
          }
          showToastOL(T().insertBtn, 'success');
          panel.remove();
        } else {
          navigator.clipboard.writeText(subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText)
            .then(() => showToastOL(T().copyBtn, 'info'));
        }
      }, 800);
    });

    // 복사 버튼
    panel.querySelector('#mm-ol-cp-copy').addEventListener('click', () => {
      const subject = panel.querySelector('#mm-ol-cp-subject').value.trim();
      const bodyText = panel.querySelector('#mm-ol-cp-output').value;
      const full = subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
      navigator.clipboard.writeText(full).then(() => showToastOL(T().copyBtn + ' ✓', 'success'));
    });

    // 재생성 버튼
    panel.querySelector('#mm-ol-cp-regen').addEventListener('click', () => {
      panel.querySelector('#mm-ol-cp-result').style.display = 'none';
      panel.querySelector('#mm-ol-cp-gen-btn').click();
    });

    // 비교 버튼
    panel.querySelector('#mm-ol-cp-compare')?.addEventListener('click', doOLCpCompare);

    panel.querySelector('#mm-ol-cp-restore')?.addEventListener('click', () => {
      const out = panel.querySelector('#mm-ol-cp-output');
      if (out && out.dataset.aiOriginal) {
        out.value = out.dataset.aiOriginal;
        panel.querySelector('#mm-ol-cp-restore').style.display = 'none';
      }
    });
    panel.querySelector('#mm-ol-cp-refine')?.addEventListener('click', async () => {
      const out = panel.querySelector('#mm-ol-cp-output');
      if (!out || !out.value.trim()) return;
      const refineBtn = panel.querySelector('#mm-ol-cp-refine');
      refineBtn.disabled = true; refineBtn.textContent = '...';
      try {
        const res = await chrome.runtime.sendMessage({ action:'refineReply', text: out.value });
        if (res?.result) {
          if (!out.dataset.aiOriginal) out.dataset.aiOriginal = out.value;
          out.value = res.result;
          panel.querySelector('#mm-ol-cp-restore').style.display = '';
        }
      } catch(e) {}
      refineBtn.disabled = false; refineBtn.textContent = '✨';
    });
  }

  async function doOLCpCompare() {
    const input = panel.querySelector('#mm-ol-cp-input')?.value.trim();
    if (!input) { showToastOL('내용을 입력하세요', 'error'); return; }
    const compareBtn = panel.querySelector('#mm-ol-cp-compare');
    if (compareBtn) { compareBtn.disabled = true; compareBtn.textContent = getUILangOL(olSelectedMyLang).generating||'⏳ 생성 중…'; }
    const tones = ['professional', 'friendly', curToneOL === 'professional' ? 'concise' : curToneOL === 'friendly' ? 'detailed' : 'professional'];
    const uniqueTones = [...new Set(tones)].slice(0, 3);
    const toneLabelMap = { Korean:{professional:'업무적',friendly:'친근하게',concise:'간결하게',detailed:'상세하게',decline:'거절하기',thankful:'감사하게'}, English:{professional:'Professional',friendly:'Friendly',concise:'Concise',detailed:'Detailed',decline:'Decline',thankful:'Thankful'}, Japanese:{professional:'ビジネス',friendly:'フレンドリー',concise:'簡潔',detailed:'詳細',decline:'断り',thankful:'感謝'} };
    const tlMap = toneLabelMap[uiLang] || toneLabelMap['English'];
    const endpoint = curMode === 'compose' ? '/generate-compose' : '/refine-compose';
    try {
      const results = await Promise.all(uniqueTones.map(tone => {
        const body = curMode === 'compose'
          ? { prompt: input, tone, myLanguage: olComposeOutputLang, email: userData.userEmail, country: olSelectedCountry, ...(userInfo ? { userInfo } : {}), ...(userData.businessCard ? { businessCard: userData.businessCard } : {}), ...(userData.phrases?.length ? { phrases: userData.phrases } : {}) }
          : { draft: input, tone, myLanguage: olComposeOutputLang, email: userData.userEmail, country: olSelectedCountry, ...(userInfo ? { userInfo } : {}), ...(userData.businessCard ? { businessCard: userData.businessCard } : {}), ...(userData.phrases?.length ? { phrases: userData.phrases } : {}) };
        return fetch(`${WORKER_URL_OL}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()).then(d => ({ tone, subject: d.subject||'', body: d.body||d.reply||'' })).catch(() => null);
      }));
      _olCpVersions = results.filter(Boolean);
      _olCpCurrentVerIdx = 0;
      if (!_olCpVersions.length) { showToastOL('생성 실패', 'error'); return; }
      const _vtOL = panel.querySelector('#mm-ol-cp-ver-tabs');
      if (_vtOL) {
        _vtOL.style.display = 'flex';
        const _fpTlOL = panel.querySelector('#mm-ol-tl-wrap');
        if (_fpTlOL) { _fpTlOL.style.pointerEvents = 'none'; _fpTlOL.style.opacity = '0.4'; }
        _vtOL.innerHTML = _olCpVersions.map((v, i) => `<button class="mm-ol-cp-ver-btn" data-idx="${i}" style="padding:5px 10px;border-radius:16px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${i===0?'#f57c00':'#e0e0e0'};background:${i===0?'#fff3e0':'#f5f5f5'};color:${i===0?'#f57c00':'#666'};font-family:inherit">${tlMap[v.tone]||v.tone}</button>`).join('') + `<button id="mm-ol-cp-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-family:inherit;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
        _vtOL.querySelectorAll('.mm-ol-cp-ver-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            _olCpCurrentVerIdx = parseInt(btn.dataset.idx);
            const ver = _olCpVersions[_olCpCurrentVerIdx];
            panel.querySelector('#mm-ol-cp-subject').value = ver.subject;
            panel.querySelector('#mm-ol-cp-output').value = ver.body;
            _vtOL.querySelectorAll('.mm-ol-cp-ver-btn').forEach((b, bi) => {
              b.style.borderColor = bi === _olCpCurrentVerIdx ? '#f57c00' : '#e0e0e0';
              b.style.background = bi === _olCpCurrentVerIdx ? '#fff3e0' : '#f5f5f5';
              b.style.color = bi === _olCpCurrentVerIdx ? '#f57c00' : '#666';
            });
          });
        });
        _vtOL.querySelector('#mm-ol-cp-ver-confirm')?.addEventListener('click', () => {
          _olCpVersions = [];
          _olCpCurrentVerIdx = 0;
          _vtOL.style.display = 'none';
          _vtOL.innerHTML = '';
          const _fpTlRestoreOL = panel.querySelector('#mm-ol-tl-wrap');
          if (_fpTlRestoreOL) { _fpTlRestoreOL.style.pointerEvents = ''; _fpTlRestoreOL.style.opacity = ''; }
        });
      }
      const first = _olCpVersions[0];
      panel.querySelector('#mm-ol-cp-subject').value = first.subject;
      panel.querySelector('#mm-ol-cp-output').value = first.body;
      panel.querySelector('#mm-ol-cp-result').style.display = 'block';
    } catch(e) { showToastOL('오류 발생', 'error'); }
    if (compareBtn) { compareBtn.disabled = false; compareBtn.textContent = COMPARE_BTN_LABELS_OL[uiLang]||'🔀 비교 3종'; }
  }

  renderOLCompose();
  document.body.appendChild(panel);
}

// ===== 이메일 감지 =====
function detectOutlookEmail() {
  // New Monarch Outlook (2024+) selectors
  const modernSels = [
    '[class*="ReadingPane"]','[class*="readingPane"]',
    '[class*="ThreadViewer"]','[class*="threadViewer"]',
    '[class*="ConversationView"]','[class*="conversationView"]',
    '[class*="ItemHeader"]','[class*="itemHeader"]',
    '[data-testid="reading-pane"]','[data-testid="message-body"]',
    '[data-app-id="reading-pane"]',
    '[aria-label="Message body"]','[aria-label="Message Body"]',
    '[aria-label="Reading pane"]',
    '[aria-label="Message compose body"]',
    '.ReadingPaneContent','.rps_0f57',
  ];
  for (const s of modernSels) { if (document.querySelector(s)) return true; }
  const main = document.querySelector('[role="main"]');
  if (main && main.innerText?.trim().length > 50) return true;
  return false;
}

// ===== MutationObserver =====
let olInitDone = false;
const olObserver = new MutationObserver(() => {
  if (!olInitDone && detectOutlookEmail()) { olInitDone=true; setTimeout(addOutlookFloatingBtn, 500); }
  if (!detectOutlookEmail()) { olInitDone=false; removeOLPanel(); document.querySelector('#mm-ol-fab')?.remove(); document.querySelector('#mm-ol-compose-fab')?.remove(); }
});
olObserver.observe(document.body, { childList:true, subtree:true });
// 여러 시점에 재시도 (SPA 로딩 타이밍 대응)
[1000, 2000, 3500, 6000].forEach(d => setTimeout(() => { if (!olInitDone && detectOutlookEmail()) addOutlookFloatingBtn(); }, d));
