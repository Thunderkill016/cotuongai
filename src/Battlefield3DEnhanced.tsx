import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FILES, pieceName, position, squareAt } from "./chess";
import type { BoardViewProps } from "./Board2D";

type PieceKind = "k" | "a" | "b" | "n" | "r" | "c" | "p";
type Motion = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
  duration: number;
  arc: number;
};

const COLORS = {
  red: new THREE.Color("#a63f31"),
  black: new THREE.Color("#26322f"),
  brass: new THREE.Color("#b58b48"),
  wood: new THREE.Color("#ad7e49"),
  darkWood: new THREE.Color("#64462d"),
  river: new THREE.Color("#64898e"),
  select: new THREE.Color("#e4a84f"),
  move: new THREE.Color("#73a07c"),
  last: new THREE.Color("#cf8b55"),
  tutorial: new THREE.Color("#d9bd6a"),
};

function squareToWorld(square: string, flipped: boolean): [number, number] {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  let x = file - 4;
  let z = 4.5 - rank;
  if (flipped) {
    x *= -1;
    z *= -1;
  }
  return [x, z];
}

function material(color: THREE.ColorRepresentation, roughness = 0.75) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.12 });
}

function mesh(
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  position: [number, number, number],
  rotation?: [number, number, number],
) {
  const value = new THREE.Mesh(geometry, mat);
  value.position.set(...position);
  if (rotation) value.rotation.set(...rotation);
  value.castShadow = true;
  value.receiveShadow = true;
  return value;
}

function add(parent: THREE.Group, child: THREE.Object3D) {
  parent.add(child);
  return child;
}

function humanoid(color: THREE.Color, elite = false) {
  const g = new THREE.Group();
  const cloth = material(color);
  const skin = material("#d4a274");
  const dark = material("#332c27");
  const metal = material(COLORS.brass, 0.42);

  add(
    g,
    mesh(
      new THREE.CylinderGeometry(0.18, 0.24, elite ? 0.67 : 0.57, 8),
      cloth,
      [0, 0.54, 0],
    ),
  );
  add(g, mesh(new THREE.SphereGeometry(0.15, 12, 8), skin, [0, elite ? 0.98 : 0.91, 0]));
  add(g, mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.11, 8), metal, [0, elite ? 1.11 : 1.04, 0]));
  for (const x of [-0.11, 0.11])
    add(g, mesh(new THREE.BoxGeometry(0.11, 0.44, 0.11), dark, [x, 0.2, 0]));

  if (elite) {
    add(g, mesh(new THREE.BoxGeometry(0.62, 0.13, 0.22), metal, [0, 0.77, 0]));
    add(g, mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6), dark, [0.27, 0.73, 0]));
  } else {
    add(g, mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.92, 6), dark, [0.25, 0.66, 0], [0, 0, -0.08]));
  }
  return g;
}

function horse(color: THREE.Color) {
  const g = new THREE.Group();
  const hide = material("#674935");
  const dark = material("#2c2926");
  const cloth = material(color);
  const skin = material("#d4a274");

  add(g, mesh(new THREE.CapsuleGeometry(0.23, 0.54, 5, 10), hide, [0, 0.55, 0], [Math.PI / 2, 0, 0]));
  add(g, mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.43, 8), hide, [0, 0.78, -0.27], [-0.48, 0, 0]));
  add(g, mesh(new THREE.SphereGeometry(0.15, 10, 8), hide, [0, 0.99, -0.39]));
  for (const x of [-0.16, 0.16]) {
    add(g, mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.48, 6), dark, [x, 0.23, -0.18]));
    add(g, mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.48, 6), dark, [x, 0.23, 0.2]));
  }
  add(g, mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.46, 8), cloth, [0, 0.97, 0.1]));
  add(g, mesh(new THREE.SphereGeometry(0.13, 10, 8), skin, [0, 1.25, 0.08]));
  return g;
}

function elephant(color: THREE.Color) {
  const g = new THREE.Group();
  const hide = material("#74746c");
  const cloth = material(color);
  const ivory = material("#e1d5b9");

  const body = mesh(new THREE.SphereGeometry(0.38, 12, 9), hide, [0, 0.57, 0]);
  body.scale.set(1.06, 0.82, 1.28);
  add(g, body);
  add(g, mesh(new THREE.SphereGeometry(0.25, 10, 8), hide, [0, 0.66, -0.43]));
  add(g, mesh(new THREE.CylinderGeometry(0.07, 0.045, 0.58, 8), hide, [0, 0.42, -0.62], [0.42, 0, 0]));
  for (const x of [-0.22, 0.22]) {
    add(g, mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.46, 7), hide, [x, 0.25, -0.14]));
    add(g, mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.46, 7), hide, [x, 0.25, 0.22]));
  }
  add(g, mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), cloth, [0, 0.88, 0.05]));
  for (const x of [-0.12, 0.12])
    add(g, mesh(new THREE.ConeGeometry(0.05, 0.32, 6), ivory, [x, 0.63, -0.62], [Math.PI / 2, 0, 0]));
  return g;
}

