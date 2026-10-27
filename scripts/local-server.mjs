import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,rename,readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {networkInterfaces} from 'node:os';
import {createStaticServer} from './static-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT deve essere un numero tra 1 e 65535.');
const identity={service:'folio-local',instanceId:randomUUID(),pid:process.pid,host,port};
const local=path.join(root,'.local'),state=path.join(local,`server-${port}.json`);
let server;try{server=await createStaticServer(path.join(root,'dist'),identity);}catch{console.error('Build assente. Avvia con npm start oppure esegui prima npm run build.');process.exit(1);}
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`La porta ${port} è già occupata. Apri http://127.0.0.1:${port} oppure scegli PORT diverso.`:e.message);process.exitCode=1;});
server.listen(port,host,async()=>{
 try{await mkdir(local,{recursive:true});const tmp=state+'.'+process.pid+'.tmp';await writeFile(tmp,JSON.stringify(identity,null,2));await rename(tmp,state);}catch(e){console.error('Impossibile salvare lo stato del server:',e.message);server.close();process.exitCode=1;return;}
 console.log(`\nFolio è ospitata su questo computer.\nApri: http://127.0.0.1:${port}/\n`);
 if(host==='0.0.0.0')for(const entries of Object.values(networkInterfaces()))for(const e of entries||[])if(e.family==='IPv4'&&!e.internal)console.log(`Rete locale: http://${e.address}:${port}/`);
 console.log('Per modificare il codice: npm run dev (porta 5173).\nPer fermare il server: Ctrl+C oppure Ferma-Folio.cmd.');
});
let stopping=false;async function stop(){if(stopping)return;stopping=true;try{const saved=JSON.parse(await readFile(state,'utf8'));if(saved.instanceId===identity.instanceId)await unlink(state);}catch{}server.close(()=>process.exit(0));server.closeAllConnections();setTimeout(()=>process.exit(0),2000).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
