import * as THREE from "three";
import { DRACOLoader, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import personalizeAvatar from "./personalizeAvatar";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  let disposed = false;
  let model: THREE.Object3D | undefined;
  let timelineCleanup: (() => void) | undefined;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const collectResources = (root: THREE.Object3D) => {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const surfaces = Array.isArray(object.material) ? object.material : [object.material];
      surfaces.forEach((surface) => {
        materials.add(surface);
        Object.values(surface).forEach((value) => {
          if (value instanceof THREE.Texture) textures.add(value);
        });
      });
    });
  };
  const releaseResources = () => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
  };

  const loadCharacter = async () => {
    // The checked-in GLB is identical to the old encrypted copy. Loading it
    // directly avoids blob URLs and makes the user's own asset replaceable.
    const gltf = await loader.loadAsync("/models/character.glb");
    model = gltf.scene;
    collectResources(model);
    if (disposed) {
      releaseResources();
      dracoLoader.dispose();
      return null;
    }
    personalizeAvatar(model);
    collectResources(model);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = !(object instanceof THREE.SkinnedMesh);
    });
    await renderer.compileAsync(model, camera, scene);
    if (disposed) {
      releaseResources();
      dracoLoader.dispose();
      return null;
    }
    const charCleanup = setCharTimeline(model, camera);
    const contentCleanup = setAllTimeline(model);
    timelineCleanup = () => { charCleanup(); contentCleanup(); };
    const footR = model.getObjectByName("footR");
    const footL = model.getObjectByName("footL");
    if (footR) footR.position.y = 3.36;
    if (footL) footL.position.y = 3.36;
    dracoLoader.dispose();
    return gltf;
  };
  const dispose = () => {
    disposed = true;
    timelineCleanup?.();
    (model?.userData.scrollCleanup as (() => void) | undefined)?.();
    (model?.userData.contentScrollCleanup as (() => void) | undefined)?.();
    releaseResources();
    dracoLoader.dispose();
  };
  return { loadCharacter, dispose };
};

export default setCharacter;
