/**
 * The storage yard shown in "packed" view: each material type sat in its own
 * designated container off to one side of the tower. Frames are stacked and
 * strapped on dunnage; cross-braces / extensions / prop-inners go in open steel
 * stillages; flat-jacks and U-heads go in heavy-duty mesh cages; timber is
 * banded into a stack.
 *
 * Step 1 = recognisable primitives. Step 2 will refine these from the supplied
 * stillage photos (the container kinds + positions come from logic/yardLayout,
 * so the geometry here can change without touching the layout).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Material, Mesh } from 'three';
import { useFormworkStore } from '../../store/formworkStore';
import { computeYard, type YardContainer, type YardContents } from '../../logic/yardLayout';
import { FRAME_HEIGHTS } from '../../logic/frameData';
import { COLORS, DIMS } from './primitives';
import { HFrame } from './HFrame';
import { sampleWeights, useTransition, BUILD_SECONDS } from './transition';

const GALV = '#b7bec7'; // galvanised tubular steel (posts, rails, bundled tube)
const GALV_DARK = '#8f979f'; // shaded galvanised (feet)
const CAGE_BLUE = '#3d5d86'; // painted heavy-duty stillage cage (muted steel blue)
const CAGE_BLUE_DARK = '#2c4260'; // feet / shadowed steel
const STRAP = '#2b2f36';
const TIMBER_LVL = COLORS.bearer; // dunnage under the frame stacks

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A short, thick metal bar/box used throughout the yard primitives. */
function Bar({
  position,
  size,
  color = GALV,
  metalness = 0.6,
  roughness = 0.5,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

// --- Galvanised tubular POST stillage (cross-braces / extensions / prop-inners) ---
// Open tubular frame: 4 corner posts on round feet, base + top rail frames, and
// open post-tops so it stacks like-on-like. Holds a strapped bundle of tube.

/** A galvanised tubular rail/rod, axis-aligned along x or z. */
function Rail({ x, y, z, len, axis, r = 0.02, color = GALV }: { x: number; y: number; z: number; len: number; axis: 'x' | 'z'; r?: number; color?: string }) {
  const rot: [number, number, number] = axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
  return (
    <mesh position={[x, y, z]} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, len, 12]} />
      <meshStandardMaterial color={color} metalness={0.82} roughness={0.36} />
    </mesh>
  );
}

function PostStillage({ length, width, height }: { length: number; width: number; height: number }) {
  const inset = 0.055;
  const px = length / 2 - inset;
  const pz = width / 2 - inset;
  const corners: Array<[number, number]> = [
    [-px, -pz],
    [px, -pz],
    [-px, pz],
    [px, pz],
  ];
  const rP = 0.026; // post tube radius
  const railR = 0.019;
  const footY = 0.012;
  const postTop = height + 0.13; // extends above the top rail as an open stacking socket
  const baseY = 0.1;
  const crossN = 4;
  const crossXs = Array.from({ length: crossN }, (_, i) => -px + (i / (crossN - 1)) * (2 * px));
  return (
    <group>
      {corners.map(([x, z], i) => (
        <group key={i}>
          {/* round foot */}
          <mesh position={[x, footY, z]} castShadow receiveShadow>
            <cylinderGeometry args={[0.058, 0.072, 0.024, 18]} />
            <meshStandardMaterial color={GALV_DARK} metalness={0.8} roughness={0.42} />
          </mesh>
          {/* post */}
          <mesh position={[x, (footY + postTop) / 2, z]} castShadow>
            <cylinderGeometry args={[rP, rP, postTop - footY, 14]} />
            <meshStandardMaterial color={GALV} metalness={0.85} roughness={0.32} />
          </mesh>
          {/* open socket collar on top (receives the foot of the stillage above) */}
          <mesh position={[x, postTop - 0.055, z]} castShadow>
            <cylinderGeometry args={[rP * 1.3, rP * 1.3, 0.1, 14]} />
            <meshStandardMaterial color={GALV} metalness={0.85} roughness={0.32} />
          </mesh>
        </group>
      ))}
      {/* base rail frame + cross-rails (the bundle rests on these) */}
      <Rail x={0} y={baseY} z={-pz} len={2 * px} axis="x" r={railR} />
      <Rail x={0} y={baseY} z={pz} len={2 * px} axis="x" r={railR} />
      {crossXs.map((x, i) => (
        <Rail key={`c${i}`} x={x} y={baseY} z={0} len={2 * pz} axis="z" r={railR} />
      ))}
      {/* top rail frame */}
      <Rail x={0} y={height} z={-pz} len={2 * px} axis="x" r={railR} />
      <Rail x={0} y={height} z={pz} len={2 * px} axis="x" r={railR} />
      <Rail x={-px} y={height} z={0} len={2 * pz} axis="z" r={railR} />
      <Rail x={px} y={height} z={0} len={2 * pz} axis="z" r={railR} />
    </group>
  );
}

