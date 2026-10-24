import test from 'node:test';
import assert from 'node:assert/strict';
import {nextStageFor,skipsStage,defaultCommission} from '../../src/constants.js';

test('commercial customers skip Subsidy Status, homes do not',()=>{
 assert.equal(nextStageFor('DISCOM INSPECTION',{project_type:'Commercial'}),'FINAL REVIEW');
 assert.equal(nextStageFor('DISCOM INSPECTION',{project_type:'Residential'}),'SUBSIDY STATUS');
 assert.equal(nextStageFor('DISCOM INSPECTION',{}),'SUBSIDY STATUS');
 assert.equal(skipsStage('SUBSIDY STATUS',{project_type:'Commercial',payment_type:'Cash'}),true);
});

test('cash skips Loan and loan skips Cash, as before',()=>{
 assert.equal(nextStageFor('REGISTRATION',{payment_type:'Cash'}),'CASH');
 assert.equal(nextStageFor('REGISTRATION',{payment_type:'Loan'}),'LOAN');
 assert.equal(nextStageFor('LOAN',{payment_type:'Loan'}),'MATERIAL ORDER');
 assert.equal(nextStageFor('FINAL REVIEW',{}),'COMPLETED');
 assert.equal(nextStageFor('COMPLETED',{}),null);
});

test('partner commission uses the installer rate',()=>{
 assert.equal(defaultCommission(5),11000);
 assert.equal(defaultCommission(''),7700);
});
