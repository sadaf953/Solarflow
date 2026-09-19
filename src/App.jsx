import {ensureGroupedDemoBatches} from './demo/deliveryBatches';
import {ensureThreeDemoDrivers} from './demo/drivers';
import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from './supabase';
import {ensureThreeDemoVendors,demoVendorTarget} from './demo/vendors';
import LoginScreen from './components/LoginScreen';
import DemoHeader from './demo/DemoHeader';
import PasswordRecoveryModal from './components/PasswordRecoveryModal';
import TeamChatDrawer from './components/TeamChatDrawer';
const Dashboard=lazy(()=>import('./components/Dashboard'));
const AgentPortal=lazy(()=>import('./components/AgentPortal'));
const VendorPortal=lazy(()=>import('./components/VendorPortal'));
const StampPortal=lazy(()=>import('./components/StampPortal'));
const Loader=()=> <div className="p-12 text-center text-stone-500" role="status">Opening your workspace…</div>;
function scheduleBackgroundDemoCleanup(client) {
 if (typeof window === 'undefined') return;
 const cleanupKey = 'solarflow_demo_cleanup_v2';
 if (window.sessionStorage.getItem(cleanupKey)) return;
 const run = () => {
  Promise.allSettled([
   ensureThreeDemoVendors(client),
   ensureThreeDemoDrivers(client),
   ensureGroupedDemoBatches(client)
  ]).then(() => {
   try { window.sessionStorage.setItem(cleanupKey, '1'); } catch {}
  }).catch(err => console.warn('Background cleanup notice:', err));
 };
 if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(run, { timeout: 3000 });
 } else {
  setTimeout(run, 1500);
 }
}

export default function App(){
 const [user,setUser]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [recoveryMode, setRecoveryMode]=useState(false);
 useEffect(()=>{
  let active=true;
  if(typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('type=recovery')){
   setRecoveryMode(true);
  }
  async function restore(){
   try{
    const {data}=await supabase.auth.getSession();
    if(!data?.session)return;
    let userId = data.session.user?.id;
    if(!userId){
     const {data:identity,error:authError}=await supabase.auth.getUser();
     if(authError || !identity.user)return;
     userId = identity.user.id;
    }
    const {data:profile,error:profileError}=await supabase.from('profiles').select('*').eq('id',userId).maybeSingle();
    if(!profileError && profile?.status==='active' && active){
     if(profile.user_type==='vendor')profile.name=demoVendorTarget(profile.name)||profile.name;
     if(active)setUser({...profile,userType:profile.user_type,isDemo:true});
     if(['admin','sales'].includes(profile.user_type)){
      scheduleBackgroundDemoCleanup(supabase);
     }
    }
   }catch(e){if(active)setError(e.message);}finally{if(active)setLoading(false);}
  }restore();
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_OUT' && active)setUser(null);
   if(event==='PASSWORD_RECOVERY' && active)setRecoveryMode(true);
  });
  return()=>{active=false;subscription.unsubscribe();};
 },[]);
 function chooseAgain(){setUser(null);setError('');window.history.replaceState(null,'',window.location.pathname);for(const key of ['solarflow_current_view','solarflow_selected_stage','solarflow_selected_customer_id'])sessionStorage.removeItem(key);}
 async function switchTourRole(role){
  const {data,error}=await supabase.rpc('start_demo_session',{p_role:role});
  if(error)throw error;if(!data?.id)throw new Error('Could not open this demo role.');
  window.history.replaceState(null,'',window.location.pathname);
  for(const key of ['solarflow_current_view','solarflow_selected_stage','solarflow_selected_customer_id'])sessionStorage.removeItem(key);
  if(data.user_type==='vendor')data.name=demoVendorTarget(data.name)||data.name;
  setUser({...data,userType:data.user_type,isDemo:true});
  if(['admin','sales'].includes(data.user_type)){
   scheduleBackgroundDemoCleanup(supabase);
  }
 }
 if(loading)return <Loader/>;
 const Portal=user?(['agent','agent2'].includes(user.userType)?AgentPortal:user.userType==='vendor'?VendorPortal:user.userType==='stamp'?StampPortal:Dashboard):null;
 return (
  <>
   {recoveryMode && (
    <PasswordRecoveryModal
     onClose={() => setRecoveryMode(false)}
     onSuccess={() => {
      setRecoveryMode(false);
      window.history.replaceState(null, '', window.location.pathname);
     }}
    />
   )}
   {!user ? (
    <LoginScreen initialError={error} onLogin={setUser}/>
   ) : (
    <>
     <DemoHeader user={user} onTourRoleSwitch={switchTourRole} onSwitchRole={chooseAgain}>
      {controls=><div className="demo-app"><Suspense fallback={<Loader/>}><Portal key={user.userType} user={user} onLogout={chooseAgain} demoControls={controls}/></Suspense></div>}
     </DemoHeader>
     <TeamChatDrawer currentUser={user} />
    </>
   )}
  </>
 );
}
