import{r as u,b as C,j as r,X,g as Y}from"./index-CuI28gbC.js";import{C as B}from"./calendar-range-BldpTe28.js";let G={data:""},J=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||G},K=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,V=/\/\*[^]*?\*\/|  +/g,T=/\n+/g,N=(e,t)=>{let a="",i="",l="";for(let n in e){let s=e[n];n[0]=="@"?n[1]=="i"?a=n+" "+s+";":i+=n[1]=="f"?N(s,n):n+"{"+N(s,n[1]=="k"?"":t)+"}":typeof s=="object"?i+=N(s,t?t.replace(/([^,])+/g,d=>n.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,c=>/&/.test(c)?c.replace(/&/g,d):d?d+" "+c:c)):n):s!=null&&(n=/^--/.test(n)?n:n.replace(/[A-Z]/g,"-$&").toLowerCase(),l+=N.p?N.p(n,s):n+":"+s+";")}return a+(t&&l?t+"{"+l+"}":l)+i},b={},H=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+H(e[a]);return t}return e},ee=(e,t,a,i,l)=>{let n=H(e),s=b[n]||(b[n]=(c=>{let m=0,x=11;for(;m<c.length;)x=101*x+c.charCodeAt(m++)>>>0;return"go"+x})(n));if(!b[s]){let c=n!==e?e:(m=>{let x,y,j=[{}];for(;x=K.exec(m.replace(V,""));)x[4]?j.shift():x[3]?(y=x[3].replace(T," ").trim(),j.unshift(j[0][y]=j[0][y]||{})):j[0][x[1]]=x[2].replace(T," ").trim();return j[0]})(e);b[s]=N(l?{["@keyframes "+s]:c}:c,a?"":"."+s)}let d=a&&b.g?b.g:null;return a&&(b.g=b[s]),((c,m,x,y)=>{y?m.data=m.data.replace(y,c):m.data.indexOf(c)===-1&&(m.data=x?c+m.data:m.data+c)})(b[s],t,i,d),s},te=(e,t,a)=>e.reduce((i,l,n)=>{let s=t[n];if(s&&s.call){let d=s(a),c=d&&d.props&&d.props.className||/^go/.test(d)&&d;s=c?"."+c:d&&typeof d=="object"?d.props?"":N(d,""):d===!1?"":d}return i+l+(s??"")},"");function D(e){let t=this||{},a=e.call?e(t.p):e;return ee(a.unshift?a.raw?te(a,[].slice.call(arguments,1),t.p):a.reduce((i,l)=>Object.assign(i,l&&l.call?l(t.p):l),{}):a,J(t.target),t.g,t.o,t.k)}let U,_,z;D.bind({g:1});let v=D.bind({k:1});function ae(e,t,a,i){N.p=t,U=e,_=a,z=i}function $(e,t){let a=this||{};return function(){let i=arguments;function l(n,s){let d=Object.assign({},n),c=d.className||l.className;a.p=Object.assign({theme:_&&_()},d),a.o=/ *go\d+/.test(c),d.className=D.apply(a,i)+(c?" "+c:"");let m=e;return e[0]&&(m=d.as||e,delete d.as),z&&m[0]&&z(d),U(m,d)}return l}}var se=e=>typeof e=="function",R=(e,t)=>se(e)?e(t):e,re=(()=>{let e=0;return()=>(++e).toString()})(),oe=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),ie=20,M="default",Z=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(s=>s.id===t.toast.id?{...s,...t.toast}:s)};case 2:let{toast:i}=t;return Z(e,{type:e.toasts.find(s=>s.id===i.id)?1:0,toast:i});case 3:let{toastId:l}=t;return{...e,toasts:e.toasts.map(s=>s.id===l||l===void 0?{...s,dismissed:!0,visible:!1}:s)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(s=>s.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let n=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(s=>({...s,pauseDuration:s.pauseDuration+n}))}}},ne=[],le={toasts:[],pausedAt:void 0,settings:{toastLimit:ie}},k={},q=(e,t=M)=>{k[t]=Z(k[t]||le,e),ne.forEach(([a,i])=>{a===t&&i(k[t])})},Q=e=>Object.keys(k).forEach(t=>q(e,t)),ce=e=>Object.keys(k).find(t=>k[t].toasts.some(a=>a.id===e)),F=(e=M)=>t=>{q(t,e)},de=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:(a==null?void 0:a.id)||re()}),E=e=>(t,a)=>{let i=de(t,e,a);return F(i.toasterId||ce(i.id))({type:2,toast:i}),i.id},p=(e,t)=>E("blank")(e,t);p.error=E("error");p.success=E("success");p.loading=E("loading");p.custom=E("custom");p.dismiss=(e,t)=>{let a={type:3,toastId:e};t?F(t)(a):Q(a)};p.dismissAll=e=>p.dismiss(void 0,e);p.remove=(e,t)=>{let a={type:4,toastId:e};t?F(t)(a):Q(a)};p.removeAll=e=>p.remove(void 0,e);p.promise=(e,t,a)=>{let i=p.loading(t.loading,{...a,...a==null?void 0:a.loading});return typeof e=="function"&&(e=e()),e.then(l=>{let n=t.success?R(t.success,l):void 0;return n?p.success(n,{id:i,...a,...a==null?void 0:a.success}):p.dismiss(i),l}).catch(l=>{let n=t.error?R(t.error,l):void 0;n?p.error(n,{id:i,...a,...a==null?void 0:a.error}):p.dismiss(i)}),e};var pe=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,me=v`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,ue=v`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,xe=$("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${pe} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${me} 0.15s ease-out forwards;
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
    animation: ${ue} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,ge=v`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,fe=$("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${ge} 1s linear infinite;
`,he=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,ye=v`
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
}`,be=$("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${he} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${ye} 0.2s ease-out forwards;
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
`,ve=$("div")`
  position: absolute;
`,je=$("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,we=v`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ne=$("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${we} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,$e=({toast:e})=>{let{icon:t,type:a,iconTheme:i}=e;return t!==void 0?typeof t=="string"?u.createElement(Ne,null,t):t:a==="blank"?null:u.createElement(je,null,u.createElement(fe,{...i}),a!=="loading"&&u.createElement(ve,null,a==="error"?u.createElement(xe,{...i}):u.createElement(be,{...i})))},ke=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Ee=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Ae="0%{opacity:0;} 100%{opacity:1;}",Ie="0%{opacity:1;} 100%{opacity:0;}",De=$("div")`
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
`,Ce=$("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Se=(e,t)=>{let a=e.includes("top")?1:-1,[i,l]=oe()?[Ae,Ie]:[ke(a),Ee(a)];return{animation:t?`${v(i)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${v(l)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}};u.memo(({toast:e,position:t,style:a,children:i})=>{let l=e.height?Se(e.position||t||"top-center",e.visible):{opacity:0},n=u.createElement($e,{toast:e}),s=u.createElement(Ce,{...e.ariaProps},R(e.message,e));return u.createElement(De,{className:e.className,style:{...l,...a,...e.style}},typeof i=="function"?i({icon:n,message:s}):u.createElement(u.Fragment,null,n,s))});ae(u.createElement);D`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;const S="http://localhost:4000",Re=({token:e})=>{const[t,a]=u.useState([]),[i,l]=u.useState(!0),n=localStorage.getItem("role"),[s,d]=u.useState(""),[c,m]=u.useState("");u.useEffect(()=>{e?x():(p.error("Admin not authenticated."),l(!1))},[e]);const x=async()=>{l(!0);try{const o=await C.get(`${S}/api/review/all`,{headers:{token:e}});o.data.success?a(o.data.reviews):p.error(o.data.message)}catch(o){console.error("Error fetching all reviews:",o),p.error("Failed to fetch reviews.")}finally{l(!1)}},y=async(o,h)=>{try{const g=await C.post(`${S}/api/review/update-status`,{reviewId:o,status:h},{headers:{token:e}});g.data.success?(p.success(g.data.message),a(f=>f.map(w=>w._id===o?{...w,status:h}:w))):p.error(g.data.message)}catch(g){console.error("Error updating review status:",g),p.error("Failed to update status.")}},j=async o=>{var h,g;if(window.confirm("Are you sure you want to delete this review? This action cannot be undone."))try{const f=await C.delete(`${S}/api/review/remove/${o}`,{headers:{token:e}});f.data.success?(p.success(f.data.message),a(w=>w.filter(A=>A._id!==o))):p.error(f.data.message)}catch(f){console.error("Error deleting review:",f),p.error(((g=(h=f.response)==null?void 0:h.data)==null?void 0:g.message)||"Failed to delete review.")}},W=()=>{d(""),m("")},L=t.filter(o=>{const h=new Date(o.date).getTime(),g=!s||h>=new Date(s).setHours(0,0,0,0),f=!c||h<=new Date(c).setHours(23,59,59,999);return g&&f});return r.jsxs("div",{className:"p-6 bg-gray-100 min-h-screen",children:[r.jsxs("div",{className:"flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8",children:[r.jsx("h1",{className:"text-3xl font-bold text-gray-800",children:"All Customer Reviews (Admin)"}),r.jsxs("div",{className:`flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors shrink-0 ${s||c?"bg-pink-50 border-pink-300":"bg-white border-gray-300"}`,children:[r.jsx(B,{size:16,className:s||c?"text-pink-500":"text-gray-400"}),r.jsx("input",{type:"date",value:s,max:c||void 0,onChange:o=>d(o.target.value),className:"text-xs font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer","aria-label":"From date"}),r.jsx("span",{className:"text-gray-300 text-xs font-bold",children:"→"}),r.jsx("input",{type:"date",value:c,min:s||void 0,onChange:o=>m(o.target.value),className:"text-xs font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer","aria-label":"To date"}),(s||c)&&r.jsx("button",{onClick:W,title:"Clear date filter",className:"text-pink-400 hover:text-red-500 transition-colors",children:r.jsx(X,{size:14})})]})]}),i?r.jsx("div",{className:"text-center text-gray-600",children:"Loading reviews..."}):L.length===0?r.jsx("div",{className:"text-center text-gray-600 py-10 border rounded-lg bg-white",children:t.length===0?"No reviews found.":"No reviews match the selected date range."}):r.jsx("div",{className:"bg-white rounded-lg shadow-md p-8",children:r.jsx("div",{className:"overflow-x-auto",children:r.jsxs("table",{className:"min-w-full divide-y divide-gray-200",children:[r.jsx("thead",{className:"bg-gray-50",children:r.jsxs("tr",{children:[r.jsx("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"User"}),r.jsx("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Product"}),r.jsx("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Rating"}),r.jsx("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Comment"}),r.jsx("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Date"}),r.jsx("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Status"}),r.jsx("th",{scope:"col",className:"px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider",children:"Actions"})]})}),r.jsx("tbody",{className:"bg-white divide-y divide-gray-200",children:L.map(o=>{var h,g,f,w,A,O;return r.jsxs("tr",{className:"hover:bg-gray-50",children:[r.jsx("td",{className:"px-6 py-4 whitespace-nowrap",children:r.jsxs("div",{className:"flex items-center",children:[((h=o.userId)==null?void 0:h.profilePicture)&&r.jsx("img",{src:o.userId.profilePicture,alt:o.userId.name,className:"w-8 h-8 rounded-full mr-2 object-cover"}),r.jsxs("div",{children:[r.jsx("p",{className:"text-sm font-medium text-gray-900",children:((g=o.userId)==null?void 0:g.name)||"Anonymous"}),r.jsx("p",{className:"text-xs text-gray-500",children:((f=o.userId)==null?void 0:f.email)||"N/A"})]})]})}),r.jsxs("td",{className:"px-6 py-4 whitespace-nowrap",children:[r.jsx("a",{href:`https://febeul.com/product/${(w=o.productId)==null?void 0:w._id}`,target:"_blank",rel:"noopener noreferrer",className:"text-blue-600 hover:underline",children:(A=o.productId)!=null&&A.name?o.productId.name.length>8?o.productId.name.substring(0,8)+"...":o.productId.name:"Unknown Product"}),((O=o.productId)==null?void 0:O.image)&&r.jsx("img",{src:o.productId.image,alt:o.productId.name,className:"w-12 h-12 object-cover rounded mt-2"})]}),r.jsxs("td",{className:"px-6 py-4 whitespace-nowrap",children:[r.jsx("div",{className:"flex items-center",children:[1,2,3,4,5].map(I=>r.jsx(Y,{size:16,className:`${o.rating>=I?"text-yellow-500 fill-current":"text-gray-300"}`},I))}),r.jsxs("p",{className:"text-sm text-gray-700",children:[o.rating," Stars"]})]}),r.jsxs("td",{className:"px-6 py-4 max-w-xs overflow-hidden text-ellipsis text-sm text-gray-700",children:[o.comment,o.images&&o.images.length>0&&r.jsx("div",{className:"flex flex-wrap gap-1 mt-2",children:o.images.map((I,P)=>r.jsx("img",{src:I,alt:`Review image ${P+1}`,className:"w-10 h-10 object-cover rounded"},P))})]}),r.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-gray-500",children:new Date(o.date).toLocaleDateString()}),r.jsx("td",{className:"px-6 py-4 whitespace-nowrap",children:r.jsx("span",{className:`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${o.status==="approved"?"bg-green-100 text-green-800":o.status==="rejected"?"bg-red-100 text-red-800":"bg-yellow-100 text-yellow-800"} capitalize`,children:o.status||"pending"})}),r.jsxs("td",{className:"px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2",children:[o.status!=="approved"&&r.jsx("button",{onClick:()=>y(o._id,"approved"),className:"text-green-600 hover:text-green-900 bg-green-50 px-2 py-1 rounded",children:"Approve"}),o.status!=="rejected"&&r.jsx("button",{onClick:()=>y(o._id,"rejected"),className:"text-orange-600 hover:text-orange-900 bg-orange-50 px-2 py-1 rounded",children:"Reject"}),n!=="staff"&&r.jsx("button",{onClick:()=>j(o._id),className:"text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded",children:"Delete"})]})]},o._id)})})]})})})]})};export{Re as default};
