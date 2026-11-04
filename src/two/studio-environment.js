import * as THREE from 'three';

/** A lightweight, deterministic skyline: no network textures or extra renderer. */
export function addStudioEnvironment(scene) {
  const sky=new THREE.Mesh(new THREE.SphereGeometry(85,24,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 v; void main(){float h=normalize(v).y;vec3 low=vec3(.26,.25,.35);vec3 horizon=vec3(1.,.65,.40);vec3 high=vec3(.65,.71,.78);vec3 c=mix(low,horizon,smoothstep(-.28,.04,h));c=mix(c,high,smoothstep(.08,.75,h));gl_FragColor=vec4(c,1.);}',
  }));scene.add(sky);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(2.3,24,16),new THREE.MeshBasicMaterial({color:'#ffdda0',fog:false}));sun.position.set(29,8,-44);scene.add(sun);
  let seed=193;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const geometry=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const buildings=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:'#777385',roughness:1}),120);
  const windows=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:'#e2b681'}),120*12);
  let wi=0;
  for(let i=0;i<120;i++) {
    const angle=i*2.39996,r=32+rand()*29,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    const height=3+rand()*6,width=1.2+rand()*2;
    dummy.position.set(x,-12+height/2,z);dummy.scale.set(width,height,width);dummy.rotation.set(0,0,0);dummy.updateMatrix();buildings.setMatrixAt(i,dummy.matrix);
    buildings.setColorAt(i,new THREE.Color().setHSL(.65+rand()*.05,.10,.3+rand()*.16));
    for(let j=0;j<12;j++) {dummy.position.set(x+(j%3-1)*width*.24,-11+Math.floor(j/3)*height*.22,z+width/2+.01);dummy.scale.set(.12,.22,.015);dummy.updateMatrix();windows.setMatrixAt(wi++,dummy.matrix);}
  }
  scene.add(buildings,windows);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(75,48),new THREE.MeshStandardMaterial({color:'#656876',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-12;scene.add(ground);
  const stone=new THREE.MeshStandardMaterial({color:'#9d8972',roughness:1});
  const foundation=new THREE.Mesh(new THREE.BoxGeometry(16.35,11,12.35),stone);foundation.position.y=-6.2;scene.add(foundation);
  const facadeWindows=new THREE.InstancedMesh(new THREE.BoxGeometry(.85,1.55,.06),new THREE.MeshStandardMaterial({color:'#354b48',roughness:.55}),32);let facadeIndex=0;
  for(const y of [-1.1,-3.8,-6.5,-9.2]){
    const trim=new THREE.Mesh(new THREE.BoxGeometry(16.55,.12,12.55),stone);trim.position.y=y;scene.add(trim);
    for(let x=-7;x<=7;x+=2){dummy.position.set(x,y-1.25,6.19);dummy.scale.set(1,1,1);dummy.updateMatrix();facadeWindows.setMatrixAt(facadeIndex++,dummy.matrix);}
  }
  scene.add(facadeWindows);
}
