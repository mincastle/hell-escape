import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════
//  직장 헬게이트 탈출 v3.0 — WEAPON EDITION
// ═══════════════════════════════════════════════════

const VILLAIN_PRESETS = [
  { emoji: "😤", label: "꼰대 상사" },
  { emoji: "🐍", label: "뒤통수 동료" },
  { emoji: "📢", label: "무한 잔소리" },
  { emoji: "💼", label: "야근 강요러" },
  { emoji: "🙄", label: "책임 전가러" },
];

// ── 무기 정의 ──────────────────────────────────────
const WEAPONS = [
  {
    id: "fist",
    emoji: "👊",
    label: "주먹",
    damageMin: 4, damageMax: 11, comboBonus: 1.5,
    hitWords: ["퍽!!", "쾅!!", "받아랏!", "왜이래?!", "야근싫어!", "BOOM!!", "OUT!", "꺼져!"],
    shockwaveColor: "#ff4d6d",
    flashBg: "radial-gradient(ellipse at center,#3a0010 0%,#060610 60%)",
    vibration: [20], comboVibration: [30, 10, 30],
  },
  {
    id: "hammer",
    emoji: "🔨",
    label: "망치",
    damageMin: 8, damageMax: 18, comboBonus: 2,
    hitWords: ["쾅!!!", "박살!", "뼈가!", "으드득!", "작살!", "으스러져!", "뭉개져!"],
    shockwaveColor: "#ffcc00",
    flashBg: "radial-gradient(ellipse at center,#2a1500 0%,#060610 60%)",
    vibration: [50, 20, 30], comboVibration: [80, 20, 60, 20, 40],
  },
  {
    id: "knife",
    emoji: "🔪",
    label: "칼",
    damageMin: 3, damageMax: 7, comboBonus: 1, multiHit: 3,
    hitWords: ["스읏!", "찌릿!", "베었다!", "피다!", "살점!", "아리다!", "째져!"],
    shockwaveColor: "#ff4d6d",
    flashBg: "radial-gradient(ellipse at center,#3a0010 0%,#060610 60%)",
    vibration: [10, 10, 10], comboVibration: [15, 8, 15, 8, 15],
  },
  {
    id: "gun",
    emoji: "🔫",
    label: "총",
    damageMin: 10, damageMax: 20, comboBonus: 0.5,
    hitWords: ["빵야!", "탕!!", "구멍!", "저격!", "헤드샷!", "빵!!", "터졌다!"],
    shockwaveColor: "#e8e8e8",
    flashBg: "radial-gradient(ellipse at center,#0a0a1a 0%,#060610 60%)",
    vibration: [15], comboVibration: [20, 10, 20],
  },
  {
    id: "fire",
    emoji: "🔥",
    label: "불",
    damageMin: 5, damageMax: 10, comboBonus: 3,
    hitWords: ["활활!", "타올라!", "불이야!", "재가돼라!", "뜨겁지?!", "타버려!", "불꽃!"],
    shockwaveColor: "#ff9500",
    flashBg: "radial-gradient(ellipse at center,#2a1000 0%,#060610 60%)",
    vibration: [30, 10, 20, 10], comboVibration: [40, 15, 30, 15, 20],
  },
];

const PARTICLE_COLORS = ["#ff4d6d", "#ff9500", "#ffcc00", "#06d6a0", "#38bdf8", "#f472b6", "#a78bfa"];

