import {useDemoTourNavigation} from '../demo/tour';
import {useEffect,useRef,useState} from 'react';
import {Package,ArrowDownToLine,History,CalendarDays,RefreshCw} from 'lucide-react';
import {supabase} from '../supabase';
import {dailyStock,stockDay} from './model';
import './inventory.css';
const tabs=[['stock','Stock',Package],['movements','Movements',History],['daily','Daily Report',CalendarDays]];
const fmt=n=>Number(n).toLocaleString('en-IN',{maximumFractionDigits:3});
export default function InventoryView({currentUser}){
 const [items,setItems]=useState([]),[history,setHistory]=useState([]),[search,setSearch]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[selected,setSelected]=useState(null),[kind,setKind]=useState('receipt'),[qty,setQty]=useState(''),[note,setNote]=useState('');
 const [tab,setTab]=useState('stock'),[page,setPage]=useState(0);
 useDemoTourNavigation(entry=>{if(entry.view==='inventory' && tabs.some(([id])=>id===entry.tab)){setTab(entry.tab);setPage(0);setSearch('');}});
 const [reportDay,setReportDay]=useState(()=>stockDay(Date.now()));const request=useRef(null);
 async function refresh(){setLoading(true);setError('');try{
  const synced=await supabase.rpc('sync_inventory_catalog');if(synced.error)throw synced.error;
  const readAll=async(table,order)=>{const rows=[];for(let offset=0;;offset+=1000){const p=await supabase.from(table).select('*').order(order).range(offset,offset+999);if(p.error)throw p.error;rows.push(...p.data);if(p.data.length<1000)return rows;}};
  const [stock,moves]=await Promise.all([readAll('inventory_items','sku'),readAll('inventory_movements','id')]);
  setItems(stock);setHistory(moves.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)));
 }catch(e){setError(/inventory_|schema cache/.test(e.message)?'Run database migration scripts in your demo database, then refresh.':e.message);}finally{setLoading(false);}}
 useEffect(()=>{refresh();},[]);
 useEffect(()=>{setPage(0);},[tab,search,reportDay]);
 const shown=items.filter(i=>`${i.sku} ${i.product_name} ${i.uom}`.toLowerCase().includes(search.toLowerCase()));
 const itemMap=new Map(items.map(i=>[i.id,i]));
 const moves=history.filter(m=>`${itemMap.get(m.item_id)?.product_name||''} ${m.note} ${m.kind}`.toLowerCase().includes(search.toLowerCase()));
 const rows=tab==='stock'?shown:tab==='daily'?dailyStock(shown,history,reportDay):moves;
 const lastPage=Math.max(0,Math.ceil(rows.length/10)-1),currentPage=Math.min(page,lastPage),visible=rows.slice(currentPage*10,currentPage*10+10);
 function openStock(item,movement='receipt'){setSelected(item);setKind(movement);setQty('');setNote('');setError('');}
  async function record(e){
   e.preventDefault();
   if(saving)return;
   const amount=Number(qty);
   if(!Number.isFinite(amount)||amount<=0){setError('Enter a positive quantity.');return;}
   const actorName = currentUser?.name || 'Admin';
   const userNote = note.trim();
   // Append author attribution so it's cleanly stored and visible across reload/sessions
   const baseText = userNote || (kind==='receipt' ? 'Stock addition' : 'Stock issue');
   const effectiveNote = `${baseText} · by ${actorName}`;
   const fingerprint=JSON.stringify([selected.id,kind,amount,effectiveNote]);
   if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
   setSaving(true);setError('');
   try{
    const {error:failure}=await supabase.rpc('record_inventory_movement',{p_item_id:selected.id,p_kind:kind,p_quantity:amount,p_note:effectiveNote,p_request_id:request.current.id});
    if(failure)throw failure;
    setSelected(null);request.current=null;await refresh();
   }catch(e){setError(e.message);}finally{setSaving(false);}
  }

 // Helper to parse author from note or identify system/delivery source
 function formatMovementRow(row) {
  const noteStr = row.note || '';
  const byMatch = noteStr.match(/\s+·\s+by\s+(.+)$/i);
  if (byMatch) {
   return {
    displayNote: noteStr.slice(0, byMatch.index),
    author: byMatch[1]
   };
  }
  if (noteStr.startsWith('BOM delivery:')) {
   return {
    displayNote: noteStr,
    author: 'Delivery System'
   };
  }
  if (row.kind === 'opening') {
   return {
    displayNote: noteStr,
    author: 'System (Opening)'
   };
  }
  return {
   displayNote: noteStr,
   author: currentUser?.name || 'Admin'
  };
 }

 return <section className="inventory">
 <div className="inventory-heading inventory-hero"><div><span className="inventory-eyebrow">MATERIALS & STOCK</span><h2>Godown / Inventory</h2><p>Receive stock, record movements and track warehouse balances.</p></div><button onClick={refresh} disabled={loading||saving}><RefreshCw size={14}/> Refresh</button></div>
 <div className="inventory-summary"><div><Package size={18}/><strong>{items.length}</strong><span>Materials in godown</span></div><div><ArrowDownToLine size={18}/><strong>{items.filter(i=>Number(i.stock_on_hand)<=Number(i.reorder_level)).length}</strong><span>Low-stock materials</span></div><div><History size={18}/><strong>{history.length}</strong><span>Stock movements</span></div></div>
 <div className="inventory-tabs" role="tablist" aria-label="Inventory sections">{tabs.map(([id,label,Icon])=><button key={id} id={`inv-tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`inv-panel-${id}`} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}</div>
 {error&&<p className="inventory-error" role="alert">{error}</p>}
 <section role="tabpanel" id={`inv-panel-${tab}`} aria-labelledby={`inv-tab-${tab}`} className="inventory-panel">
 <div className="inventory-filters"><label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Material, SKU or reference"/></label>
 {tab==='daily'&&<label>Report date (India time)<input type="date" value={reportDay} max={stockDay(Date.now())} onChange={e=>{if(e.target.value)setReportDay(e.target.value);}}/></label>}</div>
 <p className="inventory-help">{tab==='stock'?'Opening balances are sample stock. Add quantity when material arrives. Delivered batches deduct stock automatically.':tab==='daily'?'Opening + incoming − outgoing = closing. Opening entries belong to the opening balance on their recorded day.':'Receipts and deliveries share this stock ledger. Changing a delivered status back does not return materials; record an actual return as a receipt.'}</p>
 {loading?<p role="status">Loading inventory…</p>:<div className="inventory-table"><table><thead><tr>{(tab==='stock'?['Material','Unit','Available quantity','Reorder level','Action']:tab==='daily'?['Material','Unit','Opening','Incoming','Outgoing','Closing']:['Material','Movement','Quantity','Reference','By','Recorded']).map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>
 {visible.map((row,index)=>tab==='stock'?<tr key={row.id}><td><strong>{row.product_name}</strong><small>{row.sku}</small></td><td>{row.uom}</td><td><span className={`inventory-badge ${Number(row.stock_on_hand)<=Number(row.reorder_level)?'low':'good'}`}>{fmt(row.stock_on_hand)}</span></td><td>{fmt(row.reorder_level)}</td><td><button className="inventory-primary" onClick={()=>openStock(row)}>+ Add quantity</button> <button onClick={()=>openStock(row,'issue')}>Issue</button></td></tr>:tab==='daily'?<tr key={row.id}><td>{row.product_name}</td><td>{row.uom}</td><td>{fmt(row.opening)}</td><td className="inventory-in">+{fmt(row.incoming)}</td><td className="inventory-out">−{fmt(row.outgoing)}</td><td><strong>{fmt(row.closing)}</strong></td></tr>:(()=>{const parsed=formatMovementRow(row);return <tr key={row.id||index}><td>{itemMap.get(row.item_id)?.product_name||'Material'}</td><td><span className={`inventory-badge ${row.kind==='issue'?'low':'good'}`}>{row.kind}</span></td><td>{row.kind==='issue'?'−':'+'}{fmt(row.quantity)} {itemMap.get(row.item_id)?.uom}</td><td>{parsed.displayNote}</td><td><span className="inventory-badge" style={{background:'#edf5f2',color:'#1e5849',fontWeight:700}}>{parsed.author}</span></td><td>{new Date(row.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td></tr>;})())}
 </tbody></table>{!visible.length&&<p className="inventory-empty">No matching records.</p>}</div>}
 <div className="inventory-pagination"><span>{rows.length?`${currentPage*10+1}–${Math.min((currentPage+1)*10,rows.length)} of ${rows.length}`:'0 records'}</span><div><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous</button><span> {currentPage+1} / {lastPage+1} </span><button disabled={currentPage===lastPage} onClick={()=>setPage(currentPage+1)}>Next</button></div></div>
 </section>
  {selected&&<div className="inventory-backdrop"><section role="dialog" aria-modal="true" aria-label="Record stock movement" className="inventory-dialog"><form onSubmit={record}><h3>{kind==='receipt'?'Add quantity':'Issue stock'} · {selected.product_name}</h3><p>Available: {fmt(selected.stock_on_hand)} {selected.uom}</p><label>Quantity ({selected.uom})<input autoFocus type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required disabled={saving}/></label><label>Reference / note <small style={{color:'#78716c',fontWeight:'normal'}}>(optional)</small><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Delivery note, return or project reference (optional)" maxLength={500} disabled={saving}/></label>{error&&<p role="alert" className="inventory-error">{error}</p>}<div className="inventory-heading"><button type="button" disabled={saving} onClick={()=>setSelected(null)}>Cancel</button><button className="inventory-primary" type="submit" disabled={saving}>{saving?'Saving…':'Save quantity'}</button></div></form></section></div>}
 </section>;
}
