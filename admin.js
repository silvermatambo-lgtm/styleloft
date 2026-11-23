import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm";
const SUPABASE_URL="https://eojkepvidtzougqlqslj.supabase.co";
const KEY="sb_publishable_WHlbUf22eRqemereTYHwbw_oZDOfg1P";
const db=createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
let user=null,products=[],editing=null,loaded=false;
const errorMessage=e=>e?.message||"Something went wrong; please retry.";
function message(id,text,error=false){$(id).innerHTML="";if(!text)return;const div=document.createElement("div");div.className="msg "+(error?"error":"success");div.textContent=text;$(id).append(div);}
function screen(name){$("loading").hidden=true;for(const n of ["authArea","claimArea","dashboard"])$(n).hidden=n!==name;$("dashboard").style.display=name==="dashboard"?"block":"none";$("signOut").hidden=name==="authArea";}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const money=n=>"R "+Number(n||0).toFixed(2);
async function refreshAuth(){
  const {data:{user:u},error}=await db.auth.getUser();
  user=error?null:u;
  if(!user){$("who").textContent="";screen("authArea");return;}
  $("who").textContent=user.email||"Signed in";
  const {data, error:roleError}=await db.from("styleloft_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(roleError){screen("claimArea");message("claimMsg","Unable to verify your admin role: "+errorMessage(roleError),true);return;}
  if(!data){screen("claimArea");return;}
  screen("dashboard");await loadProducts();
}
async function loadProducts(){
 message("dashboardMsg","");
 const {data,error}=await db.from("styleloft_products").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false});
 if(error){message("dashboardMsg","Could not load products: "+errorMessage(error),true);return;}
 products=data||[];loaded=true;render();
}
function render(){
 $("totalStat").textContent=products.length;$("activeStat").textContent=products.filter(p=>p.active).length;$("lowStat").textContent=products.filter(p=>p.stock===0).length;
 const q=$("search").value.trim().toLowerCase(),f=$("filter").value;
 const rows=products.filter(p=>(f==="all"||(f==="active"?p.active:!p.active))&&(!q||(p.name+" "+p.category+" "+p.description).toLowerCase().includes(q)));
 $("productGrid").innerHTML=rows.map(p=>'<article class="item"><img loading="lazy" src="'+safe(p.image_url||"/styleloft-boutique-hero.jpg")+'" alt="'+safe(p.name)+'"><div class="item-content"><div class="item-meta">'+safe(p.category)+'</div><h3>'+safe(p.name)+'</h3><div class="item-price">'+money(p.price)+'</div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="pill '+(p.active?"":"off")+'">'+(p.active?"Published":"Hidden")+'</span><span class="item-meta">Stock: '+p.stock+'</span></div><div class="actions"><button type="button" class="secondary" data-edit="'+safe(p.id)+'">Edit</button><button type="button" class="secondary" data-toggle="'+safe(p.id)+'">'+(p.active?"Hide":"Publish")+'</button></div></div></article>').join("")||'<p>No products match your search. Use “Add product” to create one.</p>';
}
function openEditor(p){
 editing=p?.id||null;
 $("editorTitle").textContent=p?"Edit product":"Add product";
 $("pName").value=p?.name||"";
 $("pCategory").value=p?.category||"Handbags";
 if(p?.category && ![...$("pCategory").options].some(x=>x.value===p.category)){$("pCategory").add(new Option(p.category,p.category));$("pCategory").value=p.category;}
 $("pPrice").value=p?.price??"";
 $("pStock").value=p?.stock??0;
 $("pOrder").value=p?.sort_order??100;
 $("pDescription").value=p?.description||"";
 $("pImage").value=p?.image_url||"";
 $("pFile").value="";
 $("pActive").checked=Boolean(p?.active);
 $("pFeatured").checked=Boolean(p?.featured);
 $("delete").hidden=!p;
 $("preview").src=p?.image_url||"/styleloft-boutique-hero.jpg";
 message("editMsg","");
 $("editorWrap").classList.add("open");document.body.style.overflow="hidden";$("pName").focus();
}
function closeEditor(){$("editorWrap").classList.remove("open");document.body.style.overflow="";}
function slug(s){let r=s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,65);return r.length>=2?r:"product";}
async function optimize(file){
 if(file.size<=2.5*1024*1024||file.type==="image/gif")return file;
 try{
   const bitmap=await createImageBitmap(file);const max=1800,ratio=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
   canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",0.84));
   if(blob&&blob.size<file.size)return new File([blob],"styleloft-photo.webp",{type:"image/webp"});
 }catch{}
 return file;
}
async function upload(file){
 if(!file)return $("pImage").value.trim();
 const types=["image/jpeg","image/png","image/webp","image/gif"];
 if(!types.includes(file.type))throw Error("Please use JPG, PNG, WebP or GIF images.");
 const prepared=await optimize(file);
 if(prepared.size>8*1024*1024)throw Error("Photo exceeds 8MB. Please choose a smaller image.");
 const ext=prepared.type==="image/png"?"png":prepared.type==="image/gif"?"gif":prepared.type==="image/webp"?"webp":"jpg";
 const path="products/"+crypto.randomUUID()+"."+ext;
 const {error}=await db.storage.from("styleloft-product-images").upload(path,prepared,{contentType:prepared.type,upsert:false,cacheControl:"3600"});
 if(error)throw error;
 return db.storage.from("styleloft-product-images").getPublicUrl(path).data.publicUrl;
}
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();$("authSubmit").disabled=true;message("authMsg","");
 const email=$("email").value.trim().toLowerCase(),password=$("password").value;
 try{
  const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
  await refreshAuth();
 }catch(err){message("authMsg",errorMessage(err),true);}finally{$("authSubmit").disabled=false;}
});
$("register").onclick=async()=>{
 const email=$("email").value.trim().toLowerCase(),password=$("password").value;
 const setupCode=$("ownerSignupCode").value.trim();
 if(!email||password.length<8){message("authMsg","Enter your email and a strong password of at least eight characters first.",true);return;}
 if(setupCode.length<30){message("authMsg","Enter the private one-time owner setup code supplied by WebDevPro. It is required only when creating the first owner account.",true);return;}
 $("register").disabled=true;
 try{
  // The server validates this one-time code and atomically assigns the first
  // authorised new account admin permissions; all other signups are rejected.
  const {error,data}=await db.auth.signUp({
   email,password,
   options:{emailRedirectTo:"https://www.styleloft.co.za/admin.html",data:{styleloft_owner_setup_code:setupCode}}
  });
  if(error)throw error;
  $("ownerSignupCode").value="";
  message("authMsg",data.session?
   "Your owner account has been created and granted administrator access. Opening your dashboard…" :
   "If your registration was accepted, your first owner account has been granted administrator access. If email confirmation is required by Supabase, confirm the email before logging in. You will not need another admin setup step.");
  if(data.session)await refreshAuth();
 }catch(error){message("authMsg","Owner registration was not completed. "+mailFailure(error)+" If the account has already been claimed, contact WebDevPro.",true);}
 finally{$("register").disabled=false;}
};
// The project must have production SMTP and Supabase URL Configuration enabled
// before verification and recovery mail can be delivered to the shop owner.
function mailFailure(error){
 const msg=errorMessage(error);
 if(/email address not authorized|smtp|sending.*email|email.*send|email.*rate limit/i.test(msg))
   return msg+" — The store's verification email service is not ready. Please contact WebDevPro; do not create another account.";
 return msg;
}
$("resend").onclick=async()=>{
 const email=$("email").value.trim().toLowerCase();
 if(!email||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){message("authMsg","Enter your registered email address first.",true);return;}
 const btn=$("resend");btn.disabled=true;
 try{
  const {error}=await db.auth.resend({type:"signup",email,options:{emailRedirectTo:"https://www.styleloft.co.za/admin.html"}});
  message("authMsg",error?mailFailure(error):"If this email has an unconfirmed registration, a new verification email has been requested. Check Inbox and Spam/Junk.",!!error);
 }catch(err){message("authMsg",mailFailure(err),true);}finally{btn.disabled=false;}
};
$("reset").onclick=async()=>{
 const email=$("email").value.trim().toLowerCase();if(!email){message("authMsg","Enter your email address first.",true);return;}
 const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:"https://www.styleloft.co.za/admin.html"});
 message("authMsg",error?mailFailure(error):"If this address is registered, a password reset email has been requested. Check Inbox and Spam/Junk.",Boolean(error));
};
db.auth.onAuthStateChange((event,session)=>{
 if(event==="PASSWORD_RECOVERY"){const p=prompt("Enter a new password (at least 8 characters):");if(p?.length>=8)db.auth.updateUser({password:p}).then(({error})=>message("authMsg",error?errorMessage(error):"Password updated. Sign in again.",Boolean(error)));}
});
$("signOut").onclick=async()=>{await db.auth.signOut();user=null;screen("authArea");};
$("addNew").onclick=()=>openEditor(null);
$("cancel").onclick=$("cancel2").onclick=closeEditor;
$("editorWrap").addEventListener("click",e=>{if(e.target===$("editorWrap"))closeEditor();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeEditor();});
$("search").addEventListener("input",render);$("filter").addEventListener("change",render);
$("refresh").onclick=loadProducts;
$("productGrid").addEventListener("click",async e=>{
 const target=e.target.closest("[data-edit],[data-toggle]");if(!target)return;
 const id=target.dataset.edit||target.dataset.toggle,p=products.find(x=>x.id===id);if(!p)return;
 if(target.dataset.edit){openEditor(p);return;}
 target.disabled=true;const {error}=await db.from("styleloft_products").update({active:!p.active}).eq("id",id);
 target.disabled=false;if(error)message("dashboardMsg",errorMessage(error),true);else await loadProducts();
});
$("pImage").addEventListener("change",e=>{$("preview").src=e.target.value||"/styleloft-boutique-hero.jpg";});
$("pFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(f){$("preview").src=URL.createObjectURL(f);}});
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();const b=$("save");b.disabled=true;message("editMsg","");
 try{
  const name=$("pName").value.trim(),price=Number($("pPrice").value),stock=Number($("pStock").value),order=Number($("pOrder").value)||100;
  if(!name||!Number.isFinite(price)||price<0||!Number.isSafeInteger(stock)||stock<0)throw Error("Enter a valid name, price and non-negative whole-number stock.");
  let image_url=await upload($("pFile").files?.[0]);if(image_url&&!/^https:\/\//i.test(image_url))throw Error("Image URL must begin with https://");
  const record={name,category:$("pCategory").value,price:Math.round(price*100)/100,stock,description:$("pDescription").value.trim(),image_url,active:$("pActive").checked,featured:$("pFeatured").checked,sort_order:order};
  if(editing){const {error}=await db.from("styleloft_products").update(record).eq("id",editing);if(error)throw error;}
  else{const id=slug(name)+"-"+crypto.randomUUID().slice(0,8);const {error}=await db.from("styleloft_products").insert({id,...record});if(error)throw error;}
  closeEditor();await loadProducts();message("dashboardMsg","Product saved. Your storefront will show the latest details when refreshed.");
 }catch(err){message("editMsg",errorMessage(err),true);}finally{b.disabled=false;}
});
$("delete").onclick=async()=>{
 if(!editing||!confirm("Permanently delete this product? You can hide it instead to keep its details."))return;
 $("delete").disabled=true;const {error}=await db.from("styleloft_products").delete().eq("id",editing);
 $("delete").disabled=false;
 if(error){message("editMsg",errorMessage(error),true);return;}closeEditor();await loadProducts();
};
refreshAuth().catch(e=>{$("loading").hidden=true;screen("authArea");message("authMsg","Could not contact the owner database: "+errorMessage(e),true);});
