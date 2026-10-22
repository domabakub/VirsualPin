import { PropertyBinding, type Object3D } from "three";

/** GLTFLoader sanitizes Blender node names before adding them to the scene. */
export function findMalletHead(mallet: Object3D, hand: "L" | "R") {
  const name = PropertyBinding.sanitizeNodeName(`O5 | Padded_Head_${hand}`);
  const head = mallet.getObjectByName(name);
  if (!head) throw new Error(`Missing padded mallet head ${hand}`);
  return head;
}
