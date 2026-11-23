// Server-side StyleLoft checkout integration. No API keys belong in browser code.
// The feature remains disabled until all deployment variables and merchant approval are set.
const crypto = require("node:crypto");
async function getLiveProducts() {
 const url=(process.env.STYLELOFT_SUPABASE_URL||"").replace(/\/$/,"");
 const key=process.env.STYLELOFT_SUPABASE_PUBLISHABLE_KEY;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key)
   throw Error("The product catalogue is not configured. No payment has started.");
 let response;
 try{
   response=await fetch(url+"/rest/v1/styleloft_products?select=id,name,price,stock&active=eq.true",{
     headers:{"apikey":key,"Accept":"application/json"},signal:AbortSignal.timeout(8000),cache:"no-store"
   });
 }catch{throw Error("Unable to contact the current product catalogue. No payment has started.");}
 if(!response.ok)throw Error("The product catalogue is unavailable. No payment has started.");
 const rows=await response.json();
 if(!Array.isArray(rows))throw Error("The product catalogue was unreadable.");
 const result=Object.create(null);
 for(const row of rows){
   const price=Number(row.price),stock=Number(row.stock);
   if(row.id && Number.isFinite(price) && price>=0 && Number.isSafeInteger(stock) && stock>=0)
     result[row.id]={name:row.name,price,stock};
 }
 return result;
}

const json = (res, code, body) => { res.setHeader("Cache-Control","no-store"); res.setHeader("Content-Type","application/json; charset=utf-8"); return res.status(code).json(body); };
const str = (v,max=200) => typeof v==="string" ? v.trim().slice(0,max) : "";
// Live checkout stays off until merchant, courier and parcel settings are complete.
// Keep credentials in encrypted Vercel environment variables, never in source control.
const validCollectionAddress = () => {
  try {
    const a = JSON.parse(process.env.COURIER_COLLECTION_ADDRESS || "");
    return Boolean(a && ["street_address","city","country","code"].every(k => typeof a[k] === "string" && a[k].trim()));
  } catch { return false; }
};
const validParcel = () => ["COURIER_PARCEL_LENGTH_CM","COURIER_PARCEL_WIDTH_CM","COURIER_PARCEL_HEIGHT_CM","COURIER_PARCEL_WEIGHT_KG"]
  .every(k => process.env[k] && Number.isFinite(Number(process.env[k])) && Number(process.env[k]) > 0);
