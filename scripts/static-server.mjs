import http from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import path from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8'};
export async function createStaticServer(directory,health){
 const root=await realpath(directory);
 const inside=p=>{const relative=path.relative(root,p);return relative===''||!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
 return http.createServer((req,res)=>{
  const send=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':message);};
  async function serve(){
   if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,'Metodo non consentito.');}
   let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return send(400,'Indirizzo non valido.');}
   if(name.includes('\\')||name.includes('\0'))return send(400,'Percorso non valido.');
   if(name==='/__folio_health'&&health){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':JSON.stringify(health));return;}
   const candidate=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!inside(candidate))return send(403,'Percorso non disponibile.');
   let file,info;try{file=await realpath(candidate);if(!inside(file))return send(403,'Percorso non disponibile.');info=await stat(file);}catch{return send(404,'File non trovato.');}
   if(!info.isFile())return send(404,'File non trovato.');
   res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':name.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});
   if(req.method==='HEAD')return res.end();
   const stream=createReadStream(file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }
  serve().catch(()=>{if(!res.headersSent)send(500,'Errore nella lettura del file.');else res.destroy();});
 });
}
