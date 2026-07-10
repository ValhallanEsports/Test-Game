import React, { useState, useEffect, useCallback } from 'react';
import { GameState, GameStats } from './types';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import audioEngine from './lib/AudioEngine';
import { Gamepad2, Volume2, VolumeX, Sparkles, Trophy, HelpCircle } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [checkpointPlacementTrigger, setCheckpointPlacementTrigger] = useState<'place' | 'remove' | null>(null);

  // Core stats broadcasted from the Canvas
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    attempts: 1,
    isPracticeMode: false,
    levelProgress: 0,
  });

  // Handle game music lifecycle on state transitions
  useEffect(() => {
    if (gameState === 'PLAYING') {
      audioEngine.startMusic();
    } else {
      audioEngine.stopMusic();
    }
    return () => {
      audioEngine.stopMusic();
    };
  }, [gameState]);

  // Synchronise volume state
  useEffect(() => {
    setIsMuted(audioEngine.getMuteState());
  }, []);

  const handleStartGame = useCallback((practice: boolean) => {
    setIsPracticeMode(practice);
    setGameState('PLAYING');
    setResetTrigger((prev) => prev + 1);
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleStatsChange = useCallback((newStats: GameStats) => {
    setStats(newStats);
  }, []);

  const handleDeath = useCallback((attempts: number) => {
    setGameState('GAMEOVER');
    setStats((prev) => ({ ...prev, attempts }));
  }, []);

  const handleVictory = useCallback(() => {
    setGameState('GAMEOVER');
    setStats((prev) => ({ ...prev, levelProgress: 100 }));
  }, []);

  return (
    <div 
      className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950"
      id="app-root-container"
    >
      <div 
        className="w-full max-w-4xl flex flex-col gap-5"
        id="game-dashboard-inner"
      >
        
        {/* Modern Minimalist Header */}
        <header 
          className="flex items-center justify-between px-2"
          id="app-header"
        >
          <div className="flex items-center gap-2" id="header-brand">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-fuchsia-500 rounded-lg shadow-md shadow-cyan-500/10">
              <Gamepad2 className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 font-sans">
                Dino Dash
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                Chrome Dino × Geometry Dash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-500" id="header-stats">
            <div className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Best:</span>
              <strong className="text-slate-300 font-extrabold">{stats.highScore}</strong>
            </div>
            
            <button
              onClick={handleToggleMute}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
              id="header-mute-btn"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* Central Game Panel */}
        <main 
          className="w-full flex flex-col gap-4"
          id="main-viewport"
        >
          
          {/* Active Canvas Stage */}
          <GameCanvas
            gameState={gameState}
            isPracticeMode={isPracticeMode}
            resetTrigger={resetTrigger}
            checkpointPlacementTrigger={checkpointPlacementTrigger}
            onCheckpointActionProcessed={() => setCheckpointPlacementTrigger(null)}
            onStatsChange={handleStatsChange}
            onVictory={handleVictory}
            onDeath={handleDeath}
          />

          {/* Menus and Overlays Dashboard */}
          <UIOverlay
            gameState={gameState}
            stats={stats}
            isMuted={isMuted}
            onStartGame={handleStartGame}
            onToggleMute={handleToggleMute}
            onPlaceCheckpoint={() => setCheckpointPlacementTrigger('place')}
            onRemoveCheckpoint={() => setCheckpointPlacementTrigger('remove')}
          />

        </main>

        {/* Decorative instructions card (Only shown on Menu to keep gaming view completely clean) */}
        {gameState === 'MENU' && (
          <footer 
            className="p-4 bg-slate-900/60 border border-slate-900 rounded-xl flex items-start gap-3"
            id="app-footer-guide"
          >
            <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                How to Play Dino Geometry Dash
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Run, jump, and slide! Press <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-200 rounded font-mono text-[10px]">Space</kbd> or click the screen to jump over spikes. Slide under floating pterodactyls by pressing <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-200 rounded font-mono text-[10px]">S</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-200 rounded font-mono text-[10px]">Down Arrow</kbd>. Passing through floating hoops flips gravity! Use <strong>Practice Mode</strong> to drop checkpoints using <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-200 rounded font-mono text-[10px]">Z</kbd> so you immediately revive right before the tricky sections!
              </p>
            </div>
          </footer>
        )}

      </div>
    </div>
  );
}
