import {PDFDocument} from 'pdf-lib';
import {sectionTitle} from './titled-structure.js';
export const fileSlug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9\- ]/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'paragrafo';
export function chapterJson(c){return {title:c.title,path:c.path,language:c.language,introduction:c.introduction,paragraphs:c.subsections?c.subsections.map(s=>({title:s.title,number:s.sectionNumber,text:s.text,pdfPages:s.pageIndices?.map(p=>p+1),footnotes:s.footnotes})):c.paragraphs,footnotes:c.footnotes,pdfPages:c.pageIndices?.map(p=>p+1)};}
export async function writeSubsectionFiles(zip,c,path,format,original){
 if(!c.subsections)return;
 for(let j=0;j<c.subsections.length;j++){
  const s=c.subsections[j],title=sectionTitle(s),base=`${path}/paragrafi/${String(j+1).padStart(3,'0')}-${fileSlug(title)}`;
  const notes=s.footnotes?.length?'\n\nNote\n\n'+s.footnotes.map(n=>`[PDF p. ${n.page}] ${n.text}`).join('\n\n'):'';
  if(format==='json')zip.file(base+'.json',JSON.stringify({title:s.title,number:s.sectionNumber,text:s.text,path:s.path,language:s.language,pdfPages:s.pageIndices?.map(p=>p+1),footnotes:s.footnotes},null,2));
  else zip.file(base+(format==='md'?'.md':'.txt'),`${format==='md'?'# ':''}${title}\n\n${s.text}${notes}`);
  if(format==='pdf'&&original&&s.pageIndices?.length){const doc=await PDFDocument.create();const pages=await doc.copyPages(original,s.pageIndices);pages.forEach(p=>doc.addPage(p));zip.file(base+'.pdf',await doc.save());}
 }
}
