import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Crown, Shield, Zap, Target, Terminal, AlertTriangle, Activity, Lock, Settings, HelpCircle, X, Flame, Crosshair, Eye } from 'lucide-react';

const BOARD_SIZE = 9;

// ★ 公開時にMP3ファイルを使う場合は、ここを true に変更してください ★
const USE_MP3_BGM = true;

const WALLS = [
  { x: 2, y: 2 }, { x: 6, y: 2 },
  { x: 4, y: 4 }, // 中央の要塞
  { x: 2, y: 6 }, { x: 6, y: 6 }
];

const INITIAL_UNITS = [
  // Player Units
  { id: 'p_core', owner: 'player', type: 'core', x: 4, y: 8, hp: 4, maxHp: 4, heat: 0, maxHeat: 2, hasActed: false, icon: Crown, label: 'Core' },
  { id: 'p_hacker', owner: 'player', type: 'hacker', x: 4, y: 7, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Eye, label: 'Hacker' },
  { id: 'p_heavy1', owner: 'player', type: 'heavy', x: 3, y: 8, hp: 2, maxHp: 2, heat: 0, maxHeat: 1, hasActed: false, icon: Shield, label: 'Heavy' },
  { id: 'p_heavy2', owner: 'player', type: 'heavy', x: 5, y: 8, hp: 2, maxHp: 2, heat: 0, maxHeat: 1, hasActed: false, icon: Shield, label: 'Heavy' },
  { id: 'p_sniper1', owner: 'player', type: 'sniper', x: 2, y: 8, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Target, label: 'Sniper' },
  { id: 'p_sniper2', owner: 'player', type: 'sniper', x: 6, y: 8, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Target, label: 'Sniper' },
  { id: 'p_speed1', owner: 'player', type: 'speed', x: 3, y: 7, hp: 1, maxHp: 1, heat: 0, maxHeat: 3, hasActed: false, icon: Zap, label: 'Speed' },
  { id: 'p_speed2', owner: 'player', type: 'speed', x: 5, y: 7, hp: 1, maxHp: 1, heat: 0, maxHeat: 3, hasActed: false, icon: Zap, label: 'Speed' },
  
  // CPU Units
  { id: 'c_core', owner: 'cpu', type: 'core', x: 4, y: 0, hp: 4, maxHp: 4, heat: 0, maxHeat: 2, hasActed: false, icon: Crown, label: 'Core' },
  { id: 'c_hacker', owner: 'cpu', type: 'hacker', x: 4, y: 1, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Eye, label: 'Hacker' },
  { id: 'c_heavy1', owner: 'cpu', type: 'heavy', x: 3, y: 0, hp: 2, maxHp: 2, heat: 0, maxHeat: 1, hasActed: false, icon: Shield, label: 'Heavy' },
  { id: 'c_heavy2', owner: 'cpu', type: 'heavy', x: 5, y: 0, hp: 2, maxHp: 2, heat: 0, maxHeat: 1, hasActed: false, icon: Shield, label: 'Heavy' },
  { id: 'c_sniper1', owner: 'cpu', type: 'sniper', x: 2, y: 0, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Target, label: 'Sniper' },
  { id: 'c_sniper2', owner: 'cpu', type: 'sniper', x: 6, y: 0, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Target, label: 'Sniper' },
  { id: 'c_speed1', owner: 'cpu', type: 'speed', x: 3, y: 1, hp: 1, maxHp: 1, heat: 0, maxHeat: 3, hasActed: false, icon: Zap, label: 'Speed' },
  { id: 'c_speed2', owner: 'cpu', type: 'speed', x: 5, y: 1, hp: 1, maxHp: 1, heat: 0, maxHeat: 3, hasActed: false, icon: Zap, label: 'Speed' },
];

