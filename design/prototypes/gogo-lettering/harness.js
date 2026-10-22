(() => {
  const root=document.getElementById('gogo-lettering-exploration');
  const stage=root.querySelector('#stage');
  const template=document.getElementById('gogo-lettering-template');
  const picker=root.querySelector('.proto-picker');
  const highlight=picker.querySelector('.proto-picker-highlight');
  const items=[...picker.querySelectorAll('.proto-picker-item')];
  const saved=window.openai?.widgetState?.privateContent||{};
  const prefs=saved.surface==='lettering'?saved:{tab:'reminders'};
  const shared={preferences:{tab:'reminders',...prefs},design:{content:'full',textSize:'standard'}};
  let current=0,app=null,mountFrame=0;
  function moveHighlight(){const el=items[current];highlight.style.width=el.offsetWidth+'px';highlight.style.transform=`translateX(${el.offsetLeft}px)`;}
  function mount(i){
    cancelAnimationFrame(mountFrame);app?.snapshot();app?.destroy();app=null;stage.innerHTML='';
    mountFrame=requestAnimationFrame(()=>{stage.innerHTML=template.innerHTML;app=startGoDog(document.getElementById('gogo-lettering'),letteringDirections[i],shared);});
  }
  function setActive(i,persist=true){
    if(i<0||i>=letteringDirections.length)return;
    current=i;items.forEach((el,j)=>{el.toggleAttribute('data-active',j===i);if(j===i)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');});
    moveHighlight();try{const url=new URL(location);url.searchParams.set('v',i+1);history.replaceState(null,'',url);}catch{}
    mount(i);
    if(persist)window.openai?.setWidgetState?.({modelContent:{surface:'提醒页字体与图标对照',variant:letteringDirections[i].name},privateContent:{...shared.preferences,surface:'lettering',variant:letteringDirections[i].lettering}})?.catch(()=>{});
  }
  items.forEach((el,i)=>el.addEventListener('click',()=>setActive(i)));
  window.addEventListener('resize',moveHighlight);
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||/^(INPUT|TEXTAREA|SELECT|VIDEO)$/.test(e.target.tagName)||e.target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;
    const n=parseInt(e.key,10);
    if(n>=1&&n<=items.length)setActive(n-1);
    else if(e.key==='ArrowRight')setActive((current+1)%items.length);
    else if(e.key==='ArrowLeft')setActive((current-1+items.length)%items.length);
    else if(e.key.toLowerCase()==='r')mount(current);
  });
  const urlIndex=parseInt(new URLSearchParams(location.search).get('v'),10)-1;
  const hostIndex=letteringDirections.findIndex(d=>d.lettering===prefs.variant);
  setActive(Number.isInteger(urlIndex)&&urlIndex>=0&&urlIndex<items.length?urlIndex:Math.max(0,hostIndex),false);
  requestAnimationFrame(()=>requestAnimationFrame(()=>picker.setAttribute('data-ready','')));
  window.addEventListener('openai:set_globals',event=>{
    const next=event.detail?.globals?.widgetState?.privateContent;if(next?.surface!=='lettering')return;
    const i=letteringDirections.findIndex(d=>d.lettering===next.variant);if(i>=0&&i!==current){shared.preferences={...shared.preferences,...next};setActive(i,false);}
  });
  if(globalThis.Tweak){
    const tweak=new Tweak({container:root,onChange:()=>app?.configure('textSize',shared.design.textSize)});
    tweak.addSelect(shared.design,'textSize',{label:'文字大小',options:[{label:'常规',value:'standard'},{label:'放大',value:'large'}]});
  }
})();
