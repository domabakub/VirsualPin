"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Box3, Group, Mesh, MeshStandardMaterial, OrthographicCamera, PMREMGenerator } from "three";
import type { MalletPose } from "@/instruments/ranat/handMallets";

export type RanatHit = { bar: number; hand: "L" | "R"; stamp: number; id?: number };
export type RanatSceneProps = {
  hits?: RanatHit[]; poses?: MalletPose[]; range?: [number, number]; disabledFrom?: number;
  cameraInput?: boolean; showcase?: boolean; reducedMotion?: boolean; active?: boolean;
  onDown?: (bar: number, owner: string) => void; onUp?: (owner: string) => void;
};
const EMPTY_HITS: RanatHit[] = [], EMPTY_POSES: MalletPose[] = [];

function StudioLight() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const target = generator.fromScene(room, .04);
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    // These are imperative Three.js resources; restore them when this canvas unmounts.
    /* eslint-disable react-hooks/immutability */
    scene.environment = target.texture;
    scene.environmentIntensity = .65;
    room.dispose(); generator.dispose(); invalidate();
    return () => { scene.environment = previous; scene.environmentIntensity = previousIntensity; target.dispose(); };
    /* eslint-enable react-hooks/immutability */
  }, [gl, scene, invalidate]);
  return null;
}

function FitCamera({ showcase }: { showcase: boolean }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    cam.position.set(0, showcase ? 1 : 1.35, 1.9);
    cam.lookAt(0, .175, 0);
    // Three cameras are mutable renderer resources, not React state.
    // eslint-disable-next-line react-hooks/immutability
    cam.zoom = Math.min(size.width / 1.62, size.height / (showcase ? .68 : .66));
    cam.updateProjectionMatrix(); invalidate();
  }, [camera, size.width, size.height, showcase, invalidate]);
  return null;
}

