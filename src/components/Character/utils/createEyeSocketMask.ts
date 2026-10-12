import * as THREE from "three";

type SurfaceEdge = { vertex: number; length: number };
type DistanceEntry = { vertex: number; distance: number };

/**
 * Restrict socket sculpting to the source's actual eyelid surface. A geometric
 * x/y mask also reaches the upper nose; this field follows triangle edges from
 * the two authored eye openings and is shared by the base and morph endpoints.
 */
export function createEyeSocketMask(source: THREE.BufferGeometry): Float32Array {
  const position = source.getAttribute("position");
  const index = source.index;
  if (!index) throw new Error("The avatar eye sockets require the indexed facial mesh.");

  const graph: SurfaceEdge[][] = Array.from({ length: position.count }, () => []);
  const edges = new Set<string>();
  for (let triangle = 0; triangle < index.count; triangle += 3) {
    const vertices = [index.getX(triangle), index.getX(triangle + 1), index.getX(triangle + 2)];
    for (let edge = 0; edge < 3; edge++) {
      const first = vertices[edge];
      const second = vertices[(edge + 1) % 3];
      const key = `${Math.min(first, second)},${Math.max(first, second)}`;
      if (edges.has(key)) continue;
      edges.add(key);
      const length = Math.hypot(position.getX(first) - position.getX(second),
        position.getY(first) - position.getY(second), position.getZ(first) - position.getZ(second));
      graph[first].push({ vertex: second, length });
      graph[second].push({ vertex: first, length });
    }
  }

  const distances = new Float64Array(position.count).fill(Infinity);
  const queue: DistanceEntry[] = [];
  const push = (entry: DistanceEntry) => {
    queue.push(entry);
    let child = queue.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (queue[parent].distance <= entry.distance) break;
      queue[child] = queue[parent];
      child = parent;
    }
    queue[child] = entry;
  };
  const pop = () => {
    const first = queue[0];
    const last = queue.pop()!;
    if (queue.length > 0) {
      let parent = 0;
      while (parent * 2 + 1 < queue.length) {
        let child = parent * 2 + 1;
        if (child + 1 < queue.length && queue[child + 1].distance < queue[child].distance) child++;
        if (last.distance <= queue[child].distance) break;
        queue[parent] = queue[child];
        parent = child;
      }
      queue[parent] = last;
    }
    return first;
  };

  // The two 36-vertex boundary loops in the included character.glb.
  for (const [first, last] of [[214, 231], [909, 926], [463, 480], [1395, 1412]]) {
    for (let vertex = first; vertex <= last; vertex++) {
      if (vertex >= position.count) throw new Error("The avatar eye topology has changed.");
      distances[vertex] = 0;
      push({ vertex, distance: 0 });
    }
  }
  while (queue.length > 0) {
    const current = pop();
    if (current.distance !== distances[current.vertex]) continue;
    for (const edge of graph[current.vertex]) {
      const distance = current.distance + edge.length;
      if (distance >= distances[edge.vertex] || distance > 0.35) continue;
      distances[edge.vertex] = distance;
      push({ vertex: edge.vertex, distance });
    }
  }

  const mask = new Float32Array(position.count);
  for (let vertex = 0; vertex < position.count; vertex++) {
    if (!Number.isFinite(distances[vertex])) continue;
    mask[vertex] = Math.exp(-((distances[vertex] / 0.09) ** 2));
  }
  return mask;
}
