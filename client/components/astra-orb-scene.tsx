"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { AstraOrbState } from "./astra-orb";

/**
 * Átomo da Astra. Três órbitas no arranjo clássico do símbolo do átomo (elipses a
 * 0°, 60° e 120°), cada uma com o gradiente da marca e um rastro de luz que segue o
 * elétron. No núcleo brilha a estrela de quatro pontas do logo — é ela que amarra o
 * orbe à identidade do app. Tudo em shader/sprite, sem pós-processamento, para o
 * canvas continuar transparente sobre o fundo.
 */

type StateConfig = {
  /** Velocidade angular base dos elétrons (rad/s). */
  electronSpeed: number;
  /** Giro do conjunto em torno do eixo da câmera. */
  spin: number;
  /** Opacidade da parte "apagada" das órbitas. */
  ring: number;
  /** Brilho do rastro que acompanha cada elétron. */
  trail: number;
  /** Brilho do núcleo. */
  core: number;
  /** Intensidade da estrela do núcleo. */
  flare: number;
  /** Opacidade do halo. */
  glow: number;
  /** Cor de destaque: 0 = ciano, 1 = violeta. */
  tint: number;
  /** Quanto o volume do áudio (voz da Astra ou microfone) mexe no conjunto. */
  react: number;
};

// Cada estado tem um "tom" reconhecível de relance: ouvindo puxa para o ciano,
// pensando para o violeta e acelera; falando acende tudo e segue a voz.
const STATE_CONFIG: Record<AstraOrbState, StateConfig> = {
  idle: { electronSpeed: 0.75, spin: 0.05, ring: 0.16, trail: 0.75, core: 0.95, flare: 0.7, glow: 0.55, tint: 0.5, react: 0 },
  connecting: { electronSpeed: 1.25, spin: 0.12, ring: 0.18, trail: 0.85, core: 1, flare: 0.8, glow: 0.65, tint: 0.55, react: 0 },
  listening: { electronSpeed: 1.45, spin: 0.14, ring: 0.2, trail: 1, core: 1.05, flare: 0.9, glow: 0.75, tint: 0.1, react: 0.7 },
  thinking: { electronSpeed: 2.7, spin: 0.34, ring: 0.22, trail: 1.05, core: 1.1, flare: 1, glow: 0.85, tint: 0.95, react: 0 },
  speaking: { electronSpeed: 2, spin: 0.22, ring: 0.22, trail: 1.15, core: 1.2, flare: 1.15, glow: 1, tint: 0.45, react: 1 },
};

/** Suavidade das transições entre estados. Maior = mais rápido. */
const EASE = 2.6;

const CIANO = new THREE.Color("#38d6f5");
const VIOLETA = new THREE.Color("#a78bfa");
const INDIGO = new THREE.Color("#7c8cff");
const BRANCO = new THREE.Color("#ffffff");

type RingConfig = {
  id: string;
  radius: number;
  /** Rotação em torno do eixo da câmera: 0°, 60° e 120° formam o símbolo do átomo. */
  angle: number;
  direction: number;
  phase: number;
  colorA: THREE.Color;
  colorB: THREE.Color;
  electron: string;
};

/**
 * Inclinação comum das três elipses. cos(1.2) ≈ 0.36 é a proporção aparente: aberta o
 * bastante para ler como órbita, achatada o bastante para lembrar o símbolo clássico.
 */
const TILT = 1.2;

const RINGS: RingConfig[] = [
  { id: "a", radius: 1.6, angle: 0, direction: 1, phase: 0, colorA: VIOLETA, colorB: INDIGO, electron: "#cbbdff" },
  { id: "b", radius: 1.6, angle: Math.PI / 3, direction: -0.86, phase: 2.1, colorA: INDIGO, colorB: CIANO, electron: "#bcc6ff" },
  { id: "c", radius: 1.6, angle: (2 * Math.PI) / 3, direction: 1.14, phase: 4.2, colorA: CIANO, colorB: VIOLETA, electron: "#aef1ff" },
];

// ── Shaders ──────────────────────────────────────────────────────────────

const RING_VERTEX = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * O toro fica no plano XY local, então atan(y, x) dá o ângulo do fragmento ao longo da
 * órbita. A distância angular "atrás" do elétron define o rastro, que decai
 * exponencialmente: cabeça acesa, cauda que some — leitura de movimento sem partículas.
 */
