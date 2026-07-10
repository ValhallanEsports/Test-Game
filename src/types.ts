export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER';

export type ObstacleType =
  | 'spike'
  | 'double_spike'
  | 'triple_spike'
  | 'pterodactyl_low'   // low-altitude pterodactyl (must jump over, or duck under if gravity flipped)
  | 'pterodactyl_mid'   // mid-altitude pterodactyl (must duck under, or jump over)
  | 'pterodactyl_high'  // high-altitude pterodactyl (usually harmless unless gravity flipped)
  | 'block'             // solid platform block to jump onto
  | 'portal_gravity_flip' // purple portal that flips gravity
  | 'portal_gravity_normal' // blue portal that restores normal gravity
  | 'orb_jump'          // yellow orb (click/tap mid-air inside radius to jump again)
  | 'orb_gravity'       // green orb (click/tap mid-air inside radius to toggle gravity instantly)
  | 'speed_pad';        // yellow floor pad that boosts speed temporarily

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  passed: boolean;
  activated?: boolean; // For orbs and portals to prevent double activation
}

export interface Checkpoint {
  id: string;
  x: number; // The relative spawn position along the level track
  y: number;
  vy: number;
  gravityDirection: number;
  angle: number;
  score: number;
  gameSpeed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxLife: number;
  life: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  attempts: number;
  isPracticeMode: boolean;
  levelProgress: number; // 0 to 100 representing distance to the portal finish line!
}
