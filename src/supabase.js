import { createClient } from '@supabase/supabase-js'

export const DEMO_ISOLATED = true
export const ISOLATION_MESSAGE = 'This demo is isolated. Backend login, database changes, uploads and email are disabled.'

// Deliberately ignore ALL environment credentials, browser sessions and auth URLs.
// Never change this to the original project's URL. A future demo backend requires
// an explicit separate implementation and review of the isolation checks.
export async function blockedBackendFetch() {
    return new Response(JSON.stringify({ message: ISOLATION_MESSAGE, error: ISOLATION_MESSAGE }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
    })
}

class DisabledWebSocket {
    constructor() { throw new Error(ISOLATION_MESSAGE) }
}

export const supabase = createClient('http://127.0.0.1:9', 'isolated-demo-no-credentials', {
    global: { fetch: blockedBackendFetch },
    auth: {
        storageKey: 'solarflow-demo-isolated-auth',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
    realtime: { transport: DisabledWebSocket },
})

export default supabase
