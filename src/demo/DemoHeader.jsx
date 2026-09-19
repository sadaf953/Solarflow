import { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, ArrowLeft, ArrowRight, X, Users, Minus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { tourSteps, navigateTour, clearTourNavigation } from './tour';
import './demo.css';
const roleLabels={admin:'Admin',sales:'Office',agent:'Channel Partner',agent2:'Dealer',vendor:'Vendor',stamp:'Stamp Maker',channel_partner_office:'Channel Partner Office',office2:'Manager'};
export default function DemoHeader({user,onSwitchRole,onTourRoleSwitch,children}){
 const [step,setStep]=useState(null);const [finished,setFinished]=useState(false);const [tourRole,setTourRole]=useState(user.userType);
 useEffect(()=>{setTourRole(user.userType);},[user.userType]);
 const steps=useMemo(()=>tourSteps(tourRole),[tourRole]);const [switching,setSwitching]=useState(false);const [error,setError]=useState('');const [collapsed,setCollapsed]=useState(false);const titleRef=useRef(null);
 useEffect(()=>{
  if(step===null)return;
  let active=true;const entry=steps[step];
  async function go(){
   setCollapsed(false);setError('');setSwitching(true);clearTourNavigation();
   const safetyTimer = setTimeout(()=>{if(active)setSwitching(false);}, 4000);
   try{
    if(entry.role!==user.userType)await onTourRoleSwitch(entry.role);
    if(active){navigateTour(entry);titleRef.current?.focus();}
   }catch(e){
    if(active)setError(e.message || 'Could not open the next portal.');
   }finally{
    clearTimeout(safetyTimer);
    if(active)setSwitching(false);
   }
  }go();return()=>{active=false;};
 },[step,steps,user.userType]);
 const close=()=>{clearTourNavigation();setStep(null);};
 useEffect(()=>{const escape=e=>{if(e.key==='Escape' && !switching)close();};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[switching]);
 const controls=<div className="demo-header-actions"><button type="button" onClick={()=>{setFinished(false);setTourRole(user.userType);setStep(0);}} disabled={switching} className="demo-tour-launch" aria-label={finished?'Replay tour':'Guided tour'}><Compass size={17}/><span>{finished?'Replay tour':'Guided tour'}</span></button><button type="button" onClick={()=>{close();onSwitchRole();}} disabled={switching} aria-label="Switch role"><Users size={17}/><span>Switch role</span></button></div>;
 return <>{children(controls)}{createPortal(<div className={`demo-tour-overlay${collapsed ? ' is-collapsed' : ''}`}>

 {step!==null && collapsed && <button className="demo-tour-resume" onClick={()=>setCollapsed(false)}>Resume tour · {step+1}/{steps.length}</button>}
 {step!==null && !collapsed && <section aria-label="Guided tour" className="demo-tour-panel"><div className="demo-tour-progress">STEP {step+1} OF {steps.length}<progress value={step+1} max={steps.length}/></div><div className="demo-tour-copy"><h2 ref={titleRef} tabIndex={-1}>{steps[step].title}</h2><p>{steps[step].body}</p><small className="demo-tour-role">Portal: {roleLabels[steps[step].role] || steps[step].role} · Save edits before Next</small>{switching && <p role="status">Opening portal…</p>}{error && <p role="alert">{error} <button onClick={()=>{setStep(null);setTimeout(()=>setStep(step),0);}}>Retry</button></p>}</div><div className="demo-tour-controls"><button onClick={()=>setCollapsed(true)} aria-label="Hide guide while editing" title="Hide guide while editing"><Minus size={17}/></button><button onClick={()=>setStep(n=>n-1)} disabled={step===0 || switching} aria-label="Previous tour step"><ArrowLeft size={17}/></button><button className="demo-tour-next" disabled={switching || !!error} onClick={()=>{if(step===steps.length-1){close();setFinished(true);}else setStep(n=>n+1);}}>{step===steps.length-1?'Finish tour':'Next'}<ArrowRight size={17}/></button><button onClick={close} disabled={switching} aria-label="Close guided tour"><X size={18}/></button></div></section>}
 {finished && step===null && <div className="demo-tour-done" role="status">Tour complete. Keep exploring, or switch roles for another perspective.<button onClick={()=>setFinished(false)} aria-label="Dismiss tour completion"><X size={14}/></button></div>}</div>,document.body)}</>;
}
