function startGoDog(root, direction, shared) {
  'use strict';
  const view = root.querySelector('.app-view');
  const overlay = root.querySelector('.overlay-host');
  const base = root.querySelector('.app-base');
  const pets = shared.pets || (shared.pets={rouqiu:{name:'肉球',cell:0},gelin:{name:'格林',cell:6}});
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
  const pref = shared.preferences || window.openai?.widgetState?.privateContent || {};
  const state = {pet:pets[pref.pet]?pref.pet:Object.keys(pets)[0]||null,theme:['dark','light'].includes(pref.theme)?pref.theme:'light',tab:['prints','weight','reminders'].includes(pref.tab)?pref.tab:'prints',prints:'diary',card:0,weight:direction.weightDefault,day:today,month:false};
  let data = shared.data || seed(), modal=null, editor=null, returnModal=null, lastFocus=null, toastTimer, undoAction=null, playTimer=null, viewerIndex=0, importContext=null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const design = shared.design || (shared.design={content:'full',textSize:'standard'});
  const lifetime=new AbortController();
  let pageCleanup=()=>{},albumIndex=0,disposed=false,keyboardAction=false,avatarContext=null;
  root.addEventListener("pointerdown",()=>{keyboardAction=false;});
  root.addEventListener("keydown",()=>{keyboardAction=true;});
  shared.data=data;
  // Accepted object URLs belong to the shared data, not a particular design instance.
  if(!shared.mediaUrls){
    shared.mediaUrls=new Set();
    window.addEventListener('pagehide',event=>{if(!event.persisted){shared.mediaUrls.forEach(url=>URL.revokeObjectURL(url));shared.mediaUrls.clear();}});
  }
  const mediaUrls=shared.mediaUrls;
  root.dataset.direction=direction.id;

  function seed(){
    const result={photos:[],entries:[],weights:[],reminders:[]};
    const captions={rouqiu:['风把耳朵吹得圆圆的。','下午三点，睡意准时到。','一听见零食袋就坐好了。','抬头看看今天的天空。','走过这条路，又回头等我。','到家了，歇一会儿。'],gelin:['两只小爪子，整整齐齐。','今天也很会找舒服的位置。','散步的时候一直在笑。','听见我叫你，马上回头。','最喜欢的那条小路。','再赖五分钟吧。']};
    for(const [pet,p] of Object.entries(pets)){
      if(!captions[pet])continue;
      for(let i=0;i<6;i++)result.photos.push({id:`${pet}-photo-${i}`,pet,cell:(pet==='rouqiu'?0:6)+i,date:addDays(today,-[0,2,6,13,24,40][i]),caption:captions[pet][i],source:'album'});
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
  const durationText = seconds => {if(!Number.isFinite(seconds)||seconds<=0)return '';const n=Math.max(1,Math.round(seconds));return n>=3600?`${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
  function photo(id,extra='',label=''){
    const p=typeof id==='object'?id:data.photos.find(p=>p.id===id);
    if(!p)return `<span class="weight-no-photo">${icon('image')}</span>`;
    const alt=esc(label||`${pets[p.pet]?.name||'狗狗'}，${p.caption||dateText(p.date)}`);
    if(p.type==='video')return `<span class="photo video-thumb ${extra}" role="img" aria-label="${alt}，视频 ${durationText(p.duration)}">${p.poster?`<img src="${esc(p.poster)}" alt="" draggable="false">`:`<span class="video-placeholder">${icon('video')}</span>`}<span class="media-badge" aria-hidden="true">${icon('play')}<span>${durationText(p.duration)||'视频'}</span></span></span>`;
    if(p.url)return `<span class="photo ${extra}"><img src="${esc(p.url)}" alt="${alt}" draggable="false"></span>`;
    return `<span class="photo ${extra}" role="img" aria-label="${alt}"><span class="sample-photo" style="--photo-x:${p.cell%3*50}%;--photo-y:${Math.floor(p.cell/3)*100/3}%"></span></span>`;
  }
  function mediaDetail(id,extra=''){
    const p=typeof id==='object'?id:data.photos.find(p=>p.id===id);
    if(p?.type!=='video')return photo(id,extra);
    return `<div class="media-player ${extra}"><video controls playsinline preload="metadata" disablepictureinpicture src="${esc(p.url)}" ${p.poster?`poster="${esc(p.poster)}"`:''} aria-label="${esc(pets[p.pet]?.name||'狗狗')}的视频">当前浏览器无法播放视频。</video><p class="media-error" role="alert" hidden>这段视频暂时无法播放，请换一个格式再试。</p></div>`;
  }
  function pauseVideos(){root.querySelectorAll('video').forEach(video=>video.pause());}
  function savePrefs(){shared.data=data;shared.preferences={pet:state.pet,theme:state.theme,tab:state.tab};window.openai?.setWidgetState?.({modelContent:{variant:direction.name,page:state.tab,pet:pets[state.pet]?.name||null,theme:state.theme},privateContent:{variant:direction.id,pet:state.pet,theme:state.theme,tab:state.tab}})?.catch(()=>{});}
  function avatar(p,extra=''){
    if(p.avatar)return `<span class="photo pet-avatar ${extra}"><img src="${esc(p.avatar)}" alt="${esc(p.name||'狗狗')}的头像"></span>`;
    if(Number.isInteger(p.cell))return photo({pet:p.id,cell:p.cell,caption:'头像'},'pet-avatar '+extra,`${p.name||'狗狗'}的头像`);
    return `<span class="photo pet-avatar avatar-placeholder ${extra}" aria-hidden="true">${esc(graphemes(p.name||'')[0]||'犬')}</span>`;
  }
  function graphemes(text){return globalThis.Intl?.Segmenter?[...new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);}
  function icons(){globalThis.lucide?.createIcons({attrs:{width:21,height:21,'stroke-width':1.6}});}
  let disposeDiary=()=>{};
  function render(){
    if(!pets[state.pet])state.pet=Object.keys(pets)[0]||null;
    disposeDiary();pageCleanup();shared.data=data;shared.preferences={pet:state.pet,theme:state.theme,tab:state.tab};
    root.dataset.theme=state.theme;
    root.style.setProperty('--size',design.textSize==='large'?'1.25':'1');
    const rail=root.querySelector('.pet-switch'),scrollLeft=rail.scrollLeft;
    rail.innerHTML=Object.entries(pets).map(([id,p])=>`<button type="button" class="pet-tab" data-action="pet" data-pet="${id}" aria-pressed="${state.pet===id}" aria-label="切换到${esc(p.name)}">${avatar({...p,id})}<span class="pet-name">${esc(p.name)}</span></button>`).join('');
    rail.scrollLeft=scrollLeft;
    revealPet();
    root.querySelector('.pet-add').innerHTML=icon('plus');
    const theme=root.querySelector('.theme-button');theme.setAttribute('aria-label',`切换到${state.theme==='light'?'黑棕':'奶白'}主题`);theme.innerHTML=icon(state.theme==='light'?'moon':'sun');
    root.querySelector('.bottom-nav').innerHTML=[['prints','相册','notebook-text'],['weight','脚印','route'],['reminders','提醒','bell']].map(([id,label,symbol])=>`<button type="button" class="nav-item ${id==='camera'?'nav-camera':''}" data-action="${id==='camera'?'camera':'tab'}" data-tab="${id}" ${state.tab===id?'aria-current="page"':''}><span class="nav-symbol">${icon(symbol)}</span><span>${label}</span></button>`).join('');
    root.querySelector('.bottom-nav').hidden=!state.pet;
    if(!state.pet){view.innerHTML=`<section class="page"><div class="pet-onboarding">${icon('paw-print')}<h1>认识一下你的小狗</h1>${pill('pet-add','添加宠物')}</div></section>`;icons();return;}
    view.innerHTML=({prints:printsPage,weight:weightPage,reminders:remindersPage}[state.tab])();icons();bindDiaryScroll();bindAlbum();
  }
  function heading(title,actions){return `<div class="page-heading"><h1>${title}</h1><div class="heading-actions">${actions||''}${ib('menu','ellipsis','更多')}</div></div>`;}
  function empty(symbol,text,action,label){return `<div class="empty"><span class="empty-mark">${icon(symbol)}</span><p>${text}</p>${action?pill(action,label):''}</div>`;}
  function printsPage(){
    const list=entries(state.prints==='diary');state.card=Math.min(state.card,Math.max(0,list.length-1));
    const toggle=`<div class="segmented" aria-label="相册显示方式">${[['diary','日记'],['all','全部']].map(([v,l])=>`<button type="button" data-action="prints-mode" data-mode="${v}" aria-pressed="${state.prints===v}">${l}</button>`).join('')}</div>`;
    let content=empty('notebook-text',state.prints==='diary'?'记下第一件小事':'今天还没有相册');
    if(list.length&&state.prints==='diary'){
      content=`<div class="diary-track"><div class="diary-stage">${list.map((e,i)=>`<button type="button" class="diary-paper" data-action="diary-open" data-index="${i}" data-id="${e.id}" aria-label="查看${dateText(e.date)}的日记" aria-keyshortcuts="ArrowUp ArrowDown Home End"><span class="diary-content"><span class="diary-date"><span><strong>${Number(e.date.slice(8))}</strong><small>${Number(e.date.slice(5,7))}月 · ${weekText(e.date)}</small></span><small>${e.time}</small></span><span class="diary-text-photo ${!e.text.trim()?'diary-photo-only':''}" ${!e.photoId?'style="display:block"':''}><p>${esc(e.text.slice(0,100)).replace(/\n/g,'<br>')}${e.text.length>100?'…':''}</p>${e.photoId?photo(e.photoId):''}</span><span class="card-foot"><span>${i+1} / ${list.length}</span>${icon('arrow-up-right')}</span></span><span class="diary-mist" aria-hidden="true"></span></button>`).join('')}</div>${list.map((e,i)=>`<span class="diary-stop" data-index="${i}" aria-hidden="true"></span>`).join('')}</div><span class="diary-status" role="status" aria-live="polite"></span>`;
    }else if(list.length){let day='';content='<div class="record-list">'+list.map(e=>{const label=e.date===day?'':`<div class="date-label">${e.date===today?'今天':dateText(e.date)}</div>`;day=e.date;const [name,symbol]=kinds[e.kind]||['照护','heart'];return label+`<button type="button" class="record-row" data-action="entry-detail" data-id="${e.id}">${e.photoId?photo(e.photoId):`<span class="record-symbol">${icon(symbol)}</span>`}<span class="record-copy"><h3>${name}</h3><p>${esc(e.text||'已记录')}</p></span><small>${e.time}</small></button>`;}).join('')+'</div>';}
    return `<section class="page" aria-label="${esc(pets[state.pet].name)}的相册">${heading('相册',ib('import','image-plus','导入照片或视频')+ib('play','play','浏览相册',photos().length<2?'disabled':''))}<div class="prints-filter">${toggle}</div><div class="page-body diary-body ${state.prints==='diary'&&list.length?'diary-scroll':''}" aria-label="日记，上下滚动翻阅">${content}</div><div class="page-cta diary-cta">${pill('camera','记一笔','camera')}</div></section>`;
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
        card.querySelector('.diary-content').style.filter=`blur(${frost*4}px)`;
        card.querySelector('.diary-mist').style.opacity=String(frost*.24);
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
    const records=[...entries().map(e=>({...e,collection:'entries'})),...weights().map(w=>({...w,kind:'weight',time:'',collection:'weights'}))].sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||'')));
    const body=records.length?`<div class="growth-line notebook-line">${records.map(e=>{
      const name=e.kind==='weight'?'体重':kinds[e.kind]?.[0]||'小事';
      return `<button type="button" class="growth-moment" data-action="${e.kind==='weight'?'weight-detail':'entry-detail'}" data-id="${e.id}"><span class="growth-photo">${e.photoId?photo(e.photoId):`<span class="notebook-symbol">${icon(e.kind==='weight'?'scale':kinds[e.kind]?.[1]||'notebook-pen')}</span>`}</span><span class="growth-copy"><small>${dateText(e.date)}${e.time?' · '+e.time:''}</small><span>${e.kind==='weight'?`<strong>${e.value.toFixed(1)}</strong> kg`:name}</span><small>${esc(e.text||e.note||'已记下')}</small></span></button>`;
    }).join('')}</div>`:empty('route','串起第一件小事');
    return `<section class="page" aria-label="${esc(pets[state.pet].name)}的脚印">${heading('脚印')}<div class="page-body weight-body">${body}</div><div class="page-cta">${pill('notebook-add','记一件小事')}</div></section>`;
  }
  function notebookAdd(){
    sheet('记一件小事',`<div class="quick-grid">${Object.entries(kinds).map(([k,[name,symbol]])=>`<button type="button" class="quick-action" data-action="${k==='diary'?'write':'quick-save'}" data-kind="${k}">${icon(symbol)}<span>${name}</span></button>`).join('')}<button type="button" class="quick-action" data-action="add-weight">${icon('scale')}<span>体重</span></button><button type="button" class="quick-action" data-action="write">${icon('pencil')}<span>其他小事</span></button></div>`,false,'notebook-add');
  }
  function remindersPage(){
    const selected=dateObj(state.day);const year=selected.getUTCFullYear(),month=selected.getUTCMonth();const first=state.month?`${year}-${String(month+1).padStart(2,'0')}-01`:state.day;const dow=(dateObj(first).getUTCDay()+6)%7;const start=addDays(first,-dow);const monthCount=new Date(Date.UTC(year,month+1,0)).getUTCDate();const count=state.month?Math.ceil((monthCount+dow)/7)*7:7;
    const list=data.reminders.filter(r=>r.pet===state.pet&&r.date===state.day).sort((a,b)=>Number(a.done)-Number(b.done)||a.time.localeCompare(b.time));
    const calendar=`<div class="calendar-heading"><div class="month-switch">${ib('calendar-prev','chevron-left',state.month?'上个月':'上一周')}<span>${year}年 ${month+1}月</span>${ib('calendar-next','chevron-right',state.month?'下个月':'下一周')}</div><button type="button" class="quiet-button" data-action="today">今天</button></div><div class="calendar" aria-label="${state.month?'月历':'周历'}">${['一','二','三','四','五','六','日'].map(d=>`<span class="weekday">${d}</span>`).join('')}${Array.from({length:count},(_,i)=>{const d=addDays(start,i),event=data.reminders.some(r=>r.pet===state.pet&&r.date===d);return `<button type="button" class="day ${event?'has-event':''} ${dateObj(d).getUTCMonth()!==month?'outside':''}" data-action="day" data-date="${d}" aria-pressed="${state.day===d}" aria-label="${dateText(d)}${event?'，有提醒':''}"><span>${Number(d.slice(8))}</span>${d===today?'<small>今天</small>':''}</button>`;}).join('')}</div><div class="calendar-expand">${ib('calendar-expand',state.month?'chevron-up':'chevron-down',state.month?'收起月历':'展开月历',`aria-expanded="${state.month}"`)}</div>`;
    const rows=list.map(r=>`<div class="reminder-row ${r.done?'done':''}"><button type="button" class="reminder-open" data-action="reminder-detail" data-id="${r.id}">${icon(r.kind==='bath'?'bath':r.kind==='walk'?'footprints':'scissors')}<span><h3>${esc(r.title)}</h3><small>${r.time}${r.done?' · 已完成':''}</small></span></button><button type="button" class="icon-button check-button" data-action="complete" data-id="${r.id}" aria-label="${r.done?'撤销完成':'完成'}${esc(r.title)}" aria-pressed="${r.done}">${icon(r.done?'circle-check':'circle')}</button></div>`).join('');
    return `<section class="page" aria-label="${esc(pets[state.pet].name)}的提醒">${heading('提醒',ib('reminder-list','list','查看所有待办'))}<div class="page-body reminder-body">${calendar}<div class="reminder-date"><span>${state.day===today?'今天':shortDate(state.day)}的安排</span><small>${list.filter(r=>!r.done).length} 件待办</small></div>${rows||'<p class="reminder-empty">这天没有安排</p>'}</div><div class="page-cta">${pill('add-reminder','新提醒','plus')}</div></section>`;
  }

  function show(content,type){
    if(!modal)lastFocus=document.activeElement;
    pauseVideos();
    const previous=modal;stopPlay();modal=type;base.inert=true;overlay.style.pointerEvents="";overlay.innerHTML=content;icons();
    const surface=overlay.firstElementChild;if(surface&&!reduced.matches&&!keyboardAction&&previous!==type)surface.animate([{transform:"translateY(18px)"},{transform:"translateY(0)"}],{duration:220,easing:"cubic-bezier(.32,.72,0,1)"});
    overlay.querySelector('button,input,textarea,select')?.focus({preventScroll:true});
  }
  function sheet(title,body,save=false,type='sheet'){
    show(`<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="gogo-sheet-title"><div class="sheet-header"><button type="button" class="quiet-button" data-action="close">${save?'取消':'关闭'}</button><h2 id="gogo-sheet-title">${title}</h2>${save?'<button type="button" data-action="save-editor" class="quiet-button">保存</button>':'<span style="width:54px"></span>'}</div><div class="sheet-content">${body}</div></section>`,type);
  }
  function close(){
    pauseVideos();
    stopPlay();const surface=overlay.firstElementChild;
    modal=null;editor=null;returnModal=null;base.inert=false;
    if(surface&&!reduced.matches&&!keyboardAction){
      overlay.style.pointerEvents='none';
      surface.animate([{transform:'translateY(0)'},{transform:'translateY(24px)'}],{duration:150,easing:'cubic-bezier(.23,1,.32,1)'}).finished.then(()=>{if(overlay.firstElementChild===surface&&!modal){overlay.innerHTML='';overlay.style.pointerEvents='';}}).catch(()=>{});
    }else overlay.innerHTML='';
    lastFocus?.isConnected?lastFocus.focus({preventScroll:true}):root.querySelector('.nav-item[aria-current]')?.focus({preventScroll:true});
  }
  function requestClose(){
    if(modal==='pet-delete-confirm'){renderEditor();return;}
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
    sheet('记一笔',`<div class="quick-grid">${Object.entries(kinds).map(([k,[name,symbol]])=>`<button type="button" class="quick-action" data-action="${k==='diary'?'write':'quick-save'}" data-kind="${k}">${icon(symbol)}<span>${name}</span></button>`).join('')}</div><div class="quick-bottom"><span class="meta">${esc(pets[state.pet].name)} · 今天</span><button type="button" class="quiet-button" data-action="supplement">补记</button></div>`,false,'quick');
  }
  function nowTime(){return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}
  function fastSave(kind){const destination=state.tab;const e={id:uid(),pet:state.pet,kind,date:today,time:nowTime(),text:''};data.entries.unshift(e);close();state.prints='all';state.tab=destination;render();toast(`已记下${kinds[kind][0]}`,()=>{data.entries=data.entries.filter(x=>x.id!==e.id);render();toast('已撤销');});}
  function field(label,name,value,type='text',extra=''){return `<label class="form-field"><span>${label}</span><input name="${name}" data-field="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
  function startEditor(kind,item){
    const defaults={id:null,pet:state.pet,date:kind==='reminder'?state.day:today,time:nowTime(),text:'',note:'',value:'',photoId:null,title:'',recordKind:'food',name:'',avatar:null,cell:null,birthday:'',arrival:'',detailsOpen:false,kind,dirty:false};
    editor={...defaults,...item,kind,dirty:false};if(item?.kind&&kind==='entry')editor.recordKind=item.kind;
    renderEditor();
  }
  function renderEditor(){
    const e=editor;let body='',title='';
    if(e.kind==='profile'){
      title=e.id?'宠物档案':'添加宠物';
      body=`<div class="profile-photo"><button type="button" class="profile-avatar-button" data-action="avatar-pick" aria-label="选择宠物头像">${avatar(e)}<span>${e.avatarLoading?'正在读取…':e.avatar||Number.isInteger(e.cell)?'更换头像':'添加头像'}</span></button>${e.avatar||Number.isInteger(e.cell)?'<button type="button" class="quiet-button" data-action="avatar-clear">移除头像</button>':''}</div>${field('名字','name',e.name,'text','required maxlength="128" autocomplete="off" placeholder="怎么称呼它"')}<details class="profile-options" ${e.detailsOpen?'open':''}><summary>更多资料 · 选填</summary>${field('生日','birthday',e.birthday,'date',`max="${today}"`)}${field('到家日','arrival',e.arrival,'date',`max="${today}"`)}${field('小特点','note',e.note,'text','maxlength="160"')}</details>${e.id?'<div class="profile-danger"><button type="button" class="quiet-button danger-button" data-action="pet-delete">删除这只宠物</button></div>':''}`;
    }else if(e.kind==='diary'){
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
    if(e.kind==='profile'){
      overlay.querySelector('[data-action="save-editor"]').disabled=!!e.avatarLoading;
      overlay.querySelector('.profile-options').addEventListener('toggle',event=>{if(editor===e)e.detailsOpen=event.target.open;});
    }
  }
  function photoField(e){const noun=e.kind==='diary'?'照片或视频':'照片';return `<div class="field-photo"><button type="button" class="photo-picker-trigger" data-action="pick-photo">${e.photoId?photo(e.photoId):`<span class="add-photo" aria-hidden="true">${icon('image-plus')}</span>`}<span>${e.photoId?'更换'+noun:'添加'+noun+' · 选填'}</span></button>${e.photoId?ib('clear-photo','x','移除附件'):''}</div>`;}
  function pickPhoto(){
    const list=photos(editor.pet).filter(p=>editor.kind==='diary'||p.type!=='video');sheet(editor.kind==='diary'?'选个瞬间':'选张照片',`<div class="photo-options">${list.map(p=>`<button type="button" data-action="choose-photo" data-id="${p.id}" aria-label="选择${dateText(p.date)}的${p.type==='video'?'视频':'照片'}" aria-pressed="${editor.photoId===p.id}">${photo(p)}</button>`).join('')}</div><button type="button" class="secondary-button full-button" data-action="editor-import">${icon('image-plus')} 从手机相册选择</button><button type="button" class="quiet-button full-button" data-action="back-editor">返回编辑</button>`,false,'photo-picker');
  }
  function submitEditor(){
    if(!editor||editor.avatarLoading)return;const form=overlay.querySelector('form');if(!form)return;
    if(editor.kind==='profile'&&[...form.querySelectorAll('details input')].some(input=>!input.validity.valid))form.querySelector('details').open=true;
    if(!form.reportValidity())return;
    const e=editor,pet=e.pet,editing=!!e.id;let item;
    const fail=message=>{const el=form.querySelector('.error');el.textContent=message;el.hidden=false;};
    if(e.kind==='profile'){
      const name=e.name.trim();
      if(!name||graphemes(name).length>16){fail('名字请填写 1–16 个字');return;}
      if(e.birthday>today||e.arrival>today){fail('生日和到家日不能晚于今天');return;}
      if(e.birthday&&e.arrival&&e.arrival<e.birthday){fail('到家日不能早于生日');return;}
      if(e.id&&!pets[e.id]){close();return;}
      const id=e.id||uid();
      pets[id]={name,avatar:e.avatar,cell:e.cell,birthday:e.birthday,arrival:e.arrival,note:e.note.trim()};
      if(!editing){state.pet=id;state.tab='prints';state.prints='diary';state.card=0;albumIndex=0;}
      close();render();savePrefs();revealPet();toast(editing?'档案已保存':'已添加 '+name);return;
    }
    if(e.kind!=='reminder'&&e.date>today){fail('记录日期不能晚于今天');return;}
    if(e.kind==='diary'){
      if(!e.text.trim()&&!e.photoId){fail('写一点小事，或选择照片、视频');return;}
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
  function revealPet(){
    const rail=root.querySelector('.pet-switch'),selected=rail.querySelector('[aria-pressed="true"]');if(!selected)return;
    const bounds=rail.getBoundingClientRect(),item=selected.getBoundingClientRect();
    if(item.left<bounds.left)rail.scrollLeft+=item.left-bounds.left;
    else if(item.right>bounds.right)rail.scrollLeft+=item.right-bounds.right;
  }
  function openProfile(){if(pets[state.pet])startEditor('profile',{...pets[state.pet],id:state.pet});}
  function confirmPetDelete(){
    const id=editor?.id,p=pets[id];if(!p)return;
    const media=data.photos.filter(x=>x.pet===id),videos=media.filter(x=>x.type==='video').length;
    const records=data.entries.filter(x=>x.pet===id).length+data.weights.filter(x=>x.pet===id).length;
    const reminders=data.reminders.filter(x=>x.pet===id).length;
    sheet('删除这只宠物？',`<div class="delete-pet-summary">${avatar({...p,id})}<h3>${esc(p.name)}</h3><p>${media.length-videos} 张照片 · ${videos} 段视频<br>${records} 条记录 · ${reminders} 个提醒</p></div><p class="delete-pet-warning">这些内容会一并删除，无法撤销。其他宠物不受影响。</p><button type="button" class="secondary-button full-button" data-action="pet-keep">保留宠物</button><button type="button" class="quiet-button full-button danger-button" data-action="pet-delete-confirm" data-id="${id}">确认删除</button>`,false,'pet-delete-confirm');
  }
  function deletePet(id){
    if(modal!=='pet-delete-confirm'||editor?.id!==id||!pets[id])return;
    close();
    for(const key of ['entries','weights','reminders'])data[key]=data[key].filter(x=>x.pet!==id);
    const remainingRefs=new Map([...data.entries,...data.weights].filter(x=>x.photoId).map(x=>[x.photoId,x.pet]));
    const removed=data.photos.filter(x=>x.pet===id&&!remainingRefs.has(x.id));
    data.photos=data.photos.filter(x=>x.pet!==id||remainingRefs.has(x.id));
    data.photos.forEach(x=>{if(x.pet===id)x.pet=remainingRefs.get(x.id);});
    const keptUrls=new Set(data.photos.map(x=>x.url));
    removed.forEach(x=>{if(x.type==='video'&&!keptUrls.has(x.url)){URL.revokeObjectURL(x.url);mediaUrls.delete(x.url);}});
    delete pets[id];state.pet=Object.keys(pets)[0]||null;state.card=0;albumIndex=0;
    shared.draft=null;render();savePrefs();revealPet();toast('宠物及相关内容已删除');
    if(!state.pet)root.querySelector('[data-action="pet-add"]')?.focus({preventScroll:true});
  }
  async function readImage(file,maxSize=1600){
    const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
    const im=new Image();im.src=raw;await im.decode();
    const canvas=document.createElement('canvas'),scale=Math.min(1,maxSize/Math.max(im.width,im.height));
    canvas.width=Math.max(1,Math.round(im.width*scale));canvas.height=Math.max(1,Math.round(im.height*scale));
    canvas.getContext('2d').drawImage(im,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.88);
  }
  async function importAvatar(file,target){
    if(!file||!target||target!==editor||target.kind!=='profile')return;
    if(!file.type.startsWith('image/')||file.size>20*1024*1024){toast('请选择 20 MB 以内的照片');return;}
    const request=uid();target.avatarRequest=request;target.avatarLoading=true;target.dirty=true;renderEditor();
    try{
      const url=await readImage(file,480);
      if(disposed||editor!==target||target.avatarRequest!==request)return;
      target.avatar=url;target.cell=null;
    }catch{if(!disposed&&editor===target&&target.avatarRequest===request)toast('头像无法读取，请换张照片');}
    finally{
      if(!disposed&&editor===target&&target.avatarRequest===request){target.avatarLoading=false;if(modal==='editor')renderEditor();}
    }
  }
  function entryDetail(id){
    const e=data.entries.find(x=>x.id===id);if(!e)return;
    sheet(e.kind==='diary'?'那天的小事':(kinds[e.kind]?.[0]||'照护'),`<div class="detail-meta"><small>${dateText(e.date)} · ${weekText(e.date)}</small><small>${e.time}</small></div>${e.photoId?mediaDetail(e.photoId,'detail-photo'):''}${e.text?`<p class="detail-copy">${esc(e.text)}</p>`:''}<div class="detail-actions"><button type="button" class="quiet-button danger-button" data-action="delete-entry" data-id="${e.id}">删除</button><button type="button" class="secondary-button" data-action="edit-entry" data-id="${e.id}">${icon('pencil')} 编辑</button></div>`,false,'detail');
  }
  function weightDetail(id){const w=data.weights.find(x=>x.id===id);if(!w)return;sheet('这次称重',`<div class="detail-meta"><small>${dateText(w.date)}</small><span>${w.value.toFixed(1)} kg</span></div>${w.photoId?photo(w.photoId,'detail-photo'):''}<p class="detail-copy">${esc(w.note)}</p><div class="detail-actions"><button type="button" class="quiet-button danger-button" data-action="delete-weight" data-id="${id}">删除</button><button type="button" class="secondary-button" data-action="edit-weight" data-id="${id}">${icon('pencil')} 编辑</button></div>`,false,'detail');}
  function reminderDetail(id){const r=data.reminders.find(x=>x.id===id);if(!r)return;sheet(r.title,`<p class="detail-copy">${dateText(r.date)} ${r.time}${r.done?' · 已完成':''}</p><div class="detail-actions"><button type="button" class="quiet-button danger-button" data-action="delete-reminder" data-id="${id}">删除</button><button type="button" class="secondary-button" data-action="edit-reminder" data-id="${id}">${icon('pencil')} 编辑</button></div>`,false,'detail');}
  function removeRecord(collection,id){const removed=data[collection].find(x=>x.id===id);data[collection]=data[collection].filter(x=>x.id!==id);close();render();toast(removed.photoId?'已删除记录，附件仍保留':'已删除',()=>{data[collection].push(removed);render();toast('已恢复');});}
  function complete(id){const r=data.reminders.find(x=>x.id===id);if(!r)return;r.done=!r.done;render();toast(r.done?'已完成':'已撤销完成');}
  function stopPlay(){clearInterval(playTimer);playTimer=null;}
  function viewer(id,autoplay=false){const list=photos();if(!list.length)return;viewerIndex=Math.max(0,list.findIndex(p=>p.id===id));renderViewer();if(autoplay&&!reduced.matches)startPlay();}
  function renderViewer(){
    const list=photos();const p=list[viewerIndex];if(!p){close();return;}
    const playing=!!playTimer;
    show(`<section class="viewer" role="dialog" aria-modal="true" aria-label="${p.type==='video'?'视频':'照片'}详情"><div class="viewer-header">${ib('close','x','关闭预览')}<small>${dateText(p.date)} · ${weekText(p.date)}</small>${ib('photo-menu','ellipsis','媒体操作',`data-id="${p.id}"`)}</div><div class="viewer-image">${mediaDetail(p)}</div><div class="viewer-footer"><p class="viewer-caption">${esc(p.caption||'留个瞬间')}</p><div class="viewer-controls"><small>${viewerIndex+1} / ${list.length}</small><div class="viewer-steps">${ib('photo-prev','chevron-left','上一个瞬间',list.length<2?'disabled':'')}${p.type==='video'?'':ib('toggle-play','circle-play','播放照片',list.length<2?'disabled':'')}${ib('photo-next','chevron-right','下一个瞬间',list.length<2?'disabled':'')}</div></div></div></section>`,'viewer');
    if(playing&&p.type!=='video')startPlay();
  }
  function startPlay(){
    stopPlay();if(reduced.matches||photos().length<2||photos()[viewerIndex]?.type==='video')return;
    playTimer=setInterval(()=>{if(document.hidden||modal!=='viewer'){stopPlay();updatePlayButton();return;}viewerIndex=(viewerIndex+1)%photos().length;renderViewer();},4500);updatePlayButton();
  }
  function updatePlayButton(){const b=overlay.querySelector('[data-action="toggle-play"]');if(b){b.innerHTML=icon(playTimer?'circle-pause':'circle-play');b.setAttribute('aria-label',playTimer?'暂停播放':'播放照片');icons();}}
  function requestImport(source,forEditor=false){
    const allowVideo=source!=='camera'&&(!forEditor||editor.kind==='diary');
    importContext={pet:forEditor?editor.pet:state.pet,editorRef:forEditor?editor:null,forEditor,source,allowVideo};const input=root.querySelector(source==='camera'?'.camera-input':'.media-input');input.value='';input.accept=allowVideo?'image/*,video/*':'image/*';input.multiple=!forEditor&&source!=='camera';input.click();
  }
  function readVideo(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),video=document.createElement('video');let settled=false;
      const abort=()=>finish(new Error('导入已取消'));
      const timer=setTimeout(()=>finish(new Error('视频读取超时')),15000);
      function finish(error,result){
        if(settled)return;settled=true;clearTimeout(timer);lifetime.signal.removeEventListener('abort',abort);
        video.onloadedmetadata=video.onloadeddata=video.onseeked=video.onerror=null;
        video.pause();video.removeAttribute('src');video.load();
        if(error){URL.revokeObjectURL(url);reject(error);}else resolve(result);
      }
      function capture(){
        if(settled||video.seeking||video.readyState<2||!video.videoWidth||!video.videoHeight)return;
        try{
          const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
          canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
          canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
          finish(null,{type:'video',url,poster:canvas.toDataURL('image/jpeg',.85),duration:Number.isFinite(video.duration)?video.duration:0,width:video.videoWidth,height:video.videoHeight});
        }catch{finish(new Error('视频封面无法读取'));}
      }
      lifetime.signal.addEventListener('abort',abort,{once:true});
      video.preload='auto';video.muted=true;video.playsInline=true;
      video.onloadedmetadata=()=>{if(!video.videoWidth||!video.videoHeight){finish(new Error('视频无法读取'));return;}try{video.currentTime=Math.min(.15,Number.isFinite(video.duration)?video.duration/2:.15);}catch{capture();}};
      video.onloadeddata=capture;video.onseeked=capture;video.onerror=()=>finish(new Error('当前浏览器无法读取该视频'));
      if(lifetime.signal.aborted){abort();return;}
      video.src=url;video.load();
    });
  }
  async function importFiles(files,context){
    if(!files.length||!context||!pets[context.pet])return;
    const selected=[...files],limit=context.forEditor||context.source==='camera'?1:20;
    const imported=[];let failures=Math.max(0,selected.length-limit),reason=failures?'每批最多 20 项':'';
    toast('正在导入…');
    for(const file of selected.slice(0,limit)){
      if(disposed||!pets[context.pet])break;
      const isVideo=file.type.startsWith('video/')||(!file.type&&/\.(mp4|mov|m4v|webm)$/i.test(file.name));
      const isImage=file.type.startsWith('image/')||(!file.type&&/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name));
      if((isVideo&&!context.allowVideo)||(!isVideo&&!isImage)){failures++;reason='文件类型不支持';continue;}
      if(file.size>(isVideo?200:20)*1024*1024){failures++;reason=isVideo?'单段视频最多 200 MB':'单张照片最多 20 MB';continue;}
      try{
        let media;
        if(isVideo)media=await readVideo(file);
        else media={type:'image',url:await readImage(file)};
        imported.push({id:uid(),pet:context.pet,date:today,caption:'',source:context.source,...media});
      }catch(error){failures++;reason=isVideo?(error.message||'视频无法读取'):'照片无法读取';}
    }
    if(disposed||!pets[context.pet]){imported.filter(p=>p.type==='video').forEach(p=>URL.revokeObjectURL(p.url));return;}
    if(context.forEditor&&editor!==context.editorRef){imported.filter(p=>p.type==='video').forEach(p=>URL.revokeObjectURL(p.url));toast('已取消这次导入');return;}
    if(imported.length){
      imported.filter(p=>p.type==='video').forEach(p=>mediaUrls.add(p.url));
      data.photos.unshift(...imported);
      if(context.source==='album'&&!context.forEditor)for(const p of imported)data.entries.unshift({id:uid(),pet:p.pet,kind:'diary',date:p.date,time:nowTime(),text:'',photoId:p.id});
      if(context.source==='camera')for(const p of imported)data.entries.unshift({id:uid(),pet:p.pet,kind:'diary',date:p.date,time:nowTime(),text:'',photoId:p.id});
      if(context.forEditor&&editor&&editor===context.editorRef){editor.photoId=imported[0].id;editor.dirty=true;renderEditor();}
      else if(state.pet===context.pet&&!modal){state.tab='prints';state.prints='diary';state.card=0;render();savePrefs();viewer(imported[0].id);}
      const videoCount=imported.filter(p=>p.type==='video').length,imageCount=imported.length-videoCount;
      toast(`已添加 ${[imageCount?imageCount+' 张照片':'',videoCount?videoCount+' 段视频':''].filter(Boolean).join('、')}${failures?`；${failures} 项未导入，${reason}`:''}`);
    }else toast(reason||'文件无法读取，请换一个文件再试');
  }
  function showMenu(){sheet('更多',`<button type="button" class="menu-item" data-action="pet-profile">${icon('paw-print')} 当前狗档案</button>${state.tab==='prints'?`<button type="button" class="menu-item" data-action="export-preview">${icon('book-open')} 回忆册预览</button><button type="button" class="menu-item" data-action="import">${icon('image-plus')} 导入照片或视频</button>`:''}`,false,'menu');}
  function exportPreview(){
    const list=entries(true),ws=weights(),photoList=photos();
    sheet('回忆册',`<div class="export-cover">${photoList[0]?photo(photoList[0]):''}<h2>${esc(pets[state.pet].name)}的小日子</h2><small>${photoList.length?dateText(photoList[photoList.length-1].date)+' — ':''}${dateText(today)}</small></div>${ws.length?`<div class="export-section"><h3>体重</h3>${weightChart(ws)}</div>`:''}${list.map(e=>`<div class="export-section"><h3>${dateText(e.date)}</h3>${e.photoId?photo(e.photoId):''}<p>${esc(e.text).replace(/\n/g,'<br>')}</p></div>`).join('')||'<p class="reminder-empty">写下日记后，再来翻翻吧。</p>'}`,false,'export');
  }
  function allReminders(){const list=data.reminders.filter(r=>r.pet===state.pet&&!r.done).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));sheet('待办',list.map(r=>`<button type="button" class="menu-item" data-action="goto-reminder" data-date="${r.date}">${icon('calendar-days')}<span>${esc(r.title)}<small style="display:block">${dateText(r.date)} ${r.time}</small></span></button>`).join('')||'<p class="reminder-empty">都完成了</p>',false,'reminder-list');}
  function changeCalendar(delta){if(state.month){const d=dateObj(state.day);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+delta);state.day=iso(d);}else state.day=addDays(state.day,7*delta);render();}

  root.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
    const {action,id,pet,tab,kind,mode,date}=button.dataset;
    switch(action){
      case 'theme':state.theme=state.theme==='light'?'dark':'light';render();savePrefs();root.querySelector('.theme-button').focus({preventScroll:true});break;
      case 'pet':if(!pets[pet]||state.pet===pet)break;state.pet=pet;state.card=0;albumIndex=0;render();savePrefs();revealPet();root.querySelector(`[data-pet="${pet}"]`).focus({preventScroll:true});break;
      case 'pet-add':startEditor('profile',{pet:null});break;
      case 'pet-profile':openProfile();break;
      case 'pet-delete':confirmPetDelete();break;
      case 'pet-keep':renderEditor();break;
      case 'pet-delete-confirm':deletePet(id);break;
      case 'avatar-pick':{avatarContext=editor;const input=root.querySelector('.avatar-input');input.value='';input.click();break;}
      case 'avatar-clear':editor.avatarRequest=null;editor.avatarLoading=false;editor.avatar=null;editor.cell=null;editor.dirty=true;renderEditor();break;
      case 'album-jump':{const rail=root.querySelector('.album-rail');const index=Number(button.dataset.index);rail?.scrollTo({left:index*rail.clientWidth,behavior:reduced.matches?'instant':'smooth'});break;}
      case 'tab':state.tab=tab;render();savePrefs();root.querySelector(`[data-tab="${tab}"]`).focus({preventScroll:true});break;
      case 'prints-mode':state.prints=mode;state.card=0;render();break;
      case 'weight-mode':state.weight=state.weight==='timeline'?'chart':'timeline';render();break;
      case 'day':state.day=date;render();break;
      case 'today':state.day=today;render();break;
      case 'calendar-expand':state.month=!state.month;render();break;
      case 'calendar-prev':changeCalendar(-1);break;
      case 'calendar-next':changeCalendar(1);break;
      case 'quick':quick();break;
      case 'notebook-add':notebookAdd();break;
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
        const p=data.photos.find(x=>x.id===id);sheet('这个瞬间',`<button type="button" class="menu-item" data-action="photo-to-diary" data-id="${p.id}">${icon('notebook-pen')} 写进日记</button><button type="button" class="menu-item" data-action="back-photo" data-id="${p.id}">${icon('image')} 返回预览</button>`,false,'photo-menu');break;
      }
      case 'photo-to-diary':startEditor('diary',{photoId:id});break;
      case 'back-photo':viewer(id);break;
    }
  });
  root.addEventListener('input',event=>{if(editor&&event.target.dataset.field){editor[event.target.dataset.field]=event.target.value;editor.dirty=true;}});
  root.addEventListener('change',event=>{if(editor&&event.target.dataset.field){editor[event.target.dataset.field]=event.target.value;editor.dirty=true;}});
  root.addEventListener('submit',event=>{event.preventDefault();submitEditor();});
  root.querySelectorAll('.media-input,.camera-input').forEach(input=>input.addEventListener('change',()=>{const context=importContext;importContext=null;importFiles(input.files,context);}));
  root.querySelector('.avatar-input').addEventListener('change',event=>{const target=avatarContext;avatarContext=null;importAvatar(event.target.files[0],target);});
  overlay.addEventListener('click',event=>{if(event.target===overlay)requestClose();});
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target.tagName==='INPUT'&&modal==='editor'){event.preventDefault();submitEditor();return;}
    if(event.key==='Escape'){event.preventDefault();if(modal==='discard-confirm')resumeEditor();else if(modal==='photo-picker')renderEditor();else requestClose();}
    if(event.key==='Tab'){const focusable=[...overlay.querySelectorAll('button:not([disabled]),input,select,textarea,summary,video[controls]')].filter(e=>e.getClientRects().length&&!e.closest('details:not([open]) :not(summary)'));const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  });
  overlay.addEventListener('error',event=>{if(event.target.tagName==='VIDEO'){const error=event.target.parentElement.querySelector('.media-error');if(error)error.hidden=false;}},true);
  overlay.addEventListener('play',event=>{if(event.target.tagName==='VIDEO'){stopPlay();updatePlayButton();}},true);
  overlay.addEventListener('focusin',event=>{if(modal==='viewer'&&playTimer&&event.isTrusted&&event.target.dataset.action!=='toggle-play'){stopPlay();updatePlayButton();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseVideos();stopPlay();updatePlayButton();}},{signal:lifetime.signal});
  reduced.addEventListener('change',()=>{if(reduced.matches){stopPlay();updatePlayButton();}},{signal:lifetime.signal});
  function bindAlbum(){
    const rail=root.querySelector('.album-rail');if(!rail)return;
    const events=new AbortController();
    rail.scrollLeft=albumIndex*rail.clientWidth;
    rail.addEventListener('scroll',()=>{
      albumIndex=Math.round(rail.scrollLeft/rail.clientWidth);
      root.querySelectorAll('[data-action="album-jump"]').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===albumIndex)));
      const count=root.querySelector('.album-position');if(count)count.textContent=`${albumIndex+1} / ${photos().length}`;

    },{passive:true,signal:events.signal});
    pageCleanup=()=>{events.abort();pageCleanup=()=>{};};
  }
  render();
  document.fonts?.ready.then(()=>{if(!disposed)revealPet();});
  if(shared.draft&&(shared.draft.kind==='profile'&&!shared.draft.id||pets[shared.draft.pet])){editor={...shared.draft};renderEditor();}
  return {
    snapshot(){shared.draft=editor?{...editor,avatarLoading:false}:null;shared.data=data;shared.preferences={pet:state.pet,theme:state.theme,tab:state.tab};},
    configure(key,value){
      design[key]=value;
      if(key==='content'){
        close();mediaUrls.forEach(url=>URL.revokeObjectURL(url));mediaUrls.clear();data=seed();state.card=0;albumIndex=0;
        if(value!=='full')for(const k of Object.keys(data))data[k]=value==='empty'?[]:Object.keys(pets).flatMap(p=>data[k].filter(x=>x.pet===p).slice(0,1));
        shared.data=data;
      }
      render();
    },
    destroy(){disposed=true;pauseVideos();lifetime.abort();disposeDiary();pageCleanup();stopPlay();clearTimeout(toastTimer);}
  };
}
