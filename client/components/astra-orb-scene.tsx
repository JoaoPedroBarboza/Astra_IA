"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sparkles, Sphere, Torus } from "@react-three/drei";
import * as THREE from "three";
import type { AstraOrbState } from "./astra-orb";

type StateConfig = {
  distort: number;
  wobbleSpeed: number;
  coreScale: number;
  coreEmissive: number;
  coreColor: string;
  /** Brilho da casca de energia (borda luminosa) em volta do núcleo. */
  shell: number;
  shellColor: string;
  electronSpeed: number;
  assemblySpin: number;
  ringOpacity: number;
  glowOpacity: number;
};

const STATE_CONFIG: Record<AstraOrbState, StateConfig> = {
  idle: {
    distort: 0.1, wobbleSpeed: 0.6, coreScale: 1.0, coreEmissive: 1.5, coreColor: "#cfeeff",
    shell: 1.4, shellColor: "#4fc3f0",
    electronSpeed: 0.9, assemblySpin: 0.08, ringOpacity: 0.72, glowOpacity: 0.72,
  },
  connecting: {
    distort: 0.16, wobbleSpeed: 1.2, coreScale: 1.02, coreEmissive: 1.7, coreColor: "#dbf4ff",
    shell: 1.6, shellColor: "#4fcdf5",
    electronSpeed: 1.3, assemblySpin: 0.16, ringOpacity: 0.8, glowOpacity: 0.8,
  },
  listening: {
    distort: 0.2, wobbleSpeed: 1.6, coreScale: 1.06, coreEmissive: 2.0, coreColor: "#e8fbff",
    shell: 1.9, shellColor: "#4fd8ff",
    electronSpeed: 1.7, assemblySpin: 0.2, ringOpacity: 0.9, glowOpacity: 0.9,
  },
  thinking: {
    distort: 0.3, wobbleSpeed: 2.6, coreScale: 1.03, coreEmissive: 2.1, coreColor: "#dde8ff",
    shell: 2.1, shellColor: "#7aa8ff",
    electronSpeed: 2.6, assemblySpin: 0.36, ringOpacity: 0.88, glowOpacity: 0.92,
  },
  speaking: {
    distort: 0.38, wobbleSpeed: 3.4, coreScale: 1.14, coreEmissive: 2.7, coreColor: "#ffffff",
    shell: 2.7, shellColor: "#6fe0ff",
    electronSpeed: 3.1, assemblySpin: 0.28, ringOpacity: 1, glowOpacity: 1,
  },
};

/** Suavidade das transições entre estados. Maior = mais rápido. */
const EASE = 2.6;

type RingConfig = {
  id: string;
  radius: number;
  /**
   * Plane orientation as [x, y] Euler angles. A torus lies in its local XY plane and is
   * symmetric around its local Z, so only X and Y tilt the plane — a Z rotation would be
   * a no-op here. The ring reads as an open ellipse while |cos(x) * cos(y)| stays well
   * above zero; at zero it is edge-on and collapses to a straight line.
   */
  tilt: [number, number];
  direction: number;
  phase: number;
  color: string;
  electron: string;

};

// Paleta unificada no ciano: variar muito o matiz entre as órbitas dispersa a leitura.
// A diferença entre elas fica por conta do raio e da inclinação, não da cor. Os
// elétrons são quase brancos de propósito — é o contraste com o tubo que os destaca.
const RINGS: RingConfig[] = [
  { id: "a", radius: 1.5, tilt: [0.3, 0.2], direction: 1, phase: 0,
    color: "#5ec5f0", electron: "#eafcff" },
  { id: "b", radius: 1.72, tilt: [1.0, 0.35], direction: -0.82, phase: 2.2,
    color: "#54d2f7", electron: "#e4faff" },
  { id: "c", radius: 1.6, tilt: [-0.95, -0.55], direction: 1.24, phase: 4.1,
    color: "#73b9f2", electron: "#edf8ff" },
  { id: "d", radius: 1.82, tilt: [0.62, 1.02], direction: -1.05, phase: 1.1,
    color: "#4fbdee", electron: "#e8f9ff" },
];

/**
 * Casca de energia: o Fresnel deixa a borda da esfera acesa e o miolo transparente,
 * que é o que dá leitura de plasma em vez de disco chapado. Combinado com blending
 * aditivo, o rim soma luz sobre o núcleo sem escondê-lo.
 */
const SHELL_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const SHELL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - clamp(dot(vNormal, vView), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor, rim * uIntensity);
  }
