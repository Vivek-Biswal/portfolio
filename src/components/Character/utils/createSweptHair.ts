import * as THREE from "three";

/** A continuous, close-fitting side-part surface; no separate inflated locks. */
export function createSweptHair(): THREE.Group {
  const hair = new THREE.Group();
  hair.name = "avatarHairSweptStyle";
  const columns = 160;
  const rows = 72;
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const fraction = row / rows;
    for (let column = 0; column <= columns; column++) {
      const phi = column / columns * Math.PI * 2;
      const front = Math.max(0, Math.sin(phi));
      const back = Math.max(0, -Math.sin(phi));
      const thetaEnd = 1.86 - 0.72 * front ** 2 + 0.11 * back ** 2;
      const theta = fraction * thetaEnd;
      const crown = Math.max(0, Math.cos(theta));
      let x = 1.105 * Math.sin(theta) * Math.cos(phi);
      let z = -0.095 + 1.055 * Math.sin(theta) * Math.sin(phi);
      let y = 13.48 + 1.155 * Math.cos(theta);
      const sweep = Math.exp(-(((x - 0.18) / 0.65) ** 2));
      y += 0.10 * sweep * crown;
      x += 0.04 * crown ** 2;
      // Curved shallow ridges flow backward from an off-centre part.
      // Displacement fades into the roots and pole, keeping the surface closed.
      const flow = 15 * (z + 0.40 * x + 0.18 * x * x);
      const envelope = Math.sin(theta) ** 1.5 * (0.5 + 0.5 * crown);
      const groove = (0.013 * Math.cos(flow) + 0.003 * Math.cos(flow * 2)) * envelope;
      x += groove * Math.cos(phi);
      z += groove * Math.sin(phi);
      y += groove * crown;
      const part = Math.exp(-(((x + 0.32 - 0.18 * (1 - front)) / 0.055) ** 2));
      y -= 0.055 * part * crown * front;
      const templeDrop = 0.17 * Math.exp(-(((x + 0.7) / 0.29) ** 2))
        + 0.07 * Math.exp(-(((x - 0.76) / 0.25) ** 2));
      y -= (templeDrop + 0.018 * Math.sin(phi * 9))
        * front ** 4 * THREE.MathUtils.smoothstep(fraction, 0.76, 1);
      // A shorter crown follows the portrait's real hair-to-face proportion.
      if (y > 13.9) y = 13.9 + (y - 13.9) * 0.64;
      const hairline = THREE.MathUtils.smoothstep(fraction, 0.74, 1) * front ** 6;
      y += hairline * (0.12 * Math.exp(-(((x + 0.32) / 0.22) ** 2))
        - 0.065 * Math.exp(-(((x - 0.35) / 0.42) ** 2)));
      y += 0.055 * sweep * front * crown;
      vertices.push(x, y, z);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({
    color: "#16171b", roughness: 0.7, metalness: 0,
  });
  const scalp = new THREE.Mesh(geometry, material);
  scalp.name = "avatarHairScalp";
  scalp.castShadow = true;
  scalp.receiveShadow = false;
  hair.add(scalp);
  for (let wave = 0; wave < 5; wave++) {
    const offset = wave * 0.09;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, 14.03 + offset * 0.3, 0.92 - offset),
      new THREE.Vector3(-0.14, 14.25 + offset * 0.3, 0.81 - offset),
      new THREE.Vector3(0.22, 14.28 + offset * 0.22, 0.78 - offset),
      new THREE.Vector3(0.63, 14.15 + offset * 0.15, 0.71 - offset),
      new THREE.Vector3(0.91, 13.88, 0.42 - offset * 0.7),
    ]);
    const ribbon = new THREE.TubeGeometry(curve, 48, 0.045, 8, false);
    // Flatten the ribbon in depth and taper both ends into the scalp.
    const positions = ribbon.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const t = Math.floor(i / 9) / 48;
      const center = curve.getPointAt(t);
      const taper = Math.sin(t * Math.PI) ** 0.5;
      const x = center.x + (positions.getX(i) - center.x) * taper;
      const z = center.z + (positions.getZ(i) - center.z) * 0.55 * taper;
      const crown = Math.sqrt(Math.max(0, 1 - (x / 1.105) ** 2 - ((z + 0.095) / 1.055) ** 2));
      const sweep = Math.exp(-(((x - 0.18) / 0.65) ** 2));
      const front = Math.max(0, Math.sin(Math.atan2(z + 0.095, x)));
      let surfaceY = 13.48 + 1.155 * crown + 0.10 * sweep * crown;
      if (surfaceY > 13.9) surfaceY = 13.9 + (surfaceY - 13.9) * 0.64;
      surfaceY += 0.055 * sweep * front * crown;
      // Project onto the scalp instead of letting curved strands bridge over
      // empty space. Only a shallow relief remains above the fitted surface.
      positions.setXYZ(i, x,
        surfaceY + (positions.getY(i) - center.y) * 0.32 * taper - 0.006, z);
    }
    ribbon.computeVertexNormals();
    const strand = new THREE.Mesh(ribbon, material);
    strand.name = 'avatarHairSweep' + wave;
    strand.castShadow = true;
    hair.add(strand);
  }
  hair.userData.style = "short, naturally swept side part from portrait reference";
  hair.userData.coordinateSpace = "original character bind coordinates";
  return hair;
}

export default createSweptHair;
