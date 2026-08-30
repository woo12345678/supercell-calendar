(function(){
'use strict';
var requestNumber=0,activeToken='',revenueInFlight=false,refreshButton=document.getElementById('revenueRefresh');
function setBusy(busy){revenueInFlight=busy;if(refreshButton){refreshButton.disabled=busy;refreshButton.setAttribute('aria-busy',String(busy));refreshButton.textContent=busy?'확인 중…':'지금 다시 확인'}}
function requestRevenue(force){if(revenueInFlight||!window.AndroidBridge||typeof AndroidBridge.refreshRevenue!=='function')return;activeToken='revenue-'+(++requestNumber);setBusy(true);try{AndroidBridge.refreshRevenue(activeToken,force===true)}catch(e){setBusy(false)}}
window.requestRevenueEstimates=requestRevenue;
function node(tag,className,value){var n=document.createElement(tag);if(className)n.className=className;if(value!==undefined)n.textContent=value;return n}
function money(v){return '$'+Math.round(v/100000)/10+'M'}
function checked(v){var d=new Date(v);return isNaN(d.getTime())?'확인 시각 없음':d.toLocaleString('ko-KR')}
function reportingMonth(v){var d=new Date(v);if(isNaN(d.getTime()))return '기준 월 없음';var kst=new Date(d.getTime()+9*60*60*1000);kst.setUTCMonth(kst.getUTCMonth()-1);return kst.getUTCFullYear()+'-'+String(kst.getUTCMonth()+1).padStart(2,'0')+' 기준'}
var labels={BUNDLED:'검증된 내장 자료',LIVE_WEEKLY:'방금 전체 확인',CACHED_WEEKLY:'최근 검증 자료',STALE_WEEKLY:'마지막 검증 자료가 오래됨'};
function render(data){
 var cards=document.getElementById('revenueCards');cards.textContent='';
 var numeric=data.games.filter(function(g){return typeof g.revenueUsd==='number'}).sort(function(a,b){return b.revenueUsd-a.revenueUsd||a.gameId.localeCompare(b.gameId)}),rank={},last=null,currentRank=0;
 numeric.forEach(function(g,i){if(g.revenueUsd!==last)currentRank=i+1;rank[g.gameId]=currentRank;last=g.revenueUsd});
 var displayGames=data.games.slice().sort(function(a,b){var av=typeof a.revenueUsd==='number'?a.revenueUsd:-1,bv=typeof b.revenueUsd==='number'?b.revenueUsd:-1;return bv-av||a.gameId.localeCompare(b.gameId)});
 document.getElementById('revenueSubtotal').textContent='공개된 Android USD 추정치 소계: '+money(numeric.reduce(function(s,g){return s+g.revenueUsd},0))+' · 회사 전체 매출 아님';
 document.getElementById('revenueStatus').textContent=(labels[data.sourceState]||'상태 확인 불가')+' · '+reportingMonth(data.checkedAt)+' · 출처 조회일 '+checked(data.checkedAt)+' · 앱 snapshot 갱신일 '+checked(data.snapshotUpdatedAt)+' · 전 세계 Android/Google Play 지난달 월간 추정치를 7일마다 다시 확인 (Android에서 작업이 지연될 수 있음)';
 displayGames.forEach(function(g){
  var card=node('article','revenue-card'),img=node('img','revenue-logo'),fallback=node('div','revenue-logo-fallback',g.nameKo),copy=node('div','revenue-copy');fallback.hidden=true;img.src=g.logo;img.alt=g.nameKo+' 로고';img.width=72;img.height=72;img.onerror=function(){img.hidden=true;fallback.hidden=false};card.append(img,fallback);
  copy.appendChild(node('p','revenue-rank',rank[g.gameId]?'#'+rank[g.gameId]:'순위 제외'));copy.appendChild(node('h3','',g.nameKo));copy.appendChild(node('strong','revenue-value',g.revenueUsd===null?'공개 meta에 금액 미표시':g.revenueSourceText.replace(/ revenue$/,'')+' USD'));copy.appendChild(node('p','',g.downloadsSourceText+' · 지난달 Android 비공식 공개 추정 · Supercell 공식 매출 아님'));copy.appendChild(node('p','revenue-source-state',(labels[data.sourceState]||'상태 확인 불가')+' · '+reportingMonth(data.checkedAt)+' · 출처 '+checked(data.checkedAt)+' · 앱 '+checked(data.snapshotUpdatedAt)));if(g.serviceNoteKo)copy.appendChild(node('p','revenue-service-note',g.serviceNoteKo));
  var actions=node('div','revenue-source-actions'),estimate=node('button','revenue-source-button','Sensor Tower 추정 출처'),official=node('button','revenue-source-button revenue-source-button-secondary','Supercell 게임·상태 출처');estimate.type=official.type='button';estimate.setAttribute('aria-label',g.nameKo+' Sensor Tower 추정 출처 열기');official.setAttribute('aria-label',g.nameKo+' Supercell 게임·상태 출처 열기');estimate.addEventListener('click',function(){if(window.AndroidBridge&&typeof AndroidBridge.openRevenueSource==='function')AndroidBridge.openRevenueSource(g.sensorTowerUrl)});official.addEventListener('click',function(){if(window.AndroidBridge&&typeof AndroidBridge.openRevenueOfficialSource==='function')AndroidBridge.openRevenueOfficialSource(g.officialGameUrl)});actions.append(estimate,official);copy.appendChild(actions);card.appendChild(copy);cards.appendChild(card);
 });
}
window.onRevenueResult=function(raw){var data;try{data=JSON.parse(raw)}catch(e){setBusy(false);return}if(data.requestToken!==activeToken)return;try{if(Array.isArray(data.games)&&data.games.length===7)render(data)}finally{setBusy(false)}};
refreshButton.addEventListener('click',function(){requestRevenue(true)});
}());
