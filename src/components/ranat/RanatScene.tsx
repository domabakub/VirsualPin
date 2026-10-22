"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Box3, Group, Mesh, MeshStandardMaterial, OrthographicCamera, PMREMGenerator, Vector3 } from "three";
import { HAND_TIMEOUT_MS, type MalletPose } from "@/instruments/ranat/handMallets";
import type { ArPlacement, ScreenBar } from "@/instruments/ranat/ar";
import { MalletContactController, type ContactHead } from "@/instruments/ranat/malletContact";
import type { Articulation } from "@/instruments/ranat/model";
import type { MalletCommand } from "@/instruments/ranat/handMallets";

export type RanatHit = { bar: number; hand: "L" | "R"; stamp: number; id?: number };
export type RanatSceneProps = {
  hits?: RanatHit[]; poses?: MalletPose[]; range?: [number, number]; disabledFrom?: number;
  cameraInput?: boolean; showcase?: boolean; reducedMotion?: boolean; active?: boolean;
  onDown?: (bar: number, owner: string) => void; onUp?: (owner: string) => void;
  contactEnabled?: boolean; contactMode?: Articulation; contactOffset?: number;
  onMalletCommands?: (commands: MalletCommand[]) => void;
  /** Camera-overlay (AR) framing: the active range is placed on the video and bar tops are reported in view coordinates. */
  ar?: { placement: ArPlacement; onBars?: (bars: ScreenBar[]) => void };
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

function FitCamera({ showcase, ar }: { showcase: boolean; ar: boolean }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (ar) return; // AR framing is owned by the instrument, which knows where the bars are.
    const cam = camera as OrthographicCamera;
    cam.position.set(0, showcase ? 1 : 1.35, 1.9);
    cam.lookAt(0, .175, 0);
    // Three cameras are mutable renderer resources, not React state.
    // eslint-disable-next-line react-hooks/immutability
    cam.zoom = Math.min(size.width / 1.62, size.height / (showcase ? .68 : .66));
    cam.updateProjectionMatrix(); invalidate();
  }, [camera, size.width, size.height, showcase, ar, invalidate]);
  return null;
}

