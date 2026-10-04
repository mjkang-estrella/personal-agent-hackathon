// Injected only into the isolated recording browser; never into production.
export function installFixture({workspace,certificate,replyApproval}) {
 const w=structuredClone(workspace);
 const task=()=>w.tasks.find(t=>t.id==='learning');
 const json=(v)=>new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json'}});
 window.fetch=async (input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  if(url.pathname==='/api/state')return json(w);
  if(url.pathname==='/api/account')return json({user:null,configured:false,workspaces:[]});
  if(url.pathname==='/api/action'){
   const p=JSON.parse(init.body||'{}');const t=task();
   if(p.action==='submit'){
    if(t.status!=='ready'||p.approval!==JSON.stringify(t.claim))return new Response('{}',{status:409});
    t.status='waiting';t.nextAction='Submitted to test HR. Waiting for review; not approved.';
   }
   if(p.action==='hr_request'){
    t.status='needs_info';t.lastReply='Thanks, Alex. Please send the completion certificate for Product Strategy Fundamentals so we can finish reviewing your $850 reimbursement.';t.nextAction='Add the completion certificate and review your reply.';
   }
   if(p.action==='certificate'&&!w.documents.some(d=>d.id===certificate.id))w.documents.push(certificate);
   if(p.action==='send_certificate'){
    if(t.status!=='needs_info'||p.approval!==replyApproval)return new Response('{}',{status:409});
    t.claim.certificateId=certificate.id;t.status='waiting';t.nextAction='Certificate reply sent in this simulation. Waiting for HR review.';
   }
   if(p.action==='hr_approve'){
    t.status='approved';t.lastReply='Your $850 reimbursement has been approved. Payment has not been confirmed.';t.nextAction='Approved, unpaid. Await payment confirmation.';
   }
   return json(w);
  }
  if(url.pathname==='/api/chat'){
   const events=[{type:'start',messageId:'film-answer'},{type:'text-start',id:'answer'},{type:'text-delta',id:'answer',delta:'Northstar HR confirmed prior approval, $1,000 of remaining allowance, and no repayment obligation. Your receipt is $850. The completion certificate is still missing; HR permits submission with the receipt and can request it during review. Final reimbursement approval and payment are not confirmed.'},{type:'text-end',id:'answer'},{type:'finish'}];
   return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'}});
  }
  return new Response(JSON.stringify({error:'Unavailable in local film rehearsal'}),{status:400,headers:{'Content-Type':'application/json'}});
 };
}
