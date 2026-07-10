/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, CapsuleCollider } from '@react-three/rapier';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';

const SPEED = 12;
const MAX_LASER_DIST = 100;

function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function getSafeSpawn(deathPos?: [number, number, number] | { x: number, y: number, z: number }) {
  const isMobile = typeof window !== 'undefined' && (
    window.matchMedia('(pointer: coarse)').matches || 
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 || 
    window.innerWidth < 768
  );
  const count = isMobile ? 60 : 150;
  const rngLocal = mulberry32(12345);
  const obstacles = Array.from({ length: count }).map(() => {
    const x = (rngLocal() - 0.5) * 170;
    const z = (rngLocal() - 0.5) * 170;
    if (Math.abs(x) < 20 && Math.abs(z) < 20) return null;
    const height = rngLocal() * 8 + 6;
    const isHorizontal = rngLocal() > 0.5;
    const width = isHorizontal ? rngLocal() * 25 + 10 : rngLocal() * 3 + 1;
    const depth = isHorizontal ? rngLocal() * 3 + 1 : rngLocal() * 25 + 10;
    return { x, z, width, depth };
  }).filter(Boolean) as { x: number, z: number, width: number, depth: number }[];

  let bestSpawn: [number, number, number] = [0, 2, 0];
  let maxDistSq = -1;

  // Find a safe spot
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = (Math.random() - 0.5) * 160; // Keep slightly away from walls (-80 to 80)
    const z = (Math.random() - 0.5) * 160;
    
    // Check if too close to any obstacle (with 2.0 units padding for extra safety)
    let safe = true;
    for (const obs of obstacles) {
      const halfW = obs.width / 2 + 2.0;
      const halfD = obs.depth / 2 + 2.0;
      if (Math.abs(x - obs.x) < halfW && Math.abs(z - obs.z) < halfD) {
        safe = false;
        break;
      }
    }
    if (safe) {
      if (deathPos) {
        const dx = 'x' in deathPos ? deathPos.x : deathPos[0];
        const dz = 'z' in deathPos ? deathPos.z : deathPos[2];
        const distSq = (x - dx) ** 2 + (z - dz) ** 2;
        
        // If we find a safe point at least 70 units away, return immediately!
        if (distSq > 70 * 70) {
          return [x, 2, z] as [number, number, number];
        }
        
        if (distSq > maxDistSq) {
          maxDistSq = distSq;
          bestSpawn = [x, 2, z];
        }
      } else {
        return [x, 2, z] as [number, number, number];
      }
    }
  }

  if (deathPos && maxDistSq > 0) {
    return bestSpawn;
  }

  // Fallback to center which is guaranteed clear of obstacles
  return [0, 2, 0] as [number, number, number];
}

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { rapier, world } = useRapier();

  // Enforce standard FPS camera rotation order (YXZ) on mount and when camera changes
  useEffect(() => {
    camera.rotation.order = 'YXZ';
  }, [camera]);
  
  const playerState = useGameStore(state => state.playerState);
  const gameState = useGameStore(state => state.gameState);
  const addLaser = useGameStore(state => state.addLaser);
  const hitEnemy = useGameStore(state => state.hitEnemy);
  const addParticles = useGameStore(state => state.addParticles);

  const keys = useRef({ 
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
    q: false, e: false
  });
  const lastEmitTime = useRef(0);
  const lastShootTime = useRef(0);
  const leanAmount = useRef(0);

  const gunGroupRef = useRef<THREE.Group>(null);
  const gunVisualRef = useRef<THREE.Group>(null);
  const gunBarrelRef = useRef<THREE.Group>(null);

  const previousPlayerState = useRef(playerState);
  const previousGameState = useRef(gameState);

  const updatePlayerPosition = useGameStore(state => state.updatePlayerPosition);

  useEffect(() => {
    if (playerState === 'disabled') {
      // We got eliminated! Instantly find a safe spawn FAR away from our current position.
      let currentPos: [number, number, number] = [0, 2, 0];
      if (body.current) {
        const translation = body.current.translation();
        currentPos = [translation.x, translation.y, translation.z];
      }
      
      const [rx, ry, rz] = getSafeSpawn(currentPos);
      
      if (body.current) {
        body.current.setTranslation({ x: rx, y: ry, z: rz }, true);
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        // Reset camera position and clear pitch & roll, keep yaw
        camera.position.set(rx, ry + 1.6, rz);
        camera.rotation.set(0, camera.rotation.y, 0); 
        // Update the position to server immediately
        updatePlayerPosition([rx, ry, rz], camera.rotation.y);
      }

      const timer = setTimeout(() => {
        // Reactivate player!
        useGameStore.getState().setPlayerState('active');
      }, 2500);

      return () => clearTimeout(timer);
    }
    previousPlayerState.current = playerState;
  }, [playerState, camera, updatePlayerPosition]);

  useEffect(() => {
    if (gameState === 'playing' && previousGameState.current !== 'playing') {
      // Game just started or restarted! Let's reset player position to center [0, 2, 0].
      if (body.current) {
        body.current.setTranslation({ x: 0, y: 2, z: 0 }, true);
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        camera.position.set(0, 2 + 1.6, 0);
        updatePlayerPosition([0, 2, 0], camera.rotation.y);
      }
    }
    previousGameState.current = gameState;
  }, [gameState, camera, updatePlayerPosition]);

  // More robust mobile detection (checks for touch support)
  const isTouchDevice = useRef(false);
  useEffect(() => {
    isTouchDevice.current = window.matchMedia('(pointer: coarse)').matches || 
                           'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Shooting logic function
  const shoot = () => {
    if (gameState !== 'playing' || playerState !== 'active') return;
    
    // Rate limit shooting
    const now = Date.now();
    if (now - lastShootTime.current < 200) return;
    lastShootTime.current = now;

    // Raycast from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Start raycast slightly ahead of the camera to avoid hitting the player's own collider
    const rayStart = camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(0.8));
    const ray = new rapier.Ray(rayStart, raycaster.ray.direction);
    const hit = world.castRay(ray, MAX_LASER_DIST, true);

    const startPosVec = new THREE.Vector3();
    if (gunBarrelRef.current) {
      gunBarrelRef.current.getWorldPosition(startPosVec);
    } else {
      startPosVec.copy(camera.position);
    }
    const startPos: [number, number, number] = [startPosVec.x, startPosVec.y, startPosVec.z];

    // Apply recoil
    if (gunVisualRef.current) {
      gunVisualRef.current.position.z = -0.4;
      gunVisualRef.current.rotation.x = 0.1;
    }

    let endPos: [number, number, number];

    if (hit) {
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      endPos = [hitPoint.x, hitPoint.y, hitPoint.z];
      
      const collider = hit.collider;
      const rb = collider.parent();
      if (rb && rb.userData) {
        const userData = rb.userData as { name?: string };
        const name = userData.name;
        
        if (name) {
          // Check if it's a bot
          if (name.startsWith('bot-')) {
            hitEnemy(name, true);
          } 
          // Check if it's another player (socket ID)
          else if (name !== 'player' && useGameStore.getState().otherPlayers[name]) {
            hitEnemy(name, true);
          }
        }
      }
      
      addParticles(endPos, '#00ffff');
    } else {
      endPos = [
        camera.position.x + raycaster.ray.direction.x * MAX_LASER_DIST,
        camera.position.y + raycaster.ray.direction.y * MAX_LASER_DIST,
        camera.position.z + raycaster.ray.direction.z * MAX_LASER_DIST
      ];
    }

    addLaser(startPos, endPos, '#00ffff');
  };

  useFrame((_, delta) => {
    // 1. Enforce standard FPS camera rotation order (YXZ) at all times
    camera.rotation.order = 'YXZ';

    if (!body.current) return;

    if (gameState !== 'playing') {
      camera.rotation.z = 0;
      return;
    }

    const pos = body.current.translation();

    // 2. Handle death/disabled pause state
    if (playerState === 'disabled') {
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      
      // Stand upright at standard height at the new spawn location
      camera.position.set(pos.x, pos.y + 1.6, pos.z);

      // Clear any tilt (Z-axis roll) so they start clean
      camera.rotation.z = 0;

      // Move gun down to show shield/spawn-guard is active
      if (gunGroupRef.current) {
        gunGroupRef.current.position.copy(camera.position);
        gunGroupRef.current.quaternion.copy(camera.quaternion);
        if (gunVisualRef.current) {
          gunVisualRef.current.position.y = THREE.MathUtils.lerp(gunVisualRef.current.position.y, -0.8, delta * 10);
        }
      }
      
      // Emit position to server
      const now = Date.now();
      if (now - lastEmitTime.current > 50) {
        updatePlayerPosition([pos.x, pos.y, pos.z], camera.rotation.y);
        lastEmitTime.current = now;
      }
      return;
    }

    const mobileInput = useGameStore.getState().mobileInput;

    // Handle Mobile Shooting
    if (mobileInput.shooting) {
      shoot();
    }

    // Movement
    const velocity = body.current.linvel();
    
    const k = keys.current;
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    // Combine keyboard and joystick input
    const joyMoveZ = -mobileInput.move.y;
    const joyMoveX = mobileInput.move.x;

    const combinedMoveZ = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + joyMoveZ;
    const combinedMoveX = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + joyMoveX;

    const direction = new THREE.Vector3();
    direction.addScaledVector(forward, combinedMoveZ);
    direction.addScaledVector(right, combinedMoveX);
    
    if (direction.lengthSq() > 0) {
      if (direction.lengthSq() > 1) direction.normalize();
      direction.multiplyScalar(SPEED);
    }

    body.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    // Mobile Look Rotation
    if (Math.abs(mobileInput.look.x) > 0.01 || Math.abs(mobileInput.look.y) > 0.01) {
      const lookSpeed = 2.0 * delta;
      camera.rotation.y -= mobileInput.look.x * lookSpeed;
      camera.rotation.x -= mobileInput.look.y * lookSpeed;
      camera.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation.x));
    }

    // Leaning
    const targetLeanAmount = (k.e ? 1 : 0) - (k.q ? 1 : 0);
    leanAmount.current = THREE.MathUtils.lerp(leanAmount.current, targetLeanAmount, delta * 10);
    
    const leanOffsetDist = 0.6; // shift 0.6 units to the side
    const leanShift = right.clone().multiplyScalar(leanAmount.current * leanOffsetDist);
    const leanHeightDrop = Math.abs(leanAmount.current) * 0.15; // drop head slightly

    // Update camera position to follow rigid body with lean offsets
    camera.position.set(
      pos.x + leanShift.x,
      pos.y + 1.6 - leanHeightDrop,
      pos.z + leanShift.z
    );

    // Apply lean roll (Z axis)
    camera.rotation.z = -0.15 * leanAmount.current;

    // Sync gun to camera
    if (gunGroupRef.current) {
      gunGroupRef.current.position.copy(camera.position);
      gunGroupRef.current.quaternion.copy(camera.quaternion);
    }
    
    // Recover recoil and reset gun vertical offset
    if (gunVisualRef.current) {
      gunVisualRef.current.position.y = THREE.MathUtils.lerp(gunVisualRef.current.position.y, -0.3, delta * 10);
      gunVisualRef.current.position.z = THREE.MathUtils.lerp(gunVisualRef.current.position.z, -0.6, delta * 15);
      gunVisualRef.current.rotation.x = THREE.MathUtils.lerp(gunVisualRef.current.rotation.x, 0, delta * 15);
    }

    // Emit position to server
    const now = Date.now();
    if (now - lastEmitTime.current > 50) {
      updatePlayerPosition([pos.x, pos.y, pos.z], camera.rotation.y);
      lastEmitTime.current = now;
    }
  });

  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement && gameState === 'playing' && playerState === 'active') {
        shoot();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [gameState, playerState, camera, world, rapier, hitEnemy, addParticles, addLaser]);

  return (
    <>
      {!isTouchDevice.current && <PointerLockControls />}
      <RigidBody
        ref={body}
        colliders={false}
        mass={1}
        type="dynamic"
        position={[0, 2, 0]}
        enabledRotations={[false, false, false]}
        userData={{ name: 'player' }}
        friction={0}
      >
        <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} friction={0} />
      </RigidBody>

      {/* First Person Gun */}
      <group ref={gunGroupRef}>
        <group ref={gunVisualRef} position={[0.4, -0.3, -0.6]}>
          {/* Main body */}
          <mesh position={[0, 0, 0.2]}>
            <boxGeometry args={[0.1, 0.15, 0.4]} />
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Barrel */}
          <mesh position={[0, 0.05, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
            <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Neon accents */}
          <mesh position={[0, 0.08, 0.1]}>
            <boxGeometry args={[0.11, 0.02, 0.2]} />
            <meshBasicMaterial color="#00ffff" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.05, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
            <meshBasicMaterial color="#ff00ff" toneMapped={false} />
          </mesh>
          {/* Barrel Tip Reference */}
          <group ref={gunBarrelRef} position={[0, 0.05, -0.3]} />
        </group>
      </group>
    </>
  );
}
