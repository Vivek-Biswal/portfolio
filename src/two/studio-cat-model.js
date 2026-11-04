import * as THREE from 'three';

/** A small articulated ginger cat. Geometry stays shared across every pose. */
export function createStudioCat() {
  const root = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({color:'#c68b56',roughness:.93});
  const cream = new THREE.MeshStandardMaterial({color:'#f1dfb7',roughness:1});
  const dark = new THREE.MeshStandardMaterial({color:'#28392f',roughness:.8});
  const pink = new THREE.MeshStandardMaterial({color:'#bc8070',roughness:1});
  const sphere = new THREE.SphereGeometry(1,12,8);
  function oval(parent,material,x,y,z,sx,sy,sz) {
    const mesh=new THREE.Mesh(sphere,material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
  }
  const body=new THREE.Group();root.add(body);
  oval(body,coat,0,.35,0,.18,.19,.34);
  oval(body,cream,0,.31,.23,.13,.13,.13);
  const head=new THREE.Group();head.position.set(0,.49,.31);body.add(head);
  oval(head,coat,0,0,0,.18,.17,.15);
  oval(head,cream,-.055,-.065,.13,.07,.055,.045);
  oval(head,cream,.055,-.065,.13,.07,.055,.045);
  oval(head,pink,0,-.038,.17,.032,.023,.02);
  for(const side of [-1,1]) {
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.09,.18,3),coat);
    ear.position.set(side*.11,.17,0);ear.rotation.z=-side*.18;head.add(ear);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.043,.1,3),pink);
    inner.position.set(side*.11,.17,.045);inner.rotation.z=-side*.18;head.add(inner);
    oval(head,dark,side*.085,.02,.131,.027,.038,.016);
    oval(head,cream,side*.079,.033,.146,.008,.011,.004);
  }
  const legs=[];
  for(const [x,z] of [[-.11,.22],[.11,.22],[-.11,-.23],[.11,-.23]]) {
    const pivot=new THREE.Group();pivot.position.set(x,.29,z);root.add(pivot);
    oval(pivot,coat,0,-.09,0,.055,.14,.055);
    oval(pivot,cream,0,-.215,.025,.065,.035,.08);legs.push(pivot);
  }
  const tail=new THREE.Group();tail.position.set(0,.4,-.3);body.add(tail);
  const tailSegments=[];let tailParent=tail;
  for(let i=0;i<6;i++) {
    const joint=new THREE.Group();joint.position.y=i===0?0:.1;
    tailParent.add(joint);oval(joint,i===5?cream:coat,0,.05,0,.035,.075,.035);
    tailSegments.push(joint);tailParent=joint;
  }
  let time=0,stride=0,restBlend=0;
  return {
    root,
    update(dt,state) {
      time+=dt;stride+=dt*(state.fleeing?18:8);
      root.position.set(state.x,.07,state.z);root.rotation.y=state.heading;
      restBlend+=(Number(!state.moving)-restBlend)*(1-Math.exp(-dt*4));
      body.position.y=-restBlend*.055;
      body.rotation.x=state.moving?Math.sin(stride*2)*.025:Math.sin(time*1.5)*.012;
      head.rotation.y=state.moving?0:Math.sin(time*.65)*.14;
      head.rotation.x=restBlend*.08;
      legs.forEach((leg,i)=>{
        const gait=Math.sin(stride+(i===0||i===3?0:Math.PI))*(state.fleeing?.6:.32);
        leg.rotation.x=gait*(1-restBlend)+restBlend*(i<2?-.16:.25);
      });
      tail.rotation.x=state.fleeing?-1.1:-.55;
      tail.rotation.z=Math.sin(time*1.4)*.15;
      tailSegments.forEach((joint,i)=>joint.rotation.x=i>2?.24:Math.sin(time*1.3+i*.3)*.05);
    },
  };
}
