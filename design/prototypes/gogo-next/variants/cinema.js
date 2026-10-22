const cinemaDirection = {
  id:'cinema',name:'影集',weightDefault:'chart',
  weight(c){
    const {list,photo,ib,pill,heading,empty,state,weightChart,esc,shortDate,dateText}=c;
    const latest=list[0],delta=list.length>1?latest.value-list[1].value:null;
    let body=empty('chart-no-axes-combined','留下第一笔成长');
    if(latest){
      const summary=`<div class="weight-hero"><div><small>${dateText(latest.date)}</small><div><strong>${latest.value.toFixed(1)}</strong><span> kg</span></div><small>${delta===null?'第一次称重':`较上次 ${delta>=0?'+':''}${delta.toFixed(1)} kg`}</small></div><button type="button" data-action="weight-detail" data-id="${latest.id}" aria-label="查看这次称重">${photo(latest.photoId)}</button></div>`;
      const timeline=`<div class="measurements">${list.map(w=>`<button type="button" class="measurement" data-action="weight-detail" data-id="${w.id}">${photo(w.photoId)}<span><span>${shortDate(w.date)}</span><small>${esc(w.note||'称重记录')}</small></span><strong>${w.value.toFixed(1)} <small>kg</small></strong></button>`).join('')}</div>`;
      body=summary+(state.weight==='chart'?`<div class="chart-heading"><h3>最近的变化</h3><small>${list.length} 次记录</small></div>${weightChart(list)}<div class="weight-film">${[...list].reverse().map(w=>`<button type="button" data-action="weight-detail" data-id="${w.id}" aria-label="${dateText(w.date)} ${w.value}千克">${photo(w.photoId)}<small>${shortDate(w.date)}</small></button>`).join('')}</div>`:timeline);
    }
    return `<section class="page" aria-label="${c.pets?.[state.pet]?.name||'当前狗狗'}的体重">${heading('体重',ib('weight-mode',state.weight==='chart'?'list':'chart-no-axes-combined',state.weight==='chart'?'查看称重记录':'查看体重趋势'))}<div class="page-body weight-body">${body}</div><div class="page-cta">${pill('add-weight','记体重')}</div></section>`;
  }
};
