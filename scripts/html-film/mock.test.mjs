import test from 'node:test';
import assert from 'node:assert/strict';
import {installFixture} from './mock.js';
const setup=()=>{
 globalThis.window={};globalThis.location={href:'http://localhost:3127/'};
 const claim={employee:'Alex',amount:850,certificateId:null};
 installFixture({workspace:{tasks:[{id:'learning',status:'ready',claim}],documents:[]},certificate:{id:'certificate',pages:['Fictional demo certificate']},replyApproval:'exact-reply'});
 return {claim,post:p=>window.fetch('/api/action',{body:JSON.stringify(p)}),state:async()=>await (await window.fetch('/api/state')).json()};
};
test('capture blocks unrecognized and external fetches',async()=>{
 setup();assert.equal((await window.fetch('https://example.invalid/private')).status,400);
});
test('changed claim and duplicate submission fail without changing approval state',async()=>{
 const {claim,post,state}=setup();
 assert.equal((await post({action:'submit',approval:'changed'})).status,409);
 assert.equal((await state()).tasks[0].status,'ready');
 assert.equal((await post({action:'submit',approval:JSON.stringify(claim)})).status,200);
 assert.equal((await state()).tasks[0].status,'waiting');
 assert.equal((await post({action:'submit',approval:JSON.stringify(claim)})).status,409);
});
test('certificate reply requires its exact reviewed payload and approval remains unpaid',async()=>{
 const {claim,post,state}=setup();await post({action:'submit',approval:JSON.stringify(claim)});
 await post({action:'hr_request'});await post({action:'certificate'});
 assert.equal((await post({action:'send_certificate',approval:'changed'})).status,409);
 assert.equal((await post({action:'send_certificate',approval:'exact-reply'})).status,200);
 await post({action:'hr_approve'});const t=(await state()).tasks[0];
 assert.equal(t.status,'approved');assert.match(t.nextAction,/unpaid/);
});
