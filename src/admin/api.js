let csrf;
async function readResponse(response) {
  let result;
  try {result=await response.json();}catch {
    const error=new Error(response.status>=500?'The admin server is temporarily unavailable. Please try again after the deployment is fixed.':'The server returned an unexpected response. Please reload and try again.');
    error.status=response.status>=400?response.status:502;throw error;
  }
  if(!result||typeof result!=='object'||Array.isArray(result)) {
    const error=new Error('The server returned an unexpected response. Please reload and try again.');error.status=502;throw error;
  }
  return result;
}
export async function api(action,method='GET',body,retry=true) {
  if(method!=='GET'&&!csrf) {
    const response=await fetch('/api/portfolio?action=csrf',{credentials:'same-origin',cache:'no-store'});
    const result=await readResponse(response);if(!response.ok){const error=new Error(result.error||'Cannot start a secure session.');error.status=response.status;throw error;}csrf=result.token;
  }
  const response=await fetch('/api/portfolio?action='+encodeURIComponent(action),{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await readResponse(response);
  if(retry&&method!=='GET'&&response.status===403&&result.error==='Your security token expired. Reload and try again.') {
    csrf=undefined;return api(action,method,body,false);
  }
  if(!response.ok) {const error=new Error(result.error||'This request could not be completed.');error.status=response.status;error.issues=result.issues;throw error;}
  return result;
}
