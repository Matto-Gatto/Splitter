import * as pdfjs from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import {clean,paragraphs,normalizePath} from './structure';
import {layoutPage,analyzePdf,rebuildPdf} from './pdf-structure.js';
pdfjs.GlobalWorkerOptions.workerSrc=worker;
const xml=s=>new DOMParser().parseFromString(s,'application/xml');
const els=(d,name)=>Array.from(d.getElementsByTagNameNS('*',name));
async function read(zip,path){const f=zip.file(path);if(!f)throw new Error('Il libro contiene un riferimento mancante: '+path);return f.async('string');}
function htmlText(doc){doc.querySelectorAll('script,style,nav').forEach(e=>e.remove());const nodes=[...doc.querySelectorAll('h1,h2,h3,h4,p,blockquote,li,pre')];return nodes.filter(n=>!nodes.some(o=>o!==n&&o.contains(n))).map(n=>clean(n.textContent)).filter(Boolean).join('\n\n')||clean(doc.body?.textContent||'');}
export async function parseEpub(file,progress){
 const zip=await JSZip.loadAsync(file);const container=xml(await read(zip,'META-INF/container.xml'));const opfPath=els(container,'rootfile')[0]?.getAttribute('full-path');if(!opfPath)throw new Error('EPUB non valido: metadati assenti.');
 const opf=xml(await read(zip,opfPath));const items=els(opf,'item');const title=els(opf,'title')[0]?.textContent||file.name.replace(/\.epub$/i,'');const author=els(opf,'creator')[0]?.textContent||'Autore non indicato';
 const nav=items.find(i=>(i.getAttribute('properties')||'').split(' ').includes('nav'));let entries=[];
 if(nav){const navPath=normalizePath(opfPath,nav.getAttribute('href'));const d=new DOMParser().parseFromString(await read(zip,navPath),'text/html');const toc=[...d.querySelectorAll('nav')].find(n=>n.getAttribute('epub:type')==='toc'||n.getAttribute('role')==='doc-toc')||d.querySelector('nav');entries=[...(toc?.querySelectorAll('a[href]')||[])].map(a=>({title:clean(a.textContent),href:a.getAttribute('href'),base:navPath}));}
 if(!entries.length){const ncx=items.find(i=>i.getAttribute('media-type')==='application/x-dtbncx+xml');if(ncx){const base=normalizePath(opfPath,ncx.getAttribute('href'));const d=xml(await read(zip,base));entries=els(d,'navPoint').map(n=>({title:els(n,'text')[0]?.textContent,href:els(n,'content')[0]?.getAttribute('src'),base})).filter(e=>e.href);}}
 const source=entries.length?'Indice EPUB':'Ordine di lettura EPUB';
 if(!entries.length)entries=els(opf,'itemref').map((ref,i)=>{const item=items.find(it=>it.id===ref.getAttribute('idref'));return item?{title:'Capitolo '+(i+1),href:item.getAttribute('href'),base:opfPath}:null;}).filter(Boolean);
 const chapters=[];for(let i=0;i<entries.length;i++){progress(`Lettura del capitolo ${i+1} di ${entries.length}…`);const e=entries[i];const path=normalizePath(e.base,e.href);const d=new DOMParser().parseFromString(await read(zip,path),'text/html');const fragment=decodeURIComponent(e.href.split('#')[1]||'');const next=entries[i+1];let text;
 if(fragment||next&&normalizePath(next.base,next.href)===path){const start=fragment?d.getElementById(fragment):d.body;const end=next&&normalizePath(next.base,next.href)===path?d.getElementById(decodeURIComponent(next.href.split('#')[1]||'')):null;if(!start)throw new Error('Voce dell’indice non trovata: '+e.title);const range=d.createRange();if(start===d.body)range.setStart(d.body,0);else range.setStartBefore(start);if(end&&end!==start)range.setEndBefore(end);else range.setEnd(d.body,d.body.childNodes.length);const section=d.createElement('section');section.append(range.cloneContents());text=htmlText(section);}else text=htmlText(d);
 if(text)chapters.push({title:e.title||`Capitolo ${i+1}`,text,paragraphs:paragraphs(text)});
 }if(!chapters.length)throw new Error('Nessun testo leggibile trovato nell’EPUB.');return {title,author,chapters,source,type:'EPUB'};
}
export async function parsePdf(file,progress){
 const bytes=new Uint8Array(await file.arrayBuffer());let pdf,task;
 try{
 task=pdfjs.getDocument({data:bytes.slice(),useSystemFonts:true});pdf=await task.promise;const pages=[];
 for(let n=1;n<=pdf.numPages;n++){
  progress(`Analisi dell’impaginazione · pagina ${n} di ${pdf.numPages}…`);
  const page=await pdf.getPage(n),content=await page.getTextContent(),viewport=page.getViewport({scale:1});
  pages.push(layoutPage(content.items,viewport.width,viewport.height,n-1));page.cleanup();
  if(n%8===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(pages.reduce((n,p)=>n+p.lines.reduce((s,l)=>s+l.text.length,0),0)<30)throw new Error('Questo PDF sembra una scansione senza testo OCR. Serve prima il riconoscimento del testo.');
 const meta=await pdf.getMetadata().catch(()=>null);const outline=await pdf.getOutline();const entries=[];
 async function walk(nodes){for(const node of nodes){try{const dest=typeof node.dest==='string'?await pdf.getDestination(node.dest):node.dest;if(dest){const index=typeof dest[0]==='number'?dest[0]:await pdf.getPageIndex(dest[0]);entries.push({title:node.title,page:index});}}catch{}if(node.items?.length)await walk(node.items);}}
 if(outline)await walk(outline);progress('Verifica dell’indice e separazione delle lingue…');await new Promise(resolve=>setTimeout(resolve,0));
 const analysis=analyzePdf(pages,entries);const language=analysis.bilingual?'it':'original';const result=rebuildPdf(analysis,{language});
 return {title:meta?.info?.Title||file.name.replace(/\.pdf$/i,''),author:meta?.info?.Author||'Autore non indicato',...result,analysis,type:'PDF',bytes,pages:pdf.numPages,ocrSource:/capture|ocr/i.test(meta?.info?.Producer||'')};
 }finally{if(task)await task.destroy();}
}
