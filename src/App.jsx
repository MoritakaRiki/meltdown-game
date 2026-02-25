import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Crown, Shield, Zap, Target, Terminal, AlertTriangle, Activity, Lock, Settings, HelpCircle, X, Flame, Crosshair } from 'lucide-react';

const BOARD_SIZE = 9;

// ★ 公開時にMP3ファイルを使う場合は、ここを true に変更してください ★
// true にすると、publicフォルダ内の Surviving_Cyber.mp3 が再生されます。
const USE_MP3_BGM = true;

const WALLS = [
  { x: 2, y: 2 }, { x: 6, y: 2 },
  { x: 4, y: 4 }, // 中央の要塞
  { x: 2, y: 6 }, { x: 6, y: 6 }
];

const INITIAL_UNITS = [
  // Player Units
  { id: 'p_core', owner: 'player', type: 'core', x: 4, y: 8, hp: 4, maxHp: 4, heat: 0, maxHeat: 2, hasActed: false, icon: Crown, label: 'Core' },
  { id: 'p_heavy1', owner: 'player', type: 'heavy', x: 3, y: 8, hp: 2, maxHp: 2, heat: 0, maxHeat: 1, hasActed: false, icon: Shield, label: 'Heavy' },
  { id: 'p_heavy2', owner: 'player', type: 'heavy', x: 5, y: 8, hp: 2, maxHp: 2, heat: 0, maxHeat: 1, hasActed: false, icon: Shield, label: 'Heavy' },
  { id: 'p_sniper1', owner: 'player', type: 'sniper', x: 2, y: 8, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Target, label: 'Sniper' },
  { id: 'p_sniper2', owner: 'player', type: 'sniper', x: 6, y: 8, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Target, label: 'Sniper' },
  { id: 'p_speed1', owner: 'player', type: 'speed', x: 3, y: 7, hp: 1, maxHp: 1, heat: 0, maxHeat: 3, hasActed: false, icon: Zap, label: 'Speed' },
  { id: 'p_speed2', owner: 'player', type: 'speed', x: 5, y: 7, hp: 1, maxHp: 1, heat: 0, maxHeat: 3, hasActed: false, icon: Zap, label: 'Speed' },
  
  // CPU Units
  { id: 'c_core', owner: 'cpu', type: 'core', x: 4, y: 0, hp: 4, maxHp: 4, heat: 0, maxHeat: 2, hasActed: false, icon: Crown, label: 'Core' },
  { id: 'c_heavy1', owner: 'cpu', type: 'heavy', x: 3, y: 0, hp: 2, maxHp: 2, heat: 0, maxHeat: 1, hasActed: false, icon: Shield, label: 'Heavy' },
  { id: 'c_heavy2', owner: 'cpu', type: 'heavy', x: 5, y: 0, hp: 2, maxHp: 2, heat: 0, maxHeat: 1, hasActed: false, icon: Shield, label: 'Heavy' },
  { id: 'c_sniper1', owner: 'cpu', type: 'sniper', x: 2, y: 0, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Target, label: 'Sniper' },
  { id: 'c_sniper2', owner: 'cpu', type: 'sniper', x: 6, y: 0, hp: 1, maxHp: 1, heat: 0, maxHeat: 2, hasActed: false, icon: Target, label: 'Sniper' },
  { id: 'c_speed1', owner: 'cpu', type: 'speed', x: 3, y: 1, hp: 1, maxHp: 1, heat: 0, maxHeat: 3, hasActed: false, icon: Zap, label: 'Speed' },
  { id: 'c_speed2', owner: 'cpu', type: 'speed', x: 5, y: 1, hp: 1, maxHp: 1, heat: 0, maxHeat: 3, hasActed: false, icon: Zap, label: 'Speed' },
];