// ── Web Audio Engine ──────────────────────────────
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.bgGain = null;
    this.sfxGain = null;
    this.bgOscillators = [];
    this.enabled = true;
  }
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.bgGain = this.ctx.createGain(); this.bgGain.gain.value = 0.12;
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.4;
    this.bgGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
  }
  startBGM() {
    if (!this.ctx || !this.enabled) return;
    this.stopBGM();
    const bassNotes = [55, 55, 58, 55, 50, 52, 55, 53];
    let step = 0;
    const playBeat = () => {
      if (!this.enabled) return;
      const now = this.ctx.currentTime;
      const freq = 440 * Math.pow(2, (bassNotes[step % bassNotes.length] - 69) / 12);
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "sawtooth"; osc.frequency.value = freq;
      env.gain.setValueAtTime(0.3, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(env); env.connect(this.bgGain);
      osc.start(now); osc.stop(now + 0.2);
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = this.ctx.createBufferSource();
      const hg = this.ctx.createGain(); hg.gain.value = 0.08;
      src.buffer = buf; src.connect(hg); hg.connect(this.bgGain); src.start(now);
      step++;
    };
    this._beatInterval = setInterval(playBeat, 220);
  }
  stopBGM() { clearInterval(this._beatInterval); }

  // 기본 주먹 타격음
  playHit(combo = 1) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const baseFreq = 180 + Math.min(combo * 30, 300);
    [0, 0.04, 0.08].forEach((t, i) => {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = i === 2 ? "square" : "sawtooth";
      osc.frequency.setValueAtTime(baseFreq * (1 + i * 0.5), now + t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + t + 0.15);
      env.gain.setValueAtTime(0.5, now + t);
      env.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18);
      osc.connect(env); env.connect(this.sfxGain);
      osc.start(now + t); osc.stop(now + t + 0.2);
    });
  }

  // 무기별 타격음 디스패처
  playHitWeapon(weaponId, combo = 1) {
    if (!this.ctx || !this.enabled) return;
    switch (weaponId) {
      case "hammer": this._playHammer(combo); break;
      case "knife":  this._playKnife(combo);  break;
      case "gun":    this._playGun(combo);    break;
      case "fire":   this._playFire(combo);   break;
      default:       this.playHit(combo);     break;
    }
  }

  _playHammer(combo) {
    const now = this.ctx.currentTime;
    const freq = 80 + Math.min(combo * 10, 100);
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq * 2.5, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + 0.3);
    env.gain.setValueAtTime(0.7, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(env); env.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.4);
    // 충격 노이즈
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = this.ctx.createBufferSource();
    const ng = this.ctx.createGain(); ng.gain.value = 0.45;
    src.buffer = buf; src.connect(ng); ng.connect(this.sfxGain); src.start(now);
  }

  _playKnife(combo) {
    const now = this.ctx.currentTime;
    const baseFreq = 800 + Math.min(combo * 50, 400);
    [0, 0.025, 0.05].forEach((t) => {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(baseFreq, now + t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + t + 0.09);
      env.gain.setValueAtTime(0.35, now + t);
      env.gain.exponentialRampToValueAtTime(0.001, now + t + 0.1);
      osc.connect(env); env.connect(this.sfxGain);
      osc.start(now + t); osc.stop(now + t + 0.12);
    });
  }

  _playGun(combo) {
    const now = this.ctx.currentTime;
    // 임펄스 노이즈 (총성)
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
    const src = this.ctx.createBufferSource();
    const ng = this.ctx.createGain(); ng.gain.value = 0.65;
    src.buffer = buf; src.connect(ng); ng.connect(this.sfxGain); src.start(now);
    // 클릭 톤
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "square"; osc.frequency.value = 180 + combo * 10;
    env.gain.setValueAtTime(0.4, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(env); env.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.06);
  }

  _playFire(combo) {
    const now = this.ctx.currentTime;
    const dur = 0.15 + Math.min(combo * 0.02, 0.12);
    // 치직 노이즈
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.6;
    const src = this.ctx.createBufferSource();
    const ng = this.ctx.createGain(); ng.gain.value = 0.5;
    src.buffer = buf; src.connect(ng); ng.connect(this.sfxGain); src.start(now);
    // 휘이익
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(350 + combo * 20, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + dur);
    env.gain.setValueAtTime(0.25, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(env); env.connect(this.sfxGain);
    osc.start(now); osc.stop(now + dur + 0.05);
  }

  playUltimate() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800 - i * 80, now + i * 0.06);
      osc.frequency.exponentialRampToValueAtTime(100, now + i * 0.06 + 0.4);
      env.gain.setValueAtTime(0.6, now + i * 0.06);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.45);
      osc.connect(env); env.connect(this.sfxGain);
      osc.start(now + i * 0.06); osc.stop(now + i * 0.06 + 0.5);
    }
  }
  playDefeat() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.frequency.value = f; osc.type = "triangle";
      env.gain.setValueAtTime(0.4, now + i * 0.1);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(env); env.connect(this.sfxGain);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.35);
    });
  }
  setEnabled(v) { this.enabled = v; if (!v) this.stopBGM(); }
}
const audioEngine = new AudioEngine();

// ── Vibration ─────────────────────────────────────
const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// ── Leaderboard (localStorage) ────────────────────
const LB_KEY = "hellgate_leaderboard_v3";
const getLeaderboard = () => { try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch { return []; } };
const saveScore = (entry) => {
  const lb = getLeaderboard();
  lb.push(entry);
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(LB_KEY, JSON.stringify(lb.slice(0, 10)));
};
const calcScore = (hits, maxCombo, villainCount, stressRelief) =>
  hits * 10 + maxCombo * 50 + villainCount * 200 + stressRelief * 5;

// ── Components ────────────────────────────────────
function FloatingText({ x, y, text, color }) {
  return (
    <div style={{
      position: "fixed", left: x, top: y, color, fontWeight: 900,
      fontSize: Math.random() > 0.6 ? "1.3rem" : "0.95rem",
      fontFamily: "'Black Han Sans', sans-serif", pointerEvents: "none",
      zIndex: 9999, animation: "floatUp 0.85s ease-out forwards",
      textShadow: `0 0 12px ${color}88`, whiteSpace: "nowrap",
      transform: `rotate(${(Math.random() - 0.5) * 28}deg)`,
    }}>{text}</div>
  );
}

function Shockwave({ x, y, big, color }) {
  const c = color || (big ? "#ffcc00" : "#ff4d6d");
  return (
    <div style={{
      position: "fixed", left: x - (big ? 100 : 60), top: y - (big ? 100 : 60),
      width: big ? 200 : 120, height: big ? 200 : 120, borderRadius: "50%",
      border: `${big ? 4 : 2}px solid ${c}`,
      pointerEvents: "none", zIndex: 9998,
      animation: `shockwave ${big ? "0.7" : "0.45"}s ease-out forwards`,
    }} />
  );
}

