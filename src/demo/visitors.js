// Every demo visitor signs in anonymously and gets a profile named after what they
// typed, with a placeholder address (anon.1a2b3c4d@solarflow.demo). Those names are
// real people, so staff lists show the seeded team plus only the current visitor.
export const isVisitorEmail = email => /^anon\.[^@]*@solarflow\.demo$/i.test(email || '');
export const isOtherVisitor = (profile, currentUserId) => isVisitorEmail(profile?.email) && profile?.id !== currentUserId;
export const withoutOtherVisitors = (profiles, currentUserId) => (profiles || []).filter(p => !isOtherVisitor(p, currentUserId));
