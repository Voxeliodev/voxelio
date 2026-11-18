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
    scene.fog = new THREE.Fog("#87CEEB", 10, 50); // Blends the horizon

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

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

    // 5. Snowy Ground
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: "#F0F8FF" }); // Snow white
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 6. The Player (A simple blue capsule)
    const playerGroup = new THREE.Group();
    const playerBody = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1, 4, 8),
      new THREE.MeshStandardMaterial({ color: "#1E3A8A" })
    );
    playerBody.position.y = 1;
    playerGroup.add(playerBody);
    scene.add(playerGroup);

    // 7. Challenge Pillars (The 3 challenges)
    const pillars: { mesh: THREE.Mesh, id: string, rewardId: string, position: THREE.Vector3 }[] = [];
    const pillarPositions = [
      { pos: [-10, 0, -10], color: "#00E5FF" }, // Frozen Lake
      { pos: [10, 0, -10], color: "#FFFFFF" },  // Snowball Fight
      { pos: [0, 0, -20], color: "#FF69B4" },   // Sweet Tooth
    ];

    WONDERLAND_CHALLENGES.forEach((ch, index) => {
      const geo = new THREE.CylinderGeometry(2, 2, 5, 16);
      const mat = new THREE.MeshStandardMaterial({ 
        color: pillarPositions[index].color, 
        emissive: pillarPositions[index].color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
      });
      const pillar = new THREE.Mesh(geo, mat);
      pillar.position.set(pillarPositions[index].pos[0], 2.5, pillarPositions[index].pos[2]);
      scene.add(pillar);
      
      pillars.push({ 
        mesh: pillar, 
        id: ch.id, 
        rewardId: ch.rewardItemId, 
        position: pillar.position 
      });
    });

    // 8. Controls (WASD)
    const keys: Record<string, boolean> = { w: false, a: false, s: false, d: false };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key in keys) keys[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key in keys) keys[e.key] = false; };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // 9. Animation Loop
    let animationId: number;
    const speed = 0.15;
    let lastNearId: string | null = null;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Move player
      if (keys.w) playerGroup.position.z -= speed;
      if (keys.s) playerGroup.position.z += speed;
      if (keys.a) playerGroup.position.x -= speed;
      if (keys.d) playerGroup.position.x += speed;

      // Camera follows player (Third person)
      camera.position.x = playerGroup.position.x;
      camera.position.z = playerGroup.position.z + 10;
      camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z);

      // Check if player is near a challenge pillar
      let currentlyNear: string | null = null;
      pillars.forEach((p) => {
        const dist = playerGroup.position.distanceTo(p.position);
        if (dist < 4) {
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

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
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
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-black/50 text-white p-4 rounded-lg backdrop-blur pointer-events-none">
        <h2 className="font-black text-xl mb-1 text-[#00E5FF]">Voxelio Wonderland</h2>
        <p className="text-sm">Use <strong className="text-white">W A S D</strong> to walk around.</p>
        <p className="text-sm mt-2 text-yellow-300">Walk into a glowing pillar to complete its challenge!</p>
      </div>

      <button 
        onClick={onExit}
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded shadow-lg"
      >
        Exit Game
      </button>

      {/* Interaction Prompt */}
      {nearChallenge && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 px-8 py-4 rounded-xl shadow-2xl border-4 border-[#1E3A8A] text-center animate-bounce">
          <p className="font-black text-xl text-[#1E3A8A] mb-2">Challenge Found!</p>
          <button 
            onClick={() => {
              const pillar = WONDERLAND_CHALLENGES.find(c => c.id === nearChallenge);
              if (pillar) {
                onCompleteChallenge(pillar.id, pillar.rewardItemId);
                onExit(); // Exit 3D world back to UI
              }
            }}
            className="bg-[#FFD700] hover:bg-[#FFC000] text-[#1E3A8A] font-black px-6 py-2 rounded-lg border-2 border-[#B45309] transition"
          >
            Complete Challenge
          </button>
        </div>
      )}
    </div>
  );
}