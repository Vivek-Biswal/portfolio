const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const noise=(index,salt=0)=>{
 const value=Math.sin((index+1)*127.1+salt*311.7)*43758.5453;
 return value-Math.floor(value);
};

/** Stable disorder: refreshing CMS content never changes every letter at random. */
export function letterScatter(index,{mobile=false,strength=1}={}){
 const amount=clamp(Number.isFinite(strength)?strength:1,0,2)*(mobile?.48:1);
 return {
  x:(noise(index,1)-.5)*360*amount,
  y:(noise(index,2)-.5)*300*amount,
  rotation:(noise(index,3)-.5)*65*amount,
  scale:1+(noise(index,4)-.5)*.45*amount,
 };
}

/** Keep emoji, combining marks, and names intact while making individual glyphs. */
export function textSegments(value){
 const text=String(value??'');
 if(typeof Intl.Segmenter==='function')return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(item=>item.segment);
 return Array.from(text);
}

export function motionIsEnabled(stored,reduced){return !reduced&&stored!=='off';}

/** Shrink only when a full name row would overflow its actual content column. */
export function fittedNameSize(baseSize,naturalWidth,availableWidth){
 if(![baseSize,naturalWidth,availableWidth].every(Number.isFinite)||baseSize<=0||naturalWidth<=0||availableWidth<=0)return baseSize;
 return Math.min(baseSize,baseSize*availableWidth/naturalWidth);
}