// ════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [villainName, setVillainName] = useState("");
  const [villainTrait, setVillainTrait] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customVillains, setCustomVillains] = useState([]);
  const [selectedWeaponId, setSelectedWeaponId] = useState("fist");

  // game state
  const [villainList, setVillainList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentVillain, setCurrentVillain] = useState(null);
  const [activeWeapon, setActiveWeapon] = useState(WEAPONS[0]);
  const [hp, setHp] = useState(100);
  const [stress, setStress] = useState(100);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [skillGauge, setSkillGauge] = useState(0);
  const [ultimateReady, setUltimateReady] = useState(false);
  const [particles, setParticles] = useState([]);
  const [shockwaves, setShockwaves] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [villainEmotion, setVillainEmotion] = useState("😤");
  const [bgFlash, setBgFlash] = useState(false);
  const [defeated, setDefeated] = useState(false);
  const [ultimateAnim, setUltimateAnim] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLB, setShowLB] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const comboTimerRef = useRef(null);
  const pidRef = useRef(0);
  const sidRef = useRef(0);
  const activeWeaponRef = useRef(WEAPONS[0]);

  const hpPct = (hp / 100) * 100;
  const skillPct = skillGauge;

  useEffect(() => {
    audioEngine.setEnabled(soundOn);
  }, [soundOn]);

  // activeWeapon ref를 항상 최신 값으로 유지
  useEffect(() => {
    activeWeaponRef.current = activeWeapon;
  }, [activeWeapon]);

  const loadVillain = (v) => {
    setCurrentVillain(v); setHp(100); setCombo(0);
    setDefeated(false); setVillainEmotion(v.emoji); setSkillGauge(0); setUltimateReady(false);
  };

  const startGame = () => {
    if (customVillains.length === 0) return;
    const weapon = WEAPONS.find(w => w.id === selectedWeaponId) || WEAPONS[0];
    audioEngine.init();
    audioEngine.startBGM();
    setActiveWeapon(weapon);
    activeWeaponRef.current = weapon;
    setVillainList(customVillains); setCurrentIndex(0);
    loadVillain(customVillains[0]);
    setStress(100); setTotalHits(0); setMaxCombo(0);
    setScreen("game");
  };

  const addParticle = (x, y, text, color) => {
    const id = ++pidRef.current;
    setParticles(p => [...p, { id, x: x + (Math.random() - 0.5) * 100, y: y - 20 + (Math.random() - 0.5) * 50, text, color }]);
    setTimeout(() => setParticles(p => p.filter(i => i.id !== id)), 900);
  };

  const addShockwave = (x, y, big = false, color) => {
    const id = ++sidRef.current;
    setShockwaves(p => [...p, { id, x, y, big, color }]);
    setTimeout(() => setShockwaves(p => p.filter(i => i.id !== id)), 700);
  };

  const handleHit = useCallback((e) => {
    if (defeated) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) ?? rect.left + rect.width / 2;
    const y = (e.clientY || e.touches?.[0]?.clientY) ?? rect.top + rect.height / 2;

    const weapon = activeWeaponRef.current;

    const newCombo = combo + 1;
    setCombo(newCombo);
    setMaxCombo(m => Math.max(m, newCombo));
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => setCombo(0), 1600);

    // 무기별 데미지 계산
    const hits = weapon.multiHit || 1;
    const baseDmg = Math.floor(Math.random() * (weapon.damageMax - weapon.damageMin + 1) + weapon.damageMin);
    const comboDmg = newCombo > 5 ? Math.floor(newCombo * weapon.comboBonus) : 0;
    const dmg = (baseDmg + comboDmg) * hits;

    const newHp = Math.max(0, hp - dmg);
    setHp(newHp);
    setTotalHits(h => h + 1);
    setStress(s => Math.max(0, s - Math.floor(Math.random() * 4 + 2)));

    setSkillGauge(g => {
      const ng = Math.min(100, g + (newCombo > 3 ? 8 : 5));
      if (ng >= 100) setUltimateReady(true);
      return ng;
    });

    audioEngine.playHitWeapon(weapon.id, newCombo);
    vibrate(newCombo > 5 ? weapon.comboVibration : weapon.vibration);

    const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    const word = newCombo > 7
      ? `${newCombo} COMBO!!`
      : weapon.hitWords[Math.floor(Math.random() * weapon.hitWords.length)];
    addParticle(x, y, word, color);

    // 칼: 다단 타격 시 추가 파티클 2개
    if (weapon.id === "knife" && hits > 1) {
      setTimeout(() => addParticle(x + 20, y - 15, weapon.hitWords[Math.floor(Math.random() * weapon.hitWords.length)], "#ff4d6d"), 60);
      setTimeout(() => addParticle(x - 20, y - 30, weapon.hitWords[Math.floor(Math.random() * weapon.hitWords.length)], "#f472b6"), 120);
    }

    addShockwave(x, y, false, weapon.shockwaveColor);
    setIsShaking(true); setBgFlash(true);
    setTimeout(() => setIsShaking(false), 280);
    setTimeout(() => setBgFlash(false), 120);

    if (newHp < 70) setVillainEmotion("😰");
    if (newHp < 40) setVillainEmotion("😱");
    if (newHp < 15) setVillainEmotion("🤮");
    if (newHp <= 0) triggerDefeat();
  }, [defeated, hp, combo, currentIndex, villainList]);

  const triggerDefeat = () => {
    setDefeated(true); setVillainEmotion("💀");
    audioEngine.playDefeat();
    vibrate([50, 30, 50, 30, 100]);
    setTimeout(() => {
      const ni = currentIndex + 1;
      if (ni < villainList.length) {
        setCurrentIndex(ni); loadVillain(villainList[ni]);
      } else {
        audioEngine.stopBGM();
        const relief = Math.max(0, 100 - stress);
        const score = calcScore(totalHits + 1, maxCombo, villainList.length, relief);
        setFinalScore(score);
        setLeaderboard(getLeaderboard());
        setScreen("result");
      }
    }, 1400);
  };

  const handleUltimate = () => {
    if (!ultimateReady || defeated) return;
    setUltimateAnim(true);
    audioEngine.playUltimate();
    vibrate([100, 50, 100, 50, 200]);
    addShockwave(window.innerWidth / 2, window.innerHeight / 2, true, activeWeapon.shockwaveColor);
    addParticle(window.innerWidth / 2, window.innerHeight / 2, "💥 필살기!!", "#ffcc00");
    const dmg = 40 + Math.floor(Math.random() * 20);
    setHp(h => {
      const newHp = Math.max(0, h - dmg);
      if (newHp <= 0) setTimeout(triggerDefeat, 200);
      else {
        if (newHp < 40) setVillainEmotion("😱");
        if (newHp < 15) setVillainEmotion("🤮");
      }
      return newHp;
    });
    setSkillGauge(0); setUltimateReady(false);
    setTimeout(() => setUltimateAnim(false), 600);
  };

  const submitScore = () => {
    const name = playerName.trim() || "익명의 직장인";
    saveScore({
      name, score: finalScore, combo: maxCombo, hits: totalHits,
      weapon: activeWeapon.emoji,
      date: new Date().toLocaleDateString("ko-KR"),
    });
    setLeaderboard(getLeaderboard());
    setShowLB(true);
  };

  // ── SETUP SCREEN ────────────────────────────────
  if (screen === "setup") {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700;900&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #060610; }
          .s { min-height:100vh; background: radial-gradient(ellipse 80% 60% at 50% 0%, #1f0035 0%, #060610 70%); font-family:'Noto Sans KR',sans-serif; display:flex; flex-direction:column; align-items:center; padding:28px 16px 60px; color:#fff; }
          .logo { font-family:'Black Han Sans',sans-serif; font-size:2.4rem; text-align:center; line-height:1.1; background:linear-gradient(135deg,#ff4d6d,#ff9500,#ffcc00); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; filter:drop-shadow(0 0 24px #ff4d6d66); margin-bottom:4px; }
          .logo-sub { color:#555; font-size:0.8rem; text-align:center; margin-bottom:32px; letter-spacing:1px; }
          .lbl { font-size:0.7rem; color:#ff9500; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:10px; width:100%; max-width:400px; }
          .pgrid { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; width:100%; max-width:400px; margin-bottom:20px; }
          .pb { background:#111125; border:2px solid #222; border-radius:12px; padding:10px 4px; cursor:pointer; text-align:center; transition:all .2s; color:#fff; }
          .pb.on { border-color:#ff4d6d; background:#2a0018; box-shadow:0 0 16px #ff4d6d44; }
          .pb .e { font-size:1.6rem; display:block; }
          .pb .l { font-size:0.58rem; color:#888; margin-top:2px; }
          .wgrid { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; width:100%; max-width:400px; margin-bottom:20px; }
          .wb { background:#111125; border:2px solid #222; border-radius:12px; padding:10px 4px; cursor:pointer; text-align:center; transition:all .2s; color:#fff; }
          .wb.on { border-color:#ffcc00; background:#1a1400; box-shadow:0 0 16px #ffcc0044; }
          .wb .e { font-size:1.6rem; display:block; }
          .wb .l { font-size:0.58rem; color:#888; margin-top:2px; }
          .irow { width:100%; max-width:400px; display:flex; flex-direction:column; gap:10px; margin-bottom:12px; }
          .gi { background:#111125; border:2px solid #222; border-radius:12px; padding:13px 16px; color:#fff; font-size:0.95rem; font-family:'Noto Sans KR',sans-serif; outline:none; transition:border-color .2s; }
          .gi:focus { border-color:#ff4d6d; }
          .gi::placeholder { color:#444; }
          .addbtn { background:linear-gradient(90deg,#ff4d6d,#ff9500); border:none; border-radius:12px; padding:14px; color:#fff; font-size:1rem; font-family:'Black Han Sans',sans-serif; cursor:pointer; width:100%; max-width:400px; transition:transform .1s; }
          .addbtn:active { transform:scale(.97); }
          .vlist { width:100%; max-width:400px; display:flex; flex-direction:column; gap:8px; margin:14px 0; }
          .vc { background:#111125; border:2px solid #ff4d6d33; border-radius:12px; padding:11px 14px; display:flex; align-items:center; justify-content:space-between; }
          .vi { display:flex; align-items:center; gap:10px; }
          .vn { font-weight:700; font-size:.95rem; }
          .vt { font-size:.72rem; color:#888; }
          .rb { background:#ff4d6d22; border:1px solid #ff4d6d44; color:#ff4d6d; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:.78rem; }
          .nameinput-wrap { width:100%; max-width:400px; margin-bottom:12px; }
          .nibox { background:#111125; border:2px solid #222; border-radius:12px; padding:13px 16px; color:#fff; font-size:.95rem; font-family:'Noto Sans KR',sans-serif; outline:none; transition:border-color .2s; width:100%; }
          .nibox:focus { border-color:#ffcc00; }
          .nibox::placeholder { color:#444; }
          .startbtn { background:linear-gradient(90deg,#ff006e,#ff4d6d,#ff9500); border:none; border-radius:16px; padding:18px; color:#fff; font-size:1.25rem; font-family:'Black Han Sans',sans-serif; cursor:pointer; width:100%; max-width:400px; margin-top:6px; box-shadow:0 8px 30px #ff4d6d55; transition:transform .1s; letter-spacing:3px; }
          .startbtn:disabled { opacity:.3; cursor:not-allowed; box-shadow:none; }
          .startbtn:not(:disabled):active { transform:scale(.97); }
          .lbbtn { background:#111125; border:2px solid #333; border-radius:12px; padding:12px; color:#aaa; font-size:.9rem; font-family:'Black Han Sans',sans-serif; cursor:pointer; width:100%; max-width:400px; margin-top:10px; }
          .lbmodal { position:fixed; inset:0; background:#000a; z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
          .lbbox { background:#111125; border:2px solid #333; border-radius:20px; padding:24px; width:100%; max-width:380px; max-height:80vh; overflow-y:auto; }
          .lbtitle { font-family:'Black Han Sans',sans-serif; font-size:1.4rem; color:#ffcc00; margin-bottom:16px; text-align:center; }
          .lbrow { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #222; }
          .lbrank { font-family:'Black Han Sans',sans-serif; font-size:1.2rem; width:32px; color:#555; }
          .lbrank.top { color:#ffcc00; }
          .lbname { flex:1; font-size:.9rem; color:#ddd; }
          .lbsc { font-family:'Black Han Sans',sans-serif; color:#ff9500; font-size:1rem; }
          .closebtn { background:#222; border:none; color:#aaa; border-radius:10px; padding:10px 24px; margin-top:16px; width:100%; cursor:pointer; font-size:.9rem; }
        `}</style>

        <div className="s">
          <div className="logo">직장<br/>헬게이트 탈출</div>
          <div className="logo-sub">v3.0 — WEAPON EDITION</div>

          <div className="lbl">▸ 플레이어 이름</div>
          <div className="nameinput-wrap">
            <input className="nibox" placeholder="닉네임 입력 (리더보드 등록용)" value={playerName} onChange={e => setPlayerName(e.target.value)} />
          </div>

          <div className="lbl">▸ 무기 선택</div>
          <div className="wgrid">
            {WEAPONS.map(w => (
              <button key={w.id} className={`wb ${selectedWeaponId === w.id ? "on" : ""}`}
                onClick={() => setSelectedWeaponId(w.id)}>
                <span className="e">{w.emoji}</span><span className="l">{w.label}</span>
              </button>
            ))}
          </div>

          <div className="lbl">▸ 빌런 유형</div>
          <div className="pgrid">
            {VILLAIN_PRESETS.map(p => (
              <button key={p.label} className={`pb ${selectedPreset?.label === p.label ? "on" : ""}`}
                onClick={() => setSelectedPreset(s => s?.label === p.label ? null : p)}>
                <span className="e">{p.emoji}</span><span className="l">{p.label}</span>
              </button>
            ))}
          </div>

          <div className="lbl">▸ 빌런 정보</div>
          <div className="irow">
            <input className="gi" placeholder="빌런 이름 (예: 김부장, 박과장)" value={villainName}
              onChange={e => setVillainName(e.target.value)} />
            <input className="gi" placeholder="특징 (예: 항상 야근 강요, 뒤통수의 달인)" value={villainTrait}
              onChange={e => setVillainTrait(e.target.value)} />
          </div>
          <button className="addbtn" onClick={() => {
            if (!villainName.trim() && !selectedPreset) return;
            setCustomVillains(p => [...p, { name: villainName.trim() || selectedPreset?.label || "빌런", emoji: selectedPreset?.emoji || "😤", trait: villainTrait.trim() || "그냥 나쁜놈", id: Date.now() }]);
            setVillainName(""); setVillainTrait(""); setSelectedPreset(null);
          }}>+ 빌런 추가</button>

          {customVillains.length > 0 && <>
            <div className="lbl" style={{ marginTop: 20 }}>▸ 등록된 빌런 ({customVillains.length}명)</div>
            <div className="vlist">
              {customVillains.map(v => (
                <div className="vc" key={v.id}>
                  <div className="vi">
                    <span style={{ fontSize: "1.8rem" }}>{v.emoji}</span>
                    <div><div className="vn">{v.name}</div><div className="vt">{v.trait}</div></div>
                  </div>
                  <button className="rb" onClick={() => setCustomVillains(p => p.filter(x => x.id !== v.id))}>삭제</button>
                </div>
              ))}
            </div>
          </>}

          <button className="startbtn" disabled={customVillains.length === 0} onClick={startGame}>
            {WEAPONS.find(w => w.id === selectedWeaponId)?.emoji} 게임 시작 ⚡
          </button>
          <button className="lbbtn" onClick={() => { setLeaderboard(getLeaderboard()); setShowLB(true); }}>🏆 리더보드 보기</button>
        </div>

        {showLB && (
          <div className="lbmodal" onClick={() => setShowLB(false)}>
            <div className="lbbox" onClick={e => e.stopPropagation()}>
              <div className="lbtitle">🏆 명예의 전당</div>
              {leaderboard.length === 0 ? <div style={{ color: "#555", textAlign: "center", padding: "20px 0" }}>아직 기록이 없습니다</div>
                : leaderboard.map((e, i) => (
                  <div className="lbrow" key={i}>
                    <div className={`lbrank ${i < 3 ? "top" : ""}`}>{["🥇", "🥈", "🥉"][i] || `${i + 1}`}</div>
                    <div className="lbname">{e.weapon && <span style={{ marginRight: 4 }}>{e.weapon}</span>}{e.name}<span style={{ color: "#555", fontSize: ".72rem", marginLeft: 6 }}>{e.date}</span></div>
                    <div className="lbsc">{e.score.toLocaleString()}</div>
                  </div>
                ))}
              <button className="closebtn" onClick={() => setShowLB(false)}>닫기</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── RESULT SCREEN ───────────────────────────────
  if (screen === "result") {
    const relief = Math.max(0, 100 - stress);
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700;900&display=swap');
          *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
          body { background:#060610; }
          @keyframes trophy { 0%,100%{transform:translateY(0) rotate(-5deg);}50%{transform:translateY(-12px) rotate(5deg);} }
          @keyframes scorePop { 0%{transform:scale(0);opacity:0;}70%{transform:scale(1.2);}100%{transform:scale(1);opacity:1;} }
          .r { min-height:100vh; background:radial-gradient(ellipse at center,#1a0030 0%,#060610 70%); font-family:'Noto Sans KR',sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 20px; color:#fff; text-align:center; }
          .tr { font-size:5rem; animation:trophy 1s infinite; }
          .rt { font-family:'Black Han Sans',sans-serif; font-size:2rem; background:linear-gradient(90deg,#ffcc00,#ff9500); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin:12px 0 4px; }
          .rs { color:#666; font-size:.85rem; margin-bottom:24px; }
          .weaponbadge { background:#1a1400; border:2px solid #ffcc0055; border-radius:20px; padding:5px 16px; font-size:.85rem; color:#ffcc00; margin-bottom:16px; display:inline-block; }
          .scorecard { background:#111125; border:2px solid #ffcc0055; border-radius:20px; padding:20px 32px; margin-bottom:20px; animation:scorePop .5s ease-out; }
          .scoreval { font-family:'Black Han Sans',sans-serif; font-size:3rem; color:#ffcc00; }
          .scorelbl { font-size:.75rem; color:#888; letter-spacing:2px; }
          .sgrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%; max-width:360px; margin-bottom:20px; }
          .sc { background:#111125; border:2px solid #222; border-radius:14px; padding:14px; }
          .sv { font-family:'Black Han Sans',sans-serif; font-size:1.8rem; color:#ff9500; }
          .sl { font-size:.7rem; color:#888; margin-top:3px; }
          .relwrap { width:100%; max-width:360px; margin-bottom:24px; }
          .rellb { display:flex; justify-content:space-between; font-size:.8rem; color:#aaa; margin-bottom:7px; }
          .relbg { height:18px; background:#111125; border-radius:9px; overflow:hidden; border:1px solid #222; }
          .relfill { height:100%; background:linear-gradient(90deg,#06d6a0,#38bdf8); border-radius:9px; width:${relief}%; transition:width 1.2s ease; }
          .ni { background:#111125; border:2px solid #333; border-radius:12px; padding:13px 16px; color:#fff; font-size:.95rem; font-family:'Noto Sans KR',sans-serif; outline:none; width:100%; max-width:360px; margin-bottom:10px; }
          .ni:focus { border-color:#ffcc00; }
          .ni::placeholder { color:#444; }
          .subbtn { background:linear-gradient(90deg,#ffcc00,#ff9500); border:none; border-radius:12px; padding:14px; color:#111; font-size:1rem; font-family:'Black Han Sans',sans-serif; cursor:pointer; width:100%; max-width:360px; margin-bottom:10px; }
          .agbtn { background:linear-gradient(90deg,#ff006e,#ff9500); border:none; border-radius:16px; padding:16px; color:#fff; font-size:1.1rem; font-family:'Black Han Sans',sans-serif; cursor:pointer; width:100%; max-width:360px; box-shadow:0 8px 30px #ff4d6d44; }
          .lbmodal { position:fixed; inset:0; background:#000a; z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
          .lbbox { background:#111125; border:2px solid #333; border-radius:20px; padding:24px; width:100%; max-width:380px; max-height:80vh; overflow-y:auto; }
          .lbtitle { font-family:'Black Han Sans',sans-serif; font-size:1.4rem; color:#ffcc00; margin-bottom:16px; text-align:center; }
          .lbrow { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #222; }
          .lbrank { font-family:'Black Han Sans',sans-serif; font-size:1.2rem; width:32px; color:#555; }
          .lbrank.top { color:#ffcc00; }
          .lbname { flex:1; font-size:.9rem; color:#ddd; }
          .lbsc { font-family:'Black Han Sans',sans-serif; color:#ff9500; font-size:1rem; }
          .closebtn { background:#222; border:none; color:#aaa; border-radius:10px; padding:10px 24px; margin-top:16px; width:100%; cursor:pointer; }
        `}</style>
        <div className="r">
          <div className="tr">🏆</div>
          <div className="rt">전직원 격파!!</div>
          <div className="rs">오늘도 수고하셨습니다 💪</div>
          <div className="weaponbadge">{activeWeapon.emoji} {activeWeapon.label} 사용</div>
          <div className="scorecard">
            <div className="scoreval">{finalScore.toLocaleString()}</div>
            <div className="scorelbl">TOTAL SCORE</div>
          </div>
          <div className="sgrid">
            <div className="sc"><div className="sv">{totalHits}</div><div className="sl">총 공격</div></div>
            <div className="sc"><div className="sv">{maxCombo}x</div><div className="sl">최대 콤보</div></div>
            <div className="sc" style={{ gridColumn: "1/-1" }}><div className="sv">{villainList.length}명</div><div className="sl">격파한 빌런</div></div>
          </div>
          <div className="relwrap">
            <div className="rellb"><span>스트레스 해소</span><span style={{ color: "#06d6a0", fontWeight: 700 }}>{relief}%</span></div>
            <div className="relbg"><div className="relfill" /></div>
          </div>

          {!showLB && <>
            <input className="ni" placeholder="닉네임으로 기록 등록하기" value={playerName} onChange={e => setPlayerName(e.target.value)} />
            <button className="subbtn" onClick={submitScore}>🏆 리더보드에 등록!</button>
          </>}
          {showLB && <>
            <div className="lbtitle" style={{ marginBottom: 12, color: "#ffcc00", fontFamily: "'Black Han Sans',sans-serif" }}>🏆 명예의 전당</div>
            {leaderboard.map((e, i) => (
              <div className="lbrow" key={i} style={{ width: "100%", maxWidth: 360, display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #222" }}>
                <span style={{ fontFamily: "'Black Han Sans',sans-serif", color: i < 3 ? "#ffcc00" : "#555", width: 32 }}>{["🥇","🥈","🥉"][i] || `${i+1}`}</span>
                <span style={{ flex: 1, fontSize: ".9rem", color: e.name === (playerName.trim() || "익명의 직장인") ? "#ff9500" : "#ddd" }}>
                  {e.weapon && <span style={{ marginRight: 4 }}>{e.weapon}</span>}{e.name}
                </span>
                <span style={{ fontFamily: "'Black Han Sans',sans-serif", color: "#ff9500" }}>{e.score.toLocaleString()}</span>
              </div>
            ))}
          </>}
          <button className="agbtn" style={{ marginTop: 16 }} onClick={() => setScreen("setup")}>🔄 다시 도전!</button>
        </div>
      </>
    );
  }

  // ── GAME SCREEN ─────────────────────────────────
  const weaponFlashBg = activeWeapon.flashBg;
  const normalBg = "radial-gradient(ellipse at center,#160028 0%,#060610 60%)";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700;900&display=swap');
        @keyframes floatUp { 0%{opacity:1;transform:translateY(0) scale(1);}100%{opacity:0;transform:translateY(-90px) scale(1.4);} }
        @keyframes shockwave { 0%{transform:scale(.2);opacity:1;}100%{transform:scale(3);opacity:0;} }
        @keyframes shake { 0%,100%{transform:translateX(0);}25%{transform:translateX(-9px) rotate(-1.5deg);}75%{transform:translateX(9px) rotate(1.5deg);} }
        @keyframes defeated { 0%{transform:scale(1);filter:brightness(1);}40%{transform:scale(1.4);filter:brightness(4) saturate(0);}100%{transform:scale(0) rotate(720deg);opacity:0;} }
        @keyframes ultimate { 0%{transform:scale(1);}25%{transform:scale(1.6) rotate(-10deg);filter:brightness(5);}75%{transform:scale(0.7) rotate(10deg);}100%{transform:scale(1);} }
        @keyframes skillPulse { 0%,100%{box-shadow:0 0 0 0 #ffcc0066;}50%{box-shadow:0 0 0 10px transparent;} }
        @keyframes bgbeat { 0%,100%{opacity:.5;}50%{opacity:1;} }
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        body { background:#060610; overflow:hidden; }
        .gw { height:100vh; height:100dvh; background:${bgFlash ? weaponFlashBg : normalBg}; font-family:'Noto Sans KR',sans-serif; display:flex; flex-direction:column; align-items:center; overflow:hidden; user-select:none; transition:background .1s; position:relative; }
        .topbar { width:100%; padding:14px 18px 6px; display:flex; align-items:center; justify-content:space-between; z-index:10; }
        .vtitle { font-family:'Black Han Sans',sans-serif; font-size:1.05rem; color:#fff; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .weaponbadge { background:#1a1400; border:1px solid #ffcc0055; border-radius:8px; padding:3px 8px; font-size:.82rem; color:#ffcc00; }
        .vinfo { display:flex; align-items:center; gap:8px; }
        .progbadge { font-size:.72rem; color:#555; }
        .soundbtn { background:none; border:1px solid #333; border-radius:8px; padding:4px 10px; color:#888; cursor:pointer; font-size:.85rem; }
        .bars { padding:0 18px; width:100%; z-index:10; display:flex; flex-direction:column; gap:6px; }
        .barlbl { display:flex; justify-content:space-between; font-size:.68rem; color:#555; margin-bottom:3px; }
        .barbg { height:13px; background:#0d0d1e; border-radius:7px; overflow:hidden; border:1px solid #1a1a35; }
        .hpfill { height:100%; border-radius:7px; transition:width .12s ease,background .3s; background:${hpPct > 60 ? "linear-gradient(90deg,#06d6a0,#118ab2)" : hpPct > 30 ? "linear-gradient(90deg,#ffcc00,#ff9500)" : "linear-gradient(90deg,#ff4d6d,#ff006e)"}; width:${hpPct}%; }
        .stressbg { height:8px; background:#0d0d1e; border-radius:4px; overflow:hidden; border:1px solid #1a1a35; }
        .stressfill { height:100%; border-radius:4px; background:linear-gradient(90deg,#8b5cf6,#ec4899); width:${stress}%; transition:width .3s ease; }
        .skillbg { height:10px; background:#0d0d1e; border-radius:5px; overflow:hidden; border:1px solid #1a1a35; }
        .skillfill { height:100%; border-radius:5px; background:linear-gradient(90deg,#ffcc00,#ff9500); width:${skillPct}%; transition:width .15s; ${ultimateReady ? "animation:bgbeat .6s infinite;" : ""} }
        .arena { flex:1; display:flex; align-items:center; justify-content:center; position:relative; width:100%; }
        .vbtn { background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; padding:24px; border-radius:50%; animation:${isShaking ? "shake .28s ease" : "none"}; transition:transform .05s; }
        .vbtn:active { transform:scale(.9); }
        .vemoji { font-size:7.5rem; display:block; filter:drop-shadow(0 0 28px ${activeWeapon.shockwaveColor}55); animation:${defeated ? "defeated 1.2s forwards" : ultimateAnim ? "ultimate .6s ease" : "none"}; }
        .vnamebadge { background:#ff4d6d18; border:2px solid #ff4d6d44; border-radius:20px; padding:5px 18px; color:#ff9500; font-family:'Black Han Sans',sans-serif; font-size:.95rem; white-space:nowrap; }
        .vtraitbadge { color:#444; font-size:.75rem; }
        .combo { position:absolute; top:16px; right:16px; font-family:'Black Han Sans',sans-serif; font-size:${combo > 10 ? "2.2rem" : "1.5rem"}; color:${combo > 10 ? "#ffcc00" : "#ff9500"}; text-shadow:${combo > 10 ? "0 0 24px #ffcc00" : "0 0 12px #ff9500"}; opacity:${combo > 1 ? 1 : 0}; transition:all .12s; }
        .ultbtn { position:absolute; bottom:16px; right:16px; background:${ultimateReady ? "linear-gradient(135deg,#ffcc00,#ff9500)" : "#1a1a2e"}; border:${ultimateReady ? "none" : "2px solid #333"}; border-radius:14px; padding:10px 16px; color:${ultimateReady ? "#111" : "#444"}; font-family:'Black Han Sans',sans-serif; font-size:.95rem; cursor:${ultimateReady ? "pointer" : "not-allowed"}; transition:all .2s; ${ultimateReady ? "animation:skillPulse .8s infinite; box-shadow:0 0 20px #ffcc0066;" : ""} }
        .taphint { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); color:#333; font-size:.75rem; letter-spacing:2px; }
        .defeatmsg { position:absolute; bottom:28px; left:50%; transform:translateX(-50%); color:#06d6a0; font-family:'Black Han Sans',sans-serif; font-size:1.1rem; text-shadow:0 0 20px #06d6a0; white-space:nowrap; }
        .botbar { padding:10px 18px 20px; width:100%; display:flex; justify-content:center; z-index:10; }
        .qbtn { background:#0d0d1e; border:1px solid #222; color:#555; border-radius:10px; padding:9px 22px; font-size:.82rem; cursor:pointer; font-family:'Noto Sans KR',sans-serif; }
      `}</style>

      {particles.map(p => <FloatingText key={p.id} {...p} />)}
      {shockwaves.map(s => <Shockwave key={s.id} {...s} />)}

      <div className="gw">
        <div className="topbar">
          <div className="vtitle">💀 {currentVillain?.name}</div>
          <div className="vinfo">
            <span className="weaponbadge">{activeWeapon.emoji} {activeWeapon.label}</span>
            <span className="progbadge">{currentIndex + 1}/{villainList.length}</span>
            <button className="soundbtn" onClick={() => setSoundOn(s => !s)}>{soundOn ? "🔊" : "🔇"}</button>
          </div>
        </div>

        <div className="bars">
          <div>
            <div className="barlbl"><span>❤️ HP</span><span style={{ color: hpPct < 30 ? "#ff4d6d" : "#555" }}>{hp}/100</span></div>
            <div className="barbg"><div className="hpfill" /></div>
          </div>
          <div>
            <div className="barlbl"><span>😤 스트레스</span><span>{stress}%</span></div>
            <div className="stressbg"><div className="stressfill" /></div>
          </div>
          <div>
            <div className="barlbl"><span>⚡ 필살기 게이지</span><span style={{ color: ultimateReady ? "#ffcc00" : "#555" }}>{ultimateReady ? "READY!" : `${skillGauge}%`}</span></div>
            <div className="skillbg"><div className="skillfill" /></div>
          </div>
        </div>

        <div className="arena">
          <div className="combo">{combo > 1 ? `${combo} HIT!` : ""}</div>

          <button className="vbtn" onClick={handleHit}>
            <span className="vemoji">{villainEmotion}</span>
            <div className="vnamebadge">{currentVillain?.name}</div>
            <div className="vtraitbadge">{currentVillain?.trait}</div>
          </button>

          {!defeated && (
            <button className="ultbtn" onClick={handleUltimate}>
              {ultimateReady ? "⚡ 필살기!" : "⚡ 충전중"}
            </button>
          )}

          {!defeated && <div className="taphint">TAP TO ATTACK</div>}
          {defeated && <div className="defeatmsg">💥 격파!! 다음 빌런 등장...</div>}
        </div>

        <div className="botbar">
          <button className="qbtn" onClick={() => { audioEngine.stopBGM(); setScreen("setup"); }}>← 빌런 재설정</button>
        </div>
      </div>
    </>
  );
}
