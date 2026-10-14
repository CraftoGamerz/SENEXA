export type Machine = { id:string; name:string; type:string; zone:string; installedAt:string };
export type Reading = {machineId:string; timestamp:string; vibration:number; temperature:number; current:number; rpm:number; source:'simulator'|'sensor'; score?:number};
export type Alert = {id:string;machineId:string;title:string;severity:'warning'|'critical';status:'open'|'acknowledged';createdAt:string;reason:string};
export type WorkOrder = {id:string;machineId:string;title:string;assignee:string;dueDate:string;status:'open'|'in-progress'|'completed';notes:string;alertId:string|null;outcome?:'unreviewed'|'normal'|'fault-confirmed'|'inconclusive'};
export type Thresholds = {vibration:number;temperature:number;current:number};
export type Profile = {displayName:string;profession:'owner'|'manager'|'engineer'|'operator'};
export type Workspace = {version:1;name:string;industry:string;machines:Machine[];alerts:Alert[];orders:WorkOrder[];thresholds:Thresholds;updatedAt:string;profile?:Profile;dataset?:'demo'|'live'};
export const id=()=>crypto.randomUUID();
export const date=()=>new Date().toISOString().slice(0,10);
export function seed():Workspace {
 const now=new Date().toISOString();
 return {version:1,dataset:'demo',name:'CompileX Works',industry:'Precision manufacturing',updatedAt:now,thresholds:{vibration:5.5,temperature:80,current:30},machines:[
 ['CNC-01','CNC spindle A','CNC lathe','Production A'],['CNC-02','CNC spindle B','CNC lathe','Production A'],['PMP-01','Cooling pump','Centrifugal pump','Utilities'],['PRS-01','Hydraulic press','Press','Production B'],['CMP-01','Air compressor','Compressor','Utilities'],['MTR-01','Conveyor motor','Motor','Assembly']
 ].map(([id,name,type,zone])=>({id,name,type,zone,installedAt:date()})),alerts:[{id:'demo-bearing',machineId:'CNC-01',title:'Elevated spindle vibration',severity:'critical',status:'open',createdAt:now,reason:'Demo reading exceeds the vibration threshold. Inspect spindle alignment and bearing condition.'},{id:'demo-pump',machineId:'PMP-01',title:'Temperature approaching limit',severity:'warning',status:'open',createdAt:now,reason:'Demo temperature trend is rising. Check cooling flow before the next shift.'}],orders:[{id:'WO-1042',machineId:'CNC-01',title:'Inspect spindle bearing',assignee:'Arjun Mehta',dueDate:date(),status:'open',notes:'Check lubrication and record vibration after inspection.',alertId:'demo-bearing'},{id:'WO-1041',machineId:'CMP-01',title:'Replace intake filter',assignee:'Priya Sen',dueDate:date(),status:'in-progress',notes:'Scheduled service from the demo maintenance plan.',alertId:null}]};
}
export function readingFor(m:Machine,t=Date.now(),tick=0):Reading {
 const index=['CNC-01','CNC-02','PMP-01','PRS-01','CMP-01','MTR-01'].indexOf(m.id);
 const phase=Math.sin(t/11000+index)+Math.sin(t/3700+index)*.3;
 const bases=index===0?[6.4,77,24,2840]:index===2?[3.2,76,16,1450]:[1.6+Math.max(0,index)*.22,49+Math.max(0,index)*3,12+Math.max(0,index),1500+Math.max(0,index)*180];
 return {machineId:m.id,timestamp:new Date(t).toISOString(),vibration:+Math.max(.1,bases[0]+phase*.35+tick*.01).toFixed(2),temperature:+(bases[1]+phase*1.8).toFixed(1),current:+(bases[2]+phase*.6).toFixed(1),rpm:Math.round(bases[3]+phase*25),source:'simulator'};
}
export function demoHistory(machines:Machine[]):Reading[]{const t=Date.now();return machines.flatMap(m=>Array.from({length:40},(_,i)=>readingFor(m,t-(39-i)*3000)));}
export function latest(readings:Reading[],mid:string){return readings.filter(r=>r.machineId===mid).at(-1);}
export function stateOf(r:Reading|undefined,t:Thresholds):'healthy'|'warning'|'critical'|'offline'{
 if(!r||Date.now()-Date.parse(r.timestamp)>15000)return 'offline';
 const ratio=Math.max(r.vibration/t.vibration,r.temperature/t.temperature,r.current/t.current);
 return ratio>=1?'critical':ratio>=.9?'warning':'healthy';
}
export function health(r:Reading|undefined,t:Thresholds){if(!r)return 0;return Math.max(0,Math.min(100,Math.round(100-Math.max(r.vibration/t.vibration,r.temperature/t.temperature,r.current/t.current)*40)));}
export function fromAlert(w:Workspace,a:Alert):Workspace {
 if(w.orders.some(o=>o.alertId===a.id))return w;
 return {...w,orders:[{id:id(),machineId:a.machineId,title:a.title,assignee:'Unassigned',dueDate:date(),status:'open',notes:a.reason,alertId:a.id},...w.orders]};
}
export function validateReadings(value:unknown):Reading[]{
 if(!Array.isArray(value)||value.length>10000)throw Error('Expected a bounded list of telemetry readings.');
 return value.map((r:any)=>{if(!r||typeof r.machineId!=='string'||r.machineId.length>80||!Number.isFinite(Date.parse(r.timestamp))||!['sensor','simulator'].includes(r.source))throw Error('Invalid machine ID, timestamp or source.');
 for(const [key,min,max] of [['vibration',0,100],['temperature',-40,250],['current',0,1000],['rpm',0,100000]] as const){if(typeof r[key]!=='number'||!Number.isFinite(r[key])||r[key]<min||r[key]>max)throw Error(`Invalid ${key} value.`);}
 if(Date.parse(r.timestamp)>Date.now()+60000)throw Error('Reading timestamp is in the future.');
 return {machineId:r.machineId,timestamp:r.timestamp,vibration:r.vibration,temperature:r.temperature,current:r.current,rpm:r.rpm,source:r.source};});
}
export function validateWorkspace(v:any):Workspace {
 if(!v||v.version!==1||typeof v.name!=='string'||!v.name.trim()||v.name.length>100||typeof v.industry!=='string'||v.industry.length>100)throw Error('Invalid workspace backup.');
 for(const k of ['machines','alerts','orders'])if(!Array.isArray(v[k])||v[k].length>500)throw Error('Workspace exceeds the 500-record limit.');
 const str=(o:any,keys:string[])=>keys.every(k=>typeof o?.[k]==='string'&&o[k].length<=4000);
 if(v.machines.some((m:any)=>!str(m,['id','name','type','zone','installedAt'])||!m.id||!m.name))throw Error('Invalid asset data.');
 if(new Set(v.machines.map((m:Machine)=>m.id)).size!==v.machines.length)throw Error('Duplicate machine IDs.');
 const mids=new Set(v.machines.map((m:Machine)=>m.id));
 if(v.alerts.some((a:any)=>!str(a,['id','machineId','title','createdAt','reason'])||!mids.has(a.machineId)||!['warning','critical'].includes(a.severity)||!['open','acknowledged'].includes(a.status)))throw Error('Invalid alerts.');
 if(v.orders.some((o:any)=>!str(o,['id','machineId','title','assignee','dueDate','notes'])||!mids.has(o.machineId)||!['open','in-progress','completed'].includes(o.status)||!(o.alertId===null||typeof o.alertId==='string')))throw Error('Invalid work orders.');
 for(const [k,max] of [['vibration',100],['temperature',250],['current',1000]] as const)if(typeof v.thresholds?.[k]!=='number'||!Number.isFinite(v.thresholds[k])||v.thresholds[k]<=0||v.thresholds[k]>max)throw Error('Invalid thresholds.');
 if(v.profile&&(!str(v.profile,['displayName','profession'])||!['owner','manager','engineer','operator'].includes(v.profile.profession)||v.profile.displayName.length>100))throw Error('Invalid operator profile.');
 if(v.orders.some((o:WorkOrder)=>o.outcome&&!['unreviewed','normal','fault-confirmed','inconclusive'].includes(o.outcome)))throw Error('Invalid inspection outcome.');
 if(v.dataset&&!['demo','live'].includes(v.dataset))throw Error('Invalid dataset context.');
 return {version:1,dataset:v.dataset||'demo',name:v.name,industry:v.industry,machines:v.machines,alerts:v.alerts,orders:v.orders,thresholds:v.thresholds,profile:v.profile||{displayName:'CompileX team',profession:'operator'},updatedAt:new Date().toISOString()};
}
export function csv(rows:Record<string,unknown>[]):string{if(!rows.length)return '';const keys=Object.keys(rows[0]);const escape=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return [keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(escape).join(',')).join('\r\n');}
export function download(name:string,text:string,type='text/csv'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function parseCSV(text:string):Reading[]{const lines=text.trim().split(/\r?\n/);const keys=lines.shift()?.split(',').map(x=>x.trim().replace(/^"|"$/g,''));if(!keys)throw Error('CSV is empty.');return validateReadings(lines.map(line=>{const cells=line.split(',').map(x=>x.trim().replace(/^"|"$/g,''));const r:any={};keys.forEach((k,i)=>r[k]=['vibration','temperature','current','rpm'].includes(k)?Number(cells[i]):cells[i]);return r;}));}
