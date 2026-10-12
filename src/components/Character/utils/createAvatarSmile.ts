import * as THREE from "three";

// The authored mouth is a real opening. These are its two surface boundaries,
// measured on the included character.glb, rather than an arbitrary face mask.
const corners = [256, 504];
const upperRim = [256, 986, 255, 985, 252, 982, 251, 981, 250, 983, 253, 984,
  254, 1470, 502, 1469, 499, 1467, 500, 1468, 501, 1471, 503, 1472, 504];
const lowerRim = [256, 987, 257, 988, 258, 989, 259, 990, 260, 991, 261, 992,
  262, 1478, 509, 1477, 508, 1476, 507, 1475, 506, 1474, 505, 1473, 504];

type Edge = { index: number; length: number };
type QueueItem = { index: number; distance: number; seed: number };

/** Surface distances keep the adjacent upper and lower lips independent. */
function surfaceDistances(graph: Edge[][], seeds: number[]) {
  const distances = new Float64Array(graph.length).fill(Infinity);
  const nearest = new Int32Array(graph.length).fill(-1);
  const queue: QueueItem[] = [];
  const push = (item: QueueItem) => {
    queue.push(item);
    let index = queue.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (queue[parent].distance <= item.distance) break;
      queue[index] = queue[parent];
      index = parent;
    }
    queue[index] = item;
  };
  const pop = () => {
    const first = queue[0];
    const last = queue.pop()!;
    if (queue.length) {
      let index = 0;
      while (index * 2 + 1 < queue.length) {
        let child = index * 2 + 1;
        if (child + 1 < queue.length && queue[child + 1].distance < queue[child].distance) child++;
        if (last.distance <= queue[child].distance) break;
        queue[index] = queue[child];
        index = child;
      }
      queue[index] = last;
    }
    return first;
  };
  for (const seed of seeds) {
    if (seed >= graph.length) throw new Error("The avatar mouth topology has changed.");
    distances[seed] = 0;
    nearest[seed] = seed;
    push({ index: seed, distance: 0, seed });
  }
  while (queue.length) {
    const current = pop();
    if (current.distance !== distances[current.index]) continue;
    for (const edge of graph[current.index]) {
      const next = current.distance + edge.length;
      // Beyond this radius the deformation is effectively zero.
      if (next >= distances[edge.index] || next > 0.75) continue;
      distances[edge.index] = next;
      nearest[edge.index] = current.seed;
      push({ index: edge.index, distance: next, seed: current.seed });
    }
  }
  return { distances, nearest };
}