const ready = () => Boolean(
  process.env.STYLELOFT_ENABLE_CHECKOUT === "true" &&
  /^sk_(live|test)_[A-Za-z0-9]+$/.test(process.env.PAYSTACK_SECRET_KEY || "") &&
  process.env.COURIER_GUY_API_KEY?.trim() &&
  process.env.COURIER_GUY_ACCOUNT_NUMBER?.trim() &&
  process.env.STYLELOFT_SUPABASE_URL &&
  process.env.STYLELOFT_SUPABASE_PUBLISHABLE_KEY &&
  validCollectionAddress() &&
  validParcel() &&
  /^https:\/\/[^/]+\/?$/.test(process.env.STYLELOFT_SITE_URL || "")
);
function cartFrom(body,products){
  if(!Array.isArray(body.items)||body.items.length<1||body.items.length>15) throw Error("Please add a valid product to your bag.");
  let quantities={},count=0;
  for(const row of body.items){
    if(!row||!Object.prototype.hasOwnProperty.call(products,row.id)||!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>10) throw Error("Your bag contains invalid products or quantities.");
    quantities[row.id]=(quantities[row.id]||0)+row.quantity;
    count+=row.quantity;
  }
  if(count>20||Object.values(quantities).some(q=>q>10)||Object.entries(quantities).some(([id,q])=>q>products[id].stock)) throw Error("Please reduce your bag to 20 items or fewer.");
  const items=Object.entries(quantities).map(([id,quantity])=>({id,name:products[id].name,quantity,unit_price:products[id].price}));
  const subtotal=items.reduce((sum,p)=>sum+p.quantity*p.unit_price,0);
  return {items,subtotal,count};
}
function addressFrom(body){
  const a=body.address||{};
  const address={
    street_address:str(a.street,160), local_area:str(a.suburb,80),
    city:str(a.city,80), zone:str(a.province,60), code:str(a.postalCode,12),
    country:"ZA", type:"residential"
  };
  if(!address.street_address||!address.local_area||!address.city||!address.zone||!/^[0-9]{4}$/.test(address.code)) throw Error("Enter a valid South African delivery street, suburb, city, province and four-digit postcode.");
  return address;
}
function customerFrom(body,required){
 const c=body.customer||{};
 const customer={name:str(c.name,120),email:str(c.email,160).toLowerCase(),phone:str(c.phone,35),notes:str(c.notes,350)};
 if(required && (!customer.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)||!customer.phone))throw Error("Full name, email and phone number are required for payment.");
 return customer;
}
async function courierQuote(address,items,subtotal,count){
 let origin;
 try {origin=JSON.parse(process.env.COURIER_COLLECTION_ADDRESS)}catch{throw Error("The shop's collection address has not been configured correctly.");}
 if(!origin||!origin.street_address||!origin.city||!origin.country||!origin.code)throw Error("The shop's collection address is incomplete.");
 // Product-specific dimensions/weights must be reviewed with the merchant before enabling live checkout.
 // These environment settings describe an actual packed parcel, not made-up per-item dimensions.
 const length=Number(process.env.COURIER_PARCEL_LENGTH_CM);
 const width=Number(process.env.COURIER_PARCEL_WIDTH_CM);
 const height=Number(process.env.COURIER_PARCEL_HEIGHT_CM);
 const weight=Number(process.env.COURIER_PARCEL_WEIGHT_KG);
 if(![length,width,height,weight].every(x=>Number.isFinite(x)&&x>0))throw Error("Courier parcel dimensions and weight need configuration.");
 const payload={provider_id:process.env.COURIER_GUY_ACCOUNT_NUMBER,
  collection_address:origin,delivery_address:address,parcels:[{
   parcel_description:"Style Loft boutique order",submitted_length_cm:length,
   submitted_width_cm:width,submitted_height_cm:height,submitted_weight_kg:weight,
   packaging:"parcel"
  }],declared_value:subtotal};
 let response;
 try{response=await fetch("https://api.portal.thecourierguy.co.za/v2/rates",{
   method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.COURIER_GUY_API_KEY},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(9000)
 });}catch{throw Error("The Courier Guy could not be reached. Please retry shortly.");}
 if(!response.ok)throw Error("The Courier Guy quote service is unavailable ("+response.status+"). No payment has been initiated.");
 let data;try{data=await response.json()}catch{throw Error("Courier Guy returned an unreadable quote.");}
 let rates=Array.isArray(data)?data:(Array.isArray(data.rates)?data.rates:(Array.isArray(data.data?.rates)?data.data.rates:[]));
 const available=rates.map(r=>{
   const amount=Number(r.rate??r.total??r.amount??r.price??r.total_price??r.total_amount);
   return {amount,service:str(r.service_level_name||r.service_level||r.name||r.service||"Courier delivery",80),id:String(r.service_level_id||r.id||"")};
 }).filter(r=>Number.isFinite(r.amount)&&r.amount>0&&r.amount<10000).sort((a,b)=>a.amount-b.amount);
 if(!available.length)throw Error("No valid Courier Guy delivery quote is available for this address. No payment has been initiated.");
 return {delivery:Math.round(available[0].amount*100)/100,service:available[0].service,service_id:available[0].id};
}
async function paystack(path,options={}){
 let response;
 try{response=await fetch("https://api.paystack.co"+path,{
  ...options,headers:{"Authorization":"Bearer "+process.env.PAYSTACK_SECRET_KEY,"Content-Type":"application/json"},
  signal:AbortSignal.timeout(10000)
 });}catch{throw Error("Paystack is temporarily unavailable. No payment has been confirmed.");}
 let payload;try{payload=await response.json()}catch{throw Error("Paystack sent an unreadable response.");}
 if(!response.ok||!payload.status)throw Error("Paystack could not process the request. Please try again.");
 return payload.data;
}
module.exports = async function handler(req,res){
 if(req.method==="OPTIONS"){res.setHeader("Allow","GET, POST, OPTIONS");return res.status(204).end();}
 const action=str(req.query.action,20);
 if(req.method==="GET"&&action==="status")return json(res,200,{enabled:ready(),courier:"The Courier Guy",payment:"Paystack",currency:"ZAR"});
 if(!ready())return json(res,503,{error:"Online checkout is being configured. Please use the existing order enquiry option."});
 try{
  if(req.method==="GET"&&action==="verify"){
   const ref=str(req.query.reference,120);
   if(!/^[A-Za-z0-9._-]{6,120}$/.test(ref))return json(res,400,{error:"Invalid payment reference."});
   const data=await paystack("/transaction/verify/"+encodeURIComponent(ref));
   const meta=data.metadata||{};
   const valid=meta.styleloft_order===true&&data.currency==="ZAR"&&
     Number.isSafeInteger(data.amount)&&data.amount===Number(meta.expected_amount_cents);
   return json(res,200,{paid:valid&&data.status==="success",
     status:valid?data.status:"unverified",reference:ref,
     amount:valid?data.amount/100:null,message:valid&&data.status==="success"?
     "Payment verified. Keep your reference; Style Loft will confirm dispatch separately.":
     "Payment is not verified. Do not treat this as a paid order."});
  }
  if(req.method!=="POST"||!["quote","pay"].includes(action))return json(res,405,{error:"Method or action not supported."});
  if(Number(req.headers["content-length"]||0)>15000)return json(res,413,{error:"Request too large."});
  const body=typeof req.body==="object"&&req.body!==null?req.body:{};
  const liveProducts=await getLiveProducts();
  const {items,subtotal,count}=cartFrom(body,liveProducts);
  const address=addressFrom(body);
  const quote=await courierQuote(address,items,subtotal,count);
  const total=Math.round((subtotal+quote.delivery)*100);
  if(action==="quote")return json(res,200,{subtotal,delivery:quote.delivery,total:total/100,service:quote.service,currency:"ZAR"});
  const customer=customerFrom(body,true);
  // Refuse an amount changed since the buyer reviewed the courier quote.
  if(!Number.isSafeInteger(body.confirmedTotalCents)||body.confirmedTotalCents!==total)
    return json(res,409,{error:"The courier quote has changed. Review the updated delivery fee before paying.",subtotal,delivery:quote.delivery,total:total/100});
  const metadata={styleloft_order:true,expected_amount_cents:total,
    products:items,shipping:{...address,service:quote.service,fee:quote.delivery},
    customer,created_at:new Date().toISOString(),fulfilment:"manual_review_required"};
  const callback=process.env.STYLELOFT_SITE_URL.replace(/\/$/,"")+"/?styleloft_payment=return";
  const data=await paystack("/transaction/initialize",{method:"POST",body:JSON.stringify({
    email:customer.email,amount:total,currency:"ZAR",callback_url:callback,metadata
  })});
  const url=str(data.authorization_url,500);
  if(!/^https:\/\/([a-z0-9-]+\.)*paystack\.com\//i.test(url))throw Error("Payment provider did not return an approved checkout URL.");
  return json(res,200,{authorization_url:url,reference:data.reference});
 }catch(err){return json(res,err?.message?.includes("Paystack")?502:400,{error:err instanceof Error?err.message:"Checkout could not be completed."});}
};