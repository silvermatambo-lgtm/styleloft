// Public StyleLoft product feed; RLS exposes published products only.
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
 const url=(process.env.STYLELOFT_SUPABASE_URL||"").replace(/\/$/,"");
 const key=process.env.STYLELOFT_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return res.status(503).json({error:"Catalogue not configured"});
 try{
  const r=await fetch(url+"/rest/v1/styleloft_products?select=id,name,description,category,price,stock,image_url,active,featured,sort_order&active=eq.true&order=sort_order.asc,created_at.desc",{
   headers:{"apikey":key,"Accept":"application/json"},signal:AbortSignal.timeout(8000),cache:"no-store"
  });
  if(!r.ok)return res.status(503).json({error:"Catalogue unavailable"});
  const data=await r.json();if(!Array.isArray(data))return res.status(503).json({error:"Unexpected catalogue response"});
  return res.status(200).json(data);
 }catch{return res.status(503).json({error:"Could not contact product catalogue"});}
};