/* Public catalogue from StyleLoft's owner-managed Supabase database.
   Only the publishable API key is in browser code. RLS protects admin changes. */
(function(){
 "use strict";
 const endpoint="https://eojkepvidtzougqlqslj.supabase.co/rest/v1/styleloft_products?select=id,name,description,category,price,stock,image_url,active,sort_order&active=eq.true&order=sort_order.asc,created_at.desc";
 const key="sb_publishable_WHlbUf22eRqemereTYHwbw_oZDOfg1P";
 function showBanner(text){
  let b=document.getElementById("styleloftCatalogStatus");
  if(!b){b=document.createElement("div");b.id="styleloftCatalogStatus";b.setAttribute("role","status");b.style.cssText="background:#fff0dd;color:#543b2c;text-align:center;padding:12px 16px;font:600 13px system-ui";document.querySelector(".top")?.after(b);}
  b.textContent=text;
 }
 async function load(){
  // Remove demo catalogue so expired hardcoded prices aren't presented as current.
  P.splice(0,P.length);render();showBanner("Loading the latest StyleLoft products…");
  try{
   const res=await fetch(endpoint,{headers:{"apikey":key},cache:"no-store",signal:AbortSignal.timeout(10000)});
   if(!res.ok)throw Error("Catalogue unavailable ("+res.status+")");
   const rows=await res.json();
   if(!Array.isArray(rows))throw Error("Invalid catalogue data");
   const products=rows.filter(p=>p&&p.active&&p.id&&p.name&&Number.isFinite(Number(p.price))).map(p=>[
      p.name,Number(p.price),p.category||"Fashion","♡",p.id,p.description||"",Number(p.stock)||0
   ]);
   P.splice(0,P.length,...products);
   for(const p of rows)if(p.id&&p.image_url&&/^https:\/\//i.test(p.image_url))ART[p.id]=p.image_url;
   const filters=["Fashion",...new Set(rows.map(x=>x.category).filter(x=>x&&x!=="Fashion")),"All"];
   allowedFilters.splice(0,allowedFilters.length,...filters);
   for(const [id,count] of Object.entries(cart)){
     const p=P.find(x=>x[4]===id);
     if(!p||p[6]<=0){delete cart[id];continue;}
     if(count>p[6])cart[id]=p[6];
   }
   persist();
   render();
   const banner=document.getElementById("styleloftCatalogStatus");if(banner)banner.remove();
   if(!products.length)showBanner("The owner is preparing the new collection. Please check back soon.");
  }catch(e){
   render();showBanner("Products are temporarily unavailable. Please contact StyleLoft before placing an order.");
   console.error("StyleLoft catalogue error:",e.message);
  }
 }
 load();
})();