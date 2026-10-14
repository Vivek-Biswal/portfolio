import { readFile } from 'node:fs/promises';
import { handleRequest } from './handler.mjs';
const pages={'/':'index','/index.html':'index','/1d/':'1d','/1d/index.html':'1d','/2d/':'2d','/2d/index.html':'2d','/3d/':'3d','/3d/index.html':'3d','/work/dimensional-portfolio.html':'project','/work/notes.html':'notes','/work/now.html':'now'};
const templates={index:'index.html','1d':'1d/index.html','2d':'2d/index.html','3d':'3d/index.html',project:'work/dimensional-portfolio.html',notes:'work/notes.html',now:'work/now.html',admin:'admin/dashboard/index.html'};
function attach(server,development){server.middlewares.use(async(req,res,next)=>{
  const original=new URL(req.url,'http://localhost');const path=original.pathname;
  if(path==='/0d/vivek-biswal.txt'||path==='/0d/vivek-biswal.vcf') {
    req.url='/api/portfolio?action='+(path.endsWith('.txt')?'profile':'contact-card');await handleRequest(req,res);return;
  }
  if(path==='/admin/login'){res.statusCode=302;res.setHeader('Location','/admin/login/');res.end();return;}
  const admin=path.startsWith('/admin')&&!['/admin/login/','/admin/login/index.html'].includes(path);
  if(!pages[path]&&!admin&&path!=='/api/portfolio'){next();return;}
  if(pages[path])req.url=`/api/portfolio?action=public&page=${pages[path]}`;
  if(admin)req.url='/api/portfolio?action=admin-page';
  await handleRequest(req,res,development?{template:async name=>{
    const key=name.replace('.html','');const source=await readFile(templates[key],'utf8');
    return ['index','1d','project','notes','now'].includes(key)?source:server.transformIndexHtml('/'+templates[key],source);
  }}:{});
});}
export function contentServerPlugin(){return {name:'portfolio-content-server',configureServer(server){attach(server,true);},configurePreviewServer(server){attach(server,false);}};}
