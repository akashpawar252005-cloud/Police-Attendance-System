(() => {
  "use strict";
  const DB_KEY = "policePortalDemo_v1";
  const SESSION_KEY = "policePortalSession_v1";
  const $ = (id) => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0,10);
  const nowTime = () => new Date().toTimeString().slice(0,5);
  const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2,7));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function readDB() {
    try { const d = JSON.parse(localStorage.getItem(DB_KEY)); if (d && Array.isArray(d.officers)) return d; } catch(e) {}
    const demo = {officers:[{id:"demo-admin",name:"Demo Administrator",badge:"ADM-001",email:"admin@demo.local",role:"Administrator",password:"demo123"}],attendance:[],shifts:[],duties:[]};
    localStorage.setItem(DB_KEY, JSON.stringify(demo)); return demo;
  }
  function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  function session() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch(e) { return null; } }
  function currentOfficer() { const s=session(); const db=readDB(); return s ? db.officers.find(o=>o.id===s.id) || null : null; }
  function initials(name) { return String(name||"OP").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
  function notify(message) {
    const old = document.querySelector(".toast"); if(old) old.remove();
    const el=document.createElement("div"); el.className="toast"; el.textContent=message; document.body.appendChild(el);
    setTimeout(()=>el.remove(),3000);
  }
  function requireLogin() {
    if (!currentOfficer() && !["index.html","register.html",""].includes(location.pathname.split("/").pop())) { location.href="index.html"; return false; }
    return true;
  }
  function shell() {
    const mount=$("appShell"); if(!mount) return;
    const user=currentOfficer(); if(!user){location.href="index.html";return;}
    const current=location.pathname.split("/").pop();
    const nav=[["dashboard.html","⌂","Dashboard"],["attendance.html","◷","Attendance"],["schedule.html","▦","Schedule"],["duties.html","♙","Duty allocation"],["reports.html","▤","Reports"],["profile.html","◎","My profile"]];
    mount.innerHTML=`<aside class="sidebar"><a class="brand" href="dashboard.html"><span class="brand-mark">✦</span><span><b>POLICE PORTAL</b><small>Attendance & Schedule</small></span><span class="top-mobile">● ONLINE</span></a><div class="nav-label">WORKSPACE</div><nav class="nav-list">${nav.map(n=>`<a class="nav-link ${current===n[0]?"active":""}" href="${n[0]}"><span class="nav-ico">${n[1]}</span>${n[2]}</a>`).join("")}</nav><div class="side-bottom"><div class="side-user"><span class="avatar">${esc(initials(user.name))}</span><span><b>${esc(user.name)}</b><small>${esc(user.role)} · ${esc(user.badge)}</small></span></div><a class="logout" href="index.html" id="logoutBtn">↪ &nbsp; Sign out</a></div></aside>`;
    $("logoutBtn").addEventListener("click",()=>sessionStorage.removeItem(SESSION_KEY));
  }
  function officerName(db,id) { return db.officers.find(o=>o.id===id)?.name || "Unknown officer"; }
  function populateOfficerSelect(id, selected) {
    const el=$(id); if(!el) return; const db=readDB();
    el.innerHTML=db.officers.map(o=>`<option value="${esc(o.id)}">${esc(o.name)} · ${esc(o.badge)}</option>`).join("");
    if(selected && db.officers.some(o=>o.id===selected)) el.value=selected;
  }
  function emptyRow(cols,msg="No records yet. Add your first entry above.") { return `<tr><td class="empty" colspan="${cols}">${esc(msg)}</td></tr>`; }
  function deleteButton(type,id) { return `<button class="btn danger" data-delete="${type}" data-id="${esc(id)}" type="button">Delete</button>`; }
  function handleDelete() {
    document.addEventListener("click",e=>{
      const b=e.target.closest("[data-delete]"); if(!b)return;
      const db=readDB(), type=b.dataset.delete, id=b.dataset.id;
      if(!confirm("Delete this record?"))return;
      if(["attendance","shifts","duties"].includes(type)) db[type]=db[type].filter(x=>x.id!==id);
      saveDB(db); renderAll(); notify("Record deleted.");
    });
  }
  function renderDashboard() {
    const db=readDB(), date=today();
    if($("welcomeTitle")) $("welcomeTitle").textContent=`Good ${new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, ${currentOfficer()?.name.split(" ")[0]||"Officer"}.`;
    if($("statOfficers")) $("statOfficers").textContent=db.officers.length;
    if($("statPresent")) $("statPresent").textContent=new Set(db.attendance.filter(a=>a.date===date).map(a=>a.officerId)).size;
    if($("statDuties")) $("statDuties").textContent=db.duties.filter(d=>d.date>=date).length;
    if($("statShifts")) $("statShifts").textContent=db.shifts.filter(s=>s.date>=date).length;
    if($("recentAttendance")) $("recentAttendance").innerHTML=db.attendance.slice().sort((a,b)=>(b.date+b.inTime).localeCompare(a.date+a.inTime)).slice(0,5).map(a=>`<tr><td><div class="person-cell"><span class="mini-avatar">${esc(initials(officerName(db,a.officerId)))}</span>${esc(officerName(db,a.officerId))}</div></td><td>${esc(a.date)}</td><td>${esc(a.inTime)}</td><td><span class="status ${a.outTime?"off":""}">${a.outTime?"Completed":"Present"}</span></td></tr>`).join("")||emptyRow(4,"No attendance recorded yet.");
  }
  function renderAttendance() {
    const db=readDB(); populateOfficerSelect("attOfficer",currentOfficer()?.id);
    if($("todayLabel")) $("todayLabel").textContent=today();
    if($("attDate")&&!$("attDate").value) $("attDate").value=today();
    if($("attIn")&&!$("attIn").value) $("attIn").value=nowTime();
    const q=($("attendanceSearch")?.value||"").toLowerCase();
    if($("attendanceRows")) $("attendanceRows").innerHTML=db.attendance.slice().sort((a,b)=>(b.date+b.inTime).localeCompare(a.date+a.inTime)).filter(a=>(officerName(db,a.officerId)+" "+a.date+" "+a.notes).toLowerCase().includes(q)).map(a=>`<tr><td>${esc(officerName(db,a.officerId))}</td><td>${esc(a.date)}</td><td>${esc(a.inTime)}</td><td>${esc(a.outTime||"—")}</td><td>${esc(a.notes||"—")}</td><td>${deleteButton("attendance",a.id)}</td></tr>`).join("")||emptyRow(6,"No matching attendance entries.");
  }
  function renderShifts() {
    const db=readDB(); populateOfficerSelect("shiftOfficer",currentOfficer()?.id);
    if($("shiftDate")&&!$("shiftDate").value) $("shiftDate").value=today();
    const q=($("shiftSearch")?.value||"").toLowerCase();
    if($("shiftRows")) $("shiftRows").innerHTML=db.shifts.slice().sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).filter(s=>(officerName(db,s.officerId)+" "+s.name+" "+s.location+" "+s.date).toLowerCase().includes(q)).map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(officerName(db,s.officerId))}</td><td>${esc(s.name)}</td><td>${esc(s.start)}–${esc(s.end)}</td><td>${esc(s.location)}</td><td>${deleteButton("shifts",s.id)}</td></tr>`).join("")||emptyRow(6,"No shifts scheduled yet.");
  }
  function renderDuties() {
    const db=readDB(); populateOfficerSelect("dutyOfficer",currentOfficer()?.id);
    if($("dutyDate")&&!$("dutyDate").value) $("dutyDate").value=today();
    const q=($("dutySearch")?.value||"").toLowerCase();
    if($("dutyRows")) $("dutyRows").innerHTML=db.duties.slice().sort((a,b)=>a.date.localeCompare(b.date)).filter(d=>(officerName(db,d.officerId)+" "+d.type+" "+d.location+" "+d.notes+" "+d.date).toLowerCase().includes(q)).map(d=>`<tr><td>${esc(d.date)}</td><td>${esc(officerName(db,d.officerId))}</td><td>${esc(d.type)}</td><td>${esc(d.location)}</td><td>${esc(d.notes||"—")}</td><td>${deleteButton("duties",d.id)}</td></tr>`).join("")||emptyRow(6,"No duty assignments yet.");
  }
  function renderReports() {
    const db=readDB(); [["reportAttendance",db.attendance.length],["reportShifts",db.shifts.length],["reportDuties",db.duties.length],["reportOfficers",db.officers.length]].forEach(([id,n])=>{if($(id))$(id).textContent=n;});
  }
  function renderProfile() {
    const o=currentOfficer(); if(!o)return;
    if($("profileAvatar")) $("profileAvatar").textContent=initials(o.name);
    if($("profileHeading")) $("profileHeading").textContent=o.name;
    if($("profileSub")) $("profileSub").textContent=`${o.role} · ${o.badge} · ${o.email}`;
    if($("profileName")) $("profileName").value=o.name;
    if($("profileBadge")) $("profileBadge").value=o.badge;
    if($("profileEmail")) $("profileEmail").value=o.email;
    if($("profileRole")) $("profileRole").value=o.role;
  }
  function renderAll(){renderDashboard();renderAttendance();renderShifts();renderDuties();renderReports();renderProfile();}
  function bindForms() {
    $("loginForm")?.addEventListener("submit",e=>{
      e.preventDefault();const email=$("loginEmail").value.trim().toLowerCase(),pass=$("loginPassword").value,db=readDB();
      const o=db.officers.find(x=>x.email.toLowerCase()===email&&x.password===pass);
      if(!o){notify("Sign-in failed. Check your details or create a demo account.");return;}
      sessionStorage.setItem(SESSION_KEY,JSON.stringify({id:o.id}));location.href="dashboard.html";
    });
    $("registerForm")?.addEventListener("submit",e=>{
      e.preventDefault();const db=readDB(),email=$("regEmail").value.trim().toLowerCase();
      if(db.officers.some(o=>o.email.toLowerCase()===email)){notify("An account with this email already exists.");return;}
      const o={id:uid(),name:$("regName").value.trim(),badge:$("regBadge").value.trim(),email,role:$("regRole").value,password:$("regPassword").value};
      db.officers.push(o);saveDB(db);sessionStorage.setItem(SESSION_KEY,JSON.stringify({id:o.id}));location.href="dashboard.html";
    });
    $("attendanceForm")?.addEventListener("submit",e=>{
      e.preventDefault();const db=readDB(),date=$("attDate").value,officerId=$("attOfficer").value,inTime=$("attIn").value,outTime=$("attOut").value;
      if(outTime&&outTime<inTime&&date===today()){notify("Check-out time appears earlier than check-in. Please verify.");return;}
      db.attendance.push({id:uid(),officerId,date,inTime,outTime,notes:$("attNotes").value.trim()});saveDB(db);$("attNotes").value="";$("attOut").value="";renderAll();notify("Attendance saved.");
    });
    $("scheduleForm")?.addEventListener("submit",e=>{
      e.preventDefault();const db=readDB(),s={id:uid(),officerId:$("shiftOfficer").value,name:$("shiftName").value.trim(),date:$("shiftDate").value,location:$("shiftLocation").value.trim(),start:$("shiftStart").value,end:$("shiftEnd").value};
      if(s.end===s.start){notify("Start and end time cannot be the same.");return;}
      const overlap=db.shifts.some(x=>x.officerId===s.officerId&&x.date===s.date&&s.start<x.end&&s.end>x.start&&((s.start<x.end&&s.end>x.start)));
      if(overlap&&confirm("This officer may have an overlapping shift. Add it anyway?")===false)return;
      db.shifts.push(s);saveDB(db);e.target.reset();renderAll();notify("Shift added to schedule.");
    });
    $("dutyForm")?.addEventListener("submit",e=>{
      e.preventDefault();const db=readDB();db.duties.push({id:uid(),officerId:$("dutyOfficer").value,type:$("dutyType").value.trim(),date:$("dutyDate").value,location:$("dutyLocation").value.trim(),notes:$("dutyNotes").value.trim()});saveDB(db);e.target.reset();renderAll();notify("Duty assignment saved.");
    });
    $("profileForm")?.addEventListener("submit",e=>{
      e.preventDefault();const db=readDB(),o=currentOfficer();if(!o)return;
      const email=$("profileEmail").value.trim().toLowerCase();
      if(db.officers.some(x=>x.id!==o.id&&x.email.toLowerCase()===email)){notify("That email is already in use.");return;}
      o.name=$("profileName").value.trim();o.badge=$("profileBadge").value.trim();o.email=email;o.role=$("profileRole").value;saveDB(db);renderAll();notify("Profile updated.");
    });
    ["attendanceSearch","shiftSearch","dutySearch"].forEach(id=>$(id)?.addEventListener("input",()=>{renderAttendance();renderShifts();renderDuties();}));
    document.querySelectorAll("[data-export]").forEach(b=>b.addEventListener("click",()=>exportCSV(b.dataset.export)));
    $("resetData")?.addEventListener("click",()=>{
      if(!confirm("Reset all demo accounts, attendance, shifts and duties in this browser?"))return;
      localStorage.removeItem(DB_KEY);sessionStorage.removeItem(SESSION_KEY);location.href="index.html";
    });
  }
  function csvEscape(v){return '"'+String(v??"").replace(/"/g,'""')+'"';}
  function exportCSV(type) {
    const db=readDB();let headers=[],rows=[],filename=type+".csv";
    if(type==="attendance"){headers=["Officer","Badge","Date","Check-in","Check-out","Notes"];rows=db.attendance.map(a=>{const o=db.officers.find(x=>x.id===a.officerId)||{};return[o.name,o.badge,a.date,a.inTime,a.outTime,a.notes];});}
    if(type==="shifts"){headers=["Officer","Badge","Date","Shift","Start","End","Location"];rows=db.shifts.map(s=>{const o=db.officers.find(x=>x.id===s.officerId)||{};return[o.name,o.badge,s.date,s.name,s.start,s.end,s.location];});}
    if(type==="duties"){headers=["Officer","Badge","Date","Duty","Location","Instructions"];rows=db.duties.map(d=>{const o=db.officers.find(x=>x.id===d.officerId)||{};return[o.name,o.badge,d.date,d.type,d.location,d.notes];});}
    if(type==="officers"){headers=["Name","Badge","Email","Role"];rows=db.officers.map(o=>[o.name,o.badge,o.email,o.role]);}
    const content=[headers,...rows].map(r=>r.map(csvEscape).join(",")).join("\r\n");
    const blob=new Blob(["\ufeff"+content],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);notify("CSV export downloaded.");
  }
  if(location.pathname.endsWith("index.html")||location.pathname.endsWith("register.html")||location.pathname==="/") {
    if(currentOfficer()&&location.pathname.endsWith("index.html")) location.href="dashboard.html";
  } else {
    if(!requireLogin()) return;
    shell();handleDelete();bindForms();renderAll();
  }
  if($("loginForm")||$("registerForm")) bindForms();
})();