const RING_FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uElectron;
  uniform float uDir;
  uniform float uBase;
  uniform float uTrail;
  uniform float uOpacity;
  varying vec3 vLocal;
  const float TAU = 6.28318530718;

  void main() {
    float ang = atan(vLocal.y, vLocal.x);
    float atras = mod((uElectron - ang) * uDir, TAU);
    float rastro = exp(-atras * 1.5);
    float cabeca = exp(-min(atras, TAU - atras) * 18.0);
    vec3 cor = mix(uColorA, uColorB, 0.5 + 0.5 * cos(ang));
    float alpha = (uBase + rastro * uTrail + cabeca * 0.7) * uOpacity;
    gl_FragColor = vec4(cor * (1.0 + cabeca), alpha);
    #include <colorspace_fragment>
  }
`;

const CORE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

/** Núcleo de vidro: centro quase branco, corpo no índigo da marca e borda acesa. */
const CORE_FRAGMENT = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform vec3 uRim;
  uniform float uBright;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    float ndv = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
    vec3 c = mix(uOuter, uInner, pow(ndv, 1.8));
    c += pow(1.0 - ndv, 2.5) * uRim * 1.3;
    gl_FragColor = vec4(c * uBright, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Casca aditiva em volta do núcleo: borda luminosa contínua, sem vão escuro. */
const SHELL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    float rim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), 2.2);
    gl_FragColor = vec4(uColor, rim * uIntensity);
    #include <colorspace_fragment>
  }
`;

// ── Texturas geradas em canvas ──────────────────────────────────────────

const texturas: Partial<Record<"radial" | "halo" | "estrela", THREE.CanvasTexture>> = {};

function criarCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext("2d")! };
}

