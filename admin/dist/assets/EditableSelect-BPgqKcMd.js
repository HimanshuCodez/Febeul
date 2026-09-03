import{c as s,r as i,j as t,X as b}from"./index-CuI28gbC.js";import{P as j}from"./plus-ygAzAfoP.js";/**
 * @license lucide-react v0.564.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],w=s("check",v);/**
 * @license lucide-react v0.564.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=[["path",{d:"M16 5h6",key:"1vod17"}],["path",{d:"M19 2v6",key:"4bpg5p"}],["path",{d:"M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5",key:"1ue2ih"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}]],z=s("image-plus",N);/**
 * @license lucide-react v0.564.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["path",{d:"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",key:"e79jfc"}],["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}]],V=s("palette",C);/**
 * @license lucide-react v0.564.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["path",{d:"M15 12h-5",key:"r7krc0"}],["path",{d:"M15 8h-5",key:"1khuty"}],["path",{d:"M19 17V5a2 2 0 0 0-2-2H4",key:"zz82l3"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",key:"1ph1d7"}]],E=s("scroll-text",M),I=({label:n,options:a=[],value:r,onChange:d,onAddNew:x,placeholder:y="Select...",required:f=!1,disableAdd:p=!1})=>{const[g,o]=i.useState(!1),[c,l]=i.useState(""),[k,u]=i.useState(!1),m=r&&!a.includes(r)?[...a,r]:a,h=async()=>{const e=c.trim();if(e){u(!0);try{await x(e),d(e),l(""),o(!1)}finally{u(!1)}}};return t.jsxs("div",{className:"w-full",children:[t.jsx("p",{className:"mb-2 text-sm font-semibold text-gray-600",children:n}),g?t.jsxs("div",{className:"flex gap-2",children:[t.jsx("input",{type:"text",autoFocus:!0,value:c,onChange:e=>l(e.target.value),placeholder:`New ${n.toLowerCase()}...`,className:"flex-1 px-3 py-2 rounded-lg border border-pink-300 focus:ring-2 focus:ring-pink-400 outline-none text-sm",onKeyDown:e=>{e.key==="Enter"&&(e.preventDefault(),h())}}),t.jsx("button",{type:"button",disabled:k||!c.trim(),onClick:h,className:"shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",children:t.jsx(w,{size:16})}),t.jsx("button",{type:"button",onClick:()=>{o(!1),l("")},className:"shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors",children:t.jsx(b,{size:16})})]}):t.jsxs("div",{className:"flex gap-2",children:[t.jsxs("select",{value:r,onChange:e=>d(e.target.value),required:f,className:"flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none text-sm bg-white",children:[t.jsx("option",{value:"",children:y}),m.map(e=>t.jsx("option",{value:e,children:e},e))]}),!p&&t.jsx("button",{type:"button",onClick:()=>o(!0),title:`Add new ${n}`,className:"shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200 transition-colors",children:t.jsx(j,{size:16})})]})]})};export{I as E,z as I,V as P,E as S};
