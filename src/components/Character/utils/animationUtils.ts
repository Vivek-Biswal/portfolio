import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { eyebrowBoneNames, typingBoneNames } from "../../../data/boneData";

const setAnimations = (gltf: GLTF, reducedMotion = false) => {
  const character = gltf.scene;
  const mixer = new THREE.AnimationMixer(character);
  const clips = gltf.animations ?? [];
  const introClip = THREE.AnimationClip.findByName(clips, "introAnimation");
  const introAction = introClip ? mixer.clipAction(introClip) : null;
  const blinkClip = THREE.AnimationClip.findByName(clips, "Blink");
  const blinkAction = blinkClip ? mixer.clipAction(blinkClip) : null;
  const loopActions: THREE.AnimationAction[] = [];
  const hoverCleanups = new Set<() => void>();
  let blinkTimer: number | undefined;
  let disposed = false;
  let motionReduced = reducedMotion;

  if (introAction) {
    introAction.setLoop(THREE.LoopOnce, 1);
    introAction.clampWhenFinished = true;
  }
  ["key1", "key2", "key5", "key6"].forEach((name) => {
    const clip = THREE.AnimationClip.findByName(clips, name);
    if (clip) loopActions.push(mixer.clipAction(clip));
  });
  const typingAction = createBoneAction(gltf, mixer, "typing", typingBoneNames);
  if (typingAction) loopActions.push(typingAction);

  function playLoops() {
    loopActions.forEach((action) => {
      action.enabled = true;
      action.paused = false;
      action.timeScale = 1.2;
      action.play();
    });
  }

  function showFinalIntroPose() {
    if (!introAction || !introClip) return;
    introAction.reset().play();
    introAction.time = introClip.duration;
    introAction.paused = true;
    mixer.update(0);
  }

  function playIntro() {
    if (!introAction) return;
    introAction.paused = false;
    introAction.reset().play();
  }

  if (motionReduced) showFinalIntroPose();
  else {
    playLoops();
    playIntro();
  }

  function startIntro(skipMotion = motionReduced) {
    if (disposed) return;
    window.clearTimeout(blinkTimer);
    motionReduced = skipMotion;
    if (motionReduced) {
      mixer.stopAllAction();
      showFinalIntroPose();
      return;
    }
    playLoops();
    playIntro();
    if (blinkAction) {
      blinkTimer = window.setTimeout(() => {
        if (disposed || motionReduced) return;
        blinkAction.reset().play().fadeIn(0.5);
      }, 2500);
    }
  }

  function setReducedMotion(next: boolean) {
    if (disposed || next === motionReduced) return;
    motionReduced = next;
    window.clearTimeout(blinkTimer);
    if (motionReduced) {
      mixer.stopAllAction();
      showFinalIntroPose();
    } else {
      playLoops();
      blinkAction?.reset().play().fadeIn(0.5);
    }
  }

  function hover(model: GLTF, hoverDiv: HTMLDivElement) {
    const eyeBrowUpAction = createBoneAction(model, mixer, "browup", eyebrowBoneNames);
    let isHovering = false;
    if (eyeBrowUpAction) {
      eyeBrowUpAction.setLoop(THREE.LoopOnce, 1);
      eyeBrowUpAction.clampWhenFinished = true;
      eyeBrowUpAction.enabled = true;
    }
    const onHoverFace = () => {
      if (disposed || motionReduced || !eyeBrowUpAction || isHovering) return;
      isHovering = true;
      eyeBrowUpAction.reset();
      eyeBrowUpAction.enabled = true;
      eyeBrowUpAction.setEffectiveWeight(4);
      eyeBrowUpAction.fadeIn(0.5).play();
    };
    const onLeaveFace = () => {
      if (disposed || !eyeBrowUpAction || !isHovering) return;
      isHovering = false;
      eyeBrowUpAction.fadeOut(0.6);
    };
    hoverDiv.addEventListener("mouseenter", onHoverFace);
    hoverDiv.addEventListener("mouseleave", onLeaveFace);
    const cleanup = () => {
      hoverDiv.removeEventListener("mouseenter", onHoverFace);
      hoverDiv.removeEventListener("mouseleave", onLeaveFace);
      hoverCleanups.delete(cleanup);
    };
    hoverCleanups.add(cleanup);
    return cleanup;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    window.clearTimeout(blinkTimer);
    hoverCleanups.forEach((cleanup) => cleanup());
    hoverCleanups.clear();
    mixer.stopAllAction();
    mixer.uncacheRoot(character);
  }

  return { mixer, startIntro, hover, setReducedMotion, dispose };
};

const createBoneAction = (
  gltf: GLTF,
  mixer: THREE.AnimationMixer,
  name: string,
  boneNames: string[]
): THREE.AnimationAction | null => {
  const clip = THREE.AnimationClip.findByName(gltf.animations ?? [], name);
  if (!clip) return null;
  const filteredClip = filterAnimationTracks(clip, boneNames);
  return filteredClip.tracks.length ? mixer.clipAction(filteredClip) : null;
};

const filterAnimationTracks = (
  clip: THREE.AnimationClip,
  boneNames: string[]
): THREE.AnimationClip => {
  const filteredTracks = clip.tracks.filter((track) =>
    boneNames.some((boneName) => track.name.includes(boneName))
  );
  return new THREE.AnimationClip(
    clip.name + "_filtered",
    clip.duration,
    filteredTracks
  );
};

export default setAnimations;
