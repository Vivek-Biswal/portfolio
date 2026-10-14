let csrf;
export async function api(action,method='GET',body,retry=true) {
  if(method!=='GET'&&!csrf) {
    const response=await fetch('/api/portfolio?action=csrf',{credentials:'same-origin',cache:'no-store'});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Cannot start a secure session.');csrf=result.token;
  }
  const response=await fetch('/api/portfolio?action='+encodeURIComponent(action),{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json();
  if(retry&&method!=='GET'&&response.status===403&&result.error==='Your security token expired. Reload and try again.') {
    csrf=undefined;return api(action,method,body,false);
  }
  if(!response.ok) {const error=new Error(result.error||'This request could not be completed.');error.status=response.status;error.issues=result.issues;throw error;}
  return result;
}
