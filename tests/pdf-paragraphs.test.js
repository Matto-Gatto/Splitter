import {test} from 'node:test';
import assert from 'node:assert/strict';
import {annotateParagraphLayout,segmentParagraphs,collectFootnotes} from '../src/pdf-paragraphs.js';
const line=(text,x,y,width=250,h=10.4)=>({text,x,y,right:x+width,h});
const page=(body,pageIndex=0)=>({body,bodySize:10.4,width:300,height:543,pageIndex,language:'it'});
function annotated(body,index=0){const p=page(body,index);annotateParagraphLayout(p,()=>null);return p;}
test('treats an entire footnote as one block despite italic and OCR font-size fluctuations',()=>{
 const p=annotated([line('Un capoverso del corpo principale che continua.',18,160),line('E termina su questa riga.',18,148,140),line('* Una nota con una prima riga in corsivo.',32,108,240,9.2),line('La nota prosegue con testo normale.',18,98,250,8.5),line('Una riga in corsivo deve restare nella nota.',18,88,250,9.3),line('Fine della nota.',18,78,110,8.5)]);
 assert.equal(p.notes.length,4);const chunks=[{page:p,lines:p.body}];assert.equal(segmentParagraphs(chunks).paragraphs.length,1);const notes=collectFootnotes(chunks);assert.equal(notes.length,1);assert.ok(notes[0].text.includes('corsivo deve restare'));assert.ok(!segmentParagraphs(chunks).paragraphs.some(t=>t.includes('nota')));
});
test('a bottom note and a punctuation artefact never interrupt continuation onto the next page',()=>{
 const a=annotated([line('Il ragionamento comincia qui e',18,88),line('continua nella pagina',18,76,250),line('.',75,58,3,20),line('* Una nota separata.',32,42,210,8.4)],0);
 const b=annotated([line('successiva, fino alla conclusione.',19,500,250)],2);const chunks=[{page:a,lines:a.body},{page:b,lines:b.body}];const result=segmentParagraphs(chunks);
 assert.deepEqual(result.paragraphs,['Il ragionamento comincia qui e continua nella pagina successiva, fino alla conclusione.']);assert.deepEqual(result.paragraphSources,[{startPage:1,endPage:3}]);assert.equal(collectFootnotes(chunks).length,1);
});
test('recognizes true indents on a skewed scan without splitting every shifted line',()=>{
 const rows=Array.from({length:16},(_,i)=>{const y=480-i*12,indent=[0,5,11].includes(i)?14:0,x=18+.035*y+indent;return line(`Riga ${i+1} del testo da mantenere nel suo capoverso`,x,y,255-indent);});
 const p=annotated(rows);const result=segmentParagraphs([{page:p,lines:p.body}]);assert.equal(result.paragraphs.length,3);assert.ok(result.paragraphs[0].startsWith('Riga 1 '));assert.ok(result.paragraphs[1].startsWith('Riga 6 '));assert.ok(result.paragraphs[2].startsWith('Riga 12 '));
});
test('uses full-page margins for a chapter starting with a short slice of the page',()=>{
 const p=annotated([line('Parte precedente del testo',18,480),line('Una riga normale del testo',18,468),line('Un’altra riga normale del testo',18,456),line('Nuovo capoverso alla fine',32,444,236),line('Altro capoverso alla fine',32,432,236)]);
 const result=segmentParagraphs([{page:p,lines:p.body.slice(3)}]);assert.equal(result.paragraphs.length,2);
});
test('detects flush-left paragraphs following short terminal lines in justified text',()=>{
 const p=annotated([line('Un capoverso giustificato comincia su questa riga',18,480),line('E prosegue fino alla sua conclusione',18,468),line('Finisce qui.',18,456,65),line('Un nuovo capoverso senza rientro comincia qui',18,444),line('E prosegue per altre due righe del testo',18,432),line('Ancora una riga del testo da conservare',18,420)]);
 assert.equal(segmentParagraphs([{page:p,lines:p.body}]).paragraphs.length,2);
});
test('does not mistake ragged-right sentence wraps for paragraph breaks',()=>{
 const p=annotated([line('Una frase.',18,480,65),line('Una frase successiva ma nello stesso capoverso',18,468,190),line('Il testo continua con un margine irregolare',18,456,215),line('Altre parole nello stesso capoverso',18,444,170),line('Fine.',18,432,30)]);
 assert.equal(segmentParagraphs([{page:p,lines:p.body}]).paragraphs.length,1);
});
test('collects two note markers separately without counting either as body paragraphs',()=>{
 const p=annotated([line('Una lunga riga del corpo principale del libro',18,180),line('Un’altra riga del corpo principale del libro',18,168),line('* Prima nota.',32,110,170,8.5),line('Continuazione della prima nota.',18,100,250,9.1),line('** Seconda nota.',32,88,180,8.8)]);
 const notes=collectFootnotes([{page:p,lines:p.body}]);assert.equal(notes.length,2);assert.deepEqual(notes.map(n=>n.marker),['*','**']);
});
