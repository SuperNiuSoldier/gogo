(() => {
  'use strict';
  const root = document.getElementById('gogo-life');
  const view = root.querySelector('.app-view');
  const overlay = root.querySelector('.overlay-host');
  const base = root.querySelector('.app-base');
  const pets = {rouqiu:{name:'肉球',cell:0},gelin:{name:'格林',cell:6}};
  const kinds = {food:['喂食','cooking-pot'],water:['喝水','droplet'],pee:['尿尿','droplets'],poop:['便便','paw-print'],walk:['遛狗','footprints'],diary:['日记','notebook-pen']};
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const iso = d => d.toISOString().slice(0,10);
  const dateObj = d => new Date(d+'T12:00:00Z');
  const addDays = (d,n) => {const x=dateObj(d);x.setUTCDate(x.getUTCDate()+n);return iso(x);};
  const dateText = d => d.replace(/-/g,'.');
  const shortDate = d => `${Number(d.slice(5,7))}.${Number(d.slice(8,10))}`;
  const weekText = d => ['周日','周一','周二','周三','周四','周五','周六'][dateObj(d).getUTCDay()];
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => globalThis.crypto?.randomUUID?.() || 'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const ib = (action,name,label,attrs='') => `<button type="button" class="icon-button" data-action="${action}" aria-label="${esc(label)}" ${attrs}>${icon(name)}</button>`;
  const pill = (action,label,name='plus',attrs='') => `<button type="button" class="pill-button" data-action="${action}" ${attrs}>${icon(name)}${label}</button>`;
  const pref = window.openai?.widgetState?.privateContent || {};
  const state = {pet:pets[pref.pet]?pref.pet:'rouqiu',theme:['dark','light'].includes(pref.theme)?pref.theme:'light',tab:['album','prints','weight','reminders'].includes(pref.tab)?pref.tab:'album',prints:'diary',card:0,weight:'timeline',day:today,month:false};
  let data = seed(), modal=null, editor=null, returnModal=null, lastFocus=null, toastTimer, undoAction=null, playTimer=null, viewerIndex=0, importContext=null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const design = {content:'full',textSize:'standard'};

  function seed(){
    const result={photos:[],entries:[],weights:[],reminders:[]};
    const captions={rouqiu:['风把耳朵吹得圆圆的。','下午三点，睡意准时到。','一听见零食袋就坐好了。','抬头看看今天的天空。','走过这条路，又回头等我。','到家了，歇一会儿。'],gelin:['两只小爪子，整整齐齐。','今天也很会找舒服的位置。','散步的时候一直在笑。','听见我叫你，马上回头。','最喜欢的那条小路。','再赖五分钟吧。']};
    for(const [pet,p] of Object.entries(pets)){
      for(let i=0;i<6;i++)result.photos.push({id:`${pet}-photo-${i}`,pet,cell:p.cell+i,date:addDays(today,-[0,2,6,13,24,40][i]),caption:captions[pet][i],source:'album'});
      const texts=pet==='rouqiu'?['在草地上坐了好久。\n风一吹，毛都蓬起来了。\n叫你回家，还假装没听见。','把下巴搁在沙发边，\n眼睛越来越小。\n今天的午觉，有一点长。','散步回来抬起一只爪子，\n认真等着擦脚。\n乖乖的小朋友。']:['趴下来也要把爪子摆好，\n叫一声格林，耳朵就动了。\n今天也是黏人的小尾巴。','窝在最软的靠垫旁边，\n只露出两点小眉毛。\n偷懒也太可爱了。','出门的时候特别开心，\n一路都要走在前面，\n又不忘回头看看我。'];
      [0,1,2].forEach((i)=>result.entries.push({id:`${pet}-diary-${i}`,pet,kind:'diary',text:texts[i],photoId:`${pet}-photo-${i}`,date:addDays(today,-[0,2,6][i]),time:[nowTime(),'15:20','10:06'][i]}));
      result.entries.push({id:`${pet}-food`,pet,kind:'food',date:today,time:'08:10',text:''},{id:`${pet}-walk`,pet,kind:'walk',date:today,time:'07:35',text:'小区散步'});
      [0,13,24,40].forEach((offset,i)=>result.weights.push({id:`${pet}-weight-${i}`,pet,date:addDays(today,-offset),value:(pet==='rouqiu'?[24.6,24.3,23.8,23.5]:[8.6,8.5,8.3,8.2])[i],photoId:`${pet}-photo-${[0,3,4,5][i]}`,note:['乖乖站好了','精神满满','毛茸茸的一团',''][i]}));
      result.reminders.push({id:`${pet}-reminder-0`,pet,title:'洗澡',date:today,time:'18:30',kind:'bath',done:false},{id:`${pet}-reminder-1`,pet,title:'剪指甲',date:today,time:'20:00',kind:'care',done:false},{id:`${pet}-reminder-2`,pet,title:'晨间散步',date:today,time:'07:30',kind:'walk',done:true},{id:`${pet}-reminder-3`,pet,title:'洗狗窝',date:addDays(today,2),time:'10:00',kind:'care',done:false});
    }
    return result;
  }
  const photos = pet => data.photos.filter(p=>p.pet===(pet||state.pet)).sort((a,b)=>b.date.localeCompare(a.date));
  const entries = (diaries=false) => data.entries.filter(e=>e.pet===state.pet&&(!diaries||e.kind==='diary')).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const weights = () => data.weights.filter(w=>w.pet===state.pet).sort((a,b)=>b.date.localeCompare(a.date));
  function photo(id,extra='',label=''){
    const p=typeof id==='object'?id:data.photos.find(p=>p.id===id);
    if(!p)return `<span class="weight-no-photo">${icon('image')}</span>`;
    const alt=esc(label||`${pets[p.pet].name}，${p.caption||dateText(p.date)}`);
    if(p.url)return `<span class="photo ${extra}"><img src="${esc(p.url)}" alt="${alt}" draggable="false"></span>`;
    return `<span class="photo sample-photo ${extra}" role="img" aria-label="${alt}" style="--photo-x:${p.cell%3*50}%;--photo-y:${Math.floor(p.cell/3)*100/3}%"></span>`;
  }
  function savePrefs(){window.openai?.setWidgetState?.({modelContent:{page:state.tab,pet:pets[state.pet].name,theme:state.theme},privateContent:{pet:state.pet,theme:state.theme,tab:state.tab}})?.catch(()=>{});}
  function icons(){globalThis.lucide?.createIcons({attrs:{width:21,height:21,'stroke-width':1.6}});}
  let disposeDiary=()=>{};
  function render(){
    disposeDiary();
    root.dataset.theme=state.theme;
    root.style.setProperty('--size',design.textSize==='large'?'1.25':'1');
    root.querySelector('.pet-switch').innerHTML=Object.entries(pets).map(([id,p])=>`<button type="button" class="pet-tab" data-action="pet" data-pet="${id}" aria-pressed="${state.pet===id}" aria-label="切换到${p.name}">${photo({pet:id,cell:p.cell,caption:'头像'})}<span>${p.name}</span></button>`).join('');
    const theme=root.querySelector('.theme-button');theme.setAttribute('aria-label',`切换到${state.theme==='light'?'黑棕':'奶白'}主题`);theme.innerHTML=icon(state.theme==='light'?'moon':'sun');
    root.querySelector('.bottom-nav').innerHTML=[['prints','脚印','notebook-text'],['album','相册','images'],['camera','拍照','camera'],['weight','体重','chart-no-axes-combined'],['reminders','提醒','bell']].map(([id,label,symbol])=>`<button type="button" class="nav-item ${id==='camera'?'nav-camera':''}" data-action="${id==='camera'?'camera':'tab'}" data-tab="${id}" ${state.tab===id?'aria-current="page"':''}><span class="nav-symbol">${icon(symbol)}</span><span>${label}</span></button>`).join('');
    view.innerHTML=({album:albumPage,prints:printsPage,weight:weightPage,reminders:remindersPage}[state.tab])();icons();bindDiaryScroll();
  }
  function heading(title,actions){return `<div class="page-heading"><h1>${title}</h1><div class="heading-actions">${actions||''}</div></div>`;}
  function empty(symbol,text,action,label){return `<div class="empty"><span class="empty-mark">${icon(symbol)}</span><p>${text}</p>${action?pill(action,label):''}</div>`;}
  function albumPage(){
    const list=photos();
    const actions=ib('import','image-plus','从相册添加照片')+ib('play','circle-play','播放照片',list.length<2?'disabled':'')+ib('menu','ellipsis','更多');
    let content=empty('images','留住今天的第一张照片','import','选张照片');
    if(list.length){const d=list[0].date;content=`<div class="album-month"><small>${d.slice(0,4)} · ${Number(d.slice(5,7))}月</small><small>${list.length} 张</small></div><div class="collage" data-count="${list.length}">${list.slice(0,6).map((p,i)=>`<button type="button" class="photo-print" data-action="photo" data-id="${p.id}" aria-label="查看${pets[state.pet].name}的照片，${dateText(p.date)}">${photo(p)}<time>${shortDate(p.date)} · ${weekText(p.date)}</time></button>`).join('')}</div>${list.length>6?`<div class="album-extra">${list.slice(6).map(p=>`<button type="button" data-action="photo" data-id="${p.id}" aria-label="查看${dateText(p.date)}的照片">${photo(p)}</button>`).join('')}</div>`:''}`;}
    return `<section class="page" aria-label="${pets[state.pet].name}的相册">${heading('相册',actions)}<div class="page-body album-body">${content}</div></section>`;
  }
  function printsPage(){
    const list=entries(state.prints==='diary');state.card=Math.min(state.card,Math.max(0,list.length-1));
    const toggle=`<div class="segmented" aria-label="脚印显示方式">${[['diary','日记'],['all','全部']].map(([v,l])=>`<button type="button" data-action="prints-mode" data-mode="${v}" aria-pressed="${state.prints===v}">${l}</button>`).join('')}</div>`;
    let content=empty('notebook-text',state.prints==='diary'?'记下第一件小事':'今天还没有脚印');
    if(list.length&&state.prints==='diary'){
      content=`<div class="diary-track"><div class="diary-stage">${list.map((e,i)=>`<button type="button" class="diary-paper" data-action="diary-open" data-index="${i}" data-id="${e.id}" aria-label="查看${dateText(e.date)}的日记" aria-keyshortcuts="ArrowUp ArrowDown Home End"><span class="diary-content"><span class="diary-date"><small>${dateText(e.date)} ${weekText(e.date)}</small><small>${e.time}</small></span><span class="diary-text-photo ${!e.text.trim()?'diary-photo-only':''}" ${!e.photoId?'style="display:block"':''}><p>${esc(e.text.slice(0,100)).replace(/\n/g,'<br>')}${e.text.length>100?'…':''}</p>${e.photoId?photo(e.photoId):''}</span><span class="card-foot"><span>${i+1} / ${list.length}</span>${icon('arrow-up-right')}</span></span></button>`).join('')}</div>${list.map((e,i)=>`<span class="diary-stop" data-index="${i}" aria-hidden="true"></span>`).join('')}</div><span class="diary-status" role="status" aria-live="polite"></span>`;
    }else if(list.length){let day='';content='<div class="record-list">'+list.map(e=>{const label=e.date===day?'':`<div class="date-label">${e.date===today?'今天':dateText(e.date)}</div>`;day=e.date;const [name,symbol]=kinds[e.kind]||['照护','heart'];return label+`<button type="button" class="record-row" data-action="entry-detail" data-id="${e.id}">${e.photoId?photo(e.photoId):`<span class="record-symbol">${icon(symbol)}</span>`}<span class="record-copy"><h3>${name}</h3><p>${esc(e.text||'已记录')}</p></span><small>${e.time}</small></button>`;}).join('')+'</div>';}
    return `<section class="page" aria-label="${pets[state.pet].name}的脚印">${heading('脚印',toggle)}<div class="page-body diary-body ${state.prints==='diary'&&list.length?'diary-scroll':''}" aria-label="日记，上下滚动翻阅">${content}</div><div class="page-cta diary-cta">${pill('quick','记一笔','plus')}</div></section>`;
  }
  function bindDiaryScroll(){
    const scroller=view.querySelector('.diary-scroll');if(!scroller)return;
    const track=scroller.querySelector('.diary-track'),stage=scroller.querySelector('.diary-stage');
    const cards=[...stage.querySelectorAll('.diary-paper')],stops=[...track.querySelectorAll('.diary-stop')];
    const events=new AbortController();
    let step=280,height=0,frame=0,settle=0,moving=false;
    function paint(){
      frame=0;const progress=Math.max(0,Math.min(cards.length-1,scroller.scrollTop/step));
      state.card=Math.round(progress);scroller.dataset.current=String(state.card);
      cards.forEach((card,i)=>{
        const delta=i-progress,distance=Math.abs(delta);
        const visible=reduced.matches?i===state.card:distance<1.75;
        // Papers slide straight up/down. Only distance from the reading position
        // changes their clarity; the current paper keeps its original shape and size.
        const mist=reduced.matches?0:Math.max(0,Math.min(1,(distance-.12)/.88));
        const frost=mist*mist*(3-2*mist);
        card.style.transform=`translate(-50%, -50%) translateY(${reduced.matches?0:delta*step}px)`;
        card.style.setProperty('--diary-blur',`${frost*6}px`);
        card.style.setProperty('--diary-frost',String(frost*.28));
        card.style.visibility=visible?'visible':'hidden';card.inert=!visible;
        card.classList.toggle('diary-card',i===state.card);
        card.classList.toggle('diary-peek',i!==state.card);
        card.setAttribute('aria-current',i===state.card?'true':'false');
      });
    }
    function measure(){
      const progress=height?scroller.scrollTop/step:state.card;
      height=scroller.clientHeight;
      const maxCard=Math.max(...cards.map(c=>c.offsetHeight));
      // Equal distances keep the papers separate throughout a gesture, including large text.
      step=Math.max(220,maxCard+20);
      stage.style.height=height+'px';track.style.height=(height+(cards.length-1)*step)+'px';
      stops.forEach((stop,i)=>stop.style.top=(i*step)+'px');
      scroller.scrollTop=Math.min(cards.length-1,progress)*step;paint();
    }
    function go(index,smooth=true){scroller.scrollTo({top:Math.max(0,Math.min(cards.length-1,index))*step,behavior:smooth&&!reduced.matches?'smooth':'instant'});}
    scroller.addEventListener('scroll',()=>{
      moving=true;if(!frame)frame=requestAnimationFrame(paint);
      clearTimeout(settle);settle=setTimeout(()=>{moving=false;paint();scroller.querySelector('.diary-status').textContent=`第 ${state.card+1} 篇，共 ${cards.length} 篇`;},150);
    },{passive:true,signal:events.signal});
    scroller.addEventListener('keydown',event=>{
      const destinations={ArrowUp:state.card-1,ArrowDown:state.card+1,PageUp:state.card-1,PageDown:state.card+1,Home:0,End:cards.length-1};
      if(Object.hasOwn(destinations,event.key)){
        event.preventDefault();go(destinations[event.key],false);paint();
        cards[state.card].focus({preventScroll:true});
      }
    },{signal:events.signal});
    scroller.addEventListener('focusin',event=>{
      const card=event.target.closest('.diary-paper');if(card&&!moving)go(Number(card.dataset.index),false);
    },{signal:events.signal});
    scroller.addEventListener('click',event=>{
      const card=event.target.closest('.diary-paper');if(!card)return;
      const index=Number(card.dataset.index);
      if(moving)return;
      if(index!==state.card)go(index);else entryDetail(card.dataset.id);
    },{signal:events.signal});
    reduced.addEventListener('change',paint,{signal:events.signal});
    const resize=new ResizeObserver(measure);resize.observe(scroller);cards.forEach(c=>resize.observe(c));measure();
    disposeDiary=()=>{events.abort();resize.disconnect();cancelAnimationFrame(frame);clearTimeout(settle);disposeDiary=()=>{};};
  }

  function weightChart(list){
    const points=[...list].reverse();if(!points.length)return '';
    const vals=points.map(p=>p.value);const span=Math.max(...vals)-Math.min(...vals);const pad=Math.max(.5,span*.3);const min=Math.max(0,Math.floor((Math.min(...vals)-pad)*10)/10),max=Math.ceil((Math.max(...vals)+pad)*10)/10;
    const lo=+dateObj(points[0].date),hi=+dateObj(points[points.length-1].date);
    const x=p=>hi===lo?166:40+(+dateObj(p.date)-lo)/(hi-lo)*255,y=v=>184-(v-min)/(max-min)*148;
    const grid=Array.from({length:4},(_,i)=>{const val=min+(max-min)*i/3;return `<line class="grid" x1="38" x2="301" y1="${y(val)}" y2="${y(val)}"/><text x="29" y="${y(val)+4}" text-anchor="end">${val.toFixed(1)}</text>`;}).join('');
    return `<svg class="weight-chart" viewBox="0 0 322 226" role="img" aria-label="${esc(points.map(p=>dateText(p.date)+'，'+p.value+'千克').join('；'))}"><text x="7" y="16">kg</text>${grid}${points.length>1?`<polyline class="trend" points="${points.map(p=>`${x(p)},${y(p.value)}`).join(' ')}"/>`:''}${points.map(p=>`<circle class="point" cx="${x(p)}" cy="${y(p.value)}" r="4"/>`).join('')}<text x="40" y="211">${shortDate(points[0].date)}</text>${points.length>1?`<text x="295" y="211" text-anchor="end">${shortDate(points[points.length-1].date)}</text>`:''}</svg>`;
  }
  function weightPage(){
    const list=weights();const actions=ib('weight-mode',state.weight==='timeline'?'chart-no-axes-combined':'list',state.weight==='timeline'?'查看体重趋势':'查看照片成长线');
    let content=empty('chart-no-axes-combined','记下第一次体重');
    if(list.length&&state.weight==='timeline')content=`<div class="weight-timeline">${list.map(w=>`<div class="weight-node"><button type="button" class="weight-photo" data-action="weight-detail" data-id="${w.id}" aria-label="查看${dateText(w.date)}的体重记录">${photo(w.photoId)}</button><button type="button" class="weight-value" data-action="weight-detail" data-id="${w.id}"><span class="meta">${dateText(w.date)}</span><strong>${w.value.toFixed(1)}</strong> <small>kg</small>${w.note?`<span class="weight-note">${esc(w.note)}</span>`:''}</button></div>`).join('')}</div>`;
    else if(list.length){const change=list[0].value-list[list.length-1].value;content=`<div class="weight-chart-summary"><strong>${list[0].value.toFixed(1)}</strong> <span class="meta">kg</span><small>${list.length>1?`较 ${shortDate(list[list.length-1].date)} ${change>=0?'增加':'减少'} ${Math.abs(change).toFixed(1)} kg`:'第一次称重'}</small></div>${weightChart(list)}<div class="chart-records">${[...list].reverse().map(w=>`<button type="button" class="chart-record" data-action="weight-detail" data-id="${w.id}" aria-label="${dateText(w.date)}，${w.value}千克">${w.photoId?photo(w.photoId):''}<span>${w.value.toFixed(1)} kg</span><small>${shortDate(w.date)}</small></button>`).join('')}</div>`;}
    return `<section class="page" aria-label="${pets[state.pet].name}的体重">${heading('体重',actions)}<div class="page-body weight-body">${content}</div><div class="page-cta">${pill('add-weight','记体重','plus')}</div></section>`;
  }
  function remindersPage(){
    const selected=dateObj(state.day);const year=selected.getUTCFullYear(),month=selected.getUTCMonth();const first=state.month?`${year}-${String(month+1).padStart(2,'0')}-01`:state.day;const dow=(dateObj(first).getUTCDay()+6)%7;const start=addDays(first,-dow);const monthCount=new Date(Date.UTC(year,month+1,0)).getUTCDate();const count=state.month?Math.ceil((monthCount+dow)/7)*7:7;
    const list=data.reminders.filter(r=>r.pet===state.pet&&r.date===state.day).sort((a,b)=>Number(a.done)-Number(b.done)||a.time.localeCompare(b.time));
    const calendar=`<div class="calendar-heading"><div class="month-switch">${ib('calendar-prev','chevron-left',state.month?'上个月':'上一周')}<span>${year}年 ${month+1}月</span>${ib('calendar-next','chevron-right',state.month?'下个月':'下一周')}</div><button type="button" class="quiet-button" data-action="today">今天</button></div><div class="calendar" aria-label="${state.month?'月历':'周历'}">${['一','二','三','四','五','六','日'].map(d=>`<span class="weekday">${d}</span>`).join('')}${Array.from({length:count},(_,i)=>{const d=addDays(start,i),event=data.reminders.some(r=>r.pet===state.pet&&r.date===d);return `<button type="button" class="day ${event?'has-event':''} ${dateObj(d).getUTCMonth()!==month?'outside':''}" data-action="day" data-date="${d}" aria-pressed="${state.day===d}" aria-label="${dateText(d)}${event?'，有提醒':''}"><span>${Number(d.slice(8))}</span>${d===today?'<small>今天</small>':''}</button>`;}).join('')}</div><div class="calendar-expand">${ib('calendar-expand',state.month?'chevron-up':'chevron-down',state.month?'收起月历':'展开月历',`aria-expanded="${state.month}"`)}</div>`;
    const rows=list.map(r=>`<div class="reminder-row ${r.done?'done':''}"><button type="button" class="reminder-open" data-action="reminder-detail" data-id="${r.id}">${icon(r.kind==='bath'?'bath':r.kind==='walk'?'footprints':'scissors')}<span><h3>${esc(r.title)}</h3><small>${r.time}${r.done?' · 已完成':''}</small></span></button><button type="button" class="icon-button check-button" data-action="complete" data-id="${r.id}" aria-label="${r.done?'撤销完成':'完成'}${esc(r.title)}" aria-pressed="${r.done}">${icon(r.done?'circle-check':'circle')}</button></div>`).join('');
    return `<section class="page" aria-label="${pets[state.pet].name}的提醒">${heading('提醒',ib('reminder-list','list','查看所有待办'))}<div class="page-body reminder-body">${calendar}<div class="reminder-date">${icon('calendar-days')}<span>${dateText(state.day)} · ${weekText(state.day)}</span></div>${rows||'<p class="reminder-empty">这天没有安排</p>'}</div><div class="page-cta">${pill('add-reminder','新提醒','plus')}</div></section>`;
  }

  function show(content,type){
    if(!modal)lastFocus=document.activeElement;
    stopPlay();modal=type;base.inert=true;overlay.innerHTML=content;icons();
    overlay.querySelector('button,input,textarea,select')?.focus({preventScroll:true});
  }
  function sheet(title,body,save=false,type='sheet'){
    show(`<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="gogo-sheet-title"><div class="sheet-header"><button type="button" class="quiet-button" data-action="close">${save?'取消':'关闭'}</button><h2 id="gogo-sheet-title">${title}</h2>${save?'<button type="button" data-action="save-editor" class="quiet-button">保存</button>':'<span style="width:54px"></span>'}</div><div class="sheet-content">${body}</div></section>`,type);
  }
  function close(){stopPlay();overlay.innerHTML='';base.inert=false;modal=null;editor=null;returnModal=null;lastFocus?.isConnected?lastFocus.focus({preventScroll:true}):root.querySelector('.nav-item[aria-current]')?.focus({preventScroll:true});}
  function requestClose(){
    if(modal==='discard-confirm'){resumeEditor();return;}
    if(editor?.dirty){
      returnModal={html:overlay.innerHTML,type:modal};
      sheet('保留这次编辑？','<p class="detail-copy">离开后，这次未保存的内容会丢失。</p><button type="button" class="pill-button full-button" data-action="continue-edit">继续编辑</button><button type="button" class="secondary-button full-button danger-button" data-action="discard">放弃修改</button>',false,'discard-confirm');
    }else close();
  }
  function resumeEditor(){const saved=returnModal;returnModal=null;if(!saved){renderEditor();return;}if(saved.type==='editor')renderEditor();else show(saved.html,saved.type);}
  function toast(message,undo){
    clearTimeout(toastTimer);const el=root.querySelector('.toast');undoAction=undo||null;el.hidden=false;el.innerHTML=`<span>${esc(message)}</span>${undo?'<button type="button" data-action="undo">撤销</button>':''}`;
    toastTimer=setTimeout(()=>{el.hidden=true;undoAction=null;},undo?6500:2600);
  }
  function quick(){
    sheet('记一笔',`<div class="quick-grid">${Object.entries(kinds).map(([k,[name,symbol]])=>`<button type="button" class="quick-action" data-action="${k==='diary'?'write':'quick-save'}" data-kind="${k}">${icon(symbol)}<span>${name}</span></button>`).join('')}</div><div class="quick-bottom"><span class="meta">${pets[state.pet].name} · 今天</span><button type="button" class="quiet-button" data-action="supplement">补记</button></div>`,false,'quick');
  }
  function nowTime(){return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}
  function fastSave(kind){const e={id:uid(),pet:state.pet,kind,date:today,time:nowTime(),text:''};data.entries.unshift(e);close();state.prints='all';render();toast(`已记下${kinds[kind][0]}`,()=>{data.entries=data.entries.filter(x=>x.id!==e.id);render();toast('已撤销');});}
  function field(label,name,value,type='text',extra=''){return `<label class="form-field"><span>${label}</span><input name="${name}" data-field="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
  function startEditor(kind,item){
    const defaults={id:null,pet:state.pet,date:kind==='reminder'?state.day:today,time:nowTime(),text:'',note:'',value:'',photoId:null,title:'',recordKind:'food',kind,dirty:false};
    editor={...defaults,...item,kind,dirty:false};if(item?.kind&&kind==='entry')editor.recordKind=item.kind;
    renderEditor();
  }
  function renderEditor(){
    const e=editor;let body='',title='';
    if(e.kind==='diary'){
      title=e.id?'编辑日记':'写日记';
      body=`<label class="form-field"><span>今天的小事</span><textarea name="text" data-field="text" placeholder="想记住的，就写下来。" maxlength="2000">${esc(e.text)}</textarea></label>${photoField(e)}${field('日期','date',e.date,'date','required max="'+today+'"')}`;
    }else if(e.kind==='weight'){
      title=e.id?'编辑体重':'记体重';
      body=`${field('体重 · kg','value',e.value,'number','min="0.1" max="150" step="0.1" inputmode="decimal" required')}${photoField(e)}${field('日期','date',e.date,'date','required max="'+today+'"')}${field('备注 · 选填','note',e.note,'text','maxlength="80" placeholder="今天乖乖站好了"')}`;
    }else if(e.kind==='reminder'){
      title=e.id?'编辑提醒':'新提醒';
      body=`${field('提醒事项','title',e.title,'text','required maxlength="40" placeholder="比如：洗澡"')}<div class="form-row">${field('日期','date',e.date,'date','required')}${field('时间','time',e.time,'time','required')}</div>`;
    }else{
      title=e.id?'编辑记录':'补记';
      body=`<label class="form-field"><span>记录什么</span><select data-field="recordKind" name="recordKind">${Object.entries(kinds).filter(([k])=>k!=='diary').map(([k,[name]])=>`<option value="${k}" ${e.recordKind===k?'selected':''}>${name}</option>`).join('')}</select></label><div class="form-row">${field('日期','date',e.date,'date','required max="'+today+'"')}${field('时间','time',e.time,'time','required')}</div>${field('备注 · 选填','text',e.text,'text','maxlength="160"')}`;
    }
    sheet(title,`<form id="gogo-entry-form"><p class="error" role="alert" hidden></p>${body}</form>`,true,'editor');
  }
  function photoField(e){return `<div class="field-photo"><button type="button" class="photo-picker-trigger" data-action="pick-photo">${e.photoId?photo(e.photoId):`<span class="add-photo" aria-hidden="true">${icon('image-plus')}</span>`}<span>${e.photoId?'换张照片':'添加照片 · 选填'}</span></button>${e.photoId?ib('clear-photo','x','移除这张照片'):''}</div>`;}
  function pickPhoto(){
    const list=photos(editor.pet);sheet('选张照片',`<div class="photo-options">${list.map(p=>`<button type="button" data-action="choose-photo" data-id="${p.id}" aria-label="选择${dateText(p.date)}的照片" aria-pressed="${editor.photoId===p.id}">${photo(p)}</button>`).join('')}</div><button type="button" class="secondary-button full-button" data-action="editor-import">${icon('image-plus')} 从手机相册选择</button><button type="button" class="quiet-button full-button" data-action="back-editor">返回编辑</button>`,false,'photo-picker');
  }
  function submitEditor(){
    if(!editor)return;const form=overlay.querySelector('form');if(!form.reportValidity())return;
    const e=editor,pet=e.pet,editing=!!e.id;let item;
    const fail=message=>{const el=form.querySelector('.error');el.textContent=message;el.hidden=false;};
    if(e.kind!=='reminder'&&e.date>today){fail('记录日期不能晚于今天');return;}
    if(e.kind==='diary'){
      if(!e.text.trim()&&!e.photoId){fail('写一点小事，或选一张照片');return;}
      item={id:e.id||uid(),pet,kind:'diary',text:e.text.trim(),date:e.date,time:e.time,photoId:e.photoId};
      data.entries=replace(data.entries,item);state.prints='diary';state.card=entries(true).findIndex(x=>x.id===item.id);state.tab='prints';
    }else if(e.kind==='weight'){
      const value=Number(e.value);if(!Number.isFinite(value)||value<.1||value>150){fail('请填写 0.1–150 kg 之间的体重');return;}
      item={id:e.id||uid(),pet,value,date:e.date,photoId:e.photoId,note:e.note.trim()};data.weights=replace(data.weights,item);state.tab='weight';
    }else if(e.kind==='reminder'){
      if(!e.title.trim()){fail('填一个提醒事项吧');return;}
      item={id:e.id||uid(),pet,title:e.title.trim(),date:e.date,time:e.time,kind:e.reminderKind||'care',done:!!e.done};data.reminders=replace(data.reminders,item);state.day=e.date;state.tab='reminders';
    }else{item={id:e.id||uid(),pet,kind:e.recordKind,date:e.date,time:e.time,text:e.text.trim()};data.entries=replace(data.entries,item);state.prints='all';state.tab='prints';}
    close();render();savePrefs();toast(editing?'修改已保存':'已保存');
  }
  function replace(list,item){const i=list.findIndex(x=>x.id===item.id);if(i<0)return [item,...list];return list.map(x=>x.id===item.id?item:x);}
  function entryDetail(id){
    const e=data.entries.find(x=>x.id===id);if(!e)return;
    sheet(e.kind==='diary'?'那天的小事':(kinds[e.kind]?.[0]||'照护'),`<div class="detail-meta"><small>${dateText(e.date)} · ${weekText(e.date)}</small><small>${e.time}</small></div>${e.photoId?photo(e.photoId,'detail-photo'):''}<p class="detail-copy">${esc(e.text||'已记录一次')}</p><div class="detail-actions"><button type="button" class="quiet-button danger-button" data-action="delete-entry" data-id="${e.id}">删除</button><button type="button" class="secondary-button" data-action="edit-entry" data-id="${e.id}">${icon('pencil')} 编辑</button></div>`,false,'detail');
  }
  function weightDetail(id){const w=data.weights.find(x=>x.id===id);if(!w)return;sheet('这次称重',`<div class="detail-meta"><small>${dateText(w.date)}</small><span>${w.value.toFixed(1)} kg</span></div>${w.photoId?photo(w.photoId,'detail-photo'):''}<p class="detail-copy">${esc(w.note)}</p><div class="detail-actions"><button type="button" class="quiet-button danger-button" data-action="delete-weight" data-id="${id}">删除</button><button type="button" class="secondary-button" data-action="edit-weight" data-id="${id}">${icon('pencil')} 编辑</button></div>`,false,'detail');}
  function reminderDetail(id){const r=data.reminders.find(x=>x.id===id);if(!r)return;sheet(r.title,`<p class="detail-copy">${dateText(r.date)} ${r.time}${r.done?' · 已完成':''}</p><div class="detail-actions"><button type="button" class="quiet-button danger-button" data-action="delete-reminder" data-id="${id}">删除</button><button type="button" class="secondary-button" data-action="edit-reminder" data-id="${id}">${icon('pencil')} 编辑</button></div>`,false,'detail');}
  function removeRecord(collection,id){const removed=data[collection].find(x=>x.id===id);data[collection]=data[collection].filter(x=>x.id!==id);close();render();toast(removed.photoId?'已删除，照片仍在相册':'已删除',()=>{data[collection].push(removed);render();toast('已恢复');});}
  function complete(id){const r=data.reminders.find(x=>x.id===id);if(!r)return;r.done=!r.done;render();toast(r.done?'已完成':'已撤销完成');}
  function stopPlay(){clearInterval(playTimer);playTimer=null;}
  function viewer(id,autoplay=false){const list=photos();if(!list.length)return;viewerIndex=Math.max(0,list.findIndex(p=>p.id===id));renderViewer();if(autoplay&&!reduced.matches)startPlay();}
  function renderViewer(){
    const list=photos();const p=list[viewerIndex];if(!p){close();return;}
    const playing=!!playTimer;
    show(`<section class="viewer" role="dialog" aria-modal="true" aria-label="照片详情"><div class="viewer-header">${ib('close','x','关闭照片')}<small>${dateText(p.date)} · ${weekText(p.date)}</small>${ib('photo-menu','ellipsis','照片操作',`data-id="${p.id}"`)}</div><div class="viewer-image">${photo(p)}</div><div class="viewer-footer"><p class="viewer-caption">${esc(p.caption||'留个瞬间')}</p><div class="viewer-controls"><small>${viewerIndex+1} / ${list.length}</small><div class="viewer-steps">${ib('photo-prev','chevron-left','上一张照片',list.length<2?'disabled':'')}${ib('toggle-play','circle-play','播放照片',list.length<2?'disabled':'')}${ib('photo-next','chevron-right','下一张照片',list.length<2?'disabled':'')}</div></div></div></section>`,'viewer');
    if(playing)startPlay();
  }
  function startPlay(){
    stopPlay();if(reduced.matches||photos().length<2)return;
    playTimer=setInterval(()=>{if(document.hidden||modal!=='viewer'){stopPlay();updatePlayButton();return;}viewerIndex=(viewerIndex+1)%photos().length;renderViewer();},4500);updatePlayButton();
  }
  function updatePlayButton(){const b=overlay.querySelector('[data-action="toggle-play"]');if(b){b.innerHTML=icon(playTimer?'circle-pause':'circle-play');b.setAttribute('aria-label',playTimer?'暂停播放':'播放照片');icons();}}
  function requestImport(source,forEditor=false){
    importContext={pet:forEditor?editor.pet:state.pet,editorRef:forEditor?editor:null,forEditor,source};const input=root.querySelector(source==='camera'?'.camera-input':'.media-input');input.value='';input.multiple=!forEditor&&source!=='camera';input.click();
  }
  async function importFiles(files,context){
    if(!files.length||!context)return;
    const imported=[];let failures=0;
    for(const file of [...files].slice(0,20)){
      if(!file.type.startsWith('image/')||file.size>20*1024*1024){failures++;continue;}
      try{
        const raw=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
        const im=new Image();im.src=raw;await im.decode();const canvas=document.createElement('canvas');const scale=Math.min(1,1600/Math.max(im.width,im.height));canvas.width=Math.round(im.width*scale);canvas.height=Math.round(im.height*scale);canvas.getContext('2d').drawImage(im,0,0,canvas.width,canvas.height);
        imported.push({id:uid(),pet:context.pet,date:today,url:canvas.toDataURL('image/jpeg',.88),caption:'',source:context.source});
      }catch{failures++;}
    }
    if(imported.length){
      data.photos.unshift(...imported);
      if(context.source==='camera')for(const p of imported)data.entries.unshift({id:uid(),pet:p.pet,kind:'diary',date:p.date,time:nowTime(),text:'',photoId:p.id});
      if(context.forEditor&&editor&&editor===context.editorRef){editor.photoId=imported[0].id;editor.dirty=true;renderEditor();}
      else if(state.pet===context.pet&&!modal){state.tab='album';render();savePrefs();viewer(imported[0].id);}
      toast(`已添加 ${imported.length} 张${failures?'，部分照片无法读取':''}`);
    }else toast('照片无法读取，请选择 JPG、PNG 或 WebP');
  }
  function showMenu(){sheet('相册',`<button type="button" class="menu-item" data-action="export-preview">${icon('book-open')} 回忆册预览</button><button type="button" class="menu-item" data-action="import">${icon('image-plus')} 从相册添加</button>`,false,'menu');}
  function exportPreview(){
    const list=entries(true),ws=weights(),photoList=photos();
    sheet('回忆册',`<div class="export-cover">${photoList[0]?photo(photoList[0]):''}<h2>${pets[state.pet].name}的小日子</h2><small>${photoList.length?dateText(photoList[photoList.length-1].date)+' — ':''}${dateText(today)}</small></div>${ws.length?`<div class="export-section"><h3>体重</h3>${weightChart(ws)}</div>`:''}${list.map(e=>`<div class="export-section"><h3>${dateText(e.date)}</h3>${e.photoId?photo(e.photoId):''}<p>${esc(e.text).replace(/\n/g,'<br>')}</p></div>`).join('')||'<p class="reminder-empty">写下日记后，再来翻翻吧。</p>'}`,false,'export');
  }
  function allReminders(){const list=data.reminders.filter(r=>r.pet===state.pet&&!r.done).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));sheet('待办',list.map(r=>`<button type="button" class="menu-item" data-action="goto-reminder" data-date="${r.date}">${icon('calendar-days')}<span>${esc(r.title)}<small style="display:block">${dateText(r.date)} ${r.time}</small></span></button>`).join('')||'<p class="reminder-empty">都完成了</p>',false,'reminder-list');}
  function changeCalendar(delta){if(state.month){const d=dateObj(state.day);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+delta);state.day=iso(d);}else state.day=addDays(state.day,7*delta);render();}

  root.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
    const {action,id,pet,tab,kind,mode,date}=button.dataset;
    switch(action){
      case 'theme':state.theme=state.theme==='light'?'dark':'light';render();savePrefs();root.querySelector('.theme-button').focus({preventScroll:true});break;
      case 'pet':state.pet=pet;state.card=0;render();savePrefs();root.querySelector(`[data-pet="${pet}"]`).focus({preventScroll:true});break;
      case 'tab':state.tab=tab;render();savePrefs();root.querySelector(`[data-tab="${tab}"]`).focus({preventScroll:true});break;
      case 'prints-mode':state.prints=mode;state.card=0;render();break;
      case 'weight-mode':state.weight=state.weight==='timeline'?'chart':'timeline';render();break;
      case 'day':state.day=date;render();break;
      case 'today':state.day=today;render();break;
      case 'calendar-expand':state.month=!state.month;render();break;
      case 'calendar-prev':changeCalendar(-1);break;
      case 'calendar-next':changeCalendar(1);break;
      case 'quick':quick();break;
      case 'quick-save':fastSave(kind);break;
      case 'write':startEditor('diary');break;
      case 'save-editor':submitEditor();break;
      case 'supplement':startEditor('entry');break;
      case 'add-weight':startEditor('weight');break;
      case 'add-reminder':startEditor('reminder');break;
      case 'entry-detail':entryDetail(id);break;
      case 'weight-detail':weightDetail(id);break;
      case 'reminder-detail':reminderDetail(id);break;
      case 'edit-entry':{const e=data.entries.find(x=>x.id===id);startEditor(e.kind==='diary'?'diary':'entry',e);break;}
      case 'edit-weight':startEditor('weight',data.weights.find(x=>x.id===id));break;
      case 'edit-reminder':{const r=data.reminders.find(x=>x.id===id);startEditor('reminder',{...r,reminderKind:r.kind});break;}
      case 'delete-entry':removeRecord('entries',id);break;
      case 'delete-weight':removeRecord('weights',id);break;
      case 'delete-reminder':removeRecord('reminders',id);break;
      case 'complete':complete(id);break;
      case 'pick-photo':pickPhoto();break;
      case 'clear-photo':editor.photoId=null;editor.dirty=true;renderEditor();break;
      case 'choose-photo':editor.photoId=id;editor.dirty=true;renderEditor();break;
      case 'back-editor':renderEditor();break;
      case 'close':if(modal==='photo-picker')renderEditor();else requestClose();break;
      case 'discard':close();break;
      case 'continue-edit':resumeEditor();break;
      case 'undo':{const undo=undoAction;undoAction=null;root.querySelector('.toast').hidden=true;undo?.();break;}
      case 'photo':viewer(id);break;
      case 'play':viewer(photos()[0]?.id,true);break;
      case 'photo-prev':stopPlay();viewerIndex=(viewerIndex-1+photos().length)%photos().length;renderViewer();break;
      case 'photo-next':stopPlay();viewerIndex=(viewerIndex+1)%photos().length;renderViewer();break;
      case 'toggle-play':if(playTimer){stopPlay();updatePlayButton();}else if(reduced.matches)toast('减少动态效果已开启，可手动翻页');else startPlay();break;
      case 'camera':requestImport('camera');break;
      case 'import':if(modal)close();requestImport('album');break;
      case 'editor-import':requestImport('album',true);break;
      case 'menu':showMenu();break;
      case 'export-preview':exportPreview();break;
      case 'reminder-list':allReminders();break;
      case 'goto-reminder':state.day=date;close();render();break;
      case 'photo-menu':{
        const p=data.photos.find(x=>x.id===id);sheet('这张照片',`<button type="button" class="menu-item" data-action="photo-to-diary" data-id="${p.id}">${icon('notebook-pen')} 写进日记</button><button type="button" class="menu-item" data-action="back-photo" data-id="${p.id}">${icon('image')} 返回照片</button>`,false,'photo-menu');break;
      }
      case 'photo-to-diary':startEditor('diary',{photoId:id});break;
      case 'back-photo':viewer(id);break;
    }
  });
  root.addEventListener('input',event=>{if(editor&&event.target.dataset.field){editor[event.target.dataset.field]=event.target.value;editor.dirty=true;}});
  root.addEventListener('change',event=>{if(editor&&event.target.dataset.field){editor[event.target.dataset.field]=event.target.value;editor.dirty=true;}});
  root.addEventListener('submit',event=>{event.preventDefault();submitEditor();});
  root.querySelectorAll('input[type=file]').forEach(input=>input.addEventListener('change',()=>{const context=importContext;importContext=null;importFiles(input.files,context);}));
  overlay.addEventListener('click',event=>{if(event.target===overlay)requestClose();});
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target.tagName==='INPUT'&&modal==='editor'){event.preventDefault();submitEditor();return;}
    if(event.key==='Escape'){event.preventDefault();if(modal==='discard-confirm')resumeEditor();else if(modal==='photo-picker')renderEditor();else requestClose();}
    if(event.key==='Tab'){const focusable=[...overlay.querySelectorAll('button:not([disabled]),input,select,textarea')].filter(e=>e.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  });
  overlay.addEventListener('focusin',event=>{if(modal==='viewer'&&playTimer&&event.isTrusted&&event.target.dataset.action!=='toggle-play'){stopPlay();updatePlayButton();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPlay();updatePlayButton();}});
  reduced.addEventListener('change',()=>{if(reduced.matches){stopPlay();updatePlayButton();}});
  window.addEventListener('openai:set_globals',event=>{const saved=event.detail?.globals?.widgetState?.privateContent;if(!saved||modal)return;if(pets[saved.pet])state.pet=saved.pet;if(['dark','light'].includes(saved.theme))state.theme=saved.theme;if(['prints','album','weight','reminders'].includes(saved.tab))state.tab=saved.tab;render();});
  render();
  if(globalThis.Tweak){
    let appliedContent=design.content;
    const tweak=new Tweak({container:root,onChange:()=>{if(design.content!==appliedContent){close();data=seed();state.card=0;if(design.content!=='full'){for(const k of Object.keys(data))data[k]=design.content==='empty'?[]:Object.keys(pets).flatMap(p=>data[k].filter(x=>x.pet===p).slice(0,1));}appliedContent=design.content;render();}root.style.setProperty('--size',design.textSize==='large'?'1.25':'1');}});
    tweak.addSelect(design,'content',{label:'内容状态',options:[{label:'多条内容',value:'full'},{label:'刚开始记录',value:'few'},{label:'还没有记录',value:'empty'}]});
    tweak.addSelect(design,'textSize',{label:'文字大小',options:[{label:'常规',value:'standard'},{label:'放大',value:'large'}]});
  }
})();
