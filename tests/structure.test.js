import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fromHeadings,paragraphs,normalizePath,wordCount} from '../src/structure.js';
test('finds chapters without losing introductory text',()=>{const c=fromHeadings('Dedica\n\nCapitolo I\nPrimo paragrafo.\n\nSecondo paragrafo.\nCapitolo II\nUltimo.');assert.equal(c.length,3);assert.equal(c[1].paragraphs.length,2);assert.equal(c[2].title,'Capitolo II');assert.equal(c[0].text.trim(),'Dedica');});
test('keeps wrapped lines in the same paragraph',()=>{assert.deepEqual(paragraphs('Una riga\ncontinua.\n\nUn’altra.'),['Una riga\ncontinua.','Un’altra.']);});
test('resolves EPUB relative paths and fragments',()=>{assert.equal(normalizePath('OPS/nav/toc.xhtml','../text/ch1.xhtml#start'),'OPS/text/ch1.xhtml');});
test('supports books without identifiable headings',()=>{assert.equal(fromHeadings('Testo senza titoli.')[0].paragraphs[0],'Testo senza titoli.');assert.equal(wordCount(' Uno due\n tre '),3);});
