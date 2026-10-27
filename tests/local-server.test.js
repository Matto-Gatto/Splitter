import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createStaticServer} from '../scripts/static-server.mjs';
test('local hosting serves only built assets, handles PDF workers and HEAD, and rejects writes',async t=>{
 const base=await mkdtemp(path.join(tmpdir(),'folio-server-')),root=path.join(base,'public'),assets=path.join(root,'assets');
 await mkdir(assets,{recursive:true});await writeFile(path.join(root,'index.html'),'<h1>Folio locale</h1>');await writeFile(path.join(assets,'pdf.worker.mjs'),'export const worker = true;');await writeFile(path.join(base,'secret.txt'),'private');
 const server=await createStaticServer(root);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await unlink(path.join(root,'index.html'));await unlink(path.join(assets,'pdf.worker.mjs'));await unlink(path.join(base,'secret.txt'));await rmdir(assets);await rmdir(root);await rmdir(base);});
 const url=`http://127.0.0.1:${server.address().port}`;
 const index=await fetch(url);assert.equal(index.status,200);assert.ok((await index.text()).includes('Folio locale'));assert.equal(index.headers.get('cache-control'),'no-cache');
 const worker=await fetch(url+'/assets/pdf.worker.mjs');assert.equal(worker.status,200);assert.match(worker.headers.get('content-type'),/^text\/javascript/);
 const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.ok(Number(head.headers.get('content-length'))>0);
 assert.equal((await fetch(url+'/secret.txt')).status,404);assert.equal((await fetch(url+'/%2e%2e%5csecret.txt')).status,400);assert.equal((await fetch(url+'/.local/server-3000.json')).status,404);
 assert.equal((await fetch(url,{method:'POST',body:'no uploads'})).status,405);
});
