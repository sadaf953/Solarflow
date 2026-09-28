import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreparedBrief, createSavedBrief, preparedBriefLink, readPreparedBriefId, unlockSavedBrief} from '../../src/enquiries/brief.js';

const id='b391c08f-5c13-4b40-b73e-f1c7eec12205';
const code='A1B2C3D4E5F6';
const draft={name:'Private Name',mobile:'9000000001',hasWebsite:'Yes',teamSize:'4–9',
 customerCount:'420',liveCustomerCount:'67',software:['Tally','Google Sheets','Unknown'],
 branches:'No',interests:['DISCOM submission document maker','Quotation maker','Unknown']};

test('client link contains only the backend draft ID; supported answers stay in the private payload', () => {
 const link=preparedBriefLink('https://example.com/',id);
 assert.equal(link,`https://example.com/#/plans?brief=${id}`);
 assert.equal(readPreparedBriefId(new URL(link).hash),id);
 assert.doesNotMatch(link,/Private Name|9000000001|Tally|Website/);
 assert.deepEqual(createPreparedBrief(draft).software,['Tally','Google Sheets']);
 assert.deepEqual(createPreparedBrief(draft).interests,['DISCOM submission document maker','Quotation maker']);
 assert.equal(readPreparedBriefId('#/plans?brief=not-a-uuid'),null);
 assert.throws(()=>preparedBriefLink('https://example.com','bad'),/Invalid/);
});

test('preparing and unlocking use authenticated RPCs and sanitize returned answers', async () => {
 const calls=[];
 const client={auth:{getSession:async()=>({data:{session:null}}),signInAnonymously:async()=>({error:null})},
  rpc:async(name,args)=>{calls.push({name,args});return name==='create_prepared_brief'
   ? {data:{id,code},error:null} : {data:{...draft,unknown:'discard'},error:null};}};
 const created=await createSavedBrief(client,draft);
 assert.deepEqual(created,{id,code});
 assert.deepEqual(calls[0].args.p_answers,createPreparedBrief(draft));
 const opened=await unlockSavedBrief(client,id,code);
 assert.deepEqual(opened,createPreparedBrief(draft));
 assert.deepEqual(calls.map(call=>call.name),['create_prepared_brief','unlock_prepared_brief']);
 client.rpc=async()=>({data:null,error:null});
 await assert.rejects(unlockSavedBrief(client,id,'WRONG'),/incorrect or.*expired/);
});

test('empty prepared forms cannot be saved',async()=>{
 await assert.rejects(createSavedBrief({auth:{getSession(){assert.fail('must not authenticate');}}},{}),/Choose at least one/);
});