/** Brilho radial branco; a cor vem do material (tinge sem gerar uma textura por cor). */
function texturaRadial() {
  if (!texturas.radial) {
    const size = 128;
    const { canvas, ctx } = criarCanvas(size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, "rgba(255,255,255,0.6)");
    g.addColorStop(0.5, "rgba(255,255,255,0.15)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    texturas.radial = new THREE.CanvasTexture(canvas);
  }
  return texturas.radial;
}

/** Halo no gradiente da marca: lavanda no centro, índigo e ciano nas bordas. */
function texturaHalo() {
  if (!texturas.halo) {
    const size = 256;
    const { canvas, ctx } = criarCanvas(size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(214,206,255,0.9)");
    g.addColorStop(0.16, "rgba(150,140,255,0.45)");
    g.addColorStop(0.42, "rgba(110,125,255,0.14)");
    g.addColorStop(0.7, "rgba(56,214,245,0.04)");
    g.addColorStop(1, "rgba(56,214,245,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    texturas.halo = new THREE.CanvasTexture(canvas);
  }
  return texturas.halo;
}

/**
 * Estrela de quatro pontas do logo, desenhada como lens flare: duas lanças longas
 * (vertical e horizontal), duas diagonais curtas e um ponto central.
 */
function texturaEstrela() {
  if (!texturas.estrela) {
    const size = 512;
    const c = size / 2;
    const { canvas, ctx } = criarCanvas(size);
    ctx.globalCompositeOperation = "lighter";

    const lanca = (angulo: number, comprimento: number, largura: number, alpha: number) => {
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(angulo);
      ctx.scale(largura, comprimento);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.25, `rgba(255,255,255,${alpha * 0.45})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, c, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    lanca(0, 1, 0.045, 1);
    lanca(Math.PI / 2, 1, 0.045, 1);
    lanca(Math.PI / 4, 0.42, 0.03, 0.55);
    lanca(-Math.PI / 4, 0.42, 0.03, 0.55);

    const centro = ctx.createRadialGradient(c, c, 0, c, c, size * 0.12);
    centro.addColorStop(0, "rgba(255,255,255,1)");
    centro.addColorStop(0.35, "rgba(255,255,255,0.5)");
    centro.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = centro;
    ctx.fillRect(0, 0, size, size);

    texturas.estrela = new THREE.CanvasTexture(canvas);
  }
  return texturas.estrela;
}

// ── Componentes ─────────────────────────────────────────────────────────

/** Estado animado compartilhado: amortecido a cada quadro, nunca salta entre estados. */
type Anim = {
  time: number;
  nivel: number;
  reacao: number;
  spin: number;
  ring: number;
  trail: number;
  core: number;
  flare: number;
  glow: number;
  tint: number;
};

function useAnim(state: AstraOrbState, nivelRef: RefObject<number> | undefined) {
  const anim = useRef<Anim>({
    time: 0,
    nivel: 0,
    reacao: 0,
    ...pick(STATE_CONFIG.idle),
  });

  // Os filhos se inscrevem no useFrame antes do pai (efeitos rodam de dentro para fora),
  // então leem os valores do quadro anterior — um quadro de atraso, imperceptível.
  useFrame((_, delta) => {
    const alvo = STATE_CONFIG[state];
    const a = anim.current;
    a.time += delta;
    a.nivel = THREE.MathUtils.damp(a.nivel, Math.min(1, (nivelRef?.current ?? 0) * 2.4), 10, delta);
    a.reacao = a.nivel * alvo.react;
    a.spin = THREE.MathUtils.damp(a.spin, alvo.spin, EASE, delta);
    a.ring = THREE.MathUtils.damp(a.ring, alvo.ring, EASE, delta);
    a.trail = THREE.MathUtils.damp(a.trail, alvo.trail, EASE, delta);
    a.core = THREE.MathUtils.damp(a.core, alvo.core, EASE, delta);
    a.flare = THREE.MathUtils.damp(a.flare, alvo.flare, EASE, delta);
    a.glow = THREE.MathUtils.damp(a.glow, alvo.glow, EASE, delta);
    a.tint = THREE.MathUtils.damp(a.tint, alvo.tint, EASE, delta);
  });

  return anim;
}

function pick(c: StateConfig) {
  return { spin: c.spin, ring: c.ring, trail: c.trail, core: c.core, flare: c.flare, glow: c.glow, tint: c.tint };
}

type AnimRef = RefObject<Anim>;

function Nucleo({ anim }: { anim: AnimRef }) {
  const esfera = useRef<THREE.Mesh>(null);
  const casca = useRef<THREE.Mesh>(null);
  const estrela = useRef<THREE.SpriteMaterial>(null);
  const estrelaSprite = useRef<THREE.Sprite>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const materialNucleo = useRef<THREE.ShaderMaterial>(null);
  const materialCasca = useRef<THREE.ShaderMaterial>(null);
  const corDestaque = useRef(new THREE.Color());

  // Valores iniciais; a animação escreve nos uniforms pelo ref do material (mutável),
  // não nestes objetos memorizados.
  const coreUniforms = useMemo(
    () => ({
      uInner: { value: new THREE.Color("#f4f1ff") },
      uOuter: { value: new THREE.Color("#5b5cf0") },
      uRim: { value: new THREE.Color().copy(CIANO) },
      uBright: { value: 1 },
    }),
    [],
  );
  const shellUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color().copy(INDIGO) }, uIntensity: { value: 1.4 } }),
    [],
  );

  useFrame(() => {
    const a = anim.current;
    corDestaque.current.copy(CIANO).lerp(VIOLETA, a.tint);

    // Respiração lenta por cima da reação à voz.
    const respira = 1 + Math.sin(a.time * 1.6) * 0.025;
    const escala = respira * (1 + a.reacao * 0.28);
    esfera.current?.scale.setScalar(escala);
    casca.current?.scale.setScalar(escala * 1.22);

    const uNucleo = materialNucleo.current?.uniforms;
    if (uNucleo) {
      uNucleo.uBright.value = a.core + a.reacao * 0.3;
      uNucleo.uRim.value.copy(corDestaque.current);
    }
    const uCasca = materialCasca.current?.uniforms;
    if (uCasca) {
      uCasca.uColor.value.copy(INDIGO).lerp(corDestaque.current, 0.5);
      uCasca.uIntensity.value = 1.3 + a.reacao * 0.8;
    }

    if (estrela.current && estrelaSprite.current) {
      const s = 1.55 * a.flare * (1 + a.reacao * 0.55) * (1 + Math.sin(a.time * 2.1) * 0.04);
      estrelaSprite.current.scale.set(s, s, 1);
      estrela.current.rotation = Math.sin(a.time * 0.25) * 0.12;
      estrela.current.opacity = Math.min(1, 0.55 + a.flare * 0.4 + a.reacao * 0.3);
      estrela.current.color.copy(corDestaque.current).lerp(BRANCO, 0.55);
    }
    if (halo.current) halo.current.opacity = Math.min(1, a.glow * 0.8 + a.reacao * 0.25);
  });

  return (
    <group>
      <sprite scale={[3.2, 3.2, 1]}>
        <spriteMaterial ref={halo} map={texturaHalo()} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
      </sprite>

      <mesh ref={esfera}>
        <sphereGeometry args={[0.3, 64, 64]} />
        <shaderMaterial
          ref={materialNucleo}
          vertexShader={CORE_VERTEX}
          fragmentShader={CORE_FRAGMENT}
          uniforms={coreUniforms}
        />
      </mesh>

      <mesh ref={casca}>
        <sphereGeometry args={[0.3, 48, 48]} />
        <shaderMaterial
          ref={materialCasca}
          vertexShader={CORE_VERTEX}
          fragmentShader={SHELL_FRAGMENT}
          uniforms={shellUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Desenhada por cima de tudo: é luz, não objeto — não deve ser escondida pelo núcleo. */}
      <sprite ref={estrelaSprite} renderOrder={10}>
        <spriteMaterial
          ref={estrela}
          map={texturaEstrela()}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          transparent
        />
      </sprite>
    </group>
  );
}

function Orbita({ ring, anim, state }: { ring: RingConfig; anim: AnimRef; state: AstraOrbState }) {
  const eletron = useRef<THREE.Group>(null);
  const brilhoEletron = useRef<THREE.SpriteMaterial>(null);
  const angulo = useRef(ring.phase);
  const velocidade = useRef(STATE_CONFIG.idle.electronSpeed);
  const materialLinha = useRef<THREE.ShaderMaterial>(null);

  const linha = useMemo(
    () => ({
      uColorA: { value: ring.colorA },
      uColorB: { value: ring.colorB },
      uElectron: { value: ring.phase },
      uDir: { value: Math.sign(ring.direction) },
      uBase: { value: STATE_CONFIG.idle.ring },
      uTrail: { value: STATE_CONFIG.idle.trail },
      uOpacity: { value: 1 },
    }),
    [ring],
  );
  // Mesmo shader num tubo mais grosso e fraco: finge o bloom em volta da linha. Os
  // uniforms são os mesmos objetos da linha (só a opacidade é própria), então animar a
  // linha anima o halo junto.
  const halo = useMemo(() => ({ ...linha, uOpacity: { value: 0.22 } }), [linha]);

  useFrame((_, delta) => {
    const a = anim.current;
    velocidade.current = THREE.MathUtils.damp(
      velocidade.current,
      STATE_CONFIG[state].electronSpeed * (1 + a.reacao * 0.6),
      EASE,
      delta,
    );
    angulo.current += delta * ring.direction * velocidade.current;

    const u = materialLinha.current?.uniforms;
    if (u) {
      u.uElectron.value = angulo.current;
      u.uBase.value = a.ring;
      u.uTrail.value = a.trail + a.reacao * 0.4;
    }

    eletron.current?.position.set(
      ring.radius * Math.cos(angulo.current),
      ring.radius * Math.sin(angulo.current),
      0,
    );
    if (brilhoEletron.current) brilhoEletron.current.opacity = Math.min(1, 0.6 + a.trail * 0.35);
  });

  return (
    <group rotation={[0, 0, ring.angle]}>
      <group rotation={[TILT, 0, 0]}>
        <mesh>
          <torusGeometry args={[ring.radius, 0.015, 8, 260]} />
          <shaderMaterial
            ref={materialLinha}
            vertexShader={RING_VERTEX}
            fragmentShader={RING_FRAGMENT}
            uniforms={linha}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[ring.radius, 0.06, 8, 200]} />
          <shaderMaterial
            vertexShader={RING_VERTEX}
            fragmentShader={RING_FRAGMENT}
            uniforms={halo}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <group ref={eletron}>
          <mesh>
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <sprite scale={[0.62, 0.62, 1]}>
            <spriteMaterial
              ref={brilhoEletron}
              map={texturaRadial()}
              color={ring.electron}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              transparent
            />
          </sprite>
        </group>
      </group>
    </group>
  );
}

function Atomo({
  state,
  nivelRef,
  movimentoReduzido,
}: {
  state: AstraOrbState;
  nivelRef?: RefObject<number>;
  movimentoReduzido: boolean;
}) {
  const anim = useAnim(state, nivelRef);
  const conjunto = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = conjunto.current;
    if (!g) return;
    const a = anim.current;
    // Giro sobretudo no eixo da câmera, que preserva o desenho do símbolo; a oscilação
    // pequena em X/Y dá profundidade sem achatar as elipses em linhas.
    g.rotation.z += delta * a.spin * (movimentoReduzido ? 0.2 : 1);
    g.rotation.x = Math.sin(a.time * 0.3) * 0.12;
    g.rotation.y = Math.cos(a.time * 0.24) * 0.16;
  });

  return (
    <>
      <group ref={conjunto}>
        {RINGS.map((ring) => (
          <Orbita key={ring.id} ring={ring} anim={anim} state={state} />
        ))}
      </group>
      <Nucleo anim={anim} />
    </>
  );
}

export function AstraOrbScene({
  state,
  nivelRef,
}: {
  state: AstraOrbState;
  nivelRef?: RefObject<number>;
}) {
  const movimentoReduzido = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <Canvas camera={{ position: [0, 0, 6.1], fov: 38 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
      <Atomo state={state} nivelRef={nivelRef} movimentoReduzido={movimentoReduzido} />
      {/* Poeira estelar fora do conjunto que gira: flutua em volta, não acompanha o átomo. */}
      <Sparkles count={36} scale={6.5} size={1.4} speed={0.18} opacity={0.3} color="#b8c2ff" noise={0.4} />
    </Canvas>
  );
}
