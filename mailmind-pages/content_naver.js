// MailMind AI — Naver Mail (mail.naver.com) Content Script
// Pattern mirrors content_outlook.js

const WORKER_URL_NV = 'https://mailmind-api.kimdh4790.workers.dev';

const PLAN_LIMITS_NV = { pro: { monthly: 300 }, basic: { monthly: 200 }, free: { monthly: 35 } };

const TONE_KEYS_NV = ['professional','friendly','concise','detailed','decline','thankful','apologetic','acknowledge'];

const TONES_I18N_NV = {
  Korean:     ['전문적','친근한','간결한','상세한','거절','감사','사과','확인'],
  English:    ['Professional','Friendly','Concise','Detailed','Decline','Thankful','Apologetic','Acknowledge'],
  Japanese:   ['プロフェッショナル','フレンドリー','簡潔','詳細','断り','感謝','謝罪','確認'],
  Chinese:    ['专业','友好','简洁','详细','拒绝','感谢','道歉','确认'],
  Spanish:    ['Profesional','Amigable','Conciso','Detallado','Rechazar','Agradecido','Disculpa','Confirmar'],
  French:     ['Professionnel','Amical','Concis','Détaillé','Refus','Reconnaissant','Excuse','Confirmer'],
  German:     ['Professionell','Freundlich','Knapp','Detailliert','Ablehnen','Dankbar','Entschuldigend','Bestätigen'],
  Portuguese: ['Profissional','Amigável','Conciso','Detalhado','Recusar','Grato','Desculpas','Confirmar'],
  Arabic:     ['احترافي','ودي','موجز','مفصل','رفض','ممتنان','اعتذار','تأكيد'],
  Italian:    ['Professionale','Amichevole','Conciso','Dettagliato','Rifiuto','Grato','Scuse','Confermare'],
  Turkish:    ['Profesyonel','Arkadaşça','Kısa','Detaylı','Reddet','Minnettarlık','Özür','Onayla'],
  Vietnamese: ['Chuyên nghiệp','Thân thiện','Ngắn gọn','Chi tiết','Từ chối','Cảm ơn','Xin lỗi','Xác nhận'],
  Thai:       ['มืออาชีพ','เป็นมิตร','กระชับ','ละเอียด','ปฏิเสธ','ขอบคุณ','ขอโทษ','ยืนยัน'],
  Indonesian: ['Profesional','Ramah','Singkat','Terperinci','Menolak','Bersyukur','Minta Maaf','Konfirmasi'],
  Dutch:      ['Professioneel','Vriendelijk','Beknopt','Gedetailleerd','Afwijzen','Dankbaar','Verontschuldigend','Bevestigen'],
  Polish:     ['Profesjonalny','Przyjazny','Zwięzły','Szczegółowy','Odmowa','Wdzięczny','Przepraszający','Potwierdzający'],
  Hindi:      ['पेशेवर','मैत्रीपूर्ण','संक्षिप्त','विस्तृत','अस्वीकार','आभारी','क्षमाप्रार्थी','पुष्टि करें'],
};

const LANG_FLAGS_NV = {
  Korean:'🇰🇷',English:'🇺🇸',Japanese:'🇯🇵',Chinese:'🇨🇳',Spanish:'🇪🇸',French:'🇫🇷',
  German:'🇩🇪',Portuguese:'🇧🇷',Arabic:'🇸🇦',Italian:'🇮🇹',Turkish:'🇹🇷',
  Vietnamese:'🇻🇳',Thai:'🇹🇭',Indonesian:'🇮🇩',Dutch:'🇳🇱',Polish:'🇵🇱',Hindi:'🇮🇳'
};

const COUNTRIES_NV = [
  {value:'auto',label:'🌐 Auto-detect'},
  {value:'Korea',label:'🇰🇷 Korea'},
  {value:'Japan',label:'🇯🇵 Japan'},
  {value:'USA',label:'🇺🇸 USA'},
  {value:'China',label:'🇨🇳 China'},
  {value:'Germany',label:'🇩🇪 Germany'},
  {value:'France',label:'🇫🇷 France'},
  {value:'Spain',label:'🇪🇸 Spain'},
  {value:'Brazil',label:'🇧🇷 Brazil'},
  {value:'India',label:'🇮🇳 India'},
];

// ===== i18n UI Strings =====
const UI_STRINGS_NV = {
  Korean:     { tone:'톤', country:'발신자 국가', myLang:'내 언어', generate:'✨ AI 답장 생성', summary:'📝 요약', settings:'설정', insert:'네이버에 삽입', copy:'복사', regen:'↺', switchLang:'답장 언어 전환:', promises:'📌 약속/확인 사항', tasks:'📋 할 일 & 일정', signature:'서명', template:'자주 쓰는 문구', sigSave:'저장', save:'저장', shortcut:'Alt+G 생성 · Alt+I 삽입 · Alt+C 복사', limitMsg:'월 사용량 한도에 도달했습니다', upgrade:'플랜 업그레이드', compare:'비교하기', smartReply:'🌍 스마트 답장', generating:'생성 중...', summarizing:'요약 중...', settingsClose:'설정 닫기', emailTranslate:'🌐 내 언어로 번역', translating:'🌐 번역 중...', autoDetect:'🌐 자동 감지', sigPlaceholder:'서명을 입력하세요', templatePlaceholder:'자주 쓰는 문구 입력', emotion:{positive:'😊 긍정',negative:'😟 부정',urgent:'⚡ 긴급',neutral:'😐 중립'},urgency:{high:'🔴 높음',medium:'🟡 보통',low:'🟢 낮음'}, learnedLabel:'학습됨', tonePref:'톤 선호', learnedUnit:'회 학습', styleShort:'간결하게', styleMid:'보통 길이', styleLong:'상세하게', refine:'✨ 다듬기', refining:'✨ 다듬기 중...', refineDone:'✨ 다듬기 완료!', refineFailed:'다듬기 실패. 다시 시도해주세요.', refineEmpty:'다듬기 실패: 결과가 비어있습니다.', refineInput:'다듬을 내용을 입력해주세요.', refinePlanMsg:'초안 다듬기는 Basic 이상 플랜에서 사용 가능합니다', smartGenerating:'🌍 분석 중...' },
  English:    { tone:'Tone', country:'Sender Country', myLang:'My Language', generate:'✨ Generate AI Reply', summary:'📝 Summarize', settings:'Settings', insert:'Insert into Naver', copy:'Copy', regen:'↺', switchLang:'Switch Reply Language:', promises:'📌 Promises/Actions', tasks:'📋 Tasks & Dates', signature:'Signature', template:'Templates', sigSave:'Save', save:'Save', shortcut:'Alt+G Generate · Alt+I Insert · Alt+C Copy', limitMsg:'Monthly limit reached', upgrade:'Upgrade Plan', compare:'Compare', smartReply:'🌍 Smart Reply', generating:'Generating...', summarizing:'Summarizing...', settingsClose:'Close Settings', emailTranslate:'🌐 Translate to my language', translating:'🌐 Translating...', autoDetect:'🌐 Auto Detect', sigPlaceholder:'Enter your signature', templatePlaceholder:'Enter phrase', emotion:{positive:'😊 Positive',negative:'😟 Negative',urgent:'⚡ Urgent',neutral:'😐 Neutral'},urgency:{high:'🔴 High',medium:'🟡 Medium',low:'🟢 Low'}, learnedLabel:'Learned', tonePref:'tone pref', learnedUnit:' uses', styleShort:'concise', styleMid:'moderate', styleLong:'detailed', refine:'✨ Polish', refining:'✨ Polishing...', refineDone:'✨ Polish complete!', refineFailed:'Polish failed. Please try again.', refineEmpty:'Polish failed: empty result.', refineInput:'Please enter text to polish.', refinePlanMsg:'Refine is available on Basic or higher plans.', smartGenerating:'🌍 Analyzing...' },
  Japanese:   { tone:'トーン', country:'送信者の国', myLang:'自分の言語', generate:'✨ AI返信を生成', summary:'📝 要約', settings:'設定', insert:'Naverに挿入', copy:'コピー', regen:'↺', switchLang:'返信言語を切替:', promises:'📌 約束/確認事項', tasks:'📋 タスク & 予定', signature:'署名', template:'テンプレート', sigSave:'保存', save:'保存', shortcut:'Alt+G 生成 · Alt+I 挿入 · Alt+C コピー', limitMsg:'月次制限に達しました', upgrade:'プランをアップグレード', compare:'比較', smartReply:'🌍 スマート返信', generating:'生成中...', summarizing:'要約中...', settingsClose:'設定を閉じる', emailTranslate:'🌐 自分の言語で読む', translating:'🌐 翻訳中...', autoDetect:'🌐 自動検出', sigPlaceholder:'署名を入力してください', templatePlaceholder:'フレーズを入力', emotion:{positive:'😊 肯定的',negative:'😟 否定的',urgent:'⚡ 緊急',neutral:'😐 中立'},urgency:{high:'🔴 高',medium:'🟡 中',low:'🟢 低'}, learnedLabel:'学習済み', tonePref:'トーン好み', learnedUnit:'回学習', styleShort:'簡潔に', styleMid:'普通の長さ', styleLong:'詳細に', refine:'✨ 磨く', refining:'✨ 磨き中...', refineDone:'✨ 磨き完了！', refineFailed:'磨き失敗。再試行してください。', refineEmpty:'磨き失敗：結果が空です。', refineInput:'磨く内容を入力してください。', refinePlanMsg:'ブラッシュアップはBasicプラン以上でご利用いただけます。', smartGenerating:'🌍 分析中...' },
  Chinese:    { tone:'语气', country:'发件人国家', myLang:'我的语言', generate:'✨ 生成AI回复', summary:'📝 摘要', settings:'设置', insert:'插入Naver', copy:'复制', regen:'↺', switchLang:'切换回复语言:', promises:'📌 承诺/确认', tasks:'📋 任务 & 日程', signature:'签名', template:'模板', sigSave:'保存', save:'保存', shortcut:'Alt+G 生成 · Alt+I 插入 · Alt+C 复制', limitMsg:'已达到月度限制', upgrade:'升级方案', compare:'比较', smartReply:'🌍 智能回复', generating:'生成中...', summarizing:'摘要中...', settingsClose:'关闭设置', emailTranslate:'🌐 翻译成我的语言', translating:'🌐 翻译中...', autoDetect:'🌐 自动检测', sigPlaceholder:'请输入签名', templatePlaceholder:'输入常用语', emotion:{positive:'😊 积极',negative:'😟 消极',urgent:'⚡ 紧急',neutral:'😐 中立'},urgency:{high:'🔴 高',medium:'🟡 中',low:'🟢 低'}, learnedLabel:'已学习', tonePref:'风格偏好', learnedUnit:'次学习', styleShort:'简洁', styleMid:'适中', styleLong:'详细', refine:'✨ 润色', refining:'✨ 润色中...', refineDone:'✨ 润色完成！', refineFailed:'润色失败，请重试。', refineEmpty:'润色失败：结果为空。', refineInput:'请输入要润色的内容。', refinePlanMsg:'润色功能在Basic或更高版本中可用。', smartGenerating:'🌍 分析中...' },
  Spanish:    { tone:'Tono', country:'País del remitente', myLang:'Mi idioma', generate:'✨ Generar respuesta IA', summary:'📝 Resumir', settings:'Configuración', insert:'Insertar en Naver', copy:'Copiar', regen:'↺', switchLang:'Cambiar idioma:', promises:'📌 Compromisos', tasks:'📋 Tareas & Fechas', signature:'Firma', template:'Plantillas', sigSave:'Guardar', save:'Guardar', shortcut:'Alt+G Generar · Alt+I Insertar · Alt+C Copiar', limitMsg:'Límite mensual alcanzado', upgrade:'Actualizar plan', compare:'Comparar', smartReply:'🌍 Respuesta inteligente', generating:'Generando...', summarizing:'Resumiendo...', settingsClose:'Cerrar', emailTranslate:'🌐 Traducir a mi idioma', translating:'🌐 Traduciendo...', autoDetect:'🌐 Detección automática', sigPlaceholder:'Ingresa tu firma', templatePlaceholder:'Ingresa una frase', emotion:{positive:'😊 Positivo',negative:'😟 Negativo',urgent:'⚡ Urgente',neutral:'😐 Neutral'},urgency:{high:'🔴 Alto',medium:'🟡 Medio',low:'🟢 Bajo'}, learnedLabel:'Aprendido', tonePref:'pref. tono', learnedUnit:' usos', styleShort:'conciso', styleMid:'moderado', styleLong:'detallado', refine:'✨ Pulir', refining:'✨ Puliendo...', refineDone:'✨ ¡Pulido!', refineFailed:'Error al pulir. Por favor inténtelo de nuevo.', refineEmpty:'Error al pulir: resultado vacío.', refineInput:'Por favor ingrese el texto a pulir.', refinePlanMsg:'Pulir está disponible en el plan Basic o superior.', smartGenerating:'🌍 Analizando...' },
  French:     { tone:'Ton', country:'Pays expéditeur', myLang:'Ma langue', generate:'✨ Générer réponse IA', summary:'📝 Résumer', settings:'Paramètres', insert:'Insérer dans Naver', copy:'Copier', regen:'↺', switchLang:'Changer la langue:', promises:'📌 Engagements', tasks:'📋 Tâches & Dates', signature:'Signature', template:'Modèles', sigSave:'Enregistrer', save:'Enregistrer', shortcut:'Alt+G Générer · Alt+I Insérer · Alt+C Copier', limitMsg:'Limite mensuelle atteinte', upgrade:'Mettre à niveau', compare:'Comparer', smartReply:'🌍 Réponse intelligente', generating:'Génération...', summarizing:'Résumé...', settingsClose:'Fermer', emailTranslate:'🌐 Traduire dans ma langue', translating:'🌐 Traduction...', autoDetect:'🌐 Détection auto', sigPlaceholder:'Entrez votre signature', templatePlaceholder:'Entrez une phrase', emotion:{positive:'😊 Positif',negative:'😟 Négatif',urgent:'⚡ Urgent',neutral:'😐 Neutre'},urgency:{high:'🔴 Élevé',medium:'🟡 Moyen',low:'🟢 Faible'}, learnedLabel:'Appris', tonePref:'préf. ton', learnedUnit:' util.', styleShort:'concis', styleMid:'modéré', styleLong:'détaillé', refine:'✨ Affiner', refining:'✨ Affinage...', refineDone:'✨ Affiné !', refineFailed:'Échec du raffinage. Veuillez réessayer.', refineEmpty:'Échec du raffinage : résultat vide.', refineInput:'Veuillez saisir le texte à affiner.', refinePlanMsg:'L\'affinement est disponible sur le plan Basic ou supérieur.', smartGenerating:'🌍 Analyse...' },
  German:     { tone:'Ton', country:'Absenderland', myLang:'Meine Sprache', generate:'✨ KI-Antwort generieren', summary:'📝 Zusammenfassen', settings:'Einstellungen', insert:'In Naver einfügen', copy:'Kopieren', regen:'↺', switchLang:'Sprache wechseln:', promises:'📌 Zusagen', tasks:'📋 Aufgaben & Termine', signature:'Signatur', template:'Vorlagen', sigSave:'Speichern', save:'Speichern', shortcut:'Alt+G Generieren · Alt+I Einfügen · Alt+C Kopieren', limitMsg:'Monatslimit erreicht', upgrade:'Plan upgraden', compare:'Vergleichen', smartReply:'🌍 Intelligente Antwort', generating:'Generieren...', summarizing:'Zusammenfassen...', settingsClose:'Schließen', emailTranslate:'🌐 In meine Sprache übersetzen', translating:'🌐 Übersetzen...', autoDetect:'🌐 Automatisch erkennen', sigPlaceholder:'Signatur eingeben', templatePlaceholder:'Phrase eingeben', emotion:{positive:'😊 Positiv',negative:'😟 Negativ',urgent:'⚡ Dringend',neutral:'😐 Neutral'},urgency:{high:'🔴 Hoch',medium:'🟡 Mittel',low:'🟢 Niedrig'}, learnedLabel:'Gelernt', tonePref:'Ton-Pref.', learnedUnit:' Nutz.', styleShort:'prägnant', styleMid:'moderat', styleLong:'ausführlich', refine:'✨ Verfeinern', refining:'✨ Verfeinere...', refineDone:'✨ Verfeinert!', refineFailed:'Verfeinern fehlgeschlagen. Bitte erneut versuchen.', refineEmpty:'Verfeinern fehlgeschlagen: Leeres Ergebnis.', refineInput:'Bitte Text zum Verfeinern eingeben.', refinePlanMsg:'Verfeinern ist ab dem Basic-Plan verfügbar.', smartGenerating:'🌍 Analysiere...' },
  Portuguese: { tone:'Tom', country:'País remetente', myLang:'Meu idioma', generate:'✨ Gerar resposta IA', summary:'📝 Resumir', settings:'Configurações', insert:'Inserir no Naver', copy:'Copiar', regen:'↺', switchLang:'Mudar idioma:', promises:'📌 Compromissos', tasks:'📋 Tarefas & Datas', signature:'Assinatura', template:'Modelos', sigSave:'Salvar', save:'Salvar', shortcut:'Alt+G Gerar · Alt+I Inserir · Alt+C Copiar', limitMsg:'Limite mensal atingido', upgrade:'Atualizar plano', compare:'Comparar', smartReply:'🌍 Resposta inteligente', generating:'Gerando...', summarizing:'Resumindo...', settingsClose:'Fechar', emailTranslate:'🌐 Traduzir para meu idioma', translating:'🌐 Traduzindo...', autoDetect:'🌐 Detecção automática', sigPlaceholder:'Digite sua assinatura', templatePlaceholder:'Digite uma frase', emotion:{positive:'😊 Positivo',negative:'😟 Negativo',urgent:'⚡ Urgente',neutral:'😐 Neutro'},urgency:{high:'🔴 Alto',medium:'🟡 Médio',low:'🟢 Baixo'}, learnedLabel:'Aprendido', tonePref:'pref. tom', learnedUnit:' usos', styleShort:'conciso', styleMid:'moderado', styleLong:'detalhado', refine:'✨ Refinar', refining:'✨ Refinando...', refineDone:'✨ Refinado!', refineFailed:'Refinamento falhou. Tente novamente.', refineEmpty:'Refinamento falhou: resultado vazio.', refineInput:'Por favor insira o texto para refinar.', refinePlanMsg:'Refinar está disponível no plano Basic ou superior.', smartGenerating:'🌍 Analisando...' },
  Arabic:     { tone:'النبرة', country:'دولة المرسل', myLang:'لغتي', generate:'✨ توليد رد AI', summary:'📝 ملخص', settings:'الإعدادات', insert:'إدراج في Naver', copy:'نسخ', regen:'↺', switchLang:'تبديل لغة الرد:', promises:'📌 الوعود/الإجراءات', tasks:'📋 المهام والمواعيد', signature:'التوقيع', template:'القوالب', sigSave:'حفظ', save:'حفظ', shortcut:'Alt+G توليد · Alt+I إدراج · Alt+C نسخ', limitMsg:'تم الوصول للحد الشهري', upgrade:'ترقية الخطة', compare:'مقارنة', smartReply:'🌍 رد ذكي', generating:'جاري التوليد...', summarizing:'جاري التلخيص...', settingsClose:'إغلاق', emailTranslate:'🌐 ترجمة إلى لغتي', translating:'🌐 جاري الترجمة...', autoDetect:'🌐 كشف تلقائي', sigPlaceholder:'أدخل توقيعك', templatePlaceholder:'أدخل عبارة', emotion:{positive:'😊 إيجابي',negative:'😟 سلبي',urgent:'⚡ عاجل',neutral:'😐 محايد'},urgency:{high:'🔴 عالي',medium:'🟡 متوسط',low:'🟢 منخفض'}, learnedLabel:'تم التعلم', tonePref:'تفضيل النبرة', learnedUnit:' استخدام', styleShort:'موجز', styleMid:'معتدل', styleLong:'مفصّل', refine:'✨ تحسين', refining:'✨ جارٍ التحسين...', refineDone:'✨ تم التحسين!', refineFailed:'فشل التحسين. يرجى المحاولة مجدداً.', refineEmpty:'فشل التحسين: النتيجة فارغة.', refineInput:'يرجى إدخال النص للتحسين.', refinePlanMsg:'التحسين متاح في الخطة Basic أو أعلى.', smartGenerating:'🌍 جارٍ التحليل...' },
  Italian:    { tone:'Tono', country:'Paese mittente', myLang:'La mia lingua', generate:'✨ Genera risposta IA', summary:'📝 Riassumi', settings:'Impostazioni', insert:'Inserisci in Naver', copy:'Copia', regen:'↺', switchLang:'Cambia lingua:', promises:'📌 Impegni', tasks:'📋 Attività & Date', signature:'Firma', template:'Modelli', sigSave:'Salva', save:'Salva', shortcut:'Alt+G Genera · Alt+I Inserisci · Alt+C Copia', limitMsg:'Limite mensile raggiunto', upgrade:'Aggiorna piano', compare:'Confronta', smartReply:'🌍 Risposta intelligente', generating:'Generando...', summarizing:'Riepilogando...', settingsClose:'Chiudi', emailTranslate:'🌐 Traduci nella mia lingua', translating:'🌐 Traduzione...', autoDetect:'🌐 Rilevamento auto', sigPlaceholder:'Inserisci la tua firma', templatePlaceholder:'Inserisci una frase', emotion:{positive:'😊 Positivo',negative:'😟 Negativo',urgent:'⚡ Urgente',neutral:'😐 Neutrale'},urgency:{high:'🔴 Alto',medium:'🟡 Medio',low:'🟢 Basso'}, learnedLabel:'Appreso', tonePref:'pref. tono', learnedUnit:' usi', styleShort:'conciso', styleMid:'moderato', styleLong:'dettagliato', refine:'✨ Raffina', refining:'✨ Raffinando...', refineDone:'✨ Raffinato!', refineFailed:'Raffinamento fallito. Si prega di riprovare.', refineEmpty:'Raffinamento fallito: risultato vuoto.', refineInput:'Inserisci il testo da raffinare.', refinePlanMsg:'Il raffinamento è disponibile nel piano Basic o superiore.', smartGenerating:'🌍 Analizzando...' },
  Turkish:    { tone:'Ton', country:'Gönderici ülke', myLang:'Dilim', generate:'✨ AI yanıtı oluştur', summary:'📝 Özetle', settings:'Ayarlar', insert:"Naver'a ekle", copy:'Kopyala', regen:'↺', switchLang:'Yanıt dilini değiştir:', promises:'📌 Taahhütler', tasks:'📋 Görevler & Tarihler', signature:'İmza', template:'Şablonlar', sigSave:'Kaydet', save:'Kaydet', shortcut:'Alt+G Oluştur · Alt+I Ekle · Alt+C Kopyala', limitMsg:'Aylık limit doldu', upgrade:'Planı güncelle', compare:'Karşılaştır', smartReply:'🌍 Akıllı yanıt', generating:'Oluşturuluyor...', summarizing:'Özetleniyor...', settingsClose:'Kapat', emailTranslate:'🌐 Dilime çevir', translating:'🌐 Çeviriliyor...', autoDetect:'🌐 Otomatik algıla', sigPlaceholder:'İmzanızı girin', templatePlaceholder:'Bir ifade girin', emotion:{positive:'😊 Olumlu',negative:'😟 Olumsuz',urgent:'⚡ Acil',neutral:'😐 Nötr'},urgency:{high:'🔴 Yüksek',medium:'🟡 Orta',low:'🟢 Düşük'}, learnedLabel:'Öğrenildi', tonePref:'ton tercihi', learnedUnit:' kullanım', styleShort:'özlü', styleMid:'orta', styleLong:'ayrıntılı', refine:'✨ İyileştir', refining:'✨ İyileştiriliyor...', refineDone:'✨ İyileştirildi!', refineFailed:'İyileştirme başarısız. Lütfen tekrar deneyin.', refineEmpty:'İyileştirme başarısız: sonuç boş.', refineInput:'Lütfen iyileştirilecek metni girin.', refinePlanMsg:'İyileştirme Basic veya üzeri planda mevcuttur.', smartGenerating:'🌍 Analiz ediliyor...' },
  Vietnamese: { tone:'Tông', country:'Nước người gửi', myLang:'Ngôn ngữ của tôi', generate:'✨ Tạo trả lời AI', summary:'📝 Tóm tắt', settings:'Cài đặt', insert:'Chèn vào Naver', copy:'Sao chép', regen:'↺', switchLang:'Đổi ngôn ngữ:', promises:'📌 Cam kết/Hành động', tasks:'📋 Nhiệm vụ & Ngày', signature:'Chữ ký', template:'Mẫu', sigSave:'Lưu', save:'Lưu', shortcut:'Alt+G Tạo · Alt+I Chèn · Alt+C Sao chép', limitMsg:'Đã đạt giới hạn tháng', upgrade:'Nâng cấp gói', compare:'So sánh', smartReply:'🌍 Trả lời thông minh', generating:'Đang tạo...', summarizing:'Đang tóm tắt...', settingsClose:'Đóng', emailTranslate:'🌐 Dịch sang ngôn ngữ của tôi', translating:'🌐 Đang dịch...', autoDetect:'🌐 Tự động phát hiện', sigPlaceholder:'Nhập chữ ký của bạn', templatePlaceholder:'Nhập cụm từ', emotion:{positive:'😊 Tích cực',negative:'😟 Tiêu cực',urgent:'⚡ Khẩn cấp',neutral:'😐 Trung lập'},urgency:{high:'🔴 Cao',medium:'🟡 Trung bình',low:'🟢 Thấp'}, learnedLabel:'Đã học', tonePref:'sở thích tông', learnedUnit:' lần học', styleShort:'ngắn gọn', styleMid:'vừa phải', styleLong:'chi tiết', refine:'✨ Tinh chỉnh', refining:'✨ Đang tinh chỉnh...', refineDone:'✨ Tinh chỉnh xong!', refineFailed:'Tinh chỉnh thất bại. Vui lòng thử lại.', refineEmpty:'Tinh chỉnh thất bại: kết quả trống.', refineInput:'Vui lòng nhập nội dung cần tinh chỉnh.', refinePlanMsg:'Tinh chỉnh có sẵn trên gói Basic trở lên.', smartGenerating:'🌍 Đang phân tích...' },
  Thai:       { tone:'โทน', country:'ประเทศผู้ส่ง', myLang:'ภาษาของฉัน', generate:'✨ สร้างการตอบ AI', summary:'📝 สรุป', settings:'การตั้งค่า', insert:'แทรกใน Naver', copy:'คัดลอก', regen:'↺', switchLang:'เปลี่ยนภาษา:', promises:'📌 คำมั่น/การดำเนินการ', tasks:'📋 งานและวันที่', signature:'ลายเซ็น', template:'เทมเพลต', sigSave:'บันทึก', save:'บันทึก', shortcut:'Alt+G สร้าง · Alt+I แทรก · Alt+C คัดลอก', limitMsg:'ถึงขีดจำกัดรายเดือน', upgrade:'อัปเกรดแผน', compare:'เปรียบเทียบ', smartReply:'🌍 ตอบอัจฉริยะ', generating:'กำลังสร้าง...', summarizing:'กำลังสรุป...', settingsClose:'ปิด', emailTranslate:'🌐 แปลเป็นภาษาของฉัน', translating:'🌐 กำลังแปล...', autoDetect:'🌐 ตรวจจับอัตโนมัติ', sigPlaceholder:'ป้อนลายเซ็นของคุณ', templatePlaceholder:'ป้อนวลี', emotion:{positive:'😊 เชิงบวก',negative:'😟 เชิงลบ',urgent:'⚡ เร่งด่วน',neutral:'😐 เป็นกลาง'},urgency:{high:'🔴 สูง',medium:'🟡 กลาง',low:'🟢 ต่ำ'}, learnedLabel:'เรียนรู้แล้ว', tonePref:'ต้องการโทน', learnedUnit:' ครั้ง', styleShort:'กระชับ', styleMid:'ปานกลาง', styleLong:'ละเอียด', refine:'✨ ปรับแต่ง', refining:'✨ กำลังปรับแต่ง...', refineDone:'✨ ปรับแต่งเสร็จแล้ว!', refineFailed:'การปรับแต่งล้มเหลว กรุณาลองอีกครั้ง', refineEmpty:'การปรับแต่งล้มเหลว: ผลลัพธ์ว่างเปล่า', refineInput:'กรุณาป้อนข้อความที่ต้องการปรับแต่ง', refinePlanMsg:'การปรับแต่งใช้ได้กับแผน Basic ขึ้นไป', smartGenerating:'🌍 กำลังวิเคราะห์...' },
  Indonesian: { tone:'Nada', country:'Negara pengirim', myLang:'Bahasa saya', generate:'✨ Buat balasan AI', summary:'📝 Ringkasan', settings:'Pengaturan', insert:'Sisipkan ke Naver', copy:'Salin', regen:'↺', switchLang:'Ganti bahasa:', promises:'📌 Komitmen/Tindakan', tasks:'📋 Tugas & Tanggal', signature:'Tanda tangan', template:'Template', sigSave:'Simpan', save:'Simpan', shortcut:'Alt+G Buat · Alt+I Sisipkan · Alt+C Salin', limitMsg:'Batas bulanan tercapai', upgrade:'Upgrade paket', compare:'Bandingkan', smartReply:'🌍 Balasan cerdas', generating:'Membuat...', summarizing:'Meringkas...', settingsClose:'Tutup', emailTranslate:'🌐 Terjemahkan ke bahasa saya', translating:'🌐 Menerjemahkan...', autoDetect:'🌐 Deteksi otomatis', sigPlaceholder:'Masukkan tanda tangan Anda', templatePlaceholder:'Masukkan frasa', emotion:{positive:'😊 Positif',negative:'😟 Negatif',urgent:'⚡ Mendesak',neutral:'😐 Netral'},urgency:{high:'🔴 Tinggi',medium:'🟡 Sedang',low:'🟢 Rendah'}, learnedLabel:'Dipelajari', tonePref:'pref. nada', learnedUnit:' penggunaan', styleShort:'ringkas', styleMid:'sedang', styleLong:'terperinci', refine:'✨ Perhalus', refining:'✨ Memperhalus...', refineDone:'✨ Diperhalus!', refineFailed:'Gagal memperhalus. Silakan coba lagi.', refineEmpty:'Gagal memperhalus: hasil kosong.', refineInput:'Silakan masukkan teks yang ingin diperhalus.', refinePlanMsg:'Perhalus tersedia di paket Basic atau lebih tinggi.', smartGenerating:'🌍 Menganalisis...' },
  Dutch:      { tone:'Toon', country:'Afzenderland', myLang:'Mijn taal', generate:'✨ AI-antwoord genereren', summary:'📝 Samenvatten', settings:'Instellingen', insert:'Invoegen in Naver', copy:'Kopiëren', regen:'↺', switchLang:'Antwoordtaal wijzigen:', promises:'📌 Beloften/Acties', tasks:'📋 Taken & Datums', signature:'Handtekening', template:'Sjablonen', sigSave:'Opslaan', save:'Opslaan', shortcut:'Alt+G Genereer · Alt+I Invoegen · Alt+C Kopiëren', limitMsg:'Maandlimiet bereikt', upgrade:'Plan upgraden', compare:'Vergelijken', smartReply:'🌍 Slim antwoord', generating:'Genereren...', summarizing:'Samenvatten...', settingsClose:'Sluiten', emailTranslate:'🌐 Vertaal naar mijn taal', translating:'🌐 Vertalen...', autoDetect:'🌐 Automatisch detecteren', sigPlaceholder:'Voer uw handtekening in', templatePlaceholder:'Voer een zin in', emotion:{positive:'😊 Positief',negative:'😟 Negatief',urgent:'⚡ Urgent',neutral:'😐 Neutraal'},urgency:{high:'🔴 Hoog',medium:'🟡 Gemiddeld',low:'🟢 Laag'}, learnedLabel:'Geleerd', tonePref:'toonvoorkeur', learnedUnit:' gebruik', styleShort:'beknopt', styleMid:'matig', styleLong:'gedetailleerd', refine:'✨ Verfijnen', refining:'✨ Verfijnen...', refineDone:'✨ Verfijnd!', refineFailed:'Verfijnen mislukt. Probeer opnieuw.', refineEmpty:'Verfijnen mislukt: leeg resultaat.', refineInput:'Voer de te verfijnen tekst in.', refinePlanMsg:'Verfijnen is beschikbaar op het Basic-plan of hoger.', smartGenerating:'🌍 Analyseren...' },
  Polish:     { tone:'Ton', country:'Kraj nadawcy', myLang:'Mój język', generate:'✨ Generuj odpowiedź AI', summary:'📝 Podsumuj', settings:'Ustawienia', insert:'Wstaw do Naver', copy:'Kopiuj', regen:'↺', switchLang:'Zmień język odpowiedzi:', promises:'📌 Zobowiązania', tasks:'📋 Zadania & Daty', signature:'Podpis', template:'Szablony', sigSave:'Zapisz', save:'Zapisz', shortcut:'Alt+G Generuj · Alt+I Wstaw · Alt+C Kopiuj', limitMsg:'Osiągnięto limit miesięczny', upgrade:'Ulepsz plan', compare:'Porównaj', smartReply:'🌍 Inteligentna odpowiedź', generating:'Generowanie...', summarizing:'Podsumowywanie...', settingsClose:'Zamknij', emailTranslate:'🌐 Przetłumacz na mój język', translating:'🌐 Tłumaczenie...', autoDetect:'🌐 Automatyczne wykrywanie', sigPlaceholder:'Wpisz swój podpis', templatePlaceholder:'Wpisz zwrot', emotion:{positive:'😊 Pozytywny',negative:'😟 Negatywny',urgent:'⚡ Pilny',neutral:'😐 Neutralny'},urgency:{high:'🔴 Wysoki',medium:'🟡 Średni',low:'🟢 Niski'}, learnedLabel:'Nauczone', tonePref:'pref. tonu', learnedUnit:' użyć', styleShort:'zwięzły', styleMid:'umiarkowany', styleLong:'szczegółowy', refine:'✨ Dopracuj', refining:'✨ Dopracowywanie...', refineDone:'✨ Dopracowano!', refineFailed:'Dopracowanie nieudane. Spróbuj ponownie.', refineEmpty:'Dopracowanie nieudane: pusty wynik.', refineInput:'Proszę wprowadzić tekst do dopracowania.', refinePlanMsg:'Dopracowanie jest dostępne w planie Basic lub wyższym.', smartGenerating:'🌍 Analizowanie...' },
  Hindi:      { tone:'स्वर', country:'प्रेषक देश', myLang:'मेरी भाषा', generate:'✨ AI उत्तर बनाएं', summary:'📝 सारांश', settings:'सेटिंग्स', insert:'Naver में डालें', copy:'कॉपी करें', regen:'↺', switchLang:'उत्तर भाषा बदलें:', promises:'📌 वादे/कार्य', tasks:'📋 कार्य और तिथियां', signature:'हस्ताक्षर', template:'टेम्पलेट', sigSave:'सहेजें', save:'सहेजें', shortcut:'Alt+G बनाएं · Alt+I डालें · Alt+C कॉपी करें', limitMsg:'मासिक सीमा पहुंच गई', upgrade:'प्लान अपग्रेड करें', compare:'तुलना करें', smartReply:'🌍 स्मार्ट उत्तर', generating:'बना रहे हैं...', summarizing:'सारांश बना रहे हैं...', settingsClose:'बंद करें', emailTranslate:'🌐 मेरी भाषा में अनुवाद करें', translating:'🌐 अनुवाद हो रहा है...', autoDetect:'🌐 स्वचालित पहचान', sigPlaceholder:'अपना हस्ताक्षर दर्ज करें', templatePlaceholder:'एक वाक्यांश दर्ज करें', emotion:{positive:'😊 सकारात्मक',negative:'😟 नकारात्मक',urgent:'⚡ तत्काल',neutral:'😐 तटस्थ'},urgency:{high:'🔴 उच्च',medium:'🟡 मध्यम',low:'🟢 निम्न'}, learnedLabel:'सीखा', tonePref:'स्वर प्राथमिकता', learnedUnit:' उपयोग', styleShort:'संक्षिप्त', styleMid:'मध्यम', styleLong:'विस्तृत', refine:'✨ परिष्कृत करें', refining:'✨ परिष्कृत हो रहा है...', refineDone:'✨ परिष्कृत हो गया!', refineFailed:'परिष्करण विफल। कृपया फिर से प्रयास करें।', refineEmpty:'परिष्करण विफल: परिणाम खाली है।', refineInput:'कृपया परिष्कृत करने के लिए पाठ दर्ज करें।', refinePlanMsg:'परिष्करण Basic या उससे ऊपर के प्लान में उपलब्ध है।', smartGenerating:'🌍 विश्लेषण हो रहा है...' },
};