function chariot(color: THREE.Color) {
  const g = new THREE.Group();
  const wood = material("#563c2d");
  const metal = material(COLORS.brass, 0.42);
  add(g, mesh(new THREE.BoxGeometry(0.68, 0.23, 0.64), wood, [0, 0.33, 0]));
  for (const x of [-0.39, 0.39])
    add(g, mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 12), metal, [x, 0.27, 0], [0, 0, Math.PI / 2]));
  const warrior = humanoid(color, true);
  warrior.scale.setScalar(0.72);
  warrior.position.set(0, 0.35, 0);
  g.add(warrior);
  return g;
}

function cannon(color: THREE.Color) {
  const g = new THREE.Group();
  const wood = material("#57402f");
  const metal = material("#5d5a54", 0.36);
  const cloth = material(color);
  add(g, mesh(new THREE.BoxGeometry(0.66, 0.15, 0.5), wood, [0, 0.28, 0.02]));
  for (const x of [-0.35, 0.35])
    add(g, mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), wood, [x, 0.25, 0.04], [0, 0, Math.PI / 2]));
  add(g, mesh(new THREE.CylinderGeometry(0.11, 0.17, 0.88, 12), metal, [0, 0.59, -0.06], [Math.PI / 2, 0, 0]));
  add(g, mesh(new THREE.BoxGeometry(0.43, 0.1, 0.45), cloth, [0, 0.44, 0.07]));
  return g;
}

function commander(color: THREE.Color, guard = false) {
  const g = humanoid(color, true);
  g.scale.setScalar(guard ? 0.95 : 1.12);
  const plume = material(guard ? "#d0b16b" : "#d74a3c");
  add(g, mesh(new THREE.ConeGeometry(0.07, guard ? 0.31 : 0.47, 8), plume, [0, guard ? 1.32 : 1.42, 0]));
  if (!guard) add(g, mesh(new THREE.BoxGeometry(0.48, 0.58, 0.06), material(color), [0, 0.73, 0.2], [0.12, 0, 0]));
  return g;
}

function createUnit(kind: PieceKind, color: THREE.Color) {
  if (kind === "k") return commander(color, false);
  if (kind === "a") return commander(color, true);
  if (kind === "b") return elephant(color);
  if (kind === "n") return horse(color);
  if (kind === "r") return chariot(color);
  if (kind === "c") return cannon(color);
  return humanoid(color, false);
}

function dispose(root: THREE.Object3D) {
  root.traverse((object) => {
    const value = object as THREE.Mesh;
    value.geometry?.dispose?.();
    const current = value.material;
    if (Array.isArray(current)) current.forEach((item) => item.dispose());
    else current?.dispose?.();
  });
}

function line(group: THREE.Group, from: [number, number], to: [number, number], width = 0.025) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const value = mesh(new THREE.BoxGeometry(width, 0.018, length), material(COLORS.darkWood, 0.9), [
    (from[0] + to[0]) / 2,
    0.075,
    (from[1] + to[1]) / 2,
  ]);
  value.rotation.y = Math.atan2(dx, dz);
  group.add(value);
}

function addBanner(root: THREE.Group, x: number, z: number, red: boolean) {
  const pole = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), material("#47372a"), [x, 0.62, z]);
  root.add(pole);
  const flag = mesh(new THREE.PlaneGeometry(0.48, 0.3), material(red ? COLORS.red : COLORS.black), [x + 0.24, 1.02, z]);
  flag.userData.flag = true;
  flag.userData.phase = Math.random() * Math.PI * 2;
  root.add(flag);
}

