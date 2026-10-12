import * as THREE from "three";
import { RGBELoader } from "three-stdlib";
import { gsap } from "gsap";

const setLighting = (scene: THREE.Scene) => {
  let disposed = false;
  let lightsOn = false;
  let environmentTexture: THREE.DataTexture | undefined;
  const previousEnvironment = scene.environment;
  const previousIntensity = scene.environmentIntensity;
  const previousRotation = scene.environmentRotation.clone();
  const animationContext = gsap.context(() => {});

  const directionalLight = new THREE.DirectionalLight(0xc7a9ff, 0);
  directionalLight.position.set(-0.47, -0.32, -1);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(1024, 1024);
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  // A neutral portrait key keeps the pixel character's warm skin readable.
  const portraitLight = new THREE.DirectionalLight(0xfff8f0, 0);
  portraitLight.position.set(-3, 16, 10);
  portraitLight.target.position.set(0, 13, 0);
  scene.add(portraitLight, portraitLight.target);

  const pointLight = new THREE.PointLight(0xc2a4ff, 0, 100, 3);
  pointLight.position.set(3, 12, 4);
  pointLight.castShadow = true;
  scene.add(pointLight);

  // Initialize once; a late HDR response must preserve the entrance fade.
  scene.environmentIntensity = 0;
  scene.environmentRotation.set(5.76, 85.85, 1);
  environmentTexture = new RGBELoader()
    .setPath("/models/")
    .load("char_enviorment.hdr", (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
    }, undefined, () => {
      // The owned lights remain usable when the optional environment fails.
    });

  function setPointLight(screenLight: THREE.Object3D | null | undefined) {
    if (disposed) return;
    if (!(screenLight instanceof THREE.Mesh)) {
      pointLight.intensity = 0;
      return;
    }
    const materials: THREE.Material[] = Array.isArray(screenLight.material)
      ? screenLight.material
      : [screenLight.material];
    let intensity = 0;
    for (const material of materials) {
      if (
        material.opacity > 0.9 &&
        "emissiveIntensity" in material &&
        typeof material.emissiveIntensity === "number" &&
        Number.isFinite(material.emissiveIntensity)
      ) {
        intensity = Math.max(intensity, material.emissiveIntensity * 8);
      }
    }
    pointLight.intensity = intensity;
  }

  function turnOnLights(reducedMotion = false) {
    if (disposed || lightsOn) return;
    lightsOn = true;
    const duration = reducedMotion ? 0 : 2;
    animationContext.add(() => {
      gsap.to(scene, {
        environmentIntensity: 0.62,
        duration,
        ease: "power2.inOut",
      });
      gsap.to(directionalLight, {
        intensity: 0.48,
        duration,
        ease: "power2.inOut",
      });
      gsap.to(portraitLight, {
        intensity: 1.05,
        duration,
        ease: "power2.inOut",
      });
      gsap.to(".character-rim", {
        y: "55%",
        opacity: 1,
        delay: reducedMotion ? 0 : 0.2,
        duration,
      });
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    animationContext.revert();
    if (scene.environment === environmentTexture) {
      scene.environment = previousEnvironment;
    }
    scene.environmentIntensity = previousIntensity;
    scene.environmentRotation.copy(previousRotation);
    environmentTexture?.dispose();
    environmentTexture = undefined;
    directionalLight.dispose();
    portraitLight.dispose();
    pointLight.dispose();
    scene.remove(directionalLight, portraitLight, portraitLight.target, pointLight);
  }

  return { setPointLight, turnOnLights, dispose };
};

export default setLighting;
