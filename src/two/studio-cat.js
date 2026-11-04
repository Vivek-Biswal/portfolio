import {canStand, moveWithCollision} from './studio-world.js';

const RADIUS = .2;
const TAU = Math.PI * 2;
const angleDelta = (to, from) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Independent simulation so the same cat can drive a mesh or an animated rig.
 * Heading is measured from +Z, matching THREE.Group.rotation.y.
 */
export function createCatController(initial = {x:2, z:2.8}, random = Math.random) {
  const rand = () => Math.max(0, Math.min(.999999, Number(random()) || 0));
  const origin = canStand(initial.x, initial.z, RADIUS) ? initial : {x:2, z:2.8};
  const state = {x:origin.x, z:origin.z, heading:0, moving:false, fleeing:false, mode:'rest'};
  let goal = {...origin}, timer = .8 + rand() * 1.6, fleeHold = 0;
  let speed = 0, blockedFor = 0;
  let escapeHeading = rand() * TAU;
  let escapePath=[],escapeAge=0,escapeDistance=0;

  // When furniture blocks the direct escape, find a short connected route around
  // it. Local steering alone can get trapped between a wall and a planter.
  function findEscape(player) {
    const nodes=[{x:state.x,z:state.z,parent:-1,gx:0,gz:0}],seen=new Set(['0,0']);
    let best=0;
    for(let cursor=0;cursor<nodes.length&&cursor<900;cursor++){
      const node=nodes[cursor];
      if(distance(node,player)>distance(nodes[best],player))best=cursor;
      if(distance(node,player)>2.5){best=cursor;break;}
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const gx=node.gx+dx,gz=node.gz+dz,key=`${gx},${gz}`,x=node.x+dx*.25,z=node.z+dz*.25;
        if(seen.has(key)||!canStand(x,z,RADIUS)||!canStand(node.x+dx*.125,node.z+dz*.125,RADIUS))continue;
        seen.add(key);nodes.push({x,z,parent:cursor,gx,gz});
      }
    }
    const route=[];for(let i=best;i>0;i=nodes[i].parent)route.unshift(nodes[i]);return route;
  }

  function rest() {
    state.mode = 'rest';
    timer = 1.2 + rand() * 3.4;
    blockedFor = 0;
  }

  function roam() {
    // Prefer short walks, with an occasional longer trip through the studio.
    for (let i = 0; i < 24; i++) {
      const angle = rand() * TAU, radius = 1 + rand() * 3.5;
      const candidate = {x:state.x + Math.sin(angle) * radius, z:state.z + Math.cos(angle) * radius};
      if (canStand(candidate.x, candidate.z, RADIUS) && distance(state, candidate) > .65) {
        goal = candidate;
        state.mode = 'roam';
        timer = 3 + rand() * 6;
        blockedFor = 0;
        return;
      }
    }
    rest();
  }

  function steer(desired, player) {
    // A clear straight path wins; nearby obstructions turn the cat around the
    // obstacle instead of repeatedly choosing an unreachable goal behind it.
    let best, score = -Infinity;
    for (let i = 0; i < 24; i++) {
      const heading = desired + i * TAU / 24;
      const dx = Math.sin(heading), dz = Math.cos(heading);
      let clearance = 0;
      for (let step = 1; step <= 8; step++) {
        if (!canStand(state.x + dx * step * .1, state.z + dz * step * .1, RADIUS)) break;
        clearance = step * .1;
      }
      if (clearance < .2) continue;
      const lookAhead=escapePath.length?Math.min(clearance,distance(state,goal)):clearance;
      const endpoint = {x:state.x + dx * lookAhead, z:state.z + dz * lookAhead};
      const progress = state.fleeing && !escapePath.length
        ? distance(endpoint, player) - distance(state, player)
        : distance(state, goal) - distance(endpoint, goal);
      const value = progress * 3 + clearance * .75 + Math.cos(angleDelta(heading, state.heading)) * .12;
      if (value > score) { score = value; best = heading; }
    }
    return best;
  }

  function step(dt, player) {
    const proximity = distance(state, player);
    const threatened = proximity < 1.25;
    if (threatened) {
      if (!state.fleeing) {escapeHeading = rand() * TAU;escapeAge=0;escapeDistance=proximity;escapePath=[];}
      state.fleeing = true;
      state.mode = 'flee';
      fleeHold = .9;
    } else if (state.fleeing) {
      fleeHold -= dt;
      if (fleeHold <= 0 && proximity > 1.8) {
        state.fleeing = false;
        escapePath=[];
        rest();
      }
    }

    if (state.mode === 'rest') {
      speed = 0;
      state.moving = false;
      timer -= dt;
      if (timer <= 0) roam();
      return;
    }
    if (!state.fleeing) {
      timer -= dt;
      if (distance(state, goal) < .22 || timer <= 0) { rest(); state.moving = false; speed = 0; return; }
    }

    if(state.fleeing){
      escapeAge+=dt;
      if(escapeAge>.8){if(proximity<escapeDistance+.2&&!escapePath.length)escapePath=findEscape(player);escapeDistance=proximity;escapeAge=0;}
      while(escapePath.length&&distance(state,escapePath[0])<.16)escapePath.shift();
      if(escapePath.length)goal=escapePath[0];
    }
    const desired = state.fleeing && !escapePath.length
      ? proximity < .001 ? escapeHeading : Math.atan2(state.x - player.x, state.z - player.z)
      : Math.atan2(goal.x - state.x, goal.z - state.z);
    const heading = steer(desired, player);
    if (heading === undefined) {
      state.moving = false; speed = 0; blockedFor += dt;
      if (!state.fleeing && blockedFor > .4) roam();
      return;
    }
    const turn = angleDelta(heading, state.heading);
    state.heading += Math.max(-dt * 8, Math.min(dt * 8, turn));
    state.heading = Math.atan2(Math.sin(state.heading), Math.cos(state.heading));
    const targetSpeed = (escapePath.length?Math.min(2.25,distance(state,goal)*4):state.fleeing ? 2.25 : .62) * Math.max(.1, Math.cos(turn));
    speed += (targetSpeed - speed) * (1 - Math.exp(-dt * 10));
    const before = {x:state.x, z:state.z};
    moveWithCollision(state, Math.sin(state.heading) * speed * dt, Math.cos(state.heading) * speed * dt, RADIUS);
    state.moving = distance(before, state) > .00001;
    blockedFor = state.moving ? 0 : blockedFor + dt;
    if (blockedFor > .6) {
      // Turn in place before taking another step; never push through furniture.
      state.heading = heading;
      blockedFor = 0;
      if (!state.fleeing) roam();
    }
  }

  return {
    state,
    update(dt, player) {
      if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(player?.x) || !Number.isFinite(player?.z)) return state;
      // Bound suspension jumps and substep steering consistently on slow devices.
      let remaining = Math.min(dt, .25);
      while (remaining > .000001) {
        const slice = Math.min(remaining, 1 / 60);
        step(slice, player); remaining -= slice;
      }
      return state;
    },
  };
}
