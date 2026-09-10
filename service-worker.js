'use strict';
const CACHE_PREFIX='clash-calendar-pwa-';
const CACHE_VERSION='v23';
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const INVENTORY='asset-inventory.json';
const MAX_INVENTORY_BYTES=1024*1024,MAX_ASSET_BYTES=16*1024*1024,MAX_FILES=512;
const APP_SHELL=Object.freeze(['./','index.html','styles.css','priority-agenda.css','daily-brief.css','daily-dashboard.css','supercell-games.css','entity-images.css','readability.css','revenue.css','spend.css','instant-training.css','user-calendar.css','emergency.css','calendar-core.js','user-calendar-core.js','user-calendar.js','operations-core.js','instant-training-core.js','spend-core.js','emergency-core.js','emergency-issues.js','emergency.js','strategy-data.js','game-meta-data.js','supercell-games.js','app.js','revenue.js','spend.js','pwa.js','manifest.webmanifest','assets/pwa/calendar-icon-192.png','assets/pwa/calendar-icon-512.png','assets/pwa/apple-touch-icon-180.png','assets/pwa/provenance.json','assets/purchase-catalog-v1.js']);
const scopePath=new URL(self.registration.scope).pathname;
const shellPaths=Object.freeze([...new Set(APP_SHELL.map(path=>path==='./'?'index.html':path))]);
const allowed=new Set(shellPaths.map(path=>new URL(path,self.registration.scope).pathname));
function exactKeys(value,keys){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===keys.slice().sort().join('|')}
function safePath(path){return typeof path==='string'&&path.length>0&&path.length<=256&&!path.startsWith('/')&&!path.includes('\\')&&!path.split('/').some(part=>part===''||part==='.'||part==='..')&&new URL(path,self.registration.scope).origin===self.location.origin}
async function bytes(response,limit){const data=await response.arrayBuffer();if(data.byteLength>limit)throw new Error('response too large');return data}
function verifiedResponse(response,expected){const url=new URL(expected,self.registration.scope);if(!response||response.status!==200||!response.ok||response.redirected||response.type!=='basic'||response.url!==url.href)throw new Error('untrusted response');}
async function sha256(data){const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('')}
async function installShell(){
 try{
  await caches.delete(CACHE_NAME);
  const inventoryResponse=await fetch(new URL(INVENTORY,self.registration.scope),{cache:'no-store',redirect:'error'});verifiedResponse(inventoryResponse,INVENTORY);
  const inventoryBytes=await bytes(inventoryResponse.clone(),MAX_INVENTORY_BYTES),inventoryText=new TextDecoder('utf-8',{fatal:true}).decode(inventoryBytes),inventory=JSON.parse(inventoryText);
  if(!exactKeys(inventory,['schemaVersion','generatedAt','inventoryScope','files'])||inventory.schemaVersion!==1||typeof inventory.generatedAt!=='string'||!Number.isFinite(Date.parse(inventory.generatedAt))||inventory.inventoryScope!=='all files except asset-inventory.json'||!Array.isArray(inventory.files)||inventory.files.length>MAX_FILES)throw new Error('invalid inventory');
  const entries=new Map();for(const item of inventory.files){if(!exactKeys(item,['path','bytes','sha256'])||!safePath(item.path)||!Number.isSafeInteger(item.bytes)||item.bytes<0||item.bytes>MAX_ASSET_BYTES||typeof item.sha256!=='string'||!/^[0-9a-f]{64}$/.test(item.sha256)||entries.has(item.path))throw new Error('invalid inventory entry');entries.set(item.path,item)}
  for(const path of shellPaths)if(!entries.has(path))throw new Error('missing shell entry');
  const verified=[];for(const path of shellPaths){const expected=entries.get(path),response=await fetch(new URL(path,self.registration.scope),{cache:'no-store',redirect:'error'});verifiedResponse(response,path);const data=await bytes(response.clone(),MAX_ASSET_BYTES);if(data.byteLength!==expected.bytes||await sha256(data)!==expected.sha256)throw new Error('asset mismatch');verified.push([new URL(path,self.registration.scope),response])}
  const cache=await caches.open(CACHE_NAME);for(const [url,response] of verified)await cache.put(url,response);await cache.put(new URL(INVENTORY,self.registration.scope),inventoryResponse)
 }catch(error){await caches.delete(CACHE_NAME);throw error}
}
self.addEventListener('install',event=>event.waitUntil(installShell()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(scopePath))return;
  const navigation=request.mode==='navigate',shell=allowed.has(url.pathname);if(!navigation&&!shell)return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME),cached=await cache.match(navigation?new URL('index.html',self.registration.scope):url);if(cached)return cached;throw new Error('verified shell unavailable')})());
});
