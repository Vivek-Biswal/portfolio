import {STATIONS,CABINETS,OBSTACLES,floorHeight} from './studio-world.js';
export const ANCHORS=Object.fromEntries([...STATIONS,...CABINETS].map(s=>{
 const side=s.game&&s.obstacle.x===6.75;
 const seat={x:s.game?s.obstacle.x-(side?1.08:0):s.x,z:s.obstacle.z+(s.game?(side?0:1.08):1),y:s.elevation||0};
 const forward={x:side?1:0,z:side?0:-1};
 return [s.id,{...s,seat,approach:{x:s.x,z:s.z},exit:{x:s.x,z:s.z},facing:side?Math.PI/2:Math.PI,
  seatSurface:s.game?.583:.585,forward,hand:{x:seat.x+forward.x*.43,y:seat.y+.98,z:seat.z+forward.z*.43},
  camera:{position:{x:seat.x+(side?-2.7:1.5),y:seat.y+2.7,z:seat.z+(side?1.5:2.7)},target:{x:s.obstacle.x,y:seat.y+1.15,z:s.obstacle.z}}
 }];
}));
// A chair's own docking space is allowed; other furniture remains solid.
export function alignmentPath(position,station){
 const seat=station.seat;
 const points=[{x:position.x,z:position.z},{...station.approach},{x:seat.x,z:seat.z}];
 const ownChair=o=>Math.abs(o.x-seat.x)<.01&&Math.abs(o.z-seat.z)<.01;
 for(let j=1;j<points.length;j++){
  const a=points[j-1],b=points[j],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.06);
  for(let i=0;i<=steps;i++){
   const t=steps?i/steps:0,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   if(Math.abs(x)>7.5||Math.abs(z)>5.6||OBSTACLES.some(o=>!ownChair(o)&&Math.abs(x-o.x)<o.w/2+.20&&Math.abs(z-o.z)<o.d/2+.20))return null;
   if(Math.abs(floorHeight(x,z)-seat.y)>.52)return null;
  }
 }
 return points;
}
