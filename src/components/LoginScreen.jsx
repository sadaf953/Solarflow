import {ensureGroupedDemoBatches} from '../demo/deliveryBatches';
import {ensureThreeDemoDrivers} from '../demo/drivers';
import { useState } from 'react';
import { 
    ArrowRight, ShieldCheck, BriefcaseBusiness, Building2, ChartNoAxesCombined, 
    Handshake, Users, Truck, Stamp, LoaderCircle, Mail, Lock, KeyRound, Send, AlertTriangle, Check, User, MessageCircle, Phone 
} from 'lucide-react';
import { supabase } from '../supabase';
import { APP_ROLES } from '../constants';
import { ensureThreeDemoVendors, demoVendorTarget } from '../demo/vendors';
import { getChecklistMode, setChecklistMode } from '../utils/checklistMode';
import CustomizationEnquiryForm, { DEFAULT_BASIC_VERSION_URL } from './CustomizationEnquiryForm';
import BrandMark from './BrandMark';
import '../demo/demo.css';
const icons=[ShieldCheck,BriefcaseBusiness,Building2,ChartNoAxesCombined,Handshake,Users,Truck,Stamp];
const DEMO_ACCESS_PASSWORD='admin@2026';
const DEMO_CONTACT_EMAIL='enquiry@deeprootsystems.in';
const DEMO_CONTACT_PHONE='917981980910';
const DEMO_CONTACT_PHONE_LABEL='+91 79819 80910';
const DEMO_CONTACT_FORM_URL=`https://formsubmit.co/ajax/${DEMO_CONTACT_EMAIL}`;
const descriptions=['Explore the complete solar business.','Manage leads and daily operations.','Follow your partner’s project pipeline.','Review progress and team activity.','Build quotations and follow up leads.','Track your customers from start to finish.','Manage delivery, installation and photos.','Review documents and completed work.'];
export default function LoginScreen({onLogin,onOpenPlans,initialError=''}) {
 const [busy,setBusy]=useState('');const [error,setError]=useState(initialError);
 const [visitorName, setVisitorName] = useState(() => {
  try { return localStorage.getItem('solarflow_visitor_name') || ''; } catch { return ''; }
 });
 const [hasBranches, setHasBranches] = useState(false);
 const [hasVendors, setHasVendors] = useState(false);
 const [hasStamp, setHasStamp] = useState(false);
 const [storeFiles, setStoreFiles] = useState(() => getChecklistMode() === 'files');
 const [showSetup, setShowSetup] = useState(false);
 const [showEnquiry, setShowEnquiry] = useState(false);
 const [authMode, setAuthMode] = useState('demo'); // 'demo' | 'credentials'
 const [emailInput, setEmailInput] = useState('');
 const [passwordInput, setPasswordInput] = useState('');
 const [forgotMode, setForgotMode] = useState(false);
 const [credBusy, setCredBusy] = useState(false);
 const [credNotice, setCredNotice] = useState({ type: '', text: '' });
 const [pendingRole, setPendingRole] = useState(null);
 const [accessPassword, setAccessPassword] = useState('');
 const [accessError, setAccessError] = useState('');
 const [showEmailForm, setShowEmailForm] = useState(false);
 const [requestContact, setRequestContact] = useState('');
 const [requestMessage, setRequestMessage] = useState('');
 const [requestState, setRequestState] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'failed'

 async function handleCredentialsSubmit(e) {
  e.preventDefault();
  const cleanEmail = emailInput.trim();
  if (!cleanEmail) {
   setCredNotice({ type: 'error', text: 'Email address is required.' });
   return;
  }

  if (forgotMode) {
   setCredBusy(true);
   setCredNotice({ type: '', text: '' });
   try {
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
     redirectTo: window.location.origin,
    });
    if (resetErr) {
     if (resetErr.message?.includes('rate_limit') || resetErr.status === 429) {
      throw new Error('Supabase email limit reached for this hour. Please try again later or use one-click demo login.');
     }
     setCredNotice({
      type: 'success',
      text: `Password reset link simulated for ${cleanEmail}. Check your inbox or use one-click demo login.`
     });
     return;
    }
    setCredNotice({
     type: 'success',
     text: `Password reset link successfully sent to ${cleanEmail}! Please check your email to choose a new password.`
    });
   } catch (err) {
    setCredNotice({ type: 'error', text: err.message || 'Failed to send reset link.' });
   } finally {
    setCredBusy(false);
   }
   return;
  }

  if (!passwordInput.trim()) {
   setCredNotice({ type: 'error', text: 'Password is required.' });
   return;
  }

  setCredBusy(true);
  setCredNotice({ type: '', text: '' });
  try {
   const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: passwordInput.trim()
   });

   if (authErr) {
    // Check if matching a demo profile
    const { data: demoMatch } = await supabase
     .from('demo_profiles')
     .select('*')
     .ilike('email', cleanEmail)
     .maybeSingle();

    if (demoMatch) {
     if (['admin', 'sales'].includes(demoMatch.user_type)) {
      await ensureThreeDemoVendors(supabase);
      await ensureThreeDemoDrivers(supabase);
      await ensureGroupedDemoBatches(supabase);
     }
     if (demoMatch.user_type === 'vendor') demoMatch.name = demoVendorTarget(demoMatch.name) || demoMatch.name;
     onLogin({ ...demoMatch, userType: demoMatch.user_type, isDemo: true });
     return;
    }
    throw authErr;
   }

   const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

   if (profileErr || !profile) {
    throw new Error('Signed in, but no profile record was found for this user.');
   }
   if (profile.status === 'inactive') {
    throw new Error('This account is inactive. Please contact an administrator.');
   }
   onLogin({ ...profile, userType: profile.user_type, isDemo: true });
  } catch (err) {
   setCredNotice({ type: 'error', text: err.message || 'Failed to sign in.' });
  } finally {
   setCredBusy(false);
  }
 }

 function handleAccessSubmit() {
  if (accessPassword.trim() !== DEMO_ACCESS_PASSWORD) {
   setAccessError('Your password is wrong. Kindly contact us to get the correct password.');
   return;
  }
  const role = pendingRole;
  setPendingRole(null);
  setAccessPassword('');
  setAccessError('');
  choose(role, undefined, true);
 }

 async function sendPasswordRequest() {
  if (!requestContact.trim() || requestState === 'sending') return;
  setRequestState('sending');
  try {
   const res = await fetch(DEMO_CONTACT_FORM_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({
     name: visitorName.trim(),
     contact: requestContact.trim(),
     message: requestMessage.trim() || 'Please share the SolarFlow demo password.',
     _subject: `SolarFlow demo password request from ${visitorName.trim()}`,
     _template: 'table',
     _captcha: 'false'
    })
   });
   const body = await res.json().catch(() => ({}));
   if (!res.ok || String(body.success) === 'false') throw new Error(body.message || 'Send failed');
   setRequestState('sent');
  } catch {
   setRequestState('failed');
  }
 }

 function openContact() {
  setShowEnquiry(true);
  setTimeout(() => document.getElementById('demo-enquiry')?.scrollIntoView({behavior:'smooth',block:'start'}), 0);
 }

 async function choose(role, customName, unlocked = false){
  setBusy(role.user_type);setError('');
  try {
   const nameToUse = (customName !== undefined ? customName : visitorName || '').trim();
   if (!nameToUse) throw new Error('Enter your name to continue.');
   if (!unlocked) {
    setPendingRole(role);
    setAccessPassword('');
    setAccessError('');
    document.querySelector('.demo-login-hero-card')?.scrollIntoView({behavior:'smooth',block:'center'});
    return;
   }
   const {data:session,error:sessionError}=await supabase.auth.getSession();if(sessionError)throw sessionError;
   if(!session.session){const result=await supabase.auth.signInAnonymously();if(result.error)throw result.error;}
   const {data,error:roleError}=await supabase.rpc('start_demo_session',{
     p_role: role.user_type,
     p_name: nameToUse || null
   });
   if(roleError)throw roleError;
   if(!data?.id)throw new Error('The demo profile could not be created.');
   if(data.user_type==='vendor')data.name=demoVendorTarget(data.name)||data.name;
   if(nameToUse){
    try { localStorage.setItem('solarflow_visitor_name', nameToUse); } catch { /* storage may be unavailable */ }
   }
   onLogin({...data,userType:data.user_type || data.userType,isDemo:true});
   if(['admin','sales'].includes(data.user_type)){
    Promise.allSettled([
     ensureThreeDemoVendors(supabase),
     ensureThreeDemoDrivers(supabase),
     ensureGroupedDemoBatches(supabase)
    ]).catch(err=>console.warn('Background setup notice:',err));
   }
  }catch(e){
   const message=e.message || 'Could not open this demo role.';
   setError(/anonymous.*(disabled|not enabled)/i.test(message)
    ? 'Enable Anonymous Sign-Ins in your new Supabase project’s Authentication settings, then try again.'
    : /start_demo_session|seed_demo_data_50/.test(message)
    ? 'Run the SolarFlow setup and 50-row sample SQL in your new Supabase project, then try again.' : message);
  }finally{setBusy('');}
 }

 const adminRole = APP_ROLES.find(r => r.user_type === 'admin') || APP_ROLES[0];
 const otherRoles = APP_ROLES.filter(r => r.user_type !== 'admin');

  const handleStoreFilesChange = (enabled) => {
   setStoreFiles(enabled);
   setChecklistMode(enabled ? 'files' : 'checklist');
  };

  // Quick preset helper
  function applyPreset(preset) {
   if (preset === 'small') {
    setHasBranches(false);
    setHasVendors(false);
    setHasStamp(false);
    handleStoreFilesChange(false);
   } else if (preset === 'branches') {
    setHasBranches(true);
    setHasVendors(false);
    setHasStamp(false);
    handleStoreFilesChange(true);
   } else if (preset === 'enterprise') {
    setHasBranches(true);
    setHasVendors(true);
    setHasStamp(true);
    handleStoreFilesChange(true);
   }
  }

 // Determine which roles are active based on the questionnaire
 const activeRoleTypes = new Set(['sales', 'agent']);
 if (hasBranches) {
  activeRoleTypes.add('channel_partner_office');
  activeRoleTypes.add('office2');
  activeRoleTypes.add('agent2');
 }
 if (hasVendors) {
  activeRoleTypes.add('vendor');
 }
 if (hasStamp) {
  activeRoleTypes.add('stamp');
 }

 const visibleOtherRoles = otherRoles.filter(r => activeRoleTypes.has(r.user_type));
 const totalViewsCount = 1 + visibleOtherRoles.length; // +1 for Admin

 return (
  <main className="demo-login">
   <div className="demo-login-intro">
    <BrandMark size="lg"/>
    <span className="demo-eyebrow">SOLARFLOW · ADVANCED DEMO</span>
    <h1>From first enquiry.<br/><span>To finished installation.</span></h1>
    <p>See how your team manages quotations, projects, materials and installation in one place. Start with a ready-to-explore sample workspace.</p>
   </div>

   {error && <div role="alert" className="demo-login-error">{error}</div>}

   <div className="demo-login-main">
    {authMode === 'credentials' ? (
     <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 max-w-md mx-auto w-full shadow-sm animate-in fade-in duration-200">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-150">
       <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold flex-shrink-0">
        {forgotMode ? <Send size={20}/> : <Lock size={20}/>}
       </div>
       <div>
        <h3 className="text-base font-bold text-stone-900">
         {forgotMode ? 'Reset Password via Email' : 'Email Authentication'}
        </h3>
        <p className="text-xs text-stone-500 font-medium">
         {forgotMode 
          ? 'Enter your registered email to receive a recovery link' 
          : 'Sign in with your email address and password'}
        </p>
       </div>
      </div>

      {credNotice.text && (
       <div className={`mb-4 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 leading-relaxed ${
        credNotice.type === 'success' 
         ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
         : 'bg-rose-50 text-rose-700 border border-rose-200'
       }`}>
        {credNotice.type === 'success' ? <Check size={16} className="mt-0.5 text-emerald-600 shrink-0"/> : <AlertTriangle size={16} className="mt-0.5 text-rose-600 shrink-0"/>}
        <span>{credNotice.text}</span>
       </div>
      )}

      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
       <div>
        <label className="block text-xs font-bold text-stone-700 mb-1">Email Address *</label>
        <input 
         type="email"
         required
         value={emailInput}
         onChange={e => setEmailInput(e.target.value)}
         placeholder="user@example.com"
         className="sf-input text-xs font-medium"
        />
       </div>

       {!forgotMode && (
        <div>
         <div className="flex justify-between items-center mb-1">
          <label className="block text-xs font-bold text-stone-700">Password *</label>
          <button 
           type="button" 
           onClick={() => { setForgotMode(true); setCredNotice({ type: '', text: '' }); }}
           className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
          >
           Forgot password?
          </button>
         </div>
         <input 
          type="password"
          required
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          placeholder="••••••••"
          className="sf-input text-xs font-medium"
         />
        </div>
       )}

       <button
        type="submit"
        disabled={credBusy}
        className="sf-btn-primary w-full py-3 shadow-sm"
       >
        {credBusy ? <LoaderCircle size={15} className="animate-spin"/> : forgotMode ? <Send size={15}/> : <ArrowRight size={15}/>}
        <span>{credBusy ? 'Processing...' : forgotMode ? 'Send Password Reset Link' : 'Sign In'}</span>
       </button>

        {!forgotMode && (
         <div className="pt-3 border-t border-stone-150">
          <div className="flex items-center justify-between mb-2">
           <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Quick Fill All 8 Roles:</span>
           <span className="text-[10px] text-stone-400 font-mono">PW: SolarFlow@2026</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
           {[
            { label: 'Admin', email: 'admin@solarflow.demo' },
            { label: 'Office', email: 'office@solarflow.demo' },
            { label: 'CPO', email: 'cpo@solarflow.demo' },
            { label: 'Manager', email: 'manager@solarflow.demo' },
            { label: 'Dealer', email: 'dealer@solarflow.demo' },
            { label: 'Partner', email: 'partner@solarflow.demo' },
            { label: 'Vendor', email: 'vendor@solarflow.demo' },
            { label: 'Stamp', email: 'stamp@solarflow.demo' },
           ].map(r => (
            <button
             key={r.email}
             type="button"
             onClick={() => {
              setEmailInput(r.email);
              setPasswordInput('SolarFlow@2026');
              setCredNotice({ type: '', text: '' });
             }}
             className="py-1 px-1.5 text-[10px] font-bold rounded-lg border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-stone-700 hover:text-amber-900 transition-all text-center truncate cursor-pointer shadow-2xs"
             title={`Fill ${r.label} credentials`}
            >
             {r.label}
            </button>
           ))}
          </div>
         </div>
        )}

        {forgotMode ? (
         <div className="text-center pt-1">
          <button
           type="button"
           onClick={() => { setForgotMode(false); setCredNotice({ type: '', text: '' }); }}
           className="text-xs font-bold text-stone-500 hover:text-stone-800 hover:underline cursor-pointer"
          >
           ← Back to Sign In
          </button>
         </div>
        ) : (
         <div className="pt-1 text-center">
          <p className="text-[11px] text-stone-400">
           <button type="button" onClick={() => setAuthMode('demo')}>Back to the no-signup demo</button>
          </p>
         </div>
        )}
      </form>
     </div>
    ) : (
     <>
     {/* Prominent Name Entry & Hero Card */}
     <form 
      onSubmit={(e) => {
       e.preventDefault();
       if (pendingRole) handleAccessSubmit();
       else choose(adminRole);
      }}
      className="demo-login-hero-card"
      aria-label="Enter SolarFlow"
     >
      <div className="demo-login-hero-content">
       <div className="demo-login-hero-badge">
        <ShieldCheck size={14} />
        <span>DEMO ACCESS · NO SIGNUP REQUIRED</span>
       </div>
       {pendingRole ? <>
       <h2>Enter the demo password</h2>
       <p>Welcome, {visitorName.trim()}. Enter the password you were given to open SolarFlow.</p>

       <div className="demo-name-entry-row">
        <div className="demo-name-input-wrap">
         <Lock className="demo-name-input-icon" size={18}/>
         <input
          type="password"
          value={accessPassword}
          onChange={(e) => { setAccessPassword(e.target.value); setAccessError(''); }}
          placeholder="Enter password"
          className="demo-name-input"
          autoComplete="current-password"
          aria-label="Demo password"
          aria-invalid={!!accessError}
          aria-describedby="demo-access-help"
          required
          autoFocus
         />
        </div>
        <button
         type="submit"
         disabled={!!busy || !accessPassword.trim()}
         className="demo-login-hero-btn"
        >
         <ArrowRight size={19}/>
         <span>Continue</span>
        </button>
       </div>
       {accessError ? (
        <div role="alert" className="demo-access-contact">
         <p className="demo-access-error">{accessError}</p>
         <div className="demo-access-contact-links">
          <a href={`https://wa.me/${DEMO_CONTACT_PHONE}?text=${encodeURIComponent(`Hi, I'm ${visitorName.trim()}. Please share the password for the SolarFlow demo.`)}`} target="_blank" rel="noopener noreferrer" className="is-whatsapp">
           <MessageCircle size={16}/><span>Message us on WhatsApp</span>
          </a>
          <a href={`tel:+${DEMO_CONTACT_PHONE}`}><Phone size={16}/><span>{DEMO_CONTACT_PHONE_LABEL}</span></a>
          <button type="button" aria-expanded={showEmailForm} onClick={() => setShowEmailForm(v => !v)}><Mail size={16}/><span>Email us</span></button>
         </div>
         {showEmailForm && (
          requestState === 'sent' ? (
           <p className="demo-access-sent"><Check size={16}/> Your request has been sent to {DEMO_CONTACT_EMAIL}. We’ll get back to you shortly.</p>
          ) : (
           <div className="demo-access-email-form">
            <input
             type="text"
             value={requestContact}
             onChange={(e) => setRequestContact(e.target.value)}
             onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendPasswordRequest(); } }}
             placeholder="Your email or phone number *"
             aria-label="Your email or phone number"
             autoComplete="email"
            />
            <textarea
             value={requestMessage}
             onChange={(e) => setRequestMessage(e.target.value)}
             placeholder="Message (optional)"
             aria-label="Message"
             rows={2}
            />
            <button type="button" onClick={sendPasswordRequest} disabled={!requestContact.trim() || requestState === 'sending'}>
             {requestState === 'sending' ? <LoaderCircle size={15} className="animate-spin"/> : <Send size={15}/>}
             <span>{requestState === 'sending' ? 'Sending...' : 'Send request'}</span>
            </button>
            {requestState === 'failed' && (
             <p className="demo-access-error">The email couldn’t be sent. Please message us on WhatsApp or write to {DEMO_CONTACT_EMAIL}.</p>
            )}
           </div>
          )
         )}
        </div>
       ) : (
        <p id="demo-access-help" className="demo-access-help">
         Please <button type="button" onClick={openContact}>contact us</button> if the password wasn’t shared with you.
        </p>
       )}
       <p className="demo-access-help">
        <button type="button" onClick={() => { setPendingRole(null); setAccessError(''); }}>Change name</button>
       </p>
       </> : <>
       <h2>Enter your name to explore the demo</h2>
       <p>This demo uses your name and a shared demo password so you can explore quickly. The production CRM is secured with authenticated user accounts, passwords and role-based permissions. Your demo activity will be recorded under the name you enter.</p>
       
       <div className="demo-name-entry-row">
        <div className="demo-name-input-wrap">
         <User className="demo-name-input-icon" size={18}/>
         <input
          type="text"
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          placeholder="Enter your name"
          className="demo-name-input"
          autoComplete="name"
          required
          autoFocus
         />
        </div>
        <button 
         type="submit" 
         disabled={!!busy || !visitorName.trim()}
         className="demo-login-hero-btn"
        >
         {busy === adminRole.user_type ? <LoaderCircle className="animate-spin" size={19}/> : <ArrowRight size={19}/>}
         <span>{busy === adminRole.user_type ? 'Entering SolarFlow...' : 'Enter SolarFlow'}</span>
        </button>
       </div>
       </>}
      </div>
     </form>

    <div className="demo-start-options">
     <button type="button" aria-expanded={showSetup} aria-controls="demo-company-setup" onClick={() => setShowSetup(!showSetup)}>{showSetup ? 'Hide demo options' : 'Customize demo or explore team roles'} <ArrowRight size={16}/></button>
     <button type="button" onClick={() => { setAuthMode('credentials'); setCredNotice({type:'',text:''}); }}>Already have demo credentials? Sign in</button>
    </div>
    {showSetup && <>
    {/* Business Profile Questionnaire & Tailored Roles Section */}
    <section className="demo-personas-section" id="demo-company-setup">
     <div className="demo-questionnaire-card">
      <div className="demo-questionnaire-header">
       <div>
        <span className="demo-questionnaire-eyebrow">OPTIONAL · TAILOR YOUR WORKSPACE</span>
        <h3 className="demo-questionnaire-title">How does your solar company operate?</h3>
        <p className="demo-questionnaire-subtitle">Toggle your company structure to tailor the portals shown below. Smaller companies only see the core 3 views.</p>
       </div>
       <div className="demo-questionnaire-presets">
        <span className="demo-presets-label">Quick presets:</span>
        <button 
         type="button" 
         onClick={() => applyPreset('small')}
         className={`demo-preset-btn${!hasBranches && !hasVendors && !hasStamp && !storeFiles ? ' is-active' : ''}`}
        >
         Smaller Company (3 Views)
        </button>
        <button 
         type="button" 
         onClick={() => applyPreset('branches')}
         className={`demo-preset-btn${hasBranches && !hasVendors && !hasStamp ? ' is-active' : ''}`}
        >
         Branch Network (6 Views)
        </button>
        <button 
         type="button" 
         onClick={() => applyPreset('enterprise')}
         className={`demo-preset-btn${hasBranches && hasVendors && hasStamp && storeFiles ? ' is-active' : ''}`}
        >
         Full Enterprise (All 8)
        </button>
       </div>
      </div>

      <div className="demo-questions-grid">
       {/* Q1: Branches */}
       <div className={`demo-question-box${hasBranches ? ' is-enabled' : ''}`}>
        <div className="demo-question-info">
         <span className="demo-question-num">1</span>
         <div>
          <strong>Do you operate multiple branches or channel partners?</strong>
          <small>{hasBranches ? 'Branch Manager, CPO, and Regional Dealer portals enabled.' : 'Single office setup: Core Office and Dealer views only.'}</small>
         </div>
        </div>
        <div className="demo-toggle-group" role="radiogroup" aria-label="Operate multiple branches?">
         <button 
          type="button" 
          onClick={() => setHasBranches(false)}
          className={`demo-toggle-btn${!hasBranches ? ' is-selected' : ''}`}
         >
          No
         </button>
         <button 
          type="button" 
          onClick={() => setHasBranches(true)}
          className={`demo-toggle-btn${hasBranches ? ' is-selected' : ''}`}
         >
          Yes
         </button>
        </div>
       </div>

       {/* Q2: External Vendors */}
       <div className={`demo-question-box${hasVendors ? ' is-enabled' : ''}`}>
        <div className="demo-question-info">
         <span className="demo-question-num">2</span>
         <div>
          <strong>Do you want vendor logins for installation teams?</strong>
          <small>{hasVendors ? 'Installation Vendor portal enabled with dispatch tracking.' : 'Internal installations only: Vendor portal hidden.'}</small>
         </div>
        </div>
        <div className="demo-toggle-group" role="radiogroup" aria-label="Want vendor logins?">
         <button 
          type="button" 
          onClick={() => setHasVendors(false)}
          className={`demo-toggle-btn${!hasVendors ? ' is-selected' : ''}`}
         >
          No
         </button>
         <button 
          type="button" 
          onClick={() => setHasVendors(true)}
          className={`demo-toggle-btn${hasVendors ? ' is-selected' : ''}`}
         >
          Yes
         </button>
        </div>
       </div>

       {/* Q3: Dedicated Stamp Guy */}
       <div className={`demo-question-box${hasStamp ? ' is-enabled' : ''}`}>
        <div className="demo-question-info">
         <span className="demo-question-num">3</span>
         <div>
          <strong>Do you have a dedicated agreement / stamp maker?</strong>
          <small>{hasStamp ? 'Document coordinator portal enabled for verification & document workflow.' : 'Office handles stamping: Document coordinator portal hidden.'}</small>
         </div>
        </div>
        <div className="demo-toggle-group" role="radiogroup" aria-label="Dedicated agreement / stamp maker?">
         <button 
          type="button" 
          onClick={() => setHasStamp(false)}
          className={`demo-toggle-btn${!hasStamp ? ' is-selected' : ''}`}
         >
          No
         </button>
         <button 
          type="button" 
          onClick={() => setHasStamp(true)}
          className={`demo-toggle-btn${hasStamp ? ' is-selected' : ''}`}
         >
          Yes
         </button>
        </div>
       </div>

       {/* Q4: Storing Files & Documents */}
       <div className={`demo-question-box${storeFiles ? ' is-enabled' : ''}`}>
        <div className="demo-question-info">
         <span className="demo-question-num">4</span>
         <div>
          <strong>Do you want to store customer files &amp; documents?</strong>
          <small>{storeFiles ? 'Cloud file storage enabled: checklists link directly to uploaded files, photos, and documents.' : 'Direct checklist mode: items check and uncheck with 1 click without uploading files.'}</small>
         </div>
        </div>
        <div className="demo-toggle-group" role="radiogroup" aria-label="Store customer files and documents?">
         <button 
          type="button" 
          onClick={() => handleStoreFilesChange(false)}
          className={`demo-toggle-btn${!storeFiles ? ' is-selected' : ''}`}
         >
          No
         </button>
         <button 
          type="button" 
          onClick={() => handleStoreFilesChange(true)}
          className={`demo-toggle-btn${storeFiles ? ' is-selected' : ''}`}
         >
          Yes
         </button>
        </div>
       </div>
      </div>

      <div className="demo-questionnaire-summary">
       <span className="demo-summary-pill">
        {!hasBranches && !hasVendors && !hasStamp 
         ? `🎯 Smaller Company Mode: 3 Core Views (Admin + Office + Dealer) · ${storeFiles ? '📁 File Storage Active' : '✓ Simple Checklist (No Files)'}` 
         : `✨ Tailored Setup: Showing ${totalViewsCount} Views (Admin + ${visibleOtherRoles.length} Selected Team Portals) · ${storeFiles ? '📁 File Storage Active' : '✓ Simple Checklist (No Files)'}`}
       </span>
      </div>
     </div>

     <div className="demo-personas-head">
      <div>
       <h3>Explore Available Team &amp; Partner Portals</h3>
       <p>Click any portal to log in instantly and see the tailored dashboard for that persona.</p>
      </div>
     </div>

     <div className="demo-role-grid">
      {visibleOtherRoles.map(role => {
       const roleIndex = APP_ROLES.findIndex(r => r.user_type === role.user_type);
       const Icon = icons[roleIndex] || Users;
       return (
        <button 
         key={role.user_type} 
         onClick={() => choose(role)} 
         disabled={!!busy} 
         className="demo-role-card" 
         aria-label={`Explore as ${role.label}`}
        >
         <span className="demo-role-icon"><Icon size={22}/></span>
         <span className="demo-role-copy">
          <strong>{role.label}</strong>
          <small>{descriptions[roleIndex]}</small>
         </span>
         {busy === role.user_type ? <LoaderCircle className="animate-spin" size={19}/> : <ArrowRight size={19}/>}
        </button>
       );
      })}
     </div>
     </section>
     </>}
     </>
    )}
   </div>

   <div className="demo-next-links">
    <div><strong>Looking for a simpler CRM?</strong><p>Explore the basic version for leads, quotations and customer tracking.</p><p><strong>Demo credentials</strong><br/>Email: <code>admin@crm.com</code><br/>Password: <code>admin</code></p><a href={DEFAULT_BASIC_VERSION_URL} target="_blank" rel="noopener noreferrer">Explore Basic Version <ArrowRight size={15}/></a></div>
    <div><strong>Plans for every team size</strong><p>Compare the Foundation, Growth and Enterprise setup options before entering the demo.</p><button type="button" onClick={onOpenPlans}>View Plans &amp; Pricing <ArrowRight size={15}/></button></div>
    <div><strong>Make it work for your team</strong><p>Tell us about your business when you are ready to discuss setup.</p><button type="button" aria-expanded={showEnquiry} aria-controls="demo-enquiry" onClick={() => setShowEnquiry(!showEnquiry)}>{showEnquiry ? 'Hide setup request' : 'Request a setup'} <ArrowRight size={15}/></button></div>
   </div>
   <div hidden={!showEnquiry} id="demo-enquiry" className="mt-8 max-w-3xl mx-auto w-full"><CustomizationEnquiryForm initialStoreFiles={storeFiles} /></div>
   <p className="demo-login-footnote mt-6">Private demo workspace with sample projects. No signup required.</p>
  </main>
 );
}
