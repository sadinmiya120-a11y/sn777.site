const fs = require("fs");
const esbuild = require("esbuild");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Client Heartbeat: 25s interval, visibilitychange, focus, presence endpoint ping
  const oldHeartbeat = 'R.useEffect(()=>{var ee;let E;const L=(ee=gt.currentUser)==null?void 0:ee.uid;return L&&(Es(We(Ie,"users",L),{lastActive:ac()}).catch(W=>console.warn("Heartbeat error:",W)),E=setInterval(()=>{var W;(W=gt.currentUser)!=null&&W.uid&&Es(We(Ie,"users",gt.currentUser.uid),{lastActive:ac()}).catch(ye=>console.warn("Heartbeat error:",ye))},9e5)),()=>clearInterval(E)},[(zn=gt.currentUser)==null?void 0:zn.uid]);';
  const newHeartbeat = 'R.useEffect(()=>{var ee;let E;const L=(ee=gt.currentUser)==null?void 0:ee.uid;if(L){const _sendHeartbeat=(uid,isOnline=true)=>{if(!uid)return;const now=Date.now();const uname=(ve&&(ve.username||ve.name))||"User";try{Ks(We(Ie,"users",uid),{lastActive:ac(),lastActiveTime:now,isOnline:!!isOnline},{merge:!0}).catch(()=>{})}catch(e){}try{fetch("/api/user-presence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid,username:uname,isOnline:!!isOnline,lastActiveTime:now}),keepalive:true}).catch(()=>{})}catch(e){}};_sendHeartbeat(L,true);E=setInterval(()=>{const u=gt.currentUser;if(u&&u.uid)_sendHeartbeat(u.uid,true)},25000);const onVis=()=>{if(document.visibilityState==="visible"){const u=gt.currentUser;if(u&&u.uid)_sendHeartbeat(u.uid,true)}};const onFoc=()=>{const u=gt.currentUser;if(u&&u.uid)_sendHeartbeat(u.uid,true)};window.addEventListener("focus",onFoc);document.addEventListener("visibilitychange",onVis);return()=>{clearInterval(E);window.removeEventListener("focus",onFoc);document.removeEventListener("visibilitychange",onVis)}}},[(zn=gt.currentUser)==null?void 0:zn.uid]);';
  if (code.includes(oldHeartbeat)) {
    code = code.replace(oldHeartbeat, newHeartbeat);
    modified = true;
    console.log(`[1. Heartbeat 25s & Presence] Patched in ${file}`);
  }

  // 2. Initial login active state
  const oldLoginInit = 'const Le={deviceId:ee,deviceInfo:Te,lastActive:ac()};fetch("https://api.ipify.org?format=json").then(qe=>qe.json()).then(qe=>{qe.ip&&Es(W,{lastIp:qe.ip})}).catch(()=>{}),Es(W,Le).catch(()=>{});';
  const newLoginInit = 'const Le={deviceId:ee,deviceInfo:Te,lastActive:ac(),lastActiveTime:Date.now(),isOnline:true};fetch("https://api.ipify.org?format=json").then(qe=>qe.json()).then(qe=>{qe.ip&&Es(W,{lastIp:qe.ip})}).catch(()=>{}),Es(W,Le).catch(()=>{}),fetch("/api/user-presence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:L.uid,deviceId:ee,deviceInfo:Te,isOnline:true,lastActiveTime:Date.now()}),keepalive:true}).catch(()=>{});';
  if (code.includes(oldLoginInit)) {
    code = code.replace(oldLoginInit, newLoginInit);
    modified = true;
    console.log(`[2. Login Initial Active] Patched in ${file}`);
  }

  // 3. Admin checkOnline helper & st calculation (in comma-separated variable list)
  const oldAdminSt = 'Ye=Date.now(),Ce=300*1e3,st=N.filter(V=>{if(!V.lastActive)return!1;const be=V.lastActive.toDate?V.lastActive.toDate().getTime():new Date(V.lastActive).getTime();return Ye-be<Ce}),';
  const newAdminSt = 'checkOnline=V=>{if(!V)return!1;const now=Date.now();let ts=V.lastActiveTime||0;if(!ts&&V.lastActive){ts=V.lastActive.toDate?V.lastActive.toDate().getTime():new Date(V.lastActive).getTime()}if(!ts||isNaN(ts))return!1;if(V.isOnline===false&&(now-ts>60000))return!1;return(now-ts)<180000},Ye=Date.now(),Ce=180*1e3,st=N.filter(checkOnline),';
  if (code.includes(oldAdminSt)) {
    code = code.replace(oldAdminSt, newAdminSt);
    modified = true;
    console.log(`[3. Admin checkOnline & st] Patched in ${file}`);
  }

  // 4. Admin sync all users polling (in comma expression)
  const oldAdminPoll = 'setInterval(()=>{fetch("/api/admin/all-deposits")';
  const newAdminPoll = 'fetch("/api/admin/all-users").then(r=>r.json()).then(res=>{if(res&&res.users&&res.users.length>0){P(prev=>{const map=new Map();(prev||[]).forEach(u=>map.set(u.id||u.uid,u));res.users.forEach(u=>{const ex=map.get(u.id||u.uid);map.set(u.id||u.uid,{...ex,...u})});return Array.from(map.values()).sort((a,b)=>{const tA=a.registrationDate?new Date(a.registrationDate).getTime():0;const tB=b.registrationDate?new Date(b.registrationDate).getTime():0;return tB-tA})})}}).catch(()=>{}),setInterval(()=>{fetch("/api/admin/all-users").then(r=>r.json()).then(res=>{if(res&&res.users&&res.users.length>0){P(prev=>{const map=new Map();(prev||[]).forEach(u=>map.set(u.id||u.uid,u));res.users.forEach(u=>{const ex=map.get(u.id||u.uid);map.set(u.id||u.uid,{...ex,...u})});return Array.from(map.values())})}}).catch(()=>{}),fetch("/api/admin/all-deposits")';
  if (code.includes(oldAdminPoll)) {
    code = code.replace(oldAdminPoll, newAdminPoll);
    modified = true;
    console.log(`[4. Admin all-users live sync] Patched in ${file}`);
  }

  // 5. Admin users tab filter buttons (All / Online / Multi)
  const oldUserButtons = 'o.jsxs("div",{className:"flex gap-2",children:[o.jsxs("button",{onClick:()=>a(!1),className:`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border ${s?"bg-white text-slate-500 border-slate-100 hover:border-slate-200":"bg-[#0f172a] text-white border-[#0f172a] shadow-md shadow-slate-900/10"}`,children:["সকল ইউজার (",N.length,")"]}),o.jsxs("button",{onClick:()=>a(!0),className:`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${s?"bg-red-600 text-white border-red-600 shadow-md shadow-red-600/10":"bg-white text-red-500 border-red-100 hover:border-red-200"}`,children:["⚠️ শুধু মাল্টি-অ্যাকাউন্ট (",N.filter(V=>V.deviceId&&N.some(be=>be.deviceId===V.deviceId&&be.id!==V.id)).length,")"]})]}),';
  const newUserButtons = 'o.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[o.jsxs("button",{onClick:()=>a(!1),className:`py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border text-center ${(!s||s==="all")?"bg-[#0f172a] text-white border-[#0f172a] shadow-md shadow-slate-900/10":"bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`,children:["সকল (",N.length,")"]}),o.jsxs("button",{onClick:()=>a("online"),className:`py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 ${s==="online"?"bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10":"bg-white text-emerald-600 border-emerald-100 hover:border-emerald-200"}`,children:[o.jsx("span",{className:"w-2 h-2 rounded-full bg-emerald-500 animate-pulse"}),"অনলাইন (",st.length,")"]}),o.jsxs("button",{onClick:()=>a(!0),className:`py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 ${(s===!0||s==="multi")?"bg-red-600 text-white border-red-600 shadow-md shadow-red-600/10":"bg-white text-red-500 border-red-100 hover:border-red-200"}`,children:["⚠️ মাল্টি (",N.filter(V=>V.deviceId&&N.some(be=>be.deviceId===V.deviceId&&be.id!==V.id)).length,")"]})]}),';
  if (code.includes(oldUserButtons)) {
    code = code.replace(oldUserButtons, newUserButtons);
    modified = true;
    console.log(`[5. Admin user filter buttons with Online tab] Patched in ${file}`);
  }

  // 6. Je filter definition supporting s === "online"
  const oldJeFilter = 'Je=N.filter(V=>{var je;if(!((((je=V.username)==null?void 0:je.toLowerCase())||"").includes(tt.toLowerCase())||(V.phone||"").includes(tt)||(V.id||"").includes(tt)))return!1;if(s){const ct=V.deviceId&&N.some(_e=>_e.deviceId===V.deviceId&&_e.id!==V.id),Ge=V.lastIp&&N.some(_e=>_e.lastIp===V.lastIp&&_e.id!==V.id);return!!(ct||Ge)}return!0});';
  const newJeFilter = 'Je=N.filter(V=>{var je;if(!((((je=V.username)==null?void 0:je.toLowerCase())||"").includes(tt.toLowerCase())||(V.phone||"").includes(tt)||(V.id||"").includes(tt)))return!1;if(s==="online")return checkOnline(V);if(s===!0||s==="multi"){const ct=V.deviceId&&N.some(_e=>_e.deviceId===V.deviceId&&_e.id!==V.id),Ge=V.lastIp&&N.some(_e=>_e.lastIp===V.lastIp&&_e.id!==V.id);return!!(ct||Ge)}return!0});';
  if (code.includes(oldJeFilter)) {
    code = code.replace(oldJeFilter, newJeFilter);
    modified = true;
    console.log(`[6. Je filter with online condition] Patched in ${file}`);
  }

  // 7. User card Online/Offline badge in Je.map
  const oldUserTitle = 'o.jsxs("h4",{className:"text-sm font-black text-slate-800 uppercase leading-none mb-1.5",children:[V.username||"Unknown",V.status==="disabled"&&o.jsx("span",{className:"ml-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full",children:"DISABLED"})]})';
  const newUserTitle = 'o.jsxs("h4",{className:"text-sm font-black text-slate-800 uppercase leading-none mb-1.5 flex items-center flex-wrap gap-1.5",children:[V.username||"Unknown",checkOnline(V)?o.jsxs("span",{className:"text-[9px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs tracking-wider",children:[o.jsx("span",{className:"w-1.5 h-1.5 bg-white rounded-full animate-ping"}),"ONLINE"]}):o.jsx("span",{className:"text-[9px] bg-slate-100 text-slate-400 font-bold px-1.5 py-0.5 rounded-full tracking-wider",children:"OFFLINE"}),V.status==="disabled"&&o.jsx("span",{className:"ml-1 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full",children:"DISABLED"})]})';
  if (code.includes(oldUserTitle)) {
    code = code.replace(oldUserTitle, newUserTitle);
    modified = true;
    console.log(`[7. User card Online badge] Patched in ${file}`);
  }

  // 8. User avatar Online green dot
  const oldUserAvatar = 'o.jsx("div",{className:"w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 uppercase font-black text-xs",children:((Ge=V.username)==null?void 0:Ge.slice(0,2))||"U"})';
  const newUserAvatar = 'o.jsxs("div",{className:"w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 uppercase font-black text-xs relative",children:[((Ge=V.username)==null?void 0:Ge.slice(0,2))||"U",checkOnline(V)&&o.jsx("span",{className:"absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs"})]})';
  if (code.includes(oldUserAvatar)) {
    code = code.replace(oldUserAvatar, newUserAvatar);
    modified = true;
    console.log(`[8. User avatar Online green dot] Patched in ${file}`);
  }

  // 9. User card detail online indicator line
  const oldUserDeps = 'o.jsxs("span",{className:"text-blue-500",children:["Deps: ৳",V.totalDeposited||0]}),';
  const newUserDeps = 'o.jsxs("span",{className:"text-blue-500",children:["Deps: ৳",V.totalDeposited||0]}),o.jsx("span",{className:checkOnline(V)?"text-emerald-600 font-bold flex items-center gap-1":"text-slate-400",children:checkOnline(V)?"🟢 বর্তমানে অনলাইনে আছে":("Last Active: "+(V.lastActive?(new Date(V.lastActive.toDate?V.lastActive.toDate():V.lastActive).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})):"N/A"))}),';
  if (code.includes(oldUserDeps)) {
    code = code.replace(oldUserDeps, newUserDeps);
    modified = true;
    console.log(`[9. User card online details] Patched in ${file}`);
  }

  // 10. Dashboard active users box: always visible with clean state
  const oldActiveBox = 'st.length>0&&o.jsxs("div",{className:"bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsxs("div",{children:[o.jsxs("h4",{className:"text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2",children:[o.jsx("span",{className:"w-2 h-2 bg-green-500 rounded-full animate-ping"}),"একটিভ ইউজার নেম"]}),o.jsx("p",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-widest",children:"বর্তমানে যারা অনলাইনে আছে"})]}),o.jsxs("div",{className:"px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase",children:[st.length," Online"]})]}),o.jsx("div",{className:"flex flex-wrap gap-2",children:st.map((V,be)=>o.jsxs("div",{className:"px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 flex items-center gap-2",children:[o.jsx("span",{className:"w-1.5 h-1.5 bg-green-400 rounded-full"}),V.username||"অজানা"]},`active-user-${V.id||"null"}-${be}`))})]})';
  const newActiveBox = 'o.jsxs("div",{className:"bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsxs("div",{children:[o.jsxs("h4",{className:"text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2",children:[o.jsx("span",{className:`w-2 h-2 rounded-full ${st.length>0?"bg-green-500 animate-ping":"bg-slate-300"}`}),"একটিভ ইউজার নেম"]}),o.jsx("p",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-widest",children:"বর্তমানে যারা অনলাইনে আছে"})]}),o.jsxs("div",{className:`px-3 py-1 rounded-full text-[10px] font-black uppercase ${st.length>0?"bg-green-50 text-green-600":"bg-slate-100 text-slate-500"}`,children:[st.length," Online"]})]}),st.length>0?o.jsx("div",{className:"flex flex-wrap gap-2",children:st.map((V,be)=>o.jsxs("div",{className:"px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-black uppercase text-emerald-800 flex items-center gap-2 shadow-xs",children:[o.jsx("span",{className:"w-2 h-2 bg-emerald-500 rounded-full animate-pulse"}),V.username||"অজানা",o.jsx("span",{className:"text-[8px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold",children:"অনলাইন"})]},`active-user-${V.id||"null"}-${be}`))}):o.jsx("p",{className:"text-xs text-slate-400 font-bold py-2 text-center",children:"বর্তমানে কোনো প্লেয়ার অনলাইনে নেই"})]})';
  if (code.includes(oldActiveBox)) {
    code = code.replace(oldActiveBox, newActiveBox);
    modified = true;
    console.log(`[10. Dashboard active users card] Patched in ${file}`);
  }

  if (modified) {
    try {
      esbuild.transformSync(code, { loader: "js" });
      fs.writeFileSync(file, code, "utf8");
      console.log(`[SAVED] ${file} successfully patched and validated.`);
    } catch (err) {
      console.error(`[SYNTAX ERROR] in ${file}:`, err.message);
    }
  } else {
    console.log(`[NO CHANGES] for ${file}`);
  }
});
