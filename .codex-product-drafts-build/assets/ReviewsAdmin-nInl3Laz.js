import{c as W,r as u,e as z,o as L,j as s,X as Y,p as B,T as G}from"./index-BTYU94-8.js";import{C as J}from"./clock-3-U9SIVS2U.js";import{C as T}from"./circle-check-DcrIMeUk.js";import{C as O}from"./circle-x-BO3447py.js";import{R as K}from"./refresh-ccw-BfkNKlns.js";import{L as V}from"./loader-circle-CG58ku8t.js";import{C as ee}from"./calendar-range-CQDUv3Lg.js";import{E as te}from"./external-link-Ctwc5CPA.js";const se=[["circle",{cx:"12",cy:"8",r:"5",key:"1hypcn"}],["path",{d:"M20 21a8 8 0 0 0-16 0",key:"rfgkzh"}]],ae=W("user-round",se);let re={data:""},ie=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||re},oe=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,le=/\/\*[^]*?\*\/|  +/g,P=/\n+/g,w=(e,t)=>{let a="",o="",n="";for(let l in e){let i=e[l];l[0]=="@"?l[1]=="i"?a=l+" "+i+";":o+=l[1]=="f"?w(i,l):l+"{"+w(i,l[1]=="k"?"":t)+"}":typeof i=="object"?o+=w(i,t?t.replace(/([^,])+/g,c=>l.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,d=>/&/.test(d)?d.replace(/&/g,c):c?c+" "+d:d)):l):i!=null&&(l=/^--/.test(l)?l:l.replace(/[A-Z]/g,"-$&").toLowerCase(),n+=w.p?w.p(l,i):l+":"+i+";")}return a+(t&&n?t+"{"+n+"}":n)+o},g={},H=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+H(e[a]);return t}return e},ne=(e,t,a,o,n)=>{let l=H(e),i=g[l]||(g[l]=(d=>{let x=0,f=11;for(;x<d.length;)f=101*f+d.charCodeAt(x++)>>>0;return"go"+f})(l));if(!g[i]){let d=l!==e?e:(x=>{let f,h,j=[{}];for(;f=oe.exec(x.replace(le,""));)f[4]?j.shift():f[3]?(h=f[3].replace(P," ").trim(),j.unshift(j[0][h]=j[0][h]||{})):j[0][f[1]]=f[2].replace(P," ").trim();return j[0]})(e);g[i]=w(n?{["@keyframes "+i]:d}:d,a?"":"."+i)}let c=a&&g.g?g.g:null;return a&&(g.g=g[i]),((d,x,f,h)=>{h?x.data=x.data.replace(h,d):x.data.indexOf(d)===-1&&(x.data=f?d+x.data:x.data+d)})(g[i],t,o,c),i},de=(e,t,a)=>e.reduce((o,n,l)=>{let i=t[l];if(i&&i.call){let c=i(a),d=c&&c.props&&c.props.className||/^go/.test(c)&&c;i=d?"."+d:c&&typeof c=="object"?c.props?"":w(c,""):c===!1?"":c}return o+n+(i??"")},"");function E(e){let t=this||{},a=e.call?e(t.p):e;return ne(a.unshift?a.raw?de(a,[].slice.call(arguments,1),t.p):a.reduce((o,n)=>Object.assign(o,n&&n.call?n(t.p):n),{}):a,ie(t.target),t.g,t.o,t.k)}let M,S,R;E.bind({g:1});let y=E.bind({k:1});function ce(e,t,a,o){w.p=t,M=e,S=a,R=o}function v(e,t){let a=this||{};return function(){let o=arguments;function n(l,i){let c=Object.assign({},l),d=c.className||n.className;a.p=Object.assign({theme:S&&S()},c),a.o=/ *go\d+/.test(d),c.className=E.apply(a,o)+(d?" "+d:"");let x=e;return e[0]&&(x=c.as||e,delete c.as),R&&x[0]&&R(c),M(x,c)}return n}}var me=e=>typeof e=="function",D=(e,t)=>me(e)?e(t):e,pe=(()=>{let e=0;return()=>(++e).toString()})(),xe=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),ue=20,U="default",q=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(i=>i.id===t.toast.id?{...i,...t.toast}:i)};case 2:let{toast:o}=t;return q(e,{type:e.toasts.find(i=>i.id===o.id)?1:0,toast:o});case 3:let{toastId:n}=t;return{...e,toasts:e.toasts.map(i=>i.id===n||n===void 0?{...i,dismissed:!0,visible:!1}:i)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(i=>i.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let l=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(i=>({...i,pauseDuration:i.pauseDuration+l}))}}},fe=[],be={toasts:[],pausedAt:void 0,settings:{toastLimit:ue}},_={},X=(e,t=U)=>{_[t]=q(_[t]||be,e),fe.forEach(([a,o])=>{a===t&&o(_[t])})},Z=e=>Object.keys(_).forEach(t=>X(e,t)),he=e=>Object.keys(_).find(t=>_[t].toasts.some(a=>a.id===e)),I=(e=U)=>t=>{X(t,e)},ge=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||pe()}),C=e=>(t,a)=>{let o=ge(t,e,a);return I(o.toasterId||he(o.id))({type:2,toast:o}),o.id},m=(e,t)=>C("blank")(e,t);m.error=C("error");m.success=C("success");m.loading=C("loading");m.custom=C("custom");m.dismiss=(e,t)=>{let a={type:3,toastId:e};t?I(t)(a):Z(a)};m.dismissAll=e=>m.dismiss(void 0,e);m.remove=(e,t)=>{let a={type:4,toastId:e};t?I(t)(a):Z(a)};m.removeAll=e=>m.remove(void 0,e);m.promise=(e,t,a)=>{let o=m.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(n=>{let l=t.success?D(t.success,n):void 0;return l?m.success(l,{id:o,...a,...a?.success}):m.dismiss(o),n}).catch(n=>{let l=t.error?D(t.error,n):void 0;l?m.error(l,{id:o,...a,...a?.error}):m.dismiss(o)}),e};var ye=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,je=y`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,we=y`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,ve=v("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${ye} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${je} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${we} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Ne=y`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,ke=v("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${Ne} 1s linear infinite;
`,_e=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,Ce=y`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,Ee=v("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${_e} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Ce} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,$e=v("div")`
  position: absolute;
`,ze=v("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Ae=y`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Se=v("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Ae} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,Re=({toast:e})=>{let{icon:t,type:a,iconTheme:o}=e;return t!==void 0?typeof t=="string"?u.createElement(Se,null,t):t:a==="blank"?null:u.createElement(ze,null,u.createElement(ke,{...o}),a!=="loading"&&u.createElement($e,null,a==="error"?u.createElement(ve,{...o}):u.createElement(Ee,{...o})))},De=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Ie=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Fe="0%{opacity:0;} 100%{opacity:1;}",Le="0%{opacity:1;} 100%{opacity:0;}",Te=v("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,Oe=v("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Pe=(e,t)=>{let a=e.includes("top")?1:-1,[o,n]=xe()?[Fe,Le]:[De(a),Ie(a)];return{animation:t?`${y(o)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${y(n)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}};u.memo(({toast:e,position:t,style:a,children:o})=>{let n=e.height?Pe(e.position||t||"top-center",e.visible):{opacity:0},l=u.createElement(Re,{toast:e}),i=u.createElement(Oe,{...e.ariaProps},D(e.message,e));return u.createElement(Te,{className:e.className,style:{...n,...a,...e.style}},typeof o=="function"?o({icon:l,message:i}):u.createElement(u.Fragment,null,l,i))});ce(u.createElement);E`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;const A="http://localhost:4000",Ye=({token:e})=>{const[t,a]=u.useState([]),[o,n]=u.useState(!0),l=localStorage.getItem("role"),[i,c]=u.useState(""),[d,x]=u.useState("");u.useEffect(()=>{e?f():(m.error("Admin not authenticated."),n(!1))},[e]);const f=async()=>{n(!0);try{const r=await z.get(`${A}/api/review/all`,{headers:{token:e}});r.data.success?a(r.data.reviews):m.error(r.data.message)}catch(r){console.error("Error fetching all reviews:",r),m.error("Failed to fetch reviews.")}finally{n(!1)}},h=async(r,p)=>{try{const b=await z.post(`${A}/api/review/update-status`,{reviewId:r,status:p},{headers:{token:e}});b.data.success?(m.success(b.data.message),a(N=>N.map(k=>k._id===r?{...k,status:p}:k))):m.error(b.data.message)}catch(b){console.error("Error updating review status:",b),m.error("Failed to update status.")}},j=async r=>{if(window.confirm("Are you sure you want to delete this review? This action cannot be undone."))try{const p=await z.delete(`${A}/api/review/remove/${r}`,{headers:{token:e}});p.data.success?(m.success(p.data.message),a(b=>b.filter(N=>N._id!==r))):m.error(p.data.message)}catch(p){console.error("Error deleting review:",p),m.error(p.response?.data?.message||"Failed to delete review.")}},F=()=>{c(""),x("")},$=t.filter(r=>{const p=new Date(r.date).getTime(),b=!i||p>=new Date(i).setHours(0,0,0,0),N=!d||p<=new Date(d).setHours(23,59,59,999);return b&&N}),Q=[{label:"Total reviews",value:t.length,icon:L,color:"bg-white/10 text-[#e9c7d7]"},{label:"Pending review",value:t.filter(r=>!r.status||r.status==="pending").length,icon:J,color:"bg-amber-50 text-amber-600"},{label:"Approved",value:t.filter(r=>r.status==="approved").length,icon:T,color:"bg-emerald-50 text-emerald-600"},{label:"Rejected",value:t.filter(r=>r.status==="rejected").length,icon:O,color:"bg-rose-50 text-rose-600"}];return s.jsxs("div",{className:"mx-auto w-full min-w-0 max-w-[1600px] font-[Outfit,sans-serif] text-[#342a3c] [&_*]:[font-family:inherit] [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-[#b77997] [&_button]:focus-visible:ring-offset-2 motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none",children:[s.jsxs("header",{className:"mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center",children:[s.jsxs("div",{children:[s.jsxs("p",{className:"mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9c839e]",children:[s.jsx("span",{className:"h-1.5 w-1.5 rotate-45 bg-[#b77997]","aria-hidden":"true"})," Febeul / Customer experience"]}),s.jsxs("h1",{className:"text-3xl font-semibold tracking-tight sm:text-4xl",children:["Customer reviews",s.jsx("span",{className:"text-[#b77997]",children:"."})]}),s.jsx("p",{className:"mt-2 text-sm leading-relaxed text-[#8b7b93]",children:"Review customer feedback and manage what appears on your store."})]}),s.jsxs("button",{type:"button",onClick:f,disabled:o,className:"inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#eae5ed] bg-white px-4 py-2.5 text-xs font-medium shadow-sm transition-colors hover:bg-[#faf7fb] disabled:cursor-wait disabled:opacity-60",children:[s.jsx(K,{size:14,className:o?"animate-spin":"","aria-hidden":"true"})," Refresh reviews"]})]}),s.jsx("div",{className:"mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4",children:Q.map(({label:r,value:p,icon:b,color:N},k)=>s.jsxs("div",{className:"min-w-0 rounded-2xl border p-4 shadow-[0_3px_16px_-12px_rgba(48,39,53,0.2)] sm:p-5 "+(k===0?"border-[#302735] bg-[#302735] text-white":"border-[#eae5ed] bg-white"),children:[s.jsxs("div",{className:"mb-3 flex items-center justify-between gap-2",children:[s.jsx("p",{className:"text-xs font-medium "+(k===0?"text-[#d4c5d8]":"text-[#8b7b93]"),children:r}),s.jsx("span",{className:"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg "+N,children:s.jsx(b,{size:16,"aria-hidden":"true"})})]}),s.jsx("p",{className:"text-3xl font-semibold tracking-tight tabular-nums",children:o?"—":p}),s.jsx("p",{className:"mt-1 text-[11px] "+(k===0?"text-[#b9a7c0]":"text-[#a292a9]"),children:"All dates"})]},r))}),s.jsxs("section",{"aria-label":"Customer reviews",className:"min-w-0 overflow-hidden rounded-2xl border border-[#eae5ed] bg-white shadow-[0_4px_24px_-16px_rgba(48,39,53,0.18)]",children:[s.jsxs("div",{className:"flex flex-col justify-between gap-4 border-b border-[#eee9f0] p-4 sm:p-5 xl:flex-row xl:items-center",children:[s.jsxs("div",{className:"flex items-center gap-3",children:[s.jsx("span",{className:"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7eff4] text-[#a85070]",children:s.jsx(L,{size:18,"aria-hidden":"true"})}),s.jsxs("div",{children:[s.jsx("h2",{className:"text-sm font-semibold",children:"Review moderation"}),s.jsx("p",{className:"mt-0.5 text-xs text-[#8b7b93]","aria-live":"polite",children:o?"Fetching customer feedback...":$.length+" of "+t.length+" reviews shown"})]})]}),s.jsxs("div",{className:"flex flex-wrap items-end gap-2 sm:gap-3",children:[s.jsxs("label",{className:"min-w-0 flex-1 sm:flex-none",children:[s.jsx("span",{className:"mb-1.5 block text-[11px] font-medium text-[#8b7b93]",children:"From date"}),s.jsx("input",{type:"date",value:i,max:d||void 0,onChange:r=>c(r.target.value),"aria-label":"From date",className:"min-h-10 w-full min-w-0 rounded-lg border border-[#eae5ed] bg-[#fcfafc] px-2 py-2 text-xs outline-none focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0] sm:w-36"})]}),s.jsxs("label",{className:"min-w-0 flex-1 sm:flex-none",children:[s.jsx("span",{className:"mb-1.5 block text-[11px] font-medium text-[#8b7b93]",children:"To date"}),s.jsx("input",{type:"date",value:d,min:i||void 0,onChange:r=>x(r.target.value),"aria-label":"To date",className:"min-h-10 w-full min-w-0 rounded-lg border border-[#eae5ed] bg-[#fcfafc] px-2 py-2 text-xs outline-none focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0] sm:w-36"})]}),(i||d)&&s.jsx("button",{type:"button",onClick:F,title:"Clear date filter","aria-label":"Clear date filter",className:"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#eae5ed] text-[#a85070] transition-colors hover:bg-[#faf0f6]",children:s.jsx(Y,{size:16})})]})]}),o?s.jsxs("div",{role:"status",className:"flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-16 text-sm text-[#8b7b93]",children:[s.jsx(V,{size:26,className:"animate-spin text-[#b77997]"}),"Loading reviews..."]}):$.length===0?s.jsxs("div",{className:"flex min-h-64 flex-col items-center justify-center px-4 py-16 text-center",children:[s.jsx("span",{className:"mb-4 rounded-2xl bg-[#f7f3f8] p-4 text-[#b399bf]",children:s.jsx(ee,{size:26})}),s.jsx("h3",{className:"text-sm font-semibold",children:t.length===0?"No reviews found.":"No reviews match the selected date range."}),s.jsx("p",{className:"mt-2 text-xs text-[#8b7b93]",children:t.length===0?"Customer feedback will appear here when a review is submitted.":"Try a wider date range to see more customer feedback."}),(i||d)&&s.jsx("button",{type:"button",onClick:F,className:"mt-4 rounded-lg border border-[#eae5ed] px-4 py-2 text-xs font-medium text-[#a85070] hover:bg-[#faf0f6]",children:"Clear date filter"})]}):s.jsx("div",{className:"min-w-0 overflow-x-auto",children:s.jsxs("table",{className:"block w-full xl:table xl:table-fixed",children:[s.jsx("thead",{className:"sr-only bg-[#faf8fb] xl:not-sr-only xl:table-header-group",children:s.jsxs("tr",{className:"[&_th]:px-4 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-[#8b7b93]",children:[s.jsx("th",{scope:"col",className:"w-[19%]",children:"Customer"}),s.jsx("th",{scope:"col",className:"w-[17%]",children:"Product"}),s.jsx("th",{scope:"col",className:"w-[27%]",children:"Rating & review"}),s.jsx("th",{scope:"col",className:"w-[11%]",children:"Submitted"}),s.jsx("th",{scope:"col",className:"w-[11%]",children:"Status"}),s.jsx("th",{scope:"col",className:"w-[15%]",children:"Actions"})]})}),s.jsx("tbody",{className:"grid gap-3 bg-[#faf8fb] p-3 md:grid-cols-2 xl:table-row-group xl:divide-y xl:divide-[#eee9f0] xl:bg-white xl:p-0",children:$.map(r=>s.jsxs("tr",{className:"grid min-w-0 grid-cols-2 gap-x-3 rounded-xl border border-[#eae5ed] bg-white p-4 transition-colors xl:table-row xl:rounded-none xl:border-0 xl:p-0 xl:hover:bg-[#fdfbfd]",children:[s.jsx("td",{className:"col-span-2 min-w-0 pb-4 xl:px-4 xl:py-5 xl:align-top",children:s.jsxs("div",{className:"flex items-start gap-2.5",children:[r.userId?.profilePicture?s.jsx("img",{src:r.userId.profilePicture,alt:r.userId.name,className:"h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[#eee9f0]"}):s.jsx("span",{className:"flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4edf6] text-[#aa8ab4]",children:s.jsx(ae,{size:16})}),s.jsxs("div",{className:"min-w-0",children:[s.jsx("p",{className:"break-words text-sm font-medium",children:r.userId?.name||"Anonymous"}),s.jsx("p",{className:"mt-1 break-all text-[11px] text-[#8b7b93]",children:r.userId?.email||"N/A"})]})]})}),s.jsx("td",{className:"col-span-2 min-w-0 border-t border-[#f1ecf3] py-3 xl:border-0 xl:px-4 xl:py-5 xl:align-top",children:s.jsxs("a",{href:"https://febeul.com/product/"+r.productId?._id,target:"_blank",rel:"noopener noreferrer",className:"group flex items-start gap-2 text-xs font-medium text-[#a85070] hover:underline focus-visible:outline-[#b77997]",children:[r.productId?.image&&s.jsx("img",{src:r.productId.image,alt:r.productId.name,className:"h-10 w-10 shrink-0 rounded-lg border border-[#eee9f0] object-cover"}),s.jsxs("span",{className:"min-w-0 break-words leading-relaxed",children:[r.productId?.name||"Unknown Product"," ",s.jsx(te,{size:11,className:"inline shrink-0","aria-hidden":"true"})]})]})}),s.jsxs("td",{className:"col-span-2 min-w-0 pb-4 pt-1 xl:px-4 xl:py-5 xl:align-top",children:[s.jsxs("div",{className:"mb-2 flex flex-wrap items-center gap-2",children:[s.jsx("span",{className:"flex items-center gap-0.5","aria-hidden":"true",children:[1,2,3,4,5].map(p=>s.jsx(B,{size:13,className:r.rating>=p?"fill-amber-400 text-amber-400":"text-[#e0d8e5]"},p))}),s.jsxs("span",{className:"text-[11px] font-medium text-[#8b7b93]",children:[r.rating," Stars"]})]}),s.jsx("p",{className:"whitespace-pre-wrap break-words text-sm leading-relaxed text-[#65566f]",children:r.comment}),r.images&&r.images.length>0&&s.jsx("div",{className:"mt-3 flex flex-wrap gap-2",children:r.images.map((p,b)=>s.jsx("img",{src:p,alt:"Review image "+(b+1),className:"h-12 w-12 rounded-lg border border-[#eee9f0] object-cover"},b))})]}),s.jsxs("td",{className:"border-t border-[#f1ecf3] py-3 text-xs text-[#8b7b93] xl:border-0 xl:px-4 xl:py-5 xl:align-top",children:[s.jsx("span",{className:"mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#a292a9] xl:hidden",children:"Submitted"}),new Date(r.date).toLocaleDateString()]}),s.jsx("td",{className:"border-t border-[#f1ecf3] py-3 text-right xl:border-0 xl:px-4 xl:py-5 xl:text-left xl:align-top",children:s.jsxs("span",{className:"inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium capitalize "+(r.status==="approved"?"border-emerald-100 bg-emerald-50 text-emerald-700":r.status==="rejected"?"border-rose-100 bg-rose-50 text-rose-700":"border-amber-100 bg-amber-50 text-amber-700"),children:[s.jsx("span",{className:"h-1 w-1 rounded-full bg-current","aria-hidden":"true"}),r.status||"pending"]})}),s.jsx("td",{className:"col-span-2 border-t border-[#f1ecf3] pt-3 xl:border-0 xl:px-4 xl:py-5 xl:align-top",children:s.jsxs("div",{className:"flex flex-wrap gap-2",children:[r.status!=="approved"&&s.jsxs("button",{type:"button",onClick:()=>h(r._id,"approved"),className:"inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100",children:[s.jsx(T,{size:12,"aria-hidden":"true"}),"Approve"]}),r.status!=="rejected"&&s.jsxs("button",{type:"button",onClick:()=>h(r._id,"rejected"),className:"inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#eae5ed] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#827089] transition-colors hover:bg-[#f7f3f8]",children:[s.jsx(O,{size:12,"aria-hidden":"true"}),"Reject"]}),l!=="staff"&&s.jsxs("button",{type:"button",onClick:()=>j(r._id),className:"inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-50",children:[s.jsx(G,{size:12,"aria-hidden":"true"}),"Delete"]})]})})]},r._id))})]})})]})]})};export{Ye as default};
