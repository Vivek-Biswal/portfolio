import * as THREE from "three";
import { createSweptHair } from "./createSweptHair";
import { createSmileDeformation, createSmileMeshes } from "./createAvatarSmile";
import { createEyeSocketMask } from "./createEyeSocketMask";

/** Portrait-led proportions, retaining the original animation rig. */
export const avatarAppearance = {
  skin: "#a16e50",
  lips: "#87523f",
  hair: "#17171c",
  iris: "#38261e",
  shirt: "#19191e",
  trousers: "#303038",
  shoes: "#e8dfcc",
};

/** Transform base vertices and morph endpoints together, preserving blink deltas. */
function sculptGeometry(source: THREE.BufferGeometry, sculpt: (point: THREE.Vector3, index: number) => THREE.Vector3) {
  const geometry = source.clone();
  const original = source.getAttribute("position");
  const position = geometry.getAttribute("position");
  const base = new THREE.Vector3();
  const target = new THREE.Vector3();
  const endpoint = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    base.fromBufferAttribute(original, i);
    sculpt(target.copy(base), i);
    position.setXYZ(i, target.x, target.y, target.z);
    geometry.morphAttributes.position?.forEach((attribute, morphIndex) => {
      endpoint.fromBufferAttribute(source.morphAttributes.position[morphIndex], i);
      if (geometry.morphTargetsRelative) {
        sculpt(endpoint.add(base), i).sub(target);
      } else {
        sculpt(endpoint, i);
      }
      attribute.setXYZ(i, endpoint.x, endpoint.y, endpoint.z);
    });
  }
  geometry.computeVertexNormals();
  // The original morph normals describe the unedited face. Rebuild each
  // endpoint so blinking uses the same smooth surface as the resting pose.
  const baseNormal = geometry.getAttribute("normal");
  if (geometry.morphAttributes.position?.length) {
    geometry.morphAttributes.normal = geometry.morphAttributes.position.map((morph) => {
      const posed = new THREE.BufferGeometry();
      posed.setIndex(geometry.index);
      const posedPositions = new THREE.Float32BufferAttribute(new Float32Array(position.count * 3), 3);
      for (let i = 0; i < position.count; i++) {
        endpoint.fromBufferAttribute(morph, i);
        if (geometry.morphTargetsRelative) endpoint.add(base.fromBufferAttribute(position, i));
        posedPositions.setXYZ(i, endpoint.x, endpoint.y, endpoint.z);
      }
      posed.setAttribute("position", posedPositions);
      posed.computeVertexNormals();
      const normal = posed.getAttribute("normal").clone();
      if (geometry.morphTargetsRelative) {
        for (let i = 0; i < normal.count; i++) {
          normal.setXYZ(i, normal.getX(i) - baseNormal.getX(i),
            normal.getY(i) - baseNormal.getY(i), normal.getZ(i) - baseNormal.getZ(i));
        }
      }
      posed.dispose();
      return normal;
    });
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export default function personalizeAvatar(character: THREE.Object3D) {
  const head = character.getObjectByName("spine006");
  const face = character.getObjectByName("Plane007");
  const eyes = character.getObjectByName("EYEs001");
  if (!head || !(face instanceof THREE.Mesh) || !(eyes instanceof THREE.Mesh)) {
    throw new Error("This avatar needs the included head rig and facial meshes.");
  }

  const ownedMaterials = new Set<THREE.Material>();
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  // Fine, low-amplitude skin grain breaks up perfectly uniform highlights.
  // A deterministic tile keeps StrictMode remounts and builds visually stable.
  const grain = new Uint8Array(64 * 64);
  let seed = 173;
  for (let i = 0; i < grain.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    grain[i] = 96 + ((seed >>> 24) >> 2);
  }
  const skinGrain = new THREE.DataTexture(grain, 64, 64, THREE.RedFormat);
  skinGrain.wrapS = skinGrain.wrapT = THREE.RepeatWrapping;
  skinGrain.repeat.set(32, 32);
  skinGrain.magFilter = THREE.LinearFilter;
  skinGrain.minFilter = THREE.LinearMipmapLinearFilter;
  skinGrain.generateMipmaps = true;
  skinGrain.needsUpdate = true;
  const material = (color: string, roughness = 0.57) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    ownedMaterials.add(result);
    return result;
  };
  const skin = material(avatarAppearance.skin);
  skin.bumpMap = skinGrain;
  skin.bumpScale = 0.0015;
  const hairMaterial = material(avatarAppearance.hair, 0.78);
  const skinNames = new Set(["Plane007", "Ear001", "Hand", "Neck"]);
  character.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (skinNames.has(object.name)) object.material = skin;
    if (object.name === "BODYSHIRT") object.material = material(avatarAppearance.shirt, 0.95);
    if (object.name === "Pant") object.material = material(avatarAppearance.trousers, 0.95);
    if (object.name === "Shoe") object.material = material(avatarAppearance.shoes, 0.82);
    if (object.name === "Sole") object.material = material("#f1e8d7", 0.9);
    if (object.name === "hair" || object.name === "Eyebrow") object.material = hairMaterial;
  });

  const smile = createSmileDeformation(face.geometry);
  const eyeSocketMask = createEyeSocketMask(face.geometry);
  const geometry = sculptGeometry(face.geometry, (point, index) => {
    const originalX = point.x;
    const originalY = point.y;
    // Gently tapered temples and jaw, with broad cheekbones and a squared chin.
    const cheek = Math.exp(-(((originalY - 13.02) / 0.28) ** 2));
    const jaw = Math.exp(-(((originalY - 12.3) / 0.26) ** 2));
    const temple = Math.exp(-(((originalY - 13.68) / 0.26) ** 2));
    const outer = THREE.MathUtils.smoothstep(Math.abs(originalX), 0.38, 0.73);
    point.x *= 1 + cheek * outer * 0.025 - jaw * outer * 0.09 - temple * 0.025;
    point.y += (1 - THREE.MathUtils.smoothstep(originalY, 12.04, 12.39)) * 0.055;

    // Narrow the socket and globe together instead of raising the upper lids.
    // Follow the actual eyelid boundary. A wide spatial mask also pulled the
    // nose walls outward and left a box-shaped tip between the two eye sockets.
    const eyeMask = eyeSocketMask[index];
    const eyeCenterX = originalX < 0 ? -0.430126 : 0.430126;
    point.x += (eyeCenterX + (originalX - eyeCenterX) * 0.73 - originalX) * eyeMask;
    point.y += ((originalY - 13.248198) * -0.48 + 0.012) * eyeMask;
    // A modest resting lid lift adds the reference's friendly expression.
    // Closed blink endpoints sit below this mask, so they still meet the lower lid.
    const upperLid = eyeMask * Math.exp(-(((Math.abs(originalX) - 0.43) / 0.20) ** 2))
      * THREE.MathUtils.smoothstep(originalY, 13.19, 13.36)
      * (1 - THREE.MathUtils.smoothstep(originalY, 13.46, 13.62))
      * THREE.MathUtils.smoothstep(point.z, 0.70, 0.84);
    point.y += 0.05 * upperLid;

    // Reduce the bulbous nose while retaining its authored topology.
    const nose = Math.exp(-(((originalY - 12.98) / 0.25) ** 2) - ((originalX / 0.25) ** 2))
      * THREE.MathUtils.smoothstep(point.z, 0.78, 1.03);
    const alar = Math.exp(-(((originalY - 12.87) / 0.12) ** 2));
    point.x *= 1 + nose * (0.05 + 0.14 * alar);
    point.z -= nose * 0.065;
    return smile.deform(point, index);
  });
  ownedGeometries.add(geometry);
  const faceMaterial = material(avatarAppearance.skin);
  faceMaterial.bumpMap = skinGrain;
  faceMaterial.bumpScale = 0.0015;
  faceMaterial.vertexColors = true;
  const position = geometry.getAttribute("position");
  const faceColors = new THREE.Float32BufferAttribute(new Float32Array(position.count * 3), 3);
  const lip = new THREE.Color(avatarAppearance.lips);
  const skinColor = new THREE.Color(avatarAppearance.skin);
  for (let i = 0; i < position.count; i++) {
    const weight = smile.lipWeight(i) * 0.48;
    faceColors.setXYZ(i,
      THREE.MathUtils.lerp(1, lip.r / skinColor.r, weight),
      THREE.MathUtils.lerp(1, lip.g / skinColor.g, weight),
      THREE.MathUtils.lerp(1, lip.b / skinColor.b, weight));
  }
  geometry.setAttribute("color", faceColors);
  face.geometry = geometry;
  face.material = faceMaterial;

  const ears = character.getObjectByName("Ear001");
  if (ears instanceof THREE.Mesh) {
    const earGeometry = sculptGeometry(ears.geometry, (point) => {
      const attachment = point.x < 0 ? -1.02 : 1.02;
      point.x = attachment + (point.x - attachment) * 0.75;
      point.y = 13.2 + (point.y - 13.2) * 0.85;
      point.z *= 0.93;
      return point;
    });
    ownedGeometries.add(earGeometry);
    ears.geometry = earGeometry;
  }

  const eyebrows = character.getObjectByName("Eyebrow");
  if (eyebrows instanceof THREE.Mesh) {
    const browGeometry = sculptGeometry(eyebrows.geometry, (point) => {
      const arch = Math.sin(THREE.MathUtils.clamp(Math.abs(point.x) / 0.78, 0, 1) * Math.PI);
      const outer = THREE.MathUtils.smoothstep(Math.abs(point.x), 0.5, 0.83);
      point.y = 13.55 + (point.y - 13.62) * (0.75 - outer * 0.26) + arch * 0.06;
      point.z -= 0.014;
      return point;
    });
    ownedGeometries.add(browGeometry);
    eyebrows.geometry = browGeometry;
  }

  const eyeGeometry = sculptGeometry(eyes.geometry, (point) => {
    const centerX = point.x < 0 ? -0.430126 : 0.430126;
    point.x = centerX + (point.x - centerX) * 0.73;
    point.y = 13.248198 + (point.y - 13.248198) * 0.66 + 0.012;
    return point;
  });
  ownedGeometries.add(eyeGeometry);
  eyes.geometry = eyeGeometry;
  // Preserve the source UV atlas while replacing its painted half-closed eyes.
  const eyeMaterial = (Array.isArray(eyes.material) ? eyes.material[0] : eyes.material).clone();
  if (eyeMaterial instanceof THREE.MeshStandardMaterial) {
    eyeMaterial.roughness = 0.29;
    eyeMaterial.metalness = 0;
  }
  ownedMaterials.add(eyeMaterial);
  const irisColor = new THREE.Color(avatarAppearance.iris).toArray().join(", ");
  eyeMaterial.onBeforeCompile = (shader: { fragmentShader: string }) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
       #ifdef USE_MAP
         bool avatarLeftAtlas = vMapUv.x < 0.5;
         vec2 avatarIrisCenter = avatarLeftAtlas ? vec2(0.177940, 0.639823) : vec2(0.799723, 0.620400);
         float avatarAtlasRadius = avatarLeftAtlas ? 0.2047 : 0.18055;
         vec2 avatarIrisUv = (vMapUv - avatarIrisCenter) / avatarAtlasRadius;
         float avatarRadius = length(avatarIrisUv);
         float avatarAngle = atan(avatarIrisUv.y, avatarIrisUv.x + 0.000001);
         float avatarFibres = 0.94 + 0.06 * sin(avatarAngle * 42.0 + avatarRadius * 28.0);
         vec3 avatarIris = vec3(${irisColor}) * avatarFibres;
         float avatarIrisMask = 1.0 - smoothstep(0.88, 0.92, avatarRadius);
         float avatarPupilMask = 1.0 - smoothstep(0.34, 0.38, avatarRadius);
         diffuseColor.rgb = mix(vec3(0.88, 0.86, 0.82), avatarIris, avatarIrisMask);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.003, 0.002, 0.001), avatarPupilMask);
       #endif`,
    );
  };
  eyeMaterial.customProgramCacheKey = () => `personal-avatar-portrait-v5-${avatarAppearance.iris}`;
  eyes.material = eyeMaterial;
  eyes.userData.interaction = "eye";

  const portraitProportion = (point: THREE.Vector3) => {
    point.x *= 0.89;
    point.y = 12.02 + (point.y - 12.02) * 1.035;
    return point;
  };
  for (const mesh of [face, eyes, ears, eyebrows]) {
    if (!(mesh instanceof THREE.Mesh)) continue;
    const previous = mesh.geometry;
    mesh.geometry = sculptGeometry(previous, portraitProportion);
    ownedGeometries.add(mesh.geometry);
    ownedGeometries.delete(previous);
    previous.dispose();
  }

  const details = new THREE.Group();
  details.name = "avatarPersonalDetails";
  character.updateMatrixWorld(true);
  const inverseHead = head.matrixWorld.clone().invert();
  const ownedMeshes: THREE.Mesh[] = [];
  // These helpers are measured in bind coordinates; convert their group once.
  for (const group of [createSweptHair(), createSmileMeshes()]) {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const previous = object.geometry;
      object.geometry = sculptGeometry(previous, portraitProportion);
      previous.dispose();
    });
    group.applyMatrix4(inverseHead);
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      ownedMeshes.push(object);
      ownedGeometries.add(object.geometry);
      const surfaces = Array.isArray(object.material) ? object.material : [object.material];
      surfaces.forEach((surface) => ownedMaterials.add(surface));
      object.castShadow = true;
      // Broad overlapping hair waves need a clean surface, without shadow seams.
      object.receiveShadow = !object.name.startsWith("avatarHair");
    });
    details.add(group);
  }
  const originalHair = character.getObjectByName("hair");
  if (originalHair) originalHair.visible = false;
  head.add(details);
  character.userData.avatar = {
    kind: "portrait-reference-stylized-avatar",
    reference: "/0d/portrait.jpg",
    details: ownedMeshes,
    dispose: () => {
      skinGrain.dispose();
      ownedMaterials.forEach((item) => item.dispose());
      ownedGeometries.forEach((item) => item.dispose());
    },
  };
}