`;

/** Soft radial-gradient sprite used to fake bloom without a postprocessing pass. */
let glowTexture: THREE.CanvasTexture | undefined;

function getGlowTexture() {
  if (!glowTexture) {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(214,234,255,0.72)");
    gradient.addColorStop(0.45, "rgba(120,180,255,0.25)");
    gradient.addColorStop(1, "rgba(80,140,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    glowTexture = new THREE.CanvasTexture(canvas);
  }
  return glowTexture;
}

function Glow({ scale, opacity }: { scale: number; opacity: number }) {
  const materialRef = useRef<THREE.SpriteMaterial>(null);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.damp(
        materialRef.current.opacity,
        opacity,
        EASE,
        delta,
      );
    }
  });

  return (
    <sprite scale={[scale, scale, 1]}>
      <spriteMaterial
        ref={materialRef}
        map={getGlowTexture()}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        opacity={opacity}
      />
    </sprite>
  );
}

function Core({ state }: { state: AstraOrbState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  // drei não exporta o tipo concreto do MeshDistortMaterial; distort, time, emissive e
  // emissiveIntensity são propriedades mutáveis comuns da instância do material.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materialRef = useRef<any>(null);

  const shellRef = useRef<THREE.ShaderMaterial>(null);
  const shellUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(STATE_CONFIG.idle.shellColor) },
      uIntensity: { value: STATE_CONFIG.idle.shell },
      uPower: { value: 2.4 },
    }),
    [],
  );

  return (
    <group>
      <Sphere ref={meshRef} args={[0.34, 96, 96]}>
        <MeshDistortMaterial
          ref={materialRef}
          color="#2a7fd4"
          emissive="#9ec6ff"
          emissiveIntensity={0.85}
          distort={0.1}
          // O tempo é dirigido pelo CoreAnimator; ver o comentário lá.
          speed={0}
          roughness={0.3}
          metalness={0.1}
          toneMapped={false}
        />
      </Sphere>

      {/* Escala baixa de propósito: afastar demais a casca abre um vão escuro entre
          ela e o núcleo, que lê como eclipse em vez de brilho contínuo. */}
      <mesh scale={1.16}>
        <sphereGeometry args={[0.34, 64, 64]} />
        <shaderMaterial
          ref={shellRef}
          vertexShader={SHELL_VERTEX}
          fragmentShader={SHELL_FRAGMENT}
          uniforms={shellUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <CoreAnimator
        state={state}
        meshRef={meshRef}
        materialRef={materialRef}
        shellRef={shellRef}
      />
      <Glow scale={4.6} opacity={STATE_CONFIG[state].glowOpacity} />
    </group>
  );
}

function CoreAnimator({
  state,
  meshRef,
  materialRef,
  shellRef,
}: {
  state: AstraOrbState;
  meshRef: RefObject<THREE.Mesh | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materialRef: RefObject<any>;
  shellRef: RefObject<THREE.ShaderMaterial | null>;
}) {
  const anim = useRef({
    time: 0,
    speed: STATE_CONFIG.idle.wobbleSpeed,
    scale: STATE_CONFIG.idle.coreScale,
  });
  const targetColor = useRef(new THREE.Color());
  const targetShellColor = useRef(new THREE.Color());

  // Este componente é irmão do <Sphere> e renderiza depois dele, então seu useFrame é
  // registrado depois do interno do MeshDistortMaterial e sobrescreve o que ele escreveu.
  // Isso importa: o material faz `time = elapsedTime * speed`, o que cria um salto de
  // fase na deformação sempre que a velocidade muda. Aqui o tempo é acumulado
  // (`time += delta * speed`), então mudar de estado acelera a onda sem cortá-la.
  useFrame((_, delta) => {
    const target = STATE_CONFIG[state];
    const a = anim.current;

    a.speed = THREE.MathUtils.damp(a.speed, target.wobbleSpeed, EASE, delta);
    a.time += delta * a.speed;
    a.scale = THREE.MathUtils.damp(a.scale, target.coreScale, EASE, delta);

    const material = materialRef.current;
    if (material) {
      material.time = a.time;
      material.distort = THREE.MathUtils.damp(material.distort, target.distort, EASE, delta);
      material.emissiveIntensity = THREE.MathUtils.damp(
        material.emissiveIntensity,
        target.coreEmissive,
        EASE,
        delta,
      );
      targetColor.current.set(target.coreColor);
      material.emissive.lerp(targetColor.current, 1 - Math.exp(-EASE * delta));
    }

    const shell = shellRef.current;
    if (shell) {
      const u = shell.uniforms;
      u.uIntensity.value = THREE.MathUtils.damp(u.uIntensity.value, target.shell, EASE, delta);
      targetShellColor.current.set(target.shellColor);
      u.uColor.value.lerp(targetShellColor.current, 1 - Math.exp(-EASE * delta));
      // A borda pulsa de leve junto com a respiração, dando vida ao plasma.
      u.uPower.value = 1.9 + Math.sin(a.time * 0.7) * 0.22;
    }

    if (meshRef.current) {
      // Respiração sutil aplicada por cima da escala do estado, em vez de somada ao
      // alvo do damp — somar faria o amortecimento engolir a oscilação.
      const breath = 1 + Math.sin(a.time * 0.5) * 0.015;
      meshRef.current.scale.setScalar(a.scale * breath);
    }
  });

  return null;
}

function Electron({ ring, state }: { ring: RingConfig; state: AstraOrbState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const angle = useRef(ring.phase);
  const speed = useRef(STATE_CONFIG.idle.electronSpeed);

  useFrame((_, delta) => {
    speed.current = THREE.MathUtils.damp(
      speed.current,
      STATE_CONFIG[state].electronSpeed,
      EASE,
      delta,
    );
    angle.current += delta * ring.direction * speed.current;
    if (meshRef.current) {
      meshRef.current.position.set(
        ring.radius * Math.cos(angle.current),
        ring.radius * Math.sin(angle.current),
        0,
      );
    }
  });

  // Sem rastro de cometa: com os tubos grossos e acesos carregando o brilho, as caudas
  // viravam um oitavo traço luminoso por cima das órbitas e o conjunto embolava.
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.105, 24, 24]} />
      <meshBasicMaterial color={ring.electron} toneMapped={false} />
      <Glow scale={1.5} opacity={STATE_CONFIG[state].glowOpacity * 0.85} />
    </mesh>
  );
}

function Ring({ ring, state }: { ring: RingConfig; state: AstraOrbState }) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.damp(
        materialRef.current.opacity,
        STATE_CONFIG[state].ringOpacity,
        EASE,
        delta,
      );
    }
  });

  return (
    <group rotation={[ring.tilt[0], ring.tilt[1], 0]}>
      {/* Halo: um segundo toro bem mais grosso e aditivo por trás do primeiro finge o
          bloom em volta do tubo, sem precisar de passe de pós-processamento (que
          quebrava a transparência do canvas). */}
      <Torus args={[ring.radius, 0.075, 8, 120]}>
        <meshBasicMaterial
          color={ring.color}
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </Torus>

      <Torus args={[ring.radius, 0.028, 10, 180]}>
        <meshBasicMaterial
          ref={materialRef}
          color={ring.color}
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </Torus>

      <Electron ring={ring} state={state} />
    </group>
  );
}

function Assembly({ state }: { state: AstraOrbState }) {
  const spinRef = useRef<THREE.Group>(null);
  const spin = useRef(STATE_CONFIG.idle.assemblySpin);

  useFrame((_, delta) => {
    spin.current = THREE.MathUtils.damp(
      spin.current,
      STATE_CONFIG[state].assemblySpin,
      EASE,
      delta,
    );
    if (spinRef.current) {
      // Girar sobretudo no eixo da câmera mantém a excentricidade aparente dos anéis
      // estável; o componente menor em Y dá profundidade sem achatá-los em linhas.
      spinRef.current.rotation.z += delta * spin.current;
      spinRef.current.rotation.y += delta * spin.current * 0.3;
    }
  });

  return (
    <group ref={spinRef}>
      <Core state={state} />
      {RINGS.map((ring) => (
        <Ring key={ring.id} ring={ring} state={state} />
      ))}
    </group>
  );
}

export function AstraOrbScene({ state }: { state: AstraOrbState }) {
  return (
    <Canvas camera={{ position: [0, 0, 6.9], fov: 38 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
      <ambientLight intensity={0.8} />
      <pointLight position={[3, 2, 4]} intensity={2.2} color="#cfe2ff" />
      <pointLight position={[-4, -2, -3]} intensity={1.1} color="#7c6ff0" />
      <Assembly state={state} />
      {/* Poeira estelar: fica fora do grupo que gira, para flutuar em volta em vez
          de acompanhar a rotação do átomo. */}
      <Sparkles count={34} scale={7} size={1.5} speed={0.2} opacity={0.32} color="#9ec8ff" noise={0.45} />
    </Canvas>
  );
}
