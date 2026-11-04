// Fixed world units: resizing the viewport must never move the furniture.
export const STATIONS = [
  {id:'projects', label:'Projects', action:'Open projects', x:-4.6,z:-2.6, elevation:.5, obstacle:{x:-4.6,z:-4.3,w:3.5,d:.95}},
  {id:'notes', label:'Ideas & notes', action:'Open notebook', x:-5.7,z:2.5, obstacle:{x:-5.7,z:.85,w:2.9,d:.95}},
  {id:'contact', label:'Say hello', action:'Pick up the phone', x:4.75,z:5.3, obstacle:{x:4.75,z:3.65,w:2.25,d:.95}},
];
export const GAMES = ['snake','bricks','memory','runner','pong','blocks','maze'];
export const GAME_NAMES = ['Snake','Brick Breaker','Memory Match','Glitch Run','Pong','Block Drop','Coin Maze'];
export const CABINETS = GAMES.map((id,i)=>({id,label:GAME_NAMES[i],action:`Play ${GAME_NAMES[i]}`,game:true,
  x:i<4?1.6+i*1.55:5.1,z:i<4?-2.7:-1.1+(i-4)*1.55,
  obstacle:i<4?{x:1.6+i*1.55,z:-4.42,w:1.02,d:.8}:{x:6.75,z:-1.1+(i-4)*1.55,w:.8,d:1.02},
}));
export const TARGETS = [...STATIONS,...CABINETS,{id:'exit',label:'Outside',action:'Leave the studio',x:1.4,z:5.25}];
export const OBSTACLES = [
  ...STATIONS.map(s=>s.obstacle),...STATIONS.map(s=>({x:s.x,z:s.obstacle.z+1,w:.65,d:.6})),...CABINETS.map(c=>c.obstacle),
  ...CABINETS.map((c,i)=>({x:c.obstacle.x-(i<4?0:1.08),z:c.obstacle.z+(i<4?1.08:0),w:.46,d:.46})),
  {x:-5.75,z:-.02,w:4.25,d:.18},{x:4.75,z:2.7,w:3.2,d:.19},
  {x:-2.5,z:4.1,w:2.5,d:1.1},{x:-.9,z:3.85,w:1.65,d:.8},
  {x:-2,z:-.2,w:1.3,d:.65},{x:-7,z:-5.1,w:1.4,d:.65},{x:-1.85,z:-5.1,w:1.5,d:.65},
  // Platform edges are blocked; its broad front steps are the walkable approach.
  {x:-1.7,z:-3.8,w:.08,d:4},{x:-6.7,z:-1.8,w:2.3,d:.08},{x:-1.87,z:-1.8,w:.35,d:.08},
  ...[.55,7.45].map(x=>({x,z:-2.9,w:.36,d:.6})),
  ...[[-7.4,2.4],[-7.1,4.8],[-.5,-4.7],[7.15,5],[2,-1.4],[3.05,3.6],[-2.4,1.15],[-6.8,-3.1],[-2.5,-3.1],[6.5,4.6]].map(([x,z])=>({x,z,w:.65,d:.65})),
];
export function floorHeight(x,z) {
  if(x< -1.7&&z< -1.8)return .5;
  if(x>=-5.55&&x<=-2.05&&z< -1.19)return Math.min(.5,(-z-1.19)/.7*.5);
  return 0;
}
export function canStand(x,z,r=.25) {
  return [x,z,r].every(Number.isFinite) && r>=0 && Math.abs(x)<7.75-r && Math.abs(z)<5.85-r && !OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+r && Math.abs(z-o.z)<o.d/2+r);
}
export function moveWithCollision(position,dx,dz,r=.25) {
  if (![position.x,position.z,dx,dz,r].every(Number.isFinite)) return position;
  // Substeps also prevent tunnelling if a slow device drops a frame.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
  for(let i=0;i<steps;i++){
    if(canStand(position.x+dx/steps,position.z,r))position.x+=dx/steps;
    if(canStand(position.x,position.z+dz/steps,r))position.z+=dz/steps;
  }
  return position;
}
export function nearestTarget(position) {
  return TARGETS.map(t=>({...t,distance:Math.hypot(t.x-position.x,t.z-position.z)})).filter(t=>t.distance<1.15).sort((a,b)=>a.distance-b.distance)[0];
}
export function movementVector(keys,azimuth) {
  let x=Number(keys.has('right'))-Number(keys.has('left'));
  let z=Number(keys.has('down'))-Number(keys.has('up'));
  const length=Math.hypot(x,z)||1;x/=length;z/=length;
  return {x:x*Math.cos(azimuth)+z*Math.sin(azimuth),z:-x*Math.sin(azimuth)+z*Math.cos(azimuth)};
}
