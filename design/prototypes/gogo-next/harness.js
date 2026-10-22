(() => {
  const directions=[cinemaDirection,journalDirection,everydayDirection];
  const stage=document.getElementById('stage');
  const picker=document.querySelector('.proto-picker');
  const highlight=picker.querySelector('.proto-picker-highlight');
  const items=[...picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)')];
  const replay=picker.querySelector('.proto-picker-replay');
  const template=document.getElementById('gogo-next-template');
  const prefs=window.openai?.widgetState?.privateContent||{};
  const shared={preferences:prefs,design:{content:'full',textSize:'standard'}};
  const variants=directions.map(direction=>()=>template.innerHTML);
  let current=0,app=null,mountFrame=0;

  function moveHighlight(){
    const el=items[current];
    highlight.style.width=el.offsetWidth+'px';
    highlight.style.transform=`translateX(${el.offsetLeft}px)`;
  }
  function mount(i){
    cancelAnimationFrame(mountFrame);
    app?.snapshot();app?.destroy();app=null;
    stage.innerHTML='';
    mountFrame=requestAnimationFrame(()=>{
      stage.innerHTML=variants[i]();
      app=startGoDog(document.getElementById('gogo-next'),directions[i],shared);
    });
  }
  function setActive(i,persist=true){
    if(i<0||i>=variants.length)return;
    current=i;
    items.forEach((el,j)=>{
      el.toggleAttribute('data-active',j===i);
      if(j===i)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');
    });
    moveHighlight();
    // Same URL contract as PICKER.md for standalone use. A srcdoc sandbox
    // cannot replace history, so the embedded surface uses host preferences.
    try{const url=new URL(location);url.searchParams.set('v',i+1);history.replaceState(null,'',url);}catch{}
    mount(i);
    if(persist){
      const saved={...shared.preferences,variant:directions[i].id};
      window.openai?.setWidgetState?.({modelContent:{variant:directions[i].name},privateContent:saved})?.catch(()=>{});
    }
  }
  items.forEach((el,i)=>el.addEventListener('click',()=>setActive(i)));
  replay?.addEventListener('click',()=>mount(current));
  window.addEventListener('resize',moveHighlight);
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||/^(INPUT|TEXTAREA|SELECT|VIDEO)$/.test(e.target.tagName)||e.target.isContentEditable)return;
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    const num=parseInt(e.key,10);
    if(num>=1&&num<=variants.length)setActive(num-1);
    else if(e.key==='ArrowRight')setActive((current+1)%variants.length);
    else if(e.key==='ArrowLeft')setActive((current-1+variants.length)%variants.length);
    else if(e.key==='r'||e.key==='R')mount(current);
  });
  const fromUrl=parseInt(new URLSearchParams(location.search).get('v'),10)-1;
  const fromHost=directions.findIndex(d=>d.id===prefs.variant);
  setActive(Number.isInteger(fromUrl)&&fromUrl>=0&&fromUrl<3?fromUrl:Math.max(0,fromHost),false);
  requestAnimationFrame(()=>requestAnimationFrame(()=>picker.setAttribute('data-ready','')));
  window.addEventListener('openai:set_globals',event=>{
    const next=event.detail?.globals?.widgetState?.privateContent;
    if(!next)return;
    const index=directions.findIndex(d=>d.id===next.variant);
    if(index>=0&&index!==current){shared.preferences={...shared.preferences,...next};setActive(index,false);}
  });
  if(globalThis.Tweak){
    let appliedContent=shared.design.content;
    const tweak=new Tweak({container:document.getElementById('gogo-exploration'),onChange:()=>{
      if(appliedContent!==shared.design.content){appliedContent=shared.design.content;app?.configure('content',appliedContent);}
      app?.configure('textSize',shared.design.textSize);
    }});
    tweak.addSelect(shared.design,'content',{label:'内容状态',options:[{label:'多条内容',value:'full'},{label:'刚开始记录',value:'few'},{label:'还没有记录',value:'empty'}]});
    tweak.addSelect(shared.design,'textSize',{label:'文字大小',options:[{label:'常规',value:'standard'},{label:'放大',value:'large'}]});
  }
})();
