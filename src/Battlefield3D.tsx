import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FILES, pieceName, position, squareAt } from "./chess";

interface Battlefield3DProps {
  fen: string;
  selected: string | null;
  destinations: string[];
  arrow?: string | null;
  lastMove?: string | null;
  onSquare: (sq: string) => void;
  disabled?: boolean;
  flipped: boolean;
  tutorialSquares?: string[];
}

type PieceKind = "k" | "a" | "b" | "n" | "r" | "c" | "p";

const RED = new THREE.Color("#a34234");
const BLACK = new THREE.Color("#27322f");
const BRASS = new THREE.Color("#b78b45");
const WOOD = new THREE.Color("#b88a52");
const DARK_WOOD = new THREE.Color("#735236");
const RIVER = new THREE.Color("#6f8f91");
const SELECT = new THREE.Color("#e2a44d");
const MOVE = new THREE.Color("#6e9f77");
const LAST = new THREE.Color("#c78f60");
const TUTORIAL = new THREE.Color("#d8bd70");

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

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose?.();
  });
}

function standardMaterial(color: THREE.ColorRepresentation, roughness = 0.78) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.12 });
}

function addBodyPart(
  parent: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation?: [number, number, number],
  scale?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function soldierUnit(color: THREE.Color, elite = false) {
  const group = new THREE.Group();
  const cloth = standardMaterial(color);
  const skin = standardMaterial("#d7aa7d");
  const dark = standardMaterial("#3f332a");
  const metal = standardMaterial(BRASS, 0.42);

  addBodyPart(
    group,
    new THREE.CylinderGeometry(0.18, 0.23, elite ? 0.65 : 0.55, 8),
    cloth,
    [0, 0.52, 0],
  );
  addBodyPart(group, new THREE.SphereGeometry(0.15, 12, 8), skin, [
    0,
    elite ? 0.97 : 0.9,
    0,
  ]);
  addBodyPart(group, new THREE.CylinderGeometry(0.17, 0.19, 0.12, 8), metal, [
    0,
    elite ? 1.09 : 1.02,
    0,
  ]);
  addBodyPart(
    group,
    new THREE.BoxGeometry(0.12, 0.44, 0.12),
    dark,
    [-0.11, 0.18, 0],
  );
  addBodyPart(
    group,
    new THREE.BoxGeometry(0.12, 0.44, 0.12),
    dark,
    [0.11, 0.18, 0],
  );
  if (elite) {
    addBodyPart(
      group,
      new THREE.BoxGeometry(0.62, 0.13, 0.22),
      metal,
      [0, 0.76, 0],
    );
    addBodyPart(
      group,
      new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6),
      dark,
      [0.25, 0.73, 0],
      [0, 0, -0.1],
    );
  } else {
    addBodyPart(
      group,
      new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6),
      dark,
      [0.24, 0.64, 0],
      [0, 0, -0.1],
    );
  }
  return group;
}

function horseUnit(color: THREE.Color) {
  const group = new THREE.Group();
  const horse = standardMaterial("#6b4b35");
  const cloth = standardMaterial(color);
  const skin = standardMaterial("#d7aa7d");
  const dark = standardMaterial("#2f2a26");

  addBodyPart(
    group,
    new THREE.CapsuleGeometry(0.22, 0.52, 6, 10),
    horse,
    [0, 0.52, 0],
    [Math.PI / 2, 0, 0],
  );
  addBodyPart(
    group,
    new THREE.CylinderGeometry(0.12, 0.16, 0.42, 8),
    horse,
    [0, 0.76, -0.25],
    [-0.45, 0, 0],
  );
  addBodyPart(
    group,
    new THREE.SphereGeometry(0.15, 10, 8),
    horse,
    [0, 0.98, -0.36],
  );
  for (const x of [-0.16, 0.16]) {
    addBodyPart(group, new THREE.CylinderGeometry(0.045, 0.05, 0.48, 6), dark, [
      x,
      0.22,
      -0.18,
    ]);
    addBodyPart(group, new THREE.CylinderGeometry(0.045, 0.05, 0.48, 6), dark, [
      x,
      0.22,
      0.2,
    ]);
  }
  addBodyPart(
    group,
    new THREE.CylinderGeometry(0.14, 0.18, 0.45, 8),
    cloth,
    [0, 0.96, 0.1],
  );
  addBodyPart(
    group,
    new THREE.SphereGeometry(0.13, 10, 8),
    skin,
    [0, 1.24, 0.08],
  );
  return group;
}

