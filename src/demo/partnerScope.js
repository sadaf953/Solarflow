// Whose customers a Channel Partners / Dealer login sees.
//
// A real partner or dealer account sees the customers tagged with its own name.
// A demo visitor's profile is named after whatever they typed ("Sunny Chauhan"),
// which matches no customer, so the portal looked empty. Visitors therefore
// see the demo partner's data: Channel Partners = "Demo Aurora Solar", Dealer =
// "Demo Dealer" under that partner. The greeting still uses the visitor's name.
import { isVisitorEmail } from './visitors.js';

export const DEMO_PARTNER = 'Demo Aurora Solar';
export const DEMO_DEALER = 'Demo Dealer';

export const isDemoVisitor = user => isVisitorEmail(user?.email);

// { name, partner }: `name` is matched against channel_partner (agent) or
// sub_channel_partner (agent2); `partner` is the dealer's channel_partner.
export function partnerScope(user) {
    const own = String(user?.name || '').trim();
    const partner = String(user?.channel_partner || '').trim();
    if (!isDemoVisitor(user)) return { name: own, partner };
    if (user?.userType === 'agent2' || user?.user_type === 'agent2') {
        return { name: DEMO_DEALER, partner: partner || DEMO_PARTNER };
    }
    return { name: partner || DEMO_PARTNER, partner: partner || DEMO_PARTNER };
}
