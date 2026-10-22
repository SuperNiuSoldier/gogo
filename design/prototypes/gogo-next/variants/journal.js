const journalDirection = {
  id:'journal',name:'手账',weightDefault:'timeline',
  weight(c){
    const {list,photo,ib,pill,heading,empty,state,esc,dateText,weightChart}=c;
    let body=empty('chart-no-axes-combined','记下第一次体重');
    if(list.length&&state.weight==='timeline')body=`<div class="growth-line">${list.map((w,i)=>`<button type="button" class="growth-moment" data-action="weight-detail" data-id="${w.id}" aria-label="${dateText(w.date)} ${w.value}千克"><span class="growth-photo">${photo(w.photoId)}</span><span class="growth-copy"><small>${dateText(w.date)}</small><span><strong>${w.value.toFixed(1)}</strong> kg</span><small>${esc(w.note||'称重记录')}</small></span></button>`).join('')}</div>`;
    else if(list.length)body=`<div class="journal-weight-summary"><small>最近一次</small><h2>${list[0].value.toFixed(1)} <small>kg</small></h2></div>${weightChart(list)}<div class="weight-film">${[...list].reverse().map(w=>`<button type="button" data-action="weight-detail" data-id="${w.id}" aria-label="${dateText(w.date)}的称重记录">${photo(w.photoId)}<small>${w.value.toFixed(1)} kg</small></button>`).join('')}</div>`;
    return `<section class="page" aria-label="${c.pets[state.pet].name}的体重">${heading('体重',ib('weight-mode',state.weight==='timeline'?'chart-no-axes-combined':'list',state.weight==='timeline'?'查看体重趋势':'查看照片成长线'))}<div class="page-body weight-body">${body}</div><div class="page-cta">${pill('add-weight','记体重')}</div></section>`;
  }
};
