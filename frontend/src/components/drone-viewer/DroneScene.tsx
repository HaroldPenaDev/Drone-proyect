import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { DroneModel } from "@/components/drone-viewer/DroneModel";
import type { DroneSnapshot } from "@/types";

interface DroneSceneProps {
  snapshot: DroneSnapshot | null;
}

export function DroneScene({ snapshot }: DroneSceneProps) {
  return (
    <div className="bg-drone-panel rounded-lg border border-drone-border overflow-hidden h-[350px]">
      <Canvas camera={{ position: [0.5, 0.4, 0.5], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <DroneModel snapshot={snapshot} />
        <Grid
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor="#475569"
          fadeDistance={5}
          position={[0, -0.1, 0]}
        />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.3}
          maxDistance={3}
        />
      </Canvas>
    </div>
  );
}