export default function App() {
  const [gameState, setGameState] = useState('title'); 
  const [cpuLevel, setCpuLevel] = useState(3); // 1: Easy, 2: Normal, 3: Hard
  const [cutinText, setCutinText] = useState("");
  
  const [units, setUnits] = useState(INITIAL_UNITS.map(u => ({...u}))); 
  const [turn, setTurn] = useState(null); 
  const [turnCount, setTurnCount] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  
  const [logs, setLogs] = useState([{ id: 'init', text: "SYSTEM_START: AWAITING INITIALIZATION...", type: 'system', icon: null, iconColor: '' }]);
  
  const [winner, setWinner] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.25);
  const [seVolume, setSeVolume] = useState(0.5);
  
  const [audioInitialized, setAudioInitialized] = useState(false);
  const bgmRef = useRef(null);
  const audioCtxRef = useRef(null);
  const synthIntervalRef = useRef(null);
  
  const bgmVolumeRef = useRef(bgmVolume);
  const seVolumeRef = useRef(seVolume);

  const [vfx, setVfx] = useState([]);

  // --- LOGGING SYSTEM ---
  const addLog = useCallback((msg, type = 'system', icon = null, iconColor = '') => {
    setLogs(prev => [{ id: Date.now() + Math.random(), text: msg, type, icon, iconColor }, ...prev]);
  }, []);

  const addLogs = useCallback((logArray) => {
    const newEntries = logArray.map((l, i) => ({ id: Date.now() + i, text: l.text, type: l.type, icon: l.icon, iconColor: l.iconColor }));
    setLogs(prev => [...newEntries, ...prev]);
  }, []);

  // --- AUDIO ENGINE ---
  useEffect(() => {
    bgmVolumeRef.current = bgmVolume;
    if (bgmRef.current) bgmRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  useEffect(() => {
    seVolumeRef.current = seVolume;
  }, [seVolume]);

  const stopSynthBGM = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
  };

  const startSynthBGM = () => {
    if (!audioCtxRef.current) return;
    stopSynthBGM();

    const ctx = audioCtxRef.current;
    let step = 0;
    const tempo = 115;
    const stepTime = (60 / tempo) / 4; 

    const E1 = 41.20, F1 = 43.65, G1 = 48.99, A1 = 55.00, C2 = 65.41, D2 = 73.42, E2 = 82.41, F2 = 87.31, G2 = 98.00;
    const A2 = 110.0, C3 = 130.8, D3 = 146.8, E3 = 164.8, F3 = 174.61, G3 = 196.0, A3 = 220.0;

    const kickPattern = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,1,0];
    const hatPattern = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,0,1, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1, 0,0,1,0, 0,0,1,0, 0,1,1,0, 1,1,1,1];
    const bassPattern = [A1, 0, 0, 0, A1, 0, G1, 0, A1, 0, 0, 0, C2, 0, E1, 0, F1, 0, 0, 0, F1, 0, G1, 0, F1, 0, 0, 0, E1, 0, C2, 0, D2, 0, 0, 0, D2, 0, C2, 0, D2, 0, 0, 0, F2, 0, E2, 0, A1, 0, 0, 0, C2, 0, D2, 0, E2, 0, 0, 0, G2, 0, 0, 0];
    const arpPattern = [A2, 0, 0, C3, 0, E3, 0, 0, G3, 0, 0, D3, 0, 0, E3, 0, 0, A3, 0, 0, G3, 0, 0, C3, 0, E3, 0, 0, A2, 0, 0, 0, D3, 0, 0, F3, 0, A3, 0, 0, C3, 0, 0, E3, 0, 0, G3, 0, A3, 0, 0, 0, E3, 0, 0, C3, D3, 0, 0, A2, 0, 0, 0, 0];

    synthIntervalRef.current = setInterval(() => {
      const now = ctx.currentTime;
      const vol = bgmVolumeRef.current;
      if (vol <= 0) { step++; return; }
      const s = step % 64;

      if (kickPattern[s]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);
        gain.gain.setValueAtTime(vol * 0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      }

      if (hatPattern[s]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 7000;
        osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square'; osc.frequency.value = 8000;
        gain.gain.setValueAtTime(vol * 0.03, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
      }

      if (bassPattern[s] > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle'; osc.frequency.setValueAtTime(bassPattern[s], now);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.2); 
        osc.disconnect(); osc.connect(filter); filter.connect(gain);
        gain.gain.setValueAtTime(vol * 0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      }

      if (arpPattern[s] > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(arpPattern[s], now);
        gain.gain.setValueAtTime(vol * 0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8); 
        osc.start(now); osc.stop(now + 0.8);
      }

      step++;
    }, stepTime * 1000);
  };

  const playSE = (type) => {
    const vol = seVolumeRef.current;
    if (!audioCtxRef.current || vol === 0) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode); gainNode.connect(ctx.destination);
    const now = ctx.currentTime;
    
    if (type === 'move') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gainNode.gain.setValueAtTime(vol * 0.3, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } 
    else if (type === 'cooling') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      gainNode.gain.setValueAtTime(vol * 0.2, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
    else if (type === 'attack') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gainNode.gain.setValueAtTime(vol * 0.5, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
    else if (type === 'sniper') {
      osc.type = 'square'; osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      gainNode.gain.setValueAtTime(vol * 0.4, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    }
    else if (type === 'explosion') {
      osc.type = 'square'; osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
      gainNode.gain.setValueAtTime(vol * 0.8, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(50, now); osc2.frequency.exponentialRampToValueAtTime(10, now + 0.5);
      osc2.connect(gainNode); osc.start(now); osc.stop(now + 0.5); osc2.start(now); osc2.stop(now + 0.5);
    }
    else if (type === 'turnend') {
      // 軽快でサイバーな「ピロッ」というシステム承認音
      osc.type = 'square';
      osc.frequency.setValueAtTime(1046, now); // C6
      osc.frequency.setValueAtTime(1568, now + 0.08); // G6
      
      gainNode.gain.setValueAtTime(vol * 0.15, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.07);
      gainNode.gain.setValueAtTime(vol * 0.15, now + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      osc.start(now); osc.stop(now + 0.25);
    }
    else if (type === 'win') {
      osc.type = 'square'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554, now + 0.15); 
      osc.frequency.setValueAtTime(659, now + 0.3); osc.frequency.setValueAtTime(880, now + 0.45); 
      gainNode.gain.setValueAtTime(vol * 0.15, now); gainNode.gain.linearRampToValueAtTime(vol * 0.15, now + 0.6);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      osc.start(now); osc.stop(now + 1.5);
    }
    else if (type === 'lose') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 1.5);
      gainNode.gain.setValueAtTime(vol * 0.2, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      osc.start(now); osc.stop(now + 1.5);
    }
  };

  // --- GAME FLOW CONTROLS ---
  const initAudioAndStartBGM = () => {
    if (!audioInitialized) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext && !audioCtxRef.current) audioCtxRef.current = new AudioContext();
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        if (USE_MP3_BGM && bgmRef.current) {
          bgmRef.current.volume = bgmVolume;
          bgmRef.current.play().catch(e => console.warn("MP3 Play Error:", e));
        } else { startSynthBGM(); }
      } catch (err) { console.warn("Audio Context init error:", err); }
      setAudioInitialized(true);
    }
  };

  const startGameWithLevel = (level) => {
    setCpuLevel(level);
    setUnits(INITIAL_UNITS.map(u => ({...u})));
    setTurnCount(1);
    setSelectedId(null);
    setWinner(null);
    setIsProcessing(false);
    setVfx([]);
    
    try {
      if (USE_MP3_BGM && bgmRef.current) {
        bgmRef.current.volume = bgmVolume;
        bgmRef.current.currentTime = 0;
        if (bgmRef.current.paused) bgmRef.current.play().catch(()=>{});
      } else { startSynthBGM(); }
    } catch (err) { console.warn(err); }

    setGameState('cutin');
    const firstTurn = Math.random() < 0.5 ? 'player' : 'cpu';
    setCutinText(`${firstTurn.toUpperCase()} FIRST`);
    
    setTimeout(() => {
      setGameState('playing');
      setTurn(firstTurn);
      setLogs([
        { id: Date.now(), text: `SYSTEM_INITIALIZED: ${firstTurn.toUpperCase()} GOES FIRST. CPU LV:${level}`, type: 'system', icon: null, iconColor: '' }
      ]);
    }, 2000);
  };

  const handleStart = (e, selectedLevel) => {
    e.stopPropagation(); 
    try { initAudioAndStartBGM(); } catch(err) { console.warn(err); }
    startGameWithLevel(selectedLevel);
  };

  const handleReturnToTitle = (e) => {
    e.stopPropagation();
    setWinner(null);
    setGameState('title');
  };

  const handleWinner = (nextWinner) => {
    setWinner(nextWinner);
    setGameState('result');
    addLog(`=== GAME OVER: ${nextWinner.toUpperCase()} WINS ===`, 'system');
    if (USE_MP3_BGM && bgmRef.current) bgmRef.current.volume = 0.1;
    else stopSynthBGM();
    if (nextWinner === 'player') playSE('win');
    else if (nextWinner === 'cpu') playSE('lose');
  };

  // --- LOGIC ---
  const addVfx = (newVfxArray) => {
    setVfx(prev => [...prev, ...newVfxArray]);
    setTimeout(() => { setVfx(prev => prev.filter(v => !newVfxArray.map(n => n.id).includes(v.id))); }, 1000); 
  };

  const getDistance = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
  const isWall = (x, y) => WALLS.some(w => w.x === x && w.y === y);

  const checkWinner = (currentUnits) => {
    const pCore = currentUnits.find(u => u.id === 'p_core');
    const cCore = currentUnits.find(u => u.id === 'c_core');
    if (!pCore && !cCore) return 'draw';
    if (!pCore) return 'cpu';
    if (!cCore) return 'player';
    return null;
  };

  // BFSによる現在位置からの各マスへの最短距離計算（他ユニット・壁は障害物）
  const getDistances = useCallback((startX, startY, currentUnits) => {
    const dists = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Infinity));
    dists[startY][startX] = 0;
    const queue = [{x: startX, y: startY, d: 0}];
    
    while(queue.length > 0) {
        const {x, y, d} = queue.shift();
        const dirs = [[0,-1], [0,1], [-1,0], [1,0]];
        for (let [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                if (isWall(nx, ny)) continue;
                if (currentUnits.some(u => u.x === nx && u.y === ny)) continue;
                if (d + 1 < dists[ny][nx]) {
                    dists[ny][nx] = d + 1;
                    queue.push({x: nx, y: ny, d: d + 1});
                }
            }
        }
    }
    return dists;
  }, []);

  const getAttackableCells = (unit, currentUnits) => {
    const cells = [];
    if (!unit) return cells;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    if (unit.type === 'sniper') {
      for (const [dx, dy] of dirs) {
        for (let dist = 1; dist <= 3; dist++) {
          const tx = unit.x + dx * dist; const ty = unit.y + dy * dist;
          if (tx < 0 || tx >= BOARD_SIZE || ty < 0 || ty >= BOARD_SIZE) break; 
          if (isWall(tx, ty)) break; 
          const target = currentUnits.find(u => u.x === tx && u.y === ty);
          if (dist >= 2) cells.push({ x: tx, y: ty, hasTarget: !!target });
          if (target) break; 
        }
      }
    } else {
      for (const [dx, dy] of dirs) cells.push({ x: unit.x + dx, y: unit.y + dy, hasTarget: true });
    }
    return cells;
  };

  const applyTurnStart = (currentUnits, owner) => currentUnits.map(u => (u.owner === owner ? { ...u, hasActed: false } : u));

  // 一括移動に対応するため distance パラメータを追加
  const executeAction = (stateUnits, actorId, actionType, targetX, targetY, distance = 1) => {
    let newUnits = [...stateUnits];
    let newVfx = [];
    let actionLogs = [];
    
    const actorIndex = newUnits.findIndex(u => u.id === actorId);
    if (actorIndex === -1) return { newUnits, logs: [{text: "ERROR: UNIT NOT FOUND", type: 'warning'}], vfx: [] };
    
    let actor = { ...newUnits[actorIndex] };
    const isOverclock = actor.hasActed;
    const namePrefix = `[${actor.owner === 'player' ? 'P' : 'C'}] ${actor.label}`;
    const iconColor = actor.owner === 'player' ? 'text-cyan-400' : 'text-rose-500';
    
    let deltaHeat = 0; // 追加される熱量

    if (actionType === 'move') {
      actor.x = targetX; actor.y = targetY;
      deltaHeat = !isOverclock ? distance - 1 : distance;
      actionLogs.push({ text: `${namePrefix} moved ${distance} step(s).`, type: 'move', icon: actor.icon, iconColor });
      playSE('move');
    } else if (actionType === 'attack') {
      deltaHeat = !isOverclock ? 0 : 1;
      const targetIndex = newUnits.findIndex(u => u.x === targetX && u.y === targetY);
      if (targetIndex !== -1) {
        let target = { ...newUnits[targetIndex] };
        
        if (actor.type === 'hacker') {
          target.heat += 2;
          actionLogs.push({ text: `${namePrefix} hacked ${target.label} (Heat +2)!`, type: 'attack', icon: actor.icon, iconColor });
          playSE('sniper');
          newVfx.push({ id: Date.now(), type: 'text', text: `HEAT +2`, x: targetX, y: targetY, color: 'text-amber-500 font-bold text-xl drop-shadow-[0_0_8px_#f59e0b]' });
          
          if (target.heat > target.maxHeat) {
            target.hp = 0;
            playSE('explosion');
            actionLogs.push({ text: `!!! ${target.label} FORCED MELTDOWN !!!`, type: 'meltdown', icon: target.icon, iconColor: target.owner === 'player' ? 'text-cyan-400' : 'text-rose-500' });
            newVfx.push({ id: Date.now() + 1, type: 'explosion', x: targetX, y: targetY });
            newVfx.push({ id: Date.now() + 2, type: 'text', text: 'MELTDOWN!', x: targetX, y: targetY, color: 'text-red-500 font-black text-2xl drop-shadow-[0_0_10px_#ef4444]' });
            
            const adjacentCoords = [{x: targetX, y: targetY - 1}, {x: targetX, y: targetY + 1}, {x: targetX - 1, y: targetY}, {x: targetX + 1, y: targetY}];
            adjacentCoords.forEach((coord, i) => {
                const victimIdx = newUnits.findIndex(u => u.x === coord.x && u.y === coord.y && u.hp > 0 && u.id !== target.id);
                if(victimIdx !== -1) {
                    let victim = {...newUnits[victimIdx]}; victim.hp -= 1; newUnits[victimIdx] = victim;
                    if (victim.id === actor.id) actor.hp -= 1; // 自身が巻き込まれた場合
                    actionLogs.push({ text: `Splash DMG to [${coord.x},${coord.y}]!`, type: 'damage', icon: target.icon, iconColor: 'text-rose-600' });
                    newVfx.push({ id: Date.now() + 10 + i, type: 'slash', x: coord.x, y: coord.y });
                    newVfx.push({ id: Date.now() + 20 + i, type: 'text', text: '-1', x: coord.x, y: coord.y, color: 'text-rose-500 font-bold text-xl' });
                }
            });
          }
          newUnits[targetIndex] = target;
        } else {
          const damage = (actor.type === 'heavy' || actor.type === 'core') ? 2 : 1;
          target.hp -= damage;
          actionLogs.push({ text: `${namePrefix} attacked for ${damage} DMG!`, type: 'attack', icon: actor.icon, iconColor });
          newUnits[targetIndex] = target;
          
          if (actor.type === 'sniper') { playSE('sniper'); newVfx.push({ id: Date.now()+1, type: 'laser', x: targetX, y: targetY }); } 
          else { playSE('attack'); newVfx.push({ id: Date.now()+1, type: 'slash', x: targetX, y: targetY }); }
          newVfx.push({ id: Date.now()+2, type: 'text', text: `-${damage}`, x: targetX, y: targetY, color: 'text-rose-400 font-bold text-2xl drop-shadow-[0_0_8px_#f43f5e]' });
        }
      }
    } 
    
    // --- 行動による状態変化の適用 ---
    if (actionType === 'cooling') {
        actor.heat = Math.max(0, actor.heat - 1);
        actionLogs.push({ text: `${namePrefix} COOLED DOWN (Heat -1).`, type: 'cool', icon: actor.icon, iconColor });
        playSE('cooling');
        newVfx.push({ id: Date.now(), type: 'text', text: 'COOL -1', x: actor.x, y: actor.y, color: 'text-emerald-400 font-bold drop-shadow-[0_0_8px_#34d399]' });
        actor.hasActed = true;
    } else {
        if (deltaHeat > 0) {
            actor.heat += deltaHeat;
            actionLogs.push({ text: `${namePrefix} OVERCLOCKED (Heat +${deltaHeat}).`, type: 'overclock', icon: actor.icon, iconColor });
            newVfx.push({ id: Date.now()+2, type: 'text', text: `HEAT +${deltaHeat}`, x: actor.x, y: actor.y, color: 'text-orange-400 font-bold' });
        }
        actor.hasActed = true;
    }

    newUnits[actorIndex] = actor;

    let hasMeltdown = false;
    if (actor.heat > actor.maxHeat && actor.hp > 0) {
        hasMeltdown = true;
        playSE('explosion');
        actionLogs.push({ text: `!!! ${namePrefix} MELTDOWN !!!`, type: 'meltdown', icon: actor.icon, iconColor });
        
        newVfx.push({ id: Date.now() + 3, type: 'explosion', x: actor.x, y: actor.y });
        newVfx.push({ id: Date.now() + 4, type: 'text', text: 'MELTDOWN!', x: actor.x, y: actor.y, color: 'text-red-500 font-black text-2xl drop-shadow-[0_0_10px_#ef4444]' });

        const adjacentCoords = [{x: actor.x, y: actor.y - 1}, {x: actor.x, y: actor.y + 1}, {x: actor.x - 1, y: actor.y}, {x: actor.x + 1, y: actor.y}];
        actor.hp = 0; newUnits[actorIndex] = actor;

        adjacentCoords.forEach(coord => {
            const victimIdx = newUnits.findIndex(u => u.x === coord.x && u.y === coord.y && u.hp > 0);
            if(victimIdx !== -1) {
                let victim = {...newUnits[victimIdx]}; victim.hp -= 1; newUnits[victimIdx] = victim;
                actionLogs.push({ text: `Splash DMG to [${coord.x},${coord.y}]!`, type: 'damage', icon: actor.icon, iconColor });
                newVfx.push({ id: Date.now() + Math.random(), type: 'slash', x: coord.x, y: coord.y });
                newVfx.push({ id: Date.now() + Math.random(), type: 'text', text: '-1', x: coord.x, y: coord.y, color: 'text-rose-500 font-bold text-xl' });
            }
        });
    }

    return { newUnits: newUnits.filter(u => u.hp > 0), logs: actionLogs, hasMeltdown, generatedVfx: newVfx };
  };

  // --- 選択中のユニットの広域移動マップを計算 ---
  const movementMap = useMemo(() => {
    if (selectedId && turn === 'player' && gameState === 'playing') {
      const sel = units.find(u => u.id === selectedId);
      if (sel) return getDistances(sel.x, sel.y, units);
    }
    return null;
  }, [selectedId, turn, gameState, units, getDistances]);

  const handleCellClick = (x, y) => {
    if (gameState !== 'playing' || turn !== 'player' || isProcessing || isWall(x, y)) return;

    const clickedUnit = units.find(u => u.x === x && u.y === y);

    if (!selectedId) {
      if (clickedUnit && clickedUnit.owner === 'player') { setSelectedId(clickedUnit.id); playSE('move'); }
      return;
    }

    const selectedUnit = units.find(u => u.id === selectedId);
    if (!selectedUnit) { setSelectedId(null); return; }

    // 自分自身をクリックした場合は冷却
    if (selectedUnit.x === x && selectedUnit.y === y) {
      if (!selectedUnit.hasActed && selectedUnit.heat > 0) {
        const actionResult = executeAction(units, selectedId, 'cooling', x, y);
        addLogs(actionResult.logs); setUnits(actionResult.newUnits);
        if (actionResult.generatedVfx.length > 0) addVfx(actionResult.generatedVfx);
        setSelectedId(null);
      } else setSelectedId(null); 
      return;
    }

    // 別の自分のユニットをクリックした場合は選択切り替え
    if (clickedUnit && clickedUnit.owner === 'player') {
      setSelectedId(clickedUnit.id); playSE('move'); return;
    }

    let actionResult = null;
    if (!clickedUnit) {
      // 一括移動処理
      if (movementMap) {
          const distance = movementMap[y][x];
          if (distance > 0 && distance !== Infinity) {
              const deltaHeat = !selectedUnit.hasActed ? distance - 1 : distance;
              // 限界値+1（自爆するマス）までは移動可能とする。それ以上は途中で燃え尽きるため不可。
              if (selectedUnit.heat + deltaHeat <= selectedUnit.maxHeat + 1) {
                  actionResult = executeAction(units, selectedId, 'move', x, y, distance);
              }
          }
      }
    } else if (clickedUnit.owner === 'cpu') {
      const attackables = getAttackableCells(selectedUnit, units);
      if (attackables.some(c => c.x === x && c.y === y)) actionResult = executeAction(units, selectedId, 'attack', x, y);
    }

    if (actionResult) {
      addLogs(actionResult.logs); setUnits(actionResult.newUnits);
      if (actionResult.generatedVfx.length > 0) addVfx(actionResult.generatedVfx);
      
      const nextWinner = checkWinner(actionResult.newUnits);
      if (nextWinner) handleWinner(nextWinner);
      if(actionResult.hasMeltdown || actionResult.newUnits.findIndex(u => u.id === selectedId) === -1) setSelectedId(null);
    }
  };

  const endTurn = () => {
    if (gameState !== 'playing' || turn !== 'player' || isProcessing) return;
    playSE('turnend'); 
    setSelectedId(null); setTurn('cpu');
    addLog(`=== TURN ${turnCount} END ===`, 'system');
  };

  // --- CPU AI LOGIC ---
  useEffect(() => {
    if (gameState === 'playing' && turn === 'cpu' && !winner) {
      setIsProcessing(true);
      let currentUnits = applyTurnStart(units, 'cpu');

      const cpuLogic = async () => {
        await new Promise(r => setTimeout(r, 800));

        for (let step = 0; step < 15; step++) {
          const cpuUnits = currentUnits.filter(u => u.owner === 'cpu');
          const pCore = currentUnits.find(u => u.id === 'p_core');
          if (!pCore) break;

          let bestAction = null; let bestScore = -9999;

          for (const unit of cpuUnits) {
            const isOverclock = unit.hasActed;
            const willMeltdown = isOverclock && (unit.heat >= unit.maxHeat);
            
            let baseScore = 0;
            if (isOverclock) baseScore -= 40; 
            if (willMeltdown) baseScore -= (unit.id === 'c_core') ? 100000 : 100;

            if (!isOverclock && unit.heat > 0) {
              let coolingScore = (unit.heat >= unit.maxHeat) ? 80 : 10;
              if (cpuLevel >= 2) {
                coolingScore += Math.random() * (cpuLevel === 2 ? 20 : 5);
                if (coolingScore > bestScore && coolingScore > 0) {
                  bestScore = coolingScore; bestAction = { unitId: unit.id, type: 'cooling', x: unit.x, y: unit.y };
                }
              }
            }

            const moveCoords = [
              { x: unit.x, y: unit.y - 1 }, { x: unit.x, y: unit.y + 1 }, { x: unit.x - 1, y: unit.y }, { x: unit.x + 1, y: unit.y }
            ].filter(m => m.x >= 0 && m.x < BOARD_SIZE && m.y >= 0 && m.y < BOARD_SIZE && !isWall(m.x, m.y));

            for (const m of moveCoords) {
              if (currentUnits.find(u => u.x === m.x && u.y === m.y)) continue; 
              let score = baseScore;
              const distToCore = getDistance(m.x, m.y, pCore.x, pCore.y);
              const currentDist = getDistance(unit.x, unit.y, pCore.x, pCore.y);
              
              if (unit.id === 'c_core') {
                const enemies = currentUnits.filter(u => u.owner === 'player');
                let minEnemyDist = 99;
                enemies.forEach(e => {
                  let d = getDistance(m.x, m.y, e.x, e.y); if (e.type === 'sniper') d -= 1; 
                  if (d < minEnemyDist) minEnemyDist = d;
                });
                if (minEnemyDist <= 3) score += minEnemyDist * 50; 
                else if (m.y > unit.y) score -= 20; 
              } else if (unit.type === 'sniper') {
                if (distToCore === 2 || distToCore === 3) score += 30; else if (distToCore < currentDist) score += 10;
              } else {
                if (distToCore < currentDist) score += 20; else score -= 10; 
              }

              if (cpuLevel === 1) score += Math.random() * 200;
              else if (cpuLevel === 2) score += Math.random() * 30;
              else score += Math.random() * 5;

              if (score > bestScore && score > 0) {
                bestScore = score; bestAction = { unitId: unit.id, type: 'move', x: m.x, y: m.y, d: 1 };
              }
            }

            const attackables = getAttackableCells(unit, currentUnits);
            for (const a of attackables) {
              const targetUnit = currentUnits.find(u => u.x === a.x && u.y === a.y);
              if (targetUnit && targetUnit.owner === 'player') {
                let score = baseScore;
                
                if (unit.type === 'hacker') {
                  const forcedMeltdown = (targetUnit.heat + 2) > targetUnit.maxHeat;
                  if (targetUnit.id === 'p_core') {
                    score += 200; if (forcedMeltdown) score += 10000; 
                  } else {
                    score += 60; if (forcedMeltdown) score += 300; 
                  }
                  
                  if (forcedMeltdown) {
                    const splashTargets = [{x: targetUnit.x, y: targetUnit.y - 1}, {x: targetUnit.x, y: targetUnit.y + 1}, {x: targetUnit.x - 1, y: targetUnit.y}, {x: targetUnit.x + 1, y: targetUnit.y}];
                    splashTargets.forEach(st => {
                      const victim = currentUnits.find(u => u.x === st.x && u.y === st.y);
                      if (victim && victim.id !== targetUnit.id) {
                        if (victim.owner === 'player') {
                          if (victim.id === 'p_core') { score += 800; if (victim.hp === 1) score += 10000; } 
                          else { score += 80; if (victim.hp === 1) score += 150; }
                        } else { score -= 50; }
                      }
                    });
                  }
                } else {
                  const dmg = (unit.type === 'heavy' || unit.type === 'core') ? 2 : 1;
                  const willKill = targetUnit.hp <= dmg;

                  if (targetUnit.id === 'p_core') {
                    score += 500; if (willKill) score += 10000; 
                  } else {
                    score += 50; if (willKill) score += 200; if (targetUnit.type === 'sniper') score += 30; 
                  }
                }

                if (willMeltdown && unit.id !== 'c_core') {
                  const splashTargets = [{x: unit.x, y: unit.y - 1}, {x: unit.x, y: unit.y + 1}, {x: unit.x - 1, y: unit.y}, {x: unit.x + 1, y: unit.y}];
                  splashTargets.forEach(st => {
                    const victim = currentUnits.find(u => u.x === st.x && u.y === st.y);
                    if (victim) {
                      if (victim.owner === 'player') {
                        if (victim.id === 'p_core') { score += 800; if (victim.hp === 1) score += 10000; } 
                        else { score += 80; if (victim.hp === 1) score += 150; }
                      } else { score -= 50; }
                    }
                  });
                }

                if (cpuLevel === 1) score += Math.random() * 300;
                else if (cpuLevel === 2) score += Math.random() * 40;
                else score += Math.random() * 5;

                if (score > bestScore && score > 0) {
                  bestScore = score; bestAction = { unitId: unit.id, type: 'attack', x: a.x, y: a.y };
                }
              }
            }
          }

          if (!bestAction) break; 

          const actionResult = executeAction(currentUnits, bestAction.unitId, bestAction.type, bestAction.x, bestAction.y, bestAction.d || 1);
          if (actionResult) {
            currentUnits = actionResult.newUnits;
            addLogs(actionResult.logs); setUnits([...currentUnits]);
            if (actionResult.generatedVfx.length > 0) addVfx(actionResult.generatedVfx);
            
            await new Promise(r => setTimeout(r, 800)); 

            const nextWinner = checkWinner(currentUnits);
            if (nextWinner) { handleWinner(nextWinner); break; }
          }
        }

        if (!checkWinner(currentUnits)) {
            currentUnits = applyTurnStart(currentUnits, 'player');
            setUnits(currentUnits); setTurnCount(c => c + 1); setTurn('player');
            addLog(`=== TURN ${turnCount + 1} ===`, 'system');
        }
        setIsProcessing(false);
      };

      cpuLogic();
    }
  }, [gameState, turn, winner, cpuLevel]);

  // --- RENDER ---
  const deadPlayerUnits = INITIAL_UNITS.filter(u => u.owner === 'player' && !units.some(alive => alive.id === u.id));
  const deadCpuUnits = INITIAL_UNITS.filter(u => u.owner === 'cpu' && !units.some(alive => alive.id === u.id));

  const renderCell = (x, y) => {
    const isWallCell = isWall(x, y);
    const unit = units.find(u => u.x === x && u.y === y);
    const isSelected = selectedId === unit?.id;
    const Icon = unit?.icon;
    const cellVfx = vfx.filter(v => v.x === x && v.y === y);

    let isTargetable = false; let isAttackable = false; let isCoolable = false; 
    let movePathType = ''; // 'safe' | 'heat' | 'meltdown'
    let attackPathType = '';
    
    if (selectedId && turn === 'player' && gameState === 'playing' && !isWallCell) {
      const selected = units.find(u => u.id === selectedId);
      if (selected) {
        // 冷却可能か
        if (selected.x === x && selected.y === y && !selected.hasActed && selected.heat > 0) isCoolable = true;

        // 広域移動可能か（BFSで計算した距離マップを利用）
        if (!unit && movementMap) {
            const distance = movementMap[y][x];
            if (distance > 0 && distance !== Infinity) {
                const deltaHeat = !selected.hasActed ? distance - 1 : distance;
                const futureHeat = selected.heat + deltaHeat;
                
                // 限界値+1（自爆する瞬間）までは到達可能。それ以上は途中で燃え尽きるため不可。
                if (futureHeat <= selected.maxHeat + 1) {
                    isTargetable = true;
                    if (futureHeat === selected.maxHeat + 1) movePathType = 'meltdown';
                    else if (deltaHeat > 0) movePathType = 'heat';
                    else movePathType = 'safe';
                }
            }
        }

        // 攻撃可能か
        if (unit && unit.owner === 'cpu') {
            const attackables = getAttackableCells(selected, units);
            if (attackables.some(c => c.x === x && c.y === y)) {
                isAttackable = true;
                const deltaHeat = !selected.hasActed ? 0 : 1;
                const futureHeat = selected.heat + deltaHeat;
                if (futureHeat > selected.maxHeat) attackPathType = 'meltdown';
                else if (deltaHeat > 0) attackPathType = 'heat';
                else attackPathType = 'safe';
            }
        }
      }
    }

    // groupクラスを追加し、ホバー時の挙動を制御できるようにする
    let cellClass = "group w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 border border-slate-800/50 flex flex-col items-center justify-center relative cursor-pointer transition-colors";
    
    if (isWallCell) {
      return (
        <div key={`${x}-${y}`} className={`${cellClass} bg-amber-950/30 border-amber-500/50 overflow-hidden relative shadow-[inset_0_0_15px_rgba(245,158,11,0.3)]`}>
          <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,#f59e0b_4px,#f59e0b_8px)] animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
          <div className="absolute inset-[2px] border border-amber-400/30 rounded-sm pointer-events-none" />
          <div className="relative z-10 flex items-center justify-center w-full h-full">
             <div className="border border-amber-500/80 p-[3px] bg-black/80 rounded-sm flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                <Lock size={12} className="text-amber-400 drop-shadow-[0_0_5px_#f59e0b]" />
             </div>
          </div>
        </div>
      );
    }

    // ハイライトの色分け処理
    if (isSelected && isCoolable) cellClass += " bg-emerald-900/40 border-emerald-500 shadow-[inset_0_0_10px_rgba(16,185,129,0.5)]";
    else if (isSelected) cellClass += " bg-cyan-900/40 border-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.5)]";
    else if (isAttackable) {
        if (attackPathType === 'meltdown') {
            cellClass += " bg-red-950/40 border-red-800/50 hover:bg-red-900/80 hover:border-red-500 hover:shadow-[inset_0_0_15px_rgba(239,68,68,0.8)]";
        }
        else if (attackPathType === 'heat') cellClass += " bg-amber-900/60 border-amber-500 hover:bg-amber-800/80 shadow-[inset_0_0_10px_rgba(245,158,11,0.5)]";
        else cellClass += " bg-rose-900/30 border-rose-500 hover:bg-rose-800/50";
    }
    else if (isTargetable) {
        if (movePathType === 'meltdown') {
            // 普段は非常に薄く見えなくしておき、カーソルを合わせた時だけ強烈に警告する
            cellClass += " bg-slate-900/10 border-slate-700/30 hover:bg-red-950/80 hover:border-red-500 hover:shadow-[inset_0_0_15px_rgba(239,68,68,0.8)] transition-all duration-200";
        }
        else if (movePathType === 'heat') cellClass += " bg-amber-900/40 border-amber-500 hover:bg-amber-800/60 shadow-[inset_0_0_10px_rgba(245,158,11,0.5)]";
        else cellClass += " bg-cyan-900/20 hover:bg-cyan-800/40 border-cyan-700 hover:border-cyan-400";
    }
    else cellClass += " bg-slate-900/30 hover:bg-slate-800/50";

    return (
      <div key={`${x}-${y}`} className={cellClass} onClick={() => handleCellClick(x, y)}>
        {/* ホバー時のメルトダウン警告（自爆するマスにカーソルを合わせた時のみ表示） */}
        {((isTargetable && movePathType === 'meltdown') || (isAttackable && attackPathType === 'meltdown')) && (
            <div className="absolute inset-0 hidden group-hover:flex items-center justify-center z-30 bg-red-900/40 pointer-events-none rounded">
                <Flame className="text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,1)]" size={24} />
            </div>
        )}

        {cellVfx.map(v => {
          if (v.type === 'text') {
            return (<div key={v.id} className={`absolute z-50 pointer-events-none animate-[slideUpFade_1s_ease-out_forwards] ${v.color}`}>{v.text}</div>);
          }
          return (
            <div key={v.id} className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
              {v.type === 'explosion' && <Flame className="text-amber-500 animate-[ping_0.5s_ease-out_forwards] opacity-80" size={32} />}
              {v.type === 'slash' && <X className="text-rose-500 animate-[ping_0.5s_ease-out_forwards] opacity-80" size={32} />}
              {v.type === 'laser' && <Crosshair className="text-cyan-300 animate-[ping_0.5s_ease-out_forwards] opacity-80" size={32} />}
            </div>
          );
        })}

        {unit && Icon && (
          <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
            unit.owner === 'player' ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]'
          } ${unit.hasActed ? 'scale-95' : 'scale-100 hover:scale-110'}`}>
            
            {!unit.hasActed && unit.owner === turn && gameState === 'playing' && (
              <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]" />
            )}

            {/* アイコンのみを半透明に */}
            <Icon size={20} className={`sm:w-7 sm:h-7 ${unit.hasActed ? 'opacity-40' : 'opacity-100'}`} />
            
            {/* HPゲージは常にくっきりと表示し、黒い座布団を敷く */}
            <div className="absolute top-0 right-0.5 flex gap-[1px] bg-slate-900/80 p-[1px] rounded-bl">
                {Array.from({length: unit.maxHp}).map((_, i) => (
                    <div key={`hp-${i}`} className={`w-1.5 sm:w-2 h-1.5 ${i < unit.hp ? (unit.owner === 'player' ? 'bg-cyan-400 shadow-[0_0_2px_#22d3ee]' : 'bg-rose-500 shadow-[0_0_2px_#f43f5e]') : 'bg-slate-700'}`} />
                ))}
            </div>

            {/* 熱ゲージも常にくっきりと表示し、太くする */}
            <div className="absolute bottom-0 w-full px-1 flex gap-[1px] bg-slate-900/80 p-[1px]">
                {Array.from({length: unit.maxHeat + 1}).map((_, i) => {
                    const bg = i < unit.heat ? "bg-orange-500 shadow-[0_0_2px_#f97316]" : "bg-slate-700";
                    return <div key={`heat-${i}`} className={`flex-1 h-1.5 ${bg}`} />
                })}
            </div>
            
            {unit.heat > unit.maxHeat && (
                <AlertTriangle size={12} className="absolute -top-1 -right-1 text-amber-400 animate-bounce bg-slate-900 rounded-full" />
            )}
          </div>
        )}
      </div>
    );
  };

  const playerUnits = units.filter(u => u.owner === 'player');
  const readyPlayerUnits = playerUnits.filter(u => !u.hasActed).length;

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center py-4 px-2 sm:px-4 relative overflow-hidden selection:bg-cyan-900 selection:text-cyan-100"
      onClick={initAudioAndStartBGM} 
    >
      
      {/* 📺 CRT Scanline Effect */}
      <div className="fixed inset-0 z-[100] opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" style={{ pointerEvents: 'none' }} />
      <div className="fixed inset-0 z-[100] opacity-5 mix-blend-overlay bg-blue-900 animate-[pulse_4s_ease-in-out_infinite]" style={{ pointerEvents: 'none' }} />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUpFade {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { transform: translateY(-10px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-30px) scale(1); opacity: 0; }
        }
      `}} />

      <audio ref={bgmRef} src="Surviving_Cyber.mp3" loop preload="auto" playsInline />

      {/* --- Title Screen --- */}
      {gameState === 'title' && (
        <div className="absolute inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center px-4">
          <Activity className="text-cyan-400 mb-6 w-20 h-20 animate-[pulse_2s_ease-in-out_infinite] drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
          <h1 className="text-4xl sm:text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 mb-12 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] text-center leading-tight">
            MELTDOWN<br/>TACTICS
          </h1>
          
          <div className="flex flex-col items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
             <p className="text-slate-400 font-mono text-sm tracking-[0.3em] mb-2">SELECT CPU DIFFICULTY</p>
             <div className="flex gap-4">
                 <button onClick={(e) => handleStart(e, 1)} className="px-6 py-3 border border-emerald-500 text-emerald-400 font-bold tracking-widest hover:bg-emerald-900/50 transition-colors">EASY</button>
                 <button onClick={(e) => handleStart(e, 2)} className="px-6 py-3 border border-amber-500 text-amber-400 font-bold tracking-widest hover:bg-amber-900/50 transition-colors">NORMAL</button>
                 <button onClick={(e) => handleStart(e, 3)} className="px-6 py-3 border border-rose-500 text-rose-400 font-bold tracking-widest hover:bg-rose-900/50 transition-colors shadow-[0_0_15px_rgba(244,63,94,0.3)]">HARD</button>
             </div>
          </div>
        </div>
      )}

      {/* --- Cut-in Screen --- */}
      {gameState === 'cutin' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className={`w-full py-10 sm:py-16 flex items-center justify-center border-y-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-[pulse_1s_ease-in-out_infinite] ${
            cutinText.includes('PLAYER') ? 'bg-cyan-950/80 border-cyan-400' : 'bg-rose-950/80 border-rose-500'
          }`}>
            <h2 className={`text-5xl sm:text-8xl font-black italic tracking-widest ${
              cutinText.includes('PLAYER') ? 'text-cyan-400 drop-shadow-[0_0_20px_#22d3ee]' : 'text-rose-500 drop-shadow-[0_0_20px_#f43f5e]'
            }`}>
              {cutinText}
            </h2>
          </div>
        </div>
      )}

      {/* --- Result Screen --- */}
      {gameState === 'result' && winner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 pointer-events-auto">
          <div className={`text-center p-8 md:p-16 rounded-2xl border-2 ${
            winner === 'player' ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_100px_rgba(34,211,238,0.3)]' :
            'border-rose-500 bg-rose-900/20 shadow-[0_0_100px_rgba(244,63,94,0.3)]'
          }`}>
            <div className="mb-2 text-slate-400 font-mono tracking-widest text-sm">SIMULATION COMPLETE</div>
            <h2 className={`text-6xl md:text-8xl font-black mb-6 ${
              winner === 'player' ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]' : 
              'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]'
            }`}>
              {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
            </h2>
            
            <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800 mb-8 inline-block text-left min-w-[250px]">
              <div className="flex justify-between border-b border-slate-700 pb-2 mb-2">
                <span className="text-slate-400">Total Turns</span>
                <span className="font-bold text-white">{turnCount}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-2 mb-2">
                <span className="text-slate-400">Units Survived</span>
                <span className="font-bold text-cyan-400">{units.filter(u => u.owner === 'player').length}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button onClick={(e) => handleStart(e, cpuLevel)} className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-white text-white font-black tracking-[0.2em] rounded-full hover:bg-white hover:text-black transition-all transform hover:scale-105">
                  RETRY (LV {cpuLevel})
              </button>
              <button onClick={handleReturnToTitle} className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-cyan-500 text-cyan-400 font-black tracking-[0.2em] rounded-full hover:bg-cyan-500 hover:text-slate-950 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] transform hover:scale-105">
                  CHANGE LEVEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl w-full flex justify-between items-center mb-4 z-10 relative">
        <div className="flex items-center gap-3">
          <Activity className="text-cyan-400" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            MELTDOWN_TACTICS
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); setShowHelp(true); }} className="p-2 text-slate-500 hover:text-cyan-400 transition-colors bg-slate-900/50 rounded border border-slate-800 z-50">
            <HelpCircle size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className="p-2 text-slate-500 hover:text-cyan-400 transition-colors bg-slate-900/50 rounded border border-slate-800 z-50">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-6xl w-full flex flex-col md:flex-row gap-6 z-10 relative">
        
        {/* Left: Board Area */}
        <div className="flex-1 flex flex-col items-center">
          
          {/* Status Bar */}
          <div className="w-full flex justify-between items-center mb-4 px-6 py-3 bg-[#0f172a]/80 backdrop-blur border border-slate-700/50 rounded-xl shadow-lg">
            <div className={`font-bold flex flex-col sm:flex-row items-center gap-2 ${turn === 'player' ? 'text-cyan-400 drop-shadow-[0_0_5px_#22d3ee]' : 'text-slate-600'}`}>
              <div className={`w-2 h-2 rounded-full hidden sm:block ${turn === 'player' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>PLAYER</span>
            </div>
            
            <div className="flex flex-col items-center mx-2">
               <span className="text-xl sm:text-2xl font-black tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  TURN {turnCount}
               </span>
               <div className="flex gap-1 mt-1">
                 {Array.from({length: playerUnits.length}).map((_, i) => (
                   <div key={i} className={`w-2 h-1 rounded-sm ${i < readyPlayerUnits ? 'bg-emerald-400' : 'bg-slate-800'}`} />
                 ))}
               </div>
            </div>

            <div className={`font-bold flex flex-col sm:flex-row items-center gap-2 ${turn === 'cpu' ? 'text-rose-500 drop-shadow-[0_0_5px_#f43f5e]' : 'text-slate-600'}`}>
              {isProcessing ? <span className="animate-pulse tracking-widest text-xs sm:text-base">COMPUTING...</span> : <span>CPU (Lv{cpuLevel})</span>}
              <div className={`w-2 h-2 rounded-full hidden sm:block ${turn === 'cpu' ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>
          </div>

          {/* Board */}
          <div className="bg-[#0f172a] p-3 sm:p-5 rounded-2xl border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
            {isProcessing && (
              <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl overflow-hidden border border-rose-500/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50 shadow-[0_0_15px_#f43f5e] animate-[scan_2s_linear_infinite]" />
              </div>
            )}
            <div className={`grid grid-cols-9 gap-[2px] bg-slate-950 p-1 rounded`}>
              {Array.from({ length: BOARD_SIZE }).map((_, y) => 
                Array.from({ length: BOARD_SIZE }).map((_, x) => renderCell(x, y))
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-6 w-full flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0f172a]/80 p-4 rounded-xl border border-slate-800 backdrop-blur">
            <div className="text-[10px] sm:text-xs text-slate-400 font-mono text-center sm:text-left leading-relaxed">
              <span className="text-emerald-400 font-bold">1. 緑ランプ</span>: 通常行動 (移動/攻撃/自身クリックで冷却)<br/>
              <span className="text-amber-500 font-bold">2. OVERCLOCK</span>: 行動済みコマの再行動(Heat🔥+1)<br/>
              <span className="text-rose-500 font-bold">3. MELTDOWN</span>: Heat限界突破で自爆(周囲に1DMG)<br/>
              <span className="text-cyan-400 font-bold">【青枠】</span>: 安全な移動範囲 / <span className="text-amber-500 font-bold">【黄枠】</span>: Heat上昇範囲 / <span className="text-red-500 font-bold">【炎アイコン】</span>: メルトダウン
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); endTurn(); }}
              disabled={gameState !== 'playing' || turn !== 'player' || isProcessing}
              className={`px-8 py-4 rounded-lg text-sm font-bold tracking-widest transition-all whitespace-nowrap overflow-hidden relative group z-50 ${
                gameState === 'playing' && turn === 'player' && !isProcessing
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-400 hover:bg-cyan-900 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              END TURN
            </button>
          </div>
        </div>

        {/* Right: Info & Logs */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-lg">
            <h3 className="text-slate-400 font-bold mb-3 border-b border-slate-700/50 pb-2 flex items-center gap-2 text-sm tracking-widest">
               <Terminal size={14} className="text-cyan-500"/> UNIT DATABANK
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50">
                <div className="text-cyan-400 mt-0.5"><Crown size={16}/></div>
                <div><p className="font-bold text-slate-200">CORE <span className="text-slate-500 font-normal ml-1">HP:4/ATK:2/Heat:2</span></p></div>
              </li>
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50">
                <div className="text-cyan-400 mt-0.5"><Eye size={16}/></div>
                <div><p className="font-bold text-slate-200">HACKER <span className="text-slate-500 font-normal ml-1">HP:1/ATK:0/Heat:2</span></p><p className="text-[10px] text-amber-400/80 mt-0.5">Forces target Heat +2</p></div>
              </li>
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50">
                <div className="text-cyan-400 mt-0.5"><Shield size={16}/></div>
                <div><p className="font-bold text-slate-200">HEAVY <span className="text-slate-500 font-normal ml-1">HP:2/ATK:2/Heat:1</span></p></div>
              </li>
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50">
                <div className="text-cyan-400 mt-0.5"><Zap size={16}/></div>
                <div><p className="font-bold text-slate-200">SPEED <span className="text-slate-500 font-normal ml-1">HP:1/ATK:1/Heat:3</span></p></div>
              </li>
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50">
                <div className="text-cyan-400 mt-0.5"><Target size={16}/></div>
                <div><p className="font-bold text-slate-200">SNIPER <span className="text-slate-500 font-normal ml-1">HP:1/ATK:1/Heat:2</span></p></div>
              </li>
            </ul>
          </div>

          {/* Casualties */}
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-lg">
             <h3 className="text-slate-500 font-bold mb-3 border-b border-slate-700/50 pb-2 flex items-center justify-between text-xs tracking-widest">
               <span>☠️ CASUALTIES</span>
             </h3>
             <div className="flex justify-between">
                 <div className="w-1/2 pr-2 border-r border-slate-700/50 min-h-[30px] flex flex-wrap gap-1 content-start">
                     {deadPlayerUnits.map((u, i) => <u.icon key={`dp-${i}`} size={16} className="text-cyan-600 opacity-80 drop-shadow-[0_0_3px_rgba(8,145,178,0.8)]" />)}
                 </div>
                 <div className="w-1/2 pl-2 min-h-[30px] flex flex-wrap gap-1 content-start">
                     {deadCpuUnits.map((u, i) => <u.icon key={`dc-${i}`} size={16} className="text-rose-600 opacity-80 drop-shadow-[0_0_3px_rgba(225,29,72,0.8)]" />)}
                 </div>
             </div>
          </div>

          {/* System Log */}
          {/* 高さを固定(h-64 md:h-[28rem])し、親要素に合わせて伸びないよう(shrink-0)にしてスクロールを有効化 */}
          <div className="h-64 md:h-[28rem] shrink-0 bg-[#0a0f18] border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-hidden flex flex-col relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
            <div className="text-cyan-600 font-bold mb-3 pb-2 border-b border-cyan-900/30 flex items-center justify-between shrink-0 z-10 tracking-widest">
              <span>&gt;_ SYSTEM_LOG</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent pr-2 pt-1">
              {logs.map((log) => {
                let color = "text-slate-500";
                let IconStr = "▶";
                
                if (log.type === 'move') { color = "text-cyan-600"; IconStr = "🏃"; }
                if (log.type === 'attack') { color = "text-rose-400"; IconStr = "⚔️"; }
                if (log.type === 'cool') { color = "text-emerald-400"; IconStr = "❄️"; }
                if (log.type === 'overclock') { color = "text-orange-400"; IconStr = "🔥"; }
                if (log.type === 'meltdown') { color = "text-red-500 font-bold"; IconStr = "💥"; }
                if (log.type === 'damage') { color = "text-rose-600"; IconStr = "🩸"; }
                if (log.type === 'warning') { color = "text-amber-400"; IconStr = "⚠️"; }
                if (log.type === 'system') { color = "text-cyan-300"; IconStr = "💻"; }
                
                const UnitIcon = log.icon;

                return (
                  <div key={log.id} className={`whitespace-pre-wrap leading-relaxed flex items-start gap-1.5 ${color}`}>
                    <span className="opacity-80 shrink-0 mt-[1px] text-[10px]">{IconStr}</span>
                    {UnitIcon && <UnitIcon size={12} className={`shrink-0 mt-[2px] ${log.iconColor}`} />}
                    <span className="flex-1 break-words">{log.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* --- Settings Modal --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="bg-slate-900 border border-cyan-500 rounded-xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(6,182,212,0.2)] relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-cyan-400 mb-8 flex items-center gap-2 tracking-widest">
              <Settings size={20}/> AUDIO CONFIG
            </h2>
            
            <div className="space-y-8">
              <div>
                <label className="flex items-center justify-between text-sm text-slate-400 mb-3 font-mono">
                  <span>MUSIC VOL</span>
                  <span>{Math.round(bgmVolume * 100)}%</span>
                </label>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={bgmVolume} onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm text-slate-400 mb-3 font-mono">
                  <span>EFFECTS VOL</span>
                  <span>{Math.round(seVolume * 100)}%</span>
                </label>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={seVolume} onChange={(e) => {
                    setSeVolume(parseFloat(e.target.value));
                    playSE('move'); 
                  }}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Help Modal --- */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="bg-slate-900 border border-cyan-500 rounded-2xl p-6 max-w-2xl w-full h-[80vh] overflow-y-auto shadow-[0_0_50px_rgba(6,182,212,0.2)] relative scrollbar-thin scrollbar-thumb-cyan-900">
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-cyan-400 mb-8 flex items-center gap-3 tracking-widest border-b border-slate-800 pb-4">
              <HelpCircle size={24}/> TACTICAL MANUAL
            </h2>
            
            <div className="space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
              <section>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-cyan-500">01.</span> VICTORY CONDITION
                </h3>
                <p className="bg-slate-950 p-4 rounded border border-slate-800">
                  相手の<strong className="text-cyan-400">CORE（王）</strong>のHPを0にすれば勝利です。自分のCOREが破壊されると敗北します。
                </p>
              </section>
              
              <section>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-cyan-500">02.</span> BASIC ACTIONS
                </h3>
                <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-3">
                  <p>自分のターン中、<strong className="text-emerald-400">各ユニットは1回ずつ</strong>安全に行動（移動 または 攻撃）することができます。</p>
                  <p>まだ行動していないユニットには、左上に<strong className="text-emerald-400">緑色のランプ</strong>が点灯します。</p>
                  <p>★ 今回のアップデートにより、<strong>青くハイライトされた遠くのマスをクリックして一気に移動</strong>できるようになりました。</p>
                  <div className="border-l-2 border-emerald-500 pl-4 mt-2">
                    <strong className="text-emerald-400 block mb-1">【COOLING (冷却)】</strong>
                    未行動（緑ランプ点灯）かつ 熱が溜まっているコマを選択し、<strong>自分自身のマスをもう一度クリックする</strong>と、そのターンは動かずに「冷却」を行います。行動権を消費し、Heatが 1 下がります。
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
                  <span className="text-amber-500">03.</span> OVERCLOCK & MELTDOWN
                </h3>
                <div className="bg-slate-950 p-4 rounded border border-slate-800 border-l-amber-500 space-y-3">
                  <p>「すでに1回行動したユニット」を選択し、さらに行動させることも可能です。これが<strong className="text-amber-400">「OVERCLOCK」</strong>です。</p>
                  <ul className="list-disc pl-5 space-y-2 marker:text-amber-500">
                    <li>オーバークロックで行動すると、そのユニットの <strong className="text-orange-500">Heat（熱ゲージ）</strong> が 1 上昇します。（遠くまで一気に移動した場合は、距離に応じてHeatがまとめて上昇します）</li>
                    <li>Heatが「MaxHeat（限界値）」を超えた瞬間、そのユニットは<strong className="text-red-500 font-bold">メルトダウン（自爆）</strong>します！</li>
                    <li>自爆したユニットは消滅し、<strong>周囲十字4マスにいる全てのユニット（味方含む）に 1 ダメージ（貫通）</strong>を与えます。</li>
                  </ul>
                </div>
              </section>
              
              <section>
                <h4 className="text-sky-400 font-bold mb-3 border-t border-slate-700 pt-4">04_ UNIT TYPES</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3"><Crown className="text-cyan-400 shrink-0"/> <div><strong>CORE (王)</strong>: 高い耐久力と熱限界を持つ。倒されると敗北。</div></li>
                  <li className="flex items-start gap-3"><Shield className="text-cyan-400 shrink-0"/> <div><strong>HEAVY (盾)</strong>: 攻撃力2の強力な一撃を持つが、熱限界が「1」しかないため、オーバークロックするとすぐに自爆してしまう。</div></li>
                  <li className="flex items-start gap-3"><Zap className="text-cyan-400 shrink-0"/> <div><strong>SPEED (雷)</strong>: 攻撃力は低いが、熱限界が「3」もあるため、1ターンの間に何度も安全にオーバークロックして遠くまで移動できる。</div></li>
                  <li className="flex items-start gap-3"><Target className="text-cyan-400 shrink-0"/> <div><strong>SNIPER (的)</strong>: 2〜3マス先の遠距離から一方的に攻撃できる。</div></li>
                  <li className="flex items-start gap-3"><Eye className="text-cyan-400 shrink-0"/> <div><strong>HACKER (眼)</strong>: ダメージを与えない代わりに、相手の熱を+2し、強制メルトダウンを誘発する。</div></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
