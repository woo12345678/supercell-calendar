(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.UserCalendarCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const GAME_IDS=Object.freeze(['clash-of-clans','brawl-stars','boom-beach','clash-royale','hay-day']);
  const ROOT_KEYS=Object.freeze(['events','schemaVersion']);
  const EVENT_KEYS=Object.freeze(['createdAt','endDate','gameId','id','note','startDate','title']);
  const EMPTY=Object.freeze({schemaVersion:1,events:Object.freeze([])});
  const utf8Length=value=>typeof TextEncoder==='function'?new TextEncoder().encode(value).length:unescape(encodeURIComponent(value)).length;
  const exactKeys=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('\0')===keys.join('\0');
  function realDate(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const [year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
  }
  const clean=(value,min,max)=>typeof value==='string'&&value.length>=min&&value.length<=max&&!/[\u0000-\u001f\u007f<>]/.test(value)&&!/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF])/.test(value);
  function hasDuplicateKeys(raw){const stack=[];for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='{'){stack.push(new Set());continue}if(c==='['){stack.push(null);continue}if(c==='}'||c===']'){stack.pop();continue}if(c!=='"')continue;const start=i;for(i++;i<raw.length;i++){if(raw[i]==='\\'){i++;continue}if(raw[i]==='"')break}let next=i+1;while(/\s/.test(raw[next]||''))next++;const scope=stack[stack.length-1];if(raw[next]!==':'||!scope)continue;let key;try{key=JSON.parse(raw.slice(start,i+1))}catch(_error){return true}if(scope.has(key))return true;scope.add(key)}return false;}
  function validEvent(event){
    if(!exactKeys(event,EVENT_KEYS)||!clean(event.id,1,48)||!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(event.id)||!GAME_IDS.includes(event.gameId)||!clean(event.title,1,60)||!clean(event.note,0,160)||!realDate(event.startDate)||!realDate(event.endDate)||typeof event.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.createdAt))return false;
    const start=Date.parse(event.startDate+'T00:00:00.000Z'),end=Date.parse(event.endDate+'T00:00:00.000Z');
    if(end<start||(end-start)/86400000>365)return false;
    const created=new Date(event.createdAt);
    return !Number.isNaN(created.valueOf())&&created.toISOString()===event.createdAt;
  }
  function validState(value){
    if(!exactKeys(value,ROOT_KEYS)||value.schemaVersion!==1||!Array.isArray(value.events)||value.events.length>100)return false;
    const ids=new Set();
    return value.events.every(event=>validEvent(event)&&!ids.has(event.id)&&!!ids.add(event.id));
  }
  function parseState(raw){
    if(typeof raw!=='string'||utf8Length(raw)>32768)throw new TypeError('Invalid user calendar state');
    if(hasDuplicateKeys(raw))throw new TypeError('Invalid user calendar state');let value;try{value=JSON.parse(raw);}catch(_error){throw new TypeError('Invalid user calendar state');}
    if(!validState(value))throw new TypeError('Invalid user calendar state');
    return value;
  }
  function cloneState(value){return parseState(JSON.stringify(value));}
  function bounded(value){const raw=JSON.stringify(value);if(utf8Length(raw)>32768)throw new TypeError('Invalid user calendar state');return parseState(raw);}
  function addEvent(state,event){const base=cloneState(state);return bounded({schemaVersion:1,events:[...base.events,{...event}]});}
  function updateEvent(state,id,event){const base=cloneState(state),index=base.events.findIndex(item=>item.id===id);if(index<0||event.id!==id)throw new TypeError('Unknown user event');return bounded({schemaVersion:1,events:base.events.map((item,i)=>i===index?{...event}:item)});}
  function deleteEvent(state,id){const base=cloneState(state);if(!base.events.some(item=>item.id===id))throw new TypeError('Unknown user event');return bounded({schemaVersion:1,events:base.events.filter(item=>item.id!==id)});}
  function createLocalStorageAdapter(storage,key){
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw new TypeError('Invalid storage');
    let recovery=null;
    return Object.freeze({
      load(){const raw=storage.getItem(key);if(raw===null){recovery=null;return cloneState(EMPTY)}try{const state=parseState(raw);recovery=null;return state}catch(_error){recovery='CORRUPT_LOCAL_STATE';return cloneState(EMPTY)}},
      save(state){let next,previous;try{next=JSON.stringify(bounded(state));previous=storage.getItem(key);storage.setItem(key,next);if(storage.getItem(key)!==next)throw new Error('read-back mismatch');recovery=null;return true;}catch(_error){try{if(previous===null&&typeof storage.removeItem==='function')storage.removeItem(key);else if(previous!==undefined&&previous!==null)storage.setItem(key,previous);}catch(_rollback){}return false;}},
      recoveryStatus(){return recovery;}
    });
  }
  function selectDisplayEvents(events,limit,authoritativeSelector){const trusted=events.filter(event=>event.status!=='USER_CREATED'),personal=events.filter(event=>event.status==='USER_CREATED'),selected=authoritativeSelector(trusted,limit),visible=selected.visible.slice();for(const event of personal){if(visible.length>=limit)break;visible.push(event)}return{visible,overflow:Math.max(0,events.length-visible.length)};}
  const personalEventCount=events=>events.reduce((count,event)=>count+(event&&event.status==='USER_CREATED'?1:0),0);
  return Object.freeze({GAME_IDS,EMPTY,validEvent,validState,parseState,addEvent,updateEvent,deleteEvent,createLocalStorageAdapter,selectDisplayEvents,personalEventCount});
});
