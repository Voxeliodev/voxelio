"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function WonderlandMiniGame({ 
  challengeName, 
  onWin, 
  onClose 
}: { 
  challengeName: string; 
  onWin: () => void; 
  onClose: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isWon, setIsWon] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#87CEEB"); // Sky blue
    
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(400, 400);
    mountRef.current.appendChild(renderer.domElement);

    // 2. Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // 3. Add Target (A red and white target)
    const targetGroup = new THREE.Group();
    
    const outerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: "#ef4444" }) // Red
    );
    outerRing.rotation.x = Math.PI / 2;
    
    const innerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: "#ffffff" }) // White
    );
    innerRing.rotation.x = Math.PI / 2;

    const bullseye = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32),
      new THREE.MeshStandardMaterial({ color: "#ef4444" }) // Red
    );
    bullseye.rotation.x = Math.PI / 2;

    targetGroup.add(outerRing, innerRing, bullseye);
    scene.add(targetGroup);

    // 4. Animation Loop (Spins the target)
    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.02;
      
      // Move the target around in a circle
      targetGroup.position.x = Math.sin(time) * 1.5;
      targetGroup.position.y = Math.cos(time * 1.5) * 1.0;

      renderer.render(scene, camera);
    };
    animate();

    // 5. Click Handler (Raycaster)
    const handleResize = () => {
      renderer.setSize(400, 400);
    };
    window.addEventListener("resize", handleResize);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event: MouseEvent) => {
      if (isWon) return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(targetGroup.children);

      if (intersects.length > 0) {
        setIsWon(true);
        // Make target disappear on hit
        targetGroup.visible = false;
        setTimeout(() => {
          onWin();
        }, 1000);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // 6. Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", onClick);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isWon, onWin]);

  return (
    <div className="flex flex-col items-center bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl border-4 border-[#1E3A8A]">
      <h2 className="text-2xl font-black text-[#1E3A8A] mb-2">{challengeName}</h2>
      <p className="text-gray-600 mb-4 text-center max-w-xs">Click the moving target to win!</p>
      
      <div 
        ref={mountRef} 
        className="w-[400px] h-[400px] rounded-lg overflow-hidden cursor-crosshair shadow-inner border-2 border-[#93C5FD]"
      />

      {isWon ? (
        <div className="mt-4 text-green-600 font-black text-xl animate-bounce">
          🎯 TARGET HIT! Unlocking reward...
        </div>
      ) : (
        <button 
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 hover:text-red-500 font-bold underline"
        >
          Give up and return to challenges
        </button>
      )}
    </div>
  );
}