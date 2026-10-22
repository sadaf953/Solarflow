// Deterministic local fixture for application tests. This does not emulate or prove Postgres RLS.
export function memoryClient(seed = {}) {
    const tables = structuredClone({quotations:[],admin:[],profiles:[],...seed});
    let tick=0;
    const state={tables,offline:false,failLinkOnce:false};
    // Mirrors the signature-link functions in supabase/migrations/20261022120000_quotation_signature_links.sql
    // closely enough to drive the UI; the SQL itself is tested in tests/quotations/signing.sql.test.mjs.
    const rpcs={
        quotation_sign_link({p_quotation_id}){
            const q=tables.quotations.find(r=>r.id===p_quotation_id);
            if(!q) throw new Error('Quotation not found.');
            if(q.signed_at) throw new Error('The customer has already signed this quotation.');
            const now=new Date().toISOString(),expires=new Date(Date.now()+15*86400000).toISOString();
            const token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');
            const {activity,issued_versions,...data}=q.quotation_data||{};
            const snapshot={...structuredClone(q),quotation_data:structuredClone(data)};
            for(const key of ['sign_token','sign_snapshot','sign_sent_at','sign_expires_at','signed_at','signature_png','signature_method','owner_id']) delete snapshot[key];
            Object.assign(q,{sign_token:token,sign_sent_at:now,sign_expires_at:expires,sign_snapshot:snapshot,status:q.status==='draft'?'issued':q.status,issued_at:q.issued_at||now,updated_at:String(++tick),
                quotation_data:{...q.quotation_data,activity:[...(activity||[]),{type:'sent_for_signature',at:now}]}});
            return {token,expires_at:expires};
        },
        quotation_sign_request({p_token}){
            const q=tables.quotations.find(r=>r.sign_token===p_token);
            if(!q) return null;
            return {first_name:String(q.customer_name||'').trim().split(' ')[0],status:q.signed_at?'signed':Date.parse(q.sign_expires_at)<Date.now()?'expired':'open',
                expires_at:q.sign_expires_at,snapshot:structuredClone(q.sign_snapshot),signed_at:q.signed_at||null,signature_png:q.signature_png||null,signature_method:q.signature_method||null};
        },
        submit_quotation_signature({p_token,p_png,p_method}){
            if(!/^data:image\/png;base64,/.test(p_png||'')||p_png.length>400000||!['drawn','photo'].includes(p_method)) throw new Error('Invalid signature');
            const q=tables.quotations.find(r=>r.sign_token===p_token);
            if(!q) throw new Error('Unknown link');
            if(q.signed_at) throw new Error('Already signed');
            if(Date.parse(q.sign_expires_at)<Date.now()) throw new Error('Link expired');
            Object.assign(q,{signed_at:new Date().toISOString(),signature_png:p_png,signature_method:p_method,updated_at:String(++tick)});
            return {signed_at:q.signed_at};
        },
    };
    return {state,rpc(name,args){return Promise.resolve().then(()=>{
        if(state.offline) throw new Error('Offline fixture');
        if(!rpcs[name]) return {data:null,error:{code:'PGRST202',message:`Could not find the function public.${name}`}};
        try { return {data:structuredClone(rpcs[name](args)),error:null}; } catch(error) { return {data:null,error:{message:error.message}}; }
    });},from(table) {
        const filters=[];let action='select',body,from=0,to=100000,single=false,maybe=false,sort=[];
        const q={
            select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},is(k,v){filters.push(r=>v===null ? r[k]==null : r[k]===v);return q;},
            order(k,{ascending=true}={}){sort.push([k,ascending]);return q;},range(a,b){from=a;to=b;return q;},
            or(filter){const clauses=filter.split(',').map(c=>c.split('.'));filters.push(r=>clauses.some(([k,op,...tail])=>op==='eq'?String(r[k])===tail.join('.'):String(r[k]||'').toLowerCase().includes(tail.join('.').replaceAll('%','').toLowerCase())));return q;},
            insert(value){action='insert';body=structuredClone(value);return q;},update(value){action='update';body=structuredClone(value);return q;},
            single(){single=true;return q;},maybeSingle(){single=true;maybe=true;return q;},
            then(resolve,reject){return Promise.resolve().then(()=>{
                if(state.offline) throw new Error('Offline fixture');
                const all=tables[table] ||= [];let matched=all.filter(r=>filters.every(f=>f(r)));
                if(action==='insert') {
                    if(all.some(r=>r.id===body.id)) return {data:null,error:{code:'23505',message:'Duplicate key'}};
                    const inserted={...body,created_at:new Date().toISOString(),updated_at:String(++tick)};
                    if(table==='quotations') Object.assign(inserted,{quotation_no:3255+all.length,status:'draft'});
                    all.push(inserted);matched=[inserted];
                }
                if(action==='update') {
                    if(state.failLinkOnce && body.status==='converted'){state.failLinkOnce=false;throw new Error('Link response interrupted');}
                    matched.forEach(r=>Object.assign(r,body,{updated_at:String(++tick)}));
                }
                matched=[...matched].sort((a,b)=>{for(const [k,asc] of sort){if(a[k]!==b[k]) return (a[k]<b[k]?-1:1)*(asc?1:-1);}return 0;});
                const count=matched.length;matched=matched.slice(from,to+1);
                if(single && !matched.length && !maybe)return {data:null,error:{code:'PGRST116',message:'No accessible row'}};
                return {data:structuredClone(single?(matched[0]||null):matched),error:null,count};
            }).then(resolve,reject);},
        };return q;
    }};
}