export function Battlefield3DEnhanced({
  fen,
  selected,
  destinations,
  arrow,
  lastMove,
  onSquare,
  disabled,
  flipped,
  tutorialSquares = [],
}: BoardViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const onSquareRef = useRef(onSquare);
  const disabledRef = useRef(disabled);
  const animatedMoveRef = useRef<string | null>(null);
  const reducedMotionRef = useRef(false);

  onSquareRef.current = onSquare;
  disabledRef.current = disabled;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    reducedMotionRef.current = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d6cebd");
    scene.fog = new THREE.Fog("#d6cebd", 16, 26);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 8.8, 10.7);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.45, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 7.8;
    controls.maxDistance = 16;
    controls.minPolarAngle = 0.46;
    controls.maxPolarAngle = 1.2;

    scene.add(new THREE.HemisphereLight("#fff6e2", "#4e4436", 2.05));
    const sun = new THREE.DirectionalLight("#fff0ce", 3.15);
    sun.position.set(-6, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -7;
    sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);

    const root = new THREE.Group();
    scene.add(root);
    rootRef.current = root;
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    const resize = () => {
      const width = Math.max(280, mount.clientWidth);
      const height = Math.max(420, Math.min(width * 1.08, 720));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pick = (event: PointerEvent) => {
      if (disabledRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObjects(root.children, true)) {
        let object: THREE.Object3D | null = hit.object;
        while (object && object !== root) {
          if (typeof object.userData.square === "string") {
            onSquareRef.current(object.userData.square);
            return;
          }
          object = object.parent;
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", pick);

    let frame = 0;
    const animate = (now: number) => {
      controls.update();
      root.traverse((object) => {
        const motion = object.userData.motion as Motion | undefined;
        if (motion) {
          const raw = Math.min(1, Math.max(0, (now - motion.start) / motion.duration));
          const t = 1 - Math.pow(1 - raw, 3);
          object.position.lerpVectors(motion.from, motion.to, t);
          object.position.y += Math.sin(Math.PI * t) * motion.arc;
          if (raw >= 1) {
            object.position.copy(motion.to);
            delete object.userData.motion;
          }
        }
        if (object.userData.pulse) {
          const pulse = 1 + Math.sin(now / 180 + object.userData.phase) * 0.12;
          object.scale.setScalar(pulse);
        }
        if (object.userData.flash) {
          const age = (now - object.userData.startedAt) / 650;
          const ring = object as THREE.Mesh;
          if (age <= 1) {
            ring.scale.setScalar(0.7 + age * 1.8);
            const mat = ring.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.7 * (1 - age);
          } else object.visible = false;
        }
        if (object.userData.flag) object.rotation.y = Math.sin(now / 430 + object.userData.phase) * 0.12;
      });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("pointerdown", pick);
      observer.disconnect();
      controls.dispose();
      dispose(root);
      renderer.dispose();
      renderer.domElement.remove();
      rootRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!root || !renderer || !scene || !camera) return;

    while (root.children.length) {
      const child = root.children.pop()!;
      dispose(child);
    }

    const rim = mesh(new THREE.BoxGeometry(10.45, 0.2, 11.45), material("#62442b", 0.86), [0, -0.21, 0]);
    root.add(rim);
    const base = mesh(new THREE.BoxGeometry(9.9, 0.25, 10.9), material(COLORS.wood, 0.9), [0, -0.08, 0]);
    root.add(base);
    const river = mesh(
      new THREE.BoxGeometry(8.9, 0.035, 0.88),
      new THREE.MeshStandardMaterial({ color: COLORS.river, roughness: 0.38, metalness: 0.08, transparent: true, opacity: 0.92 }),
      [0, 0.045, 0],
    );
    root.add(river);

    for (let rank = 0; rank <= 9; rank++) {
      const [, z] = squareToWorld(`e${rank}`, flipped);
      line(root, [-4, z], [4, z]);
    }
    for (let file = 0; file < 9; file++) {
      const [x] = squareToWorld(`${FILES[file]}9`, flipped);
      if (file === 0 || file === 8) line(root, [x, -4.5], [x, 4.5]);
      else {
        line(root, [x, -4.5], [x, -0.5]);
        line(root, [x, 0.5], [x, 4.5]);
      }
    }
    for (const baseRank of [0, 7]) {
      line(root, squareToWorld(`d${baseRank}`, flipped), squareToWorld(`f${baseRank + 2}`, flipped), 0.03);
      line(root, squareToWorld(`f${baseRank}`, flipped), squareToWorld(`d${baseRank + 2}`, flipped), 0.03);
    }

    addBanner(root, -4.65, 4.65, true);
    addBanner(root, 4.65, 4.65, true);
    addBanner(root, -4.65, -4.65, false);
    addBanner(root, 4.65, -4.65, false);

    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    for (let rank = 0; rank <= 9; rank++) {
      for (let file = 0; file < 9; file++) {
        const sq = `${FILES[file]}${rank}`;
        const [x, z] = squareToWorld(sq, flipped);
        const hit = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.04, 20), hitMat.clone(), [x, 0.12, z]);
        hit.userData.square = sq;
        root.add(hit);

        let markerColor: THREE.Color | null = null;
        if (tutorialSquares.includes(sq)) markerColor = COLORS.tutorial;
        if (lastMove?.slice(0, 2) === sq || lastMove?.slice(2) === sq) markerColor = COLORS.last;
        if (destinations.includes(sq)) markerColor = COLORS.move;
        if (selected === sq) markerColor = COLORS.select;
        if (markerColor) {
          const marker = mesh(
            new THREE.CylinderGeometry(selected === sq ? 0.34 : 0.2, selected === sq ? 0.34 : 0.2, 0.035, 24),
            new THREE.MeshStandardMaterial({ color: markerColor, emissive: markerColor, emissiveIntensity: 0.3, roughness: 0.62 }),
            [x, 0.12, z],
          );
          marker.userData.square = sq;
          if (destinations.includes(sq) || selected === sq) {
            marker.userData.pulse = !reducedMotionRef.current;
            marker.userData.phase = file + rank * 0.6;
          }
          root.add(marker);
        }
      }
    }

    const game = position(fen);
    const moveKey = lastMove ? `${fen}|${lastMove}` : null;
    const animateThisMove =
      !!lastMove &&
      /^[a-i][0-9][a-i][0-9]$/.test(lastMove) &&
      animatedMoveRef.current !== moveKey &&
      !reducedMotionRef.current;
    if (moveKey) animatedMoveRef.current = moveKey;

    game.board().forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (!piece) return;
        const sq = squareAt(rowIndex, colIndex);
        const [x, z] = squareToWorld(sq, flipped);
        const side = piece.color === "r" ? COLORS.red : COLORS.black;
        const unit = createUnit(piece.type as PieceKind, side);
        const baseScale = piece.type === "b" ? 0.82 : piece.type === "r" ? 0.86 : 0.8;
        unit.scale.multiplyScalar(baseScale);
        unit.position.set(x, 0.12, z);
        unit.rotation.y = piece.color === "r" ? Math.PI : 0;
        unit.userData.square = sq;
        unit.userData.label = pieceName(piece);
        unit.userData.kind = piece.type;
        unit.traverse((part) => (part.userData.square = sq));

        if (animateThisMove && lastMove?.slice(2) === sq) {
          const [fromX, fromZ] = squareToWorld(lastMove.slice(0, 2), flipped);
          const from = new THREE.Vector3(fromX, 0.12, fromZ);
          const to = new THREE.Vector3(x, 0.12, z);
          unit.position.copy(from);
          const kind = piece.type as PieceKind;
          unit.userData.motion = {
            from,
            to,
            start: performance.now(),
            duration: kind === "n" ? 620 : kind === "b" ? 700 : kind === "r" ? 430 : 520,
            arc: kind === "n" ? 0.48 : kind === "b" ? 0.18 : 0.08,
          } satisfies Motion;
        }
        root.add(unit);
      });
    });

    if (animateThisMove && lastMove) {
      const [tx, tz] = squareToWorld(lastMove.slice(2), flipped);
      const flash = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.34, 28),
        new THREE.MeshBasicMaterial({ color: COLORS.last, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
      );
      flash.rotation.x = -Math.PI / 2;
      flash.position.set(tx, 0.16, tz);
      flash.userData.flash = true;
      flash.userData.startedAt = performance.now();
      root.add(flash);
    }

    if (arrow && /^[a-i][0-9][a-i][0-9]$/.test(arrow)) {
      const [sx, sz] = squareToWorld(arrow.slice(0, 2), flipped);
      const [tx, tz] = squareToWorld(arrow.slice(2), flipped);
      const dx = tx - sx;
      const dz = tz - sz;
      const length = Math.hypot(dx, dz);
      const shaft = mesh(
        new THREE.CylinderGeometry(0.035, 0.035, Math.max(0.1, length - 0.3), 8),
        new THREE.MeshStandardMaterial({ color: COLORS.select, emissive: COLORS.select, emissiveIntensity: 0.28 }),
        [(sx + tx) / 2, 0.21, (sz + tz) / 2],
      );
      shaft.rotation.z = Math.PI / 2;
      shaft.rotation.y = -Math.atan2(dz, dx);
      root.add(shaft);
      const head = mesh(new THREE.ConeGeometry(0.13, 0.28, 8), material(COLORS.select, 0.5), [tx, 0.21, tz]);
      head.rotation.z = Math.PI / 2;
      head.rotation.y = -Math.atan2(dz, dx);
      root.add(head);
    }

    renderer.render(scene, camera);
  }, [fen, selected, destinations, arrow, lastMove, flipped, tutorialSquares]);

  return (
    <div className="battlefield3d-shell battlefield3d-enhanced">
      <div
        ref={mountRef}
        className="battlefield3d-canvas"
        role="application"
        aria-label="Sa bàn cờ tướng 3D có chuyển động. Chạm quân rồi chạm điểm đến; kéo để xoay và cuộn để phóng to."
      />
      <div className="battlefield3d-hud" aria-hidden="true">
        <span>Sa bàn chiến trận 3D</span>
        <span>Nước đi có chuyển động · Kéo: xoay · Cuộn: zoom · Chạm: ra lệnh</span>
      </div>
    </div>
  );
}