export default function MeltdownTactics() {
  const [gameState, setGameState] = useState('title'); 
  const [cutinText, setCutinText] = useState("");
  
  const [units, setUnits] = useState(INITIAL_UNITS.map(u => ({...u}))); 
  const [turn, setTurn] = useState(null); 
  const [turnCount, setTurnCount] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [logs, setLogs] = useState(["SYSTEM_START: AWAITING INITIALIZATION..."]);
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

  const addLog = useCallback((msg) => {
    setLogs(prev => [`[T${turnCount}] ${msg}`, ...prev]);
  }, [turnCount]);

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

    const kickPattern = [
      1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
      1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0,
      1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
      1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,1,0
    ];
    
    const hatPattern = [
      0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1,
      0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,0,1,
      0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1,
      0,0,1,0, 0,0,1,0, 0,1,1,0, 1,1,1,1
    ];

    const bassPattern = [
      A1, 0, 0, 0, A1, 0, G1, 0,  A1, 0, 0, 0, C2, 0, E1, 0,
      F1, 0, 0, 0, F1, 0, G1, 0,  F1, 0, 0, 0, E1, 0, C2, 0,
      D2, 0, 0, 0, D2, 0, C2, 0,  D2, 0, 0, 0, F2, 0, E2, 0,
      A1, 0, 0, 0, C2, 0, D2, 0,  E2, 0, 0, 0, G2, 0, 0, 0
    ];

    const arpPattern = [
      A2, 0, 0, C3, 0, E3, 0, 0,  G3, 0, 0, D3, 0, 0, E3, 0,
      0, A3, 0, 0, G3, 0, 0, C3,  0, E3, 0, 0, A2, 0, 0, 0,
      D3, 0, 0, F3, 0, A3, 0, 0,  C3, 0, 0, E3, 0, 0, G3, 0,
      A3, 0, 0, 0, E3, 0, 0, C3,  D3, 0, 0, A2, 0, 0, 0, 0
    ];

    synthIntervalRef.current = setInterval(() => {
      const now = ctx.currentTime;
      const vol = bgmVolumeRef.current;
      if (vol <= 0) { step++; return; }
      const s = step % 64;

      if (kickPattern[s]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);
        gain.gain.setValueAtTime(vol * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      }

      if (hatPattern[s]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = 8000;
        gain.gain.setValueAtTime(vol * 0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
      }

      if (bassPattern[s] > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(bassPattern[s], now);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.2); 
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(vol * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      }

      if (arpPattern[s] > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(arpPattern[s], now);
        
        gain.gain.setValueAtTime(vol * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8); 
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
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    const now = ctx.currentTime;
    
    if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gainNode.gain.setValueAtTime(vol * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } 
    else if (type === 'cooling') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      gainNode.gain.setValueAtTime(vol * 0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
    else if (type === 'attack') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gainNode.gain.setValueAtTime(vol * 0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
    else if (type === 'sniper') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      gainNode.gain.setValueAtTime(vol * 0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    }
    else if (type === 'explosion') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
      gainNode.gain.setValueAtTime(vol * 0.8, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(50, now);
      osc2.frequency.exponentialRampToValueAtTime(10, now + 0.5);
      osc2.connect(gainNode);
      osc.start(now); osc.stop(now + 0.5);
      osc2.start(now); osc2.stop(now + 0.5);
    }
    else if (type === 'win') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now); 
      osc.frequency.setValueAtTime(554, now + 0.15); 
      osc.frequency.setValueAtTime(659, now + 0.3); 
      osc.frequency.setValueAtTime(880, now + 0.45); 
      gainNode.gain.setValueAtTime(vol * 0.15, now); 
      gainNode.gain.linearRampToValueAtTime(vol * 0.15, now + 0.6);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      osc.start(now); osc.stop(now + 1.5);
    }
    else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 1.5);
      gainNode.gain.setValueAtTime(vol * 0.2, now); 
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      osc.start(now); osc.stop(now + 1.5);
    }
  };

  // --- GAME FLOW CONTROLS ---

  const initAudioAndStartBGM = () => {
    if (!audioInitialized) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext && !audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        
        if (USE_MP3_BGM) {
          if (bgmRef.current) {
            bgmRef.current.volume = bgmVolume;
            bgmRef.current.play().catch(e => console.warn("MP3 Play Error:", e));
          }
        } else {
          startSynthBGM();
        }
      } catch (err) {
        console.warn("Audio Context init error:", err);
      }
      
      setAudioInitialized(true);
    }
  };

  const handleStart = (e) => {
    e.stopPropagation(); 
    try {
      initAudioAndStartBGM();
    } catch(err) {
      console.warn("Start handle error:", err);
    }

    setGameState('cutin');
    const firstTurn = Math.random() < 0.5 ? 'player' : 'cpu';
    setCutinText(`${firstTurn.toUpperCase()} FIRST`);
    
    setTimeout(() => {
      setGameState('playing');
      setTurn(firstTurn);
      setLogs([
        `=== TURN 1 : ${firstTurn.toUpperCase()} ===`,
        `SYSTEM_INITIALIZED: ${firstTurn.toUpperCase()} GOES FIRST.`
      ]);
    }, 2000);
  };

  const restartGame = () => {
    setUnits(INITIAL_UNITS.map(u => ({...u})));
    setTurnCount(1);
    setSelectedId(null);
    setLogs(["SYSTEM_START: SYSTEM REBOOTED..."]);
    setWinner(null);
    setIsProcessing(false);
    setVfx([]);
    
    try {
      if (USE_MP3_BGM) {
        if (bgmRef.current) {
          bgmRef.current.volume = bgmVolume;
          bgmRef.current.currentTime = 0;
          const playPromise = bgmRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(()=>{});
          }
        }
      } else {
        startSynthBGM();
      }
    } catch (err) {
      console.warn(err);
    }

    setGameState('cutin');
    const firstTurn = Math.random() < 0.5 ? 'player' : 'cpu';
    setCutinText(`${firstTurn.toUpperCase()} FIRST`);
    
    setTimeout(() => {
      setGameState('playing');
      setTurn(firstTurn);
      setLogs([
        `=== TURN 1 : ${firstTurn.toUpperCase()} ===`,
        `SYSTEM_START: SYSTEM REBOOTED. ${firstTurn.toUpperCase()} GOES FIRST.`
      ]);
    }, 2000);
  };

  const handleWinner = (nextWinner) => {
    setWinner(nextWinner);
    setGameState('result');
    addLog(`=== GAME OVER: ${nextWinner.toUpperCase()} WINS ===`);
    
    if (USE_MP3_BGM) {
      if (bgmRef.current) bgmRef.current.volume = 0.1;
    } else {
      stopSynthBGM();
    }
    
    if (nextWinner === 'player') playSE('win');
    else if (nextWinner === 'cpu') playSE('lose');
  };

  // --- LOGIC ---

  const addVfx = (newVfxArray) => {
    setVfx(prev => [...prev, ...newVfxArray]);
    setTimeout(() => {
      setVfx(prev => prev.filter(v => !newVfxArray.map(n => n.id).includes(v.id)));
    }, 1000); 
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

  const getAttackableCells = (unit, currentUnits) => {
    const cells = [];
    if (!unit) return cells;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    if (unit.type === 'sniper') {
      for (const [dx, dy] of dirs) {
        for (let dist = 1; dist <= 3; dist++) {
          const tx = unit.x + dx * dist;
          const ty = unit.y + dy * dist;
          if (tx < 0 || tx >= BOARD_SIZE || ty < 0 || ty >= BOARD_SIZE) break; 
          if (isWall(tx, ty)) break; 
          const target = currentUnits.find(u => u.x === tx && u.y === ty);
          if (dist >= 2) cells.push({ x: tx, y: ty, hasTarget: !!target });
          if (target) break; 
        }
      }
    } else {
      for (const [dx, dy] of dirs) {
        cells.push({ x: unit.x + dx, y: unit.y + dy, hasTarget: true });
      }
    }
    return cells;
  };

  const applyTurnStart = (currentUnits, owner) => {
    return currentUnits.map(u => {
        if(u.owner === owner) return { ...u, hasActed: false };
        return u;
    });
  };

  const executeAction = (stateUnits, actorId, actionType, targetX, targetY) => {
    let newUnits = [...stateUnits];
    let newVfx = [];
    const actorIndex = newUnits.findIndex(u => u.id === actorId);
    if (actorIndex === -1) return { newUnits, log: "ERROR: UNIT NOT FOUND", vfx: [] };
    
    let actor = { ...newUnits[actorIndex] };
    const isOverclock = actor.hasActed;
    let logStr = "";
    const actionPrefix = isOverclock ? "[OVERCLOCK] " : "[ACTION] ";
    
    if (actionType === 'move') {
      actor.x = targetX;
      actor.y = targetY;
      logStr = `${actionPrefix}${actor.owner.toUpperCase()} ${actor.label} moved.`;
      playSE('move');
    } else if (actionType === 'attack') {
      const targetIndex = newUnits.findIndex(u => u.x === targetX && u.y === targetY);
      if (targetIndex !== -1) {
        let target = { ...newUnits[targetIndex] };
        const damage = (actor.type === 'heavy' || actor.type === 'core') ? 2 : 1;
        target.hp -= damage;
        logStr = `${actionPrefix}${actor.owner.toUpperCase()} ${actor.label} attacked for ${damage} DMG!`;
        newUnits[targetIndex] = target;
        
        if (actor.type === 'sniper') {
          playSE('sniper');
          newVfx.push({ id: Date.now(), type: 'laser', x: targetX, y: targetY });
        } else {
          playSE('attack');
          newVfx.push({ id: Date.now(), type: 'slash', x: targetX, y: targetY });
        }
        newVfx.push({ id: Date.now()+1, type: 'text', text: `-${damage}`, x: targetX, y: targetY, color: 'text-rose-400 font-bold text-2xl drop-shadow-[0_0_8px_#f43f5e]' });
      }
    } else if (actionType === 'cooling') {
      actor.heat = Math.max(0, actor.heat - 1);
      logStr = `${actionPrefix}${actor.owner.toUpperCase()} ${actor.label} COOLED DOWN (Heat -1).`;
      playSE('cooling');
      newVfx.push({ id: Date.now(), type: 'text', text: 'COOL -1', x: actor.x, y: actor.y, color: 'text-emerald-400 font-bold drop-shadow-[0_0_8px_#34d399]' });
    }

    if (!isOverclock) {
      actor.hasActed = true; 
    } else {
      if (actionType !== 'cooling') {
        actor.heat += 1; 
        newVfx.push({ id: Date.now()+2, type: 'text', text: 'HEAT UP!', x: actor.x, y: actor.y, color: 'text-orange-400 font-bold' });
      }
    }

    newUnits[actorIndex] = actor;

    let hasMeltdown = false;
    if (actor.heat > actor.maxHeat) {
        hasMeltdown = true;
        playSE('explosion');
        logStr += `\n!!! WARNING: ${actor.owner.toUpperCase()} ${actor.label} MELTDOWN !!!`;
        
        newVfx.push({ id: Date.now() + 3, type: 'explosion', x: actor.x, y: actor.y });
        newVfx.push({ id: Date.now() + 4, type: 'text', text: 'MELTDOWN!', x: actor.x, y: actor.y, color: 'text-red-500 font-black text-2xl drop-shadow-[0_0_10px_#ef4444]' });

        const adjacentCoords = [
            {x: actor.x, y: actor.y - 1}, {x: actor.x, y: actor.y + 1},
            {x: actor.x - 1, y: actor.y}, {x: actor.x + 1, y: actor.y}
        ];
        
        actor.hp = 0; 
        newUnits[actorIndex] = actor;

        adjacentCoords.forEach(coord => {
            const victimIdx = newUnits.findIndex(u => u.x === coord.x && u.y === coord.y && u.hp > 0);
            if(victimIdx !== -1) {
                let victim = {...newUnits[victimIdx]};
                victim.hp -= 1;
                newUnits[victimIdx] = victim;
                logStr += `\n> Splash DMG to [${coord.x},${coord.y}]!`;
                newVfx.push({ id: Date.now() + Math.random(), type: 'slash', x: coord.x, y: coord.y });
                newVfx.push({ id: Date.now() + Math.random(), type: 'text', text: '-1', x: coord.x, y: coord.y, color: 'text-rose-500 font-bold text-xl' });
            }
        });
    }

    const finalUnits = newUnits.filter(u => u.hp > 0);
    return { newUnits: finalUnits, log: logStr, hasMeltdown, generatedVfx: newVfx };
  };

  const handleCellClick = (x, y) => {
    if (gameState !== 'playing' || turn !== 'player' || isProcessing || isWall(x, y)) return;

    const clickedUnit = units.find(u => u.x === x && u.y === y);

    if (!selectedId) {
      if (clickedUnit && clickedUnit.owner === 'player') {
        setSelectedId(clickedUnit.id);
        playSE('move');
      }
      return;
    }

    const selectedUnit = units.find(u => u.id === selectedId);
    if (!selectedUnit) {
      setSelectedId(null);
      return;
    }

    if (selectedUnit.x === x && selectedUnit.y === y) {
      if (!selectedUnit.hasActed && selectedUnit.heat > 0) {
        const actionResult = executeAction(units, selectedId, 'cooling', x, y);
        addLog(actionResult.log);
        setUnits(actionResult.newUnits);
        if (actionResult.generatedVfx.length > 0) addVfx(actionResult.generatedVfx);
        setSelectedId(null);
      } else {
        setSelectedId(null); 
      }
      return;
    }

    if (clickedUnit && clickedUnit.owner === 'player') {
      setSelectedId(clickedUnit.id);
      playSE('move');
      return;
    }

    let actionResult = null;

    if (!clickedUnit) {
      if (getDistance(selectedUnit.x, selectedUnit.y, x, y) === 1) {
        actionResult = executeAction(units, selectedId, 'move', x, y);
      }
    } else if (clickedUnit.owner === 'cpu') {
      const attackables = getAttackableCells(selectedUnit, units);
      if (attackables.some(c => c.x === x && c.y === y)) {
        actionResult = executeAction(units, selectedId, 'attack', x, y);
      }
    }

    if (actionResult) {
      addLog(actionResult.log);
      setUnits(actionResult.newUnits);
      if (actionResult.generatedVfx.length > 0) addVfx(actionResult.generatedVfx);
      
      const nextWinner = checkWinner(actionResult.newUnits);
      if (nextWinner) {
        handleWinner(nextWinner);
      }
      
      if(actionResult.hasMeltdown || actionResult.newUnits.findIndex(u => u.id === selectedId) === -1) {
          setSelectedId(null);
      }
    }
  };

  const endTurn = () => {
    if (gameState !== 'playing' || turn !== 'player' || isProcessing) return;
    setSelectedId(null);
    setTurn('cpu');
    addLog(`=== TURN ${turnCount} : CPU ===`);
  };

  // CPU AI
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

          let bestAction = null;
          let bestScore = -9999;

          for (const unit of cpuUnits) {
            const isOverclock = unit.hasActed;
            const willMeltdown = isOverclock && (unit.heat >= unit.maxHeat);
            
            let baseScore = 0;
            if (isOverclock) baseScore -= 40; 
            if (willMeltdown) baseScore -= (unit.id === 'c_core') ? 100000 : 100;

            if (!isOverclock && unit.heat > 0) {
              let coolingScore = (unit.heat >= unit.maxHeat) ? 80 : 10;
              coolingScore += Math.random() * 5;
              if (coolingScore > bestScore && coolingScore > 0) {
                bestScore = coolingScore;
                bestAction = { unitId: unit.id, type: 'cooling', x: unit.x, y: unit.y };
              }
            }

            const moveCoords = [
              { x: unit.x, y: unit.y - 1 }, { x: unit.x, y: unit.y + 1 },
              { x: unit.x - 1, y: unit.y }, { x: unit.x + 1, y: unit.y }
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
                  let d = getDistance(m.x, m.y, e.x, e.y);
                  if (e.type === 'sniper') d -= 1; 
                  if (d < minEnemyDist) minEnemyDist = d;
                });
                if (minEnemyDist <= 3) score += minEnemyDist * 50; 
                else if (m.y > unit.y) score -= 20; 
              } else if (unit.type === 'sniper') {
                if (distToCore === 2 || distToCore === 3) score += 30;
                else if (distToCore < currentDist) score += 10;
              } else {
                if (distToCore < currentDist) score += 20; 
                else score -= 10; 
              }

              score += Math.random() * 5;
              if (score > bestScore && score > 0) {
                bestScore = score;
                bestAction = { unitId: unit.id, type: 'move', x: m.x, y: m.y };
              }
            }

            const attackables = getAttackableCells(unit, currentUnits);
            for (const a of attackables) {
              const targetUnit = currentUnits.find(u => u.x === a.x && u.y === a.y);
              if (targetUnit && targetUnit.owner === 'player') {
                let score = baseScore;
                const dmg = (unit.type === 'heavy' || unit.type === 'core') ? 2 : 1;
                const willKill = targetUnit.hp <= dmg;

                if (targetUnit.id === 'p_core') {
                  score += 500; 
                  if (willKill) score += 10000; 
                } else {
                  score += 50; 
                  if (willKill) score += 200; 
                  if (targetUnit.type === 'sniper') score += 30; 
                }

                if (willMeltdown && unit.id !== 'c_core') {
                  const splashTargets = [
                    {x: unit.x, y: unit.y - 1}, {x: unit.x, y: unit.y + 1},
                    {x: unit.x - 1, y: unit.y}, {x: unit.x + 1, y: unit.y}
                  ];
                  splashTargets.forEach(st => {
                    const victim = currentUnits.find(u => u.x === st.x && u.y === st.y);
                    if (victim) {
                      if (victim.owner === 'player') {
                        if (victim.id === 'p_core') {
                          score += 800; 
                          if (victim.hp === 1) score += 10000; 
                        } else {
                          score += 80;
                          if (victim.hp === 1) score += 150;
                        }
                      } else {
                        score -= 50; 
                      }
                    }
                  });
                }

                score += Math.random() * 5;
                if (score > bestScore && score > 0) {
                  bestScore = score;
                  bestAction = { unitId: unit.id, type: 'attack', x: a.x, y: a.y };
                }
              }
            }
          }

          if (!bestAction) break; 

          const actionResult = executeAction(currentUnits, bestAction.unitId, bestAction.type, bestAction.x, bestAction.y);
          
          if (actionResult) {
            currentUnits = actionResult.newUnits;
            addLog(actionResult.log);
            setUnits([...currentUnits]);
            if (actionResult.generatedVfx.length > 0) addVfx(actionResult.generatedVfx);
            
            await new Promise(r => setTimeout(r, 800)); 

            const nextWinner = checkWinner(currentUnits);
            if (nextWinner) {
                handleWinner(nextWinner);
                break;
            }
          }
        }

        if (!checkWinner(currentUnits)) {
            currentUnits = applyTurnStart(currentUnits, 'player');
            setUnits(currentUnits);
            setTurnCount(c => c + 1);
            setTurn('player');
            addLog(`=== TURN ${turnCount + 1} : PLAYER ===`);
        }
        setIsProcessing(false);
      };

      cpuLogic();
    }
  }, [gameState, turn, winner]);

  // --- RENDER ---

  const renderCell = (x, y) => {
    const isWallCell = isWall(x, y);
    const unit = units.find(u => u.x === x && u.y === y);
    const isSelected = selectedId === unit?.id;
    const Icon = unit?.icon;
    const cellVfx = vfx.filter(v => v.x === x && v.y === y);

    let isTargetable = false;
    let isAttackable = false;
    let isCoolable = false; 
    
    if (selectedId && turn === 'player' && gameState === 'playing' && !isWallCell) {
      const selected = units.find(u => u.id === selectedId);
      if (selected) {
        if (getDistance(selected.x, selected.y, x, y) === 1 && !unit) {
          isTargetable = true;
        }
        const attackables = getAttackableCells(selected, units);
        if (attackables.some(c => c.x === x && c.y === y) && unit && unit.owner === 'cpu') {
          isAttackable = true;
        }
        if (selected.x === x && selected.y === y && !selected.hasActed && selected.heat > 0) {
          isCoolable = true;
        }
      }
    }

    let cellClass = "w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 border border-slate-800/50 flex flex-col items-center justify-center relative cursor-pointer transition-colors";
    
    if (isWallCell) {
      cellClass += " bg-slate-900 border-slate-700/50";
      return (
        <div key={`${x}-${y}`} className={cellClass}>
          <Lock size={16} className="text-slate-700 sm:w-5 sm:h-5" />
        </div>
      );
    }

    if (isSelected && isCoolable) cellClass += " bg-emerald-900/40 border-emerald-500 shadow-[inset_0_0_10px_rgba(16,185,129,0.5)]";
    else if (isSelected) cellClass += " bg-cyan-900/40 border-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.5)]";
    else if (isAttackable) cellClass += " bg-rose-900/30 border-rose-500 hover:bg-rose-800/50";
    else if (isTargetable) cellClass += " bg-cyan-900/20 hover:bg-cyan-800/40 border-cyan-700 hover:border-cyan-400";
    else cellClass += " bg-slate-900/30 hover:bg-slate-800/50";

    return (
      <div 
        key={`${x}-${y}`} 
        className={cellClass}
        onClick={() => handleCellClick(x, y)}
      >
        {cellVfx.map(v => {
          if (v.type === 'text') {
            return (
              <div key={v.id} className={`absolute z-50 pointer-events-none animate-[slideUpFade_1s_ease-out_forwards] ${v.color}`}>
                {v.text}
              </div>
            );
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
          } ${unit.hasActed ? 'opacity-40 scale-95' : 'opacity-100 scale-100 hover:scale-110'}`}>
            
            {!unit.hasActed && unit.owner === turn && gameState === 'playing' && (
              <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]" />
            )}

            <Icon size={20} className="sm:w-7 sm:h-7" />
            
            <div className="absolute top-0 right-0.5 flex gap-[1px]">
                {Array.from({length: unit.maxHp}).map((_, i) => (
                    <div key={`hp-${i}`} className={`w-1.5 sm:w-2 h-1 ${i < unit.hp ? (unit.owner === 'player' ? 'bg-cyan-400' : 'bg-rose-500') : 'bg-slate-700'}`} />
                ))}
            </div>

            <div className="absolute bottom-0 w-full px-1 flex gap-[1px]">
                {Array.from({length: unit.maxHeat + 1}).map((_, i) => {
                    let bg = "bg-slate-700";
                    if (i < unit.heat) bg = i >= unit.maxHeat ? "bg-amber-400" : "bg-orange-500";
                    return <div key={`heat-${i}`} className={`flex-1 h-1 ${bg} ${i === unit.maxHeat ? 'border-l border-amber-300' : ''}`} />
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
      
      {/* 📺 CRT Scanline Effect (確実にクリックを貫通させるようインラインスタイルを追加) */}
      <div 
        className="fixed inset-0 z-[100] opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" 
        style={{ pointerEvents: 'none' }}
      />
      <div 
        className="fixed inset-0 z-[100] opacity-5 mix-blend-overlay bg-blue-900 animate-[pulse_4s_ease-in-out_infinite]" 
        style={{ pointerEvents: 'none' }}
      />

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
          
          <button 
            onClick={handleStart}
            className="group relative px-8 py-4 bg-transparent border border-cyan-500 text-cyan-400 font-bold tracking-widest uppercase overflow-hidden transition-all hover:text-slate-950 hover:border-transparent hover:shadow-[0_0_30px_rgba(34,211,238,0.8)] z-[200]"
          >
            <div className="absolute inset-0 bg-cyan-400 w-0 group-hover:w-full transition-all duration-300 ease-out z-0" />
            <span className="relative z-10">Initialize System</span>
          </button>
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

            <div>
              <button
                onClick={(e) => { e.stopPropagation(); restartGame(); }}
                className="text-lg px-10 py-4 bg-slate-950 border border-current rounded hover:bg-slate-800 transition-colors tracking-widest font-bold z-50 relative"
              >
                REBOOT SYSTEM
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
            <div className={`font-bold flex items-center gap-2 ${turn === 'player' ? 'text-cyan-400 drop-shadow-[0_0_5px_#22d3ee]' : 'text-slate-600'}`}>
              <div className={`w-2 h-2 rounded-full ${turn === 'player' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
              PLAYER
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 tracking-[0.2em] mb-1">UNITS READY</span>
              <div className="flex gap-1">
                {Array.from({length: playerUnits.length}).map((_, i) => (
                  <div key={i} className={`w-3 h-1.5 rounded-sm ${i < readyPlayerUnits ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-slate-800'}`} />
                ))}
              </div>
            </div>

            <div className={`font-bold flex items-center gap-2 ${turn === 'cpu' ? 'text-rose-500 drop-shadow-[0_0_5px_#f43f5e]' : 'text-slate-600'}`}>
              {/* Computing表示をステータスバーに移動 */}
              {isProcessing ? <span className="animate-pulse tracking-widest text-xs sm:text-base">COMPUTING...</span> : 'CPU'}
              <div className={`w-2 h-2 rounded-full ${turn === 'cpu' ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>
          </div>

          {/* Board */}
          <div className="bg-[#0f172a] p-3 sm:p-5 rounded-2xl border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
            {/* 盤面を隠さないスキャンエフェクトのみ */}
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
            <div className="text-xs text-slate-400 font-mono text-center sm:text-left leading-relaxed">
              <span className="text-emerald-400 font-bold">1. 緑ランプ</span>: 通常行動 (移動/攻撃/熱があれば自身クリックで冷却)<br/>
              <span className="text-amber-500 font-bold">2. OVERCLOCK</span>: 行動済みコマの再行動(Heat🔥+1)<br/>
              <span className="text-rose-500 font-bold">3. MELTDOWN</span>: Heat限界突破で自爆(周囲に1DMG)
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); endTurn(); }}
              disabled={gameState !== 'playing' || turn !== 'player' || isProcessing}
              className={`px-8 py-3 rounded text-sm font-bold tracking-widest transition-all whitespace-nowrap overflow-hidden relative group z-50 ${
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
        <div className="w-full md:w-80 flex flex-col gap-6">
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-lg">
            <h3 className="text-slate-400 font-bold mb-3 border-b border-slate-700/50 pb-2 flex items-center gap-2 text-sm tracking-widest">
               <Terminal size={14} className="text-cyan-500"/> UNIT DATABANK
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50 hover:border-slate-700 transition-colors">
                <div className="text-cyan-400 mt-0.5"><Crown size={16}/></div>
                <div>
                  <p className="font-bold text-slate-200">CORE <span className="text-slate-500 font-normal ml-1">HP:4 / DMG:2 / Heat:2</span></p>
                  <p className="text-[10px] text-amber-400/80 mt-0.5">Boss Unit. Destruction = Defeat.</p>
                </div>
              </li>
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50 hover:border-slate-700 transition-colors">
                <div className="text-cyan-400 mt-0.5"><Shield size={16}/></div>
                <div>
                  <p className="font-bold text-slate-200">HEAVY <span className="text-slate-500 font-normal ml-1">HP:2 / DMG:2 / Heat:1</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">High DMG. Overclocks poorly.</p>
                </div>
              </li>
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50 hover:border-slate-700 transition-colors">
                <div className="text-cyan-400 mt-0.5"><Zap size={16}/></div>
                <div>
                  <p className="font-bold text-slate-200">SPEED <span className="text-slate-500 font-normal ml-1">HP:1 / DMG:1 / Heat:3</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Can overclock safely.</p>
                </div>
              </li>
              <li className="flex gap-3 items-start bg-slate-900/50 p-2 rounded border border-slate-800/50 hover:border-slate-700 transition-colors">
                <div className="text-cyan-400 mt-0.5"><Target size={16}/></div>
                <div>
                  <p className="font-bold text-slate-200">SNIPER <span className="text-slate-500 font-normal ml-1">HP:1 / DMG:1 / Heat:2</span></p>
                  <p className="text-[10px] text-cyan-300/80 mt-0.5">Ranged Attack (2-3 cells).</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex-1 min-h-[250px] bg-[#0a0f18] border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-hidden flex flex-col relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
            <div className="text-cyan-600 font-bold mb-3 pb-2 border-b border-cyan-900/30 flex items-center justify-between sticky top-0 bg-[#0a0f18] z-10 tracking-widest">
              <span>&gt;_ SYSTEM_LOG</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent pr-2 pt-1">
              {logs.map((log, i) => {
                let color = "text-cyan-500/60";
                if (log.includes("PLAYER")) color = "text-cyan-300";
                if (log.includes("CPU")) color = "text-rose-400";
                if (log.includes("MELTDOWN") || log.includes("WARNING")) color = "text-amber-500 font-bold";
                if (log.includes("OVERCLOCK")) color = "text-orange-400";
                if (log.includes("COOLED")) color = "text-emerald-400";
                if (log.includes("DMG") || log.includes("attacked") || log.includes("Splash")) color = "text-red-400";
                
                return (
                  <div key={i} className={`whitespace-pre-wrap leading-relaxed ${color}`}>
                    {log}
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="bg-slate-900 border border-cyan-500 rounded-xl p-6 max-w-2xl w-full h-[80vh] overflow-y-auto shadow-[0_0_50px_rgba(6,182,212,0.2)] relative scrollbar-thin scrollbar-thumb-cyan-900">
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
                    <li>オーバークロックで行動すると、そのユニットの <strong className="text-orange-500">Heat（熱ゲージ）</strong> が 1 上昇します。</li>
                    <li>Heatが「MaxHeat（限界値）」を超えた瞬間、そのユニットは<strong className="text-red-500 font-bold">メルトダウン（自爆）</strong>します！</li>
                    <li>自爆したユニットは消滅し、<strong>周囲十字4マスにいる全てのユニット（味方含む）に 1 ダメージ（貫通）</strong>を与えます。</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}