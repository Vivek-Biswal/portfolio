// The renderer owns animation; this controller advances only on completion.
// Tokens make late mixer/tween callbacks harmless after cancellation/disposal.
export function createInteractionController({onChange=()=>{},onView=()=>{},onRestore=()=>{}}={}) {
 let state='exploring',station=null,token=0,closing=false,disposed=false;
 function enter(next){state=next;token++;onChange({state,station,token});}
 function restore(){const previous=station;station=null;closing=false;enter('exploring');onRestore(previous);}
 const api={
  get state(){return state;},get station(){return station;},get token(){return token;},get busy(){return state!=='exploring';},
  start(target){if(disposed||api.busy||!target)return false;station=target;closing=false;enter('aligning');return true;},
  complete(id=token){
   if(disposed||id!==token)return false;
   if(state==='aligning'){if(closing)restore();else enter('sitting');}
   else if(state==='sitting')enter(closing?'putting-away':'using');
   else if(state==='using'){if(closing)enter('putting-away');else{enter('viewing');onView(station);}}
   else if(state==='putting-away')enter('standing');
   else if(state==='standing')restore();
   else return false;
   return true;
  },
  close(){if(!api.busy||disposed)return;closing=true;if(state==='viewing')enter('putting-away');},
  // Skip settles each animation at its authored endpoint before advancing.
  skip(settle=()=>{}){for(let i=0;i<6&&state!=='exploring'&&state!=='viewing';i++){const id=token;settle(state,station);api.complete(id);}},
  reset(){if(disposed)return;restore();},
  dispose(){disposed=true;token++;station=null;state='exploring';},
 };return api;
}

export function paginateParagraphs(paragraphs,maxWords=145){
 const pages=[];let page=[],count=0;
 for(const paragraph of paragraphs){
  const words=String(paragraph).trim().split(/\s+/).filter(Boolean);
  for(let i=0;i<words.length;){const take=Math.min(maxWords-count,words.length-i);page.push(words.slice(i,i+take).join(' '));count+=take;i+=take;if(count>=maxWords){pages.push(page);page=[];count=0;}}
 }
 if(page.length)pages.push(page);return pages.length?pages:[[]];
}
