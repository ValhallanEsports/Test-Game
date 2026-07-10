import { Obstacle, ObstacleType } from '../types';

/**
 * Deterministically generates a sequence of obstacles for the level.
 * Creating a single level with structured sections makes it authentic to Geometry Dash.
 */
export function generateLevel(): Obstacle[] {
  const obstacles: Obstacle[] = [];
  let obstacleId = 0;

  const createObstacle = (
    x: number,
    y: number,
    width: number,
    height: number,
    type: ObstacleType
  ) => {
    obstacles.push({
      id: `obs-${obstacleId++}`,
      x,
      y,
      width,
      height,
      type,
      passed: false,
    });
  };

  // --- STAGE 1: TUTORIAL GROUND (0% - 15%, x: 1000 to 3000) ---
  // Introduction to single spikes and block jumps
  createObstacle(1200, 370, 30, 30, 'spike');
  createObstacle(1700, 370, 30, 30, 'spike');
  
  // Single block to jump on
  createObstacle(2100, 360, 80, 40, 'block');
  createObstacle(2125, 330, 30, 30, 'spike'); // Spike on top of block!
  
  createObstacle(2600, 370, 30, 30, 'spike');
  createObstacle(2800, 370, 30, 30, 'spike');

  // --- STAGE 2: DOUBLE TROUBLE & DUCKING (15% - 30%, x: 3200 to 6000) ---
  // Double spikes, mid/low altitude pterodactyls
  createObstacle(3300, 370, 60, 30, 'double_spike'); // Double spike on ground
  
  // Low pterodactyl - must jump over
  createObstacle(3800, 350, 40, 30, 'pterodactyl_low');
  
  // Mid pterodactyl - must duck under!
  createObstacle(4300, 300, 40, 30, 'pterodactyl_mid');
  
  // Speed pad introduction
  createObstacle(4600, 390, 60, 10, 'speed_pad');
  // Spike right after speed pad to test fast reflexes!
  createObstacle(4900, 370, 30, 30, 'spike');
  
  // Block stairway
  createObstacle(5300, 340, 100, 30, 'block');
  createObstacle(5450, 280, 100, 30, 'block');
  createObstacle(5500, 250, 30, 30, 'spike'); // Spike on the upper stair

  // --- STAGE 3: GRAVITY FLIP INTRO (30% - 50%, x: 6200 to 10000) ---
  // Introduction of Gravity Flip Portals and ceiling runners!
  createObstacle(6200, 250, 40, 100, 'portal_gravity_flip'); // Flips gravity
  
  // Now running on ceiling (y: 100). Spikes hang downwards from ceiling (base at y:100, height 30)
  createObstacle(6800, 100, 30, 30, 'spike'); // Hangs down
  createObstacle(7300, 100, 60, 30, 'double_spike'); // Double spike on ceiling
  
  // Pterodactyl that flies near the ceiling
  createObstacle(7800, 150, 40, 30, 'pterodactyl_low'); // Ground-relative "low" becomes ceiling "high"
  
  // Restore gravity portal
  createObstacle(8400, 250, 40, 100, 'portal_gravity_normal');
  
  // Double spike right after normal gravity restore
  createObstacle(8900, 370, 60, 30, 'double_spike');
  createObstacle(9400, 360, 80, 40, 'block');
  createObstacle(9480, 370, 30, 30, 'spike'); // Spike hiding right after the block

  // --- STAGE 4: THE AIRBORNE ORBS (50% - 70%, x: 10200 to 14500) ---
  // Introduction of Yellow Orbs (mid-air jump taps) and Green Orbs (mid-air gravity toggles)
  createObstacle(10300, 370, 90, 30, 'triple_spike'); // Too wide to jump normally!
  createObstacle(10250, 240, 30, 30, 'orb_jump'); // Must tap in air above the spike to double jump!
  
  createObstacle(11000, 360, 150, 40, 'block');
  createObstacle(11150, 180, 30, 30, 'orb_jump'); // Air jump orb leading to a higher block
  createObstacle(11300, 150, 100, 30, 'block');
  
  // Green Gravity Orb introduction - switches gravity instantly mid-air!
  createObstacle(12100, 370, 90, 30, 'triple_spike');
  createObstacle(12050, 250, 30, 30, 'orb_gravity'); // Tap here to flip gravity instantly and land on ceiling
  
  // Ceiling hurdles (ceiling is at y: 100)
  createObstacle(12700, 100, 60, 30, 'double_spike');
  createObstacle(13100, 140, 30, 30, 'orb_gravity'); // Tap in air to return to normal floor
  
  createObstacle(13600, 370, 90, 30, 'triple_spike');
  createObstacle(14100, 370, 90, 30, 'triple_spike');
  createObstacle(14050, 240, 30, 30, 'orb_jump');

  // --- STAGE 5: THE HYBRID GAUNTLET (70% - 90%, x: 14700 to 19500) ---
  // High-speed, portals, double gravity flips, extreme action!
  createObstacle(14800, 390, 60, 10, 'speed_pad'); // High speed
  createObstacle(15200, 250, 40, 100, 'portal_gravity_flip'); // Instant flip at high speed!
  createObstacle(15600, 100, 90, 30, 'triple_spike'); // Triple spike on ceiling at high speed
  createObstacle(15550, 200, 30, 30, 'orb_jump'); // Yellow orb to jump over ceiling obstacle
  
  createObstacle(16300, 250, 40, 100, 'portal_gravity_normal'); // Restore gravity
  createObstacle(16700, 370, 90, 30, 'triple_spike');
  createObstacle(16650, 240, 30, 30, 'orb_gravity'); // Green orb flips gravity
  
  createObstacle(17100, 100, 60, 30, 'double_spike');
  createObstacle(17300, 140, 30, 30, 'orb_gravity'); // Green orb restore gravity
  
  createObstacle(17700, 360, 100, 40, 'block');
  createObstacle(17900, 220, 100, 40, 'block');
  createObstacle(17950, 120, 30, 30, 'orb_jump'); // Triple jump sequence
  createObstacle(18500, 370, 90, 30, 'triple_spike');
  createObstacle(19100, 370, 90, 30, 'triple_spike');
  createObstacle(19050, 240, 30, 30, 'orb_jump');

  // --- STAGE 6: THE FINAL ESCAPE (90% - 100%, x: 19700 to 22000) ---
  // Ultimate test of timing
  createObstacle(19800, 390, 60, 10, 'speed_pad'); // Max speed
  createObstacle(20300, 370, 90, 30, 'triple_spike');
  createObstacle(20250, 240, 30, 30, 'orb_jump');
  createObstacle(20700, 250, 40, 100, 'portal_gravity_flip'); // Final flip
  createObstacle(21100, 100, 90, 30, 'triple_spike');
  createObstacle(21050, 200, 30, 30, 'orb_gravity'); // Gravity orb mid-air
  
  // Normal floor for the final landing
  createObstacle(21500, 250, 40, 100, 'portal_gravity_normal');

  return obstacles;
}
