import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDeliveryBatches} from '../../src/delivery/load.js';
const client=result=>({from:()=>({select:()=>({order:async()=>result})})});
test('delivery load distinguishes empty data from failed or incomplete responses',async()=>{
 assert.deepEqual(await loadDeliveryBatches(client({data:[]})),[]);
 const failure={message:'Network unavailable'};
 await assert.rejects(loadDeliveryBatches(client({error:failure})),error=>error===failure);
 await assert.rejects(loadDeliveryBatches(client({data:null})),/incomplete/);
 assert.deepEqual(await loadDeliveryBatches(client({data:[{id:'b'}]})),[{id:'b'}]);
});
