import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { renderPublic } from '../server/render-public.mjs';
import defaults from '../content/defaults.json' with {type:'json'};
const pages={'index.html':'index','1d/index.html':'1d','2d/index.html':'2d','3d/index.html':'3d','work/dimensional-portfolio.html':'project','work/notes.html':'notes','work/now.html':'now'};
// Vercel serves matching files before rewrites. Hosted pages must therefore live
// only in the function bundle, or the static defaults would shadow CMS content.
const serverOnly=process.env.VERCEL==='1'||process.argv.includes('--server-only');
await mkdir('server/generated',{recursive:true});
for(const [file,key] of Object.entries(pages)) {
  const template=await readFile('dist/'+file,'utf8');
  await writeFile('server/generated/'+key+'.html',template);
  if(serverOnly)await unlink('dist/'+file);
  else await writeFile('dist/'+file,renderPublic(template,key,defaults));
}
const admin=await readFile('dist/admin/dashboard/index.html','utf8');
await writeFile('server/generated/admin.html',admin);
await unlink('dist/admin/dashboard/index.html');
if(serverOnly) {
  for(const file of ['0d/vivek-biswal.txt','0d/vivek-biswal.vcf']) {
    await unlink('dist/'+file).catch(error=>{if(error.code!=='ENOENT')throw error;});
  }
}
console.log(serverOnly
  ?'Packaged hosted CMS templates; managed pages and downloads are served only through server rewrites.'
  :'Packaged server templates and offline static pages; dashboard HTML is excluded from public files.');
