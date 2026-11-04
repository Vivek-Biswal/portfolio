/** Keep one wall from each opposing pair hidden. A small dead zone prevents
 * flickering at cardinal camera angles; decorations share their wall's group. */
export function cutawaySides(x,z,previous=['E','S']) {
  if(!Number.isFinite(x)||!Number.isFinite(z))return previous;
  const horizontal=Math.abs(x)>.35?(x>0?'E':'W'):previous.find(s=>s==='E'||s==='W')||'E';
  const depth=Math.abs(z)>.35?(z>0?'S':'N'):previous.find(s=>s==='N'||s==='S')||'S';
  return [horizontal,depth];
}

export function wallGroup(name,position) {
  // GLTFLoader sanitizes spaces to underscores when creating runtime nodes.
  const perimeter=name.match(/^Wall_([NSEW])_/)?.[1];
  if(perimeter)return perimeter;
  if(/^Entrance[ _]/.test(name))return 'S';
  // The three shallow display walls face south. Hide their backs, along with
  // signs and pinboard papers, when the camera looks into the north cutaway.
  if(position?.y>.6){
    if(position.z< -5.35)return 'N';
    if(position.x< -3.5&&position.z>-.15&&position.z<.31)return 'N';
    if(position.x>3&&position.x<6.5&&position.z>2.59&&position.z<2.98)return 'N';
  }
  return 'core';
}
