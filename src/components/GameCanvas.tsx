import React, { useEffect, useRef, useState } from 'react';
import { GameState, Obstacle, Checkpoint, Particle, GameStats } from '../types';
import { generateLevel } from '../utils/levelGenerator';
import audioEngine from '../lib/AudioEngine';

interface GameCanvasProps {
  gameState: GameState;
  isPracticeMode: boolean;
  resetTrigger: number;
  checkpointPlacementTrigger: 'place' | 'remove' | null;
  onCheckpointActionProcessed: () => void;
  onStatsChange: (stats: GameStats) => void;
  onVictory: () => void;
  onDeath: (attempts: number) => void;
}

export default function GameCanvas({
  gameState,
  isPracticeMode,
  resetTrigger,
  checkpointPlacementTrigger,
  onCheckpointActionProcessed,
  onStatsChange,
  onVictory,
  onDeath,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Constants
  const VIRTUAL_WIDTH = 1000;
  const VIRTUAL_HEIGHT = 500;
  const GROUND_Y = 400;
  const CEILING_Y = 100;
  const PLAYER_SIZE = 36;
  const BASE_GRAVITY = 0.65;
  const JUMP_FORCE = 11.2;
  const BASE_SPEED = 7.0;

  // Level config
  const LEVEL_END_X = 22000;

  // React state for HUD / Overlay values we want to show immediately
  const [localAttempts, setLocalAttempts] = useState(1);
  const [checkpointsCount, setCheckpointsCount] = useState(0);

  // Use refs for gameplay variables to prevent re-renders in 60fps canvas loop
  const stateRef = useRef({
    player: {
      x: 100,
      y: GROUND_Y - PLAYER_SIZE,
      prevX: 100,
      prevY: GROUND_Y - PLAYER_SIZE,
      vy: 0,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      angle: 0,
      isJumping: false,
      isDucking: false,
      isGrounded: true,
      gravityDirection: 1, // 1 = down, -1 = up
      speedMultiplier: 1.0,
      speedBoostTimer: 0,
    },
    obstacles: [] as Obstacle[],
    checkpoints: [] as Checkpoint[],
    particles: [] as Particle[],
    gameSpeed: BASE_SPEED,
    score: 0,
    highScore: parseInt(localStorage.getItem('dino_dash_high_score') || '0', 10),
    attempts: 1,
    frameCount: 0,
    pulseAmt: 1.0, // Music beat pulse visual scale
    keys: {
      jump: false,
      duck: false,
    },
    practiceMode: isPracticeMode,
    won: false,
    dead: false,
    flashTicks: 0, // Green flash for practice mode respawn
    deathFlashTicks: 0, // White flash for crash
  });

  // Keep practiceMode and gameState sync'd to ref
  useEffect(() => {
    stateRef.current.practiceMode = isPracticeMode;
  }, [isPracticeMode]);

  // Synchronise dashboard attempts score to LocalStorage on start
  useEffect(() => {
    const savedHighScore = parseInt(localStorage.getItem('dino_dash_high_score') || '0', 10);
    stateRef.current.highScore = savedHighScore;
    
    // Increment attempts on new session or level restart
    const storedAttempts = parseInt(sessionStorage.getItem('dino_dash_attempts') || '1', 10);
    stateRef.current.attempts = storedAttempts;
    setLocalAttempts(storedAttempts);
  }, []);

  // Sync external checkpoint actions (Z/X button clicks from HUD)
  useEffect(() => {
    if (checkpointPlacementTrigger === 'place') {
      placeCheckpoint();
      onCheckpointActionProcessed();
    } else if (checkpointPlacementTrigger === 'remove') {
      removeCheckpoint();
      onCheckpointActionProcessed();
    }
  }, [checkpointPlacementTrigger]);

  // Listen to music beat callbacks for the retro techno pulse!
  useEffect(() => {
    audioEngine.setBeatCallback(() => {
      // Trigger visual pulse animation scale
      stateRef.current.pulseAmt = 1.35;
    });
  }, []);

  // Handle Game Restart and Level loading
  useEffect(() => {
    initGame();
  }, [resetTrigger, gameState]);

  // Game Initialization
  const initGame = () => {
    const st = stateRef.current;
    
    // Increment attempts if game state transitions to PLAYING
    if (gameState === 'PLAYING') {
      if (st.dead || st.won) {
        st.attempts += 1;
        sessionStorage.setItem('dino_dash_attempts', st.attempts.toString());
        setLocalAttempts(st.attempts);
      }
    }

    st.player.x = 100;
    st.player.y = GROUND_Y - PLAYER_SIZE;
    st.player.prevX = 100;
    st.player.prevY = GROUND_Y - PLAYER_SIZE;
    st.player.vy = 0;
    st.player.angle = 0;
    st.player.isJumping = false;
    st.player.isDucking = false;
    st.player.isGrounded = true;
    st.player.gravityDirection = 1;
    st.player.speedMultiplier = 1.0;
    st.player.speedBoostTimer = 0;
    
    st.obstacles = generateLevel();
    st.particles = [];
    st.gameSpeed = BASE_SPEED;
    st.score = 0;
    st.won = false;
    st.dead = false;
    st.flashTicks = 0;
    st.deathFlashTicks = 0;

    // Clear checkpoints if normal mode, keep them if practice mode
    if (!isPracticeMode) {
      st.checkpoints = [];
      setCheckpointsCount(0);
    } else {
      setCheckpointsCount(st.checkpoints.length);
    }

    // Trigger initial stats
    updateStats();
  };

  const updateStats = () => {
    const st = stateRef.current;
    const progress = Math.min(100, Math.round((st.player.x / LEVEL_END_X) * 100));
    onStatsChange({
      score: Math.round(st.score),
      highScore: st.highScore,
      attempts: st.attempts,
      isPracticeMode: st.practiceMode,
      levelProgress: progress,
    });
  };

  // Practice Mode Checkpoints
  const placeCheckpoint = () => {
    const st = stateRef.current;
    if (!st.practiceMode || st.dead || st.won || gameState !== 'PLAYING') return;

    // Checkpoint structure
    const cp: Checkpoint = {
      id: `cp-${Date.now()}`,
      x: st.player.x,
      y: st.player.y,
      vy: st.player.vy,
      gravityDirection: st.player.gravityDirection,
      angle: st.player.angle,
      score: st.score,
      gameSpeed: st.gameSpeed,
    };

    st.checkpoints.push(cp);
    setCheckpointsCount(st.checkpoints.length);
    audioEngine.playCheckpointSet();

    // Spawn green sparkles at player location
    for (let i = 0; i < 15; i++) {
      st.particles.push({
        x: st.player.x + PLAYER_SIZE / 2,
        y: st.player.y + PLAYER_SIZE / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        size: Math.random() * 4 + 3,
        color: '#4ADE80', // neon green
        alpha: 1,
        maxLife: 25,
        life: 25,
      });
    }
  };

  const removeCheckpoint = () => {
    const st = stateRef.current;
    if (!st.practiceMode || st.checkpoints.length === 0) return;

    st.checkpoints.pop();
    setCheckpointsCount(st.checkpoints.length);
    audioEngine.playCheckpointSet(); // visual chime SFX
  };

  const loadCheckpoint = () => {
    const st = stateRef.current;
    if (!st.practiceMode) return;

    audioEngine.playCheckpointLoad();
    st.dead = false;
    st.flashTicks = 15; // flashes green briefly

    if (st.checkpoints.length > 0) {
      // Load last checkpoint
      const cp = st.checkpoints[st.checkpoints.length - 1];
      st.player.x = cp.x;
      st.player.y = cp.y;
      st.player.vy = cp.vy;
      st.player.gravityDirection = cp.gravityDirection;
      st.player.angle = cp.angle;
      st.score = cp.score;
      st.gameSpeed = cp.gameSpeed;
      st.player.isJumping = true;
      st.player.isGrounded = false;
    } else {
      // No checkpoint yet, reset to starting line
      st.player.x = 100;
      st.player.y = GROUND_Y - PLAYER_SIZE;
      st.player.vy = 0;
      st.player.angle = 0;
      st.player.gravityDirection = 1;
      st.score = 0;
      st.gameSpeed = BASE_SPEED;
    }

    // Spawn rewind sparkles
    for (let i = 0; i < 20; i++) {
      st.particles.push({
        x: st.player.x + PLAYER_SIZE / 2,
        y: st.player.y + PLAYER_SIZE / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        size: Math.random() * 5 + 2,
        color: '#10B981',
        alpha: 1,
        maxLife: 30,
        life: 30,
      });
    }
  };

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const st = stateRef.current;

      if (gameState !== 'PLAYING' || st.dead || st.won) return;

      if (key === ' ' || key === 'arrowup' || key === 'w') {
        e.preventDefault();
        st.keys.jump = true;
        triggerJump();
      }
      if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        st.keys.duck = true;
        triggerDuck(true);
      }
      if (key === 'z') {
        e.preventDefault();
        placeCheckpoint();
      }
      if (key === 'x') {
        e.preventDefault();
        removeCheckpoint();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const st = stateRef.current;

      if (key === ' ' || key === 'arrowup' || key === 'w') {
        st.keys.jump = false;
      }
      if (key === 'arrowdown' || key === 's') {
        st.keys.duck = false;
        triggerDuck(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isPracticeMode]);

  const triggerJump = () => {
    const st = stateRef.current;
    
    // 1. Regular Ground Jump
    if (st.player.isGrounded) {
      st.player.vy = -JUMP_FORCE * st.player.gravityDirection;
      st.player.isGrounded = false;
      st.player.isJumping = true;
      audioEngine.playJump();
      
      // Spawn dust jump particles
      for (let i = 0; i < 8; i++) {
        st.particles.push({
          x: st.player.x,
          y: st.player.gravityDirection === 1 ? GROUND_Y : CEILING_Y,
          vx: (Math.random() - 0.7) * 4,
          vy: -st.player.gravityDirection * (Math.random() * 3 + 1),
          size: Math.random() * 3 + 2,
          color: '#E2E8F0',
          alpha: 0.8,
          maxLife: 20,
          life: 20,
        });
      }
      return;
    }

    // 2. Air Jump Orbs (Yellow / Green Orbs inside radius)
    // Find if player is close to any un-activated orb
    const playerXCenter = st.player.x + PLAYER_SIZE / 2;
    const playerYCenter = st.player.y + PLAYER_SIZE / 2;

    for (const obs of st.obstacles) {
      if (obs.type === 'orb_jump' || obs.type === 'orb_gravity') {
        const orbXCenter = obs.x + obs.width / 2;
        const orbYCenter = obs.y + obs.height / 2;
        
        // Calculate distance
        const dx = playerXCenter - orbXCenter;
        const dy = playerYCenter - orbYCenter;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Orb radius activation check (usually within 65px is a fair timing window)
        if (distance < 70 && !obs.activated) {
          obs.activated = true;
          audioEngine.playOrbTap();

          // Create orb wave ring particle explosion
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            st.particles.push({
              x: orbXCenter,
              y: orbYCenter,
              vx: Math.cos(angle) * 5,
              vy: Math.sin(angle) * 5,
              size: 4,
              color: obs.type === 'orb_jump' ? '#FBBF24' : '#10B981',
              alpha: 1,
              maxLife: 20,
              life: 20,
            });
          }

          if (obs.type === 'orb_jump') {
            // Yellow orb boosts upward/downward (airborne jump)
            st.player.vy = -JUMP_FORCE * 0.95 * st.player.gravityDirection;
            // Add a little spin
            st.player.angle += Math.PI * st.player.gravityDirection;
          } else {
            // Green orb flips gravity immediately mid-air!
            st.player.gravityDirection *= -1;
            st.player.vy = -3.5 * st.player.gravityDirection; // light boost in new direction
            st.player.angle += Math.PI;
          }
          break;
        }
      }
    }
  };

  const triggerDuck = (ducking: boolean) => {
    const st = stateRef.current;
    if (ducking && !st.player.isDucking) {
      st.player.isDucking = true;
      st.player.height = PLAYER_SIZE / 2;
      // Adjust position so they duck flush against floor/ceiling
      if (st.player.gravityDirection === 1) {
        st.player.y += PLAYER_SIZE / 2;
      }
      audioEngine.playDuck();
    } else if (!ducking && st.player.isDucking) {
      st.player.isDucking = false;
      st.player.height = PLAYER_SIZE;
      if (st.player.gravityDirection === 1) {
        st.player.y -= PLAYER_SIZE / 2;
      }
    }
  };

  // Mouse / Touch handler for jump and orb tapping
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (gameState !== 'PLAYING' || stateRef.current.dead || stateRef.current.won) return;
    
    // Unlock and play audio on click
    audioEngine.init();
    
    triggerJump();
  };

  // Main Canvas loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      updatePhysics();
      renderGame(ctx);
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  // PHYSICS ENGINE
  const updatePhysics = () => {
    const st = stateRef.current;
    
    // If not playing, freeze physics
    if (gameState !== 'PLAYING' || st.dead || st.won) {
      // Still update background visual particles for smoothness
      updateParticles();
      st.frameCount++;
      st.pulseAmt = Math.max(1.0, st.pulseAmt - 0.015);
      return;
    }

    st.frameCount++;
    
    // Decay visual beats pulse
    st.pulseAmt = Math.max(1.0, st.pulseAmt - 0.02);

    // Fade practice flash/death flashes
    if (st.flashTicks > 0) st.flashTicks--;
    if (st.deathFlashTicks > 0) st.deathFlashTicks--;

    // Increase score based on distance
    st.score += st.gameSpeed * 0.05;

    // Track previous positions for robust block landing
    st.player.prevX = st.player.x;
    st.player.prevY = st.player.y;

    // 1. Horizontal Scroll
    st.player.x += st.gameSpeed;

    // 2. Speed Boost Multiplier Decay
    if (st.player.speedBoostTimer > 0) {
      st.player.speedBoostTimer--;
      if (st.player.speedBoostTimer === 0) {
        st.player.speedMultiplier = 1.0;
        st.gameSpeed = BASE_SPEED;
      }
    }

    // 3. Gravity and Vertical Physics
    const currentGravity = BASE_GRAVITY * st.player.gravityDirection;
    st.player.vy += currentGravity;
    st.player.y += st.player.vy;

    // 4. Boundary Collisions (Floor and Ceiling)
    let landed = false;

    // Standard floor collision
    if (st.player.gravityDirection === 1) {
      const floorYLimit = GROUND_Y - st.player.height;
      if (st.player.y >= floorYLimit) {
        st.player.y = floorYLimit;
        st.player.vy = 0;
        landed = true;
      }
    } else {
      // Inverted ceiling collision
      const ceilingYLimit = CEILING_Y;
      if (st.player.y <= ceilingYLimit) {
        st.player.y = ceilingYLimit;
        st.player.vy = 0;
        landed = true;
      }
    }

    if (landed) {
      st.player.isGrounded = true;
      st.player.isJumping = false;
      
      // Geometry Dash Style Snap rotation to nearest 90 degrees (Math.PI / 2) when landing
      const targetAngle = Math.round(st.player.angle / (Math.PI / 2)) * (Math.PI / 2);
      // Smoothly interpolate to snap angle or snap instantly
      st.player.angle = targetAngle;
    } else {
      st.player.isGrounded = false;
      // Spin player in air!
      st.player.angle += 0.09 * st.player.gravityDirection;
    }

    // 5. Block Platform Collisions
    // We do AABB resolving for solid platform blocks
    for (const obs of st.obstacles) {
      if (obs.type === 'block') {
        checkBlockCollision(obs);
      }
    }

    // 6. Spawn running dust trail
    if (st.player.isGrounded && st.frameCount % 3 === 0) {
      const trailY = st.player.gravityDirection === 1 
        ? GROUND_Y 
        : CEILING_Y + st.player.height;
      
      st.particles.push({
        x: st.player.x,
        y: trailY,
        vx: -st.gameSpeed * 0.4 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 4 + 2,
        color: '#38BDF8', // Cyan dash trail
        alpha: 0.6,
        maxLife: 20,
        life: 20,
      });
    }

    // 7. Spawn airborne ship-exhaust particles if in air
    if (!st.player.isGrounded && st.frameCount % 2 === 0) {
      st.particles.push({
        x: st.player.x,
        y: st.player.y + st.player.height / 2,
        vx: -st.gameSpeed * 0.3 - Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 5 + 1.5,
        color: st.player.gravityDirection === 1 ? '#F43F5E' : '#EC4899', // Pink/rose flames
        alpha: 0.8,
        maxLife: 22,
        life: 22,
      });
    }

    // 8. Obstacle Triggering (Spikes, Portals, Speed Pads)
    checkObstacleCollisions();

    // 9. Particle movement
    updateParticles();

    // 10. Check Victory condition
    if (st.player.x >= LEVEL_END_X) {
      st.won = true;
      audioEngine.stopMusic();
      onVictory();
    }

    // Broadcast stats occasionally
    if (st.frameCount % 5 === 0) {
      updateStats();
    }
  };

  // Detailed box-and-intersection platform logic
  const checkBlockCollision = (block: Obstacle) => {
    const st = stateRef.current;
    const p = st.player;

    // Check overlap
    const pLeft = p.x;
    const pRight = p.x + p.width;
    const pTop = p.y;
    const pBottom = p.y + p.height;

    const bLeft = block.x;
    const bRight = block.x + block.width;
    const bTop = block.y;
    const bBottom = block.y + block.height;

    const isOverlapping = 
      pRight > bLeft &&
      pLeft < bRight &&
      pBottom > bTop &&
      pTop < bBottom;

    if (!isOverlapping) return;

    // Calculate previous bounds to see which direction player was moving from
    const prevPLeft = p.prevX;
    const prevPRight = p.prevX + p.width;
    const prevPTop = p.prevY;
    const prevPBottom = p.prevY + p.height;

    // 1. Landing on Top of Block (Moving downwards and previously above block top)
    if (p.gravityDirection === 1 && prevPBottom <= bTop) {
      p.y = bTop - p.height;
      p.vy = 0;
      p.isGrounded = true;
      p.isJumping = false;
      const targetAngle = Math.round(p.angle / (Math.PI / 2)) * (Math.PI / 2);
      p.angle = targetAngle;
      return;
    }

    // 2. Landing on Bottom of Block (Moving upwards and previously below block bottom)
    if (p.gravityDirection === -1 && prevPTop >= bBottom) {
      p.y = bBottom;
      p.vy = 0;
      p.isGrounded = true;
      p.isJumping = false;
      const targetAngle = Math.round(p.angle / (Math.PI / 2)) * (Math.PI / 2);
      p.angle = targetAngle;
      return;
    }

    // 3. Side collision (Crashed into wall)
    // If we're not landing on the top or bottom of a block, it is a vertical frontal crash!
    // Except if the player somehow just grazes the edge, let's keep it clean
    if (p.gravityDirection === 1 && pBottom > bTop + 4) {
      triggerCrash();
    } else if (p.gravityDirection === -1 && pTop < bBottom - 4) {
      triggerCrash();
    }
  };

  const checkObstacleCollisions = () => {
    const st = stateRef.current;
    const p = st.player;

    const pLeft = p.x;
    const pRight = p.x + p.width;
    const pTop = p.y;
    const pBottom = p.y + p.height;

    for (const obs of st.obstacles) {
      // If obstacle is far off-screen, skip
      if (obs.x + obs.width < p.x - 200 || obs.x > p.x + 1000) continue;

      // Handle Portal/Orb activations (AABB overlap)
      const isOverlapping =
        pRight > obs.x &&
        pLeft < obs.x + obs.width &&
        pBottom > obs.y &&
        pTop < obs.y + obs.height;

      if (isOverlapping) {
        if (obs.type === 'portal_gravity_flip' && !obs.activated) {
          obs.activated = true;
          p.gravityDirection = -1; // Flip gravity upward!
          p.vy = -1.5; // push slightly upwards
          audioEngine.playPortal();
          spawnPortalEffects(obs);
        } 
        else if (obs.type === 'portal_gravity_normal' && !obs.activated) {
          obs.activated = true;
          p.gravityDirection = 1; // Restore normal downward gravity
          p.vy = 1.5; // push slightly downwards
          audioEngine.playPortal();
          spawnPortalEffects(obs);
        }
        else if (obs.type === 'speed_pad' && !obs.activated) {
          obs.activated = true;
          p.speedMultiplier = 1.45;
          p.speedBoostTimer = 80; // 80 frames of speed boost
          st.gameSpeed = BASE_SPEED * 1.45;
          audioEngine.playSpeedPad();
          
          // Spawn boost sparks
          for (let i = 0; i < 15; i++) {
            st.particles.push({
              x: p.x,
              y: p.y + p.height / 2,
              vx: Math.random() * 6 + 4,
              vy: (Math.random() - 0.5) * 4,
              size: Math.random() * 4 + 2,
              color: '#FBBF24', // Yellow speed sparks
              alpha: 0.9,
              maxLife: 25,
              life: 25,
            });
          }
        }
        // Spikes and Pterodactyls are DEADLY!
        // We use slightly smaller hitboxes (lenient hitboxes) for spikes and flyers to make game feel rewarding and fair.
        else if (
          obs.type === 'spike' ||
          obs.type === 'double_spike' ||
          obs.type === 'triple_spike' ||
          obs.type.startsWith('pterodactyl')
        ) {
          // Lenient bounds
          const paddingX = obs.width * 0.18;
          const paddingY = obs.height * 0.12;

          const hLeft = obs.x + paddingX;
          const hRight = obs.x + obs.width - paddingX;
          const hTop = obs.y + paddingY;
          const hBottom = obs.y + obs.height - paddingY;

          const finalOverlap =
            pRight > hLeft &&
            pLeft < hRight &&
            pBottom > hTop &&
            pTop < hBottom;

          if (finalOverlap) {
            triggerCrash();
            break;
          }
        }
      }
    }
  };

  const spawnPortalEffects = (portal: Obstacle) => {
    const st = stateRef.current;
    const color = portal.type === 'portal_gravity_flip' ? '#D946EF' : '#3B82F6';
    for (let i = 0; i < 15; i++) {
      st.particles.push({
        x: portal.x + portal.width / 2,
        y: portal.y + portal.height / 2 + (Math.random() - 0.5) * 70,
        vx: (Math.random() - 0.5) * 4 - 2,
        vy: (Math.random() - 0.5) * 6,
        size: Math.random() * 5 + 3,
        color,
        alpha: 1,
        maxLife: 30,
        life: 30,
      });
    }
  };

  const triggerCrash = () => {
    const st = stateRef.current;
    st.dead = true;
    st.deathFlashTicks = 10; // flash white brief crash shockwave

    // Play explosion audio
    audioEngine.playCrash();

    // Spawn 40+ glowing explosion shards
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      st.particles.push({
        x: st.player.x + PLAYER_SIZE / 2,
        y: st.player.y + PLAYER_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 2,
        color: Math.random() > 0.5 ? '#EF4444' : '#F59E0B', // firey red / yellow shards
        alpha: 1.0,
        maxLife: 40,
        life: 40,
      });
    }

    // Stop background tracks if NOT in practice mode, otherwise practice mode autorewinds
    if (!st.practiceMode) {
      audioEngine.stopMusic();
      
      // Update high score in LocalStorage if higher
      if (st.score > st.highScore) {
        st.highScore = Math.round(st.score);
        localStorage.setItem('dino_dash_high_score', st.highScore.toString());
      }
      onDeath(st.attempts);
    } else {
      // Practice mode respawn delay to let crash explosion finish beautifully (e.g. 500ms)
      setTimeout(() => {
        loadCheckpoint();
      }, 450);
    }
  };

  const updateParticles = () => {
    const st = stateRef.current;
    for (let i = st.particles.length - 1; i >= 0; i--) {
      const p = st.particles[i];
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = p.life / p.maxLife;

      if (p.life <= 0) {
        st.particles.splice(i, 1);
      }
    }
  };

  // CANVAS RENDER ENGINE
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    const st = stateRef.current;
    const cameraX = st.player.x - 180; // keep camera slightly in front of center

    // Clear background (dark sci-fi grids)
    ctx.fillStyle = '#0F172A'; // Slate-900 background
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Render animated space star field
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const spacePulse = st.pulseAmt * 0.1;
    for (let i = 0; i < 25; i++) {
      const starX = (i * 147 - cameraX * 0.15) % VIRTUAL_WIDTH;
      const starY = (i * 83) % VIRTUAL_HEIGHT;
      // Pulse background stars on the beat
      ctx.beginPath();
      ctx.arc(starX, starY, (1 + (i % 3)) * (1.0 + spacePulse), 0, Math.PI * 2);
      ctx.fill();
    }

    // Render distant mountains or futuristic grid lines
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let xOffset = 0; xOffset < VIRTUAL_WIDTH + 150; xOffset += 80) {
      const lineX = xOffset - (cameraX * 0.4) % 80;
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, VIRTUAL_HEIGHT);
    }
    ctx.stroke();

    // Render Ground Track and Ceiling Track
    const gridPulse = st.pulseAmt * 3;
    
    // Bottom track
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - GROUND_Y);
    
    // Top track
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, CEILING_Y);

    // Glowing track edges with beat-pulsed line thickness
    ctx.strokeStyle = '#0EA5E9'; // Electric cyan for floor
    ctx.lineWidth = 3 + gridPulse;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(VIRTUAL_WIDTH, GROUND_Y);
    ctx.stroke();

    ctx.strokeStyle = '#D946EF'; // Fuchsia for ceiling
    ctx.lineWidth = 3 + gridPulse;
    ctx.beginPath();
    ctx.moveTo(0, CEILING_Y);
    ctx.lineTo(VIRTUAL_WIDTH, CEILING_Y);
    ctx.stroke();

    // Slanted ground grid-ticks moving backwards
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let xTick = 0; xTick < VIRTUAL_WIDTH + 100; xTick += 40) {
      const tickX = xTick - (cameraX) % 40;
      // Floor tick
      ctx.moveTo(tickX, GROUND_Y);
      ctx.lineTo(tickX - 15, VIRTUAL_HEIGHT);
      
      // Ceiling tick
      ctx.moveTo(tickX, CEILING_Y);
      ctx.lineTo(tickX - 15, 0);
    }
    ctx.stroke();

    // DRAW CHECKPOINT SHARDS/DIAMONDS (Practice Mode)
    if (st.practiceMode) {
      st.checkpoints.forEach((cp, idx) => {
        const cpXOnScreen = cp.x - cameraX;
        if (cpXOnScreen > -30 && cpXOnScreen < VIRTUAL_WIDTH + 30) {
          ctx.save();
          ctx.translate(cpXOnScreen, cp.y + PLAYER_SIZE / 2);
          
          // Draw green floating diamond
          ctx.fillStyle = '#10B981';
          ctx.strokeStyle = '#34D399';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -12); // top
          ctx.lineTo(8, 0);   // right
          ctx.lineTo(0, 12);  // bottom
          ctx.lineTo(-8, 0);  // left
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Small number indicator
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText((idx + 1).toString(), 0, 3);
          ctx.restore();
        }
      });
    }

    // DRAW OBSTACLES
    st.obstacles.forEach((obs) => {
      const obsScreenX = obs.x - cameraX;
      // Render only if on screen
      if (obsScreenX + obs.width < -50 || obsScreenX > VIRTUAL_WIDTH + 50) return;

      ctx.save();

      if (obs.type === 'spike') {
        // Red spike
        ctx.fillStyle = '#EF4444';
        ctx.strokeStyle = '#F87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // If gravity is normal, spike tip points UP. If flipped, spike tip points DOWN from ceiling.
        if (obs.y < CEILING_Y + 10) {
          // Ceiling hanging spike
          ctx.moveTo(obsScreenX, obs.y);
          ctx.lineTo(obsScreenX + obs.width, obs.y);
          ctx.lineTo(obsScreenX + obs.width / 2, obs.y + obs.height);
        } else {
          // Ground spike
          ctx.moveTo(obsScreenX, obs.y + obs.height);
          ctx.lineTo(obsScreenX + obs.width, obs.y + obs.height);
          ctx.lineTo(obsScreenX + obs.width / 2, obs.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } 
      else if (obs.type === 'double_spike') {
        ctx.fillStyle = '#F87171';
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        
        const isCeiling = obs.y < CEILING_Y + 10;
        const subW = obs.width / 2;

        for (let s = 0; s < 2; s++) {
          const sX = obsScreenX + s * subW;
          ctx.beginPath();
          if (isCeiling) {
            ctx.moveTo(sX, obs.y);
            ctx.lineTo(sX + subW, obs.y);
            ctx.lineTo(sX + subW / 2, obs.y + obs.height);
          } else {
            ctx.moveTo(sX, obs.y + obs.height);
            ctx.lineTo(sX + subW, obs.y + obs.height);
            ctx.lineTo(sX + subW / 2, obs.y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } 
      else if (obs.type === 'triple_spike') {
        ctx.fillStyle = '#EF4444';
        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 1.5;
        
        const isCeiling = obs.y < CEILING_Y + 10;
        const subW = obs.width / 3;

        for (let s = 0; s < 3; s++) {
          const sX = obsScreenX + s * subW;
          ctx.beginPath();
          if (isCeiling) {
            ctx.moveTo(sX, obs.y);
            ctx.lineTo(sX + subW, obs.y);
            ctx.lineTo(sX + subW / 2, obs.y + obs.height);
          } else {
            ctx.moveTo(sX, obs.y + obs.height);
            ctx.lineTo(sX + subW, obs.y + obs.height);
            ctx.lineTo(sX + subW / 2, obs.y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      else if (obs.type === 'block') {
        // Platform blocks
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#38BDF8'; // cyan glowing block boundaries
        ctx.lineWidth = 2.5;
        ctx.fillRect(obsScreenX, obs.y, obs.width, obs.height);
        ctx.strokeRect(obsScreenX, obs.y, obs.width, obs.height);
        
        // Inner grid design inside blocks
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(obsScreenX + 5, obs.y + 5, obs.width - 10, obs.height - 10);
      } 
      else if (obs.type.startsWith('pterodactyl')) {
        // Neon flying dinosaurs!
        const flap = Math.sin(st.frameCount * 0.2) * 12;
        ctx.fillStyle = '#A855F7'; // neon purple body
        ctx.strokeStyle = '#C084FC';
        ctx.lineWidth = 2;

        // Draw geometric flyer
        ctx.beginPath();
        ctx.moveTo(obsScreenX, obs.y + obs.height / 2); // beak
        ctx.lineTo(obsScreenX + 15, obs.y + obs.height / 2 - 10); // crest
        ctx.lineTo(obsScreenX + 22, obs.y + obs.height / 2); // neck
        ctx.lineTo(obsScreenX + obs.width, obs.y + obs.height / 2 + flap / 3); // tail
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Flapping Wings
        ctx.fillStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.beginPath();
        ctx.moveTo(obsScreenX + 18, obs.y + obs.height / 2);
        ctx.lineTo(obsScreenX + 28, obs.y + obs.height / 2 - 20 + flap); // wing-tip
        ctx.lineTo(obsScreenX + 32, obs.y + obs.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      else if (obs.type === 'portal_gravity_flip' || obs.type === 'portal_gravity_normal') {
        // Oval neon portals
        const isFlip = obs.type === 'portal_gravity_flip';
        const portalColor = isFlip ? '#D946EF' : '#3B82F6';
        
        // Portal rings
        ctx.strokeStyle = portalColor;
        ctx.lineWidth = 4 + st.pulseAmt * 1.5;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        
        ctx.beginPath();
        ctx.ellipse(
          obsScreenX + obs.width / 2,
          obs.y + obs.height / 2,
          obs.width / 2,
          obs.height / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();

        // Swirling vortex particles in portal
        ctx.fillStyle = portalColor;
        const swirlCount = 4;
        const centerOrbX = obsScreenX + obs.width / 2;
        const centerOrbY = obs.y + obs.height / 2;
        
        for (let s = 0; s < swirlCount; s++) {
          const angle = (st.frameCount * 0.12 + s * (Math.PI / 2)) % (Math.PI * 2);
          const swirlR = (obs.width / 3.5) * Math.sin(st.frameCount * 0.05 + s);
          ctx.beginPath();
          ctx.arc(
            centerOrbX + Math.cos(angle) * swirlR,
            centerOrbY + Math.sin(angle) * (obs.height / 2.8),
            3,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Tag label above portal
        ctx.fillStyle = portalColor;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isFlip ? 'GRAVITY' : 'NORMAL', obsScreenX + obs.width / 2, obs.y - 12);
      }
      else if (obs.type === 'orb_jump' || obs.type === 'orb_gravity') {
        const isJump = obs.type === 'orb_jump';
        const orbColor = isJump ? '#FBBF24' : '#10B981';
        
        const cX = obsScreenX + obs.width / 2;
        const cY = obs.y + obs.height / 2;
        const radius = obs.width / 2;

        if (!obs.activated) {
          // Draw outer pulsing ring
          ctx.strokeStyle = orbColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cX, cY, radius + Math.sin(st.frameCount * 0.15) * 4, 0, Math.PI * 2);
          ctx.stroke();

          // Inner glowing core
          ctx.fillStyle = orbColor;
          ctx.beginPath();
          ctx.arc(cX, cY, radius * 0.6 + (st.pulseAmt - 1.0) * 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Activated faint state
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cX, cY, radius * 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      else if (obs.type === 'speed_pad') {
        // Chevron arrows moving on floor
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(obsScreenX, obs.y, obs.width, obs.height);

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        const arrowOffset = (st.frameCount * 2.5) % 20;
        
        ctx.beginPath();
        for (let a = 0; a < obs.width; a += 18) {
          const arrowX = obsScreenX + a + arrowOffset;
          if (arrowX < obsScreenX + obs.width) {
            ctx.moveTo(arrowX - 8, obs.y + 1);
            ctx.lineTo(arrowX, obs.y + obs.height / 2);
            ctx.lineTo(arrowX - 8, obs.y + obs.height - 1);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
    });

    // DRAW PARTICLES
    st.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // DRAW THE HERO (Neon Dino-Cube!)
    const p = st.player;
    if (!st.dead) {
      ctx.save();
      
      // Center translation for Geometry Dash style 360-degree rotation
      const heroCenterX = p.x + p.width / 2 - cameraX;
      const heroCenterY = p.y + p.height / 2;
      
      ctx.translate(heroCenterX, heroCenterY);
      ctx.rotate(p.angle);

      // Cube Color dynamically reflects gravity direction! Green for normal, Hot Pink for flipped
      const dinoCoreColor = p.gravityDirection === 1 ? '#4ADE80' : '#EC4899';
      const dinoBorderColor = p.gravityDirection === 1 ? '#22C55E' : '#D946EF';

      // 1. Draw glowing background shadow box
      ctx.shadowBlur = 12 + st.pulseAmt * 6;
      ctx.shadowColor = dinoCoreColor;

      // 2. Draw Cube body (The Dino-box!)
      ctx.fillStyle = dinoCoreColor;
      ctx.strokeStyle = dinoBorderColor;
      ctx.lineWidth = 3;
      
      const halfSizeX = p.width / 2;
      const halfSizeY = p.height / 2;

      ctx.beginPath();
      ctx.roundRect(-halfSizeX, -halfSizeY, p.width, p.height, 6);
      ctx.fill();
      ctx.stroke();

      // Reset shadows for details
      ctx.shadowBlur = 0;

      // 3. Draw Dino Face Details inside the cube!
      // Plates on its back (Triangular spikes on the back edge)
      ctx.fillStyle = '#EF4444'; // fiery orange-red backplates
      ctx.beginPath();
      // Backplates stay on left side inside the square
      ctx.moveTo(-halfSizeX, -halfSizeY + 8);
      ctx.lineTo(-halfSizeX - 4, -halfSizeY + 12);
      ctx.lineTo(-halfSizeX, -halfSizeY + 16);

      ctx.moveTo(-halfSizeX, -halfSizeY + 20);
      ctx.lineTo(-halfSizeX - 4, -halfSizeY + 24);
      ctx.lineTo(-halfSizeX, -halfSizeY + 28);
      ctx.fill();

      // Determined Dino Eye (draw right of center since facing right)
      ctx.fillStyle = '#0F172A'; // deep pupil
      ctx.fillRect(4, -10, 4, 4);
      ctx.fillStyle = '#FFFFFF'; // white reflection
      ctx.fillRect(2, -10, 2, 2);

      // Smiling or intense mouth line
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(3, 4);
      if (p.isJumping) {
        // Open screaming/jumping mouth!
        ctx.lineTo(8, 7);
        ctx.lineTo(3, 10);
      } else {
        // Focused straight running mouth
        ctx.lineTo(9, 4);
      }
      ctx.stroke();

      // Running pixel legs (if grounded, legs slide up and down!)
      if (p.isGrounded) {
        ctx.fillStyle = '#1E293B';
        const legFlap = Math.floor(st.frameCount / 4) % 2 === 0;
        
        // Left Leg
        ctx.fillRect(-8, halfSizeY, 3, legFlap ? 4 : 2);
        // Right Leg
        ctx.fillRect(2, halfSizeY, 3, legFlap ? 2 : 4);
      }

      ctx.restore();
    }

    // DRAW EXIT GOLDEN GATE (at Level End x: LEVEL_END_X)
    const exitScreenX = LEVEL_END_X - cameraX;
    if (exitScreenX > -100 && exitScreenX < VIRTUAL_WIDTH + 100) {
      ctx.save();
      // Golden giant glow gate
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#FBBF24';
      
      const grad = ctx.createLinearGradient(exitScreenX, CEILING_Y, exitScreenX + 50, GROUND_Y);
      grad.addColorStop(0, '#FBBF24');
      grad.addColorStop(0.5, '#F59E0B');
      grad.addColorStop(1, '#D97706');
      
      ctx.fillStyle = grad;
      ctx.fillRect(exitScreenX, CEILING_Y, 40, GROUND_Y - CEILING_Y);
      
      // Draw cross geometric lines on gate
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.strokeRect(exitScreenX, CEILING_Y, 40, GROUND_Y - CEILING_Y);
      
      ctx.beginPath();
      ctx.moveTo(exitScreenX, CEILING_Y);
      ctx.lineTo(exitScreenX + 40, GROUND_Y);
      ctx.moveTo(exitScreenX + 40, CEILING_Y);
      ctx.lineTo(exitScreenX, GROUND_Y);
      ctx.stroke();
      ctx.restore();
    }

    // DRAW LEVEL SEGMENT FLAGS OR GRAPHICAL OVERLAYS
    // Show attempts progress on screen just like Geometry Dash (e.g. "ATTEMPT 43" when beginning)
    if (st.player.x < 1200) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 22px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ATTEMPT ${localAttempts}`, 500, 200);
      
      if (st.practiceMode) {
        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('PRACTICE MODE ACTIVE', 500, 230);
      }
    }

    // SCREEN FLASHES FOR ACTION EFFECTS
    if (st.flashTicks > 0) {
      // Green flash for checkpoints load
      ctx.fillStyle = `rgba(16, 185, 129, ${st.flashTicks / 15 * 0.25})`;
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    }
    if (st.deathFlashTicks > 0) {
      // Red/White flash for death
      ctx.fillStyle = `rgba(255, 255, 255, ${st.deathFlashTicks / 10 * 0.35})`;
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[2/1] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800 touch-none select-none"
      id="game-canvas-outer"
    >
      <canvas
        ref={canvasRef}
        width={VIRTUAL_WIDTH}
        height={VIRTUAL_HEIGHT}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasClick}
        className="w-full h-full object-contain cursor-pointer"
        id="dino-dash-canvas"
      />

      {/* Floating Checkpoint controls overlay for mobile/touch-only players in practice mode */}
      {gameState === 'PLAYING' && isPracticeMode && !stateRef.current.dead && !stateRef.current.won && (
        <div 
          className="absolute bottom-4 left-4 flex gap-3 z-10"
          id="practice-mode-touch-controls"
        >
          <button
            onClick={(e) => { e.stopPropagation(); placeCheckpoint(); }}
            onTouchStart={(e) => { e.stopPropagation(); placeCheckpoint(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-mono text-xs rounded-lg shadow-md border border-emerald-400 cursor-pointer transition-transform"
            title="Place Checkpoint [Z]"
            id="btn-place-checkpoint-touch"
          >
            <span className="text-sm font-bold">＋</span> Checkpoint (Z)
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); removeCheckpoint(); }}
            onTouchStart={(e) => { e.stopPropagation(); removeCheckpoint(); }}
            disabled={checkpointsCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-white font-mono text-xs rounded-lg shadow-md border border-rose-400 cursor-pointer transition-transform"
            title="Delete Checkpoint [X]"
            id="btn-delete-checkpoint-touch"
          >
            <span className="text-sm font-bold">－</span> Delete (X)
          </button>

          <span 
            className="px-2.5 py-2 bg-slate-900/80 border border-slate-700 text-emerald-400 font-mono text-xs rounded-lg flex items-center justify-center min-w-[50px]"
            id="checkpoint-counter-badge"
          >
            Saved: {checkpointsCount}
          </span>
        </div>
      )}
    </div>
  );
}