export function createSmileDeformation(source: THREE.BufferGeometry) {
  const positions = source.getAttribute("position");
  const indices = source.index;
  if (!indices) throw new Error("The avatar smile requires the indexed facial mesh.");
  const graph: Edge[][] = Array.from({ length: positions.count }, () => []);
  const seen = new Set<string>();
  for (let triangle = 0; triangle < indices.count; triangle += 3) {
    const vertices = [indices.getX(triangle), indices.getX(triangle + 1), indices.getX(triangle + 2)];
    for (let edge = 0; edge < 3; edge++) {
      const first = vertices[edge];
      const second = vertices[(edge + 1) % 3];
      const key = `${Math.min(first, second)},${Math.max(first, second)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const length = Math.hypot(positions.getX(first) - positions.getX(second),
        positions.getY(first) - positions.getY(second), positions.getZ(first) - positions.getZ(second));
      graph[first].push({ index: second, length });
      graph[second].push({ index: first, length });
    }
  }
  const upper = surfaceDistances(graph, upperRim);
  const lower = surfaceDistances(graph, lowerRim);
  const displacements = new Float32Array(positions.count * 3);
  const lipWeights = new Float32Array(positions.count);
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const isUpper = upper.distances[vertex] <= lower.distances[vertex];
    const field = isUpper ? upper : lower;
    const distance = field.distances[vertex];
    const seed = field.nearest[vertex];
    if (seed < 0 || !Number.isFinite(distance)) continue;
    const x = positions.getX(seed);
    const originalCorner = x < 0 ? Math.abs(positions.getX(corners[0])) : positions.getX(corners[1]);
    const t = THREE.MathUtils.clamp(Math.abs(x) / originalCorner, 0, 1);
    const t2 = t * t;
    const targetX = Math.sign(x) * 0.49 * t;
    const targetY = isUpper ? 12.65 + 0.06 * t2 : 12.47 + 0.24 * t2;
    const targetZ = isUpper ? 0.91 - 0.135 * t2 : 0.88 - 0.105 * t2;
    const influence = Math.exp(-((distance / 0.23) ** 2));
    displacements[vertex * 3] = (targetX - x) * influence;
    displacements[vertex * 3 + 1] = (targetY - positions.getY(seed)) * influence;
    displacements[vertex * 3 + 2] = (targetZ - positions.getZ(seed)) * influence;
    // Lip pigment stays on the lip surface, rather than painting the cheeks.
    lipWeights[vertex] = Math.exp(-((distance / 0.07) ** 2));
  }

  // Nearest-rim displacement alone has a small jump whenever the nearest seed
  // changes. Relax the field along the face surface, with the lip curve pinned,
  // so those jumps cannot turn into dents or bands in the cheek highlights.
  const rim = new Set([...upperRim, ...lowerRim]);
  const guide = displacements.slice();
  const next = new Float32Array(displacements.length);
  for (let pass = 0; pass < 40; pass++) {
    next.set(displacements);
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const distance = Math.min(upper.distances[vertex], lower.distances[vertex]);
      if (rim.has(vertex) || distance > 0.5 || !graph[vertex].length) continue;
      let total = 0;
      const average = [0, 0, 0];
      for (const edge of graph[vertex]) {
        const weight = 1 / Math.max(edge.length, 0.005);
        total += weight;
        for (let axis = 0; axis < 3; axis++) {
          average[axis] += displacements[edge.index * 3 + axis] * weight;
        }
      }
      for (let axis = 0; axis < 3; axis++) {
        const index = vertex * 3 + axis;
        const relaxed = average[axis] / total * 0.94 + guide[index] * 0.06;
        next[index] = THREE.MathUtils.lerp(displacements[index], relaxed, 0.7);
      }
    }
    displacements.set(next);
  }
  return {
    deform(point: THREE.Vector3, vertexIndex: number) {
      point.x += displacements[vertexIndex * 3];
      point.y += displacements[vertexIndex * 3 + 1];
      point.z += displacements[vertexIndex * 3 + 2];
      return point;
    },
    lipWeight(vertexIndex: number) { return lipWeights[vertexIndex]; },
  };
}

/** A closed curved volume, so a three-quarter view never reveals a flat card. */
function curvedVolume(width: number, columns: number, rows: number, depth: number,
  top: (t: number) => number, bottom: (t: number) => number,
  front: (t: number, v: number) => number) {
  const vertices: number[] = [];
  const triangles: number[] = [];
  const layerSize = (columns + 1) * (rows + 1);
  for (let layer = 0; layer < 2; layer++) {
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      for (let column = 0; column <= columns; column++) {
        const t = column / columns * 2 - 1;
        vertices.push(t * width, THREE.MathUtils.lerp(top(t), bottom(t), v), front(t, v) - layer * depth);
      }
    }
  }
  const quad = (a: number, b: number, c: number, d: number) => triangles.push(a, b, c, c, b, d);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      quad(a, b, a + 1, b + 1);
      quad(a + layerSize, a + 1 + layerSize, b + layerSize, b + 1 + layerSize);
    }
  }
  for (let column = 0; column < columns; column++) {
    quad(column, column + 1, column + layerSize, column + 1 + layerSize);
    const edge = rows * (columns + 1) + column;
    quad(edge, edge + layerSize, edge + 1, edge + 1 + layerSize);
  }
  for (let row = 0; row < rows; row++) {
    const left = row * (columns + 1);
    const nextLeft = left + columns + 1;
    quad(left, left + layerSize, nextLeft, nextLeft + layerSize);
    const right = left + columns;
    const nextRight = nextLeft + columns;
    quad(right, nextRight, right + layerSize, nextRight + layerSize);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** All vertices use the source character's bind-space coordinates. */
export function createSmileMeshes() {
  const group = new THREE.Group();
  group.name = "avatarSmile";
  const cavityGeometry = curvedVolume(0.495, 40, 8, 0.13,
    t => 12.683 + 0.029 * t * t,
    t => 12.445 + 0.263 * t * t,
    (t, v) => 0.836 - 0.095 * t * t + 0.012 * Math.sin(Math.PI * v));
  const cavity = new THREE.Mesh(cavityGeometry,
    new THREE.MeshStandardMaterial({ color: "#45251e", roughness: 0.95, metalness: 0 }));
  cavity.name = "avatarMouthCavity";
  cavity.receiveShadow = true;
  group.add(cavity);

  const teethGeometry = curvedVolume(0.425, 64, 4, 0.038,
    t => 12.641 + 0.045 * t * t,
    t => 12.519 + 0.093 * t * t,
    (t, v) => 0.895 - 0.089 * t * t + 0.004 * Math.sin(Math.PI * v));
  const teeth = new THREE.Mesh(teethGeometry,
    new THREE.MeshStandardMaterial({ color: "#e9dfcd", roughness: 0.42, metalness: 0 }));
  // Very shallow enamel seams retain a continuous dental arch, without black gaps.
  teeth.material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vEnamelPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvEnamelPosition = position;');
    shader.fragmentShader = 'varying vec3 vEnamelPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
      float toothX = abs(vEnamelPosition.x);
      float seam = min(min(abs(toothX - 0.112), abs(toothX - 0.218)), min(abs(toothX - 0.312), toothX));
      float enamelEdge = 1.0 - smoothstep(0.001, 0.006, seam);
      diffuseColor.rgb *= 1.0 - enamelEdge * 0.12;`);
  };
  teeth.material.customProgramCacheKey = () => 'portrait-enamel-v1';
  teeth.name = "avatarSmileTeeth";
  teeth.castShadow = true;
  teeth.receiveShadow = true;
  group.add(teeth);
  return group;
}
