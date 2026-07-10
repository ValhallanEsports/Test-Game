import React from 'react';
import { GameState, GameStats } from '../types';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  Trophy, 
  Zap, 
  ChevronsUp, 
  Sparkles, 
  RefreshCw, 
  MapPin, 
  Trash2,
  Dribbble
} from 'lucide-react';

interface UIOverlayProps {
  gameState: GameState;
  stats: GameStats;
  isMuted: boolean;
  onStartGame: (practice: boolean) => void;
  onToggleMute: () => void;
  onPlaceCheckpoint: () => void;
  onRemoveCheckpoint: () => void;
}

export default function UIOverlay({
  gameState,
  stats,
  isMuted,
  onStartGame,
  onToggleMute,
  onPlaceCheckpoint,
  onRemoveCheckpoint,
}: UIOverlayProps) {
  return (
    <div className="w-full text-slate-100 font-sans" id="ui-overlay-container">
      
      {/* 1. TOP HUD (Shown during active gameplay) */}
      {gameState === 'PLAYING' && (
        <div 
          className="w-full flex flex-col gap-2 bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-lg mb-4"
          id="hud-top"
        >
          {/* Level Progress Bar (Geometry Dash Style) */}
          <div className="w-full flex items-center gap-3" id="hud-progress-row">
            <span className="font-mono text-xs font-semibold text-slate-400">0%</span>
            <div className="flex-1 h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-[1px]" id="hud-progress-track">
              <div 
                className={`h-full rounded-full transition-all duration-100 ${
                  stats.isPracticeMode 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                    : 'bg-gradient-to-r from-cyan-500 to-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.5)]'
                }`}
                style={{ width: `${stats.levelProgress}%` }}
                id="hud-progress-fill"
              />
            </div>
            <span className="font-mono text-xs font-bold text-cyan-400 min-w-[38px] text-right">
              {stats.levelProgress}%
            </span>
          </div>

          <div className="flex items-center justify-between" id="hud-stats-row">
            <div className="flex items-center gap-4" id="hud-stats-left">
              <div className="flex items-center gap-1.5" id="hud-score">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Score</span>
                <span className="font-mono text-base font-bold text-slate-100">{stats.score}</span>
              </div>
              <div className="flex items-center gap-1.5" id="hud-best">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Best</span>
                <span className="font-mono text-sm font-bold text-slate-300">{stats.highScore}</span>
              </div>
            </div>

            <div className="flex items-center gap-3" id="hud-stats-right">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300">
                Attempt {stats.attempts}
              </span>
              
              {stats.isPracticeMode ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-800 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Practice
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-950/80 border border-cyan-800 text-cyan-400 shadow-[0_0_8px_rgba(14,165,233,0.15)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  Normal
                </span>
              )}

              <button
                onClick={onToggleMute}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
                id="hud-mute-btn"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick instructions reminder in small text during gameplay */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/40" id="hud-hotkeys-row">
            <span>[Space/Up/Click] Jump / Activate Orb</span>
            <span>[Down/S] Duck</span>
            {stats.isPracticeMode && (
              <span className="text-emerald-500">[Z] Save Checkpoint • [X] Delete Checkpoint</span>
            )}
          </div>
        </div>
      )}

      {/* 2. START MENU OVERLAY */}
      {gameState === 'MENU' && (
        <div 
          className="w-full flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden"
          id="menu-overlay"
        >
          {/* Decorative neon lights */}
          <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]"></div>
          <div className="absolute bottom-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent shadow-[0_0_12px_#f472b6]"></div>

          <div className="text-center mb-6" id="menu-header">
            {/* Main title */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-fuchsia-400 drop-shadow-[0_4px_12px_rgba(34,211,238,0.2)]" id="menu-title">
              DINO GEOMETRY DASH
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-2" id="menu-subtitle">
              CHROME DINO RUNNER × GEOMETRY DASH ARCADER
            </p>
          </div>

          {/* Core Game Modes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mb-6" id="menu-modes-grid">
            
            {/* Normal Mode Button */}
            <button
              onClick={() => onStartGame(false)}
              className="flex flex-col items-center justify-center p-5 bg-slate-950 hover:bg-slate-900 border-2 border-cyan-500 hover:border-cyan-400 rounded-xl cursor-pointer group hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all"
              id="btn-play-normal"
            >
              <div className="p-3 bg-cyan-950/60 border border-cyan-700 group-hover:bg-cyan-900/60 rounded-full mb-3 text-cyan-400 transition-colors">
                <Play className="w-6 h-6 fill-cyan-400" />
              </div>
              <span className="font-sans font-bold text-base text-slate-100 group-hover:text-cyan-400">NORMAL MODE</span>
              <span className="text-[11px] text-slate-400 font-mono text-center mt-1">
                One shot, maximum focus. Try to beat the level and secure the high score!
              </span>
            </button>

            {/* Practice Mode Button */}
            <button
              onClick={() => onStartGame(true)}
              className="flex flex-col items-center justify-center p-5 bg-slate-950 hover:bg-slate-900 border-2 border-emerald-500 hover:border-emerald-400 rounded-xl cursor-pointer group hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
              id="btn-play-practice"
            >
              <div className="p-3 bg-emerald-950/60 border border-emerald-700 group-hover:bg-emerald-900/60 rounded-full mb-3 text-emerald-400 transition-colors">
                <Sparkles className="w-6 h-6 fill-emerald-400" />
              </div>
              <span className="font-sans font-bold text-base text-slate-100 group-hover:text-emerald-400">PRACTICE MODE</span>
              <span className="text-[11px] text-slate-400 font-mono text-center mt-1">
                Revive instantly! Set checkpoints anywhere to study the obstacles.
              </span>
            </button>

          </div>

          {/* Sound, Stats, Controls Legend */}
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col gap-3" id="menu-details">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2" id="menu-stats-row">
              <div className="flex items-center gap-1.5" id="menu-high-score">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-slate-400">HIGH SCORE:</span>
                <span className="text-sm font-mono font-extrabold text-amber-400">{stats.highScore}</span>
              </div>

              <button
                onClick={onToggleMute}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer transition-colors"
                id="menu-mute-btn"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                <span className="font-mono">{isMuted ? 'Muted' : 'Music On'}</span>
              </button>
            </div>

            {/* Instruction Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="menu-instructions">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Controls
                </h4>
                <ul className="text-xs font-mono text-slate-400 space-y-1">
                  <li><strong className="text-slate-200">Space / Up / Click</strong> — Jump / Double Jump</li>
                  <li><strong className="text-slate-200">S / Down</strong> — Duck / Squash</li>
                  <li><strong className="text-slate-200">Z key</strong> — Drop Checkpoint (Practice)</li>
                  <li><strong className="text-slate-200">X key</strong> — Delete Checkpoint (Practice)</li>
                </ul>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400 mb-1.5 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Game Mechanics
                </h4>
                <ul className="text-xs font-mono text-slate-400 space-y-1">
                  <li><strong className="text-fuchsia-400">Portals</strong> — Flips gravity upside down!</li>
                  <li><strong className="text-amber-400">Yellow Orbs</strong> — Click/Tap in mid-air to jump</li>
                  <li><strong className="text-emerald-400">Green Orbs</strong> — Tap mid-air to toggle gravity</li>
                  <li><strong className="text-yellow-300">Speed Pads</strong> — Hyper speed acceleration</li>
                </ul>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 3. GAME OVER OVERLAY */}
      {gameState === 'GAMEOVER' && (
        <div 
          className="w-full flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl relative"
          id="gameover-overlay"
        >
          <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-red-500 shadow-[0_0_12px_#ef4444]"></div>

          <div className="text-center mb-5" id="gameover-header">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-sans text-red-500 drop-shadow-[0_2px_8px_rgba(239,68,68,0.3)]">
              CRASH DETECTED!
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              ATTEMPT {stats.attempts} • SPEED RESET
            </p>
          </div>

          {/* Progress Percent & Stats */}
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 p-5 rounded-xl text-center mb-6" id="gameover-stats">
            
            <div className="mb-4" id="gameover-progress-gauge">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Level Progress</span>
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-400 font-mono">
                {stats.levelProgress}%
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mt-2">
                <div 
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${stats.levelProgress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-3" id="gameover-stats-grid">
              <div className="text-center">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Run Score</span>
                <span className="font-mono text-base font-bold text-slate-200">{stats.score}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">All-Time Best</span>
                <span className="font-mono text-base font-bold text-amber-400">{stats.highScore}</span>
              </div>
            </div>

          </div>

          {/* Retry Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md" id="gameover-actions">
            
            <button
              onClick={() => onStartGame(stats.isPracticeMode)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 border-b-4 border-red-800 hover:border-red-700 active:scale-95 text-white font-sans font-bold rounded-xl cursor-pointer shadow-lg transition-all"
              id="btn-retry-quick"
            >
              <RotateCcw className="w-4 h-4 animate-spin-reverse" />
              RETRY ATTEMPT {stats.attempts + 1}
            </button>

            <button
              onClick={() => onStartGame(!stats.isPracticeMode)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border-b-4 border-slate-950 active:scale-95 text-slate-200 font-sans font-bold rounded-xl cursor-pointer transition-all"
              id="btn-toggle-mode-retry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {stats.isPracticeMode ? 'TRY NORMAL MODE' : 'TRY PRACTICE MODE'}
            </button>

          </div>

          <button
            onClick={() => {
              // Reset to main menu
              window.location.reload();
            }}
            className="text-xs font-mono text-slate-500 hover:text-slate-300 mt-5 underline cursor-pointer"
            id="btn-menu-back"
          >
            Back to mode select
          </button>

        </div>
      )}

      {/* 4. VICTORY OVERLAY */}
      {gameState === 'GAMEOVER' && stats.levelProgress >= 100 && (
        <div 
          className="w-full flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-amber-500 p-6 sm:p-8 rounded-2xl shadow-2xl relative"
          id="victory-overlay"
        >
          {/* Confetti sparks decorative line */}
          <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-amber-400 shadow-[0_0_12px_#fbbf24]"></div>

          <div className="p-3 bg-amber-950 border border-amber-500 rounded-full mb-3 text-amber-400 animate-bounce">
            <Sparkles className="w-10 h-10 fill-amber-500" />
          </div>

          <div className="text-center mb-5" id="victory-header">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]">
              LEVEL COMPLETED!
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              YOU CONQUERED THE DINO GAUNTLET
            </p>
          </div>

          <div className="w-full max-w-md bg-slate-950 border border-slate-800 p-5 rounded-xl text-center mb-6" id="victory-stats">
            <div className="text-sm font-mono text-slate-400 mb-2">
              Completed in <strong className="text-white">{stats.attempts} attempts</strong>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-3 mt-3">
              <div className="text-center">
                <span className="text-[9px] uppercase font-bold text-slate-500 block font-sans">Final Score</span>
                <span className="font-mono text-lg font-bold text-slate-200">{stats.score}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] uppercase font-bold text-slate-500 block font-sans">All-Time Best</span>
                <span className="font-mono text-lg font-bold text-amber-400">{stats.highScore}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              // Restart from scratch
              window.location.reload();
            }}
            className="w-full max-w-sm flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700 hover:border-amber-600 active:scale-95 text-slate-950 font-sans font-extrabold rounded-xl cursor-pointer shadow-lg transition-all"
            id="btn-victory-restart"
          >
            PLAY AGAIN
          </button>
        </div>
      )}

    </div>
  );
}
