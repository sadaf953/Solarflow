function n(r,e){const t=parseFloat(String(r||"").replace(/,/g,"")),a=parseFloat(String(e||"").replace(/,/g,""));return isNaN(t)||isNaN(a)||t<=0||a<=0?null:Math.round(t*a/1e3*100)/100}export{n as c};
