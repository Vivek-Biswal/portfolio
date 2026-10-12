import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import { handleMouseMove, handleHeadRotation } from "./utils/mouseUtils";
import setAnimations from "./utils/animationUtils";
import { setProgress } from "../Loading";

type AvatarHooks = {
  update?: (delta: number, elapsed: number) => void;
};

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const { setLoading, setIsLoading } = useLoading();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const container = canvasDiv.current;
    if (!container) return;

    let disposed = false;
    setLoadError(null);
    const reportLoadError = () => {
      if (disposed) return;
      setLoadError("The 3D character could not load. Your portfolio is still available below.");
      setLoading(100);
      setIsLoading(false);
      document.body.style.overflowY = "auto";
      document.querySelector("main")?.classList.add("main-active");
      void import("../utils/initialFX").then(({ initialFX }) => {
        if (!disposed) initialFX();
      }).catch(() => {
        // Basic content remains visible if the optional entrance effects fail.
      });
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      reportLoadError();
      return () => { disposed = true; };
    }

    // Each effect owns its scene, including React's development remount.
    const scene = new THREE.Scene();
    const bounds = container.getBoundingClientRect();
    const width = Math.max(bounds.width, 1);
    const height = Math.max(bounds.height, 1);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(14.5, width / height, 0.1, 1000);
    camera.position.set(0, 13.1, 24.7);
    camera.zoom = 1.1;
    camera.updateProjectionMatrix();

    const light = setLighting(scene);
    const characterLoader = setCharacter(renderer, scene, camera);
    const progress = setProgress((value) => {
      if (!disposed) setLoading(value);
    });
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let character: THREE.Object3D | null = null;
    let headBone: THREE.Object3D | null = null;
    let screenLight: THREE.Object3D | null = null;
    let avatarHooks: AvatarHooks | undefined;
    let mixer: THREE.AnimationMixer | undefined;
    let animationControls: ReturnType<typeof setAnimations> | undefined;
    let hoverCleanup: (() => void) | undefined;
    let introTimer: number | undefined;
    let touchResetTimer: number | undefined;
    let frame = 0;
    let mouse = { x: 0, y: 0 };
    const interpolation = { x: 0.1, y: 0.2 };
    const eyeTargets: THREE.Object3D[] = [];
    let shakeStartedAt: number | null = null;
    let lastShakeY = 0;
    let lastShakeZ = 0;
    let pressedPointer: { id: number; x: number; y: number; time: number; moved: boolean } | null = null;

    const startHeadShake = () => {
      if (reducedMotion || !headBone || window.scrollY >= 200 || shakeStartedAt !== null) return;
      shakeStartedAt = clock.elapsedTime;
    };
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      mouse = { x: 0, y: 0 };
      if (reducedMotion) {
        shakeStartedAt = null;
        if (headBone) {
          headBone.rotation.y -= lastShakeY;
          headBone.rotation.z -= lastShakeZ;
        }
        lastShakeY = 0;
        lastShakeZ = 0;
      }
      animationControls?.setReducedMotion(reducedMotion);
    };
    const onMouseMove = (event: MouseEvent) => {
      if (reducedMotion) return;
      handleMouseMove(event, (x, y) => { mouse = { x, y }; });
    };
    const setTouchPosition = (event: PointerEvent) => {
      if (reducedMotion) return;
      mouse = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      };
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest("a,button,input,textarea,select,[role='button']")) return;
      pressedPointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        moved: false,
      };
      if (event.pointerType === "touch") {
        window.clearTimeout(touchResetTimer);
        setTouchPosition(event);
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pressedPointer || event.pointerId !== pressedPointer.id) return;
      if (Math.hypot(event.clientX - pressedPointer.x, event.clientY - pressedPointer.y) > 12) {
        pressedPointer.moved = true;
      }
      if (event.pointerType === "touch") setTouchPosition(event);
    };
    const resetTouchTracking = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      window.clearTimeout(touchResetTimer);
      touchResetTimer = window.setTimeout(() => { mouse = { x: 0, y: 0 }; }, 1600);
    };
    const onPointerUp = (event: PointerEvent) => {
      const press = pressedPointer;
      if (!press || press.id !== event.pointerId) return;
      pressedPointer = null;
      resetTouchTracking(event);
      if (press.moved || performance.now() - press.time > 700 || reducedMotion) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12) return;
      const canvasBounds = renderer.domElement.getBoundingClientRect();
      if (!canvasBounds.width || !canvasBounds.height) return;
      pointer.set(
        ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1,
        -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1,
      );
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      eyeTargets.forEach((target) => {
        if (target instanceof THREE.SkinnedMesh) {
          target.skeleton.update();
          target.computeBoundingSphere();
        }
      });
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObjects(eyeTargets, true).length) startHeadShake();
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (pressedPointer?.id !== event.pointerId) return;
      pressedPointer = null;
      resetTouchTracking(event);
    };
    const onResize = () => {
      if (disposed) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (character) {
        handleResize(renderer, camera, canvasDiv, character);
      } else {
        const nextBounds = container.getBoundingClientRect();
        const nextWidth = Math.max(nextBounds.width, 1);
        const nextHeight = Math.max(nextBounds.height, 1);
        renderer.setSize(nextWidth, nextHeight);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
      }
    };

    const landingDiv = document.getElementById("landingDiv") ?? container;
    document.addEventListener("mousemove", onMouseMove);
    landingDiv.addEventListener("pointerdown", onPointerDown, true);
    landingDiv.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerCancel, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("avatar:shake-head", startHeadShake);
    motionQuery.addEventListener("change", onMotionChange);

    void (async () => {
      const gltf = await characterLoader.loadCharacter();
      if (!gltf) throw new Error("Character model was unavailable");
      if (disposed) {
        characterLoader.dispose();
        return;
      }
      character = gltf.scene;
      scene.add(character);
      headBone = character.getObjectByName("spine006") ?? null;
      screenLight = character.getObjectByName("screenlight") ?? null;
      avatarHooks = character.userData.avatar as AvatarHooks | undefined;
      character.traverse((object) => {
        if (object.userData.interaction === "eye" || object.name === "eyeHitLeft" || object.name === "eyeHitRight") {
          eyeTargets.push(object);
        }
      });
      const animations = setAnimations(gltf, reducedMotion);
      animationControls = animations;
      mixer = animations.mixer;
      if (hoverDivRef.current) hoverCleanup = animations.hover(gltf, hoverDivRef.current);
      await progress.loaded();
      if (disposed) return;
      introTimer = window.setTimeout(() => {
        if (disposed) return;
        light.turnOnLights(reducedMotion);
        animations.startIntro(reducedMotion);
      }, 2500);
    })().catch((error: unknown) => {
      if (disposed) return;
      console.error("Unable to display the 3D character:", error);
      progress.clear();
      reportLoadError();
    });

    const animate = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      // Remove the previous additive reaction before applying this frame's pose.
      if (headBone) {
        headBone.rotation.y -= lastShakeY;
        headBone.rotation.z -= lastShakeZ;
      }
      lastShakeY = 0;
      lastShakeZ = 0;
      mixer?.update(delta);
      avatarHooks?.update?.(delta, elapsed);
      if (headBone && !reducedMotion) {
        handleHeadRotation(headBone, mouse.x, mouse.y, interpolation.x, interpolation.y, THREE.MathUtils.lerp);
        if (shakeStartedAt !== null) {
          const phase = (elapsed - shakeStartedAt) / 0.95;
          if (phase >= 1) {
            shakeStartedAt = null;
          } else {
            const envelope = Math.sin(Math.PI * phase) ** 2;
            lastShakeY = Math.sin(phase * Math.PI * 6) * 0.28 * envelope;
            lastShakeZ = Math.sin(phase * Math.PI * 3) * 0.035 * envelope;
            headBone.rotation.y += lastShakeY;
            headBone.rotation.z += lastShakeZ;
          }
        }
      }
      if (screenLight) light.setPointLight(screenLight);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(introTimer);
      window.clearTimeout(touchResetTimer);
      progress.dispose();
      hoverCleanup?.();
      animationControls?.dispose();
      document.removeEventListener("mousemove", onMouseMove);
      landingDiv.removeEventListener("pointerdown", onPointerDown, true);
      landingDiv.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("avatar:shake-head", startHeadShake);
      motionQuery.removeEventListener("change", onMotionChange);
      characterLoader.dispose();
      light.dispose();
      scene.clear();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [setLoading, setIsLoading]);

  return (
    <div className="character-container">
      <div className="character-model" ref={canvasDiv}>
        <div className="character-rim"></div>
        <div className="character-hover" ref={hoverDivRef}></div>
        <button
          type="button"
          className="avatar-keyboard-reaction"
          onClick={() => window.dispatchEvent(new Event("avatar:shake-head"))}
        >
          Shake my head
        </button>
        {loadError && (
          <p role="status" style={{ position: "absolute", top: "40%", left: "12%", right: "12%", color: "#eee", fontSize: "1rem", lineHeight: 1.6 }}>
            {loadError}
          </p>
        )}
      </div>
    </div>
  );
};

export default Scene;
