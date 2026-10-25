export function preserveWorkspaceScroll(update){
 const list=document.querySelector('.chapter-list');
 const top=list?.scrollTop||0,left=list?.scrollLeft||0,x=window.scrollX,y=window.scrollY;
 const focused=document.activeElement;let focusSelector=null;
 if(focused?.hasAttribute('data-section-check'))focusSelector=`[data-section-check="${focused.getAttribute('data-section-check')}"]`;
 else if(focused?.hasAttribute('data-group-check'))focusSelector=`[data-group-check="${focused.getAttribute('data-group-check')}"]`;
 else if(focused?.hasAttribute('data-check'))focusSelector=`[data-check="${focused.getAttribute('data-check')}"]`;
 else if(focused?.id==='all')focusSelector='#all';
 update();
 const next=document.querySelector('.chapter-list');if(next){next.scrollTop=top;next.scrollLeft=left;}
 if(focusSelector)document.querySelector(focusSelector)?.focus({preventScroll:true});
 window.scrollTo({left:x,top:y,behavior:'instant'});
}