function detectBrowserLang() {
  const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase().split('-')[0];
  const m = {'ko':'Korean','ja':'Japanese','zh':'Chinese','de':'German','fr':'French','pt':'Portuguese','ar':'Arabic','es':'Spanish','vi':'Vietnamese','th':'Thai','id':'Indonesian','it':'Italian','tr':'Turkish','nl':'Dutch','pl':'Polish','hi':'Hindi'};
  return m[nav] || 'English';
}
function getUILangNV(lang) { const r = lang === 'auto' ? detectBrowserLang() : lang; return UI_STRINGS_NV[r] || UI_STRINGS_NV['English']; }

function getToneOptionsNV(lang) {
  const labels = TONES_I18N_NV[lang] || TONES_I18N_NV['English'];
  return TONE_KEYS_NV.map((k, i) => `<option value="${k}">${labels[i]}</option>`).join('');
}


// ===== 스타일 학습 =====
function learnStyleNV(tone, emailContent, reply) {
  chrome.storage.local.get(['styleHistory_nv'], data => {
    const history = data['styleHistory_nv'] || [];
    history.push({ tone, emailLen: emailContent.length, replyLen: reply.length, time: Date.now() });
    if (history.length > 20) history.shift();
    chrome.storage.local.set({ 'styleHistory_nv': history });
    if (history.length >= 3) {
      const toneCounts = {};
      history.forEach(h => { toneCounts[h.tone] = (toneCounts[h.tone]||0)+1; });
      const favTone = Object.keys(toneCounts).sort((a,b) => toneCounts[b]-toneCounts[a])[0];
      const avgLen = Math.round(history.reduce((s,h) => s+h.replyLen,0)/history.length);
      const uiNV = getUILangNV(nvSelectedMyLang);
      const styleNV = avgLen<200?(uiNV.styleShort||'간결하게'):avgLen<500?(uiNV.styleMid||'보통 길이'):(uiNV.styleLong||'상세하게');
      chrome.storage.local.set({ 'learnedStyle_nv': { favTone, style: styleNV, count: history.length } });
      if (history.length === 3) showToastNV(`✨ ${uiNV.learnedLabel||'학습됨'}: ${favTone} ${uiNV.tonePref||'톤 선호'}`, 'success');
    }
  });
}
// ===== State =====
let nvCurrentPanel = null;
let nvSelectedTone = 'professional';
let nvSelectedMyLang = 'Korean';
let nvSelectedCountry = 'auto';
let nvCachedEmotion = 'neutral';
let nvCachedUrgency = 'low';

// ===== Safe Storage =====
function safeStorageGetNV(keys) {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(keys, data => {
        if (chrome.runtime.lastError) resolve({});
        else resolve(data || {});
      });
    } catch(e) { resolve({}); }
  });
}

function safeStorageSetNV(obj) {
  return new Promise(resolve => {
    try { chrome.storage.sync.set(obj, () => { void chrome.runtime.lastError; resolve(); }); }
    catch(e) { resolve(); }
  });
}

// ===== Get User Data =====
async function getUserDataNV() {
  const d = await safeStorageGetNV(['userEmail','userId','userPlan','monthlyCount','monthlyMonth','monthlyLimit','businessCard']);
  const plan = d.userPlan || 'free';
  const monthlyLimit = d.monthlyLimit || PLAN_LIMITS_NV[plan]?.monthly || 35;
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthlyCount = d.monthlyMonth === thisMonth ? (d.monthlyCount || 0) : 0;
  let phrases = [];
  if (d.userEmail) {
    try {
      const pr = await fetch(`${WORKER_URL_NV}/phrases?email=${encodeURIComponent(d.userEmail)}`);
      if (pr.ok) { const pd = await pr.json(); if (pd.success) phrases = (pd.phrases || []).map(p => p.text || p).filter(Boolean); }
    } catch (_) {}
  }
  return { userEmail: d.userEmail || null, userId: d.userId || null, plan, monthlyLimit, monthlyCount, businessCard: d.businessCard || '', phrases };
}

async function incrementUsageNV(serverCount) {
  const thisMonth = new Date().toISOString().slice(0,7);
  const d = await safeStorageGetNV(['monthlyCount','monthlyMonth']);
  const cur = d.monthlyMonth === thisMonth ? (d.monthlyCount||0) : 0;
  await safeStorageSetNV({ monthlyCount: serverCount !== undefined ? serverCount : cur + 1, monthlyMonth: thisMonth });
}

async function syncUsageNV(email) {
  try {
    const res = await fetch(`${WORKER_URL_NV}/status`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (data.plan) {
      const plan = data.plan;
      const monthlyLimit = PLAN_LIMITS_NV[plan]?.monthly || 35;
      const thisMonth = new Date().toISOString().slice(0,7);
      await safeStorageSetNV({ userPlan: plan, monthlyLimit, monthlyCount: data.monthlyUsed||0, monthlyMonth: thisMonth });
    }
  } catch(e) {}
}

// ===== Sanitize =====
function sanitizeNV(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Toast =====
function showToastNV(msg, type='info') {
  const existing = document.getElementById('mm-nv-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'mm-nv-toast';
  const bg = type==='success'?'#137333':type==='error'?'#c5221f':'#1a73e8';
  toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${bg};color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:2147483646;box-shadow:0 2px 8px rgba(0,0,0,0.3);max-width:280px`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== Badge =====
function updateBadgeNV() {
  getUserDataNV().then(ud => {
    const badge = document.getElementById('mm-nv-badge');
    if (!badge) return;
    const left = Math.max(0, ud.monthlyLimit - ud.monthlyCount);
    badge.textContent = left;
    badge.style.background = left <= 5 ? '#c5221f' : left <= 15 ? '#f29900' : '#e91e8c';
  });
}


// Strip Korean/English recipient salutation from reply text
function _stripSalutationNV(text) {
  if (!text) return text;
  let t = text.trim();
  t = t.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]?\s*[\r\n]+/, '').trim();
  t = t.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]\s*/, '').trim();
  t = t.replace(/^(?:Dear\s+(?:Sir\/Madam|Sir|Madam|Mr\.\s*\w+|Ms\.\s*\w+|Mrs\.\s*\w+|Dr\.\s*\w+|[\w\s]{1,30})|To\s+Whom\s+It\s+May\s+Concern|Hi\s+[\w\s]{1,20}|Hello\s+[\w\s]{1,20})\s*[,，]?\s*[\r\n]+/i, '').trim();
  t = t.replace(/^.{1,20}(?:様|さん)\s*[\r\n]+/, '').trim();
  t = t.replace(/^(?:尊敬的.{1,10}|.{1,10}您好)[，,]?\s*[\r\n]+/, '').trim();
  return t;
}

// ===== Append Signature =====
async function appendSignatureNV(reply) {
  const d = await safeStorageGetNV(['signature']);
  if (!d.signature || !d.signature.trim()) return reply;
  const lang = nvSelectedMyLang || 'Korean';
  if (lang !== 'Korean') {
    try {
      const r = await fetch(`${WORKER_URL_NV}/translate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: d.signature.trim(), targetLanguage: lang })
      }).then(r => r.json());
      return reply + '\n\n--\n' + ((r.success && r.translated) ? r.translated : d.signature.trim());
    } catch(e) { return reply + '\n\n--\n' + d.signature.trim(); }
  }
  return reply + '\n\n--\n' + d.signature.trim();
}

// ===== Auto-detect country from email =====
function autoDetectCountryNV(emailContent) {
  if (!emailContent) return null;
  const text = emailContent.toLowerCase();
  const emailMatch = emailContent.match(/from:.*?@([\w.-]+)/i) || emailContent.match(/<([\w._%+-]+@[\w.-]+\.[a-z]{2,})>/i);
  const domain = emailMatch ? emailMatch[1].toLowerCase() : '';

  if (domain.endsWith('.jp') || domain.includes('rakuten') || domain.includes('softbank') || domain.includes('docomo')) return 'Japan';
  if (domain.endsWith('.cn') || domain.endsWith('.com.cn') || domain.includes('alibaba')) return 'China';
  if (domain.endsWith('.de') || domain.endsWith('.at') || domain.endsWith('.ch')) return 'Germany';
  if (domain.endsWith('.fr')) return 'France';
  if (domain.endsWith('.br') || domain.endsWith('.com.br')) return 'Brazil';
  if (domain.endsWith('.sa') || domain.endsWith('.ae') || domain.endsWith('.qa') || domain.endsWith('.kw')) return 'Arabia';
  if (domain.endsWith('.kr') || domain.endsWith('.co.kr')) return 'Korea';
  if (domain.endsWith('.us') || domain.endsWith('.gov') || domain.endsWith('.edu')) return 'USA';

  if (/[぀-ヿ]/.test(emailContent)) return 'Japan';
  if (/[가-힯]/.test(emailContent)) return 'Korea';
  if (/[一-鿿]/.test(emailContent)) return 'China';
  if (/[؀-ۿ]/.test(emailContent)) return 'UAE';
  if (/\.de\b|germany|deutschland|guten tag|mit freundlichen/.test(text)) return 'Germany';
  if (/\.fr\b|france|bonjour|cordialement/.test(text)) return 'France';
  if (/\.jp\b|japan|tokyo|osaka/.test(text)) return 'Japan';

  const cleanText = emailContent.replace(/\s+/g, '');
  const asciiRatio = (cleanText.match(/[\x20-\x7E]/g) || []).length / (cleanText.length || 1);
  if (asciiRatio > 0.85) return 'USA';

  return null;
}

// ===== Emotion Detection =====
function detectEmotionNV(emailContent) {
  const text = emailContent.toLowerCase();
  let emotion = 'neutral', urgency = 'low';
  if (/urgent|asap|immediately|critical|emergency|긴급|즉시|빨리/.test(text)) { urgency='high'; emotion='urgent'; }
  else if (/deadline|due date|by tomorrow|마감|기한/.test(text)) { urgency='medium'; }
  if (/thank|appreciate|grateful|wonderful|감사|고맙/.test(text)) emotion='positive';
  else if (/complain|disappointed|frustrated|unacceptable|불만|실망|화/.test(text)) emotion='negative';
  return { emotion, urgency };
}

// ===== Extract Promises =====
function extractPromisesNV(text, lang) {
  const promises = [];
  const t = text.toLowerCase();
  const P = { Korean:{ send:'보낼 예정:', confirm:'확인할 예정:', followup:'후속 조치 예정:', meet:'미팅 예정:' }, English:{ send:'Will send:', confirm:'Will confirm:', followup:'Will follow up:', meet:'Meeting scheduled:' }, Japanese:{ send:'送付予定:', confirm:'確認予定:', followup:'フォローアップ予定:', meet:'ミーティング予定:' } };
  const p = P[lang] || P['English'];
  if (/i will send|보내드리겠|送ります/.test(t)) promises.push(p.send);
  if (/i will confirm|확인하겠|確認します/.test(t)) promises.push(p.confirm);
  if (/will follow up|팔로업|フォロー/.test(t)) promises.push(p.followup);
  if (/meeting|schedule|미팅|ミーティング/.test(t)) promises.push(p.meet);
  return promises;
}

// ===== Read Naver Email Thread (강화된 DOM 탐색) =====
function getNaverEmailThread() {
  // 1순위: 텍스트가 충분히 긴 요소들 — 현재 DOM 클래스 우선
  const primarySelectors = [
    // Naver Mail DOM selectors
    '.mail_view_body',
    '.mail_view_content',
    '#mailViewContent',
    '.read_body',
    '.viewer_text',
    '.mail_read_body',
    '[class*="mail_view"]',
    '[class*="mailView"]',
    '[data-testid="mail-body"]',
    '[data-testid="message-body"]',
    '._mailBodyWrap',
    '#viewMailContent',
    '.bodyArea',
    '.mail_body',
    '[class*="mailBody"]',
    '[class*="MailBody"]',
    '.se-main-container',
    '[class*="viewBody"]',
    '[data-role="mail-body"]',
    // Naver Mail mobile web selectors
    '[class*="content_body"]',
    '[class*="contentBody"]',
    '[class*="view_content"]',
    '[class*="viewContent"]',
    '.nm-content',
    '[class*="NM_mail"]',
    '[class*="nm_mail"]',
    '.mail_view',
    '[class*="mail_content"]',
    '[class*="mailContent"]',
  ];

  for (const sel of primarySelectors) {
    try {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        const texts = Array.from(els)
          .map(el => el.innerText || el.textContent || '')
          .filter(t => t.trim().length > 30);
        if (texts.length > 0) return texts.join('\n\n').slice(0, 8000);
      }
    } catch(e) {}
  }

  // 2순위: iframe 내부 탐색 (메시지를 iframe으로 렌더링할 수 있음)
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) continue;
      const body = doc.body;
      if (body) {
        const text = body.innerText || body.textContent || '';
        if (text.trim().length > 50) return text.slice(0, 8000);
      }
    } catch(e) {} // cross-origin 이면 에러 — 무시
  }

  // 3순위: 상세 fallback — 긴 텍스트를 가진 div 탐색
  // Naver Mail에서 실제로 열린 이메일이 있는 오른쪽 패널
  const fallbackSelectors = [
    '.mail-content-area',
    '.detail-area',
    '[data-message-id]',
    '.message-detail',
    '.thread-content',
    '.mail-thread-detail',
    
    '[role="article"]',
    '[role="region"] [role="main"]',
  ];
  for (const sel of fallbackSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.innerText || el.textContent || '';
        if (text.trim().length > 50) return text.slice(0, 8000);
      }
    } catch(e) {}
  }

  // 4순위: 최후 수단 — DOM에서 긴 텍스트를 포함한 div 찾기
  // Naver 우측 reading pane은 보통 화면 오른쪽 절반 차지
  try {
    const allDivs = document.querySelectorAll('div[class]');
    let bestEl = null, bestLen = 100;
    for (const div of allDivs) {
      // 너무 큰 컨테이너 제외 (nav, sidebar 등)
      if (div.children.length > 50) continue;
      const rect = div.getBoundingClientRect();
      // 화면 우측 영역 (x > 200) 이고 적당한 높이
      if (rect.left < 200 || rect.width < 200) continue;
      const text = div.innerText || '';
      if (text.length > bestLen && text.length < 50000) {
        bestEl = div;
        bestLen = text.length;
      }
    }
    if (bestEl) return (bestEl.innerText || '').slice(0, 8000);
  } catch(e) {}

  return null;
}

// ===== 메일이 실제로 열려 있는지 감지 (Naver Mail) =====
function isEmailOpenNV() {
  // Naver Mail에서 이메일이 선택되어 오른쪽에 내용이 표시될 때만 true
  const strictSelectors = [
    '.mail_view_body',
    '.mail_view_content',
    '#mailViewContent',
    '.read_body',
    '.viewer_text',
    '[class*="mail_view"]',
  ];
  for (const sel of strictSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.innerText || el.textContent || '';
        if (text.trim().length > 20) return true;
      }
    } catch(e) {}
  }

  // iframe 안에 내용 있는 경우
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) continue;
      const text = doc.body?.innerText || '';
      if (text.trim().length > 200) return true;
    } catch(e) {}
  }

  return false;
}

// ===== Naver Mail UI 자체가 로드됐는지 (mail app 뼈대) =====
function isMailUIReadyNV() {
  // v2 URL 기반 우선 체크 (mail.naver.com/v2/)
  if (location.href.includes('mail.naver.com/v2') || location.href.includes('mail.naver.com/#') ) {
    return !!(
      document.querySelector('#__nuxt') ||
      document.querySelector('[class*="MailLayout"]') ||
      document.querySelector('[class*="Layout_wrap"]') ||
      document.querySelector('[class*="mail_layout"]') ||
      document.querySelector('[class*="MailList"]') ||
      document.querySelector('[class*="MailItem"]') ||
      document.querySelector('[class*="NaverMail"]') ||
      document.querySelector('div[data-v-app]') ||
      document.querySelector('.v-application') ||
      document.body.children.length > 3
    );
  }
  // 구버전 v1 선택자
  return !!(
    document.querySelector('.mail_list_wrap') ||
    document.querySelector('.mail_list') ||
    document.querySelector('.read_mail') ||
    document.querySelector('#mailApp') ||
    document.querySelector('[class*="mail_wrap"]') ||
    document.querySelector('.aside_mail') ||
    document.querySelector('#container.mail') ||
    document.querySelector('.GNBlog_mail__') ||
    document.querySelector('[class*="MailApp"]') ||
    document.querySelector('[class*="mailApp"]')
  );
}

// ===== Insert Reply into Naver Compose/Reply Area =====
// Naver Mail compose area detection:
// 1. Try direct DOM insertion (Shadow DOM traversal)
// 2. Fallback: clipboard


function insertReplyNaver(text) {
  function _getAllEd(root) {
    const results = [];
    try {
      // Naver SmartEditor 3 compose area first
      results.push(...root.querySelectorAll('.se-text-container [contenteditable="true"]'));
      results.push(...root.querySelectorAll('.se-module-text [contenteditable="true"]'));
      results.push(...root.querySelectorAll('[contenteditable="true"],[role="textbox"],textarea'));
      root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) results.push(..._getAllEd(el.shadowRoot));
      });
    } catch(e) {}
    return results;
  }
  function _insertEl(el, txt) {
    try { el.click(); } catch(e) {}
    el.focus();
    if (el.tagName === 'TEXTAREA') { el.value = txt; el.dispatchEvent(new Event('input',{bubbles:true})); return true; }
    const before = el.textContent;
    const ownerDoc = el.ownerDocument || document;
    const range = ownerDoc.createRange();
    range.selectNodeContents(el);
    const sel2 = ownerDoc.getSelection();
    if (sel2) { sel2.removeAllRanges(); sel2.addRange(range); }
    ownerDoc.execCommand('insertText', false, txt);
    if (el.textContent !== before || el.textContent.trim() === txt.trim()) return true;
    el.innerHTML = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    el.dispatchEvent(new Event('input',{bubbles:true}));
    return el.textContent.trim().length > 0;
  }
  function _tryRoot(root) {
    const all = _getAllEd(root);
    const candidates = all.filter(el => {
      try { if (el.closest('#mm-nv-float-panel')||el.closest('#mm-float-panel')||el.closest('#mm-nv-panel')) return false; } catch(e) {}
      try { if (el.closest('.mail_view_body')||el.closest('.mail_view_content')||el.closest('#mailViewContent')) return false; } catch(e) {}
      const rect = el.getBoundingClientRect();
      return rect.width > 50;
    });
    if (!candidates.length) return false;
    // Prefer Naver SmartEditor: large editor areas, not readonly, not in reading pane
    candidates.sort((a,b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (rb.height * rb.width) - (ra.height * ra.width);
    });
    for (const el of candidates) { if (_insertEl(el,text)) return true; }
    return false;
  }

  // 1차: main document (Shadow DOM 포함)
  if (_tryRoot(document)) { showToastNV('✦ 네이버 작성창에 삽입했습니다!', 'success'); return; }

  // 2차: same-origin iframes
  for (const iframe of document.querySelectorAll('iframe')) {
    try {
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iDoc && _tryRoot(iDoc)) { showToastNV('✦ 네이버 작성창에 삽입했습니다!', 'success'); return; }
    } catch(e) {}
  }

  // fallback: clipboard
  navigator.clipboard.writeText(text).then(() => showPasteOverlayNV()).catch(() => showToastNV('⚠️ 클립보드 접근 실패 — 수동으로 복사해주세요', 'error'));
}

