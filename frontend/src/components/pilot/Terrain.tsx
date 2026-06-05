import { Grid } from "@react-three/drei";

/**
 * Mapa procedural por donde vuela el dron: campo de vuelo con helipuerto,
 * edificios y arboleda. Todo determinista (posiciones fijas) y sin assets
 * externos. Los volúmenes proyectan sombra; el suelo la recibe.
 */

// [x, z, ancho, alto, profundidad, color]
const BUILDINGS: [number, number, number, number, number, string][] = [
  [-28, -22, 8, 14, 8, "#3a4456"],
  [-20, -30, 6, 22, 6, "#2f3849"],
  [-34, -34, 7, 9, 7, "#434d61"],
  [26, 18, 9, 18, 9, "#333c4d"],
  [34, 26, 6, 11, 6, "#3a4456"],
  [22, 30, 7, 26, 7, "#2b3343"],
  [30, -28, 10, 8, 10, "#3f4859"],
  [-30, 28, 8, 16, 8, "#353e50"],
  [18, -34, 5, 12, 5, "#424b5d"],
];

// [x, z, escala]
const TREES: [number, number, number][] = [
  [-12, 10, 1.0], [-15, 14, 1.4], [-10, 16, 0.8], [-18, 9, 1.1],
  [12, -12, 1.2], [16, -10, 0.9], [10, -16, 1.3], [18, -14, 1.0],
  [-14, -12, 1.1], [14, 12, 1.2], [8, 20, 0.9], [-8, -18, 1.0],
  [40, -8, 1.5], [-40, 6, 1.3], [6, -40, 1.1], [-6, 40, 1.2],
];

function Helipad() {
  return (
    <group position={[0, 0.02, 0]}>
      {/* Plataforma */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial color="#1c2433" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Anillo exterior */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[4.3, 4.7, 48]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
      {/* Letra H */}
      {[
        [-1.4, 0.4, 3], // poste izq
        [1.4, 0.4, 3], // poste der
        [0, 2.8, 0.4], // travesaño
      ].map(([x, w, d], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color="#e2e8f0" />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.2, 6]} />
        <meshStandardMaterial color="#5b4636" roughness={1} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        <coneGeometry args={[1.1, 2.6, 8]} />
        <meshStandardMaterial color="#2f6d43" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Terrain() {
  return (
    <group>
      {/* Suelo lejano (horizonte) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#223028" roughness={1} />
      </mesh>
      {/* Campo de vuelo central */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#2a3a2f" roughness={1} />
      </mesh>

      {/* Cuadrícula técnica sutil */}
      <Grid
        args={[120, 120]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#3a4d3f"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#4a6152"
        fadeDistance={140}
        fadeStrength={1.5}
        position={[0, 0.01, 0]}
      />

      <Helipad />

      {BUILDINGS.map(([x, z, w, h, d, color], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} roughness={0.75} metalness={0.15} />
        </mesh>
      ))}

      {TREES.map(([x, z, s], i) => (
        <Tree key={i} x={x} z={z} s={s} />
      ))}
    </group>
  );
}
