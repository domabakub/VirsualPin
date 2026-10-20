"""Shrink the ranat web model without touching anything the player animates.

    python scripts/optimize-ranat-web.py [input.glb] [output.glb]

Defaults: public/models/ranat-modern-v5.glb -> public/models/ranat-modern-v6.glb
Needs numpy and Pillow.

- bar_00..bar_20 and mallet_L/R meshes, node names, transforms, pivots and extras
  are copied unchanged (the player reads their positions and bounding boxes).
- Dense decorative meshes (end frames, inserts, resonator, supports) are simplified
  by vertex clustering. The cluster key includes a coarse normal and UV cell so hard
  edges and texture seams survive.
- Normals become normalized int8 and in-range UVs normalized uint16
  (KHR_mesh_quantization, supported by three.js GLTFLoader). Positions stay float.
- Textures are re-encoded as JPEG at most 1024 px when they have no alpha.
"""
import io
import json
import struct
import sys

import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "public/models/ranat-modern-v5.glb"
DST = sys.argv[2] if len(sys.argv) > 2 else "public/models/ranat-modern-v6.glb"
DECIMATE_ABOVE = 6000      # triangles; smaller decorative meshes are left alone
CELL_M = 0.0025            # clustering cell (model units are metres)
TEXTURE_MAX = 1024
JPEG_QUALITY = 84

COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
DTYPES = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}


def read_glb(path):
    data = open(path, "rb").read()
    magic, version, _ = struct.unpack("<III", data[:12])
    assert magic == 0x46546C67 and version == 2, "expected glTF 2 GLB"
    json_len = struct.unpack("<I", data[12:16])[0]
    doc = json.loads(data[20:20 + json_len])
    offset = 20 + json_len
    bin_len = struct.unpack("<I", data[offset:offset + 4])[0]
    return doc, data[offset + 8: offset + 8 + bin_len]