function Instrument({ hits = EMPTY_HITS, poses = EMPTY_POSES, range = [0, 20], disabledFrom = 21, cameraInput = false, showcase = false, reducedMotion = false, active = true, onDown, ar, contactEnabled = false, contactMode = "direct", contactOffset = 7, onMalletCommands }: RanatSceneProps) {
  const gltf = useLoader(GLTFLoader, "/models/ranat-modern-v6.glb");
  const group = useRef<Group>(null);
  const invalidate = useThree(s => s.invalidate);
  const arKey = useRef(""), onBars = useRef(ar?.onBars);
  const contact = useRef(new MalletContactController());
  const contactCallback = useRef(onMalletCommands);
  useEffect(() => { contactCallback.current = onMalletCommands; }, [onMalletCommands]);
  useEffect(() => {
    const controller = contact.current;
    contactCallback.current?.(controller.reset());
    return () => { contactCallback.current?.(controller.reset()); };
  }, [contactEnabled, contactMode, contactOffset, active]);
  useEffect(() => { onBars.current = ar?.onBars; }, [ar?.onBars]);
  const { scene, barNodes, restPositions, strikeHeights, barCenters, mallets, heads, contactBars } = useMemo(() => {
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
    const heads = mallets.map((node, index) => {
      const head = node.getObjectByName(`O5 | Padded_Head_${index ? "R" : "L"}`);
      if (!head) throw new Error("Missing padded mallet head");
      return head;
    });
    const contactBars = barNodes.map((node, bar) => {
      const box = new Box3().setFromObject(node);
      return { bar, left: box.min.x, right: box.max.x, front: box.min.z, back: box.max.z, top: box.max.y };
    });
    return { scene, barNodes, heads, contactBars, restPositions: barNodes.map(node => node.position.clone()),
      strikeHeights: barNodes.map(node => new Box3().setFromObject(node).max.y),
      barCenters: barNodes.map(node => new Box3().setFromObject(node).getCenter(new Vector3())), mallets };
  }, [gltf]);
  useEffect(() => () => { barNodes.forEach(n => (n.material as MeshStandardMaterial).dispose()); }, [barNodes]);
  useEffect(() => { invalidate(); }, [hits, poses, range, cameraInput, reducedMotion, active, ar?.placement, invalidate]);

  useFrame((state, delta) => {
    if (ar) {
      // Frame the active bars on the video, then report where their tops landed on screen.
      const { width, height } = state.size, p = ar.placement, cam = state.camera as OrthographicCamera;
      const key = `${width}x${height}:${range[0]}-${range[1]}:${p.x}:${p.y}:${p.scale}`;
      if (key !== arKey.current && width > 0 && height > 0) {
        arKey.current = key;
        const first = barCenters[range[0]], last = barCenters[range[1]];
        const count = range[1] - range[0] + 1, focusX = (first.x + last.x) / 2;
        const span = count > 1 ? (last.x - first.x) * count / (count - 1) : .07;
        // Three cameras are mutable renderer resources, not React state.
        cam.position.set(focusX, 1.35, 1.9);
        cam.lookAt(focusX, .175, 0);
        cam.zoom = width * p.scale / span;
        cam.setViewOffset(width, height, -(p.x - .5) * width, -(p.y - .5) * height, width, height);
        cam.updateProjectionMatrix(); cam.updateMatrixWorld();
        const projected = barCenters.map((center, bar) => {
          const v = new Vector3(center.x, strikeHeights[bar], center.z).project(cam);
          return { bar, x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
        });
        onBars.current?.(projected);
      }
    }
    if (!active) return;
    const now = performance.now(), count = range[1] - range[0] + 1;
    let moving = false;
    const contactHeads: ContactHead[] = [];
    const position = (bar: number) => restPositions[Math.max(0, Math.min(20, bar))];
    barNodes.forEach((node, i) => {
      node.visible = true;
      const p = position(i), hit = [...hits].reverse().find(h => h.bar === i);
      const age = hit ? now - hit.stamp : Infinity;
      const pulse = Math.max(0, 1 - age / 280);
      node.position.set(p.x, p.y + (reducedMotion ? 0 : Math.sin(age * .06) * .002 * pulse || 0), p.z);
      node.scale.x = 1;
      const mat = node.material as MeshStandardMaterial;
      const aim = poses.find(p => p.bar === i && now - p.stamp < HAND_TIMEOUT_MS);
      mat.color.set(i >= disabledFrom || i < range[0] || i > range[1] ? "#70685e" : "#ffffff");
      mat.emissive.set(hit && pulse > 0 ? (hit.hand === "L" ? "#ffc879" : "#9be1f0") : aim ? (aim.hand === "L" ? "#a97434" : "#487e99") : "#000000");
      mat.emissiveIntensity = pulse * .6 + (aim ? .18 : 0);
      if (pulse > 0) moving = true;
    });
    mallets.forEach((node, index) => {
      const hand = index === 0 ? "L" : "R";
      const pose = poses.find(p => p.hand === hand && now - p.stamp < HAND_TIMEOUT_MS);
      const hit = [...hits].reverse().find(h => h.hand === hand);
      const age = hit ? now - hit.stamp : Infinity;
      node.visible = !cameraInput || !!pose || age < 300;
      const bar = Math.max(0, Math.min(20, (cameraInput ? pose?.bar : age < 90 ? hit?.bar : undefined) ?? pose?.bar ?? hit?.bar ?? (range[0] + Math.floor(count * (index ? .7 : .3)))));
      const p = position(bar);
      const pulse = Math.max(0, 1 - age / 220);
      const lift = pose ? Math.max(0, Math.min(.19, (.62 - pose.v) * .3)) : .09;
      // The v5 head has an 18 mm radius; land its lower edge on the curved bar.
      // Camera motion, including reduced-motion mode, must reach the surface independently of sound.
      const targetY = strikeHeights[bar] + .018 + (pose ? lift : reducedMotion ? .065 : lift * (1 - pulse));
      const alpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 28);
      node.position.x += (p.x - node.position.x) * alpha;
      node.position.y += (targetY - node.position.y) * alpha;
      node.position.z = .01;
      // Pitch the long handles toward the player, away from the camera sightline.
      node.rotation.x = reducedMotion ? .32 : .32 + lift * .4;
      node.rotation.y = index === 0 ? -.38 : .38;
      node.rotation.z = 0;
      if (contactEnabled && pose && (contactMode === "direct" || hand === "L")) {
        node.updateWorldMatrix(true, true);
        const box = new Box3().setFromObject(heads[index]);
        contactHeads.push({ hand, x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2, bottom: box.min.y });
      }
      if (pose || age < 320 || Math.abs(node.position.x - p.x) > .0005 || Math.abs(node.position.y - targetY) > .0005) moving = true;
    });
    if (contactEnabled) contactCallback.current?.(contact.current.update(contactHeads, contactBars.filter(b => b.bar >= range[0] && b.bar <= range[1] && b.bar < disabledFrom), now, contactMode));
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
    <FitCamera showcase={!!props.showcase} ar={!!props.ar} />
    <Suspense fallback={null}><Instrument {...props}/></Suspense>
  </Canvas>;
}
