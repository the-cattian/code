/* Shadow Chrome API for local testing. NEVER writes to your actual extension storage. */
window.chrome=(()=>{
  const saved=Object.create(null);
  const changed=[],handlers=[];
  const api={
    runtime:{lastError:null,getURL:path=>new URL('../'+path,location.href).href,onMessage:{addListener(fn){handlers.push(fn);}},__send(message,cb){let replied=false;for(const fn of handlers){const answer=v=>{if(!replied){replied=true;if(cb)cb(v);}};try{fn(message,{id:'zenx-offline-test'},answer);}catch(err){console.error(err);}}if(!replied&&cb)cb({success:false,error:'Unknown command'});}},
    storage:{onChanged:{addListener(fn){changed.push(fn);}},local:{get(defaults,callback){const keys=typeof defaults==='object'?Object.keys(defaults):Array.isArray(defaults)?defaults:[defaults];const obj={};for(const k of keys)obj[k]=Object.prototype.hasOwnProperty.call(saved,k)?saved[k]:defaults?.[k];callback(obj);},set(obj,callback){const changes={};for(const[k,value]of Object.entries(obj)){changes[k]={oldValue:saved[k],newValue:value};saved[k]=value;}changed.forEach(fn=>{try{fn(changes,'local');}catch(err){console.error(err);}});if(callback)callback();}}}
  };
  api.__reset=()=>{for(const key of Object.keys(saved))delete saved[key];};
  return api;
})();
window.ZenXTestMode=true;
