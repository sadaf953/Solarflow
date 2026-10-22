import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate,newForm,payload,freshTemplate,validate,fromRow,toLead,canUseQuotations,pdfName } from '../../src/quotations/model.js';
import { proposalSnapshot,proposalTotals } from '../../src/quotations/proposal/source.js';
import { calculateSystemCapacityKwp } from '../../src/utils/capacity.js';
const user = {id:'11111111-1111-4111-8111-111111111111',name:'Test agent',phone:'0000000000',userType:'agent'};
function complete() {
    return {...newForm(user),customer_name:'Test customer',customer_phone:'0000000001',capacity_kw:3.48,solar_panel_make:'SolarFlow',solar_panel_qty:6,panel_wattage:580,inverter_option:'Option 1',inverter_brand:'DemoVolt',options:['SolarFlow','Tata','Adani'].map(brandName => ({brandName,baseValue:189000,discount:1000,subsidy:78000}))};
}
test('Indian currency calculations use rounded source amounts, ignoring supplied totals',() => {
    assert.deepEqual(calculate([{brandName:'A',baseValue:0.3,discount:0.1,subsidy:0.1,netPayableAmount:999}])[0],{brandName:'A',baseValue:0.3,discount:0.1,subsidy:0.1,netPayableAmount:0.2,netPriceAfterSubsidy:0.1});
});
test('quotation capacity uses the exact shared Leads calculation',() => {
    assert.equal(calculateSystemCapacityKwp('580','6'),3.48);
    assert.equal(calculateSystemCapacityKwp('1,000','3'),3);
    assert.equal(calculateSystemCapacityKwp('',6),null);
});
test('clean form contains no sample prospect or sample prices',() => { const form = newForm(user); assert.equal(form.customer_name,'');assert.equal(form.options[0].baseValue,''); assert.ok(validate(form).length >= 6); });
test('deferred quotation-to-lead mapping remains ready for later activation',() => {
    const form = complete();
    const lead = toLead(form);
    assert.equal(lead.customer_name,'Test customer');
    assert.equal(lead.phone_number,'0000000001');
    assert.equal(lead.system_capacity_kwp,3.48);
    assert.equal(lead.module_brand,'SolarFlow');
    assert.equal(lead.no_of_modules,6);
});
test('complete form validates and lists all invalid steps',() => {
    assert.deepEqual(validate(complete()),[]);
    const form = complete(); form.customer_name='';form.capacity_kw=0;form.solar_panel_qty=1.2;form.options[1].discount=-1;
    const errors = validate(form); assert.ok(errors.some(e => e.startsWith('Customer:')));assert.ok(errors.some(e => e.startsWith('System:')));assert.ok(errors.some(e => e.startsWith('Pricing:')));
});
test('salesperson phone is optional and never blocks a quotation',() => {
    const blank = complete(); blank.owner_phone_snapshot=''; assert.deepEqual(validate(blank),[]);
    const legacy = complete(); legacy.owner_phone_snapshot='Office extension 12'; assert.deepEqual(validate(legacy),[]);
});
test('reject missing options, NaN, excess discount/subsidy and invalid dates',() => {
    for (const mutate of [f => f.options.pop(),f => f.options[0].baseValue=NaN,f => f.options[0].discount=999999,f => f.options[0].subsidy=999999,f => f.valid_until='2000-01-01']) { const f=complete();mutate(f);assert.ok(validate(f).length); }
});
test('draft maps blank numeric fields to null; starting price uses lowest net payable',() => {
    assert.equal(payload(newForm(user),freshTemplate()).capacity_kw,null);
    assert.equal(payload(newForm(user),freshTemplate()).panel_wattage,null);
    const form = complete();form.options[1].baseValue=170000;
    assert.equal(payload(form,freshTemplate()).panel_wattage,580);
    assert.equal(payload(form,freshTemplate()).starting_price,169000);
});
test('saved form and PDF retain their template snapshot and recalculate totals',() => {
    const template = freshTemplate();template.company.name='Archived company';const form=complete();
    const row={...payload(form,template),id:'quote',quotation_no:3255};
    row.quotation_data.form.options[0].netPayableAmount=1;
    const snap = proposalSnapshot(row);
    assert.equal(snap.inputs.options[0].netPayableAmount,188000);
    assert.equal(snap.inputs.price,188000);
    assert.equal(snap.company.name,'Archived company'); assert.equal(fromRow(row).customer_name,form.customer_name);
    assert.equal(snap.number,'Quote-3255');
});
test('proposal prices on the chosen panel option and keeps proposal answers out of table columns',() => {
    const form = complete(); form.options[2].baseValue = 210000; form.proposal_option = 2; form.monthly_units = '450'; form.tariff = '7';
    const body = payload(form,freshTemplate());
    for (const key of ['proposal_option','monthly_units','tariff','payment_method','loan_bank','loan_rate_pct','loan_tenure_years','down_payment']) assert.equal(key in body,false,`${key} is not a column`);
    const snap = proposalSnapshot({...body,quotation_no:7});
    assert.equal(snap.inputs.selectedOption,2); assert.equal(snap.inputs.moduleMake,'Adani'); assert.equal(snap.inputs.price,209000);
    assert.equal(snap.inputs.monthlyUnits,450); assert.equal(snap.inputs.tariff,7);
    assert.equal(snap.inputs.moduleQty,6); assert.equal(snap.inputs.moduleWp,580);
    assert.equal(snap.inputs.customer.phone,'0000000001');
    assert.deepEqual(proposalTotals(snap),{kwp:3.48,price:209000,subsidy:78000,effectiveCost:131000,emi:null});
    form.proposal_option = 7; assert.ok(validate(form).some(e => e.includes('Choose the option')));
});
test('loan answers drive the EMI page and are validated',() => {
    const form = {...complete(),payment_method:'Bank Solar Loan',loan_rate_pct:'9',loan_tenure_years:'5',down_payment:'20000'};
    assert.deepEqual(validate(form),[]);
    const snap = proposalSnapshot({...payload(form,freshTemplate()),quotation_no:8});
    assert.equal(snap.inputs.loanAmount,168000); assert.equal(snap.inputs.loanRatePct,9);
    assert.ok(proposalTotals(snap).emi > 3000);
    assert.ok(validate({...form,down_payment:'999999'}).some(e => e.includes('Down payment')));
    assert.ok(validate({...form,loan_rate_pct:'-1'}).some(e => e.includes('interest rate')));
});
test('older quotations without proposal answers use the demo defaults',() => {
    const row = {...payload(complete(),freshTemplate()),quotation_no:9};
    for (const key of ['proposal_option','monthly_units','tariff','payment_method']) delete row.quotation_data.form[key];
    const snap = proposalSnapshot(row);
    assert.equal(snap.inputs.selectedOption,0); assert.equal(snap.inputs.paymentMethod,'Cash / bank transfer');
    assert.equal(snap.inputs.monthlyUnits,Math.round(3.48 * 120)); assert.equal(snap.inputs.tariff,6.5);
});
test('signed quotations download with a signed file name',() => {
    assert.equal(pdfName({quotation_no:12,customer_name:'Asha Patel'}),'Quotation_12_Asha_Patel.pdf');
    assert.equal(pdfName({quotation_no:12,customer_name:'Asha Patel',signed_at:'2026-10-22T10:00:00Z'}),'Quotation_12_Asha_Patel_signed.pdf');
});
test('unknown stored versions fail closed and module roles are explicit',() => {
    assert.throws(() => fromRow({schema_version:2}),/newer format/);
    for(const userType of ['agent','agent2','admin','sales']) assert.equal(canUseQuotations({userType}),true);
    for(const userType of ['vendor','stamp','office2',undefined]) assert.equal(canUseQuotations({userType}),false);
});

test('uploaded quotation artwork survives saved draft and PDF document reconstruction', () => {
    const template = freshTemplate();
    template.assets = { demoQualityLogoUrl:'data:image/png;base64,Z2VkYQ==', demoEnergyLogoUrl:'data:image/png;base64,ZW1ibGVt', demoBannerUrl:'data:image/png;base64,YmFubmVy' };
    const row = { ...payload(complete(),template), quotation_no:51 };
    assert.deepEqual(row.quotation_data.template.assets,template.assets);
    const reopened = payload(fromRow(row,user),row.quotation_data.template);
    assert.deepEqual(reopened.quotation_data.template.assets,template.assets);
    template.assets.solarflowLogoUrl = 'data:image/png;base64,bG9nbw==';
    assert.equal(proposalSnapshot({...payload(complete(),template),quotation_no:51}).company.logo,template.assets.solarflowLogoUrl);
});
