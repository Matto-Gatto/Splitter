// Layout-aware, deterministic PDF analysis. No network or language-model calls.
import {clean,wordCount} from './structure.js';
import {annotateParagraphLayout,segmentParagraphs,collectFootnotes} from './pdf-paragraphs.js';
const median=a=>{const b=a.filter(Number.isFinite).sort((a,b)=>a-b);return b.length?b[Math.floor(b.length/2)]:0;};
const itWords=new Set('di che la il lo gli le una un uno del della delle degli dello dei da per con non sono si nel nella nelle al alla alle anche come questo questa questi queste ma più essere tra sulla sul suo sua loro quello quella quando perché ogni quindi fra dalle dalla era viene nostro nostre nostri alle quale tutto tutti della ossia oppure soltanto senza abbia possiamo ciò'.split(' '));
const enWords=new Set('the of and to in that is it a an we our us they their this these those which with from for as be are not but have has had all can must any by on or at there what when than them its were been would should may will into such same upon therefore only without every itself themselves nothing shall'.split(' '));
export function languageOf(text){
 const tokens=text.toLowerCase().match(/[a-zà-öø-ÿ]+/g)||[];let it=0,en=0;for(const t of tokens){if(itWords.has(t))it++;if(enWords.has(t))en++;}const n=it+en,confidence=n?Math.abs(it-en)/n:0;return {language:n>=8&&confidence>=.22?(it>en?'it':'en'):'und',it,en,confidence};
}
export function structuralHeading(text){
 const s=text.trim().replace(/^\d{1,4}\s+((?:SECTION|SEZIONE)\s*[IVXLCDM]+[.]?)$/i,'$1').replace(/[.·]+$/,'').replace(/^SEC(?:ITON|I[1lI][0Oo]N|[Iil1]ON|T[Il1][O0]N)/i,'SECTION').replace(/^SEZ[l1]ONE/i,'SEZIONE');
 const m=s.match(/^(LIBRO|BOOK|PARTE|PART|CAPITOLO|CHAPTER|SEZIONE|SECTION|SECT\.?|SEZ\.?)\s*([IVXLCDMT\d]+)\b[.:]?\s*(.*)$/i);
 if(m&&s.length<180&&!(/^(?:SECT\.?|SEZ\.?)$/i.test(m[1])&&m[3]))return {kind:/libro|book/i.test(m[1])?'book':/parte|part$/i.test(m[1])?'part':'section',number:m[2].replace(/l/g,'I').toUpperCase(),suffix:m[3]};
 if(/^(introduzione|introduction|avvertenza|advertisement|appendice|appendix|note del traduttore|glossario|bibliografia(?: critica)?|cronologia|nota editoriale)\s*[.*]?$/i.test(s))return {kind:'extra',number:s.toLowerCase()};
 return null;
}
function lineText(parts){let out='',end=null;for(const p of parts){const gap=end===null?0:p.x-end;if(out&&gap>Math.max(.6,p.h*.08)&&!out.endsWith(' '))out+=' ';out+=p.text;end=p.x+p.w;}return clean(out);}
export function layoutPage(items,width,height,pageIndex){
 const parts=items.filter(i=>typeof i.str==='string'&&i.str.trim()).map(i=>({text:i.str,x:i.transform[4],y:i.transform[5],h:Math.abs(i.height)||Math.abs(i.transform[3])||10,w:i.width||0}));
 const bodySize=median(parts.filter(p=>p.text.length>15&&p.y<height*.94).map(p=>p.h))||median(parts.map(p=>p.h))||10;
 const long=parts.filter(p=>p.w>width*.6&&p.y<height*.94&&p.h>bodySize*.8);const left=long.length?median(long.map(p=>p.x)):width*.07,right=long.length?median(long.map(p=>p.x+p.w)):width*.93;
 const indexCandidate=parts.some(p=>/^(?:SOMMARIO|(?:THE )?CONTENTS[.]?|INDICE(?: GENERALE)?)$/i.test(p.text.trim()))||parts.filter(p=>/^[IVXLCDM]+[.,;:]?\s+\S/i.test(p.text)).length>=3;
 const readingParts=parts.filter(p=>!(!indexCandidate&&/^\d{1,4}$/.test(p.text.trim())&&p.y<height*.94&&(p.x>right+bodySize*.4||p.x<left-bodySize*.6)));
 const rows=[];for(const p of readingParts.sort((a,b)=>b.y-a.y||a.x-b.x)){let row=rows.findLast(r=>Math.abs(r.y-p.y)<=Math.max(1.6,bodySize*.31));if(!row){row={y:p.y,parts:[]};rows.push(row);}row.parts.push(p);}
 const lines=rows.sort((a,b)=>b.y-a.y).map(r=>{const p=r.parts.sort((a,b)=>a.x-b.x);return {text:lineText(p),x:Math.min(...p.map(p=>p.x)),right:Math.max(...p.map(p=>p.x+p.w)),y:r.y,h:median(p.filter(p=>p.text.length>2).map(p=>p.h))||median(p.map(p=>p.h))};});
 const headerParts=parts.filter(p=>p.y>height*.94);const pageNumbers=headerParts.filter(p=>/^\d{1,4}$/.test(p.text.trim())&&(p.x<width*.18||p.x>width*.78));
 const printedPage=pageNumbers.length?Number(pageNumbers.sort((a,b)=>b.h-a.h)[0].text):null;
 const content=lines.filter(l=>l.y<height*.94);const lng=languageOf(content.map(l=>l.text).join(' '));
 return {pageIndex,width,height,bodySize,lines,printedPage,...lng};
}
function isToc(page){const text=page.lines.map(l=>l.text).join('\n');const count=page.lines.filter(l=>/^\s*[IVXLCDMIl]+[.,;:]?\s+.+\s+\d{1,4}\s*$/i.test(l.text)).length;return /sommario|contents/i.test(text.slice(0,700))&&count>=3||/indice generale/i.test(text.slice(0,700))&&page.lines.filter(l=>/\S.+\s+\d{1,4}$/.test(l.text)).length>=3;}
function titleKey(s){return s.toLowerCase().replace(/\d+/g,'#').replace(/[^a-zà-ÿ#]/g,'');}
function headers(pages){const counts=new Map();for(const p of pages){for(const l of p.lines.filter(l=>l.y>p.height*.91)){const k=titleKey(l.text);if(k)counts.set(k,(counts.get(k)||0)+1);}}return counts;}
export function preparePages(pages){
 const repeated=headers(pages);let removed=0;
 for(const p of pages){p.toc=isToc(p);const hasBody=p.lines.filter(l=>l.text.length>35).length>=5;
 p.body=p.lines.filter(l=>{const k=titleKey(l.text);const h=structuralHeading(l.text);const drop=/^\s*\d{1,4}\s*$/.test(l.text)||l.y>p.height*.94&&!h&&(hasBody||/^(?:\d+\s+)?(?:LIB[.,]|SEZ[.,]|CH[.,])/i.test(l.text)||(repeated.get(k)||0)>=3)||hasBody&&l.y>p.height*.91&&(repeated.get(k)||0)>=3&&!h;if(drop)removed++;return !drop;}).map(l=>({...l,text:clean(l.text)}));
 // Remove isolated marginal pagination without touching inline note references.
 p.body=p.body.filter(l=>!(l.x>p.width*.90&&l.text.length<8));
 p.body=p.body.filter((l,i,all)=>!(l.y>p.height*.94&&structuralHeading(l.text)?.kind==='extra'&&all.some(o=>o!==l&&o.y<p.height*.94&&titleKey(o.text)===titleKey(l.text))));
 annotateParagraphLayout(p,structuralHeading);
 const lang=languageOf(p.body.filter(l=>!l.note).map(l=>l.text).join(' '));Object.assign(p,lang);
 if(p.body.some(l=>/^(bibliografia|note del traduttore|glossario)\b/i.test(l.text)))p.language='it';
 }
 return {removed};
}
export function usefulOutline(entries,pageCount){
 const meaningful=entries.filter(e=>e.title?.trim()&&!/^\s*[\d\s._-]+[a-z]?\s*$/i.test(e.title)&&!/^page\s*\d+$/i.test(e.title));
 const valid=meaningful.filter(e=>Number.isInteger(e.page)&&e.page>=0&&e.page<pageCount);
 return {entries:valid,ignored:entries.length-valid.length};
}
function getTocEntries(pages){
 const result=[];const context={it:{},en:{},und:{}};let end=-1;
 for(const p of pages.filter(p=>p.toc)){end=Math.max(end,p.pageIndex);const ctx=context[p.language]||context.und;let pending='';
 for(const line of p.lines){const s=line.text;const heading=structuralHeading(s);
 if(heading?.kind==='book'){ctx.book=`${p.language==='en'?'Book':'Libro'} ${heading.number}`;ctx.part='';continue;}
 if(heading?.kind==='part'){ctx.part=`${p.language==='en'?'Part':'Parte'} ${heading.number}`;continue;}
 let m=s.match(/^([IVXLCDMIl]+)[.,;:]?\s+(.+)$/i);
 if(m){pending=s;}else if(pending&&s.length>5&&!/^(?:SOMMARIO|SEZ\.|PART|PARTE|BOOK|LIBRO)/i.test(s)){pending+=' '+s;}else continue;
 m=pending.match(/^([IVXLCDMIl]+)[.,;:]?\s+(.+?)\s+(\d{1,4})(?:\s+[IVXLCDM]+)?\s*$/i);
 if(m){result.push({number:m[1].replace(/l/g,'I').toUpperCase(),title:clean(m[2]),printedPage:+m[3],language:p.language,path:[ctx.book,ctx.part].filter(Boolean).join(' · ')});pending='';}
 }}
 return {entries:result,end};
}
function pageMap(pages){const map=new Map();const votes=new Map();for(const p of pages){if(p.printedPage!==null&&p.printedPage>0){if(!map.has(p.printedPage))map.set(p.printedPage,p.pageIndex);const off=p.pageIndex-p.printedPage;votes.set(off,(votes.get(off)||0)+1);}}const best=[...votes].sort((a,b)=>b[1]-a[1])[0];return {map,offset:best&&best[1]>=5?best[0]:null};}
function editDistance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[b.length];}
function findMarker(page,number){const exact=page.body.findIndex(l=>{const h=structuralHeading(l.text);return h?.kind==='section'&&h.number===number;});if(exact>=0)return exact;
 // Only repair malformed Roman labels; a valid, different section number is never guessed away.
 const canonical=/^(?=[IVXLCDM]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
 return page.body.findIndex(l=>{const h=structuralHeading(l.text);return h?.kind==='section'&&l.x>page.width*.18&&!canonical.test(h.number)&&editDistance(h.number,number)<=2;});
}
function indexBoundaries(pages,toc){
 const {map,offset}=pageMap(pages);let source=toc.entries.filter(e=>e.language==='it');if(source.length<3)source=toc.entries.filter(e=>e.language==='en');
 const found=[];for(const e of source){const idx=map.get(e.printedPage)??(offset===null?null:e.printedPage+offset);const p=pages[idx];if(!p||p.toc||p.language!==e.language)continue;let line=findMarker(p,e.number);if(line<0)continue;found.push({...e,page:p.pageIndex,line,method:'printed-toc'});
 // A facing translation is linked by a matching section number near the same page, not by parity alone.
 for(const n of [idx-1,idx+1,idx-3,idx+3,idx-5,idx+5,idx-2,idx+2]){const other=pages[n];if(!other||other.language==='und'||other.language===e.language)continue;const marker=findMarker(other,e.number);if(marker<0)continue;const titleLines=other.body.slice(marker+1,marker+4);const title=titleLines.filter((l,i)=>l.text.length<180&&!structuralHeading(l.text)&&(i===0||l.x>other.width*.20)).map(l=>l.text).join(' ');found.push({...e,title:title||`Section ${e.number}`,page:n,line:marker,language:other.language,method:'facing-toc',path:e.path.replace(/Libro/g,'Book').replace(/Parte/g,'Part')});break;}
 }
 return found;
}
function headingBoundaries(pages,tocEnd){
 const result=[],ctx={it:{},en:{},und:{}};
 for(const p of pages){if(p.toc)continue;const state=ctx[p.language]||ctx.und;
 for(let i=0;i<p.body.length;i++){const line=p.body[i],h=structuralHeading(line.text);if(!h)continue;
 if(h.kind==='book'){state.book=line.text;state.part='';continue;}if(h.kind==='part'){state.part=line.text;continue;}
 if(h.kind==='section'||h.kind==='extra'){
 const next=p.body[i+1];let title=line.text;if(h.kind==='section'&&next&&next.text.length<180&&next.x>p.width*.20&&!structuralHeading(next.text)&&next.y>line.y-p.bodySize*3.5)title+=' — '+next.text;
 result.push({page:p.pageIndex,line:i,title,number:h.number,kind:h.kind,language:p.language,path:[state.book,state.part].filter(Boolean).join(' · '),method:'heading'});
 }
 }}return result;
}
function makeChapters(pages,boundaries,language,notes){
 const stream=pages.filter(p=>language==='original'||p.language===language);if(!stream.length)return [];
 const allowed=new Set(stream.map(p=>p.pageIndex));const points=boundaries.filter(b=>allowed.has(b.page)).sort((a,b)=>a.page-b.page||a.line-b.line).filter((b,i,a)=>!i||b.page!==a[i-1].page||b.line!==a[i-1].line);
 const first=stream.find(p=>p.body.length);if(!first)return [];
 if(!points.length||points[0].page>first.pageIndex||points[0].line>0)points.unshift({page:first.pageIndex,line:0,title:language==='en'?'Front matter':'Pagine iniziali e indice',language,path:'',method:'front-matter'});
 const chapters=[];for(let i=0;i<points.length;i++){const b=points[i],end=points[i+1];const chunks=stream.filter(p=>p.pageIndex>=b.page&&(!end||p.pageIndex<=end.page)).map(p=>({page:p,lines:p.body.slice(p.pageIndex===b.page?b.line:0,end&&p.pageIndex===end.page?end.line:undefined)}));const pageIndices=chunks.filter(c=>c.lines.length).map(c=>c.page.pageIndex);
 // Chapter labels and their title block are metadata, not body paragraphs.
 const firstChunk=chunks[0];if(firstChunk&&b.method!=='front-matter'&&structuralHeading(firstChunk.lines[0]?.text||'')?.kind==='section'){
  let skip=1;while(skip<firstChunk.lines.length&&skip<=3){const line=firstChunk.lines[skip];if(line.x<=firstChunk.page.width*.18||structuralHeading(line.text))break;const known=b.method==='printed-toc'||b.method==='facing-toc'||titleKey(b.title).includes(titleKey(line.text));if(!known)break;skip++;}firstChunk.lines=firstChunk.lines.slice(skip);
 }
 const content=segmentParagraphs(chunks);const detectedFootnotes=collectFootnotes(chunks);const footnotes=notes?detectedFootnotes:[];if(!content.paragraphs.length)continue;
 chapters.push({title:b.title,path:b.path,language:language==='original'?b.language:language,method:b.method,...content,detectedFootnotes,footnotes,text:content.paragraphs.join('\n\n'),pageIndices,startPage:pageIndices[0],endPage:pageIndices.at(-1)+1,pdfApproximate:b.line>0||!!end&&end.line>0});}
 return chapters;
}
export function analyzePdf(pages,entries=[]){
 const {removed}=preparePages(pages);const outline=usefulOutline(entries,pages.length);const counts={it:0,en:0,und:0};pages.forEach(p=>counts[p.language]++);
 let transitions=0,pairs=0;for(let i=1;i<pages.length;i++)if(pages[i].language!=='und'&&pages[i-1].language!=='und'){pairs++;if(pages[i].language!==pages[i-1].language)transitions++;}
 const bilingual=counts.it>=3&&counts.en>=3;const alternating=bilingual&&transitions/Math.max(1,pairs)>.55;
 const toc=getTocEntries(pages);const printed=indexBoundaries(pages,toc);const fallback=headingBoundaries(pages,toc.end);
 let boundaries=[...printed];for(const h of fallback){if(!boundaries.some(b=>b.page===h.page&&b.line===h.line))boundaries.push(h);}
 // Accept semantic bookmarks only; page labels and scan filenames are not chapters.
 if(!printed.length&&outline.entries.length){boundaries=outline.entries.map(e=>({page:e.page,line:0,title:e.title,path:'',language:pages[e.page]?.language||'und',method:'bookmark'}));}
 const text=pages.map(p=>p.body.map(l=>l.text).join(' ')).join(' ');const replacement=(text.match(/\uFFFD/g)||[]).length;
 return {pages,boundaries,counts,bilingual,alternating,removedHeaders:removed,ignoredBookmarks:outline.ignored,printedEntries:printed.length,tocPages:pages.filter(p=>p.toc).map(p=>p.pageIndex+1),ocrWarnings:replacement>20,words:wordCount(text)};
}
export function rebuildPdf(analysis,{language='original',notes=false}={}){
 const langs=language==='both'?['it','en','und']:[language];const chapters=langs.flatMap(lang=>makeChapters(analysis.pages,analysis.boundaries,lang,notes));
 return {chapters,source:analysis.printedEntries?'Indice stampato + titoli verificati':analysis.boundaries.some(b=>b.method==='bookmark')?'Indice PDF verificato':'Titoli nel testo · da verificare',language,notes};
}
