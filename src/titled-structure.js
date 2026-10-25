const unique=a=>[...new Set(a)].sort((a,b)=>a-b);
const keyOf=s=>s.normalize('NFKC').toLowerCase().replace(/[.]/g,'').replace(/\s+/g,' ').trim();
export function organizeTitledBook(book,raw=book.chapters){
 const groups=[],byPath=new Map();
 const descendantPaths=new Set(raw.filter(s=>s.kind==='section'||s.path).map(s=>keyOf(`${s.language||''}|${s.path||''}`)));
 function group(key,title,path,language){key=keyOf(key);if(byPath.has(key))return byPath.get(key);const c={title,path,language,introduction:'',subsections:[],paragraphs:[],paragraphTitles:[],detectedFootnotes:[],footnotes:[],pageIndices:[]};groups.push(c);byPath.set(key,c);return c;}
 for(let i=0;i<raw.length;i++){
  const s=raw[i],lang=s.language||'',path=s.path||'';
  const isSection=s.kind==='section'||s.kind!=='extra'&&s.kind!=='front-matter'&&path&&s.sectionNumber;
  if(isSection){
   const parts=path.split(' · ');const c=group(`${lang}|${path||'__root_sections'}`,path?parts.at(-1):book.title,path?parts.slice(0,-1).join(' · '):'',lang);c.subsections.push(s);
  }else{
   const ownPath=[path,s.title].filter(Boolean).join(' · ');
   const isParent=descendantPaths.has(keyOf(`${lang}|${ownPath}`));
   const key=isParent?`${lang}|${ownPath}`:`standalone-${i}`;
   const c=group(key,s.title,isParent?path:'',lang);c.introduction=[c.introduction,s.text].filter(Boolean).join('\n\n');c.pageIndices.push(...(s.pageIndices||[]));c.detectedFootnotes.push(...(s.detectedFootnotes||[]));c.footnotes.push(...(s.footnotes||[]));
  }
 }
 for(const c of groups){
  c.introductionPageIndices=[...c.pageIndices];c.introductionFootnotes=[...c.footnotes];c.introductionDetectedFootnotes=[...c.detectedFootnotes];
  c.paragraphs=c.subsections.map(s=>s.text);c.paragraphTitles=c.subsections.map(sectionTitle);
  c.pageIndices=unique([...c.pageIndices,...c.subsections.flatMap(s=>s.pageIndices||[])]);
  c.detectedFootnotes.push(...c.subsections.flatMap(s=>s.detectedFootnotes||[]));c.footnotes.push(...c.subsections.flatMap(s=>s.footnotes||[]));
  c.text=[c.introduction,...c.subsections.map(s=>`${sectionTitle(s)}\n\n${s.text}`)].filter(Boolean).join('\n\n');
  if(c.pageIndices.length){c.startPage=c.pageIndices[0];c.endPage=c.pageIndices.at(-1)+1;}
 }
 return {...book,rawChapters:raw,chapters:groups,organization:'titled'};
}
export function selectedTitledChapter(c,selectedSections,groupIndex){
 if(!c.subsections)return c;
 const subsections=c.subsections.filter((_,j)=>selectedSections.has(`${groupIndex}:${j}`));
 if(subsections.length===c.subsections.length)return c;
 const pageIndices=unique([...(c.introductionPageIndices||[]),...subsections.flatMap(s=>s.pageIndices||[])]);
 return {...c,subsections,paragraphs:subsections.map(s=>s.text),paragraphTitles:subsections.map(sectionTitle),pageIndices,footnotes:[...(c.introductionFootnotes||[]),...subsections.flatMap(s=>s.footnotes||[])],text:[c.introduction,...subsections.map(s=>sectionTitle(s)+'\n\n'+s.text)].filter(Boolean).join('\n\n')};
}
export function sectionTitle(s){
 const title=s.title||'Sottosezione';const n=s.sectionNumber;
 return n&&!/^(?:sezione|section|sect\.?|§)\s*/i.test(title)&&!title.startsWith(n+'.')&&!title.startsWith(n+' ')?`${n}. ${title}`:title;
}
