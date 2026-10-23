export const normalizeItem = name => {
 const key=String(name||'').trim().toLowerCase().replace(/\s+/g,' ');
 return ({'16sq mm la cabel':'16sq mm la cable','condute pipe':'conduite pipe'})[key]||key;
};
export const normalizeUnit = unit => ['no.','nos','no','nos.'].includes(String(unit||'').trim().toLowerCase())?'Nos':String(unit||'').trim();
// Compound specifications remain visible and unresolved, not silently summed.
export function numericQuantity(value){const text=String(value??'').trim();return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)?Number(text):null;}
export function summarizeBomDemand(items,lines){
 const totals=new Map(items.map(item=>[item.id,{quantity:0,unresolved:0,lines:0}]));
 for(const line of lines){const item=items.find(i=>normalizeItem(i.product_name)===normalizeItem(line.product_name)&&normalizeUnit(i.uom)===normalizeUnit(line.uom));if(!item)continue;
  const total=totals.get(item.id);total.lines++;const n=numericQuantity(line.quantity);if(n===null)total.unresolved++;else total.quantity+=n;
 }return totals;
}

// Saved BOMs reserve stock until their truck is loaded. Rows come from
// get_inventory_reservations(): one per item and project.
export function groupReservations(rows){
 const byItem=new Map();
 for(const row of rows||[]){
  const quantity=Number(row.quantity)||0;if(quantity<=0)continue;
  const entry=byItem.get(row.item_id)||{quantity:0,projects:[]};
  entry.quantity=Math.round((entry.quantity+quantity)*1000)/1000;entry.projects.push({...row,quantity});byItem.set(row.item_id,entry);
 }
 for(const entry of byItem.values())entry.projects.sort((a,b)=>b.quantity-a.quantity||String(a.customer_name||'').localeCompare(String(b.customer_name||'')));
 return byItem;
}
export const freeStock=(item,reserved=0)=>Math.round(((Number(item.stock_on_hand)||0)-(Number(reserved)||0))*1000)/1000;

export const stockDay = value => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function dailyStock(items,movements,day){
 return items.map(item=>{
  let opening=0,incoming=0,outgoing=0;
  for(const m of movements){if(m.item_id!==item.id)continue;const date=stockDay(m.created_at);const qty=Number(m.quantity);
   if(date<day || (date===day && m.kind==='opening'))opening+=m.kind==='issue'?-qty:qty;
   else if(date===day){if(m.kind==='issue')outgoing+=qty;else incoming+=qty;}
  }
  const round=n=>Math.round(n*1000)/1000;
  return {...item,opening:round(opening),incoming:round(incoming),outgoing:round(outgoing),closing:round(opening+incoming-outgoing)};
 });
}
