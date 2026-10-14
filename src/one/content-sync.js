import { subscribeContent } from '../shared/public-client.js';
import { renderPublic } from '../../server/render-public.mjs';
subscribeContent(content=>{
  const next=new DOMParser().parseFromString(renderPublic(document.documentElement.outerHTML,'2d',content),'text/html');
  for(const id of ['hello','work','ideas','contact']) {
    const target=document.getElementById(id),source=next.getElementById(id);
    if(target&&source)target.innerHTML=source.innerHTML;
  }
  document.title=next.title;
  for(const selector of ['.signature','.footer','meta[name="description"]']) {
    const target=document.querySelector(selector),source=next.querySelector(selector);
    if(target&&source) {
      if(target.tagName==='META')target.setAttribute('content',source.getAttribute('content'));
      else target.innerHTML=source.innerHTML;
    }
  }
});
