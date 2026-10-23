import test from 'node:test';
import assert from 'node:assert/strict';
import {isOtherVisitor,withoutOtherVisitors} from '../../src/demo/visitors.js';
import {stateFromPincode} from '../../src/utils/indianState.js';

test('other demo visitors are left out of staff lists, the current one stays',()=>{
 const people=[{id:'me',name:'Me',email:'anon.11111111@solarflow.demo'},{id:'x',name:'Ajay Kumar (s s solar energy)',email:'anon.22222222@solarflow.demo'},{id:'s',name:'Priya Sharma',email:'office@solarflow.demo'},{id:'n',name:'No email'}];
 assert.deepEqual(withoutOtherVisitors(people,'me').map(p=>p.id),['me','s','n']);
 assert.equal(isOtherVisitor(null,'me'),false);
});

test('feasibility state comes from the PIN code',()=>{
 assert.equal(stateFromPincode('500032'),'Telangana');
 assert.equal(stateFromPincode('382210'),'Gujarat');
 assert.equal(stateFromPincode('403001'),'Goa');
 assert.equal(stateFromPincode('834001'),'Jharkhand');
 assert.equal(stateFromPincode('560 001'),'Karnataka');
 assert.equal(stateFromPincode('12345'),'');
 assert.equal(stateFromPincode(''),'');
});
