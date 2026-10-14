import defaults from '../../content/defaults.json';
let rendered=defaults;
try { rendered=JSON.parse(document.getElementById('portfolio-content')?.textContent||'null')||defaults; }catch{/* The centralized defaults remain a safe fallback. */}
export const initialContent=rendered;
export function subscribeContent(callback) {
  if(document.documentElement.dataset.contentPreview==='true') {callback(initialContent);return ()=>{};}
  let disposed=false,lastVersion=null;
  async function refresh() {
    if(disposed||document.hidden)return;
    try {
      const response=await fetch('/api/portfolio?action=content',{cache:'no-store'});
      if(!response.ok)return;
      const result=await response.json();
      if(result.version!==lastVersion && result.content) {lastVersion=result.version;callback(result.content);}
    } catch {/* The last rendered published content remains readable offline. */}
  }
  refresh(); const interval=setInterval(refresh,30000);
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return ()=>{disposed=true;clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
}
