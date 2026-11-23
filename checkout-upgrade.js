/* Activates the hosted Paystack flow only after the secure server reports readiness.
   Existing enquiry checkout remains intact if payment/courier configuration is incomplete. */
(function(){
  "use strict";
  const endpoint="/api/checkout";
  const get=(id)=>document.getElementById(id);
  const currency=n=>"R "+Number(n).toFixed(2);
  function notice(message,ok){
    let el=get("styleloftPayNotice");
    if(!el){el=document.createElement("div");el.id="styleloftPayNotice";el.setAttribute("role","status");
      el.style.cssText="position:fixed;z-index:300;top:16px;left:50%;transform:translateX(-50%);max-width:min(540px,92vw);padding:20px 25px;background:#fffaf4;color:#34251d;border:2px solid #b98c74;box-shadow:0 12px 45px #0004;border-radius:12px;font:14px/1.6 system-ui";
      document.body.append(el);}
    el.textContent=message;el.style.borderColor=ok?"#2f8151":"#b98c74";
    el.addEventListener("click",()=>el.remove(),{once:true});
  }
  async function api(action,body){
    const r=await fetch(endpoint+"?action="+encodeURIComponent(action),{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body),credentials:"same-origin"});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw Error(data.error||"The payment service is unavailable. Please try again.");
    return data;
  }
  function payload(){
    return {
      items:P.filter(p=>Number(cart[p[4]])>0).map(p=>({id:p[4],quantity:Math.floor(Number(cart[p[4]]))})),
      customer:{
        name:get("loftCheckoutName").value.trim(),
        phone:get("loftCheckoutPhone").value.trim(),
        email:get("loftCheckoutEmail").value.trim(),
        notes:get("loftCheckoutNotes").value.trim()
      },
      address:{
        street:get("styleloftStreet").value.trim(),
        suburb:get("styleloftSuburb").value.trim(),
        city:get("styleloftCity").value.trim(),
        province:get("styleloftProvince").value,
        postalCode:get("styleloftPostcode").value.trim()
      }
    };
  }
  function enable(){
    const form=get("loftCheckoutForm");if(!form)return;
    const intro=document.querySelector("#loftCheckoutOverlay .loft-checkout-card > p");
    if(intro)intro.textContent="Enter your delivery address to get a Courier Guy quote before paying securely with Paystack.";
    const note=document.querySelector("#loftCheckoutOverlay .loft-checkout-note");
    if(note)note.textContent="Shipping is calculated by The Courier Guy. Prices shown here are estimates until the live quote is confirmed. Orders remain subject to merchant stock review.";
    const email=get("loftCheckoutEmail");email.required=true;
    const el=form.querySelector(".loft-checkout-grid");
    el.insertAdjacentHTML("beforeend",
      '<label class="full">Street address *<input id="styleloftStreet" autocomplete="address-line1" required maxlength="160"></label>'+
      '<label>Suburb *<input id="styleloftSuburb" required maxlength="80"></label>'+
      '<label>City *<input id="styleloftCity" autocomplete="address-level2" required maxlength="80"></label>'+
      '<label>Province *<select id="styleloftProvince" required style="width:100%;padding:12px;border:1px solid #dcc9b9;background:white">'+
      '<option value="">Select a province</option>'+
      ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'].map(s=>'<option>'+s+'</option>').join('')+
      '</select></label>'+
      '<label>Postal code *<input id="styleloftPostcode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>');
    const button=form.querySelector('button[type="submit"]');
    if(button)button.textContent="Get delivery quote & pay with Paystack →";
    const drawerNote=document.querySelector("#cartRows + .total + p");
    if(drawerNote)drawerNote.textContent="Delivery is quoted at checkout. Payments are processed securely with Paystack.";
    const feature=document.querySelector(".features .feature:nth-child(3) span");
    if(feature)feature.textContent="Paystack checkout · Subject to availability";
    form.addEventListener("submit",async function(e){
      e.preventDefault();e.stopImmediatePropagation();
      if(!form.reportValidity())return;
      const request=payload();
      if(!request.items.length){notice("Please add items to your bag first.");return;}
      const original=button?.textContent;
      if(button){button.disabled=true;button.textContent="Getting live courier quote…";}
      try{
        const quote=await api("quote",request);
        const confirmed=window.confirm(
          "Style Loft Boutique — please review the total before payment.\n\n"+
          "Items: "+currency(quote.subtotal)+"\n"+
          "The Courier Guy ("+quote.service+"): "+currency(quote.delivery)+"\n"+
          "Total to pay: "+currency(quote.total)+"\n\n"+
          "Continue to secure Paystack payment?");
        if(!confirmed)return;
        if(button)button.textContent="Creating secure payment…";
        const session=await api("pay",{...request,confirmedTotalCents:Math.round(quote.total*100)});
        if(!/^https:\/\/([a-z0-9-]+\.)*paystack\.com\//i.test(session.authorization_url))
          throw Error("The payment service returned an invalid checkout address.");
        window.location.assign(session.authorization_url);
      }catch(error){notice(error.message||"Unable to start checkout. No payment was taken.");}
      finally{if(button){button.disabled=false;button.textContent=original;}}
    },true);
  }
  async function verifyReturn(){
    const params=new URLSearchParams(location.search);
    if(params.get("styleloft_payment")!=="return")return;
    const ref=params.get("reference")||params.get("trxref")||"";
    if(!/^[A-Za-z0-9._-]{6,120}$/.test(ref)){notice("A Paystack reference was not received. Please check your receipt before retrying.");return;}
    notice("Checking the payment with Paystack. Please do not submit a second payment.");
    try{
      const r=await fetch(endpoint+"?action=verify&reference="+encodeURIComponent(ref),{cache:"no-store"});
      const data=await r.json();
      if(r.ok&&data.paid){
        cart={};persist();render();
        notice("✓ Payment verified: "+currency(data.amount)+". Reference: "+ref+". Style Loft will confirm stock and shipping separately.",true);
      }else notice("Payment has not been verified. Reference: "+ref+". Do not pay again until you have checked its status.");
    }catch{notice("Unable to verify payment right now. Save reference "+ref+" and contact Style Loft before trying again.");}
    finally{history.replaceState(null,"",location.pathname+location.hash);}
  }
  verifyReturn();
  fetch(endpoint+"?action=status",{cache:"no-store"})
    .then(r=>r.ok?r.json():null).then(s=>{if(s?.enabled)enable()}).catch(()=>{});
})();