function Instrument({ hits = EMPTY_HITS, poses = EMPTY_POSES, range = [0, 20], disabledFrom = 21, cameraInput = false, showcase = false, reducedMotion = false, active = true, onDown }: RanatSceneProps) {
  const gltf = useLoader(GLTFLoader, "/models/ranat-modern-v5.glb");
  const group = useRef<Group>(null);
  const invalidate = useThree(s => s.invalidate);
  const { scene, barNodes, restPositions, strikeHeights, mallets } = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const barNodes = Array.from({ length: 21 }, (_, i) => {
      const mesh = scene.getObjectByName(`bar_${String(i).padStart(2, "0")}`) as Mesh;
      if (!mesh) throw new Error(`Missing ranat bar ${i}`);
      mesh.material = (mesh.material as MeshStandardMaterial).clone();
      return mesh;
    });
    scene.updateMatrixWorld(true);
    const mallets = ["L", "R"].map(hand => {
      const node = scene.getObjectByName(`mallet_${hand}`);
      if (!node) throw new Error(`Missing ranat mallet ${hand}`);
      return node;
    });
    return { scene, barNodes, restPositions: barNodes.map(node => node.position.clone()),
      strikeHeights: barNodes.map(node => new Box3().setFromObject(node).max.y), mallets };
  }, [gltf]);
  useEffect(() => () => { barNodes.forEach(n => (n.material as MeshStandardMaterial).dispose()); }, [barNodes]);
  useEffect(() => { invalidate(); }, [hits, poses, range, cameraInput, reducedMotion, active, invalidate]);

  useFrame((state, delta) => {
    if (!active) return;
    const now = performance.now(), count = range[1] - range[0] + 1;
    let moving = false;
    const position = (bar: number) => restPositions[Math.max(0, Math.min(20, bar))];
    barNodes.forEach((node, i) => {
      node.visible = true;
      const p = position(i), hit = [...hits].reverse().find(h => h.bar === i);
      const age = hit ? now - hit.stamp : Infinity;
      const pulse = Math.max(0, 1 - age / 280);
      node.position.set(p.x, p.y + (reducedMotion ? 0 : Math.sin(age * .06) * .002 * pulse || 0), p.z);
      node.scale.x = 1;
      const mat = node.material as MeshStandardMaterial;
      const aim = poses.find(p => p.bar === i && now - p.stamp < 180);
      mat.color.set(i >= disabledFrom || i < range[0] || i > range[1] ? "#70685e" : "#ffffff");
      mat.emissive.set(hit && pulse > 0 ? (hit.hand === "L" ? "#ffc879" : "#9be1f0") : aim ? (aim.hand === "L" ? "#a97434" : "#487e99") : "#000000");
      mat.emissiveIntensity = pulse * .6 + (aim ? .18 : 0);
      if (pulse > 0) moving = true;
    });
    mallets.forEach((node, index) => {
      const hand = index === 0 ? "L" : "R";
      const pose = poses.find(p => p.hand === hand && now - p.stamp < 180);
      const hit = [...hits].reverse().find(h => h.hand === hand);
      const age = hit ? now - hit.stamp : Infinity;
      node.visible = !cameraInput || !!pose || age < 300;
      const bar = Math.max(0, Math.min(20, (age < 90 ? hit?.bar : undefined) ?? pose?.bar ?? hit?.bar ?? (range[0] + Math.floor(count * (index ? .7 : .3)))));
      const p = position(bar);
      const pulse = Math.max(0, 1 - age / 220);
      const lift = pose ? Math.max(0, Math.min(.19, (.62 - pose.v) * .3)) : .09;
      // The v5 head has an 18 mm radius; land its lower edge on the curved bar.
      const targetY = strikeHeights[bar] + .018 + (reducedMotion ? .065 : lift * (1 - pulse));
      const alpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 28);
      node.position.x += (p.x - node.position.x) * alpha;
      node.position.y += (targetY - node.position.y) * alpha;
      node.position.z = .01;
      // Pitch the long handles toward the player, away from the camera sightline.
      node.rotation.x = reducedMotion ? .32 : .32 + lift * .4;
      node.rotation.y = index === 0 ? -.38 : .38;
      node.rotation.z = 0;
      if (pose || age < 320 || Math.abs(node.position.x - p.x) > .0005 || Math.abs(node.position.y - targetY) > .0005) moving = true;
    });
    if (group.current && showcase) {
      group.current.rotation.y = reducedMotion ? -.12 : Math.sin(state.clock.elapsedTime * .35) * .13;
      moving = !reducedMotion;
    }
    if (moving) invalidate();
  });
  function down(event: ThreeEvent<PointerEvent>) {
    if (!onDown || showcase) return;
    let object = event.object;
    while (object.parent && !/^bar_\d{2}$/.test(object.name)) object = object.parent;
    if (!/^bar_\d{2}$/.test(object.name)) return;
    const bar = Number(object.name.slice(4));
    if (bar >= disabledFrom || bar < range[0] || bar > range[1]) return;
    event.stopPropagation();
    if (event.nativeEvent.target instanceof Element) event.nativeEvent.target.setPointerCapture(event.pointerId);
    onDown(bar, `pointer-${event.pointerId}`);
  }
  return <group ref={group}><primitive object={scene} dispose={null} onPointerDown={down} /></group>;
}

export function RanatScene(props: RanatSceneProps) {
  return <Canvas orthographic camera={{ position: [0, 1.65, 1.7], near: .01, far: 20 }} dpr={[1, 1.5]} frameloop="demand" gl={{ antialias: true, alpha: true }}
    onCreated={({ gl }) => { gl.domElement.setAttribute("aria-label", "โมเดลระนาดเอกสามมิติ"); }}>
    <StudioLight />
    <ambientLight intensity={.3} />
    <hemisphereLight args={["#fff7e7", "#657679", .45]} />
    <directionalLight position={[-2, 4, 3]} color="#fff0d8" intensity={2.3} />
    <directionalLight position={[2, 1, -1]} color="#e0efff" intensity={1.3} />
    <FitCamera showcase={!!props.showcase} />
    <Suspense fallback={null}><Instrument {...props}/></Suspense>
  </Canvas>;
}
