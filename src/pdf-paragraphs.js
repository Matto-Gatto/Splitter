// Paragraphs follow the printed layout; notes travel in a separate stream.
const quantile=(a,q=.5)=>{const b=a.filter(Number.isFinite).sort((a,b)=>a-b);return b.length?b[Math.floor((b.length-1)*q)]:0;};
const junk=s=>/^[.·_\-–—\s]+$/.test(s);
const noteMarker=s=>s.match(/^\s*(\*+|[†‡]+|\(?\d{1,3}[.)]?)\s+(?=\S)/)?.[1];
const closed=s=>/[.!?…:;][»”"’')\]]*\s*(?:\*+|\d{1,2})?\s*$/.test(s);
const startsSentence=s=>/^[«“"'‘(\[]*[\p{Lu}\d]/u.test(s);
const brokenWord=(a,b)=>/\p{L}[-‐]\s*$/u.test(a)&&/^\p{Ll}/u.test(b);
function join(a,b){if(!a)return b;return brokenWord(a,b)?a.replace(/[-‐]\s*$/,'')+b:a+' '+b;}
export function annotateParagraphLayout(page,isHeading){
 page.body=page.body.filter(l=>!junk(l.text));
 const lines=page.body,size=page.bodySize;
 const gaps=lines.slice(1).map((l,i)=>lines[i].y-l.y).filter(g=>g>size*.8&&g<size*1.6);
 const spacing=quantile(gaps)||size*1.2;let noteStart=lines.length;
 for(let i=1;i<lines.length;i++){
  const l=lines[i],prev=lines[i-1];if(l.y>page.height*.65||l.h>size*.93)continue;
  const tail=lines.slice(i).filter(l=>l.text.length>3);const smallTail=tail.filter(l=>l.h<size*.97).length/Math.max(1,tail.length);
  const marker=!!noteMarker(l.text),gap=prev.y-l.y;
  if((marker||gap>spacing*1.45)&&smallTail>=.65){noteStart=i;break;}
 }
 let titleBlock=false;
 page.body=lines.map((l,i)=>{
  const note=i>=noteStart;const structural=!note&&isHeading(l.text);
  const letters=l.text.replace(/[^\p{L}]/gu,'');const capitals=letters.length>5&&letters===letters.toUpperCase();
  const subtitle=titleBlock&&!note&&!structural&&l.text.length<190&&(l.x>page.width*.18||capitals);
  const role=structural||subtitle?'heading':note?'note':'body';
  if(structural)titleBlock=true;else if(!subtitle&&!note)titleBlock=false;
  return {...l,note,role};
 });
 page.notes=page.body.filter(l=>l.note);
 page.typography=measureTypography(page);
}
export function measureTypography(page){
 const body=page.body.filter(l=>!l.note&&l.role!=='heading');
 let sample=body.filter(l=>l.right-l.x>page.width*.5&&l.h>=page.bodySize*.85);
 if(sample.length<3)sample=body;
 const slopes=[];for(let i=0;i<sample.length;i++)for(let j=i+1;j<sample.length;j++){
  const dy=sample[i].y-sample[j].y;if(Math.abs(dy)>page.bodySize*5)slopes.push((sample[i].x-sample[j].x)/dy);
 }
 // The median pair slope rejects indented first lines and OCR outliers.
 const slope=Math.max(-.12,Math.min(.12,quantile(slopes)));
 const residual=sample.map(l=>l.x-slope*l.y);
 const left=quantile(residual,sample.length>=4?.2:0);
 const right=quantile(sample.map(l=>l.right-slope*l.y),sample.length<8?1:.9);
 const width=Math.max(page.width*.35,right-left);
 const offsets=sample.map(l=>l.x-slope*l.y-left).filter(x=>x>Math.max(2.5,page.bodySize*.32)&&x<page.width*.16);
 const indent=offsets.length>=2?Math.max(3,page.bodySize*.30,quantile(offsets)*.5):Math.max(4,page.bodySize*.45);
 const gaps=body.slice(1).map((l,i)=>body[i].y-l.y).filter(g=>g>page.bodySize*.7&&g<page.bodySize*1.7);
 const spacing=quantile(gaps)||page.bodySize*1.2;
 const justified=body.filter(l=>l.right-l.x>=width*.94).length/Math.max(1,body.length)>=.55;
 return {left,right,slope,width,indent,spacing,justified};
}
export function segmentParagraphs(chunks){
 const paragraphs=[],paragraphSources=[];let text='',start=null,last=null,previousLanguage=null,previousLine=null,previousPage=null,previousCentered=false;
 function flush(){if(text.trim()){paragraphs.push(text.replace(/[ \t]+/g,' ').trim());paragraphSources.push({startPage:start+1,endPage:last+1});}text='';start=null;}
 for(const {page,lines} of chunks){
  if(previousLanguage&&previousLanguage!==page.language){flush();previousLine=null;previousPage=null;previousCentered=false;}previousLanguage=page.language;
  const t=page.typography||measureTypography(page);
  for(const l of lines){
   if(l.note||junk(l.text))continue;
   if(l.role==='heading'){flush();previousLine=null;previousPage=null;previousCentered=false;continue;}
   const left=t.left+t.slope*l.y,offset=l.x-left;
   const indent=offset>t.indent&&offset<page.width*.17;
   const centered=offset>page.width*.18&&(l.right-l.x)<t.width*.8;
   const samePage=previousPage===page;
   const gap=samePage&&previousLine&&previousLine.y-l.y>t.spacing*1.55;
   const pt=previousPage?.typography;
   const previousWidth=previousLine?previousLine.right-previousLine.x:0;
   const shortEnd=previousLine&&pt?.justified&&previousWidth<pt.width*.82&&closed(previousLine.text)&&startsSentence(l.text);
   const listStart=/^(?:\d+[.)]|[•▪])\s+\S/.test(l.text);
   const wrapped=previousLine&&brokenWord(previousLine.text,l.text);
   if(text&&(gap||!wrapped&&(indent||shortEnd||listStart||centered!==previousCentered)))flush();
   if(start===null)start=page.pageIndex;last=page.pageIndex;text=join(text,l.text);
   previousLine=l;previousPage=page;previousCentered=centered;
  }
 }
 flush();return {paragraphs,paragraphSources};
}
export function collectFootnotes(chunks){
 const notes=[];
 for(const {page,lines} of chunks){let text='',marker='';
  const flush=()=>{if(text.trim())notes.push({page:page.pageIndex+1,marker,text:text.trim()});text='';marker='';};
  for(const l of lines.filter(l=>l.note&&!junk(l.text))){const m=noteMarker(l.text);if(m){flush();marker=m;}text=join(text,l.text);}
  flush();
 }
 return notes;
}
