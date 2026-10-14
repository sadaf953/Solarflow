import { useState } from 'react';
import CustomizationEnquiryForm from './CustomizationEnquiryForm';
import ClientQuoteLink from './ClientQuoteLink';
import QuoteRequestAlerts from './QuoteRequestAlerts';
import AdminGate, { readAdminCode, forgetAdminCode } from './AdminGate';

// Separate admin page at #/admin. No button links here – open it by typing or bookmarking the address.
// Nothing is shown until the admin code is checked by the server.
export default function AdminPage() {
    const [adminCode, setAdminCode] = useState(readAdminCode);
    const logOut = () => {forgetAdminCode();setAdminCode('');};
    if (!adminCode) return <AdminGate onUnlock={setAdminCode}/>;
    return (
        <main className="mx-auto max-w-2xl py-5 sm:py-10 pb-16 space-y-5">
            <header className="px-1 sm:px-0">
                <div className="mb-4 flex justify-end">
                    <button type="button" onClick={logOut} className="min-h-11 rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-700">Log out</button>
                </div>
                <p className="sf-kicker">SolarFlow admin</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-black text-stone-900">Clients & forms</h1>
                <p className="mt-2 text-sm text-stone-600">1. Enter the client’s details and send them their form. 2. They fill it in (and can come back to edit). 3. It reaches you on WhatsApp and shows up in All clients below – together with every old client.</p>
            </header>
            <ClientQuoteLink/>
            <QuoteRequestAlerts adminCode={adminCode} onLocked={logOut}/>
            <details className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-bold text-stone-700">Edit old forms (open, change or re-send an old client form)</summary>
                <div className="mt-3"><CustomizationEnquiryForm key="admin" startInPrepareMode adminCode={adminCode}/></div>
            </details>
        </main>
    );
}