def accessor_array(doc, binary, index):
    acc = doc["accessors"][index]
    view = doc["bufferViews"][acc["bufferView"]]
    dtype = np.dtype(DTYPES[acc["componentType"]])
    comps = COMPONENTS[acc["type"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = view.get("byteStride", 0) or dtype.itemsize * comps
    count = acc["count"]
    raw = np.frombuffer(binary, dtype=np.uint8, count=stride * (count - 1) + dtype.itemsize * comps, offset=start)
    rows = np.lib.stride_tricks.as_strided(raw, shape=(count, dtype.itemsize * comps), strides=(stride, 1)).copy()
    out = rows.view(dtype).reshape(count, comps)
    if acc.get("normalized"):
        info = np.iinfo(dtype)
        out = np.maximum(out.astype(np.float32) / info.max, -1.0)
    return out.astype(np.float32) if acc["componentType"] != 5126 and not acc.get("normalized") and acc["type"] != "SCALAR" else out


def cluster(positions, normals, uvs, indices):
    """Vertex-clustering simplification keyed by position cell, normal and UV cell."""
    cell = np.floor(positions / CELL_M).astype(np.int64)
    n_key = np.round(normals * 2).astype(np.int64)            # ~30° buckets keep creases
    keys = [cell, n_key]
    if uvs is not None:
        keys.append(np.floor(uvs * 64).astype(np.int64))     # keep texture seams apart
    stacked = np.concatenate(keys, axis=1)
    _, remap, counts = np.unique(stacked, axis=0, return_inverse=True, return_counts=True)
    remap = remap.reshape(-1)
    groups = counts.shape[0]
    def mean(values):
        acc = np.zeros((groups, values.shape[1]), dtype=np.float64)
        np.add.at(acc, remap, values)
        return (acc / counts[:, None]).astype(np.float32)
    new_pos, new_nrm = mean(positions), mean(normals)
    new_nrm /= np.maximum(np.linalg.norm(new_nrm, axis=1, keepdims=True), 1e-8)
    new_uv = mean(uvs) if uvs is not None else None
    tris = remap[indices.reshape(-1, 3)]
    keep = (tris[:, 0] != tris[:, 1]) & (tris[:, 1] != tris[:, 2]) & (tris[:, 0] != tris[:, 2])
    tris = np.unique(np.sort(tris[keep], axis=1), axis=0, return_index=True)[1]
    tris = remap[indices.reshape(-1, 3)][keep][np.sort(tris)]
    used, compact = np.unique(tris.reshape(-1), return_inverse=True)
    return new_pos[used], new_nrm[used], (new_uv[used] if new_uv is not None else None), compact.reshape(-1, 3).astype(np.uint32)


class Writer:
    def __init__(self):
        self.chunks, self.length, self.views, self.accessors = [], 0, [], []

    def view(self, payload, target=None, stride=None):
        pad = (-self.length) % 4
        if pad:
            self.chunks.append(b"\0" * pad); self.length += pad
        entry = {"buffer": 0, "byteOffset": self.length, "byteLength": len(payload)}
        if target: entry["target"] = target
        if stride: entry["byteStride"] = stride
        self.chunks.append(payload); self.length += len(payload)
        self.views.append(entry)
        return len(self.views) - 1

    def accessor(self, array, component_type, kind, target=None, normalized=False, minmax=False):
        array = np.ascontiguousarray(array)
        comps = COMPONENTS[kind]
        itemsize = array.dtype.itemsize * comps
        stride = None
        payload = array.tobytes()
        if target == 34962 and itemsize % 4:
            # Vertex attributes must be 4-byte aligned per element: pad each row.
            padded_size = itemsize + (-itemsize) % 4
            rows = np.zeros((array.shape[0], padded_size), dtype=np.uint8)
            rows[:, :itemsize] = array.reshape(array.shape[0], -1).view(np.uint8)
            payload, stride = rows.tobytes(), padded_size
        acc = {"bufferView": self.view(payload, target, stride), "componentType": component_type, "count": int(array.shape[0]), "type": kind}
        if normalized: acc["normalized"] = True
        if minmax:
            acc["min"] = [float(v) for v in array.min(axis=0)]
            acc["max"] = [float(v) for v in array.max(axis=0)]
        self.accessors.append(acc)
        return len(self.accessors) - 1


def main():
    doc, binary = read_glb(SRC)
    protected_meshes = {n["mesh"] for n in doc["nodes"] if "mesh" in n and n.get("name", "").startswith(("bar_", "mallet_"))}
    out = Writer()
    before_tris = after_tris = 0
    for mesh_index, mesh in enumerate(doc["meshes"]):
        for prim in mesh["primitives"]:
            assert prim.get("mode", 4) == 4 and "indices" in prim and not prim.get("targets"), "only indexed triangle lists supported"
            attrs = prim["attributes"]
            assert set(attrs) <= {"POSITION", "NORMAL", "TEXCOORD_0"}, f"unexpected attributes {set(attrs)}"
            pos = accessor_array(doc, binary, attrs["POSITION"]).astype(np.float32)
            nrm = accessor_array(doc, binary, attrs["NORMAL"]).astype(np.float32)
            uv = accessor_array(doc, binary, attrs["TEXCOORD_0"]).astype(np.float32) if "TEXCOORD_0" in attrs else None
            idx = accessor_array(doc, binary, prim["indices"]).reshape(-1).astype(np.uint32)
            before_tris += idx.size // 3
            if mesh_index not in protected_meshes and idx.size // 3 > DECIMATE_ABOVE:
                pos, nrm, uv, tri = cluster(pos, nrm, uv, idx)
                idx = tri.reshape(-1)
            after_tris += idx.size // 3
            new_attrs = {"POSITION": out.accessor(pos.astype(np.float32), 5126, "VEC3", 34962, minmax=True)}
            new_attrs["NORMAL"] = out.accessor(np.clip(np.round(nrm * 127), -127, 127).astype(np.int8), 5120, "VEC3", 34962, normalized=True)
            if uv is not None:
                if uv.min() >= 0 and uv.max() <= 1:
                    new_attrs["TEXCOORD_0"] = out.accessor(np.round(uv * 65535).astype(np.uint16), 5123, "VEC2", 34962, normalized=True)
                else:
                    new_attrs["TEXCOORD_0"] = out.accessor(uv, 5126, "VEC2", 34962)
            small = pos.shape[0] <= 65535
            prim["indices"] = out.accessor(idx.astype(np.uint16 if small else np.uint32), 5123 if small else 5125, "SCALAR", 34963)
            prim["attributes"] = new_attrs
    for image in doc.get("images", []):
        view = doc["bufferViews"][image["bufferView"]]
        raw = binary[view.get("byteOffset", 0): view.get("byteOffset", 0) + view["byteLength"]]
        picture = Image.open(io.BytesIO(raw))
        has_alpha = picture.mode in ("RGBA", "LA") and picture.getchannel("A").getextrema()[0] < 255
        if not has_alpha:
            picture = picture.convert("RGB")
            picture.thumbnail((TEXTURE_MAX, TEXTURE_MAX), Image.LANCZOS)
            buffer = io.BytesIO(); picture.save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=False)
            raw, image["mimeType"] = buffer.getvalue(), "image/jpeg"
        image["bufferView"] = out.view(raw)
    doc["bufferViews"], doc["accessors"] = out.views, out.accessors
    doc["buffers"] = [{"byteLength": out.length}]
    for key in ("extensionsUsed", "extensionsRequired"):
        doc[key] = sorted(set(doc.get(key, [])) | {"KHR_mesh_quantization"})
    doc["asset"].setdefault("extras", {})["optimized"] = {"from": SRC.split("/")[-1], "cell_m": CELL_M, "texture_max": TEXTURE_MAX}
    body = json.dumps(doc, separators=(",", ":")).encode()
    body += b" " * ((-len(body)) % 4)
    blob = b"".join(out.chunks); blob += b"\0" * ((-len(blob)) % 4)
    total = 12 + 8 + len(body) + 8 + len(blob)
    with open(DST, "wb") as handle:
        handle.write(struct.pack("<III", 0x46546C67, 2, total))
        handle.write(struct.pack("<II", len(body), 0x4E4F534A)); handle.write(body)
        handle.write(struct.pack("<II", len(blob), 0x004E4942)); handle.write(blob)
    print(f"{SRC} -> {DST}: {before_tris} -> {after_tris} triangles, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
