import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { renderPublic } from '../server/render-public.mjs';
import defaults from '../content/defaults.json' with {type:'json'};
const pages={'index.html':'index','1d/index.html':'1d','2d/index.html':'2d','3d/index.html':'3d','work/dimensional-portfolio.html':'project','work/notes.html':'notes','work/now.html':'now'};
await mkdir('server/generated',{recursive:true});
for(const [file,key] of Object.entries(pages)) {
  const template=await readFile('dist/'+file,'utf8');
  await writeFile('server/generated/'+key+'.html',template);
  await writeFile('dist/'+file,renderPublic(template,key,defaults));
}
const admin=await readFile('dist/admin/dashboard/index.html','utf8');
await writeFile('server/generated/admin.html',admin);
await unlink('dist/admin/dashboard/index.html');
console.log('Packaged server-rendered content templates; dashboard HTML is excluded from public files.');
