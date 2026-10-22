const everydayDirection = {
  id:'everyday',name:'日常',weightDefault:'chart',
  weight(c){
    const {list,photo,ib,pill,heading,empty,state,esc,dateText,weightChart}=c;
    let body=empty('chart-no-axes-combined','记录一次体重');
    if(list.length){
      const latest=list[0],first=list.at(-1),change=latest.value-first.value;
      body=`<div class="daily-weight-summary"><div><small>最近体重</small><span><strong>${latest.value.toFixed(1)}</strong> kg</span></div><div><small>${list.length>1?'这段时间':'记录次数'}</small><span>${list.length>1?(change>=0?'+':'')+change.toFixed(1)+' kg':'1 次'}</span></div></div>`;
      if(state.weight==='chart')body+=weightChart(list);
      body+=`<div class="measurements"><div class="chart-heading"><h3>称重记录</h3><small>${list.length} 次</small></div>${list.map(w=>`<button type="button" class="measurement" data-action="weight-detail" data-id="${w.id}">${photo(w.photoId)}<span><span>${dateText(w.date)}</span><small>${esc(w.note||'称重记录')}</small></span><strong>${w.value.toFixed(1)} <small>kg</small></strong></button>`).join('')}</div>`;
    }
    return `<section class="page" aria-label="${c.pets[state.pet].name}的体重">${heading('体重',ib('weight-mode',state.weight==='chart'?'list':'chart-no-axes-combined',state.weight==='chart'?'仅看称重记录':'查看体重趋势'))}<div class="page-body weight-body">${body}</div><div class="page-cta">${pill('add-weight','记体重')}</div></section>`;
  }
};