function elephantUnit(color: THREE.Color) {
  const group = new THREE.Group();
  const hide = standardMaterial("#77756b");
  const cloth = standardMaterial(color);
  const ivory = standardMaterial("#ddd2b5");

  addBodyPart(
    group,
    new THREE.SphereGeometry(0.38, 12, 9),
    hide,
    [0, 0.55, 0],
    undefined,
    [1.05, 0.8, 1.25],
  );
  addBodyPart(
    group,
    new THREE.SphereGeometry(0.25, 10, 8),
    hide,
    [0, 0.64, -0.42],
  );
  addBodyPart(
    group,
    new THREE.CylinderGeometry(0.07, 0.045, 0.58, 8),
    hide,
    [0, 0.4, -0.61],
    [0.42, 0, 0],
  );
  for (const x of [-0.22, 0.22]) {
    addBodyPart(group, new THREE.CylinderGeometry(0.07, 0.08, 0.46, 7), hide, [
      x,
      0.24,
      -0.14,
    ]);
    addBodyPart(group, new THREE.CylinderGeometry(0.07, 0.08, 0.46, 7), hide, [
      x,
      0.24,
      0.22,
    ]);
  }
  addBodyPart(
    group,
    new THREE.BoxGeometry(0.55, 0.16, 0.55),
    cloth,
    [0, 0.86, 0.05],
  );
  addBodyPart(
    group,
    new THREE.ConeGeometry(0.05, 0.32, 6),
    ivory,
    [-0.12, 0.62, -0.61],
    [Math.PI / 2, 0, 0],
  );
  addBodyPart(
    group,
    new THREE.ConeGeometry(0.05, 0.32, 6),
    ivory,
    [0.12, 0.62, -0.61],
    [Math.PI / 2, 0, 0],
  );
  return group;
}

function chariotUnit(color: THREE.Color) {
  const group = new THREE.Group();
  const wood = standardMaterial("#5d4231");
  const cloth = standardMaterial(color);
  const metal = standardMaterial(BRASS, 0.45);
  addBodyPart(
    group,
    new THREE.BoxGeometry(0.66, 0.22, 0.62),
    wood,
    [0, 0.32, 0],
  );
  for (const x of [-0.38, 0.38]) {
    addBodyPart(
      group,
      new THREE.CylinderGeometry(0.19, 0.19, 0.09, 12),
      metal,
      [x, 0.27, 0],
      [0, 0, Math.PI / 2],
    );
  }
  const warrior = soldierUnit(color, true);
  warrior.scale.setScalar(0.72);
  warrior.position.set(0, 0.35, 0);
  group.add(warrior);
  return group;
}

function cannonUnit(color: THREE.Color) {
  const group = new THREE.Group();
  const wood = standardMaterial("#5b4430");
  const metal = standardMaterial("#615d54", 0.38);
  const cloth = standardMaterial(color);
  addBodyPart(
    group,
    new THREE.BoxGeometry(0.65, 0.15, 0.5),
    wood,
    [0, 0.28, 0.02],
  );
  for (const x of [-0.34, 0.34]) {
    addBodyPart(
      group,
      new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12),
      wood,
      [x, 0.25, 0.04],
      [0, 0, Math.PI / 2],
    );
  }
  addBodyPart(
    group,
    new THREE.CylinderGeometry(0.11, 0.17, 0.85, 12),
    metal,
    [0, 0.58, -0.05],
    [Math.PI / 2, 0, 0],
  );
  addBodyPart(
    group,
    new THREE.BoxGeometry(0.42, 0.1, 0.44),
    cloth,
    [0, 0.43, 0.06],
  );
  return group;
}

