import {useEffect,useRef,useState} from 'react';
import {onAuthStateChanged,type User} from 'firebase/auth';
import {auth} from './firebase';
import {seed,validateWorkspace,type Workspace} from './domain';
function read(key:string){try{const s=localStorage.getItem(key);return s?validateWorkspace(JSON.parse(s)):seed();}catch{return seed();}}
export function useWorkspace(){
 const [user,setUser]=useState<User|null>(null);const [key,setKey]=useState('senexa:demo:v1');
 const [workspace,setWorkspace]=useState<Workspace>(()=>read('senexa:demo:v1'));const [storageError,setStorageError]=useState('');const loaded=useRef(key);
 useEffect(()=>onAuthStateChanged(auth,u=>{const k=`senexa:${u?.uid||'demo'}:v1`;setUser(u);if(k!==loaded.current){loaded.current=k;setWorkspace(read(k));setKey(k);}}),[]);
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(workspace));setStorageError('');}catch{setStorageError('Browser storage is full or unavailable. Export a backup to keep your changes.');}},[key,workspace]);
 function switchWorkspace(source:'demo'|'live'){
  const k=`senexa:${user?.uid||'demo'}:${source==='demo'?'v1':'live:v1'}`;
  if(k===loaded.current)return;
  let next:Workspace;
  try{const saved=localStorage.getItem(k);next=saved?validateWorkspace(JSON.parse(saved)):source==='live'?{...workspace,dataset:'live',alerts:[],orders:[]}:seed();}catch{next={...workspace,dataset:source,alerts:[],orders:[]};}
  loaded.current=k;setKey(k);setWorkspace(next);
 }
 return {user,workspace,setWorkspace,storageError,switchWorkspace};
}
