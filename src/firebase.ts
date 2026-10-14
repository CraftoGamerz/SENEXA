import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signInAnonymously,signOut} from 'firebase/auth';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import {validateWorkspace,type Workspace} from './domain';
const app=initializeApp({apiKey:'AIzaSyDkoC_5vdSeXvx5o1WmD8d5EvE6RsO_Kno',authDomain:'senexa-df0dd.firebaseapp.com',projectId:'senexa-df0dd',storageBucket:'senexa-df0dd.firebasestorage.app',messagingSenderId:'925252289107',appId:'1:925252289107:web:f5a930648a904e8f803ca6',measurementId:'G-J6N9B8R3KQ'});
export const auth=getAuth(app);const db=getFirestore(app);
export const login=(email:string,password:string)=>signInWithEmailAndPassword(auth,email,password);
export const signup=(email:string,password:string)=>createUserWithEmailAndPassword(auth,email,password);
export const google=()=>signInWithPopup(auth,new GoogleAuthProvider());
export const anonymous=()=>signInAnonymously(auth);
export const resetPassword=(email:string)=>sendPasswordResetEmail(auth,email);
export const logout=()=>signOut(auth);
export async function saveCloud(w:Workspace){const user=auth.currentUser;if(!user)throw Error('Sign in to sync your private workspace.');await setDoc(doc(db,'users',user.uid,'workspaces','main'),{version:1,payload:validateWorkspace(w),updatedAt:serverTimestamp()});}
export async function loadCloud(){const user=auth.currentUser;if(!user)throw Error('Sign in first.');const snap=await getDoc(doc(db,'users',user.uid,'workspaces','main'));if(!snap.exists())throw Error('No cloud snapshot yet. Save this workspace first.');return validateWorkspace(snap.data().payload);}
export async function enableAnalytics(){const {getAnalytics,isSupported}=await import('firebase/analytics');if(await isSupported())getAnalytics(app);}
export function friendlyError(e:unknown){const code=(e as any)?.code;const map:Record<string,string>={'auth/operation-not-allowed':'Enable the selected Email/Password, Google or Anonymous provider in Firebase Authentication.','auth/unauthorized-domain':'Add this website domain to Firebase Authentication authorized domains.','auth/invalid-credential':'Email or password is incorrect.','auth/email-already-in-use':'This email already has an account. Please sign in.','auth/weak-password':'Use a password of at least 6 characters.','auth/popup-closed-by-user':'Sign-in window closed. You can try again.','permission-denied':'Cloud access was denied. Deploy the included owner-only Firestore rules.','unavailable':'Cloud service is unreachable. Your local changes are safe.','auth/network-request-failed':'Authentication needs an internet connection.'};return map[code]||(e instanceof Error?e.message:'The request could not be completed.');}