function commanderUnit(color: THREE.Color, guard = false) {
  const group = soldierUnit(color, true);
  group.scale.setScalar(guard ? 0.95 : 1.13);
  const plume = standardMaterial(guard ? "#d3b46b" : "#d94a3e");
  addBodyPart(
    group,
    new THREE.ConeGeometry(0.07, guard ? 0.32 : 0.48, 8),
    plume,
    [0, guard ? 1.33 : 1.42, 0],
  );
  if (!guard) {
    const cape = standardMaterial(color);
    addBodyPart(
      group,
      new THREE.BoxGeometry(0.48, 0.58, 0.06),
      cape,
      [0, 0.72, 0.2],
      [0.12, 0, 0],
    );
  }
  return group;
}

function createUnit(kind: PieceKind, color: THREE.Color) {
  switch (kind) {
    case "k":
      return commanderUnit(color, false);
    case "a":
      return commanderUnit(color, true);
    case "b":
      return elephantUnit(color);
    case "n":
      return horseUnit(color);
    case "r":
      return chariotUnit(color);
    case "c":
      return cannonUnit(color);
    default:
      return soldierUnit(color, false);
  }
}

function addLine(
  group: THREE.Group,
  from: [number, number],
  to: [number, number],
  color = DARK_WOOD,
  width = 0.025,
) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.018, length),
    standardMaterial(color, 0.9),
  );
  line.position.set((from[0] + to[0]) / 2, 0.075, (from[1] + to[1]) / 2);
  line.rotation.y = Math.atan2(dx, dz);
  line.receiveShadow = true;
  group.add(line);
}

