import { useEffect, useState } from 'react';
import { logLinkEvent } from './linkTracking';

// 2-minute product tour. Phones get the vertical cut, laptops the wide one.
// Nothing downloads until the visitor presses play (preload="none").
const PHONE_QUERY = '(max-width: 767px)';
const base = import.meta.env.BASE_URL || '/';

function isPhone() {
 try { return window.matchMedia(PHONE_QUERY).matches; } catch { return false; }
}

export default function TourVideo() {
 const [phone, setPhone] = useState(isPhone);
 useEffect(() => {
  let mq;
  try { mq = window.matchMedia(PHONE_QUERY); } catch { return undefined; }
  const onChange = () => setPhone(mq.matches);
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
 }, []);
 const name = phone ? 'phone' : 'laptop';
 return (
  <section className="mx-auto my-10 w-full max-w-5xl px-4" aria-labelledby="tour-video-title">
   <div className="mb-4 text-center">
    <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">2-minute tour</span>
    <h2 id="tour-video-title" className="mt-2 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">See SolarFlow in action</h2>
    <p className="mt-1 text-sm text-stone-600">From quotation to subsidy, partner and installer logins. Tap play; sound is optional.</p>
   </div>
   <div className={`mx-auto overflow-hidden rounded-2xl border border-stone-200 bg-stone-900 shadow-xl ${phone ? 'max-w-sm' : ''}`}>
    <video
     key={name}
     className="block h-auto w-full"
     controls
     playsInline
     preload="none"
     onPlay={() => logLinkEvent('video_play', 'tour')}
     poster={`${base}video/solarflow-tour-${name}.jpg`}
     width={phone ? 720 : 1600}
     height={phone ? 1280 : 900}
    >
     <source src={`${base}video/solarflow-tour-${name}.mp4`} type="video/mp4" />
    </video>
   </div>
  </section>
 );
}
