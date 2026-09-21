import test from 'node:test';
import assert from 'node:assert/strict';
import {enquiryPayload, submitEnquiry} from '../../src/enquiries/submit.js';
const draft={name:'Demo',company:'Sample',mobile:'+91 90000 00001',modelType:'advance',storeFiles:'no',remarks:'Demo only'};
test('payload uses the existing enquiry schema and normalizes phone',()=>{
 const result=enquiryPayload(draft);
 assert.equal(result.mobile_number,'9000000001');
 assert.equal(result.version_type,'advance');
 assert.equal(result.notes,'File storage: No\nDemo only');
 assert.equal('model_type' in result,false);
 for(const mobile of ['abc9000000001','123','999999999999999']) assert.throws(()=>enquiryPayload({...draft,mobile}));
});
test('only an acknowledged insert succeeds; errors and missing responses fail',async()=>{
 for(const result of [{error:null,status:201},{error:{message:'denied'},status:403},{error:null,status:0},{error:null},null]) {
  const client={from(table){assert.equal(table,'enquiries');return {insert:async rows=>{assert.equal(rows.length,1);return result;}};}};
  if(result?.status===201) await submitEnquiry(client,enquiryPayload(draft));
  else await assert.rejects(submitEnquiry(client,enquiryPayload(draft)));
 }
 await assert.rejects(submitEnquiry({from(){return {insert(){throw new Error('offline');}};}},enquiryPayload(draft)));
});
