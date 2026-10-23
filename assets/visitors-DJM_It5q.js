const o=i=>/^anon\.[^@]*@solarflow\.demo$/i.test(i||""),a=(i,s)=>o(i?.email)&&i?.id!==s,r=(i,s)=>(i||[]).filter(t=>!a(t,s));export{a,o as i,r as w};
