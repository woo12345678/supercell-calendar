(function(){'use strict';
  var EXPECTED_CACHE='clash-calendar-pwa-v6',browserProtocol=location.protocol==='http:'||location.protocol==='https:',status=document.getElementById('pwaStatus'),registration=null;
  if(!browserProtocol||!status||!('serviceWorker' in navigator))return;
  status.hidden=false;
  function show(message){status.textContent=message}
  async function hasVerifiedCopy(){if(!navigator.serviceWorker.controller)return false;try{return await caches.has(EXPECTED_CACHE)}catch(_cache){return false}}
  async function evaluate(reason){
    var verified=await hasVerifiedCopy();
    if(reason==='update-failed'){show(verified?'업데이트 확인에 실패했습니다. 마지막으로 검증된 오프라인 사본을 사용합니다.':'업데이트 확인에 실패했으며 검증된 오프라인 사본을 확인하지 못했습니다.');return}
    if(reason==='registration-failed'){show(verified?'오프라인 앱 등록에 실패했습니다. 마지막으로 검증된 오프라인 사본을 사용합니다.':'오프라인 앱 등록에 실패했으며 검증된 오프라인 사본을 확인하지 못했습니다.');return}
    if(registration&&(registration.waiting||(registration.installing&&registration.installing.state!=='activated'))){show('검증된 업데이트가 준비되었습니다. 다시 열거나 새로고침하여 적용하세요.');return}
    if(verified){show(navigator.onLine?'업데이트 확인 완료 · 검증된 오프라인 앱이 적용되었습니다.':'오프라인 · 마지막으로 검증된 사본을 사용 중입니다.');return}
    show(navigator.onLine?'검증된 오프라인 앱을 준비 중이며 아직 적용되지 않았습니다.':'오프라인 · 검증된 오프라인 앱을 아직 사용할 수 없습니다.');
  }
  window.addEventListener('online',function(){evaluate()});window.addEventListener('offline',function(){evaluate()});
  navigator.serviceWorker.addEventListener('controllerchange',function(){evaluate()});
  evaluate();
  navigator.serviceWorker.register('service-worker.js',{scope:'./'}).then(function(value){registration=value;registration.addEventListener('updatefound',function(){var worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',function(){evaluate()});evaluate()});return registration.update().then(function(){return evaluate()}).catch(function(){return evaluate('update-failed')})}).catch(function(){return evaluate('registration-failed')});
}());
