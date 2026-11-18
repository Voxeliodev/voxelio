"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { WONDERLAND_CHALLENGES } from "../../lib/wonderland";

export default function Wonderland3D({ 
  onCompleteChallenge, 
  onExit 
}: { 
  onCompleteChallenge: (id: string, rewardId: string) => void; 
  onExit: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [nearChallenge, setNearChallenge] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#87CEEB"); // Sky blue
    scene.fog = new THREE.Fog("#87CEEB", 20, 100);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 5. Player Physics Variables
    const playerGroup = new THREE.Group();
    const playerBody = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1, 4, 8),
      new THREE.MeshStandardMaterial({ color: "#1E3A8A" })
    );
    playerBody.position.y = 1;
    playerGroup.add(playerBody);
    scene.add(playerGroup);

    const velocity = new THREE.Vector3(0, 0, 0);
    let isGrounded = false;
    const gravity = -25;

    // 6. Build the Obby Course (Platforms)
    const platforms: { mesh: THREE.Mesh, box: THREE.Box3 }[] = [];
    
    // Start Platform
    const startPlat = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1, 8),
      new THREE.MeshStandardMaterial({ color: "#E0F2FE" }) // Snow
    );
    startPlat.position.set(0, 0, 0);
    scene.add(startPlat);
    platforms.push({ mesh: startPlat, box: new THREE.Box3().setFromObject(startPlat) });

    // Floating Platforms (Obby path)
    const platformData = [
      { pos: [0, 1, -10], size: [4, 1, 4] },
      { pos: [4, 3, -18], size: [4, 1, 4] },
      { pos: [-4, 5, -25], size: [4, 1, 4] },
      { pos: [0, 7, -32], size: [6, 1, 6] }, // Final Island
    ];

    platformData.forEach((p) => {
      const plat = new THREE.Mesh(
        new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]),
        new THREE.MeshStandardMaterial({ color: "#BAE6FD" }) // Ice
      );
      plat.position.set(p.pos[0], p.pos[1], p.pos[2]);
      scene.add(plat);
      platforms.push({ mesh: plat, box: new THREE.Box3().setFromObject(plat) });
    });

    // 7. Challenge Pillars (on the final island)
    const pillars: { id: string, rewardId: string, mesh: THREE.Mesh }[] = [];
    const challengeColors = ["#00E5FF", "#FFFFFF", "#FF69B4"];

    WONDERLAND_CHALLENGES.forEach((ch, index) => {
      const geo = new THREE.CylinderGeometry(1, 1, 3, 16);
      const mat = new THREE.MeshStandardMaterial({ 
        color: challengeColors[index], 
        emissive: challengeColors[index],
        emissiveIntensity: 0.8 
      });
      const pillar = new THREE.Mesh(geo, mat);
      // Space them out on the final island
      pillar.position.set(-4 + (index * 4), 8.5, -32); 
      scene.add(pillar);
      
      pillars.push({ 
        id: ch.id, 
        rewardId: ch.rewardItemId, 
        mesh: pillar 
      });
    });

    // 8. Controls
    const keys: Record<string, boolean> = { w: false, a: false, s: false, d: false, " ": false };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key in keys) keys[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key in keys) keys[e.key] = false; };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // 9. Game Loop
    let animationId: number;
    let lastNearId: string | null = null;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const speed = 8;

      // Horizontal Movement
      const moveDir = new THREE.Vector3(0, 0, 0);
      if (keys.w) moveDir.z -= 1;
      if (keys.s) moveDir.z += 1;
      if (keys.a) moveDir.x -= 1;
      if (keys.d) moveDir.x += 1;

      if (moveDir.length() > 0) {
        moveDir.normalize();
        playerGroup.position.x += moveDir.x * speed * delta;
        playerGroup.position.z += moveDir.z * speed * delta;
      }

      // Jumping
      if (keys[" "] && isGrounded) {
        velocity.y = 10; // Jump force
        isGrounded = false;
      }

      // Gravity
      velocity.y += gravity * delta;
      playerGroup.position.y += velocity.y * delta;

      // Platform Collision Detection
      isGrounded = false;
      const playerBox = new THREE.Box3().setFromObject(playerBody);
      
      for (const plat of platforms) {
        // If player is falling and intersects the platform bounds
        if (velocity.y <= 0 && playerBox.intersectsBox(plat.box)) {
          // Check if feet are near the top of the platform
          const platTop = plat.box.max.y;
          if (playerGroup.position.y - 1 <= platTop && playerGroup.position.y - 1 > platTop - 0.5) {
            playerGroup.position.y = platTop + 1; // Snap to top
            velocity.y = 0;
            isGrounded = true;
            break;
          }
        }
      }

      // Respawn if fell off the map
      if (playerGroup.position.y < -20) {
        playerGroup.position.set(0, 2, 0);
        velocity.y = 0;
      }

      // Camera Follow
      camera.position.x = playerGroup.position.x;
      camera.position.z = playerGroup.position.z + 12;
      camera.position.y = playerGroup.position.y + 5;
      camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z);

      // Check Challenge Zones
      let currentlyNear: string | null = null;
      pillars.forEach((p) => {
        const dist = playerGroup.position.distanceTo(p.mesh.position);
        if (dist < 3) {
          currentlyNear = p.id;
        }
      });

      if (currentlyNear !== lastNearId) {
        lastNearId = currentlyNear;
        setNearChallenge(currentlyNear);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={mountRef} className="absolute inset-0" />
      
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 bg-black/60 text-white p-4 rounded-lg backdrop-blur pointer-events-none border border-white/20 shadow-xl">
        <h2 className="font-black text-xl mb-1 text-[#00E5FF]">Voxelio Wonderland</h2>
        <p className="text-sm font-semibold text-white/90">Use <kbd className="bg-white/20 px-1 rounded">W A S D</kbd> to move.</p>
        <p className="text-sm font-semibold text-white/90">Press <kbd className="bg-white/20 px-1 rounded">Spacebar</kbd> to jump.</p>
        <p className="text-sm mt-2 text-yellow-300 font-bold">Jump across the ice to reach the challenges!</p>
      </div>

      <button 
        onClick={onExit}
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded shadow-lg border-2 border-red-800 transition"
      >
        Exit Game
      </button>

      {/* Interaction Prompt */}
      {nearChallenge && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/95 px-8 py-4 rounded-xl shadow-2xl border-4 border-[#1E3A8A] text-center animate-bounce">
          <p className="font-black text-xl text-[#1E3A8A] mb-2">Challenge Zone Reached!</p>
          <button 
            onClick={() => {
              const pillar = WONDERLAND_CHALLENGES.find(c => c.id === nearChallenge);
              if (pillar) {
                onCompleteChallenge(pillar.id, pillar.rewardItemId);
                onExit(); 
              }
            }}
            className="bg-[#FFD700] hover:bg-[#FFC000] text-[#1E3A8A] font-black px-6 py-2 rounded-lg border-2 border-[#B45309] transition shadow-md"
          >
            Claim Reward
          </button>
        </div>
      )}
    </div>
  );
}