function showPasteOverlayNV() {
  // Remove existing overlay
  const existing = document.getElementById('mm-nv-paste-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'mm-nv-paste-overlay';
  overlay.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:#1a1a2e;color:#fff;padding:14px 20px;border-radius:12px;
    font-size:14px;font-weight:600;z-index:2147483647;
    box-shadow:0 4px 20px rgba(0,0,0,0.4);text-align:center;
    animation:mmSlideUp 0.3s ease;min-width:260px;
  `;
  // 언어 설정에 따라 토스트 텍스트 변경
  const _overlayLangEl = document.getElementById('mm-nv-lang');
  const _overlayLang = (_overlayLangEl && _overlayLangEl.value) ? _overlayLangEl.value :
    (typeof nvSelectedMyLang !== 'undefined' ? nvSelectedMyLang : 'Korean');
  const _overlayTexts = {
    Korean:     { copied:'답장이 복사되었습니다!', paste:'답장 창에서 <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) 로 붙여넣기', ok:'확인' },
    English:    { copied:'Reply copied!', paste:'Paste with <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) in the reply window', ok:'OK' },
    Japanese:   { copied:'返信がコピーされました！', paste:'返信欄で <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) で貼り付け', ok:'確認' },
    Chinese:    { copied:'回复已复制！', paste:'在回复窗口中按 <b>Ctrl+V</b>（Mac: <b>⌘+V</b>）粘贴', ok:'确认' },
    Spanish:    { copied:'¡Respuesta copiada!', paste:'Pega con <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) en la ventana de respuesta', ok:'OK' },
    French:     { copied:'Réponse copiée !', paste:'Collez avec <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) dans la fenêtre de réponse', ok:'OK' },
    German:     { copied:'Antwort kopiert!', paste:'Mit <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) im Antwortfenster einfügen', ok:'OK' },
    Portuguese: { copied:'Resposta copiada!', paste:'Cole com <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) na janela de resposta', ok:'OK' },
    Arabic:     { copied:'تم نسخ الرد!', paste:'الصق بـ <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) في نافذة الرد', ok:'موافق' },
    Italian:    { copied:'Risposta copiata!', paste:'Incolla con <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) nella finestra di risposta', ok:'OK' },
    Turkish:    { copied:'Yanıt kopyalandı!', paste:'Yanıt penceresine <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) ile yapıştırın', ok:'Tamam' },
    Vietnamese: { copied:'Đã sao chép câu trả lời!', paste:'Dán bằng <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) vào cửa sổ trả lời', ok:'OK' },
    Thai:       { copied:'คัดลอกการตอบกลับแล้ว!', paste:'วางด้วย <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) ในหน้าต่างตอบกลับ', ok:'ตกลง' },
    Indonesian: { copied:'Balasan disalin!', paste:'Tempel dengan <b>Ctrl+V</b> (Mac: <b>⌘+V</b>) di jendela balasan', ok:'OK' },
  };
  const _ot = _overlayTexts[_overlayLang] || _overlayTexts['English'];
  overlay.innerHTML = `
    <div style="font-size:22px;margin-bottom:6px">📋</div>
    <div>${_ot.copied}</div>
    <div style="font-size:12px;opacity:0.8;margin-top:4px">${_ot.paste}</div>
    <div style="margin-top:10px">
      <button onclick="document.getElementById('mm-nv-paste-overlay').remove()"
        style="background:#e91e8c;border:none;color:#fff;padding:6px 18px;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600">${_ot.ok}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Auto-remove after 5 seconds
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 5000);
}

// ===== Remove Panel =====
function removeNVPanel() {
  if (nvCurrentPanel) { nvCurrentPanel.remove(); nvCurrentPanel = null; }
}

// ===== Char Count =====
function updateCharCountNV() {
  if (!nvCurrentPanel) return;
  const out = nvCurrentPanel.querySelector('#mm-nv-output');
  const cc = nvCurrentPanel.querySelector('#mm-nv-char-count');
  if (out && cc) cc.textContent = `${out.value.length} chars`;
}

// ===== FAB 표시/숨기기 =====
function showFabNV() {
  const fab = document.getElementById('mm-nv-fab');
  if (fab) fab.style.display = 'flex';
}

function hideFabNV() {
  const fab = document.getElementById('mm-nv-fab');
  if (fab) fab.style.display = 'none';
}

