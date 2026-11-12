import assert from 'node:assert/strict';
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { memoryAdapter } from 'better-auth/adapters/memory';
const blocked=['/sign-in/email','/sign-up/email','/request-password-reset','/reset-password','/send-verification-email','/verify-email','/change-email'];
function realm(name){
 const db={user:[],session:[],account:[],verification:[]};
 return betterAuth({baseURL:'http://localhost:3000',basePath:'/auth/'+name,secret:'only-a-local-probe-secret-at-least-32-chars-'+name,database:memoryAdapter(db),emailAndPassword:{enabled:true,requireEmailVerification:false},advanced:{cookiePrefix:'probe-'+name},disabledPaths:blocked,plugins:[username()]});
}
const member=realm('member'),staff=realm('staff');
// Server API provisioning is trusted only; HTTP signup is disabled.
for(const [auth,id,password] of [[member,'12345678a','member-password'],[staff,'ana.coach','staff-password']]){
 await auth.api.signUpEmail({body:{name:'Ana',email:'ana@example.org',username:id,password}});
 const res=await auth.handler(new Request('http://localhost:3000'+auth.options.basePath+'/sign-in/username',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:id,password})}));
 assert.equal(res.status,200);const data=await res.json();assert.equal(data.user.email,'ana@example.org');assert.equal(data.user.emailVerified,false);
 for(const path of blocked){const r=await auth.handler(new Request('http://localhost:3000'+auth.options.basePath+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'ana@example.org',password})}));assert.equal(r.status,404,path);}
 console.log(id+': username login OK; real email retained and unverified; 7 HTTP paths blocked');
}
await assert.rejects(()=>member.api.signInUsername({body:{username:'12345678a',password:'staff-password'}}));
await assert.rejects(()=>staff.api.signInUsername({body:{username:'12345678a',password:'member-password'}}));
await assert.rejects(()=>member.api.signInUsername({body:{username:'ana@example.org',password:'member-password'}}));
await assert.rejects(()=>staff.api.signInUsername({body:{username:'ana@example.org',password:'staff-password'}}));
console.log('Email rejected as username in both realms.');
console.log('Independent credentials and realms OK. No email callbacks or transport configured.');
