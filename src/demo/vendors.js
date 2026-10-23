// This isolated demo keeps only three seeded installers. Custom installer names are untouched.
// Older databases used "Vendor N" for the same people, so both spellings map to "Installer N".
export const demoVendorTarget=name=>{
 const match=/^(?:Demo )?(?:Vendor|Installer)(?: (\d+))?$/i.exec(String(name||'').trim());
 return match?`Installer ${match[1]?1+(Number(match[1])-1)%3:1}`:null;
};
// A demo visitor's profile keeps the name they typed, so the installer view looked
// for jobs assigned to that name and showed none. It opens as one seeded installer.
export const demoInstallerName=name=>demoVendorTarget(name)||'Installer 1';
export async function ensureThreeDemoVendors(client){
 const read=await client.from('vendors').select('*');if(read.error)throw read.error;
 const obsolete=(read.data||[]).filter(v=>demoVendorTarget(v.name)&&v.name!==demoVendorTarget(v.name));
 if(!obsolete.length&&read.data?.length===3&&read.data.every(v=>demoVendorTarget(v.name)===v.name))return;
 // Older demo databases can be cleaned through their existing authenticated tables.
 // Relink everything first; only then delete redundant installer directory rows.
 const checked=async query=>{const result=await query;if(result.error)throw result.error;return result.data;};
 for(let n=1;n<=3;n++){
  const name=`Installer ${n}`;
  await checked(client.from('vendors').upsert({name,email:`installer${n}@solarflow.example`,phone:`000000000${n}`},{onConflict:'name',ignoreDuplicates:true}));
  const names=obsolete.filter(v=>demoVendorTarget(v.name)===name).map(v=>v.name);if(!names.length)continue;
  await checked(client.from('admin').update({vendor:name}).in('vendor',names).select('id'));
  await checked(client.from('delivery_batches').update({vendor:name}).in('vendor',names).select('id'));
  await checked(client.from('profiles').update({name}).eq('user_type','vendor').in('name',names).select('id'));
  const directory=await client.from('demo_profiles').update({name}).eq('user_type','vendor').in('name',names).select('id');
  if(directory.error&&!['42P01','PGRST205'].includes(directory.error.code))throw directory.error;
 }
 const ids=obsolete.map(v=>v.id);
 const deleted=await checked(client.from('vendors').delete().in('id',ids).select('id'));
 if(deleted.length!==ids.length)throw new Error('Some old demo installers could not be removed. Refresh to retry.');
}
