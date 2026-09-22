import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Vector2,
  Vector3,
} from "three";
import { COLORS, NAMES, complete } from "../game";
import type { Board, Equipment, Move } from "../game";
import Environment from "./Environment";
import BottleFallback from "./BottleFallback";
import {
  HEIGHT,
  UNIT_VOLUME as UNIT,
  PROFILE,
  createLiquidGeometry,
  fillHeight,
  pouringAngle,
  smooth,
  updateLiquid,
} from "./liquid";
import "./board.css";

export type PourAnimation = {
  id: number;
  from: number;
  to: number;
  color: number;
  amount: number;
};
type Props = {
  board: Board;
  capacities: number[];
  equipment: Equipment;
  hint: Move | null;
  selected: number | null;
  invalid: number | null;
  animation: PourAnimation | null;
  finished: boolean;
  onPick: (index: number) => void;
  onComplete: (id: number) => void;
};
const CAMERA_COS = 30 / Math.hypot(5, 30);
const LIQUID_COLORS = [
  "#7026ec",
  "#ff780f",
  "#00bd86",
  "#ec267a",
  "#1688ef",
  "#edbe08",
];
const SYMBOLS = ["✦", "●", "◆", "♥", "☾", "✳"];
function layout(count: number, wide: boolean) {
  const columns = wide ? count : count > 6 ? 4 : 3;
  const rows = Math.ceil(count / columns),
    stepY = HEIGHT + 0.65;
  return {
    width: columns * 1.65 + 0.1,
    height: rows * stepY + 1.6,
    positions: Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / columns),
        inRow = Math.min(columns, count - row * columns);
      return new Vector3(
        ((i % columns) - (inRow - 1) / 2) * 1.65,
        ((rows - 1) * stepY) / 2 - HEIGHT / 2 - 0.4 - row * stepY,
        0,
      );
    }),
  };
}
const GLASS_RIM_VERTEX = `varying vec3 vNormal; varying vec3 vView;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const GLASS_RIM_FRAGMENT = `uniform vec3 rimColor;varying vec3 vNormal;varying vec3 vView;
void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.4);gl_FragColor=vec4(rimColor,rim*.78);
#include <colorspace_fragment>
}`;
class Boundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function BottleModel({
  group,
  layers,
  colors,
  selected,
  sorted,
  capacity,
  equipment,
}: {
  group: RefObject<Group | null>;
  layers: BufferGeometry[];
  colors: number[];
  selected: boolean;
  sorted: boolean;
  capacity: number;
  equipment: Equipment;
}) {
  const rimUniforms = useMemo(
    () => ({
      rimColor: {
        value: new Color(
          equipment.glass === "amethyst" ? "#b36bfa" : "#409de8",
        ),
      },
    }),
    [equipment.glass],
  );
  const profile = useMemo(
    () => PROFILE.map(([r, y]) => new Vector2(r + 0.035, y)),
    [],
  );
  return (
    <group ref={group} scale={capacity === 1 ? 0.63 : 1}>
      {layers.map((geometry, i) => (
        <mesh geometry={geometry} key={i} renderOrder={1}>
          <meshPhysicalMaterial
            color={LIQUID_COLORS[colors[i] ?? 0]}
            roughness={0.32}
            envMapIntensity={0.12}
            clearcoat={0.25}
            specularIntensity={0.3}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
      <mesh renderOrder={3}>
        <latheGeometry args={[profile, 40]} />
        <meshPhysicalMaterial
          color={equipment.glass === "amethyst" ? "#c291ed" : "#70b7ef"}
          transparent
          opacity={equipment.glass === "amethyst" ? 0.16 : 0.085}
          transmission={0.98}
          thickness={0.025}
          ior={1.2}
          envMapIntensity={0.3}
          roughness={0.035}
          metalness={0}
          clearcoat={0.25}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={5}>
        <latheGeometry args={[profile, 40]} />
        <shaderMaterial
          uniforms={rimUniforms}
          vertexShader={GLASS_RIM_VERTEX}
          fragmentShader={GLASS_RIM_FRAGMENT}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, HEIGHT - 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.19, 32]} />
        <meshBasicMaterial color="#041125" side={DoubleSide} />
      </mesh>
      <mesh
        position={[0, HEIGHT, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={4}
      >
        <torusGeometry args={[0.255, 0.043, 10, 32]} />
        <meshPhysicalMaterial
          color={equipment.glass === "amethyst" ? "#b46bea" : "#69b9ec"}
          transparent
          opacity={0.8}
          transmission={0.4}
          thickness={0.035}
          roughness={0.08}
          envMapIntensity={0.4}
        />
      </mesh>
      <mesh
        position={[-0.38, 1.43, 0.39]}
        scale={[0.028, 1.02, 0.008]}
        renderOrder={6}
      >
        <sphereGeometry args={[1, 8, 12]} />
        <meshBasicMaterial
          color="#b8ddff"
          transparent
          opacity={0.13}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0.24, 2.66, 0.36]}
        scale={[0.095, 0.17, 0.008]}
        rotation={[0, 0, -0.22]}
        renderOrder={6}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          color="#c4ddff"
          transparent
          opacity={0.13}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.43, 0.41, 0.08, 32]} />
        <meshPhysicalMaterial
          color="#b9b0d3"
          transparent
          opacity={0.12}
          roughness={0.15}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, 0.15, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={5}
      >
        <torusGeometry args={[0.472, 0.014, 6, 40]} />
        <meshBasicMaterial
          color={equipment.glass === "amethyst" ? "#9770ef" : "#489ada"}
          transparent
          opacity={0.75}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.6, 0.63, 32]} />
        <meshBasicMaterial
          color={sorted ? "#8ce7b5" : "#bc9ce6"}
          transparent
          opacity={selected || sorted ? 0.85 : 0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
function Scene({
  board,
  capacities,
  equipment,
  hint,
  selected,
  animation,
  onComplete,
  onReady,
  onFailure,
  positions,
  worldWidth,
  worldHeight,
}: {
  board: Board;
  capacities: number[];
  equipment: Equipment;
  hint: Move | null;
  selected: number | null;
  animation: PourAnimation | null;
  onComplete: (id: number) => void;
  onReady: () => void;
  onFailure: () => void;
  positions: Vector3[];
  worldWidth: number;
  worldHeight: number;
}) {
  const { size, camera, invalidate, gl } = useThree();
  const resources = useMemo(
    () =>
      Array.from({ length: board.length }, () => ({
        group: { current: null } as RefObject<Group | null>,
        layers: Array.from({ length: 4 }, createLiquidGeometry),
      })),
    [board.length],
  );
  const sparks = useRef<Group>(null);
  const stream = useRef<Mesh>(null),
    ripple = useRef<Mesh>(null);
  const streamGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(20 * 8 * 6 * 3), 3),
    );
    return g;
  }, []);
  const phase = useRef({ id: -1, elapsed: 0, completed: false }),
    ready = useRef(false),
    drawn = useRef<Board | null>(null);
  useEffect(
    () => () => {
      resources.forEach((r) => r.layers.forEach((g) => g.dispose()));
      streamGeometry.dispose();
    },
    [resources, streamGeometry],
  );
  useEffect(() => {
    // Camera and renderer are external Three.js objects, updated on resize.
    Object.assign(camera, {
      zoom: Math.min((size.width - 16) / worldWidth, size.height / worldHeight),
    });
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, worldWidth, worldHeight, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  useFrame((_, delta) => {
    if (
      resources.some((r) => !r.group.current) ||
      !stream.current ||
      !ripple.current
    )
      return;
    const starting = !!animation && phase.current.id !== animation.id;
    if (starting)
      phase.current = { id: animation!.id, elapsed: 0, completed: false };
    if (animation && !starting && !phase.current.completed)
      phase.current.elapsed += delta;
    const t = animation ? Math.min(1, phase.current.elapsed / 0.85) : 0;
    const flow = smooth((t - 0.25) / 0.5),
      travel = smooth(t / 0.25) * (1 - smooth((t - 0.77) / 0.23));
    let sourceAngle = 0,
      sourcePosition: Vector3 | undefined,
      streamEnd: Vector3 | undefined,
      direction = 1;
    if (animation) {
      const destination = positions[animation.to],
        origin = positions[animation.from];
      direction =
        destination.x > 0 ? 1 : destination.x < 0 ? -1 : origin.x < 0 ? 1 : -1;
      sourceAngle =
        pouringAngle(
          Math.max(
            0.002,
            ((board[animation.from].length - animation.amount * flow) *
              UNIT *
              4) /
              capacities[animation.from],
          ),
        ) *
        travel *
        direction;
      const mouth = new Vector3(
        destination.x - direction * 0.1,
        destination.y +
          HEIGHT * (capacities[animation.to] === 1 ? 0.63 : 1) +
          0.42,
        0,
      );
      const endpoint = new Vector3(
        mouth.x -
          HEIGHT *
            (capacities[animation.from] === 1 ? 0.63 : 1) *
            Math.sin(sourceAngle),
        mouth.y -
          HEIGHT *
            (capacities[animation.from] === 1 ? 0.63 : 1) *
            Math.cos(sourceAngle),
        0,
      );
      sourcePosition = origin.clone().lerp(endpoint, travel);
      streamEnd = new Vector3(
        destination.x,
        destination.y +
          fillHeight(
            ((board[animation.to].length + animation.amount * flow) *
              UNIT *
              4) /
              capacities[animation.to],
            0,
          ) *
            (capacities[animation.to] === 1 ? 0.63 : 1) +
          0.02,
        0,
      );
    }
    const changed = drawn.current !== board;
    resources.forEach((r, i) => {
      const source = animation?.from === i,
        target = animation?.to === i;
      const group = r.group.current!;
      group.position.copy(
        source && sourcePosition ? sourcePosition : positions[i],
      );
      group.rotation.z = source ? -sourceAngle : 0;
      if (selected === i && !animation) group.position.y += 0.2;
      if (changed || source || target) {
        const units =
          board[i].length +
          (source
            ? -animation!.amount * flow
            : target
              ? animation!.amount * flow
              : 0);
        r.layers.forEach((g, j) =>
          updateLiquid(
            g,
            (Math.min(j + 1, Math.max(j, units)) * UNIT * 4) / capacities[i],
            source ? sourceAngle : 0,
            (j * UNIT * 4) / capacities[i],
          ),
        );
      }
    });
    drawn.current = board;
    const flowing = !!animation && t > 0.25 && t < 0.75;
    stream.current.visible = flowing;
    if (sparks.current)
      sparks.current.visible = flowing && equipment.effect === "sparkles";
    ripple.current.visible = flowing;
    if (flowing && animation && sourcePosition && streamEnd) {
      const start = new Vector3(direction * 0.22, HEIGHT, 0)
        .multiplyScalar(capacities[animation.from] === 1 ? 0.63 : 1)
        .applyAxisAngle(new Vector3(0, 0, 1), -sourceAngle)
        .add(sourcePosition);
      const attr = streamGeometry.getAttribute("position");
      const point = (u: number, a: number) => {
        const x = start.x + (streamEnd!.x - start.x) * (1 - Math.exp(-u * 10)),
          y = start.y + (streamEnd!.y - start.y) * u;
        const radius =
          0.032 + Math.sin(u * 35 - phase.current.elapsed * 24) * 0.004;
        return new Vector3(x + Math.cos(a) * radius, y, Math.sin(a) * radius);
      };
      let index = 0;
      for (let j = 0; j < 20; j++)
        for (let a = 0; a < 8; a++) {
          const p = point(j / 20, (a * Math.PI) / 4),
            q = point((j + 1) / 20, (a * Math.PI) / 4),
            r = point((j + 1) / 20, ((a + 1) * Math.PI) / 4),
            s = point(j / 20, ((a + 1) * Math.PI) / 4);
          for (const v of [p, q, r, p, r, s])
            attr.setXYZ(index++, v.x, v.y, v.z);
        }
      attr.needsUpdate = true;
      streamGeometry.computeVertexNormals();
      streamGeometry.computeBoundingSphere();
      if (sparks.current)
        sparks.current.children.forEach((spark, i) => {
          const progress = (phase.current.elapsed * 1.8 + i / 8) % 1;
          spark.position.copy(start).lerp(streamEnd, progress);
          spark.position.x +=
            Math.sin(phase.current.elapsed * 9 + i * 2) * 0.13;
          spark.position.z += Math.cos(phase.current.elapsed * 7 + i) * 0.1;
          spark.scale.setScalar(0.55 + Math.sin(progress * Math.PI) * 0.7);
        });
      ripple.current.position.copy(streamEnd);
      const pulse = (phase.current.elapsed * 4) % 1;
      ripple.current.scale.setScalar(0.3 + pulse * 0.6);
      (ripple.current.material as MeshPhysicalMaterial).opacity =
        (1 - pulse) * 0.7;
    }
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    if (animation && !phase.current.completed) {
      if (t >= 1) {
        phase.current.completed = true;
        onComplete(animation.id);
      } else invalidate();
    }
  });
  return (
    <>
      <Environment />
      <ambientLight intensity={0.6} />
      <directionalLight position={[-3, 6, 5]} intensity={1.8} color="#ffffff" />
      <directionalLight position={[4, 3, -3]} intensity={1} color="#d3fff3" />
      {resources.map((r, i) => (
        <BottleModel
          key={i}
          group={r.group}
          layers={r.layers}
          colors={
            animation?.to === i
              ? [
                  ...board[i],
                  ...Array<number>(animation.amount).fill(animation.color),
                ]
              : board[i]
          }
          selected={selected === i || hint?.from === i || hint?.to === i}
          capacity={capacities[i]}
          equipment={equipment}
          sorted={complete(board[i])}
        />
      ))}
      {equipment.base === "gold" &&
        positions.map((p, i) => (
          <mesh key={`base-${i}`} position={[p.x, p.y - 0.06, p.z]}>
            <cylinderGeometry args={[0.77, 0.82, 0.12, 32]} />
            <meshStandardMaterial
              color="#c9a04b"
              metalness={0.65}
              roughness={0.28}
            />
          </mesh>
        ))}
      <group ref={sparks} visible={false}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[0.045, 0]} />
            <meshBasicMaterial
              color={i % 2 ? "#fff4bc" : COLORS[animation?.color ?? 0]}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <mesh ref={stream} geometry={streamGeometry} visible={false}>
        <meshPhysicalMaterial
          color={LIQUID_COLORS[animation?.color ?? 0]}
          roughness={0.2}
          envMapIntensity={0.12}
          specularIntensity={0.3}
          toneMapped={false}
          clearcoat={0.25}
        />
      </mesh>
      <mesh ref={ripple} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.32, 0.012, 6, 32]} />
        <meshPhysicalMaterial
          color={LIQUID_COLORS[animation?.color ?? 0]}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
export default function Board3D(props: Props) {
  const {
    board,
    capacities,
    equipment,
    hint,
    animation,
    selected,
    invalid,
    finished,
    onPick,
    onComplete,
  } = props;
  const [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false),
    [checked, setChecked] = useState(false),
    [size, setSize] = useState({ width: 350, height: 420 });
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let available = false;
      try {
        const probe = document.createElement("canvas").getContext("webgl2");
        available = !!probe;
        probe?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        /* Fall back to the playable SVG board. */
      }
      if (!available) setFailed(true);
      setChecked(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const wide = size.width > size.height * 1.35;
  const arrangement = useMemo(
    () => layout(board.length, wide),
    [board.length, wide],
  );
  const failure = useCallback(() => setFailed(true), []),
    prepared = useCallback(() => setReady(true), []);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (failed && animation) onComplete(animation.id);
  }, [failed, animation, onComplete]);
  const zoom = Math.min(
    (size.width - 16) / arrangement.width,
    size.height / arrangement.height,
  );
  let hintPath = "",
    hintStart = { x: 0, y: 0 };
  if (hint && !animation && !finished) {
    const mouth = (index: number) => ({
      x: size.width / 2 + arrangement.positions[index].x * zoom,
      y:
        size.height / 2 -
        (arrangement.positions[index].y +
          HEIGHT * (capacities[index] === 1 ? 0.63 : 1) +
          (selected === index ? 0.2 : 0)) *
          CAMERA_COS *
          zoom -
        14,
    });
    const start = mouth(hint.from),
      end = mouth(hint.to),
      dx = end.x - start.x,
      dy = end.y - start.y;
    const lift = Math.min(64, Math.max(32, zoom * 0.9));
    hintStart = start;
    if (Math.abs(dy) < 25) {
      hintPath = `M ${start.x} ${start.y} C ${start.x + dx * 0.2} ${start.y - lift}, ${end.x - dx * 0.2} ${end.y - lift}, ${end.x} ${end.y}`;
    } else {
      const side = (start.x + end.x) / 2 > size.width / 2 ? -1 : 1;
      const bend = side * Math.min(85, Math.max(48, zoom * 1.5));
      const control = (x: number) =>
        Math.max(20, Math.min(size.width - 20, x + bend));
      hintPath = `M ${start.x} ${start.y} C ${control(start.x)} ${start.y - lift}, ${control(end.x)} ${end.y - lift}, ${end.x} ${end.y}`;
    }
  }
  return (
    <div
      ref={host}
      className="board-stage"
      data-renderer={failed ? "svg" : "3d"}
      data-base={equipment.base}
      data-ready={ready || failed}
      data-animating={!!animation}
    >
      {checked && !failed && (
        <Boundary onFailure={failure}>
          <Canvas
            orthographic
            frameloop="demand"
            dpr={[1, 1.25]}
            camera={{ position: [0, 5, 30], zoom: 42 }}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
            fallback={<span>Načítám lahvičky…</span>}
            onCreated={({ camera, gl }) => {
              camera.lookAt(0, 0, 0);
              gl.domElement.setAttribute(
                "aria-label",
                "Herní plocha se skleněnými lahvičkami",
              );
            }}
          >
            <Scene
              board={board}
              capacities={capacities}
              equipment={equipment}
              hint={hint}
              selected={selected}
              animation={animation}
              positions={arrangement.positions}
              worldWidth={arrangement.width}
              worldHeight={arrangement.height}
              onComplete={onComplete}
              onReady={prepared}
              onFailure={failure}
            />
          </Canvas>
        </Boundary>
      )}
      {!ready && !failed && (
        <span className="board-loading" role="status">
          Připravuji lahvičky…
        </span>
      )}
      {hintPath && (
        <svg
          className="hint-arrow"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="hint-arrow-gradient"
              gradientUnits="userSpaceOnUse"
              x1={hintStart.x}
              y1={hintStart.y}
              x2={size.width / 2 + arrangement.positions[hint!.to].x * zoom}
              y2={
                size.height / 2 -
                (arrangement.positions[hint!.to].y +
                  HEIGHT * (capacities[hint!.to] === 1 ? 0.63 : 1)) *
                  CAMERA_COS *
                  zoom -
                14
              }
            >
              <stop stopColor="#ffe09a" />
              <stop offset="1" stopColor="#9ef6d8" />
            </linearGradient>
            <marker
              id="hint-arrow-head"
              markerWidth="16"
              markerHeight="16"
              refX="12"
              refY="8"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d="M 3 2 L 12 8 L 3 14"
                fill="none"
                stroke="#9ef6d8"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>
          <path d={hintPath} className="hint-arrow-shadow" />
          <path
            d={hintPath}
            className="hint-arrow-line"
            markerEnd="url(#hint-arrow-head)"
          />
          <path d={hintPath} className="hint-arrow-flow" pathLength="100" />
          <circle
            cx={hintStart.x}
            cy={hintStart.y}
            r="5"
            fill="#ffe09a"
            stroke="#30283d"
            strokeWidth="2"
          />
        </svg>
      )}
      <div className="bottle-targets">
        {board.map((b, i) => {
          const position = arrangement.positions[i];
          return (
            <button
              key={i}
              className={`bottle bottle-hit ${selected === i ? "selected" : ""} ${complete(b) ? "complete" : ""} ${invalid === i ? "invalid" : ""} ${animation?.from === i ? "pouring" : ""} ${hint?.from === i ? "hint-source" : ""} ${hint?.to === i ? "hint-target" : ""}`}
              aria-label={`Lahvička ${i + 1}${capacities[i] === 1 ? " (malá, 1 dílek)" : ""}: ${b.length ? b.map((c) => NAMES[c]).join(", ") + ", zdola nahoru" : "prázdná"}`}
              aria-pressed={selected === i}
              disabled={!!animation || finished || (!ready && !failed)}
              onClick={() => onPick(i)}
              style={{
                left: size.width / 2 + position.x * zoom,
                top:
                  size.height / 2 -
                  (position.y + HEIGHT * (capacities[i] === 1 ? 0.63 : 1)) *
                    CAMERA_COS *
                    zoom,
                width: Math.max(44, 1.3 * zoom),
                height:
                  (HEIGHT * (capacities[i] === 1 ? 0.63 : 1) + 0.6) * zoom,
              }}
            >
              {failed && (
                <BottleFallback contents={b} id={i} capacity={capacities[i]} />
              )}
              <span className="bottle-caption">
                <span>
                  {complete(b) ? "✓" : String(i + 1).padStart(2, "0")}
                  {capacities[i] === 1 ? " · 1 dílek" : ""}
                </span>
                <span className="colour-key" aria-hidden="true">
                  {b.map((c, j) => (
                    <span key={j} style={{ color: COLORS[c] }}>
                      {SYMBOLS[c]}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
