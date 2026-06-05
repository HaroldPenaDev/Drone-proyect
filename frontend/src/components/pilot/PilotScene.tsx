import { useRef, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { Terrain } from "@/components/pilot/Terrain";
import { PilotDrone } from "@/components/pilot/PilotDrone";
import { ThermalLegend } from "@/components/drone-viewer/ThermalLegend";
import type { PilotEngine, ControlInput } from "@/pilot/PilotEngine";

interface PilotSceneProps {
  engine: PilotEngine;
  inputRef: MutableRefObject<ControlInput>;
}

/**
 * Mundo 3D del pilotaje en vivo: cielo, terreno tipo mapa, iluminación con
 * sombras y cámara que persigue al dron. Reusa la leyenda térmica del visor.
 */
export function PilotScene({ engine, inputRef }: PilotSceneProps) {
  const controlsRef = useRef<any>(null);

  return (
    <div className="relative surface overflow-hidden h-full scene-bg">
      <Canvas
        shadows
        camera={{ position: [10, 7, 16], fov: 50, near: 0.1, far: 1200 }}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={["#aebfce", 90, 380]} />
        <Sky sunPosition={[60, 40, 20]} turbidity={6} rayleigh={1.2} />

        <hemisphereLight args={["#bcd4e6", "#3a4a38", 0.6]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          castShadow
          position={[40, 60, 25]}
          intensity={1.25}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={220}
          shadow-camera-left={-70}
          shadow-camera-right={70}
          shadow-camera-top={70}
          shadow-camera-bottom={-70}
          shadow-bias={-0.0004}
        />

        <Terrain />
        <PilotDrone engine={engine} inputRef={inputRef} controlsRef={controlsRef} />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={90}
          maxPolarAngle={Math.PI / 2 - 0.04}
        />
      </Canvas>

      <ThermalLegend />
    </div>
  );
}