// ===== Create Panel =====
async function createNaverPanel() {
  if (nvCurrentPanel) {
    // 이미 패널이 있으면 토글
    const isHidden = nvCurrentPanel.style.display === 'none';
    nvCurrentPanel.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) hideFabNV(); else showFabNV();
    return;
  }

  const stored = await safeStorageGetNV(['myLanguage','userPlan']);
  nvSelectedMyLang = stored.myLanguage || 'Korean';
  const plan = stored.userPlan || 'free';
  const ui = getUILangNV(nvSelectedMyLang);

  const toneOptions = getToneOptionsNV(nvSelectedMyLang);
  const countryOptions = COUNTRIES_NV.map(c=>`<option value="${c.value}">${c.label}</option>`).join('');
  const langOptions = Object.keys(LANG_FLAGS_NV).map(l=>`<option value="${l}"${l===nvSelectedMyLang?' selected':''}>${LANG_FLAGS_NV[l]} ${l}</option>`).join('');

  const panel = document.createElement('div');
  panel.id = 'mm-nv-panel';
  nvCurrentPanel = panel;
  panel.style.cssText = 'position:fixed;right:16px;top:70px;width:360px;height:calc(100vh - 90px);max-height:680px;overflow-y:auto;background:#fff;border:1px solid #e0e0e0;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);z-index:2147483645;display:flex;flex-direction:column;font-family:"Google Sans",Arial,sans-serif;font-size:13px;color:#202124;cursor:default;';

  panel.innerHTML = `
    <div id="mm-nv-drag-handle" style="background:#e91e8c;color:#fff;padding:12px 14px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;cursor:move;user-select:none">
      <div>
        <div style="font-size:15px;font-weight:700">✦ MailMind</div>
        <div style="font-size:10px;opacity:0.8;margin-top:1px">AI Email Reply · Naver Mail</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div id="mm-nv-badge" style="background:#e91e8c;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.5)">-</div>
        <button id="mm-nv-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:#fff;padding:0;line-height:1">×</button>
      </div>
    </div>

    <div style="padding:12px 14px;flex:1;overflow-y:auto">
      <div id="mm-nv-email-status" style="margin-bottom:8px;padding:8px 10px;background:#fff8e1;border-radius:8px;font-size:11px;color:#b8860b;display:none">
        📧 이메일을 선택하면 AI 분석이 시작됩니다
      </div>

      <div id="mm-nv-emotion-bar" style="display:none;margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap">
        <span id="mm-nv-emotion-badge" style="font-size:11px;padding:3px 10px;border-radius:100px;background:#fff3e0;color:#e65100;font-weight:600"></span>
        <span id="mm-nv-urgency-badge" style="font-size:11px;padding:3px 10px;border-radius:100px;background:#fce4ec;color:#c62828;font-weight:600"></span>
      </div>

      <div id="mm-nv-spam" style="display:none;background:#fce8e6;border:1.5px solid #d93025;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#c5221f;line-height:1.6;white-space:pre-line"></div>

      <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
        <div style="flex:1;min-width:90px">
          <label id="mm-nv-label-tone" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">${ui.tone}</label>
          <select id="mm-nv-tone" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">${toneOptions}</select>
        </div>
        <div style="flex:1;min-width:90px">
          <label id="mm-nv-label-country" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">${ui.country}</label>
          <select id="mm-nv-country" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">${countryOptions}</select>
        </div>
        <div style="flex:1;min-width:90px">
          <label id="mm-nv-label-mylang" style="font-size:10px;color:#9aa0a6;display:block;margin-bottom:2px">${ui.myLang}</label>
          <select id="mm-nv-lang" style="width:100%;padding:6px 8px;border:1px solid #dadce0;border-radius:8px;font-size:12px;color:#202124;background:#fff;cursor:pointer">${langOptions}</select>
        </div>
      </div>

      <div id="mm-nv-detect-info" style="display:none;margin-bottom:8px;padding:8px 10px;background:#f0f7ff;border-radius:8px;font-size:11px;color:#1a73e8;line-height:1.6"></div>

      <button id="mm-nv-gen" style="width:100%;padding:10px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px">${ui.generate}</button>

      <div id="mm-nv-pro-btns" style="display:flex;gap:8px;margin-bottom:8px"></div>

      <button id="mm-nv-email-translate" style="width:100%;padding:7px;background:#fff;color:#1a73e8;border:1px solid #1a73e8;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;margin-bottom:8px">${ui.emailTranslate}</button>
      <div id="mm-nv-email-translated" style="display:none;margin-bottom:8px;padding:10px;background:#e8f0fe;border-radius:8px;font-size:12px;color:#202124;line-height:1.6;white-space:pre-wrap"></div>

      <button id="mm-nv-summarize" style="width:100%;padding:7px;background:#fff;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;margin-bottom:8px">${ui.summary}</button>
      <div id="mm-nv-thread-summary" style="display:none;margin-bottom:8px;padding:10px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#202124;line-height:1.6"></div>

      <div id="mm-nv-summary" style="display:none;margin-bottom:8px;padding:10px;background:#e6f4ea;border-radius:8px;font-size:12px;color:#137333;line-height:1.6"></div>

      <div id="mm-nv-lang-btn" style="display:none;margin-bottom:8px">
        <button id="mm-nv-switch-lang" style="width:100%;padding:7px;background:#1a73e8;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer">🌐 Send in original language</button>
      </div>

      <div id="mm-nv-versions" style="display:none;margin-bottom:8px">
        <div id="mm-nv-ver-tabs" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"></div>
      </div>

      <div id="mm-nv-promises" style="display:none;margin-bottom:8px">
        <div id="mm-nv-promises-title" style="font-size:11px;font-weight:600;color:#1a73e8;margin-bottom:6px">${ui.promises}</div>
        <div id="mm-nv-promises-list" style="background:#e8f0fe;border-radius:8px;padding:8px 10px;font-size:11px;color:#1a73e8;line-height:1.8"></div>
      </div>

      <div id="mm-nv-tasks" style="display:none;margin-bottom:8px">
        <div id="mm-nv-tasks-title" style="font-size:11px;font-weight:600;color:#b8860b;margin-bottom:6px">${ui.tasks}</div>
        <div id="mm-nv-tasks-list" style="display:flex;flex-direction:column;gap:4px"></div>
      </div>

      <div id="mm-nv-result" style="display:none">
        <textarea id="mm-nv-output" rows="6" oninput="updateCharCountNV()" style="width:100%;border:1px solid #dadce0;border-radius:8px;padding:10px;font-size:13px;line-height:1.6;color:#202124;background:#f8f9fa;font-family:inherit;box-sizing:border-box;resize:vertical"></textarea>

        <div id="mm-nv-lang-switch" style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap">
          <span id="mm-nv-switch-label" style="font-size:10px;color:#5f6368;align-self:center;margin-right:2px">${ui.switchLang}</span>
          ${['Korean','English','Japanese','Chinese','Spanish','French','German','Portuguese','Arabic','Italian','Turkish','Vietnamese','Thai','Indonesian'].map(l=>`<button class="mm-nv-lang-btn" data-lang="${l}" style="padding:3px 8px;border:1px solid #dadce0;border-radius:12px;font-size:11px;cursor:pointer;background:#fff">${LANG_FLAGS_NV[l]||l}</button>`).join('')}
        </div>

        <div style="display:flex;gap:6px;margin-top:8px">
          <span id="mm-nv-char-count" style="font-size:10px;color:#9aa0a6;align-self:center;flex:1"></span>
          <div id="mm-nv-guard" style="display:none;background:#fff8e1;border-radius:6px;padding:6px 10px;font-size:11px;color:#b8860b;line-height:1.5">
            <div id="mm-nv-guard-title" style="font-weight:600;margin-bottom:2px">🛡️ Smart Reply Guard</div>
            <div id="mm-nv-guard-text"></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="mm-nv-insert" style="flex:2;padding:9px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">${ui.insert}</button>
          <button id="mm-nv-copy" style="flex:1;padding:9px;background:#fff;color:#e91e8c;border:1.5px solid #e91e8c;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">${ui.copy}</button>
          <button id="mm-nv-edit-btn" title="편집/다듬기" style="padding:9px 12px;background:#f8f9fa;color:#673ab7;border:1px solid #dadce0;border-radius:8px;font-size:12px;cursor:pointer">✏️</button>
          <button id="mm-nv-attach" title="파일 첨부" style="padding:9px 12px;background:#f8f9fa;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:12px;cursor:pointer">📎</button>
          <button id="mm-nv-regen" style="padding:9px 12px;background:#f8f9fa;color:#5f6368;border:1px solid #dadce0;border-radius:8px;font-size:12px;cursor:pointer">${ui.regen}</button>
        </div>
        <div id="mm-nv-edit-bar" style="display:none;gap:8px;margin-top:6px">
          <button id="mm-nv-edit-done" style="flex:1;padding:8px;background:#34a853;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">✅ 완료</button>
          <button id="mm-nv-refine-btn" style="flex:1;padding:8px;background:#673ab7;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">✨ 다듬기</button>
        </div>
      </div>

      <div id="mm-nv-upgrade" style="display:none;margin-top:10px;text-align:center;padding:12px;background:#fef7e0;border-radius:8px">
        <p id="mm-nv-limit-msg" style="font-size:12px;color:#5f6368;margin:0 0 8px">${ui.limitMsg}</p>
        <a href="https://mailmind.yongcha.app#pricing" target="_blank" style="font-size:13px;font-weight:500;color:#1a73e8;text-decoration:none;padding:6px 16px;border:1px solid #1a73e8;border-radius:6px">${ui.upgrade}</a>
      </div>

      <div id="mm-nv-settings" style="display:none;margin-top:10px;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0">
        <div id="mm-nv-settings-title" style="font-size:12px;font-weight:600;color:#202124;margin-bottom:8px">${ui.settings}</div>
        <div style="margin-bottom:10px">
          <label id="mm-nv-label-sig" style="font-size:11px;color:#5f6368">${ui.signature}</label>
          <textarea id="mm-nv-signature-input" rows="3" placeholder="${ui.sigPlaceholder}" style="width:100%;margin-top:4px;padding:6px;border:1px solid #dadce0;border-radius:6px;font-size:11px;box-sizing:border-box;resize:vertical"></textarea>
          <button id="mm-nv-save-signature" style="margin-top:4px;padding:4px 10px;background:#e91e8c;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer">${ui.sigSave}</button>
        </div>
        <div style="margin-bottom:10px">
          <label id="mm-nv-label-template" style="font-size:11px;color:#5f6368">${ui.template}</label>
          <div id="mm-nv-templates-list" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px"></div>
        </div>
        <div style="font-size:10px;color:#9aa0a6;border-top:1px solid #e0e0e0;padding-top:6px">
          <span id="mm-nv-shortcut-hint">${ui.shortcut}</span>
        </div>
      </div>

      <button id="mm-nv-settings-toggle" style="width:100%;margin-top:8px;padding:6px;background:#f1f3f4;color:#202124;border:1px solid #bdc1c6;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer">${ui.settings}</button>
    </div>
  `;

  document.body.appendChild(panel);

  // ===== Drag to move (reply panel) =====
  (function() {
    const handle = panel.querySelector('#mm-nv-drag-handle');
    if (!handle) return;
    let dragging = false, ox = 0, oy = 0;
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      dragging = true;
      // convert right/bottom to left/top for free positioning, preserve height for scroll
      const rect = panel.getBoundingClientRect();
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.height = rect.height + 'px';
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      panel.style.userSelect = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(e.clientX - ox, window.innerWidth - panel.offsetWidth));
      const y = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - 40));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
    });
    document.addEventListener('mouseup', () => { if (dragging) { dragging = false; panel.style.userSelect = ''; } });
  })();

  // ===== Panel-level version state =====
  let _nvVersions = [];
  let _nvTranslations = [];
  let _nvCurrentVerIdx = 0;
  let _nvIsTranslated = false;
  let _nvCurrentDisplayLang = '';
  let _nvOrigLang = null;
  let _nvGuardConditions = [];
  let _nvDetectedInfoKeys = [];

  // ===== Init =====
  async function initPanelNV() {
    updateBadgeNV();
    const ud = await getUserDataNV();
    if (ud.userEmail) syncUsageNV(ud.userEmail).then(() => updateBadgeNV());

    // 이메일 열려있는지 체크 후 감정 분석
    setTimeout(() => {
      const emailText = getNaverEmailThread();
      if (emailText) {
        // 상태 메시지 숨기기
        const statusEl = panel.querySelector('#mm-nv-email-status');
        if (statusEl) statusEl.style.display = 'none';

        const { emotion, urgency } = detectEmotionNV(emailText);
        nvCachedEmotion = emotion;
        nvCachedUrgency = urgency;
        const ui2 = getUILangNV(nvSelectedMyLang);
        const emotionBar = panel.querySelector('#mm-nv-emotion-bar');
        const emotionBadge = panel.querySelector('#mm-nv-emotion-badge');
        const urgencyBadge = panel.querySelector('#mm-nv-urgency-badge');
        if (emotionBar && (emotion !== 'neutral' || urgency !== 'low')) {
          emotionBar.style.display = 'flex';
          if (emotionBadge && emotion !== 'neutral') emotionBadge.textContent = ui2.emotion[emotion] || '';
          if (urgencyBadge && urgency !== 'low') urgencyBadge.textContent = ui2.urgency[urgency] || '';
        }
      } else {
        // 이메일이 아직 선택 안된 상태 — 안내 메시지 표시
        const statusEl = panel.querySelector('#mm-nv-email-status');
        if (statusEl) statusEl.style.display = 'block';
      }
    }, 800);

    // Plan-based pro buttons
    const container = panel.querySelector('#mm-nv-pro-btns');
    if (ud.plan === 'pro') {
      container.innerHTML = `
        <button id="mm-nv-triple" style="flex:1;padding:8px;background:#e8f5e9;color:#2e7d32;border:1px solid #4caf50;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"> </button>
        <button id="mm-nv-smart" style="flex:1;padding:8px;background:#fff8e1;color:#b8860b;border:1px solid #f9a825;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer"> </button>
      `;
      panel.querySelector('#mm-nv-triple').addEventListener('click', () => generateTripleNV());
      panel.querySelector('#mm-nv-smart').addEventListener('click', () => generateSmartNV());
    } else if (ud.plan === 'basic') {
      container.innerHTML = `
        <button id="mm-nv-triple" style="flex:1;padding:8px;background:#e8f5e9;color:#2e7d32;border:1px solid #4caf50;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"> </button>
        <a href="https://mailmind.yongcha.app#pricing" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px;background:linear-gradient(135deg,#fff8e1,#fff3e0);color:#e65100;border:1px solid #ffb74d;border-radius:8px;font-size:11px;text-decoration:none;font-weight:600">👑 Smart Reply · Unlock Pro</a>
      `;
      panel.querySelector('#mm-nv-triple').addEventListener('click', () => generateTripleNV());
    } else {
      container.innerHTML = `<a href="https://mailmind.yongcha.app#pricing" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px;background:linear-gradient(135deg,#fff8e1,#fff3e0);color:#e65100;border:1px solid #ffb74d;border-radius:8px;font-size:11px;text-decoration:none;box-sizing:border-box;font-weight:600">👑 Compare & Smart Reply · Unlock Basic/Pro</a>`;
    }

    applyUILangNV(nvSelectedMyLang);

    // Detect & extract tasks
    setTimeout(() => {
      const emailContent = getNaverEmailThread();
      if (emailContent) detectAndShowInfoNV(emailContent, nvSelectedMyLang);
    }, 1200);

    // Load signature
    chrome.storage.sync.get(['signature'], async d => {
      if (!d.signature) return;
      const sigEl = panel.querySelector('#mm-nv-signature-input');
      if (!sigEl) return;
      sigEl.dataset.rawSig = d.signature;
      const _sigLangNV = nvSelectedMyLang || 'Korean';
      if (_sigLangNV !== 'Korean') {
        try {
          const r = await fetch(`${WORKER_URL_NV}/translate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: d.signature, targetLanguage: _sigLangNV })
          }).then(r => r.json());
          sigEl.value = (r.success && r.translated) ? r.translated : d.signature;
        } catch(e) { sigEl.value = d.signature; }
      } else { sigEl.value = d.signature; }
      sigEl.addEventListener('input', () => { delete sigEl.dataset.rawSig; }, { once: true });
    });
    renderTemplatesNV();
    // 스타일 학습 현황 표시
    chrome.storage.local.get(['learnedStyle_nv'], data => {
      if (data['learnedStyle_nv'] && data['learnedStyle_nv'].count >= 3) {
        const ls = data['learnedStyle_nv'];
        const sigInput = panel.querySelector('#mm-nv-signature-input');
        if (sigInput) {
          const learnDiv = document.createElement('div');
          learnDiv.style.cssText = 'font-size:10px;color:#137333;margin-top:6px;padding:4px 8px;background:#e6f4ea;border-radius:6px;';
          const uiLS = getUILangNV(nvSelectedMyLang);
          learnDiv.textContent = `✨ ${uiLS.learnedLabel||'학습됨'}: ${ls.favTone} ${uiLS.tonePref||'톤 선호'} · ${ls.style} (${ls.count}${uiLS.learnedUnit||'회'})`;
          sigInput.parentNode.appendChild(learnDiv);
        }
        if (ls.favTone) { nvSelectedTone = ls.favTone; const ts = panel.querySelector('#mm-nv-tone'); if (ts) ts.value = ls.favTone; }
      }
    });

  }

  // ===== Apply UI Language =====
  function applyUILangNV(lang) {
    const ui = getUILangNV(lang);
    const set = (id, val) => { const el = panel.querySelector(id); if (el) el.textContent = val; };
    set('#mm-nv-label-tone', ui.tone);
    set('#mm-nv-label-country', ui.country);
    set('#mm-nv-label-mylang', ui.myLang);
    set('#mm-nv-gen', ui.generate);
    set('#mm-nv-summarize', ui.summary);
    set('#mm-nv-settings-toggle', ui.settings);
    set('#mm-nv-settings-title', ui.settings);
    set('#mm-nv-promises-title', ui.promises);
    set('#mm-nv-switch-label', ui.switchLang);
    set('#mm-nv-insert', ui.insert);
    set('#mm-nv-copy', ui.copy);
    const translateBtn = panel.querySelector('#mm-nv-email-translate');
    if (translateBtn && !translateBtn.disabled) set('#mm-nv-email-translate', ui.emailTranslate);
    set('#mm-nv-label-sig', ui.signature);
    set('#mm-nv-label-template', ui.template);
    set('#mm-nv-save-signature', ui.sigSave);
    set('#mm-nv-shortcut-hint', ui.shortcut);
    set('#mm-nv-tasks-title', ui.tasks);
    const tripleBtn = panel.querySelector('#mm-nv-triple');
    const smartBtn = panel.querySelector('#mm-nv-smart');
    if (tripleBtn) tripleBtn.textContent = ui.compare;
    if (smartBtn) smartBtn.textContent = ui.smartReply;
    const toneSelect = panel.querySelector('#mm-nv-tone');
    if (toneSelect) { const cur = toneSelect.value; toneSelect.innerHTML = getToneOptionsNV(lang); toneSelect.value = cur; }
    panel.style.direction = lang === 'Arabic' ? 'rtl' : 'ltr';
    const _nvGuardTitleLabels = {Korean:'🛡️ 스마트 가드',Japanese:'🛡️ スマートガード',Chinese:'🛡️ 智能防护',Spanish:'🛡️ Guardia de respuesta',French:'🛡️ Garde de réponse',German:'🛡️ Antwort-Schutz',Portuguese:'🛡️ Guarda de resposta',Arabic:'🛡️ حارس الرد',Italian:'🛡️ Guardia risposta',Turkish:'🛡️ Yanıt Koruyucu',Vietnamese:'🛡️ Bộ bảo vệ',Thai:'🛡️ ตัวป้องกัน',Indonesian:'🛡️ Penjaga balasan'};
    const _nvGuardTitleEl = panel.querySelector('#mm-nv-guard-title');
    if (_nvGuardTitleEl) _nvGuardTitleEl.textContent = _nvGuardTitleLabels[lang] || '🛡️ Smart Reply Guard';
    const _nvSendOrigLabels = {Korean:'🌐 원문으로 전송',Japanese:'🌐 原文で送信',Chinese:'🌐 以原文发送',Spanish:'🌐 Enviar en original',French:'🌐 Envoyer en original',German:'🌐 Original senden',Portuguese:'🌐 Enviar original',Arabic:'🌐 إرسال النص الأصلي',Italian:'🌐 Invia in originale',Turkish:'🌐 Orijinal gönder',Vietnamese:'🌐 Gửi bản gốc',Thai:'🌐 ส่งต้นฉบับ',Indonesian:'🌐 Kirim asli'};
    const _nvSwitchBtn = panel.querySelector('#mm-nv-switch-lang');
    if (_nvSwitchBtn) _nvSwitchBtn.textContent = _nvSendOrigLabels[lang] || '🌐 Send in original language';
    const _nvGuardEl2=panel.querySelector('#mm-nv-guard'); const _nvGuardTxtEl=panel.querySelector('#mm-nv-guard-text');
    if (_nvGuardEl2&&_nvGuardEl2.style.display!=='none'&&_nvGuardTxtEl&&_nvGuardConditions.length>0) {
      const _nvAW2={Korean:'⚠️ 첨부 파일 언급 — 전송 전 확인',Japanese:'⚠️ 添付ファイルの言及 — 送信前に確認',Chinese:'⚠️ 提及附件 — 发送前确认',Spanish:'⚠️ Se menciona adjunto — verifica antes de enviar',French:"⚠️ Pièce jointe mentionnée — vérifiez avant d'envoyer",German:'⚠️ Anhang erwähnt — vor dem Senden prüfen',Portuguese:'⚠️ Anexo mencionado — verifique antes de enviar',Arabic:'⚠️ تم ذكر مرفق — تحقق قبل الإرسال',Italian:'⚠️ Allegato menzionato — controlla prima di inviare',Turkish:'⚠️ Ek belirtildi — göndermeden önce kontrol et',Vietnamese:'⚠️ Đề cập tệp đính kèm — kiểm tra trước khi gửi',Thai:'⚠️ กล่าวถึงไฟล์แนบ — ตรวจสอบก่อนส่ง',Indonesian:'⚠️ Lampiran disebutkan — periksa sebelum mengirim'};
      const _nvKN2={Korean:'💡 일본어 경어(敬語)가 적용되었습니다.',Chinese:'💡 已应用日语敬语（敬語）。',Spanish:'💡 Se aplicó el keigo japonés (敬語).',French:'💡 Le keigo japonais (敬語) a été appliqué.',German:'💡 Japanisches Keigo (敬語) wurde angewendet.'};
      _nvGuardTxtEl.innerHTML=_nvGuardConditions.map(c=>c==='attach'?(_nvAW2[lang]||'⚠️ Attachment mentioned — check before sending.'):(_nvKN2[lang]||'💡 Japanese Keigo (敬語) applied.')).join('<br>');
    }
    const _nvDetectEl=panel.querySelector('#mm-nv-detect-info');
    if (_nvDetectEl&&_nvDetectEl.style.display!=='none'&&_nvDetectedInfoKeys.length>0) {
      const _nvDI=DETECT_I18N_NV[lang]||DETECT_I18N_NV['English'];
      _nvDetectEl.innerHTML=_nvDetectedInfoKeys.map(k=>_nvDI[k]||k).join('<br>');
    }
    const sigInput = panel.querySelector('#mm-nv-signature-input');
    if (sigInput) sigInput.placeholder = ui.sigPlaceholder || 'Enter your signature';
    const countryEl = panel.querySelector('#mm-nv-country');
    if (countryEl) {
      const autoOpt = countryEl.querySelector('option[value="auto"]');
      if (autoOpt) autoOpt.textContent = ui.autoDetect || '🌐 Auto-detect';
    }
  }

  // ===== Event Listeners =====
  panel.querySelector('#mm-nv-close').addEventListener('click', () => {
    removeNVPanel();
    showFabNV();
  });
  panel.querySelector('#mm-nv-tone').addEventListener('change', function() { nvSelectedTone = this.value; });

  const nvCountrySelect = panel.querySelector('#mm-nv-country');
  if (nvCountrySelect) {
    const emailForCountry = getNaverEmailThread();
    const detectedNV = autoDetectCountryNV(emailForCountry);
    nvSelectedCountry = detectedNV || 'auto';
    nvCountrySelect.value = nvSelectedCountry;
    nvCountrySelect.addEventListener('change', function() { nvSelectedCountry = this.value; });
  }

  panel.querySelector('#mm-nv-lang').addEventListener('change', function() {
    nvSelectedMyLang = this.value;
    safeStorageSetNV({ myLanguage: this.value });
    applyUILangNV(this.value);
    const emailContent = getNaverEmailThread();
    if (emailContent) detectAndShowInfoNV(emailContent, this.value);
    const ui2 = getUILangNV(this.value);
    const emotionBadge = nvCurrentPanel.querySelector('#mm-nv-emotion-badge');
    const urgencyBadge = nvCurrentPanel.querySelector('#mm-nv-urgency-badge');
    if (emotionBadge && nvCachedEmotion && nvCachedEmotion !== 'neutral') emotionBadge.textContent = ui2.emotion[nvCachedEmotion] || '';
    if (urgencyBadge && nvCachedUrgency && nvCachedUrgency !== 'low') urgencyBadge.textContent = ui2.urgency[nvCachedUrgency] || '';
    const _sigElNV = panel.querySelector('#mm-nv-signature-input');
    if (_sigElNV) {
      const _rawSigNV = _sigElNV.dataset.rawSig || _sigElNV.value;
      if (_rawSigNV && this.value !== 'Korean') {
        fetch(`${WORKER_URL_NV}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: _rawSigNV, targetLanguage: this.value }) }).then(r => r.json()).then(r => { if (r.success && r.translated) { _sigElNV.dataset.rawSig = _rawSigNV; _sigElNV.value = r.translated; } }).catch(() => {});
      } else if (this.value === 'Korean') { _sigElNV.value = _rawSigNV; _sigElNV.dataset.rawSig = _rawSigNV; }
    }
  });

  panel.querySelector('#mm-nv-gen').addEventListener('click', generateReplyNV);
  panel.querySelector('#mm-nv-regen').addEventListener('click', generateReplyNV);
  panel.querySelector('#mm-nv-insert').addEventListener('click', () => { const t = panel.querySelector('#mm-nv-output').value; if (t) insertReplyNaver(t); });

  // ===== Edit / Refine button =====
  panel.querySelector('#mm-nv-edit-btn').addEventListener('click', () => {
    const ta = panel.querySelector('#mm-nv-output');
    ta.readOnly = false;
    ta.style.background = '#fff';
    ta.style.borderColor = '#673ab7';
    panel.querySelector('#mm-nv-edit-btn').style.display = 'none';
    panel.querySelector('#mm-nv-edit-bar').style.display = 'flex';
    ta.focus();
  });
  panel.querySelector('#mm-nv-edit-done').addEventListener('click', () => {
    const ta = panel.querySelector('#mm-nv-output');
    ta.readOnly = true;
    ta.style.background = '#f8f9fa';
    ta.style.borderColor = '#dadce0';
    panel.querySelector('#mm-nv-edit-btn').style.display = '';
    panel.querySelector('#mm-nv-edit-bar').style.display = 'none';
    _nvVersions = [ta.value]; _nvTranslations = []; _nvCurrentVerIdx = 0; _nvIsTranslated = false; _nvCurrentDisplayLang = nvSelectedMyLang; _nvOrigLang = nvSelectedMyLang;
  });
  panel.querySelector('#mm-nv-refine-btn').addEventListener('click', refineReplyNV);
  panel.querySelector('#mm-nv-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(panel.querySelector('#mm-nv-output').value)
      .then(() => showToastNV('Copied!', 'success'))
      .catch(() => showToastNV('Copy failed', 'error'));
  });

  // 📎 파일 첨부
  panel.querySelector('#mm-nv-attach').addEventListener('click', () => {
    const attachBtn =
      document.querySelector('[aria-label="Attach"]') ||
      document.querySelector('[title="Attach"]') ||
      document.querySelector('button.button-paperclip') ||
      document.querySelector('[data-action="attachment"]') ||
      document.querySelector('input[type="file"]');
    if (attachBtn) {
      attachBtn.click();
      showToastNV('📎 파일 첨부창이 열립니다', 'info');
    } else {
      showToastNV('📎 먼저 답장 버튼을 눌러 답장창을 열어주세요', 'info');
    }
  });

  // Language switch buttons
  panel.querySelectorAll('.mm-nv-lang-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const targetLang = this.dataset.lang;
      const currentText = panel.querySelector('#mm-nv-output').value;
      if (!currentText) { showToastNV('Please generate a reply first.', 'info'); return; }
      if (targetLang === _nvCurrentDisplayLang) return;
      if (targetLang === _nvOrigLang) {
        if (!_nvIsTranslated) return;
        panel.querySelector('#mm-nv-output').value = await appendSignatureNV(_nvVersions[_nvCurrentVerIdx]);
        _nvIsTranslated = false; _nvCurrentDisplayLang = null;
        panel.querySelectorAll('.mm-nv-lang-btn').forEach(b => { b.style.background='#fff'; b.style.borderColor='#dadce0'; b.style.color='#202124'; });
        return;
      }
      panel.querySelectorAll('.mm-nv-lang-btn').forEach(b => { b.style.background='#fff'; b.style.borderColor='#dadce0'; b.style.color='#202124'; });
      this.style.background='#fce4ec'; this.style.borderColor='#e91e8c'; this.style.color='#e91e8c';
      const origText = this.textContent;
      this.textContent = '⏳'; this.disabled = true;
      if (!_nvIsTranslated) {
        if (_nvVersions.length > 0) { _nvVersions[_nvCurrentVerIdx] = currentText; }
        else { _nvVersions = [currentText]; _nvCurrentVerIdx = 0; }
      }
      try {
        const res = await fetch(`${WORKER_URL_NV}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: currentText, targetLanguage: targetLang }) });
        const data = await res.json();
        if (data.success && data.translated) {
          panel.querySelector('#mm-nv-output').value = data.translated;
          _nvTranslations[_nvCurrentVerIdx] = data.translated;
          _nvIsTranslated = true;
          _nvCurrentDisplayLang = targetLang;
          showToastNV(`Translated to ${targetLang}!`, 'success');
        }
      } catch(e) { showToastNV('Translation failed.', 'error'); }
      this.textContent = origText; this.disabled = false;
    });
  });

  // Email translate
  panel.querySelector('#mm-nv-email-translate').addEventListener('click', async function() {
    const btn = this;
    const resultEl = panel.querySelector('#mm-nv-email-translated');
    // 이미 번역 완료 상태면 토글만 (API 재호출 없음)
    if (resultEl._translated) {
      const ui4 = getUILangNV(nvSelectedMyLang);
      if (resultEl.style.display === 'none') { resultEl.style.display = 'block'; btn.textContent = '🌐 ✕'; }
      else { resultEl.style.display = 'none'; btn.textContent = ui4.emailTranslate; }
      return;
    }
    const emailContent = getNaverEmailThread();
    const ui3 = getUILangNV(nvSelectedMyLang);
    if (!emailContent) { showToastNV(ui3.emailTranslate, 'error'); return; }
    btn.disabled = true; btn.textContent = ui3.translating; resultEl.style.display = 'none';
    try {
      const ud = await getUserDataNV();
      const res = await fetch(`${WORKER_URL_NV}/translate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: emailContent, targetLanguage: nvSelectedMyLang, email: ud.userEmail }) });
      const data = await res.json();
      if (data.success && data.translated) {
        resultEl.textContent = data.translated;
        resultEl.style.display = 'block';
        resultEl._translated = true; // 번역 완료 플래그
        btn.textContent = '🌐 ✕';
      } else { showToastNV('Translation failed: '+(data.error||''), 'error'); btn.textContent = ui3.emailTranslate; }
    } catch(e) { showToastNV('Translation error: '+e.message, 'error'); btn.textContent = getUILangNV(nvSelectedMyLang).emailTranslate; }
    btn.disabled = false;
  });

  // Thread summarize
  panel.querySelector('#mm-nv-summarize').addEventListener('click', async function() {
    const summaryElCheck = panel.querySelector('#mm-nv-thread-summary');
    // 이미 요약 완료 상태면 토글만 (API 재호출 없음)
    if (summaryElCheck._summarized) {
      summaryElCheck.style.display = summaryElCheck.style.display === 'none' ? 'block' : 'none';
      return;
    }
    const emailContent = getNaverEmailThread();
    if (!emailContent) { showToastNV('이메일을 먼저 선택해주세요.', 'error'); return; }
    const btn = this;
    btn.disabled = true; btn.textContent = getUILangNV(nvSelectedMyLang).summarizing;
    try {
      const ud = await getUserDataNV();
      const res = await fetch(`${WORKER_URL_NV}/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ emailContent: `Summarize this email thread in 3-5 bullet points in ${nvSelectedMyLang}. Be concise.\n\n${emailContent}`, tone:'concise', language:nvSelectedMyLang, email:ud.userEmail, isSummary:true }) });
      const data = await res.json();
      if (data.success) {
        const summaryEl = panel.querySelector('#mm-nv-thread-summary');
        summaryEl.style.display = 'block';
        summaryEl.innerHTML = `<strong style="color:#202124">📝 ${getUILangNV(nvSelectedMyLang).summary.replace(/📝\s?/,'')}:</strong><br><br>` + sanitizeNV(data.reply).replace(/\n/g,'<br>');
        summaryEl._summarized = true; // 요약 완료 플래그
      }
    } catch(e) { showToastNV('Failed.', 'error'); }
    btn.disabled = false; btn.textContent = getUILangNV(nvSelectedMyLang).summary;
  });

  // Settings toggle
  panel.querySelector('#mm-nv-settings-toggle').addEventListener('click', function() {
    const s = panel.querySelector('#mm-nv-settings');
    const isOpen = s.style.display !== 'none';
    s.style.display = isOpen ? 'none' : 'block';
    const ui = getUILangNV(nvSelectedMyLang);
    this.textContent = isOpen ? ui.settings : (ui.settingsClose || ui.settings);
  });

  // Save signature
  panel.querySelector('#mm-nv-save-signature').addEventListener('click', function() {
    const sigEl = panel.querySelector('#mm-nv-signature-input');
    chrome.storage.sync.set({ signature: sigEl.dataset.rawSig || sigEl.value });
    const ui2 = getUILangNV(nvSelectedMyLang);
    showToastNV(ui2.sigSaved || '✓ Saved', 'success');
  });

  // Templates
  function renderTemplatesNV() {
    chrome.storage.sync.get(['templates'], data => {
      const tpls = data.templates || [];
      const list = panel.querySelector('#mm-nv-templates-list');
      list.innerHTML = tpls.map((t,i) => `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#e8f0fe;border-radius:12px;font-size:11px;cursor:pointer" data-idx="${i}"><span class="mm-nv-tpl-use">${sanitizeNV(t)}</span><span class="mm-nv-tpl-del" data-idx="${i}" style="color:#e91e8c;font-weight:bold">×</span></span>`).join('');
      list.querySelectorAll('.mm-nv-tpl-use').forEach(el => { el.addEventListener('click', function() { panel.querySelector('#mm-nv-output').value += '\n'+this.textContent; showToastNV('템플릿 추가됐어요!', 'success'); }); });
      list.querySelectorAll('.mm-nv-tpl-del').forEach(el => { el.addEventListener('click', function(e) { e.stopPropagation(); chrome.storage.sync.get(['templates'], d => { const t2=d.templates||[]; t2.splice(parseInt(this.dataset.idx),1); chrome.storage.sync.set({templates:t2}); renderTemplatesNV(); }); }); });
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', function nvKeydown(e) {
    if (!nvCurrentPanel) { document.removeEventListener('keydown', nvKeydown); return; }
    if (e.altKey) {
      if (e.key==='g'||e.key==='G') { e.preventDefault(); generateReplyNV(); }
      if (e.key==='c'||e.key==='C') { e.preventDefault(); const t=panel.querySelector('#mm-nv-output')?.value; if(t) navigator.clipboard.writeText(t).then(()=>showToastNV('Copied!','success')); }
      if (e.key==='i'||e.key==='I') { e.preventDefault(); const t=panel.querySelector('#mm-nv-output')?.value; if(t) insertReplyNaver(t); }
    }
  });

  initPanelNV();

  // ===== Generate Reply =====
  async function generateReplyNV() {
    const emailContent = getNaverEmailThread();
    if (!emailContent) { showToastNV('이메일을 먼저 선택해주세요.', 'error'); return; }
    const ud = await getUserDataNV();
    if (ud.monthlyCount >= ud.monthlyLimit) { panel.querySelector('#mm-nv-upgrade').style.display='block'; return; }
    const genBtn = panel.querySelector('#mm-nv-gen');
    genBtn.disabled=true; genBtn.textContent=getUILangNV(nvSelectedMyLang).generating;
    panel.querySelector('#mm-nv-summary').style.display='none';
    panel.querySelector('#mm-nv-lang-btn').style.display='none';
    panel.querySelector('#mm-nv-versions').style.display='none';
    try {
      const storedNV = await new Promise(r => chrome.storage.sync.get(['signature', 'userInfo'], r));
      const signatureNV = storedNV.signature || '';
      const userInfoNV = storedNV.userInfo || '';
      const res = await fetch(`${WORKER_URL_NV}/generate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ emailContent, tone:nvSelectedTone, language:nvSelectedMyLang, myLanguage:nvSelectedMyLang, country:nvSelectedCountry, email:ud.userEmail, userId:ud.userId, ...(signatureNV && { signature: signatureNV }), ...(userInfoNV && { userInfo: userInfoNV }), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) }) });
      const data = await res.json();
      if (data.success) {
        const spamEl = panel.querySelector('#mm-nv-spam');
        if (data.isSpam && data.spamWarning) { spamEl.textContent=data.spamWarning; spamEl.style.display='block'; } else spamEl.style.display='none';
        let _rawNV = (data.reply||'').trim();
        // 수신자 인사말 제거 (예: "홍길동님,")
        _rawNV = _rawNV.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]?\s*[\r\n]+/, '').trim();
        _rawNV = _rawNV.replace(/^[^\n\r,，]{1,20}(?:님|씨)\s*[,，]\s*/, '').trim();
        // 발신자 자기소개 반복 방지: "안녕하세요, ○○입니다." 형태로 시작하는 첫 줄 제거
        _rawNV = _rawNV.replace(/^안녕하세요[,，]?\s*.{1,40}입니다[\.\!]*\s*[\r\n]*/i, '').trim();
        const replyWithSig = await appendSignatureNV(_rawNV);
        learnStyleNV(nvSelectedTone, emailContent, replyWithSig);
        panel.querySelector('#mm-nv-output').value = replyWithSig;
        panel.querySelector('#mm-nv-result').style.display='block';
        _nvVersions=[replyWithSig]; _nvTranslations=[]; _nvCurrentVerIdx=0; _nvIsTranslated=false; _nvCurrentDisplayLang=nvSelectedMyLang; _nvOrigLang=nvSelectedMyLang;
        panel.querySelector('#mm-nv-lang-btn').style.display='block';
        // Worker 감지 국가 드롭다운 반영
        if (data.detectedCountry && nvSelectedCountry === 'auto') {
          const matched = ['Japan','Korea','USA','Germany','Brazil','Arabia','China','France'].find(k => data.detectedCountry.includes(k));
          if (matched) { nvSelectedCountry = matched; const cs = panel.querySelector('#mm-nv-country'); if (cs) cs.value = matched; }
        }
        // Guard
        _nvGuardConditions=[];
        if (replyWithSig.includes('첨부')||replyWithSig.includes('attach')) _nvGuardConditions.push('attach');
        if (nvSelectedCountry==='Japan') _nvGuardConditions.push('keigo');
        const _nvAW={Korean:'⚠️ 첨부 파일 언급 — 전송 전 확인',Japanese:'⚠️ 添付ファイルの言及 — 送信前に確認',Chinese:'⚠️ 提及附件 — 发送前确认',Spanish:'⚠️ Se menciona adjunto — verifica antes de enviar',French:"⚠️ Pièce jointe mentionnée — vérifiez avant d'envoyer",German:'⚠️ Anhang erwähnt — vor dem Senden prüfen',Portuguese:'⚠️ Anexo mencionado — verifique antes de enviar',Arabic:'⚠️ تم ذكر مرفق — تحقق قبل الإرسال',Italian:'⚠️ Allegato menzionato — controlla prima di inviare',Turkish:'⚠️ Ek belirtildi — göndermeden önce kontrol et',Vietnamese:'⚠️ Đề cập tệp đính kèm — kiểm tra trước khi gửi',Thai:'⚠️ กล่าวถึงไฟล์แนบ — ตรวจสอบก่อนส่ง',Indonesian:'⚠️ Lampiran disebutkan — periksa sebelum mengirim'};
        const _nvKN={Korean:'💡 일본어 경어(敬語)가 적용되었습니다.',Chinese:'💡 已应用日语敬语（敬語）。',Spanish:'💡 Se aplicó el keigo japonés (敬語).',French:'💡 Le keigo japonais (敬語) a été appliqué.',German:'💡 Japanisches Keigo (敬語) wurde angewendet.'};
        const guards=_nvGuardConditions.map(c=>c==='attach'?(_nvAW[nvSelectedMyLang]||'⚠️ Attachment mentioned — check before sending.'):(_nvKN[nvSelectedMyLang]||'💡 Japanese Keigo (敬語) applied.'));
        const guardEl=panel.querySelector('#mm-nv-guard'); const guardText=panel.querySelector('#mm-nv-guard-text');
        if (guards.length>0) { guardText.innerHTML=guards.map(g=>sanitizeNV(g)).join('<br>'); guardEl.style.display='block'; } else guardEl.style.display='none';
        // Promises
        const promises=extractPromisesNV(replyWithSig, nvSelectedMyLang);
        if (promises.length>0) { panel.querySelector('#mm-nv-promises').style.display='block'; panel.querySelector('#mm-nv-promises-list').innerHTML=promises.map(p=>`• ${sanitizeNV(p)}`).join('<br>'); }
        panel.querySelector('#mm-nv-upgrade').style.display='none';
        await incrementUsageNV(data.monthlyUsage);
        updateBadgeNV();
      } else if (data.error==='MONTHLY_LIMIT') {
        panel.querySelector('#mm-nv-upgrade').style.display='block';
      } else { showToastNV('Failed: '+(data.error||'Try again.'), 'error'); }
    } catch(e) { showToastNV('Error: '+e.message, 'error'); }
    genBtn.disabled=false; genBtn.textContent=getUILangNV(nvSelectedMyLang).generate;
  }

  // ===== Refine Reply =====
  async function refineReplyNV() {
    const ta = panel.querySelector('#mm-nv-output');
    const draft = ta.value.trim();
    if (!draft) { showToastNV(getUILangNV(nvSelectedMyLang).refineInput||'다듬을 내용을 입력해주세요.', 'error'); return; }
    const ud = await getUserDataNV();
    if (!ud.userEmail) { showToastNV(getUILangNV(nvSelectedMyLang).errLogin || '로그인이 필요합니다.', 'error'); return; }
    if (ud.plan === 'free') { showToastNV(getUILangNV(nvSelectedMyLang).refinePlanMsg||'초안 다듬기는 Basic 이상 플랜에서 사용 가능합니다', 'error'); return; }
    const left = Math.max(0, ud.monthlyLimit - ud.monthlyCount);
    if (left <= 0) { showToastNV(getUILangNV(nvSelectedMyLang).limitMsg, 'error'); return; }
    const btn = panel.querySelector('#mm-nv-refine-btn');
    btn.disabled = true; btn.textContent = getUILangNV(nvSelectedMyLang).refining||'✨ Refining...';
    try {
      const storedNV = await new Promise(r => chrome.storage.sync.get(['userInfo'], r));
      const res = await fetch(`${WORKER_URL_NV}/refine-compose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, refineGoal: 'enhance', tone: nvSelectedTone, myLanguage: _nvCurrentDisplayLang || nvSelectedMyLang, email: ud.userEmail, country: nvSelectedCountry, clientDate: new Date().toISOString(), ...(storedNV.userInfo ? { userInfo: storedNV.userInfo } : {}), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) })
      });
      const data = await res.json();
      if (data.success) {
        const refined = (data.body || data.reply || '').trim();
        const _refineLangNV = _nvCurrentDisplayLang || nvSelectedMyLang;
        ta.value = refined;
        _nvVersions = [refined]; _nvTranslations = []; _nvCurrentVerIdx = 0; _nvIsTranslated = false; _nvCurrentDisplayLang = _refineLangNV; _nvOrigLang = _refineLangNV;
        ta.readOnly = true; ta.style.background = '#f8f9fa'; ta.style.borderColor = '#dadce0';
        panel.querySelector('#mm-nv-edit-btn').style.display = '';
        panel.querySelector('#mm-nv-edit-bar').style.display = 'none';
        showToastNV(getUILangNV(nvSelectedMyLang).refineDone||'✨ 다듬기 완료!', 'success');
        await incrementUsageNV(data.monthlyUsage ?? (ud.monthlyCount + 1));
        updateBadgeNV();
      } else if (data.error === 'MONTHLY_LIMIT') {
        panel.querySelector('#mm-nv-upgrade').style.display = 'block';
      } else {
        showToastNV(getUILangNV(nvSelectedMyLang).refineFailed||'다듬기 실패. 다시 시도해주세요.', 'error');
      }
    } catch(e) { showToastNV('오류: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = getUILangNV(nvSelectedMyLang).refine||'✨ 다듬기';
  }

  // ===== Generate Triple (Compare) =====
  async function generateTripleNV() {
    const emailContent = getNaverEmailThread();
    if (!emailContent) { showToastNV('이메일을 먼저 선택해주세요.', 'error'); return; }
    const ud = await getUserDataNV();
    if (ud.monthlyCount >= ud.monthlyLimit) { panel.querySelector('#mm-nv-upgrade').style.display='block'; return; }
    const btn = panel.querySelector('#mm-nv-triple');
    if (!btn) return;
    const origText = btn.textContent;
    btn.disabled=true; btn.textContent=getUILangNV(nvSelectedMyLang).generating;
    panel.querySelector('#mm-nv-summary').style.display='none'; panel.querySelector('#mm-nv-lang-btn').style.display='none'; panel.querySelector('#mm-nv-versions').style.display='none';
    try {
      const storedTripleNV = await new Promise(r => chrome.storage.sync.get(['userInfo'], r));
      const userInfoTripleNV = storedTripleNV.userInfo || '';
      const res = await fetch(`${WORKER_URL_NV}/generate-triple`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ emailContent, tone:nvSelectedTone, myLanguage:nvSelectedMyLang, country:nvSelectedCountry, email:ud.userEmail, userId:ud.userId, ...(userInfoTripleNV && { userInfo: userInfoTripleNV }), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) }) });
      const data = await res.json();
      if (data.success && data.versions?.length>0) {
        const _maxVer = ud.plan === 'pro' ? 3 : 2;
        _nvVersions=data.versions.slice(0,_maxVer).map(_stripSalutationNV); _nvTranslations=await Promise.all((data.translations||[]).slice(0,_maxVer).map(t=>t?appendSignatureNV(t):t)); _nvCurrentVerIdx=0; _nvIsTranslated=false; _nvCurrentDisplayLang=nvSelectedMyLang; _nvOrigLang=nvSelectedMyLang;
        panel.querySelector('#mm-nv-output').value = await appendSignatureNV(_nvVersions[0]);
        panel.querySelector('#mm-nv-result').style.display='block'; panel.querySelector('#mm-nv-upgrade').style.display='none';
        // 탭 렌더링 (먼저 실행)
        const verTabs=panel.querySelector('#mm-nv-ver-tabs');
        const toneName=(TONES_I18N_NV[nvSelectedMyLang]||TONES_I18N_NV['English'])[TONE_KEYS_NV.indexOf(nvSelectedTone)]||nvSelectedTone;
        verTabs.innerHTML=_nvVersions.map((_,i)=>`<button class="mm-nv-ver-btn" data-ver="${i}" style="font-size:11px;padding:4px 12px;border:1px solid ${i===0?'#e91e8c':'#dadce0'};border-radius:20px;background:${i===0?'#fce4ec':'#fff'};color:${i===0?'#e91e8c':'#5f6368'};cursor:pointer">${toneName} ${i+1}</button>`).join('')+`<button id="mm-nv-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
        panel.querySelector('#mm-nv-versions').style.display='block';
        // edit-bar / edit-btn (null-safety)
        const _ebNV=panel.querySelector('#mm-nv-edit-bar');
        const _ebnNV=panel.querySelector('#mm-nv-edit-btn');
        if (_ebNV) _ebNV.style.display='flex';
        if (_ebnNV) _ebnNV.style.display='none';
        verTabs.querySelectorAll('.mm-nv-ver-btn').forEach(b=>{
          b.addEventListener('click',async function(){
            verTabs.querySelectorAll('.mm-nv-ver-btn').forEach(b2=>{b2.style.border='1px solid #dadce0';b2.style.background='#fff';b2.style.color='#5f6368';});
            this.style.border='1px solid #e91e8c';this.style.background='#fce4ec';this.style.color='#e91e8c';
            _nvCurrentVerIdx=parseInt(this.dataset.ver);
            panel.querySelector('#mm-nv-output').value=(_nvIsTranslated&&_nvTranslations[_nvCurrentVerIdx])?_nvTranslations[_nvCurrentVerIdx]:await appendSignatureNV(_nvVersions[_nvCurrentVerIdx]);
            const _ebNVv=panel.querySelector('#mm-nv-edit-bar');
            const _ebnNVv=panel.querySelector('#mm-nv-edit-btn');
            if (_ebNVv) _ebNVv.style.display='flex';
            if (_ebnNVv) _ebnNVv.style.display='none';
          });
        });
        verTabs.querySelector('#mm-nv-ver-confirm')?.addEventListener('click', ()=>{ panel.querySelector('#mm-nv-versions').style.display='none'; });
        await incrementUsageNV(data.monthlyUsage); updateBadgeNV();
      } else if (data.error==='MONTHLY_LIMIT') { panel.querySelector('#mm-nv-upgrade').style.display='block'; }
      else { showToastNV('Failed. Try again.', 'error'); }
    } catch(e) { showToastNV('Error: '+e.message, 'error'); }
    btn.disabled=false; btn.textContent=origText;
  }

  // ===== Smart Reply (Pro) =====
  async function generateSmartNV() {
    const emailContent = getNaverEmailThread();
    if (!emailContent) { showToastNV('이메일을 먼저 선택해주세요.', 'error'); return; }
    const ud = await getUserDataNV();
    if (ud.plan !== 'pro' && ud.plan !== 'team') { showToastNV(getUILangNV(nvSelectedMyLang).smartPlanMsg || 'Smart Reply is available on Pro plan or above.', 'error'); return; }
    if (ud.monthlyCount >= ud.monthlyLimit) { panel.querySelector('#mm-nv-upgrade').style.display='block'; return; }
    const btn = panel.querySelector('#mm-nv-smart');
    if (!btn) return;
    btn.disabled=true; btn.textContent=getUILangNV(nvSelectedMyLang).smartGenerating||'🌍 Analyzing...';
    panel.querySelector('#mm-nv-versions').style.display='none'; panel.querySelector('#mm-nv-lang-btn').style.display='none';
    try {
      const storedSmartNV = await new Promise(r => chrome.storage.sync.get(['userInfo'], r));
      const userInfoSmartNV = storedSmartNV.userInfo || '';
      const res = await fetch(`${WORKER_URL_NV}/generate-smart`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ emailContent, tone:nvSelectedTone, myLanguage:nvSelectedMyLang, country:nvSelectedCountry, email:ud.userEmail, userId:ud.userId, ...(userInfoSmartNV && { userInfo: userInfoSmartNV }), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) }) });
      const data = await res.json();
      if (data.success) {
        _nvVersions=(data.versions||[]).map(_stripSalutationNV); _nvTranslations=await Promise.all((data.translations||[]).map(t=>t?appendSignatureNV(t):t)); _nvCurrentVerIdx=0; _nvIsTranslated=false; _nvCurrentDisplayLang=nvSelectedMyLang; _nvOrigLang=nvSelectedMyLang;
        const summaryEl=panel.querySelector('#mm-nv-summary');
        summaryEl.style.display='block'; summaryEl.innerHTML=`📋 <strong>Summary (${sanitizeNV(data.detected_language||'English')}):</strong><br>${sanitizeNV(data.summary)}`;
        panel.querySelector('#mm-nv-output').value=await appendSignatureNV(_nvVersions[0]||'');
        panel.querySelector('#mm-nv-result').style.display='block'; panel.querySelector('#mm-nv-upgrade').style.display='none';
        if (_nvVersions.length>1) {
          const verTabs=panel.querySelector('#mm-nv-ver-tabs');
          verTabs.innerHTML=_nvVersions.map((_,i)=>`<button class="mm-nv-ver-tab${i===0?' active':''}" data-idx="${i}" style="font-size:11px;padding:4px 12px;border:1px solid ${i===0?'#e91e8c':'#dadce0'};border-radius:20px;background:${i===0?'#fce4ec':'#fff'};color:${i===0?'#e91e8c':'#5f6368'};cursor:pointer">v${i+1}</button>`).join('')+`<button id="mm-nv-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
          panel.querySelector('#mm-nv-versions').style.display='block';
          verTabs.querySelectorAll('.mm-nv-ver-tab').forEach(tab=>{
            tab.addEventListener('click',async function(){
              _nvCurrentVerIdx=parseInt(this.dataset.idx);
              verTabs.querySelectorAll('.mm-nv-ver-tab').forEach(t=>{t.style.border='1px solid #dadce0';t.style.background='#fff';t.style.color='#5f6368';});
              this.style.border='1px solid #e91e8c';this.style.background='#fce4ec';this.style.color='#e91e8c';
              panel.querySelector('#mm-nv-output').value=(_nvIsTranslated&&_nvTranslations[_nvCurrentVerIdx])?_nvTranslations[_nvCurrentVerIdx]:await appendSignatureNV(_nvVersions[_nvCurrentVerIdx]);
            });
          });
          verTabs.querySelector('#mm-nv-ver-confirm')?.addEventListener('click', ()=>{ panel.querySelector('#mm-nv-versions').style.display='none'; });
        }
        // edit-bar / edit-btn (null-safety)
        const _ebNVS=panel.querySelector('#mm-nv-edit-bar');
        const _ebnNVS=panel.querySelector('#mm-nv-edit-btn');
        if (_ebNVS) _ebNVS.style.display='flex';
        if (_ebnNVS) _ebnNVS.style.display='none';
        await incrementUsageNV(data.monthlyUsage); updateBadgeNV();
      } else if (data.error==='MONTHLY_LIMIT') { panel.querySelector('#mm-nv-upgrade').style.display='block'; }
      else { showToastNV('Failed. Try again.', 'error'); }
    } catch(e) { showToastNV('Error: '+e.message, 'error'); }
    btn.disabled=false; btn.textContent=getUILangNV(nvSelectedMyLang).smartReply;
  }
}

