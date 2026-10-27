import {readFile,unlink} from 'node:fs/promises';
const port=Number(process.env.PORT||3000),state=new URL(`../.local/server-${port}.json`,import.meta.url);
let saved;try{saved=JSON.parse(await readFile(state,'utf8'));}catch{console.log('Nessun server Folio registrato su questa porta.');process.exit(0);}
try{
 const response=await fetch(`http://127.0.0.1:${port}/__folio_health`,{signal:AbortSignal.timeout(3000)});
 const health=await response.json();
 if(health.service!=='folio-local'||health.instanceId!==saved.instanceId||health.pid!==saved.pid)throw new Error('Il processo attivo non corrisponde al server registrato.');
 process.kill(saved.pid,'SIGTERM');try{await unlink(state);}catch{}console.log('Server Folio arrestato.');
}catch(e){console.error('Server non arrestato:',e.message);process.exitCode=1;}