/** A settled pile of tubes laid horizontally — rests on the floor, nests into valleys. */
function RestingBundle({ length, radius, color, perLayer, layers, y0 = 0.145 }: { length: number; radius: number; color: string; perLayer: number; layers: number; y0?: number }) {
  const items: ReactNode[] = [];
  const dy = radius * 1.7; // layers nest tight (not floating)
  const zStep = radius * 2.15;
  const zSpan = (perLayer - 1) * zStep;
  for (let l = 0; l < layers; l++) {
    for (let c = 0; c < perLayer; c++) {
      const i = l * perLayer + c;
      const z = c * zStep - zSpan / 2 + (l % 2) * (zStep / 2); // nest into the valley below
      const y = y0 + l * dy + (((i * 13) % 5) / 5 - 0.4) * radius * 0.4;
      const xj = (((i * 41) % 7) / 7 - 0.5) * 0.05;
      const len = length * (0.92 + ((i * 7) % 5) / 40);
      items.push(
        <mesh key={i} position={[xj, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, len, 9]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.42} />
        </mesh>,
      );
    }
  }
  return <group>{items}</group>;
}

/** A strap band (inverted-U) over the bundle. */
function Strap({ x, top, width }: { x: number; top: number; width: number }) {
  const hw = width / 2;
  return (
    <group>
      <mesh position={[x, top, 0]} castShadow>
        <boxGeometry args={[0.02, 0.012, width]} />
        <meshStandardMaterial color={STRAP} metalness={0.15} roughness={0.85} />
      </mesh>
      {[-hw, hw].map((z) => (
        <mesh key={z} position={[x, top / 2 + 0.06, z]} castShadow>
          <boxGeometry args={[0.02, top - 0.1, 0.012]} />
          <meshStandardMaterial color={STRAP} metalness={0.15} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function SteelStillage({ contents }: { contents: YardContents }) {
  return (
    <group>
      <PostStillage length={1.35} width={0.92} height={0.6} />
      {contents === 'braces' && <RestingBundle length={1.2} radius={0.015} color={GALV} perLayer={8} layers={6} />}
      {contents === 'extensions' && <RestingBundle length={1.24} radius={0.026} color={GALV} perLayer={5} layers={5} />}
      {contents === 'propInners' && <RestingBundle length={1.16} radius={0.028} color="#c2c8d0" perLayer={5} layers={4} />}
      {[-0.34, 0.34].map((x) => (
        <Strap key={x} x={x} top={0.36} width={0.9} />
      ))}
    </group>
  );
}

// --- Heavy-duty mesh stillage cage (Flat Jacks / U-heads) ------------------
// Blue painted-steel cage, ~0.95m cube, welded square mesh on all four faces,
// solid base, corner posts with stacking feet + top perimeter frame. Contents
// (flat jacks / U-heads) lie horizontally, packed top-to-tail.

/** Cached welded-wire-mesh texture (white wires on transparent -> tinted by material). */
let meshTexture: THREE.CanvasTexture | null = null;
function getMeshTexture(): THREE.CanvasTexture | null {
  if (meshTexture) return meshTexture;
  if (typeof document === 'undefined') return null;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5; // wire thickness
  const cells = 4;
  const step = size / cells;
  ctx.beginPath();
  for (let i = 0; i <= cells; i++) {
    const p = i * step;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
  }
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 4.5);
  meshTexture = t;
  return t;
}

/** One welded-mesh face. alphaTest keeps the wire, drops the gaps (no sort issues). */
function MeshFace({ w, h, position, rotation }: { w: number; h: number; position: [number, number, number]; rotation?: [number, number, number] }) {
  const tex = getMeshTexture();
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex ?? undefined} alphaTest={0.5} color={CAGE_BLUE} metalness={0.25} roughness={0.55} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** One jack lying on its side: a threaded rod with a base plate (flat jack) or fork (U-head) at one end. */
function LyingJack({ contents, flip, rust }: { contents: YardContents; flip: number; rust: boolean }) {
  const rodLen = 0.58;
  const rodR = 0.022;
  const rodColor = rust ? '#8f7460' : '#a7adb5';
  const endColor = rust ? '#8a6a54' : '#9aa0a8';
  const endX = flip * (rodLen / 2);
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[rodR, rodR, rodLen, 10]} />
        <meshStandardMaterial color={rodColor} metalness={0.55} roughness={0.55} />
      </mesh>
      {contents === 'flatJacks' ? (
        <mesh position={[endX, 0, 0]} castShadow>
          <boxGeometry args={[0.018, 0.14, 0.14]} />
          <meshStandardMaterial color={endColor} metalness={0.5} roughness={0.62} />
        </mesh>
      ) : (
        <group position={[endX, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.02, 0.03, 0.13]} />
            <meshStandardMaterial color={endColor} metalness={0.5} roughness={0.62} />
          </mesh>
          {[-0.05, 0.05].map((z) => (
            <mesh key={z} position={[flip * 0.02, 0.06, z]} castShadow>
              <boxGeometry args={[0.02, 0.11, 0.024]} />
              <meshStandardMaterial color={endColor} metalness={0.5} roughness={0.62} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** The cage's contents: jacks lying flat, alternating top-to-tail, settled under
 * gravity — layers nest tight and offset into the valley of the layer below, so
 * the pile reads as resting rather than floating in a grid. */
function LyingJacks({ contents }: { contents: YardContents }) {
  const rows = 5;
  const layers = 4;
  const items: ReactNode[] = [];
  const zStep = 0.15;
  const zSpan = (rows - 1) * zStep;
  const dy = 0.05; // ~ one rod diameter: layers rest on each other
  for (let l = 0; l < layers; l++) {
    for (let r = 0; r < rows; r++) {
      const i = l * rows + r;
      const flip = (r + l) % 2 === 0 ? 1 : -1; // top-to-tail
      const z = r * zStep - zSpan / 2 + (l % 2) * (zStep / 2); // nest into the valley below
      const y = 0.13 + l * dy + (((i * 13) % 5) / 5 - 0.4) * 0.012;
      const jx = (((i * 53) % 9) / 9 - 0.5) * 0.05; // deterministic jitter
      const yaw = (((i * 29) % 7) / 7 - 0.5) * 0.16;
      items.push(
        <group key={i} position={[jx, y, z]} rotation={[0, yaw, 0]}>
          <LyingJack contents={contents} flip={flip} rust={i % 4 === 0} />
        </group>,
      );
    }
  }
  return <group>{items}</group>;
}

function HeavyCage({ contents }: { contents: YardContents }) {
  const W = 0.95;
  const D = 0.95;
  const hw = W / 2;
  const hd = D / 2;
  const corners: Array<[number, number]> = [
    [-hw + 0.03, -hd + 0.03],
    [hw - 0.03, -hd + 0.03],
    [-hw + 0.03, hd - 0.03],
    [hw - 0.03, hd - 0.03],
  ];
  const rail = { metalness: 0.3, roughness: 0.5 };
  return (
    <group>
      {/* stacking feet */}
      {corners.map(([x, z], i) => (
        <Bar key={`foot${i}`} position={[x, 0.025, z]} size={[0.08, 0.05, 0.08]} color={CAGE_BLUE_DARK} {...rail} />
      ))}
      {/* solid base plate */}
      <Bar position={[0, 0.08, 0]} size={[W - 0.06, 0.06, D - 0.06]} color={CAGE_BLUE} {...rail} />
      {/* corner posts */}
      {corners.map(([x, z], i) => (
        <Bar key={`post${i}`} position={[x, 0.475, z]} size={[0.05, 0.83, 0.05]} color={CAGE_BLUE} {...rail} />
      ))}
      {/* top perimeter frame */}
      <Bar position={[0, 0.88, -hd + 0.025]} size={[W, 0.05, 0.05]} color={CAGE_BLUE} {...rail} />
      <Bar position={[0, 0.88, hd - 0.025]} size={[W, 0.05, 0.05]} color={CAGE_BLUE} {...rail} />
      <Bar position={[-hw + 0.025, 0.88, 0]} size={[0.05, 0.05, D]} color={CAGE_BLUE} {...rail} />
      <Bar position={[hw - 0.025, 0.88, 0]} size={[0.05, 0.05, D]} color={CAGE_BLUE} {...rail} />
      {/* mid gate rail (front + back) */}
      <Bar position={[0, 0.47, hd - 0.03]} size={[W - 0.08, 0.03, 0.03]} color={CAGE_BLUE} {...rail} />
      <Bar position={[0, 0.47, -hd + 0.03]} size={[W - 0.08, 0.03, 0.03]} color={CAGE_BLUE} {...rail} />
      {/* welded mesh faces */}
      <MeshFace w={0.85} h={0.72} position={[0, 0.49, hd - 0.02]} />
      <MeshFace w={0.85} h={0.72} position={[0, 0.49, -hd + 0.02]} />
      <MeshFace w={0.85} h={0.72} position={[hw - 0.02, 0.49, 0]} rotation={[0, Math.PI / 2, 0]} />
      <MeshFace w={0.85} h={0.72} position={[-hw + 0.02, 0.49, 0]} rotation={[0, Math.PI / 2, 0]} />
      {/* contents */}
      <LyingJacks contents={contents} />
    </group>
  );
}

// --- Frame stack -----------------------------------------------------------
// The actual rendered frame (HFrame ladder) laid FLAT and stacked. Because you
// can't stack round tubes directly, alternate frames offset sideways so their
// legs nest into the valley of the layer below (hexagonal packing) — a stack of
// three reads as ~two columns of tubes, the middle frame tucked behind.

function FrameStack({ size }: { size?: string }) {
  const key = size ?? '6ft';
  const frameLen = (FRAME_HEIGHTS[key] ?? 1830) / 1000; // real frame length (its standing height)
  const hx = DIMS.legSpacing / 2;
  const r = DIMS.legRadius;
  const layers = 5;
  const offX = r; // lateral nest offset (hexagonal packing)
  const dyNest = r * 1.732; // vertical nest step (< a full tube diameter)
  const y0 = 0.14;
  const dz = frameLen / 2 - 0.2; // dunnage sits in from the leg ends
  const topY = y0 + (layers - 1) * dyNest;
  return (
    <group>
      {/* dunnage timbers — the legs rest across these */}
      {[-dz, dz].map((z) => (
        <Bar key={z} position={[0, 0.05, z]} size={[DIMS.legSpacing + 0.35, 0.1, 0.14]} color={TIMBER_LVL} metalness={0.05} roughness={0.85} />
      ))}
      {/* the frames themselves — laid flat (rotated), nested */}
      {Array.from({ length: layers }, (_, i) => (
        <group key={i} position={[(i % 2) * offX, y0 + i * dyNest, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <HFrame bottom={-frameLen / 2} height={frameLen} z={0} size={key} />
        </group>
      ))}
      {/* strap bands (over the top + down the sides) */}
      {[-dz * 0.55, dz * 0.55].map((z) => {
        const hw = hx + 0.05;
        return (
          <group key={z}>
            <mesh position={[offX / 2, topY + r, z]} castShadow>
              <boxGeometry args={[DIMS.legSpacing + 0.12, 0.012, 0.02]} />
              <meshStandardMaterial color={STRAP} metalness={0.15} roughness={0.85} />
            </mesh>
            {[-hw, hw].map((x) => (
              <mesh key={x} position={[x + offX / 2, (topY + r) / 2 + 0.04, z]} castShadow>
                <boxGeometry args={[0.012, topY + r - 0.04, 0.02]} />
                <meshStandardMaterial color={STRAP} metalness={0.15} roughness={0.85} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function Container({ c }: { c: YardContainer }) {
  return (
    <group position={[c.pos[0], 0, c.pos[1]]}>
      {c.kind === 'steelStillage' && <SteelStillage contents={c.contents} />}
      {c.kind === 'heavyCage' && <HeavyCage contents={c.contents} />}
      {c.kind === 'frameStack' && <FrameStack size={c.size} />}
      <Html position={[0, c.labelY, 0]} center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`yard-label${c.inUse ? '' : ' dim'}`}>
          {c.label}
          <span className="yard-qty">×{c.quantity}</span>
        </div>
      </Html>
    </group>
  );
}

export function StorageYard() {
  const config = useFormworkStore((s) => s.config);
  const viewMode = useFormworkStore((s) => s.viewMode);
  const { driver } = useTransition();
  const groupRef = useRef<Group>(null);

  // Keep the yard mounted through the fade-out so it can animate away, then drop.
  const [mounted, setMounted] = useState(viewMode === 'packed');
  useEffect(() => {
    if (viewMode === 'packed') {
      setMounted(true);
      return;
    }
    // Stay mounted for the longest possible outgoing transition (the slow build).
    const id = setTimeout(() => setMounted(false), BUILD_SECONDS * 1000 + 120);
    return () => clearTimeout(id);
  }, [viewMode]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const yard = sampleWeights(driver.current).yard;
    g.visible = yard > 0.001;
    const opacity = clamp01(yard);
    const fading = opacity < 0.999;
    g.traverse((obj) => {
      const mat = (obj as Mesh).material as Material | Material[] | undefined;
      if (!mat) return;
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const mm of mats) {
        if (!(mm as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) continue;
        mm.transparent = fading;
        (mm as Material & { opacity: number }).opacity = opacity;
        mm.depthWrite = !fading;
      }
    });
  });

  if (!mounted) return null;

  return (
    <group ref={groupRef}>
      {computeYard(config).map((c) => (
        <Container key={c.id} c={c} />
      ))}
    </group>
  );
}