// ===== Detect & Show Info =====
const DETECT_I18N_NV = {
  Korean:     {japan:'🇯🇵 일본 비즈니스 문화 · 경어체 적용',china:'🇨🇳 중국 · 격식체 적용',korean:'🇰🇷 한국어 · 존댓말 적용',arabic:'🇸🇦 아랍 · 이슬람 비즈니스 문화 적용',thai:'🇹🇭 태국 · 공손한 표현 적용',trade:'🏭 무역/물류 업종 감지',legal:'⚖️ 법률 업종 감지',it:'💻 IT 업종 감지 · 기술 용어 적용',finance:'💰 금융/회계 업종 감지',medical:'🏥 의료 업종 감지',urgent:'⚡ 긴급 톤 감지 → 간결 답장 추천',positive:'😊 긍정 톤 감지 → 친근 답장 추천',complaint:'⚠️ 불만 감지 → 사과 답장 추천',negotiate:'🤝 협상 컨텍스트 감지'},
  Korean:     {japan:'🇯🇵 일본 비즈니스 문화 · 경어체 적용',china:'🇨🇳 중국 · 격식체 적용',korean:'🇰🇷 한국어 · 존댓말 적용',arabic:'🇸🇦 아랍 · 이슬람 비즈니스 문화 적용',thai:'🇹🇭 태국 · 공손한 표현 적용',trade:'🏭 무역/물류 업종 감지',legal:'⚖️ 법률 업종 감지',it:'💻 IT 업종 감지 · 기술 용어 적용',finance:'💰 금융/회계 업종 감지',medical:'🏥 의료 업종 감지',urgent:'⚡ 긴급 톤 감지 → 간결 답장 추천',positive:'😊 긍정 톤 감지 → 친근 답장 추천',complaint:'⚠️ 불만 감지 → 사과 답장 추천',negotiate:'🤝 협상 컨텍스트 감지'},
  English:    {japan:'🇯🇵 Japan business culture · Keigo applied',china:'🇨🇳 China · Formal style applied',korean:'🇰🇷 Korean · Formal speech applied',arabic:'🇸🇦 Arabic · Islamic business culture applied',thai:'🇹🇭 Thai · Respectful expressions applied',trade:'🏭 Trade/Logistics detected',legal:'⚖️ Legal industry detected',it:'💻 IT industry detected',finance:'💰 Finance/Accounting detected',medical:'🏥 Medical industry detected',urgent:'⚡ Urgent tone → Concise recommended',positive:'😊 Positive tone → Friendly recommended',complaint:'⚠️ Complaint → Apologetic recommended',negotiate:'🤝 Negotiation context detected'},
  English:    {japan:'🇯🇵 Japan business culture · Keigo applied',china:'🇨🇳 China · Formal style applied',korean:'🇰🇷 Korean · Formal speech applied',arabic:'🇸🇦 Arabic · Islamic business culture applied',thai:'🇹🇭 Thai · Respectful expressions applied',trade:'🏭 Trade/Logistics detected',legal:'⚖️ Legal industry detected',it:'💻 IT industry detected',finance:'💰 Finance/Accounting detected',medical:'🏥 Medical industry detected',urgent:'⚡ Urgent tone → Concise recommended',positive:'😊 Positive tone → Friendly recommended',complaint:'⚠️ Complaint → Apologetic recommended',negotiate:'🤝 Negotiation context detected'},
  Japanese:   {japan:'🇯🇵 日本ビジネス文化 · 敬語適用',china:'🇨🇳 中国 · フォーマルスタイル',korean:'🇰🇷 韓国語 · 敬語適用',arabic:'🇸🇦 アラビア語 · イスラム文化',thai:'🇹🇭 タイ · 丁寧な表現',trade:'🏭 貿易/物流業種を検出',legal:'⚖️ 法律業種を検出',it:'💻 IT業種を検出',finance:'💰 金融/会計業種を検出',medical:'🏥 医療業種を検出',urgent:'⚡ 緊急トーン検出',positive:'😊 ポジティブトーン検出',complaint:'⚠️ クレーム検出',negotiate:'🤝 交渉コンテキスト検出'},
  Japanese:   {japan:'🇯🇵 日本ビジネス文化 · 敬語適用',china:'🇨🇳 中国 · フォーマルスタイル',korean:'🇰🇷 韓国語 · 敬語適用',arabic:'🇸🇦 アラビア語 · イスラム文化',thai:'🇹🇭 タイ · 丁寧な表現',trade:'🏭 貿易/物流業種を検出',legal:'⚖️ 法律業種を検出',it:'💻 IT業種を検出',finance:'💰 金融/会計業種を検出',medical:'🏥 医療業種を検出',urgent:'⚡ 緊急トーン検出',positive:'😊 ポジティブトーン検出',complaint:'⚠️ クレーム検出',negotiate:'🤝 交渉コンテキスト検出'},
  Chinese:    {japan:'🇯🇵 日本商务文化 · 敬语适用',china:'🇨🇳 中文 · 正式风格',korean:'🇰🇷 韩语 · 敬语适用',arabic:'🇸🇦 阿拉伯语 · 伊斯兰文化',thai:'🇹🇭 泰语 · 礼貌表达',trade:'🏭 检测到贸易/物流行业',legal:'⚖️ 检测到法律行业',it:'💻 检测到IT行业',finance:'💰 检测到金融行业',medical:'🏥 检测到医疗行业',urgent:'⚡ 检测到紧急语气',positive:'😊 检测到积极语气',complaint:'⚠️ 检测到投诉',negotiate:'🤝 检测到谈判背景'},
  Chinese:    {japan:'🇯🇵 日本商务文化 · 敬语适用',china:'🇨🇳 中文 · 正式风格',korean:'🇰🇷 韩语 · 敬语适用',arabic:'🇸🇦 阿拉伯语 · 伊斯兰文化',thai:'🇹🇭 泰语 · 礼貌表达',trade:'🏭 检测到贸易/物流行业',legal:'⚖️ 检测到法律行业',it:'💻 检测到IT行业',finance:'💰 检测到金融行业',medical:'🏥 检测到医疗行业',urgent:'⚡ 检测到紧急语气',positive:'😊 检测到积极语气',complaint:'⚠️ 检测到投诉',negotiate:'🤝 检测到谈判背景'},
  German:     {japan:'🇯🇵 Japanische Geschäftskultur',china:'🇨🇳 China · Formell',korean:'🇰🇷 Koreanisch · Formell',arabic:'🇸🇦 Arabisch · Islam',thai:'🇹🇭 Thailändisch · Respektvoll',trade:'🏭 Handelsbranche erkannt',legal:'⚖️ Rechtsbranche erkannt',it:'💻 IT-Branche erkannt',finance:'💰 Finanzbranche erkannt',medical:'🏥 Medizinische Branche erkannt',urgent:'⚡ Dringender Ton erkannt',positive:'😊 Positiver Ton erkannt',complaint:'⚠️ Beschwerde erkannt',negotiate:'🤝 Verhandlungskontext erkannt'},
  German:     {japan:'🇯🇵 Japanische Geschäftskultur',china:'🇨🇳 China · Formell',korean:'🇰🇷 Koreanisch · Formell',arabic:'🇸🇦 Arabisch · Islam',thai:'🇹🇭 Thailändisch · Respektvoll',trade:'🏭 Handelsbranche erkannt',legal:'⚖️ Rechtsbranche erkannt',it:'💻 IT-Branche erkannt',finance:'💰 Finanzbranche erkannt',medical:'🏥 Medizinische Branche erkannt',urgent:'⚡ Dringender Ton erkannt',positive:'😊 Positiver Ton erkannt',complaint:'⚠️ Beschwerde erkannt',negotiate:'🤝 Verhandlungskontext erkannt'},
  French:     {japan:'🇯🇵 Culture japonaise · Keigo',china:'🇨🇳 Chine · Style formel',korean:'🇰🇷 Coréen · Formel',arabic:'🇸🇦 Arabe · Culture islamique',thai:'🇹🇭 Thaï · Respectueux',trade:'🏭 Commerce/logistique détecté',legal:'⚖️ Juridique détecté',it:'💻 IT détecté',finance:'💰 Finance détectée',medical:'🏥 Médical détecté',urgent:'⚡ Ton urgent détecté',positive:'😊 Ton positif détecté',complaint:'⚠️ Plainte détectée',negotiate:'🤝 Négociation détectée'},
  French:     {japan:'🇯🇵 Culture japonaise · Keigo',china:'🇨🇳 Chine · Style formel',korean:'🇰🇷 Coréen · Formel',arabic:'🇸🇦 Arabe · Culture islamique',thai:'🇹🇭 Thaï · Respectueux',trade:'🏭 Commerce/logistique détecté',legal:'⚖️ Juridique détecté',it:'💻 IT détecté',finance:'💰 Finance détectée',medical:'🏥 Médical détecté',urgent:'⚡ Ton urgent détecté',positive:'😊 Ton positif détecté',complaint:'⚠️ Plainte détectée',negotiate:'🤝 Négociation détectée'},
  Spanish:    {japan:'🇯🇵 Cultura japonesa · Keigo',china:'🇨🇳 China · Formal',korean:'🇰🇷 Coreano · Formal',arabic:'🇸🇦 Árabe · Cultura islámica',thai:'🇹🇭 Tailandés · Respetuoso',trade:'🏭 Comercio/logística detectado',legal:'⚖️ Legal detectado',it:'💻 IT detectado',finance:'💰 Finanzas detectadas',medical:'🏥 Médico detectado',urgent:'⚡ Tono urgente detectado',positive:'😊 Tono positivo detectado',complaint:'⚠️ Queja detectada',negotiate:'🤝 Negociación detectada'},
  Spanish:    {japan:'🇯🇵 Cultura japonesa · Keigo',china:'🇨🇳 China · Formal',korean:'🇰🇷 Coreano · Formal',arabic:'🇸🇦 Árabe · Cultura islámica',thai:'🇹🇭 Tailandés · Respetuoso',trade:'🏭 Comercio/logística detectado',legal:'⚖️ Legal detectado',it:'💻 IT detectado',finance:'💰 Finanzas detectadas',medical:'🏥 Médico detectado',urgent:'⚡ Tono urgente detectado',positive:'😊 Tono positivo detectado',complaint:'⚠️ Queja detectada',negotiate:'🤝 Negociación detectada'},
  Portuguese: {japan:'🇯🇵 Cultura japonesa · Keigo',china:'🇨🇳 China · Formal',korean:'🇰🇷 Coreano · Formal',arabic:'🇸🇦 Árabe · Cultura islâmica',thai:'🇹🇭 Tailandês · Respeitoso',trade:'🏭 Comércio/logística detectado',legal:'⚖️ Jurídico detectado',it:'💻 TI detectado',finance:'💰 Finanças detectadas',medical:'🏥 Médico detectado',urgent:'⚡ Tom urgente detectado',positive:'😊 Tom positivo detectado',complaint:'⚠️ Reclamação detectada',negotiate:'🤝 Negociação detectada'},
  Portuguese: {japan:'🇯🇵 Cultura japonesa · Keigo',china:'🇨🇳 China · Formal',korean:'🇰🇷 Coreano · Formal',arabic:'🇸🇦 Árabe · Cultura islâmica',thai:'🇹🇭 Tailandês · Respeitoso',trade:'🏭 Comércio/logística detectado',legal:'⚖️ Jurídico detectado',it:'💻 TI detectado',finance:'💰 Finanças detectadas',medical:'🏥 Médico detectado',urgent:'⚡ Tom urgente detectado',positive:'😊 Tom positivo detectado',complaint:'⚠️ Reclamação detectada',negotiate:'🤝 Negociação detectada'},
  Turkish:    {japan:'🇯🇵 Japon iş kültürü',china:'🇨🇳 Çin · Resmi',korean:'🇰🇷 Korece · Resmi',arabic:'🇸🇦 Arapça · İslam kültürü',thai:'🇹🇭 Tayca · Saygılı',trade:'🏭 Ticaret/lojistik tespit edildi',legal:'⚖️ Hukuk tespit edildi',it:'💻 IT tespit edildi',finance:'💰 Finans tespit edildi',medical:'🏥 Tıp tespit edildi',urgent:'⚡ Acil ton tespit edildi',positive:'😊 Olumlu ton tespit edildi',complaint:'⚠️ Şikayet tespit edildi',negotiate:'🤝 Müzakere bağlamı tespit edildi'},
  Turkish:    {japan:'🇯🇵 Japon iş kültürü',china:'🇨🇳 Çin · Resmi',korean:'🇰🇷 Korece · Resmi',arabic:'🇸🇦 Arapça · İslam kültürü',thai:'🇹🇭 Tayca · Saygılı',trade:'🏭 Ticaret/lojistik tespit edildi',legal:'⚖️ Hukuk tespit edildi',it:'💻 IT tespit edildi',finance:'💰 Finans tespit edildi',medical:'🏥 Tıp tespit edildi',urgent:'⚡ Acil ton tespit edildi',positive:'😊 Olumlu ton tespit edildi',complaint:'⚠️ Şikayet tespit edildi',negotiate:'🤝 Müzakere bağlamı tespit edildi'},
  Italian:    {japan:'🇯🇵 Cultura giapponese',china:'🇨🇳 Cina · Formale',korean:'🇰🇷 Coreano · Formale',arabic:'🇸🇦 Arabo · Cultura islamica',thai:'🇹🇭 Tailandese · Rispettoso',trade:'🏭 Commercio/logistica rilevato',legal:'⚖️ Legale rilevato',it:'💻 IT rilevato',finance:'💰 Finanza rilevata',medical:'🏥 Medico rilevato',urgent:'⚡ Tono urgente rilevato',positive:'😊 Tono positivo rilevato',complaint:'⚠️ Reclamo rilevato',negotiate:'🤝 Negoziazione rilevata'},
  Italian:    {japan:'🇯🇵 Cultura giapponese',china:'🇨🇳 Cina · Formale',korean:'🇰🇷 Coreano · Formale',arabic:'🇸🇦 Arabo · Cultura islamica',thai:'🇹🇭 Tailandese · Rispettoso',trade:'🏭 Commercio/logistica rilevato',legal:'⚖️ Legale rilevato',it:'💻 IT rilevato',finance:'💰 Finanza rilevata',medical:'🏥 Medico rilevato',urgent:'⚡ Tono urgente rilevato',positive:'😊 Tono positivo rilevato',complaint:'⚠️ Reclamo rilevato',negotiate:'🤝 Negoziazione rilevata'},
  Arabic:     {japan:'🇯🇵 الثقافة اليابانية',china:'🇨🇳 الصين · رسمي',korean:'🇰🇷 الكورية · رسمي',arabic:'🇸🇦 العربية · ثقافة إسلامية',thai:'🇹🇭 التايلاندية · مهذب',trade:'🏭 تم اكتشاف التجارة',legal:'⚖️ تم اكتشاف القانوني',it:'💻 تم اكتشاف IT',finance:'💰 تم اكتشاف المالية',medical:'🏥 تم اكتشاف الطبي',urgent:'⚡ نبرة عاجلة',positive:'😊 نبرة إيجابية',complaint:'⚠️ شكوى',negotiate:'🤝 سياق تفاوضي'},
  Arabic:     {japan:'🇯🇵 الثقافة اليابانية',china:'🇨🇳 الصين · رسمي',korean:'🇰🇷 الكورية · رسمي',arabic:'🇸🇦 العربية · ثقافة إسلامية',thai:'🇹🇭 التايلاندية · مهذب',trade:'🏭 تم اكتشاف التجارة',legal:'⚖️ تم اكتشاف القانوني',it:'💻 تم اكتشاف IT',finance:'💰 تم اكتشاف المالية',medical:'🏥 تم اكتشاف الطبي',urgent:'⚡ نبرة عاجلة',positive:'😊 نبرة إيجابية',complaint:'⚠️ شكوى',negotiate:'🤝 سياق تفاوضي'},
  Vietnamese: {japan:'🇯🇵 Văn hóa Nhật Bản',china:'🇨🇳 Trung Quốc · Trang trọng',korean:'🇰🇷 Tiếng Hàn · Trang trọng',arabic:'🇸🇦 Tiếng Ả Rập',thai:'🇹🇭 Tiếng Thái · Lịch sự',trade:'🏭 Phát hiện ngành thương mại',legal:'⚖️ Phát hiện ngành pháp lý',it:'💻 Phát hiện ngành IT',finance:'💰 Phát hiện ngành tài chính',medical:'🏥 Phát hiện ngành y tế',urgent:'⚡ Phát hiện giọng khẩn',positive:'😊 Phát hiện giọng tích cực',complaint:'⚠️ Phát hiện khiếu nại',negotiate:'🤝 Phát hiện đàm phán'},
  Vietnamese: {japan:'🇯🇵 Văn hóa Nhật Bản',china:'🇨🇳 Trung Quốc · Trang trọng',korean:'🇰🇷 Tiếng Hàn · Trang trọng',arabic:'🇸🇦 Tiếng Ả Rập',thai:'🇹🇭 Tiếng Thái · Lịch sự',trade:'🏭 Phát hiện ngành thương mại',legal:'⚖️ Phát hiện ngành pháp lý',it:'💻 Phát hiện ngành IT',finance:'💰 Phát hiện ngành tài chính',medical:'🏥 Phát hiện ngành y tế',urgent:'⚡ Phát hiện giọng khẩn',positive:'😊 Phát hiện giọng tích cực',complaint:'⚠️ Phát hiện khiếu nại',negotiate:'🤝 Phát hiện đàm phán'},
  Thai:       {japan:'🇯🇵 วัฒนธรรมญี่ปุ่น',china:'🇨🇳 จีน · เป็นทางการ',korean:'🇰🇷 ภาษาเกาหลี',arabic:'🇸🇦 ภาษาอาหรับ',thai:'🇹🇭 ไทย · สุภาพ',trade:'🏭 ตรวจพบการค้า',legal:'⚖️ ตรวจพบกฎหมาย',it:'💻 ตรวจพบ IT',finance:'💰 ตรวจพบการเงิน',medical:'🏥 ตรวจพบการแพทย์',urgent:'⚡ ตรวจพบน้ำเสียงเร่งด่วน',positive:'😊 ตรวจพบน้ำเสียงบวก',complaint:'⚠️ ตรวจพบร้องเรียน',negotiate:'🤝 ตรวจพบการเจรจา'},
  Thai:       {japan:'🇯🇵 วัฒนธรรมญี่ปุ่น',china:'🇨🇳 จีน · เป็นทางการ',korean:'🇰🇷 ภาษาเกาหลี',arabic:'🇸🇦 ภาษาอาหรับ',thai:'🇹🇭 ไทย · สุภาพ',trade:'🏭 ตรวจพบการค้า',legal:'⚖️ ตรวจพบกฎหมาย',it:'💻 ตรวจพบ IT',finance:'💰 ตรวจพบการเงิน',medical:'🏥 ตรวจพบการแพทย์',urgent:'⚡ ตรวจพบน้ำเสียงเร่งด่วน',positive:'😊 ตรวจพบน้ำเสียงบวก',complaint:'⚠️ ตรวจพบร้องเรียน',negotiate:'🤝 ตรวจพบการเจรจา'},
  Indonesian: {japan:'🇯🇵 Budaya Jepang',china:'🇨🇳 Tiongkok · Formal',korean:'🇰🇷 Bahasa Korea',arabic:'🇸🇦 Bahasa Arab',thai:'🇹🇭 Bahasa Thai',trade:'🏭 Industri perdagangan terdeteksi',legal:'⚖️ Industri hukum terdeteksi',it:'💻 Industri IT terdeteksi',finance:'💰 Industri keuangan terdeteksi',medical:'🏥 Industri medis terdeteksi',urgent:'⚡ Nada mendesak terdeteksi',positive:'😊 Nada positif terdeteksi',complaint:'⚠️ Keluhan terdeteksi',negotiate:'🤝 Konteks negosiasi terdeteksi'},
  Indonesian: {japan:'🇯🇵 Budaya Jepang',china:'🇨🇳 Tiongkok · Formal',korean:'🇰🇷 Bahasa Korea',arabic:'🇸🇦 Bahasa Arab',thai:'🇹🇭 Bahasa Thai',trade:'🏭 Industri perdagangan terdeteksi',legal:'⚖️ Industri hukum terdeteksi',it:'💻 Industri IT terdeteksi',finance:'💰 Industri keuangan terdeteksi',medical:'🏥 Industri medis terdeteksi',urgent:'⚡ Nada mendesak terdeteksi',positive:'😊 Nada positif terdeteksi',complaint:'⚠️ Keluhan terdeteksi',negotiate:'🤝 Konteks negosiasi terdeteksi'},
};
function detectAndShowInfoNV(emailContent, lang) {
  if (!nvCurrentPanel) return;
  const text = emailContent.toLowerCase();
  const keys = [];
  const _ecNsNV = emailContent.replace(/\s+/g,''); const _ecLenNV = _ecNsNV.length||1;
  const _hasLangNV = r => { const m = _ecNsNV.match(r); return m && m.length >= 5 && m.length/_ecLenNV >= 0.05; };
  if (_hasLangNV(/[\u3040-\u30ff]/g)) { keys.push('japan'); if (nvSelectedCountry === 'auto') { nvSelectedCountry = 'Japan'; const _csi=nvCurrentPanel.querySelector('#mm-nv-country'); if(_csi) _csi.value='Japan'; } }
  else if (_hasLangNV(/[\u4e00-\u9fff]/g)) { keys.push('china'); if (nvSelectedCountry === 'auto') { nvSelectedCountry = 'China'; const _csi=nvCurrentPanel.querySelector('#mm-nv-country'); if(_csi) _csi.value='China'; } }
  else if (_hasLangNV(/[\uAC00-\uD7AF]/g)) { keys.push('korean'); if (nvSelectedCountry === 'auto') { nvSelectedCountry = 'Korea'; const _csi=nvCurrentPanel.querySelector('#mm-nv-country'); if(_csi) _csi.value='Korea'; } }
  else if (_hasLangNV(/[\u0600-\u06FF]/g)) { keys.push('arabic'); if (nvSelectedCountry === 'auto') { nvSelectedCountry = 'Arabia'; const _csi=nvCurrentPanel.querySelector('#mm-nv-country'); if(_csi) _csi.value='Arabia'; } }
  else if (_hasLangNV(/[\u0E00-\u0E7F]/g)) { keys.push('thai'); }
  if (/lc|letter of credit|fob|cif|incoterm|invoice|shipping|customs|freight/.test(text)) keys.push('trade');
  else if (/contract|agreement|clause|legal|attorney|liability/.test(text)) keys.push('legal');
  else if (/api|sdk|bug|deploy|server|software|development/.test(text)) keys.push('it');
  else if (/invoice|payment|tax|vat|accounting|revenue/.test(text)) keys.push('finance');
  else if (/patient|diagnosis|treatment|medical|hospital/.test(text)) keys.push('medical');
  if (/urgent|asap|immediately|critical|emergency/.test(text)) keys.push('urgent');
  else if (/thank|appreciate|grateful|wonderful/.test(text)) keys.push('positive');
  else if (/complain|disappointed|unacceptable|issue|problem/.test(text)) keys.push('complaint');
  else if (/negotiate|price|discount|offer|proposal/.test(text)) keys.push('negotiate');
  _nvDetectedInfoKeys = keys;
  const d = DETECT_I18N_NV[lang] || DETECT_I18N_NV['English'];
  const detectEl = nvCurrentPanel.querySelector('#mm-nv-detect-info');
  if (detectEl) { if (keys.length>0) { detectEl.style.display='block'; detectEl.innerHTML=keys.map(k=>d[k]||k).join('<br>'); } else detectEl.style.display='none'; }
}

