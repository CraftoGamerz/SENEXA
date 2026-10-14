import {validateReadings,type Reading} from './domain';
export type Gateway={url:string;token:string};
export async function request(g:Gateway,path:string,body?:unknown,method?:string){
 const base=new URL(g.url);if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)throw Error('Use a plain HTTP or HTTPS gateway URL.');
 if(location.protocol==='https:'&&base.protocol==='http:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Open the app from your LAN gateway, or connect through HTTPS. This secure page cannot access an insecure LAN server.');
 const r=await fetch(`${g.url.replace(/\/$/,'')}/api${path}`,{method:method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json','Authorization':`Bearer ${g.token}`},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const json=await r.json();if(!r.ok)throw Error(typeof json.detail==='string'?json.detail:`Gateway returned ${r.status}. Check your token and request.`);return json;
}
export async function snapshot(g:Gateway):Promise<{readings:Reading[];simulator:boolean;model:string;alerts:any[]}>{const data=await request(g,'/snapshot');return {...data,readings:validateReadings(data.readings)};}