export function Battlefield3D({
  fen,
  selected,
  destinations,
  arrow,
  lastMove,
  onSquare,
  disabled,
  flipped,
  tutorialSquares = [],
}: Battlefield3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const boardRootRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const onSquareRef = useRef(onSquare);
  const disabledRef = useRef(disabled);

  onSquareRef.current = onSquare;
  disabledRef.current = disabled;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d8cfbc");
    scene.fog = new THREE.Fog("#d8cfbc", 16, 25);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 8.7, 10.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
    controls.minDistance = 8;
    controls.maxDistance = 16;
    controls.minPolarAngle = 0.48;
    controls.maxPolarAngle = 1.18;
    controls.update();

    scene.add(new THREE.HemisphereLight("#fff7e4", "#504535", 2.1));
    const sun = new THREE.DirectionalLight("#fff0cf", 3.2);
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
    sceneRef.current = scene;
    boardRootRef.current = root;
    cameraRef.current = camera;
    rendererRef.current = renderer;

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
    const pickSquare = (event: PointerEvent) => {
      if (disabledRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(root.children, true);
      for (const hit of hits) {
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
    renderer.domElement.addEventListener("pointerdown", pickSquare);

    let frame = 0;
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    if (reduced) renderer.render(scene, camera);
    else animate();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("pointerdown", pickSquare);
      observer.disconnect();
      controls.dispose();
      disposeObject(root);
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      boardRootRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = boardRootRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!root || !renderer || !scene || !camera) return;

    while (root.children.length) {
      const child = root.children.pop()!;
      disposeObject(child);
    }

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(9.8, 0.24, 10.8),
      standardMaterial(WOOD, 0.9),
    );
    base.position.y = -0.09;
    base.receiveShadow = true;
    root.add(base);

    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(10.3, 0.18, 11.3),
      standardMaterial("#6f4d2f", 0.84),
    );
    rim.position.y = -0.2;
    rim.receiveShadow = true;
    root.add(rim);

    const river = new THREE.Mesh(
      new THREE.BoxGeometry(8.9, 0.035, 0.86),
      standardMaterial(RIVER, 0.65),
    );
    river.position.set(0, 0.04, 0);
    root.add(river);

    for (let rank = 0; rank <= 9; rank++) {
      const [, z] = squareToWorld(`e${rank}`, flipped);
      addLine(root, [-4, z], [4, z]);
    }
    for (let file = 0; file < 9; file++) {
      const [xTop] = squareToWorld(`${FILES[file]}9`, flipped);
      const [xBottom] = squareToWorld(`${FILES[file]}0`, flipped);
      if (file === 0 || file === 8) addLine(root, [xTop, -4.5], [xBottom, 4.5]);
      else {
        addLine(root, [xTop, -4.5], [xTop, -0.5]);
        addLine(root, [xBottom, 0.5], [xBottom, 4.5]);
      }
    }

    for (const rankBase of [0, 7]) {
      const a = squareToWorld(`d${rankBase}`, flipped);
      const b = squareToWorld(`f${rankBase + 2}`, flipped);
      const c = squareToWorld(`f${rankBase}`, flipped);
      const d = squareToWorld(`d${rankBase + 2}`, flipped);
      addLine(root, a, b, DARK_WOOD, 0.03);
      addLine(root, c, d, DARK_WOOD, 0.03);
    }

    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (let rank = 0; rank <= 9; rank++) {
      for (let file = 0; file < 9; file++) {
        const sq = `${FILES[file]}${rank}`;
        const [x, z] = squareToWorld(sq, flipped);
        const hit = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20),
          hitMaterial.clone(),
        );
        hit.position.set(x, 0.12, z);
        hit.userData.square = sq;
        root.add(hit);

        let markerColor: THREE.Color | null = null;
        if (tutorialSquares.includes(sq)) markerColor = TUTORIAL;
        if (lastMove?.slice(0, 2) === sq || lastMove?.slice(2) === sq)
          markerColor = LAST;
        if (destinations.includes(sq)) markerColor = MOVE;
        if (selected === sq) markerColor = SELECT;
        if (markerColor) {
          const marker = new THREE.Mesh(
            new THREE.CylinderGeometry(
              selected === sq ? 0.33 : 0.2,
              selected === sq ? 0.33 : 0.2,
              0.035,
              24,
            ),
            new THREE.MeshStandardMaterial({
              color: markerColor,
              emissive: markerColor,
              emissiveIntensity: 0.28,
              roughness: 0.65,
            }),
          );
          marker.position.set(x, 0.115, z);
          marker.userData.square = sq;
          root.add(marker);
        }
      }
    }

    const game = position(fen);
    game.board().forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (!piece) return;
        const sq = squareAt(rowIndex, colIndex);
        const [x, z] = squareToWorld(sq, flipped);
        const sideColor = piece.color === "r" ? RED : BLACK;
        const unit = createUnit(piece.type as PieceKind, sideColor);
        unit.position.set(x, 0.12, z);
        unit.rotation.y = piece.color === "r" ? Math.PI : 0;
        unit.scale.multiplyScalar(
          piece.type === "b" ? 0.82 : piece.type === "r" ? 0.86 : 0.8,
        );
        unit.userData.square = sq;
        unit.userData.label = pieceName(piece);
        unit.traverse((part) => {
          part.userData.square = sq;
        });
        root.add(unit);
      });
    });

    if (arrow && /^[a-i][0-9][a-i][0-9]$/.test(arrow)) {
      const [sx, sz] = squareToWorld(arrow.slice(0, 2), flipped);
      const [tx, tz] = squareToWorld(arrow.slice(2), flipped);
      const dx = tx - sx;
      const dz = tz - sz;
      const length = Math.hypot(dx, dz);
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.035,
          0.035,
          Math.max(0.1, length - 0.3),
          8,
        ),
        new THREE.MeshStandardMaterial({
          color: SELECT,
          emissive: SELECT,
          emissiveIntensity: 0.25,
        }),
      );
      shaft.position.set((sx + tx) / 2, 0.2, (sz + tz) / 2);
      shaft.rotation.z = Math.PI / 2;
      shaft.rotation.y = -Math.atan2(dz, dx);
      root.add(shaft);
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.28, 8),
        standardMaterial(SELECT, 0.5),
      );
      head.position.set(tx, 0.2, tz);
      head.rotation.z = Math.PI / 2;
      head.rotation.y = -Math.atan2(dz, dx);
      root.add(head);
    }

    renderer.render(scene, camera);
  }, [fen, selected, destinations, arrow, lastMove, flipped, tutorialSquares]);

  return (
    <div className="battlefield3d-shell">
      <div
        ref={mountRef}
        className="battlefield3d-canvas"
        role="application"
        aria-label="Sa bàn cờ tướng 3D. Chạm một quân rồi chạm điểm đến. Có thể kéo để xoay góc nhìn và cuộn để phóng to."
      />
      <div className="battlefield3d-hud" aria-hidden="true">
        <span>Sa bàn 3D</span>
        <span>Kéo: xoay · Cuộn: zoom · Chạm: chọn quân</span>
      </div>
    </div>
  );
}
