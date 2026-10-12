import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ts from "typescript";

// Offline geometry verification only. Textures are placeholders, and no WebGL
// renderer or screenshots are involved in these assertions.
globalThis.self ??= globalThis;
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = path.join(workspace, "tmp");
await fs.mkdir(temporary, { recursive: true });
const sourcePath = path.join(workspace, "src/components/Character/utils/personalizeAvatar.ts");
// Emit the local avatar helpers using the same relative module layout. This
// exercises the browser implementation offline without adding a TS loader.
const emittedModules = new Map();
const emitModule = async (file) => {
  if (emittedModules.has(file)) return emittedModules.get(file);
  const output = path.join(temporary, "avatar-source", path.relative(workspace, file).replace(/\.tsx?$/, ".mjs"));
  emittedModules.set(file, output);
  const source = await fs.readFile(file, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => workspace,
    getNewLine: () => "\n",
  }));
  let code = transpiled.outputText;
  for (const match of [...code.matchAll(/\bfrom\s*(["'])(\.{1,2}\/[^"']+)\1/g)]) {
    const requested = path.resolve(path.dirname(file), match[2]);
    const dependency = /\.tsx?$/.test(requested) ? requested : `${requested}.ts`;
    const emittedDependency = await emitModule(dependency);
    let relative = path.relative(path.dirname(output), emittedDependency).replaceAll(path.sep, "/");
    if (!relative.startsWith(".")) relative = `./${relative}`;
    code = code.replace(match[0], `from ${match[1]}${relative}${match[1]}`);
  }
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, code);
  return output;
};
const modulePath = await emitModule(sourcePath);
const { default: personalizeAvatar, avatarAppearance } = await import(pathToFileURL(modulePath).href);

const loader = new GLTFLoader();
loader.register((parser) => ({
  name: "EXT_texture_webp",
  loadTexture(index) {
    const texture = new THREE.Texture();
    texture.name = `offline-placeholder-${index}`;
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    const textureDefinition = parser.json.textures[index];
    texture.userData.gltfSource = textureDefinition.extensions?.EXT_texture_webp?.source ?? textureDefinition.source;
    return Promise.resolve(texture);
  },
}));
const bytes = await fs.readFile(path.join(workspace, "public/models/character.glb"));
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
const character = gltf.scene;
const face = character.getObjectByName("Plane007");
const head = character.getObjectByName("spine006");
const eyes = character.getObjectByName("EYEs001");
const shirt = character.getObjectByName("BODYSHIRT");
assert.ok(face?.isSkinnedMesh, "Expected the original rigged facial mesh.");
assert.ok(head?.isBone, "Expected the original head bone.");
assert.ok(eyes?.isSkinnedMesh, "Expected rigged eyeballs.");
assert.ok(shirt?.isSkinnedMesh, "Expected the original rigged shirt.");
const originalFace = face.geometry;
const originalBodyGeometry = shirt.geometry;
const originalEyesGeometry = eyes.geometry;
const originalEyesSkeleton = eyes.skeleton;
const originalSkin = face.skeleton;
const originalMorphCount = originalFace.morphAttributes.position.length;
const originalNames = gltf.animations.map((clip) => clip.name);
for (const name of ["introAnimation", "typing", "browup", "angry", "Blink", "key1", "key2", "key5", "key6"]) {
  assert.ok(originalNames.includes(name), `Missing source animation ${name}.`);
}

personalizeAvatar(character);
assert.notEqual(face.geometry, originalFace, "Sculpt should own a geometry clone.");
assert.equal(face.geometry.getAttribute("position").count, originalFace.getAttribute("position").count,
  "Sculpt must preserve facial topology.");
assert.equal(face.geometry.morphAttributes.position.length, originalMorphCount, "Blink morph targets must survive.");
assert.equal(originalMorphCount, 3, "Expected the source's three facial morph targets.");
assert.equal(face.geometry.morphTargetsRelative, originalFace.morphTargetsRelative, "Morph representation must survive.");
const baseFaceNormals = face.geometry.getAttribute("normal");
const faceMorphNormals = face.geometry.morphAttributes.normal ?? [];
assert.equal(faceMorphNormals.length, originalMorphCount, "Each facial position morph needs its regenerated normal endpoint.");
assert.equal(baseFaceNormals.count, face.geometry.getAttribute("position").count, "Base normals must match facial topology.");
const normalEndpointCheck = { verticesPerEndpoint: baseFaceNormals.count, largestBaseUnitError: 0, morphs: [] };
const normalSample = new THREE.Vector3();
for (let index = 0; index < baseFaceNormals.count; index++) {
  normalSample.fromBufferAttribute(baseFaceNormals, index);
  assert.ok(normalSample.toArray().every(Number.isFinite), `Base face normal ${index} must be finite.`);
  const error = Math.abs(normalSample.length() - 1);
  assert.ok(error < 1e-3, `Base face normal ${index} must be normalized, error ${error}.`);
  normalEndpointCheck.largestBaseUnitError = Math.max(normalEndpointCheck.largestBaseUnitError, error);
}
for (let morphIndex = 0; morphIndex < faceMorphNormals.length; morphIndex++) {
  const endpoint = faceMorphNormals[morphIndex];
  assert.equal(endpoint.count, baseFaceNormals.count, "Morph normals must match facial topology.");
  let largestUnitError = 0;
  for (let index = 0; index < endpoint.count; index++) {
    normalSample.fromBufferAttribute(endpoint, index);
    if (face.geometry.morphTargetsRelative) normalSample.add(new THREE.Vector3().fromBufferAttribute(baseFaceNormals, index));
    assert.ok(normalSample.toArray().every(Number.isFinite), `Face morph normal ${morphIndex}/${index} must be finite.`);
    const error = Math.abs(normalSample.length() - 1);
    assert.ok(error < 1e-3, `Face morph normal ${morphIndex}/${index} endpoint must be normalized, error ${error}.`);
    largestUnitError = Math.max(largestUnitError, error);
  }
  normalEndpointCheck.morphs.push({ morphIndex, largestUnitError });
}
assert.equal(face.skeleton, originalSkin, "Sculpt must preserve the animation skeleton.");
assert.equal(shirt.geometry, originalBodyGeometry, "Default outfit geometry must stay intact.");
assert.equal(eyes.geometry.getAttribute("position").count, originalEyesGeometry.getAttribute("position").count,
  "Eye sculpt must preserve its rigged topology.");
assert.equal(eyes.skeleton, originalEyesSkeleton, "Eye sculpt must preserve its skeleton.");
assert.deepEqual(Array.from(eyes.geometry.getAttribute("uv").array), Array.from(originalEyesGeometry.getAttribute("uv").array),
  "Eye sculpt must retain the atlas UVs.");
assert.notEqual(face.material, shirt.material, "Skin recolor must not recolor the shirt.");
assert.equal(character.getObjectByName("avatarPersonalDetails")?.parent, head,
  "Personal details must follow the animated head bone.");
assert.equal(eyes.userData.interaction, "eye", "Eye must be marked for click interaction.");
const editedPosition = face.geometry.getAttribute("position");
const originalPosition = originalFace.getAttribute("position");
let changedVertices = 0;
for (let index = 0; index < editedPosition.count; index++) {
  if (Math.abs(editedPosition.getX(index) - originalPosition.getX(index)) > 1e-6
      || Math.abs(editedPosition.getY(index) - originalPosition.getY(index)) > 1e-6
      || Math.abs(editedPosition.getZ(index) - originalPosition.getZ(index)) > 1e-6) changedVertices++;
}
assert.ok(changedVertices > 50, "Personalization must actually sculpt the face.");

// Compare authored landmarks and rendered components with the pixel brief.
// These sample actual asset rims, rather than repeating deformation masks.
assert.ok(character.userData.avatar.details.every((mesh) => !/moustache|beard|stubble/i.test(mesh.name)),
  "The personalized avatar must be clean-shaven.");
character.traverse((object) => {
  assert.ok(!(/avatarCap/i.test(object.name) && object.visible), "No cap should be visible.");
});
const faceRevisionCheck = { cleanShaven: true, capRemoved: true, eyelids: [], smile: [] };
for (const { side, upperFront, upperBack, lower } of [
  { side: -1, upperFront: 27, upperBack: 222, lower: 236 },
  { side: 1, upperFront: 297, upperBack: 471, lower: 485 },
]) {
  const morphIndex = face.morphTargetDictionary[side < 0 ? "Key 2" : "eyeL_100"];
  const editedMorph = face.geometry.morphAttributes.position[morphIndex];
  const originalAperture = originalPosition.getY(upperFront) - originalPosition.getY(lower);
  const restingAperture = editedPosition.getY(upperFront) - editedPosition.getY(lower);
  const closedUpperY = editedPosition.getY(upperBack) + editedMorph.getY(upperBack);
  const closedLowerY = editedPosition.getY(lower) + editedMorph.getY(lower);
  const closedGap = closedUpperY - closedLowerY;
  const closingDistance = -editedMorph.getY(upperBack);
  assert.ok(restingAperture > 0.14 && restingAperture < originalAperture,
    `Eye side ${side} should have an almond aperture smaller than the original globe.`);
  assert.ok(Math.abs(closedGap) < 0.055, `Eye side ${side} lids should still meet during a full blink.`);
  assert.ok(closingDistance > 0.12, `Eye side ${side} should move through a complete blink.`);
  faceRevisionCheck.eyelids.push({ side, originalAperture, restingAperture, closedGap, closingDistance });
}
const upperMouth = editedPosition.getY(984);
const lowerMouth = editedPosition.getY(992);
const smileOpening = upperMouth - lowerMouth;
assert.ok(smileOpening > 0.14 && smileOpening < 0.30, "The real mouth rim must form an open grin.");
for (const corner of [256, 504]) {
  const cornerLift = editedPosition.getY(corner) - upperMouth;
  assert.ok(cornerLift > 0.035, "Smile corners should rise above the center of the upper lip.");
  faceRevisionCheck.smile.push({ corner, cornerLift });
}
const smileTeeth = character.getObjectByName("avatarSmileTeeth");
const mouthCavity = character.getObjectByName("avatarMouthCavity");
assert.ok(smileTeeth?.isMesh && mouthCavity?.isMesh, "The open smile needs visible native teeth and an inner mouth.");
smileTeeth.geometry.computeBoundingBox();
const teethSize = smileTeeth.geometry.boundingBox.getSize(new THREE.Vector3());
assert.ok(teethSize.z > 0.03 && teethSize.x > 0.6 && teethSize.y > 0.06,
  "Teeth must be a curved three-dimensional volume, including in a side view.");
faceRevisionCheck.smileOpening = smileOpening;
faceRevisionCheck.teethSize = teethSize.toArray();

// The new visible hairstyle replaces the source hair and has a real swept
// silhouette. Its vertices are attached to the animated head, not to the page.
character.updateMatrixWorld(true);
const sweptHair = character.getObjectByName("avatarHairSweptStyle");
assert.ok(sweptHair?.isGroup && sweptHair.visible, "Expected a visible swept hairstyle.");
assert.equal(character.getObjectByName("hair").visible, false, "Original hair must not overlap the new hairstyle.");
const hairBounds = new THREE.Box3().setFromObject(sweptHair);
const hairSize = hairBounds.getSize(new THREE.Vector3());
assert.ok(hairSize.x > 1.7 && hairSize.x < 2.6 && hairSize.y > 1.1 && hairSize.y < 2.0,
  "Short swept hair should fit the portrait head proportions.");
const hairCheck = { visibleSweptHair: true, originalHairHidden: true, bounds: { min: hairBounds.min.toArray(), max: hairBounds.max.toArray() } };
const wardrobeCheck = {};
for (const [name, color] of [["Plane007", avatarAppearance.skin], ["Hand", avatarAppearance.skin],
  ["BODYSHIRT", avatarAppearance.shirt], ["Pant", avatarAppearance.trousers], ["Shoe", avatarAppearance.shoes]]) {
  const object = character.getObjectByName(name);
  const expected = new THREE.Color(color).getHexString();
  assert.equal(object.material.color.getHexString(), expected, `${name} should use its independent reference color.`);
  wardrobeCheck[name] = `#${expected}`;
}

const initialTransforms = [];
character.traverse((object) => {
  initialTransforms.push({ object, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone(),
    morphs: object.morphTargetInfluences?.slice() });
});
const mixer = new THREE.AnimationMixer(character);
const reset = () => {
  mixer.stopAllAction();
  mixer.setTime(0);
  for (const item of initialTransforms) {
    item.object.position.copy(item.position);
    item.object.quaternion.copy(item.quaternion);
    item.object.scale.copy(item.scale);
    if (item.morphs) item.object.morphTargetInfluences.splice(0, item.morphs.length, ...item.morphs);
  }
  character.updateMatrixWorld(true);
};
const vertex = new THREE.Vector3();
const verifyFinite = (label) => {
  // Run the same optional appearance hook as Scene after an animation sample.
  character.userData.avatar.update?.(0, mixer.time);
  character.updateMatrixWorld(true);
  let vertexCount = 0;
  character.traverse((object) => {
    assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${label}: invalid matrix on ${object.name}.`);
    if (!object.isMesh) return;
    if (object.isSkinnedMesh) object.skeleton.update();
    for (const [attributeName, attribute] of Object.entries(object.geometry.attributes)) {
      assert.ok(Array.from(attribute.array).every(Number.isFinite), `${label}: invalid ${attributeName} on ${object.name}.`);
    }
    for (const attribute of object.geometry.morphAttributes.position ?? []) {
      assert.ok(Array.from(attribute.array).every(Number.isFinite), `${label}: invalid morph on ${object.name}.`);
    }
    const position = object.geometry.getAttribute("position");
    for (let index = 0; index < position.count; index++) {
      object.getVertexPosition(index, vertex).applyMatrix4(object.matrixWorld);
      assert.ok(vertex.toArray().every(Number.isFinite), `${label}: invalid posed vertex ${index} on ${object.name}.`);
      vertexCount++;
    }
  });
  return vertexCount;
};
verifyFinite("rest pose");
const clipResults = [];
for (const clip of gltf.animations) {
  reset();
  const action = mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  let count = 0;
  for (let sample = 0; sample <= 4; sample++) {
    mixer.setTime(clip.duration * sample / 4);
    count = verifyFinite(`${clip.name} at ${sample}/4`);
  }
  clipResults.push({ name: clip.name, duration: clip.duration, verticesVerified: count, samples: 5 });
}
reset();
const intro = gltf.animations.find((clip) => clip.name === "introAnimation");
const introAction = mixer.clipAction(intro).reset().setLoop(THREE.LoopOnce, 1);
introAction.clampWhenFinished = true;
introAction.play();
mixer.update(intro.duration);
head.rotation.x = -0.26;
verifyFinite("export pose");

// Verify the actual skinned eye triangles can receive a click ray from the
// same camera used by Scene.tsx. This does not substitute for a browser test.
eyes.skeleton.update();
eyes.computeBoundingSphere();
eyes.computeBoundingBox();
const clickCamera = new THREE.PerspectiveCamera(14.5, 1440 / 900, 0.1, 1000);
clickCamera.position.set(0, 13.1, 24.7);
clickCamera.zoom = 1.1;
clickCamera.updateProjectionMatrix();
clickCamera.updateMatrixWorld(true);
const clickRay = new THREE.Raycaster();
const eyeRaycastChecks = [];
for (const side of [-1, 1]) {
  const center = new THREE.Vector3();
  let count = 0;
  const positions = eyes.geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    if (Math.sign(positions.getX(index)) !== side) continue;
    eyes.getVertexPosition(index, vertex).applyMatrix4(eyes.matrixWorld);
    center.add(vertex);
    count++;
  }
  assert.ok(count > 0, `Expected vertices for eye side ${side}.`);
  center.divideScalar(count);
  const projected = center.clone().project(clickCamera);
  assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1,
    `Eye side ${side} must be visible in the initial scene camera.`);
  clickRay.setFromCamera(new THREE.Vector2(projected.x, projected.y), clickCamera);
  const hits = clickRay.intersectObject(eyes, false);
  assert.ok(hits.length > 0, `A click ray must hit eye side ${side}.`);
  assert.equal(hits[0].object, eyes, "Ray must hit the skinned eye mesh.");
  const nearestCenterDistance = hits.reduce((distance, hit) => Math.min(distance, hit.point.distanceTo(center)), Infinity);
  assert.ok(nearestCenterDistance < 0.5, `Eye side ${side} ray should hit its local eyeball surface.`);
  eyeRaycastChecks.push({ side, ndc: projected.toArray(), intersections: hits.length,
    closestSurfaceDistance: nearestCenterDistance });
}

// Rigid details must move by exactly the same world transform as the head,
// while face/eyes continue to use their authored skeleton.
const originalHeadQuaternion = head.quaternion.clone();
const headBeforeInverse = head.matrixWorld.clone().invert();
const personalDetails = character.userData.avatar.details;
const detailBefore = personalDetails.map((mesh) => ({
  mesh,
  matrix: mesh.matrixWorld.clone(),
  vertex: mesh.getVertexPosition(0, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),
}));
head.rotation.y += 0.4;
character.updateMatrixWorld(true);
const headDelta = head.matrixWorld.clone().multiply(headBeforeInverse);
let largestDetailDisplacement = 0;
let largestDetailMatrixError = 0;
for (const before of detailBefore) {
  const expected = headDelta.clone().multiply(before.matrix);
  const error = Math.max(...expected.elements.map((value, index) => Math.abs(value - before.mesh.matrixWorld.elements[index])));
  assert.ok(error < 1e-6, `${before.mesh.name} must follow the head's complete world transform.`);
  largestDetailMatrixError = Math.max(largestDetailMatrixError, error);
  const after = before.mesh.getVertexPosition(0, new THREE.Vector3()).applyMatrix4(before.mesh.matrixWorld);
  largestDetailDisplacement = Math.max(largestDetailDisplacement, before.vertex.distanceTo(after));
}
assert.ok(largestDetailDisplacement > 0.1, "A head turn must visibly move the personal details.");
head.quaternion.copy(originalHeadQuaternion);
character.updateMatrixWorld(true);
eyes.skeleton.update();
eyes.computeBoundingSphere();
eyes.computeBoundingBox();
const detailTransformCheck = { meshesVerified: personalDetails.length, yawChange: 0.4,
  largestDetailDisplacement, largestDetailMatrixError, exportPoseRestored: true };

// Match Three's morph-normal and skin-normal shader path. Recomputing normals
// from posed triangles would discard the sculpt's authored smoothing across
// duplicate vertices and make the CPU preview falsely show face seams.
const skinNormal = new THREE.Vector4();
const normalInfluence = new THREE.Vector4();
const normalBoneMatrix = new THREE.Matrix4();
const morphNormal = new THREE.Vector3();
const exportNormal = (object, index, target) => {
  const geometry = object.geometry;
  const normal = geometry.getAttribute("normal");
  assert.ok(normal, `Expected render normals on ${object.name}.`);
  target.fromBufferAttribute(normal, index);
  const morphNormals = geometry.morphAttributes.normal ?? [];
  if (morphNormals.length && object.morphTargetInfluences) {
    if (!geometry.morphTargetsRelative) {
      const total = morphNormals.reduce((sum, _, morphIndex) => sum + (object.morphTargetInfluences[morphIndex] ?? 0), 0);
      target.multiplyScalar(1 - total);
    }
    for (let morphIndex = 0; morphIndex < morphNormals.length; morphIndex++) {
      const influence = object.morphTargetInfluences[morphIndex] ?? 0;
      if (!influence) continue;
      target.addScaledVector(morphNormal.fromBufferAttribute(morphNormals[morphIndex], index), influence);
    }
  }
  if (object.isSkinnedMesh) {
    const skinIndex = geometry.getAttribute("skinIndex");
    const skinWeight = geometry.getAttribute("skinWeight");
    skinNormal.set(target.x, target.y, target.z, 0).applyMatrix4(object.bindMatrix);
    normalInfluence.set(0, 0, 0, 0);
    for (let component = 0; component < 4; component++) {
      const weight = skinWeight.getComponent(index, component);
      if (!weight) continue;
      const boneIndex = skinIndex.getComponent(index, component);
      normalBoneMatrix.fromArray(object.skeleton.boneMatrices, boneIndex * 16);
      const influence = skinNormal.clone().applyMatrix4(normalBoneMatrix);
      normalInfluence.addScaledVector(influence, weight);
    }
    normalInfluence.applyMatrix4(object.bindMatrixInverse);
    target.set(normalInfluence.x, normalInfluence.y, normalInfluence.z);
  }
  return target;
};
const meshes = [];
character.traverse((object) => {
  if (!object.isMesh) return;
  const geometry = object.geometry;
  const positions = [];
  const normals = [];
  const exportedNormal = new THREE.Vector3();
  const worldNormalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
  if (object.isSkinnedMesh) object.skeleton.update();
  const originalPosition = geometry.getAttribute("position");
  for (let index = 0; index < originalPosition.count; index++) {
    object.getVertexPosition(index, vertex).applyMatrix4(object.matrixWorld);
    positions.push(...vertex.toArray());
    exportNormal(object, index, exportedNormal).applyMatrix3(worldNormalMatrix).normalize();
    assert.ok(exportedNormal.toArray().every(Number.isFinite), `Invalid posed normal ${index} on ${object.name}.`);
    normals.push(...exportedNormal.toArray());
  }
  const indices = geometry.index ? Array.from(geometry.index.array)
    : Array.from({ length: originalPosition.count }, (_, index) => index);
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: indices.length, materialIndex: 0 }];
  const colors = geometry.getAttribute("color");
  const uv = geometry.getAttribute("uv");
  const normalizedColors = [];
  if (colors) {
    for (let index = 0; index < colors.count; index++) {
      normalizedColors.push(colors.getX(index), colors.getY(index), colors.getZ(index));
      if (colors.itemSize === 4) normalizedColors.push(colors.getW(index));
    }
  }
  for (const group of groups) {
    const material = materials[group.materialIndex ?? 0];
    if (!material) continue;
    meshes.push({ name: object.name, parent: object.parent?.name, visible: object.visible, skin: object.isSkinnedMesh,
      positions, normals, indices: indices.slice(group.start, group.start + group.count),
      colors: normalizedColors, colorComponents: colors?.itemSize ?? 0,
      uvs: uv ? Array.from(uv.array) : [], materialName: material.name,
      materialHex: material.color ? `#${material.color.getHexString()}` : "#ffffff",
      materialLinear: material.color ? [...material.color.toArray(), material.opacity] : [1, 1, 1, material.opacity],
      materialType: material.type,
      roughness: material.roughness,
      metalness: material.metalness,
      envMapIntensity: material.envMapIntensity,
      emissiveLinear: material.emissive?.toArray(),
      emissiveIntensity: material.emissiveIntensity,
      normalScale: material.normalScale?.toArray(),
      flatShading: material.flatShading,
      opacity: material.opacity, textureSource: material.map?.userData.gltfSource,
    });
  }
});
const outputPath = path.join(temporary, "model-personalized-meshes.json");
const eyeTextureSource = eyes.material.map?.userData.gltfSource;
let eyeTexturePath;
if (eyeTextureSource !== undefined) {
  const imageDefinition = gltf.parser.json.images[eyeTextureSource];
  if (imageDefinition.bufferView !== undefined) {
    eyeTexturePath = path.join(temporary, "model-eye-texture.webp");
    const imageBytes = await gltf.parser.getDependency("bufferView", imageDefinition.bufferView);
    await fs.writeFile(eyeTexturePath, Buffer.from(imageBytes));
  }
}
await fs.writeFile(outputPath, JSON.stringify({
  coordinateSpace: "world posed; intro final frame and head.rotation.x=-0.26",
  texturesAreOfflinePlaceholders: true,
  normalsUseGeometryMorphAndSkinTransforms: true,
  avatarAppearance,
  eyeTexturePath,
  meshes,
  headBoneWorldMatrix: head.matrixWorld.elements,
  headBoneInverseMatrix: head.matrixWorld.clone().invert().elements,
}));
const report = { assertionsPassed: true, geometryOnly: true, textureAndWebGLRenderingVerified: false,
  changedFaceVertices: changedVertices, preservedFaceVertices: editedPosition.count, preservedMorphTargets: originalMorphCount,
  originalClipNames: originalNames, headBone: head.name, detailsParent: character.getObjectByName("avatarPersonalDetails").parent.name,
  clips: clipResults, faceRevisionCheck, normalEndpointCheck, hairCheck, wardrobeCheck, eyeRaycastChecks, detailTransformCheck,
  exportedMeshPrimitives: meshes.length, outputPath, eyeTexturePath };
await fs.writeFile(path.join(temporary, "avatar-verification.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