// ===== Compose Toolbar Button (Gmail injectComposeButton과 동일 구조) =====
function watchNVCompose() {
  const seen = new WeakSet();
  const observer = new MutationObserver(() => {
    const selectors = [
      '[class*="MailWrite"]', '[class*="mailWrite"]',
      '[class*="writeArea"]', '[class*="WriteArea"]',
      '.mail_write', '#mailWriteContainer', '.compose_wrap',
      '[class*="ComposeWrap"]', '[class*="composeWrap"]',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(form => {
        if (!seen.has(form) && !form.querySelector('#mm-nv-compose-btn')) {
          seen.add(form);
          injectNVComposeButton(form);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function injectNVComposeButton(form) {
  // SmartEditor 툴바 또는 작성창 헤더에 버튼 삽입
  const toolbar = form.querySelector(
    '.se-toolbar, [class*="writeHeader"], [class*="mailWriteHeader"], [class*="toolbar"], [class*="Toolbar"]'
  ) || form;
  const btn = document.createElement('div');
  btn.id = 'mm-nv-compose-btn';
  btn.style.cssText = [
    'display:inline-flex;align-items:center;gap:4px',
    'padding:5px 11px;border-radius:20px;cursor:pointer',
    'background:#e91e8c;color:#fff;font-size:11px;font-weight:700',
    'margin:4px;font-family:-apple-system,BlinkMacSystemFont,sans-serif',
    'box-shadow:0 2px 8px rgba(233,30,140,.25)',
    'transition:background .15s,transform .1s;user-select:none;position:relative;z-index:9999',
  ].join(';');
  btn.textContent = '✦ MailMind';
  btn.onmouseenter = () => { btn.style.background = '#c2185b'; btn.style.transform = 'scale(1.03)'; };
  btn.onmouseleave = () => { btn.style.background = '#e91e8c'; btn.style.transform = 'scale(1)'; };
  btn.addEventListener('click', () => openNVComposePanel());
  toolbar.prepend(btn);
}

// ===== FAB Button =====
function createNVFab() {
  if (document.getElementById('mm-nv-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'mm-nv-fab';
  fab.style.cssText = 'position:fixed;right:16px;bottom:80px;width:48px;height:48px;border-radius:50%;background:#e91e8c;color:#fff;border:none;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:2147483644;display:flex;align-items:center;justify-content:center;';
  fab.innerHTML = '✦';
  fab.title = 'MailMind AI';
  fab.addEventListener('click', () => {
    createNaverPanel(); // 내부에서 토글 처리
  });
  document.body.appendChild(fab);

  // Compose FAB
  if (!document.getElementById('mm-nv-compose-fab')) {
    const composeFab = document.createElement('button');
    composeFab.id = 'mm-nv-compose-fab';
    composeFab.style.cssText = 'position:fixed;right:16px;bottom:140px;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#7c4dff,#b388ff);color:#fff;border:none;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(124,77,255,0.3);z-index:2147483644;display:flex;align-items:center;justify-content:center;';
    composeFab.innerHTML = '✍';
    composeFab.title = 'MailMind AI 새 메일 작성';
    composeFab.addEventListener('click', () => openNVComposePanel());
    document.body.appendChild(composeFab);
  }
}

// ===== Naver Compose Float Panel (Gmail/Outlook float panel과 동일 구조) =====
const COMPOSE_I18N_NV = {
  Korean:     { tab1:'✨ AI 작성', tab2:'✏️ 손질', composePlaceholder:'예: 거래처에 납품 일정 확인 요청. 다음 주까지 답변 필요.', refinePlaceholder:'손질할 이메일을 입력하세요.', toneLabel:'톤', langLabel:'언어', composeBtn:'✨ AI 이메일 작성', refineBtn:'✏️ 손질', generatingText:'⏳ 작성 중...', subjectLabel:'제목', bodyLabel:'본문', insertBtn:'✉️ Naver 삽입', copyBtn:'📋 복사', regenBtn:'🔄', usageText:(u,l)=>`이번 달 남은 횟수 ${u}/${l}회`, errLogin:'팝업에서 로그인해주세요.', errEmpty:'내용을 입력해주세요.', errLimit:'이번 달 한도 초과. 업그레이드해주세요.', errFail:'생성 실패. 잠시 후 다시 시도해주세요.', successInsert:'복사됐어요! 새 메일 작성창에서 ⌘+V로 붙여넣으세요.', successCopy:'복사했습니다!', errNoBody:'클립보드에 복사했습니다.' },
  Korean:     { tab1:'✨ AI 작성', tab2:'✏️ 손질', composePlaceholder:'예: 거래처에 납품 일정 확인 요청. 다음 주까지 답변 필요.', refinePlaceholder:'손질할 이메일을 입력하세요.', toneLabel:'톤', langLabel:'언어', composeBtn:'✨ AI 이메일 작성', refineBtn:'✏️ 손질', generatingText:'⏳ 작성 중...', subjectLabel:'제목', bodyLabel:'본문', insertBtn:'✉️ Naver 삽입', copyBtn:'📋 복사', regenBtn:'🔄', usageText:(u,l)=>`이번 달 남은 횟수 ${u}/${l}회`, errLogin:'팝업에서 로그인해주세요.', errEmpty:'내용을 입력해주세요.', errLimit:'이번 달 한도 초과. 업그레이드해주세요.', errFail:'생성 실패. 잠시 후 다시 시도해주세요.', successInsert:'복사됐어요! 새 메일 작성창에서 ⌘+V로 붙여넣으세요.', successCopy:'복사했습니다!', errNoBody:'클립보드에 복사했습니다.' },
  English:    { tab1:'✨ AI Write', tab2:'✏️ Refine', composePlaceholder:'e.g. Ask supplier to confirm delivery by next Tuesday.', refinePlaceholder:'Paste the email you want to refine.', toneLabel:'Tone', langLabel:'Language', composeBtn:'✨ Compose Email', refineBtn:'✏️ Refine Email', generatingText:'⏳ Writing...', subjectLabel:'Subject', bodyLabel:'Body', insertBtn:'✉️ Insert to Naver', copyBtn:'📋 Copy', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} remaining`, errLogin:'Please log in from the popup.', errEmpty:'Please enter content.', errLimit:'Monthly limit reached. Please upgrade.', errFail:'Generation failed. Please try again.', successInsert:'Copied! Paste with ⌘+V in new mail.', successCopy:'Copied!', errNoBody:'Copied to clipboard.' },
  English:    { tab1:'✨ AI Write', tab2:'✏️ Refine', composePlaceholder:'e.g. Ask supplier to confirm delivery by next Tuesday.', refinePlaceholder:'Paste the email you want to refine.', toneLabel:'Tone', langLabel:'Language', composeBtn:'✨ Compose Email', refineBtn:'✏️ Refine Email', generatingText:'⏳ Writing...', subjectLabel:'Subject', bodyLabel:'Body', insertBtn:'✉️ Insert to Naver', copyBtn:'📋 Copy', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} remaining`, errLogin:'Please log in from the popup.', errEmpty:'Please enter content.', errLimit:'Monthly limit reached. Please upgrade.', errFail:'Generation failed. Please try again.', successInsert:'Copied! Paste with ⌘+V in new mail.', successCopy:'Copied!', errNoBody:'Copied to clipboard.' },
  Japanese:   { tab1:'✨ AI作成', tab2:'✏️ 修正', composePlaceholder:'例：取引先に納品日程の確認を依頼。来週火曜日までに返信が必要。', refinePlaceholder:'修正するメールを入力してください。', toneLabel:'トーン', langLabel:'言語', composeBtn:'✨ メール作成', refineBtn:'✏️ メール修正', generatingText:'⏳ 作成中...', subjectLabel:'件名', bodyLabel:'本文', insertBtn:'✉️ Naverに挿入', copyBtn:'📋 コピー', regenBtn:'🔄', usageText:(u,l)=>`今月残り ${u}/${l}回`, errLogin:'ポップアップからログインしてください。', errEmpty:'内容を入力してください。', errLimit:'月間上限に達しました。', errFail:'生成に失敗しました。', successInsert:'コピーしました！⌘+Vで貼り付けてください。', successCopy:'コピーしました！', errNoBody:'クリップボードにコピーしました。' },
  Japanese:   { tab1:'✨ AI作成', tab2:'✏️ 修正', composePlaceholder:'例：取引先に納品日程の確認を依頼。来週火曜日までに返信が必要。', refinePlaceholder:'修正するメールを入力してください。', toneLabel:'トーン', langLabel:'言語', composeBtn:'✨ メール作成', refineBtn:'✏️ メール修正', generatingText:'⏳ 作成中...', subjectLabel:'件名', bodyLabel:'本文', insertBtn:'✉️ Naverに挿入', copyBtn:'📋 コピー', regenBtn:'🔄', usageText:(u,l)=>`今月残り ${u}/${l}回`, errLogin:'ポップアップからログインしてください。', errEmpty:'内容を入力してください。', errLimit:'月間上限に達しました。', errFail:'生成に失敗しました。', successInsert:'コピーしました！⌘+Vで貼り付けてください。', successCopy:'コピーしました！', errNoBody:'クリップボードにコピーしました。' },
  Chinese:    { tab1:'✨ AI写信', tab2:'✏️ 润色', composePlaceholder:'例：请求供应商确认下周二前的交货时间。', refinePlaceholder:'粘贴要润色的邮件草稿。', toneLabel:'语气', langLabel:'语言', composeBtn:'✨ 撰写邮件', refineBtn:'✏️ 润色邮件', generatingText:'⏳ 撰写中...', subjectLabel:'主题', bodyLabel:'正文', insertBtn:'✉️ 插入Naver', copyBtn:'📋 复制', regenBtn:'🔄', usageText:(u,l)=>`本月剩余 ${u}/${l}次`, errLogin:'请从弹出窗口登录。', errEmpty:'请输入内容。', errLimit:'本月使用次数已达上限。', errFail:'生成失败，请稍后重试。', successInsert:'已复制！请在新邮件中按⌘+V粘贴。', successCopy:'已复制！', errNoBody:'已复制到剪贴板。' },
  Chinese:    { tab1:'✨ AI写信', tab2:'✏️ 润色', composePlaceholder:'例：请求供应商确认下周二前的交货时间。', refinePlaceholder:'粘贴要润色的邮件草稿。', toneLabel:'语气', langLabel:'语言', composeBtn:'✨ 撰写邮件', refineBtn:'✏️ 润色邮件', generatingText:'⏳ 撰写中...', subjectLabel:'主题', bodyLabel:'正文', insertBtn:'✉️ 插入Naver', copyBtn:'📋 复制', regenBtn:'🔄', usageText:(u,l)=>`本月剩余 ${u}/${l}次`, errLogin:'请从弹出窗口登录。', errEmpty:'请输入内容。', errLimit:'本月使用次数已达上限。', errFail:'生成失败，请稍后重试。', successInsert:'已复制！请在新邮件中按⌘+V粘贴。', successCopy:'已复制！', errNoBody:'已复制到剪贴板。' },
  Spanish:    { tab1:'✨ IA Redactar', tab2:'✏️ Refinar', composePlaceholder:'Ej: Solicitar confirmación de entrega al proveedor para el próximo martes.', refinePlaceholder:'Pega el borrador que quieres refinar.', toneLabel:'Tono', langLabel:'Idioma', composeBtn:'✨ Redactar correo', refineBtn:'✏️ Refinar correo', generatingText:'⏳ Redactando...', subjectLabel:'Asunto', bodyLabel:'Cuerpo', insertBtn:'✉️ Insertar en Naver', copyBtn:'📋 Copiar', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} restantes`, errLogin:'Inicia sesión desde el popup.', errEmpty:'Por favor ingresa contenido.', errLimit:'Límite mensual alcanzado.', errFail:'Error al generar.', successInsert:'¡Copiado! Pega con ⌘+V en el nuevo correo.', successCopy:'¡Copiado!', errNoBody:'Copiado al portapapeles.' },
  Spanish:    { tab1:'✨ IA Redactar', tab2:'✏️ Refinar', composePlaceholder:'Ej: Solicitar confirmación de entrega al proveedor para el próximo martes.', refinePlaceholder:'Pega el borrador que quieres refinar.', toneLabel:'Tono', langLabel:'Idioma', composeBtn:'✨ Redactar correo', refineBtn:'✏️ Refinar correo', generatingText:'⏳ Redactando...', subjectLabel:'Asunto', bodyLabel:'Cuerpo', insertBtn:'✉️ Insertar en Naver', copyBtn:'📋 Copiar', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} restantes`, errLogin:'Inicia sesión desde el popup.', errEmpty:'Por favor ingresa contenido.', errLimit:'Límite mensual alcanzado.', errFail:'Error al generar.', successInsert:'¡Copiado! Pega con ⌘+V en el nuevo correo.', successCopy:'¡Copiado!', errNoBody:'Copiado al portapapeles.' },
  French:     { tab1:'✨ IA Rédiger', tab2:'✏️ Affiner', composePlaceholder:'Ex: Demander au fournisseur de confirmer la livraison avant mardi.', refinePlaceholder:'Collez le brouillon à affiner.', toneLabel:'Ton', langLabel:'Langue', composeBtn:'✨ Rédiger l\'email', refineBtn:'✏️ Affiner l\'email', generatingText:'⏳ Rédaction...', subjectLabel:'Objet', bodyLabel:'Corps', insertBtn:'✉️ Insérer dans Naver', copyBtn:'📋 Copier', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} restants`, errLogin:'Connectez-vous depuis le popup.', errEmpty:'Veuillez saisir du contenu.', errLimit:'Limite mensuelle atteinte.', errFail:'Échec de la génération.', successInsert:'Copié ! Collez avec ⌘+V dans le nouveau mail.', successCopy:'Copié !', errNoBody:'Copié dans le presse-papiers.' },
  French:     { tab1:'✨ IA Rédiger', tab2:'✏️ Affiner', composePlaceholder:'Ex: Demander au fournisseur de confirmer la livraison avant mardi.', refinePlaceholder:'Collez le brouillon à affiner.', toneLabel:'Ton', langLabel:'Langue', composeBtn:'✨ Rédiger l\'email', refineBtn:'✏️ Affiner l\'email', generatingText:'⏳ Rédaction...', subjectLabel:'Objet', bodyLabel:'Corps', insertBtn:'✉️ Insérer dans Naver', copyBtn:'📋 Copier', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} restants`, errLogin:'Connectez-vous depuis le popup.', errEmpty:'Veuillez saisir du contenu.', errLimit:'Limite mensuelle atteinte.', errFail:'Échec de la génération.', successInsert:'Copié ! Collez avec ⌘+V dans le nouveau mail.', successCopy:'Copié !', errNoBody:'Copié dans le presse-papiers.' },
  German:     { tab1:'✨ KI Verfassen', tab2:'✏️ Verfeinern', composePlaceholder:'Z.B.: Lieferant um Bestätigung des Liefertermins bis Dienstag bitten.', refinePlaceholder:'Entwurf zum Verfeinern einfügen.', toneLabel:'Ton', langLabel:'Sprache', composeBtn:'✨ E-Mail verfassen', refineBtn:'✏️ E-Mail verfeinern', generatingText:'⏳ Wird verfasst...', subjectLabel:'Betreff', bodyLabel:'Text', insertBtn:'✉️ In Naver einfügen', copyBtn:'📋 Kopieren', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} verbleibend`, errLogin:'Bitte im Popup anmelden.', errEmpty:'Bitte Inhalt eingeben.', errLimit:'Monatliches Limit erreicht.', errFail:'Generierung fehlgeschlagen.', successInsert:'Kopiert! Mit ⌘+V in neue E-Mail einfügen.', successCopy:'Kopiert!', errNoBody:'In Zwischenablage kopiert.' },
  German:     { tab1:'✨ KI Verfassen', tab2:'✏️ Verfeinern', composePlaceholder:'Z.B.: Lieferant um Bestätigung des Liefertermins bis Dienstag bitten.', refinePlaceholder:'Entwurf zum Verfeinern einfügen.', toneLabel:'Ton', langLabel:'Sprache', composeBtn:'✨ E-Mail verfassen', refineBtn:'✏️ E-Mail verfeinern', generatingText:'⏳ Wird verfasst...', subjectLabel:'Betreff', bodyLabel:'Text', insertBtn:'✉️ In Naver einfügen', copyBtn:'📋 Kopieren', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} verbleibend`, errLogin:'Bitte im Popup anmelden.', errEmpty:'Bitte Inhalt eingeben.', errLimit:'Monatliches Limit erreicht.', errFail:'Generierung fehlgeschlagen.', successInsert:'Kopiert! Mit ⌘+V in neue E-Mail einfügen.', successCopy:'Kopiert!', errNoBody:'In Zwischenablage kopiert.' },
  Portuguese: { tab1:'✨ IA Redigir', tab2:'✏️ Refinar', composePlaceholder:'Ex: Solicitar confirmação de entrega ao fornecedor até terça-feira.', refinePlaceholder:'Cole o rascunho para refinar.', toneLabel:'Tom', langLabel:'Idioma', composeBtn:'✨ Redigir e-mail', refineBtn:'✏️ Refinar e-mail', generatingText:'⏳ Redigindo...', subjectLabel:'Assunto', bodyLabel:'Corpo', insertBtn:'✉️ Inserir no Naver', copyBtn:'📋 Copiar', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} restantes`, errLogin:'Faça login no popup.', errEmpty:'Por favor insira conteúdo.', errLimit:'Limite mensal atingido.', errFail:'Falha na geração.', successInsert:'Copiado! Cole com ⌘+V no novo e-mail.', successCopy:'Copiado!', errNoBody:'Copiado para área de transferência.' },
  Portuguese: { tab1:'✨ IA Redigir', tab2:'✏️ Refinar', composePlaceholder:'Ex: Solicitar confirmação de entrega ao fornecedor até terça-feira.', refinePlaceholder:'Cole o rascunho para refinar.', toneLabel:'Tom', langLabel:'Idioma', composeBtn:'✨ Redigir e-mail', refineBtn:'✏️ Refinar e-mail', generatingText:'⏳ Redigindo...', subjectLabel:'Assunto', bodyLabel:'Corpo', insertBtn:'✉️ Inserir no Naver', copyBtn:'📋 Copiar', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} restantes`, errLogin:'Faça login no popup.', errEmpty:'Por favor insira conteúdo.', errLimit:'Limite mensal atingido.', errFail:'Falha na geração.', successInsert:'Copiado! Cole com ⌘+V no novo e-mail.', successCopy:'Copiado!', errNoBody:'Copiado para área de transferência.' },
  Arabic:     { tab1:'✨ كتابة AI', tab2:'✏️ تحسين', composePlaceholder:'مثال: طلب تأكيد موعد التسليم من المورد قبل الثلاثاء.', refinePlaceholder:'الصق المسودة للتحسين.', toneLabel:'النبرة', langLabel:'اللغة', composeBtn:'✨ كتابة البريد', refineBtn:'✏️ تحسين البريد', generatingText:'⏳ جارٍ الكتابة...', subjectLabel:'الموضوع', bodyLabel:'النص', insertBtn:'✉️ إدراج في Naver', copyBtn:'📋 نسخ', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} متبقي`, errLogin:'يرجى تسجيل الدخول.', errEmpty:'يرجى إدخال محتوى.', errLimit:'تم الوصول إلى الحد الشهري.', errFail:'فشل الإنشاء.', successInsert:'تم النسخ! الصق بـ ⌘+V في البريد الجديد.', successCopy:'تم النسخ!', errNoBody:'تم النسخ إلى الحافظة.' },
  Arabic:     { tab1:'✨ كتابة AI', tab2:'✏️ تحسين', composePlaceholder:'مثال: طلب تأكيد موعد التسليم من المورد قبل الثلاثاء.', refinePlaceholder:'الصق المسودة للتحسين.', toneLabel:'النبرة', langLabel:'اللغة', composeBtn:'✨ كتابة البريد', refineBtn:'✏️ تحسين البريد', generatingText:'⏳ جارٍ الكتابة...', subjectLabel:'الموضوع', bodyLabel:'النص', insertBtn:'✉️ إدراج في Naver', copyBtn:'📋 نسخ', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} متبقي`, errLogin:'يرجى تسجيل الدخول.', errEmpty:'يرجى إدخال محتوى.', errLimit:'تم الوصول إلى الحد الشهري.', errFail:'فشل الإنشاء.', successInsert:'تم النسخ! الصق بـ ⌘+V في البريد الجديد.', successCopy:'تم النسخ!', errNoBody:'تم النسخ إلى الحافظة.' },
  Vietnamese: { tab1:'✨ AI Soạn', tab2:'✏️ Tinh chỉnh', composePlaceholder:'VD: Yêu cầu nhà cung cấp xác nhận lịch giao hàng trước thứ Ba.', refinePlaceholder:'Dán bản nháp cần tinh chỉnh.', toneLabel:'Giọng điệu', langLabel:'Ngôn ngữ', composeBtn:'✨ Soạn email', refineBtn:'✏️ Tinh chỉnh email', generatingText:'⏳ Đang soạn...', subjectLabel:'Chủ đề', bodyLabel:'Nội dung', insertBtn:'✉️ Chèn vào Naver', copyBtn:'📋 Sao chép', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} còn lại`, errLogin:'Vui lòng đăng nhập.', errEmpty:'Vui lòng nhập nội dung.', errLimit:'Đã đạt giới hạn tháng.', errFail:'Tạo thất bại.', successInsert:'Đã sao chép! Dán bằng ⌘+V vào email mới.', successCopy:'Đã sao chép!', errNoBody:'Đã sao chép vào clipboard.' },
  Vietnamese: { tab1:'✨ AI Soạn', tab2:'✏️ Tinh chỉnh', composePlaceholder:'VD: Yêu cầu nhà cung cấp xác nhận lịch giao hàng trước thứ Ba.', refinePlaceholder:'Dán bản nháp cần tinh chỉnh.', toneLabel:'Giọng điệu', langLabel:'Ngôn ngữ', composeBtn:'✨ Soạn email', refineBtn:'✏️ Tinh chỉnh email', generatingText:'⏳ Đang soạn...', subjectLabel:'Chủ đề', bodyLabel:'Nội dung', insertBtn:'✉️ Chèn vào Naver', copyBtn:'📋 Sao chép', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} còn lại`, errLogin:'Vui lòng đăng nhập.', errEmpty:'Vui lòng nhập nội dung.', errLimit:'Đã đạt giới hạn tháng.', errFail:'Tạo thất bại.', successInsert:'Đã sao chép! Dán bằng ⌘+V vào email mới.', successCopy:'Đã sao chép!', errNoBody:'Đã sao chép vào clipboard.' },
  Thai:       { tab1:'✨ AI เขียน', tab2:'✏️ ปรับแต่ง', composePlaceholder:'เช่น: ขอให้ซัพพลายเออร์ยืนยันกำหนดส่งก่อนวันอังคาร', refinePlaceholder:'วางร่างอีเมลที่ต้องการปรับแต่ง', toneLabel:'โทน', langLabel:'ภาษา', composeBtn:'✨ เขียนอีเมล', refineBtn:'✏️ ปรับแต่งอีเมล', generatingText:'⏳ กำลังเขียน...', subjectLabel:'หัวข้อ', bodyLabel:'เนื้อหา', insertBtn:'✉️ แทรกใน Naver', copyBtn:'📋 คัดลอก', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} คงเหลือ`, errLogin:'กรุณาเข้าสู่ระบบ', errEmpty:'กรุณาใส่เนื้อหา', errLimit:'ถึงขีดจำกัดรายเดือนแล้ว', errFail:'การสร้างล้มเหลว', successInsert:'คัดลอกแล้ว! วางด้วย ⌘+V ในอีเมลใหม่', successCopy:'คัดลอกแล้ว!', errNoBody:'คัดลอกไปยังคลิปบอร์ดแล้ว' },
  Thai:       { tab1:'✨ AI เขียน', tab2:'✏️ ปรับแต่ง', composePlaceholder:'เช่น: ขอให้ซัพพลายเออร์ยืนยันกำหนดส่งก่อนวันอังคาร', refinePlaceholder:'วางร่างอีเมลที่ต้องการปรับแต่ง', toneLabel:'โทน', langLabel:'ภาษา', composeBtn:'✨ เขียนอีเมล', refineBtn:'✏️ ปรับแต่งอีเมล', generatingText:'⏳ กำลังเขียน...', subjectLabel:'หัวข้อ', bodyLabel:'เนื้อหา', insertBtn:'✉️ แทรกใน Naver', copyBtn:'📋 คัดลอก', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} คงเหลือ`, errLogin:'กรุณาเข้าสู่ระบบ', errEmpty:'กรุณาใส่เนื้อหา', errLimit:'ถึงขีดจำกัดรายเดือนแล้ว', errFail:'การสร้างล้มเหลว', successInsert:'คัดลอกแล้ว! วางด้วย ⌘+V ในอีเมลใหม่', successCopy:'คัดลอกแล้ว!', errNoBody:'คัดลอกไปยังคลิปบอร์ดแล้ว' },
  Indonesian: { tab1:'✨ AI Tulis', tab2:'✏️ Poles', composePlaceholder:'Cth: Minta konfirmasi jadwal pengiriman dari pemasok sebelum Selasa.', refinePlaceholder:'Tempel draf yang ingin dipoles.', toneLabel:'Nada', langLabel:'Bahasa', composeBtn:'✨ Tulis Email', refineBtn:'✏️ Poles Email', generatingText:'⏳ Sedang menulis...', subjectLabel:'Subjek', bodyLabel:'Isi', insertBtn:'✉️ Masukkan ke Naver', copyBtn:'📋 Salin', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} tersisa`, errLogin:'Silakan masuk dari popup.', errEmpty:'Silakan masukkan konten.', errLimit:'Batas bulanan tercapai.', errFail:'Gagal menghasilkan.', successInsert:'Disalin! Tempel dengan ⌘+V di email baru.', successCopy:'Disalin!', errNoBody:'Disalin ke clipboard.' },
  Indonesian: { tab1:'✨ AI Tulis', tab2:'✏️ Poles', composePlaceholder:'Cth: Minta konfirmasi jadwal pengiriman dari pemasok sebelum Selasa.', refinePlaceholder:'Tempel draf yang ingin dipoles.', toneLabel:'Nada', langLabel:'Bahasa', composeBtn:'✨ Tulis Email', refineBtn:'✏️ Poles Email', generatingText:'⏳ Sedang menulis...', subjectLabel:'Subjek', bodyLabel:'Isi', insertBtn:'✉️ Masukkan ke Naver', copyBtn:'📋 Salin', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} tersisa`, errLogin:'Silakan masuk dari popup.', errEmpty:'Silakan masukkan konten.', errLimit:'Batas bulanan tercapai.', errFail:'Gagal menghasilkan.', successInsert:'Disalin! Tempel dengan ⌘+V di email baru.', successCopy:'Disalin!', errNoBody:'Disalin ke clipboard.' },
  Italian:    { tab1:'✨ IA Scrivi', tab2:'✏️ Rifinisci', composePlaceholder:'Es: Chiedere al fornitore conferma della consegna entro martedì.', refinePlaceholder:'Incolla la bozza da rifinire.', toneLabel:'Tono', langLabel:'Lingua', composeBtn:'✨ Scrivi email', refineBtn:'✏️ Rifinisci email', generatingText:'⏳ Scrittura...', subjectLabel:'Oggetto', bodyLabel:'Corpo', insertBtn:'✉️ Inserisci in Naver', copyBtn:'📋 Copia', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} rimanenti`, errLogin:'Accedi dal popup.', errEmpty:'Inserisci il contenuto.', errLimit:'Limite mensile raggiunto.', errFail:'Generazione fallita.', successInsert:'Copiato! Incolla con ⌘+V nella nuova email.', successCopy:'Copiato!', errNoBody:'Copiato negli appunti.' },
  Italian:    { tab1:'✨ IA Scrivi', tab2:'✏️ Rifinisci', composePlaceholder:'Es: Chiedere al fornitore conferma della consegna entro martedì.', refinePlaceholder:'Incolla la bozza da rifinire.', toneLabel:'Tono', langLabel:'Lingua', composeBtn:'✨ Scrivi email', refineBtn:'✏️ Rifinisci email', generatingText:'⏳ Scrittura...', subjectLabel:'Oggetto', bodyLabel:'Corpo', insertBtn:'✉️ Inserisci in Naver', copyBtn:'📋 Copia', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} rimanenti`, errLogin:'Accedi dal popup.', errEmpty:'Inserisci il contenuto.', errLimit:'Limite mensile raggiunto.', errFail:'Generazione fallita.', successInsert:'Copiato! Incolla con ⌘+V nella nuova email.', successCopy:'Copiato!', errNoBody:'Copiato negli appunti.' },
  Turkish:    { tab1:'✨ AI Yaz', tab2:'✏️ İyileştir', composePlaceholder:'Örn: Tedarikçiden Salı\'ya kadar teslimat takvimine onay isteyin.', refinePlaceholder:'İyileştirmek istediğiniz taslağı yapıştırın.', toneLabel:'Ton', langLabel:'Dil', composeBtn:'✨ E-posta Yaz', refineBtn:'✏️ E-postayı İyileştir', generatingText:'⏳ Yazılıyor...', subjectLabel:'Konu', bodyLabel:'İçerik', insertBtn:"\u2709\ufe0f Naver'a Ekle", copyBtn:'📋 Kopyala', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} kalan`, errLogin:'Lütfen popup\'tan giriş yapın.', errEmpty:'Lütfen içerik girin.', errLimit:'Aylık limit doldu.', errFail:'Oluşturma başarısız.', successInsert:'Kopyalandı! Yeni postaya ⌘+V ile yapıştırın.', successCopy:'Kopyalandı!', errNoBody:'Panoya kopyalandı.' },
  Turkish:    { tab1:'✨ AI Yaz', tab2:'✏️ İyileştir', composePlaceholder:'Örn: Tedarikçiden Salı\'ya kadar teslimat takvimine onay isteyin.', refinePlaceholder:'İyileştirmek istediğiniz taslağı yapıştırın.', toneLabel:'Ton', langLabel:'Dil', composeBtn:'✨ E-posta Yaz', refineBtn:'✏️ E-postayı İyileştir', generatingText:'⏳ Yazılıyor...', subjectLabel:'Konu', bodyLabel:'İçerik', insertBtn:"\u2709\ufe0f Naver'a Ekle", copyBtn:'📋 Kopyala', regenBtn:'🔄', usageText:(u,l)=>`${u}/${l} kalan`, errLogin:'Lütfen popup\'tan giriş yapın.', errEmpty:'Lütfen içerik girin.', errLimit:'Aylık limit doldu.', errFail:'Oluşturma başarısız.', successInsert:'Kopyalandı! Yeni postaya ⌘+V ile yapıştırın.', successCopy:'Kopyalandı!', errNoBody:'Panoya kopyalandı.' },
};

const COMPOSE_TONES_NV = [
  { value:'professional', ko:'업무적',   en:'Professional', ja:'ビジネス', zh:'正式',    es:'Profesional', fr:'Professionnel', de:'Professionell', pt:'Profissional', ar:'رسمي',   vi:'Chuyên nghiệp', th:'เป็นทางการ',  id:'Profesional', it:'Professionale', tr:'Profesyonel' },
  { value:'friendly',     ko:'친근하게', en:'Friendly',     ja:'フレンドリー', zh:'友好', es:'Amigable',    fr:'Amical',        de:'Freundlich',   pt:'Amigável',    ar:'ودي',    vi:'Thân thiện',    th:'เป็นกันเอง',  id:'Ramah',       it:'Amichevole',    tr:'Samimi' },
  { value:'concise',      ko:'간결하게', en:'Concise',      ja:'簡潔',     zh:'简洁',    es:'Conciso',     fr:'Concis',        de:'Prägnant',     pt:'Conciso',     ar:'موجز',   vi:'Súc tích',      th:'กระชับ',      id:'Singkat',     it:'Conciso',       tr:'Kısa' },
  { value:'detailed',     ko:'상세하게', en:'Detailed',     ja:'詳細',     zh:'详细',    es:'Detallado',   fr:'Détaillé',      de:'Detailliert',  pt:'Detalhado',   ar:'مفصل',   vi:'Chi tiết',      th:'ละเอียด',     id:'Terperinci',  it:'Dettagliato',   tr:'Ayrıntılı' },
  { value:'decline',      ko:'거절하기', en:'Decline',      ja:'断り',     zh:'拒绝',    es:'Declinar',    fr:'Décliner',      de:'Ablehnen',     pt:'Recusar',     ar:'رفض',    vi:'Từ chối',       th:'ปฏิเสธ',      id:'Tolak',       it:'Rifiutare',     tr:'Reddet' },
  { value:'thankful',     ko:'감사하게', en:'Thankful',     ja:'感謝',     zh:'感谢',    es:'Agradecido',  fr:'Reconnaissant', de:'Dankbar',      pt:'Grato',       ar:'ممتنن',  vi:'Cảm ơn',        th:'ขอบคุณ',      id:'Berterima kasih', it:'Grato', tr:'Teşekkür' },
];

const COMPOSE_LANGS_NV = [
  { value:'Korean',     flag:'🇰🇷', label:'한국어' }, { value:'English',    flag:'🇺🇸', label:'English' },
  { value:'Japanese',   flag:'🇯🇵', label:'日本語' }, { value:'Chinese',    flag:'🇨🇳', label:'中文' },
  { value:'Spanish',    flag:'🇪🇸', label:'Español' }, { value:'French',   flag:'🇫🇷', label:'Français' },
  { value:'German',     flag:'🇩🇪', label:'Deutsch' }, { value:'Portuguese',flag:'🇧🇷', label:'Português' },
  { value:'Arabic',     flag:'🇸🇦', label:'العربية' }, { value:'Vietnamese',flag:'🇻🇳', label:'Tiếng Việt' },
  { value:'Thai',       flag:'🇹🇭', label:'ภาษาไทย' }, { value:'Indonesian',flag:'🇮🇩', label:'Indonesia' },
  { value:'Italian',    flag:'🇮🇹', label:'Italiano' }, { value:'Turkish',  flag:'🇹🇷', label:'Türkçe' },
];

const VALID_COMPOSE_LANGS_NV = COMPOSE_LANGS_NV.map(l => l.value);

function sanitizeNVCompose(str) {
  if (str === undefined || str === null) return '';
  const div = document.createElement('div'); div.textContent = String(str); return div.innerHTML;
}

function createNVFloatPanel() {
  if (document.getElementById('mm-nv-float-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'mm-nv-float-panel';
  panel.style.cssText = `
    position:fixed;right:70px;bottom:80px;
    width:360px;max-height:88vh;
    background:#fff;border:1.5px solid #e91e8c;border-radius:14px;
    box-shadow:0 8px 40px rgba(233,30,140,.18);
    z-index:2147483645;display:none;flex-direction:column;
    font-family:Google Sans,Arial,sans-serif;font-size:13px;
    overflow:hidden;
  `;
  document.body.appendChild(panel);
  makeNVFloatDraggable(panel);
  return panel;
}

function makeNVFloatDraggable(el) {
  let dragging = false, ox = 0, oy = 0, startX = 0, startY = 0;
  el.addEventListener('mousedown', e => {
    const hdr = el.querySelector('#mm-nv-fp-header');
    if (!hdr || !hdr.contains(e.target)) return;
    if (e.target.closest('button')) return;
    dragging = true;
    const rect = el.getBoundingClientRect();
    el.style.transform = 'none'; el.style.right = 'auto'; el.style.bottom = 'auto';
    el.style.left = rect.left + 'px'; el.style.top = rect.top + 'px';
    ox = rect.left; oy = rect.top; startX = e.clientX; startY = e.clientY;
    el.style.transition = 'none'; el.style.userSelect = 'none'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, ox + e.clientX - startX)) + 'px';
    el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, oy + e.clientY - startY)) + 'px';
  });
  document.addEventListener('mouseup', () => { if (dragging) { dragging = false; el.style.userSelect = ''; } });
}

function openNVFloatPanel() {
  let panel = document.getElementById('mm-nv-float-panel');
  if (!panel) panel = createNVFloatPanel();
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
  if (!panel.style.left || panel.style.left === 'auto') {
    panel.style.right = '70px'; panel.style.bottom = '80px';
    panel.style.left = 'auto'; panel.style.top = 'auto'; panel.style.transform = 'none';
  }
  panel.style.display = 'flex';
  if (!panel.querySelector('#mm-nv-fp-inner')) {
    renderNVFloatPanel(panel);
  } else {
    chrome.storage.sync.get(['myLanguage'], d => {
      const savedLang = d.myLanguage || 'Korean';
      if (panel.__updateLang && panel.__curLang !== savedLang) panel.__updateLang(savedLang);
    });
  }
}

async function renderNVFloatPanel(panel) {
  const userData = await getUserDataNV();
  const userInfo = await new Promise(r => chrome.storage.sync.get(['userInfo'], d => r(d.userInfo || '')));

  let curLang = (await new Promise(r => chrome.storage.sync.get(['myLanguage'], d => r(d.myLanguage || 'Korean'))));
  if (!VALID_COMPOSE_LANGS_NV.includes(curLang)) curLang = 'Korean';
  let curOutputLang = curLang;
  let nvTransLang = curLang;
  let curTone = 'professional';
  let curMode = 'compose';
  let langDropOpen = false;
  let toneDropOpen = false;
  let transLangDropOpenNV = false;
  let _nvFpVersions = [];
  let _nvFpCurrentVerIdx = 0;
  const COMPARE_BTN_LABELS_NV = { Korean:'🔀 비교 3종', English:'🔀 Compare ×3', Japanese:'🔀 3種比較', Chinese:'🔀 比较×3', Spanish:'🔀 Comparar ×3', French:'🔀 Comparer ×3', German:'🔀 Vergl. ×3', Portuguese:'🔀 Comparar ×3', Arabic:'🔀 مقارنة ×3', Vietnamese:'🔀 So sánh ×3', Thai:'🔀 เปรียบ ×3', Indonesian:'🔀 Bandingan ×3', Italian:'🔀 Confronta ×3', Turkish:'🔀 Karşılaştır ×3' };

  function T() { return COMPOSE_I18N_NV[curLang] || COMPOSE_I18N_NV['English']; }

  function toneLabelNV(val) {
    const item = COMPOSE_TONES_NV.find(t => t.value === val);
    if (!item) return val;
    const map = { Korean:'ko', English:'en', Japanese:'ja', Chinese:'zh', Spanish:'es', French:'fr', German:'de', Portuguese:'pt', Arabic:'ar', Vietnamese:'vi', Thai:'th', Indonesian:'id', Italian:'it', Turkish:'tr' };
    return item[map[curLang] || 'en'] || item.en;
  }

  function currentLangItemNV() { return COMPOSE_LANGS_NV.find(l => l.value === curLang) || COMPOSE_LANGS_NV[0]; }

  function render() {
    const t = T();
    const langItem = currentLangItemNV();
    panel.innerHTML = `
      <div id="mm-nv-fp-inner" style="display:flex;flex-direction:column;max-height:88vh">
        <div id="mm-nv-fp-header" style="
          background:linear-gradient(135deg,#e91e8c,#ff6b9d);color:#fff;
          padding:12px 16px;display:flex;align-items:center;justify-content:space-between;
          cursor:move;user-select:none;flex-shrink:0;
        ">
          <span style="font-weight:700;font-size:14px">✦ MailMind</span>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="display:flex;background:rgba(255,255,255,.2);border-radius:8px;padding:2px">
              <button id="mm-nv-fp-tab-compose" style="flex:1;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${curMode==='compose'?'background:#fff;color:#e91e8c':'background:transparent;color:#fff'}">${sanitizeNVCompose(t.tab1)}</button>
              <button id="mm-nv-fp-tab-refine" style="flex:1;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${curMode==='refine'?'background:#fff;color:#e91e8c':'background:transparent;color:#fff'}">${sanitizeNVCompose(t.tab2)}</button>
            </div>
            <button id="mm-nv-fp-close" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:14px 16px">
          <textarea id="mm-nv-fp-input" placeholder="${sanitizeNVCompose(curMode==='compose' ? t.composePlaceholder : t.refinePlaceholder)}" style="
            width:100%;box-sizing:border-box;padding:10px;border:1.5px solid #e8eaed;border-radius:10px;
            font-size:13px;resize:vertical;min-height:72px;font-family:inherit;outline:none;
            transition:border-color .15s;line-height:1.5;
          " onfocus="this.style.borderColor='#e91e8c'" onblur="this.style.borderColor='#e8eaed'"></textarea>
          <div style="display:flex;gap:8px;margin-top:10px;position:relative">
            <div style="flex:1;position:relative">
              <button id="mm-nv-fp-tone-trigger" style="
                width:100%;padding:8px 10px;border:1.5px solid #e8eaed;border-radius:10px;
                background:#fff;font-size:12px;cursor:pointer;font-family:inherit;
                display:flex;justify-content:space-between;align-items:center;
              ">
                <span>${sanitizeNVCompose(t.toneLabel)}: <b>${sanitizeNVCompose(toneLabelNV(curTone))}</b></span>
                <span id="mm-nv-fp-tone-arrow" style="font-size:10px;transition:transform .15s;${toneDropOpen?'transform:rotate(180deg)':''}">▼</span>
              </button>
              <div id="mm-nv-fp-tone-list" style="
                display:${toneDropOpen?'block':'none'};position:absolute;top:100%;left:0;right:0;
                background:#fff;border:1.5px solid #e91e8c;border-radius:10px;z-index:10;
                box-shadow:0 4px 16px rgba(0,0,0,.12);margin-top:4px;overflow:hidden;
              ">
                ${COMPOSE_TONES_NV.map(t2=>`<button data-val="${t2.value}" style="display:block;width:100%;padding:9px 12px;text-align:left;border:none;background:${curTone===t2.value?'#fce4ec':'#fff'};font-size:12px;cursor:pointer;font-family:inherit;color:${curTone===t2.value?'#e91e8c':'#202124'}">${sanitizeNVCompose(toneLabelNV(t2.value))}</button>`).join('')}
              </div>
            </div>
            <div style="flex:1;position:relative">
              <button id="mm-nv-fp-lang-trigger" style="
                width:100%;padding:8px 10px;border:1.5px solid #e8eaed;border-radius:10px;
                background:#fff;font-size:12px;cursor:pointer;font-family:inherit;
                display:flex;justify-content:space-between;align-items:center;
              ">
                <span>${langItem.flag} <b>${sanitizeNVCompose(langItem.label)}</b></span>
                <span id="mm-nv-fp-lang-arrow" style="font-size:10px;transition:transform .15s;${langDropOpen?'transform:rotate(180deg)':''}">▼</span>
              </button>
              <div id="mm-nv-fp-lang-list" style="
                display:${langDropOpen?'block':'none'};position:absolute;top:100%;left:0;right:0;
                background:#fff;border:1.5px solid #e91e8c;border-radius:10px;z-index:10;
                box-shadow:0 4px 16px rgba(0,0,0,.12);margin-top:4px;overflow:hidden;max-height:200px;overflow-y:auto;
              ">
                ${COMPOSE_LANGS_NV.map(l=>`<button data-val="${l.value}" style="display:block;width:100%;padding:9px 12px;text-align:left;border:none;background:${curLang===l.value?'#fce4ec':'#fff'};font-size:12px;cursor:pointer;font-family:inherit;color:${curLang===l.value?'#e91e8c':'#202124'}">${l.flag} ${sanitizeNVCompose(l.label)}</button>`).join('')}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:7px;margin-top:10px">
            <button id="mm-nv-fp-gen-btn" style="
              flex:1;padding:11px;
              background:linear-gradient(135deg,#e91e8c,#ff6b9d);color:#fff;
              border:none;border-radius:10px;font-size:13px;font-weight:700;
              cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(233,30,140,.3);
            ">${sanitizeNVCompose(curMode==='compose' ? t.composeBtn : t.refineBtn)}</button>
            <button id="mm-nv-fp-compare" style="flex:1;padding:11px;background:#fff3e0;color:#f57c00;border:1.5px solid #ffb74d;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">${COMPARE_BTN_LABELS_NV[curLang]||'🔀 비교 3종'}</button>
          </div>
          <div id="mm-nv-fp-result" style="display:none;margin-top:14px;border-top:1px solid #f0f0f0;padding-top:14px">
            <div id="mm-nv-fp-ver-tabs" style="display:none;gap:6px;margin-bottom:10px;flex-wrap:wrap"></div>
            <div style="margin-bottom:8px">
              <label style="font-size:11px;color:#9aa0a6;font-weight:600">${sanitizeNVCompose(t.subjectLabel)}</label>
              <input id="mm-nv-fp-subject" type="text" style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #e8eaed;border-radius:8px;font-size:12px;font-family:inherit;outline:none;">
            </div>
            <div style="margin-bottom:8px">
              <label style="font-size:11px;color:#9aa0a6;font-weight:600">${sanitizeNVCompose(t.bodyLabel)}</label>
              <textarea id="mm-nv-fp-output" style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #e8eaed;border-radius:8px;font-size:12px;resize:vertical;min-height:100px;font-family:inherit;outline:none;line-height:1.6;"></textarea>
            </div>
            <div style="position:relative;margin-top:8px;margin-bottom:8px;">
              <div style="font-size:10px;color:#9aa0a6;font-weight:600;margin-bottom:4px;">번역 언어</div>
              <button id="mm-nv-fp-tl-trigger" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:1.5px solid #e8eaed;border-radius:8px;background:#fff;font-size:13px;cursor:pointer;font-family:inherit;box-sizing:border-box;">
                <span style="font-size:15px">${(COMPOSE_LANGS_NV.find(l=>l.value===nvTransLang)||COMPOSE_LANGS_NV[0]).flag}</span>
                <span style="font-size:12px;color:#333;flex:1;text-align:left">${sanitizeNVCompose((COMPOSE_LANGS_NV.find(l=>l.value===nvTransLang)||COMPOSE_LANGS_NV[0]).label)}</span>
                <span id="mm-nv-fp-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>
              </button>
              <div id="mm-nv-fp-tl-list" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e8eaed;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:9999;overflow:hidden;max-height:180px;overflow-y:auto;">
                ${COMPOSE_LANGS_NV.map(l=>`<button data-val="${l.value}" class="mm-nv-fp-translate-btn" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:none;border-bottom:1px solid #f0f0f0;background:${nvTransLang===l.value?'#fce4ec':'#fff'};font-size:13px;cursor:pointer;text-align:left;font-family:inherit;box-sizing:border-box;">${l.flag} <span style="font-size:12px;color:#333">${sanitizeNVCompose(l.label)}</span>${nvTransLang===l.value?'<span style="margin-left:auto;color:#e91e8c">✓</span>':''}</button>`).join('')}
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button id="mm-nv-fp-insert" style="flex:3;padding:10px;background:#e91e8c;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">${sanitizeNVCompose(t.insertBtn)}</button>
              <button id="mm-nv-fp-copy" style="flex:2;padding:10px;background:#fff;color:#e91e8c;border:1.5px solid #e91e8c;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">${sanitizeNVCompose(t.copyBtn)}</button>
              <button id="mm-nv-fp-restore" style="display:none;padding:10px 11px;background:#fff5fb;color:#e91e8c;border:1.5px solid #f8c8e8;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;" title="AI 원본으로 복원">↩</button>
              <button id="mm-nv-fp-refine" style="padding:10px 12px;background:#f5f5f5;color:#673ab7;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;cursor:pointer;" title="✨ 다듬기">✨</button>
              <button id="mm-nv-fp-regen" style="padding:10px 12px;background:#f5f5f5;color:#666;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;cursor:pointer;">${sanitizeNVCompose(t.regenBtn)}</button>
            </div>
          </div>
          <div id="mm-nv-fp-usage" style="text-align:right;font-size:10px;color:#bbb;margin-top:9px"></div>
        </div>
      </div>
    `;

    // 닫기
    panel.querySelector('#mm-nv-fp-close').addEventListener('click', () => { panel.style.display = 'none'; });

    // 탭 전환
    panel.querySelector('#mm-nv-fp-tab-compose').addEventListener('click', () => {
      if (curMode === 'compose') return;
      const saved = panel.querySelector('#mm-nv-fp-input')?.value || '';
      curMode = 'compose'; render();
      if (saved) panel.querySelector('#mm-nv-fp-input').value = saved;
    });
    panel.querySelector('#mm-nv-fp-tab-refine').addEventListener('click', () => {
      if (curMode === 'refine') return;
      const saved = panel.querySelector('#mm-nv-fp-input')?.value || '';
      curMode = 'refine'; render();
      if (saved) panel.querySelector('#mm-nv-fp-input').value = saved;
    });

    // 톤 드롭다운
    panel.querySelector('#mm-nv-fp-tone-trigger').addEventListener('click', e => {
      e.stopPropagation();
      toneDropOpen = !toneDropOpen; langDropOpen = false;
      panel.querySelector('#mm-nv-fp-tone-list').style.display = toneDropOpen ? 'block' : 'none';
      panel.querySelector('#mm-nv-fp-tone-arrow').style.transform = toneDropOpen ? 'rotate(180deg)' : '';
      panel.querySelector('#mm-nv-fp-lang-list').style.display = 'none';
      panel.querySelector('#mm-nv-fp-lang-arrow').style.transform = '';
    });
    panel.querySelectorAll('#mm-nv-fp-tone-list button').forEach(btn => {
      btn.addEventListener('click', () => {
        const saved = panel.querySelector('#mm-nv-fp-input')?.value || '';
        curTone = btn.dataset.val; toneDropOpen = false; render();
        if (saved) panel.querySelector('#mm-nv-fp-input').value = saved;
      });
    });

    // 언어 드롭다운
    panel.querySelector('#mm-nv-fp-lang-trigger').addEventListener('click', e => {
      e.stopPropagation();
      langDropOpen = !langDropOpen; toneDropOpen = false;
      panel.querySelector('#mm-nv-fp-lang-list').style.display = langDropOpen ? 'block' : 'none';
      panel.querySelector('#mm-nv-fp-lang-arrow').style.transform = langDropOpen ? 'rotate(180deg)' : '';
      panel.querySelector('#mm-nv-fp-tone-list').style.display = 'none';
      panel.querySelector('#mm-nv-fp-tone-arrow').style.transform = '';
    });
    panel.querySelectorAll('#mm-nv-fp-lang-list button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const saved = panel.querySelector('#mm-nv-fp-input')?.value || '';
        const _nvrVis = panel.querySelector('#mm-nv-fp-result')?.style.display;
        const _nvrSubj = panel.querySelector('#mm-nv-fp-subject')?.value;
        const _nvrOut = panel.querySelector('#mm-nv-fp-output')?.value;
        curLang = btn.dataset.val; panel.__curLang = btn.dataset.val; langDropOpen = false;
        render();
        if (saved) panel.querySelector('#mm-nv-fp-input').value = saved;
        _nvRestoreGen(_nvrSubj, _nvrOut, _nvrVis);
      });
    });

    // 번역 언어 드롭다운 트리거
    panel.querySelector('#mm-nv-fp-tl-trigger')?.addEventListener('click', e => {
      e.stopPropagation();
      transLangDropOpenNV = !transLangDropOpenNV;
      const list = panel.querySelector('#mm-nv-fp-tl-list');
      const arrow = panel.querySelector('#mm-nv-fp-tl-arrow');
      if (list) list.style.display = transLangDropOpenNV ? 'block' : 'none';
      if (arrow) arrow.style.transform = transLangDropOpenNV ? 'rotate(180deg)' : '';
    });

    // 번역 그리드 버튼
    panel.querySelectorAll('.mm-nv-fp-translate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetLang = btn.dataset.val;
        const outputEl = panel.querySelector('#mm-nv-fp-output');
        const existingOutput = outputEl?.value || '';

        const _closeDropNV = () => {
          transLangDropOpenNV = false;
          const list = panel.querySelector('#mm-nv-fp-tl-list');
          const arrow = panel.querySelector('#mm-nv-fp-tl-arrow');
          const trigger = panel.querySelector('#mm-nv-fp-tl-trigger');
          if (list) list.style.display = 'none';
          if (arrow) arrow.style.transform = '';
          if (trigger) {
            const selL = COMPOSE_LANGS_NV.find(l=>l.value===targetLang)||COMPOSE_LANGS_NV[0];
            trigger.innerHTML = `<span style="font-size:15px">${selL.flag}</span><span style="font-size:12px;color:#333;flex:1;text-align:left">${sanitizeNVCompose(selL.label)}</span><span id="mm-nv-fp-tl-arrow" style="font-size:10px;color:#999;transition:transform .15s;">▾</span>`;
          }
          panel.querySelectorAll('.mm-nv-fp-translate-btn').forEach(b => {
            b.style.background = b.dataset.val === targetLang ? '#fce4ec' : '#fff';
          });
        };

        const prevLangNV = nvTransLang;
        nvTransLang = targetLang; curOutputLang = targetLang;
        // 동일 언어 재탭 시 번역 스킵
        if (existingOutput && targetLang !== prevLangNV) {
          const origContent = btn.innerHTML;
          btn.innerHTML = '⏳'; btn.disabled = true;
          try {
            const subjectEl = panel.querySelector('#mm-nv-fp-subject');
            const existingSubject = subjectEl?.value?.trim() || '';
            const [bodyData, subjData] = await Promise.all([
              fetch(`${WORKER_URL_NV}/translate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: existingOutput, targetLanguage: targetLang })
              }).then(r => r.json()),
              existingSubject ? fetch(`${WORKER_URL_NV}/translate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: existingSubject, targetLanguage: targetLang })
              }).then(r => r.json()) : Promise.resolve(null)
            ]);
            if (bodyData.success && outputEl) outputEl.value = _stripSalutationNV(bodyData.translated || '');
            if (subjData?.success && subjectEl) subjectEl.value = subjData.translated || '';
          } catch(e) {}
          btn.innerHTML = origContent; btn.disabled = false;
          _closeDropNV();
        } else {
          _closeDropNV();
        }
      });
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', () => {
      let ch = false;
      if (toneDropOpen) { toneDropOpen = false; ch = true; }
      if (langDropOpen) { langDropOpen = false; ch = true; }
      if (transLangDropOpenNV) { transLangDropOpenNV = false; ch = true; }
      if (ch) {
        const tl = panel.querySelector('#mm-nv-fp-tone-list');
        const ll = panel.querySelector('#mm-nv-fp-lang-list');
        const xl = panel.querySelector('#mm-nv-fp-tl-list');
        const xa = panel.querySelector('#mm-nv-fp-tl-arrow');
        if (tl) tl.style.display = 'none';
        if (ll) ll.style.display = 'none';
        if (xl) xl.style.display = 'none';
        if (xa) xa.style.transform = '';
      }
    }, { capture: true });

    // 생성 버튼
    panel.querySelector('#mm-nv-fp-gen-btn').addEventListener('click', doNVGenerate);
    panel.querySelector('#mm-nv-fp-regen')?.addEventListener('click', doNVGenerate);
    panel.querySelector('#mm-nv-fp-compare')?.addEventListener('click', doNVFpCompare);

    panel.querySelector('#mm-nv-fp-restore')?.addEventListener('click', () => {
      const out = panel.querySelector('#mm-nv-fp-output');
      if (out && out.dataset.aiOriginal) {
        out.value = out.dataset.aiOriginal;
        panel.querySelector('#mm-nv-fp-restore').style.display = 'none';
      }
    });
    panel.querySelector('#mm-nv-fp-refine')?.addEventListener('click', async () => {
      const out = panel.querySelector('#mm-nv-fp-output');
      if (!out || !out.value.trim()) return;
      const refineBtn = panel.querySelector('#mm-nv-fp-refine');
      refineBtn.disabled = true; refineBtn.textContent = '...';
      try {
        const res = await chrome.runtime.sendMessage({ action:'refineReply', text: out.value });
        if (res?.result) {
          if (!out.dataset.aiOriginal) out.dataset.aiOriginal = out.value;
          out.value = res.result;
          panel.querySelector('#mm-nv-fp-restore').style.display = '';
        }
      } catch(e) {}
      refineBtn.disabled = false; refineBtn.textContent = '✨';
    });

    // Insert (클립보드 복사)
    panel.querySelector('#mm-nv-fp-insert')?.addEventListener('click', () => {
      const t2 = T();
      const subject = panel.querySelector('#mm-nv-fp-subject').value.trim();
      const bodyText = panel.querySelector('#mm-nv-fp-output').value;
      const pasteKey = (navigator.platform || navigator.userAgentData?.platform || '').toLowerCase().includes('mac') ? '⌘+V' : 'Ctrl+V';

      // Naver compose 창 직접 삽입 시도
      // 본문 필드: [role="textbox"] 우선, 그 다음 contenteditable
      const bodySelectors = [
        '[role="textbox"]',
        '[contenteditable="true"]:not([id*="mm-"])',
        'textarea[placeholder*="본문"]', 'textarea[placeholder*="Body"]',
        '.compose-body', '[data-testid*="body"]', '.message-body',
      ];

      function setInputVal(el, val) {
        const win = el.ownerDocument?.defaultView || window;
        const ns = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')?.set;
        if (ns) ns.call(el, val); else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // 본문 에디터가 있는 document를 먼저 찾고, 그 안에서 제목 input 탐색
      function findComposeDoc() {
        const PANEL_IDS = ['#mm-nv-float-panel', '#mm-float-panel'];
        const isOutsidePanel = el => { try { return !PANEL_IDS.some(s => el.closest(s)); } catch(e) { return true; } };
        if (Array.from(document.querySelectorAll('[contenteditable="true"]')).some(isOutsidePanel)) return document;
        for (const iframe of document.querySelectorAll('iframe')) {
          try {
            const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iDoc && iDoc.querySelector('[contenteditable="true"],textarea')) return iDoc;
          } catch(e) {}
        }
        return document;
      }
      function findSubjectInDoc(root) {
        const PANEL_IDS = ['#mm-nv-float-panel', '#mm-float-panel', '#mm-nv-compose-panel'];
        const SUBJ_SELS = [
          'input[name="subject"]','input[name="title"]','input#subject','input#title',
          'input[placeholder*="제목"]','input[placeholder*="Subject" i]',
          'input[aria-label*="제목"]','input[aria-label*="Subject" i]',
          'input[class*="subject" i]','input[class*="title" i]',
        ];
        for (const sel of SUBJ_SELS) {
          try {
            const el = root.querySelector(sel);
            if (!el) continue;
            try { if (PANEL_IDS.some(s => el.closest(s))) continue; } catch(e) {}
            const rect = el.getBoundingClientRect();
            if (rect.width > 80 && rect.height > 0) return el;
          } catch(e) {}
        }
        const inputs = Array.from(root.querySelectorAll('input[type="text"],input:not([type]),input[type=""]'));
        for (const el of inputs) {
          try { if (PANEL_IDS.some(s => el.closest(s))) continue; } catch(e) {}
          if (el.type && !['text','','search'].includes(el.type)) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width > 150 && rect.height > 0 && rect.height < 80) return el;
        }
        return null;
      }

      let inserted = false;

      // 제목 삽입: 본문 에디터를 먼저 찾고, 그 위에 있는 editable/input을 제목으로 간주
      if (subject) {
        const SUBJ_PANEL = ['#mm-nv-float-panel', '#mm-float-panel', '#mm-nv-compose-panel'];
        const isSubjPanel = el => { try { return SUBJ_PANEL.some(s => el.closest(s)); } catch(e) { return false; } };

        function findBodyEditorEl(root) {
          const all = [];
          try {
            all.push(...root.querySelectorAll('[contenteditable="true"],[role="textbox"],textarea'));
            root.querySelectorAll('*').forEach(el => {
              if (el.shadowRoot) all.push(...el.shadowRoot.querySelectorAll('[contenteditable="true"],[role="textbox"],textarea'));
            });
          } catch(e) {}
          const cands = all.filter(el => {
            try { if (el.closest('#mm-nv-float-panel') || el.closest('#mm-float-panel')) return false; } catch(e) {}
            return el.getBoundingClientRect().width > 50;
          });
          if (!cands.length) return null;
          cands.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
          return cands[0];
        }

        function findSubjectAboveBody(root, bodyEditor) {
          // 1. 속성 기반 특정 셀렉터
          const SUBJ_SELS = [
            'input[name="subject"]','input[name="title"]','input#subject','input#title',
            'input[placeholder*="제목"]','input[placeholder*="Subject" i]',
            'input[aria-label*="제목"]','input[aria-label*="Subject" i]',
            'input[class*="subject" i]','input[class*="title" i]',
            '[contenteditable][aria-label*="제목"]','[contenteditable][placeholder*="제목"]',
            '[role="textbox"][aria-label*="제목"]','[role="textbox"][aria-label*="Subject" i]',
          ];
          for (const sel of SUBJ_SELS) {
            try {
              const el = root.querySelector(sel);
              if (el && !isSubjPanel(el)) {
                const r = el.getBoundingClientRect();
                if (r.width > 80 && r.height > 0) return el;
              }
            } catch(e) {}
          }
          // 2. 위치 기반: 본문 에디터보다 위에 있는 모든 editable/input 중 가장 가까운 것
          const bodyRect = bodyEditor?.getBoundingClientRect();
          const els = [
            ...root.querySelectorAll('input[type="text"],input:not([type]),input[type=""]'),
            ...root.querySelectorAll('[contenteditable="true"],[role="textbox"]'),
          ];
          const cands = [];
          for (const el of els) {
            if (isSubjPanel(el)) continue;
            if (el === bodyEditor) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 100 || r.height <= 0 || r.height > 100) continue;
            if (bodyRect && r.top >= bodyRect.top) continue; // 본문 아래는 제외
            cands.push({ el, top: r.top });
          }
          if (!cands.length) return null;
          cands.sort((a, b) => b.top - a.top); // 본문에 가장 가까운 것 (top값 가장 큰 것)
          return cands[0].el;
        }

        function setSubjectVal(el, val) {
          el.focus();
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            const win = el.ownerDocument?.defaultView || window;
            const ns = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')?.set;
            if (ns) ns.call(el, val); else el.value = val;
          } else {
            // contenteditable / role="textbox"
            const ownerDoc = el.ownerDocument || document;
            const range = ownerDoc.createRange();
            range.selectNodeContents(el);
            const sel2 = ownerDoc.getSelection();
            if (sel2) { sel2.removeAllRanges(); sel2.addRange(range); }
            if (!ownerDoc.execCommand('insertText', false, val)) el.textContent = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function trySubjectInRoot(root) {
          const bodyEditor = findBodyEditorEl(root);
          const sEl = findSubjectAboveBody(root, bodyEditor);
          if (!sEl) return false;
          setSubjectVal(sEl, subject);
          return true;
        }

        let subjDone = trySubjectInRoot(document);
        if (!subjDone) {
          for (const iframe of document.querySelectorAll('iframe')) {
            try {
              const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (iDoc && trySubjectInRoot(iDoc)) { subjDone = true; break; }
            } catch(e) {}
          }
        }
      }

      // Shadow DOM 포함 모든 editable 요소 수집
      function getAllEditables(root) {
        const results = [];
        try {
          results.push(...root.querySelectorAll('[contenteditable="true"],[role="textbox"],textarea'));
          root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) results.push(...getAllEditables(el.shadowRoot));
          });
        } catch(e) {}
        return results;
      }

      // 요소에 텍스트 삽입 (execCommand → innerHTML 폴백)
      function insertIntoEl(el, text) {
        try { el.click(); } catch(e) {}
        el.focus();
        if (el.tagName === 'TEXTAREA') {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        const before = el.textContent;
        const ownerDoc = el.ownerDocument || document;
        const range = ownerDoc.createRange();
        range.selectNodeContents(el);
        const sel2 = ownerDoc.getSelection();
        if (sel2) { sel2.removeAllRanges(); sel2.addRange(range); }
        ownerDoc.execCommand('insertText', false, text);
        if (el.textContent !== before || el.textContent.trim() === text.trim()) return true;
        // execCommand 실패 → innerHTML 폴백
        el.innerHTML = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return el.textContent.trim().length > 0;
      }

      // compose body 찾기: Shadow DOM 포함 수집 → 패널 제외 → 위치 기준 정렬(가장 아래 = body)
      function tryInsertInRoot(root) {
        const all = getAllEditables(root);
        const candidates = all.filter(el => {
          try { if (el.closest('#mm-nv-float-panel') || el.closest('#mm-float-panel')) return false; } catch(e) {}
          const rect = el.getBoundingClientRect();
          return rect.width > 50; // 화면에 실제로 존재하는 요소만
        });
        if (!candidates.length) return false;
        // 페이지에서 가장 아래쪽에 위치한 요소 = compose body
        candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
        for (const el of candidates) {
          if (insertIntoEl(el, bodyText)) return true;
        }
        return false;
      }

      // 1차: 메인 document (Shadow DOM 포함)
      inserted = tryInsertInRoot(document);

      // 2차: iframe (cross-origin 제외)
      if (!inserted) {
        for (const iframe of document.querySelectorAll('iframe')) {
          try {
            const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iDoc && tryInsertInRoot(iDoc)) { inserted = true; break; }
          } catch(e) {}
        }
      }

      if (inserted) {
        showToastNV('✦ 네이버 작성창에 삽입했습니다!', 'success');
      } else {
        // 폴백: 클립보드 복사 + OS별 안내
        const full = subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
        navigator.clipboard.writeText(full).then(() => {
          const msg = (t2.successInsert || `복사됐어요! 작성창에서 ${pasteKey}로 붙여넣으세요.`).replace('⌘+V', pasteKey);
          showToastNV(msg, 'success');
        }).catch(() => showToastNV(t2.errNoBody, 'info'));
      }
    });

    // Copy
    panel.querySelector('#mm-nv-fp-copy')?.addEventListener('click', () => {
      const t2 = T();
      const subject = panel.querySelector('#mm-nv-fp-subject').value.trim();
      const bodyText = panel.querySelector('#mm-nv-fp-output').value;
      const full = subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
      navigator.clipboard.writeText(full).then(() => showToastNV(t2.successCopy, 'success'));
    });

    // usageText 업데이트
    getUserDataNV().then(ud => {
      const usageEl = panel.querySelector('#mm-nv-fp-usage');
      if (usageEl) {
        const left = Math.max(0, ud.monthlyLimit - ud.monthlyCount);
        usageEl.textContent = T().usageText(left, ud.monthlyLimit);
      }
    });
  }

  async function doNVGenerate() {
    const t2 = T();
    const input = panel.querySelector('#mm-nv-fp-input')?.value.trim();
    if (!input) { showToastNV(t2.errEmpty, 'error'); return; }
    const ud = await getUserDataNV();
    if (!ud.userEmail) { showToastNV(t2.errLogin, 'error'); return; }
    const left = Math.max(0, ud.monthlyLimit - ud.monthlyCount);
    if (left <= 0) { showToastNV(t2.errLimit, 'error'); return; }

    const genBtn = panel.querySelector('#mm-nv-fp-gen-btn');
    genBtn.textContent = t2.generatingText; genBtn.disabled = true;
    panel.querySelector('#mm-nv-fp-result').style.display = 'none';
    _nvFpVersions = []; _nvFpCurrentVerIdx = 0;
    const _verTabsReset = panel.querySelector('#mm-nv-fp-ver-tabs');
    if (_verTabsReset) { _verTabsReset.style.display = 'none'; _verTabsReset.innerHTML = ''; }

    const endpoint = curMode === 'compose' ? '/generate-compose' : '/refine-compose';
    const body = curMode === 'compose'
      ? { prompt: input, tone: curTone, myLanguage: curOutputLang, email: ud.userEmail, country: nvSelectedCountry, clientDate: new Date().toISOString(), ...(userInfo ? { userInfo } : {}), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) }
      : { draft: input, tone: curTone, myLanguage: curOutputLang, email: ud.userEmail, country: nvSelectedCountry, clientDate: new Date().toISOString(), ...(userInfo ? { userInfo } : {}), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) };

    try {
      const res = await fetch(`${WORKER_URL_NV}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        panel.querySelector('#mm-nv-fp-subject').value = data.subject || '';
        panel.querySelector('#mm-nv-fp-output').value = _stripSalutationNV(data.body || data.reply || '');
        panel.querySelector('#mm-nv-fp-result').style.display = 'block';
        const usedNow = data.monthlyUsage ?? (ud.monthlyCount + 1);
        const lim = data.monthlyLimit ?? ud.monthlyLimit;
        const leftNow = Math.max(0, lim - usedNow);
        const usageEl = panel.querySelector('#mm-nv-fp-usage');
        if (usageEl) usageEl.textContent = t2.usageText(leftNow, lim);
        await incrementUsageNV(usedNow);
      } else if (data.error === 'MONTHLY_LIMIT') {
        showToastNV(t2.errLimit, 'error');
      } else {
        showToastNV(t2.errFail, 'error');
      }
    } catch(e) { showToastNV(t2.errFail, 'error'); }

    genBtn.textContent = t2[curMode === 'compose' ? 'composeBtn' : 'refineBtn'];
    genBtn.disabled = false;
  }

  async function doNVFpCompare() {
    const t2 = T();
    const input = panel.querySelector('#mm-nv-fp-input')?.value.trim();
    if (!input) { showToastNV(t2.errEmpty, 'error'); return; }
    const ud = await getUserDataNV();
    if (!ud.userEmail) { showToastNV(t2.errLogin, 'error'); return; }
    const left = Math.max(0, ud.monthlyLimit - ud.monthlyCount);
    if (left < 3) { showToastNV(t2.errLimit, 'error'); return; }
    const compareBtn = panel.querySelector('#mm-nv-fp-compare');
    if (compareBtn) { compareBtn.textContent = '⏳'; compareBtn.disabled = true; }
    panel.querySelector('#mm-nv-fp-result').style.display = 'none';
    const verTabs = panel.querySelector('#mm-nv-fp-ver-tabs');
    if (verTabs) { verTabs.style.display = 'none'; verTabs.innerHTML = ''; }
    const tonePicks = [curTone, 'professional', 'friendly', 'concise'].filter((v,i,a) => a.indexOf(v) === i).slice(0, 3);
    const reqs = tonePicks.map(tone =>
      fetch(`${WORKER_URL_NV}/generate-compose`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ prompt: input, tone, myLanguage: curOutputLang, email: ud.userEmail, country: nvSelectedCountry, clientDate: new Date().toISOString(), ...(userInfo ? {userInfo} : {}), ...(ud.businessCard ? { businessCard: ud.businessCard } : {}), ...(ud.phrases?.length ? { phrases: ud.phrases } : {}) })
      }).then(r => r.json()).catch(() => ({ success: false }))
    );
    try {
      const results = await Promise.all(reqs);
      _nvFpVersions = results.map((d, i) => ({ subject: d.subject||'', body: _stripSalutationNV(d.body||d.reply||''), tone: tonePicks[i] })).filter(v => v.body);
      if (_nvFpVersions.length === 0) { showToastNV(t2.errFail, 'error'); return; }
      _nvFpCurrentVerIdx = 0;
      panel.querySelector('#mm-nv-fp-subject').value = _nvFpVersions[0].subject;
      panel.querySelector('#mm-nv-fp-output').value = _nvFpVersions[0].body;
      panel.querySelector('#mm-nv-fp-result').style.display = 'block';
      if (verTabs && _nvFpVersions.length > 1) {
        verTabs.style.display = 'flex';
        const _fpTlNV = panel.querySelector('#mm-nv-fp-tl-trigger')?.parentElement;
        if (_fpTlNV) { _fpTlNV.style.pointerEvents = 'none'; _fpTlNV.style.opacity = '0.4'; }
        verTabs.innerHTML = _nvFpVersions.map((v, i) =>
          `<button class="mm-nv-fp-ver-btn" data-idx="${i}" style="font-size:11px;padding:4px 12px;border:1px solid ${i===0?'#e91e8c':'#dadce0'};border-radius:20px;background:${i===0?'#fce4ec':'#fff'};color:${i===0?'#e91e8c':'#5f6368'};cursor:pointer;font-family:inherit;">${toneLabelNV(v.tone)}</button>`
        ).join('') + `<button id="mm-nv-fp-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-family:inherit;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
        verTabs.querySelectorAll('.mm-nv-fp-ver-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            _nvFpCurrentVerIdx = parseInt(btn.dataset.idx);
            panel.querySelector('#mm-nv-fp-subject').value = _nvFpVersions[_nvFpCurrentVerIdx].subject;
            panel.querySelector('#mm-nv-fp-output').value = _nvFpVersions[_nvFpCurrentVerIdx].body;
            verTabs.querySelectorAll('.mm-nv-fp-ver-btn').forEach((b, j) => {
              b.style.border = `1px solid ${j===_nvFpCurrentVerIdx?'#e91e8c':'#dadce0'}`;
              b.style.background = j===_nvFpCurrentVerIdx ? '#fce4ec' : '#fff';
              b.style.color = j===_nvFpCurrentVerIdx ? '#e91e8c' : '#5f6368';
            });
          });
        });
        verTabs.querySelector('#mm-nv-fp-ver-confirm')?.addEventListener('click', () => {
          _nvFpVersions = [];
          _nvFpCurrentVerIdx = 0;
          verTabs.style.display = 'none';
          verTabs.innerHTML = '';
          const _fpTlRestNV = panel.querySelector('#mm-nv-fp-tl-trigger')?.parentElement;
          if (_fpTlRestNV) { _fpTlRestNV.style.pointerEvents = ''; _fpTlRestNV.style.opacity = ''; }
        });
      }
      await incrementUsageNV((ud.monthlyCount || 0) + _nvFpVersions.length);
    } catch(e) { showToastNV(t2.errFail, 'error'); }
    if (compareBtn) { compareBtn.textContent = COMPARE_BTN_LABELS_NV[curLang]||'🔀 비교 3종'; compareBtn.disabled = false; }
  }

  function _nvRestoreGen(savedSubj, savedOut, savedResVis) {
    if (savedResVis !== 'block') return;
    const _r = panel.querySelector('#mm-nv-fp-result');
    if (_r) _r.style.display = 'block';
    const _sj = panel.querySelector('#mm-nv-fp-subject');
    if (_sj !== null) _sj.value = savedSubj || '';
    const _op = panel.querySelector('#mm-nv-fp-output');
    if (_op !== null) _op.value = savedOut || '';
    if (_nvFpVersions.length > 1) {
      const _vt = panel.querySelector('#mm-nv-fp-ver-tabs');
      if (_vt) {
        _vt.style.display = 'flex';
        const _fpTlRstNV = panel.querySelector('#mm-nv-fp-tl-trigger')?.parentElement;
        if (_fpTlRstNV) { _fpTlRstNV.style.pointerEvents = 'none'; _fpTlRstNV.style.opacity = '0.4'; }
        _vt.innerHTML = _nvFpVersions.map((v, i) =>
          `<button class="mm-nv-fp-ver-btn" data-idx="${i}" style="font-size:11px;padding:4px 12px;border:1px solid ${i===_nvFpCurrentVerIdx?'#e91e8c':'#dadce0'};border-radius:20px;background:${i===_nvFpCurrentVerIdx?'#fce4ec':'#fff'};color:${i===_nvFpCurrentVerIdx?'#e91e8c':'#5f6368'};cursor:pointer;font-family:inherit;">${toneLabelNV(v.tone)}</button>`
        ).join('') + `<button id="mm-nv-fp-ver-confirm" style="font-size:11px;padding:4px 14px;border:1.5px solid #4caf50;border-radius:20px;background:#e8f5e9;color:#2e7d32;cursor:pointer;font-family:inherit;font-weight:700;margin-left:4px;">✓ 이 버전 선택</button>`;
        _vt.querySelectorAll('.mm-nv-fp-ver-btn').forEach(vBtn => {
          vBtn.addEventListener('click', () => {
            _nvFpCurrentVerIdx = parseInt(vBtn.dataset.idx);
            const sj = panel.querySelector('#mm-nv-fp-subject');
            const op = panel.querySelector('#mm-nv-fp-output');
            if (sj) sj.value = _nvFpVersions[_nvFpCurrentVerIdx].subject;
            if (op) op.value = _nvFpVersions[_nvFpCurrentVerIdx].body;
            _vt.querySelectorAll('.mm-nv-fp-ver-btn').forEach((b, j) => {
              b.style.border = `1px solid ${j===_nvFpCurrentVerIdx?'#e91e8c':'#dadce0'}`;
              b.style.background = j===_nvFpCurrentVerIdx ? '#fce4ec' : '#fff';
              b.style.color = j===_nvFpCurrentVerIdx ? '#e91e8c' : '#5f6368';
            });
          });
        });
        _vt.querySelector('#mm-nv-fp-ver-confirm')?.addEventListener('click', () => {
          _nvFpVersions = []; _nvFpCurrentVerIdx = 0;
          _vt.style.display = 'none'; _vt.innerHTML = '';
          const _fpTlRNV = panel.querySelector('#mm-nv-fp-tl-trigger')?.parentElement;
          if (_fpTlRNV) { _fpTlRNV.style.pointerEvents = ''; _fpTlRNV.style.opacity = ''; }
        });
      }
    }
  }

  panel.__updateLang = (lang) => {
    if (VALID_COMPOSE_LANGS_NV.includes(lang)) {
      const _nvrVis = panel.querySelector('#mm-nv-fp-result')?.style.display;
      const _nvrSubj = panel.querySelector('#mm-nv-fp-subject')?.value;
      const _nvrOut = panel.querySelector('#mm-nv-fp-output')?.value;
      curOutputLang = lang; curLang = lang; panel.__curLang = lang; render();
      _nvRestoreGen(_nvrSubj, _nvrOut, _nvrVis);
    }
  };
  panel.__curLang = curLang;
  render();
}

function openNVComposePanel() {
  createNVFloatPanel();
  openNVFloatPanel();
}

// ===== Naver Mail SPA: 이메일 선택 감지 =====
// Naver Mail은 URL이 바뀌지 않고 DOM 변화로 이메일 전환됨
// → 패널이 열려있으면 새 이메일 선택 시 상태 업데이트
let _nvLastEmailText = '';
function checkEmailChangeNV() {
  if (!nvCurrentPanel) return;
  const currentText = getNaverEmailThread() || '';
  if (currentText && currentText !== _nvLastEmailText) {
    _nvLastEmailText = currentText;
    // 패널 상태 리셋 (새 이메일)
    const statusEl = nvCurrentPanel.querySelector('#mm-nv-email-status');
    if (statusEl) statusEl.style.display = 'none';
    const resultEl = nvCurrentPanel.querySelector('#mm-nv-result');
    if (resultEl) resultEl.style.display = 'none';
    const summaryEl = nvCurrentPanel.querySelector('#mm-nv-thread-summary');
    if (summaryEl) summaryEl.style.display = 'none';
    const translatedEl = nvCurrentPanel.querySelector('#mm-nv-email-translated');
    if (translatedEl) translatedEl.style.display = 'none';
    // 감정 분석 업데이트
    const { emotion, urgency } = detectEmotionNV(currentText);
    nvCachedEmotion = emotion;
    nvCachedUrgency = urgency;
    const ui2 = getUILangNV(nvSelectedMyLang);
    const emotionBar = nvCurrentPanel.querySelector('#mm-nv-emotion-bar');
    const emotionBadge = nvCurrentPanel.querySelector('#mm-nv-emotion-badge');
    const urgencyBadge = nvCurrentPanel.querySelector('#mm-nv-urgency-badge');
    if (emotionBar) {
      if (emotion !== 'neutral' || urgency !== 'low') {
        emotionBar.style.display = 'flex';
        if (emotionBadge && emotion !== 'neutral') emotionBadge.textContent = ui2.emotion[emotion] || '';
        if (urgencyBadge && urgency !== 'low') urgencyBadge.textContent = ui2.urgency[urgency] || '';
      } else {
        emotionBar.style.display = 'none';
      }
    }
    detectAndShowInfoNV(currentText, nvSelectedMyLang);
  }
}

// ===== Observer to detect Naver Mail load =====
function initMailMindNV() {
  let fabCreated = false;

  const tryCreateFab = () => {
    if (fabCreated) return;
    // Mail UI가 로드됐는지 확인 (mail app 뼈대)
    if (isMailUIReadyNV()) {
      createNVFab();
      fabCreated = true;
    }
  };

  tryCreateFab();

  // v2 폴백: 5초 후에도 FAB 미생성이면 강제 생성
  setTimeout(() => {
    if (!fabCreated || !document.getElementById('mm-nv-fab')) {
      fabCreated = false;
      createNVFab();
      fabCreated = true;
    }
  }, 5000);

  // Gmail watchCompose()와 동일: 작성창 감지 → 툴바 버튼 주입
  watchNVCompose();

  // MutationObserver: DOM 변화 감지
  // 1) FAB 생성용 (메일 UI 로드 감지)
  // 2) 이메일 선택 변화 감지 (패널이 열려있을 때)
  let checkEmailTimer = null;
  const observer = new MutationObserver(() => {
    // FAB 아직 없으면 생성 시도
    if (!fabCreated || !document.getElementById('mm-nv-fab')) {
      fabCreated = false;
      tryCreateFab();
    }

    // 이메일 변경 감지 (디바운스 300ms)
    if (nvCurrentPanel && nvCurrentPanel.style.display !== 'none') {
      clearTimeout(checkEmailTimer);
      checkEmailTimer = setTimeout(checkEmailChangeNV, 300);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ===== Entry Point =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMailMindNV);
} else {
  initMailMindNV();
}
