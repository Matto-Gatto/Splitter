export const clean = s => s.replace(/\u00ad/g,'').replace(/[ \t]+/g,' ').trim();
export function paragraphs(text) { return text.split(/\n\s*\n/).map(clean).filter(Boolean); }
export function heading(line) {return /^(?:(?:capitolo|chapter|parte|part|libro|book)\s+(?:\d+|[ivxlcdm]+|primo|secondo|terzo|quarto|quinto)\b|(?:prologo|epilogo|introduzione|prefazione|conclusione|prologue|epilogue)\b)/i.test(line.trim()) && line.length < 180;}
export function fromHeadings(text) {
 const lines=text.split('\n');const result=[];let title='Inizio del libro',body=[];
 for(const line of lines){if(heading(line)){if(body.join('').trim())result.push({title,text:body.join('\n')});title=clean(line);body=[];}else body.push(line);}
 if(body.join('').trim())result.push({title,text:body.join('\n')});
 return result.map(c=>({...c,paragraphs:paragraphs(c.text)}));
}
export function normalizePath(base,href){const bits=(base.slice(0,base.lastIndexOf('/')+1)+href.split('#')[0]).split('/');const out=[];for(const bit of bits){if(bit==='..')out.pop();else if(bit!=='.')out.push(bit);}return decodeURIComponent(out.join('/'));}
export const wordCount = text => text.trim().split(/\s+/).filter(Boolean).length;
