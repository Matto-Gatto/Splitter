import JSZip from 'jszip';
import {writeFile} from 'node:fs/promises';
for(const mode of ['nested','headings']){
 const z=new JSZip();z.file('mimetype','application/epub+zip');z.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');z.file('OPS/book.opf','<package><metadata><title>Indice strutturato '+mode+'</title><creator>Folio</creator></metadata><manifest><item id="nav" href="nav.xhtml" properties="nav"/><item id="ch" href="chapter.xhtml"/></manifest><spine><itemref idref="ch"/></spine></package>');
 z.file('OPS/nav.xhtml',`<html><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml#chapter">Capitolo I</a>${mode==='nested'?'<ol><li><a href="chapter.xhtml#s1">1. Le idee</a></li><li><a href="chapter.xhtml#s2">2. Le impressioni</a></li></ol>':''}</li></ol></nav></body></html>`);
 z.file('OPS/chapter.xhtml','<html><body><h1 id="chapter">Capitolo I</h1><p>Introduzione al capitolo.</p><h2 id="s1">1. Le idee</h2><p>Primo capoverso della prima sottosezione.</p><p>Secondo capoverso della stessa sottosezione.</p><h2 id="s2">2. Le impressioni</h2><p>Una seconda sottosezione, con il suo testo.</p></body></html>');
 await writeFile(`${process.argv[2]}/hierarchy-${mode}.epub`,await z.generateAsync({type:'nodebuffer'}));
}
