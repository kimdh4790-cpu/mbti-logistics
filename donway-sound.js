// ══════════════════════════════════════
// ██ DONWAY 알림 사운드 시스템 ██
// ══════════════════════════════════════

var _DONWAY_SOUND = {
  _ctx: null,
  _enabled: true,
  _vol: 0.7,
  _voice: null,

  // AudioContext 초기화
  _initCtx: function(){
    if(this._ctx) return this._ctx;
    try{
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }catch(e){}
    return this._ctx;
  },

  // 볼륨 설정
  setVolume: function(v){ this._vol = Math.max(0, Math.min(1, v)); },

  // ON/OFF
  setEnabled: function(v){ this._enabled = !!v; },

  // ── 차임 사운드 (DONWAY 특유의 음색) ──
  chime: function(){
    if(!this._enabled) return;
    var ctx = this._initCtx();
    if(!ctx) return;
    var notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    var delays = [0, 0.12, 0.24, 0.36];
    notes.forEach(function(freq, i){
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delays[i]);
      gain.gain.setValueAtTime(0, ctx.currentTime + delays[i]);
      gain.gain.linearRampToValueAtTime(_DONWAY_SOUND._vol * 0.3, ctx.currentTime + delays[i] + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delays[i] + 0.4);
      osc.start(ctx.currentTime + delays[i]);
      osc.stop(ctx.currentTime + delays[i] + 0.4);
    });
  },

  // ── 성공 사운드 ──
  success: function(){
    if(!this._enabled) return;
    var ctx = this._initCtx();
    if(!ctx) return;
    var freqs = [440, 554, 659, 880];
    freqs.forEach(function(freq, i){
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(_DONWAY_SOUND._vol * 0.25, ctx.currentTime + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.35);
    });
  },

  // ── 경고 사운드 ──
  warning: function(){
    if(!this._enabled) return;
    var ctx = this._initCtx();
    if(!ctx) return;
    [0, 0.2].forEach(function(delay){
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(_DONWAY_SOUND._vol * 0.15, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
  },

  // ── TTS로 "DONWAY" 또는 메시지 읽기 ──
  speak: function(text, afterChime){
    if(!this._enabled) return;
    if(!window.speechSynthesis) return;
    var say = function(){
      var utt = new SpeechSynthesisUtterance(text || '돈웨이');
      utt.lang = 'ko-KR';
      utt.rate = 1.0;
      utt.pitch = 1.1;
      utt.volume = _DONWAY_SOUND._vol;
      // 한국어 음성 찾기
      var voices = window.speechSynthesis.getVoices();
      var koVoice = voices.find(function(v){ return v.lang.startsWith('ko'); });
      if(koVoice) utt.voice = koVoice;
      window.speechSynthesis.speak(utt);
    };
    if(afterChime){
      setTimeout(say, 600); // 차임 후 음성
    } else {
      say();
    }
  },

  // ── 메인: 차임 + "돈웨이" TTS ──
  donway: function(msg){
    if(!this._enabled) return;
    this.chime();
    var text = msg ? ('돈웨이. ' + msg) : '돈웨이';
    this.speak(text, true);
  },

  // ── 출퇴근 완료 ──
  attendance: function(type, name){
    if(!this._enabled) return;
    this.success();
    var msg = (name || '') + (type === 'in' ? ' 출근.' : ' 퇴근.');
    this.speak(msg, true);
  },

  // ── 공지 알림 ──
  notice: function(title){
    if(!this._enabled) return;
    this.chime();
    this.speak('새 공지. ' + (title || ''), true);
  }
};

// 음성 목록 미리 로드 (브라우저 초기화)
if(window.speechSynthesis){
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function(){
    window.speechSynthesis.getVoices();
  };
}
