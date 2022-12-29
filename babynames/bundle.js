(()=>{"use strict";function t(t){return Array.isArray(t)||ArrayBuffer.isView(t)}function e(t){(function(t){return null!=t&&"function"==typeof t.Dispose})(t)&&t.Dispose()}function n(t,e){var n,r;return(null===(n=Object.getPrototypeOf(t))||void 0===n?void 0:n.constructor)===(null===(r=Object.getPrototypeOf(e))||void 0===r?void 0:r.constructor)}class r{constructor(t){this.iter=t}"System.Collections.Generic.IEnumerator`1.get_Current"(){return this.current}"System.Collections.IEnumerator.get_Current"(){return this.current}"System.Collections.IEnumerator.MoveNext"(){const t=this.iter.next();return this.current=t.value,!t.done}"System.Collections.IEnumerator.Reset"(){throw new Error("JS iterators cannot be reset")}Dispose(){}}function A(t){return"function"==typeof t.GetEnumerator?t.GetEnumerator():new r(t[Symbol.iterator]())}function o(t){return{[Symbol.iterator](){return this},next(){const e=t["System.Collections.IEnumerator.MoveNext"]();return{done:!e,value:e?t["System.Collections.IEnumerator.get_Current"]():void 0}}}}function E(t,e){let n=t.toString(10);for(;n.length<e;)n="0"+n;return n}function I(t){const e=t;return"number"==typeof e.offset?e.offset:1===t.kind?0:-6e4*t.getTimezoneOffset()}class s{static id(t){return s.idMap.has(t)||s.idMap.set(t,++s.count),s.idMap.get(t)}}function i(t){let e=0,n=5381;const r=t.length;for(;e<r;)n=33*n^t.charCodeAt(e++);return n}function u(t){return 2654435761*t|0}function N(t){return 0===t.length?0:t.reduce(((t,e)=>(t<<5)+t^e))}function c(e){var n;if(null==e)return 0;switch(typeof e){case"boolean":return e?1:0;case"number":return u(e);case"string":return i(e);default:return function(t){return"function"==typeof t.GetHashCode}(e)?e.GetHashCode():t(e)?function(t){const e=t.length,n=new Array(e);for(let r=0;r<e;r++)n[r]=c(t[r]);return N(n)}(e):e instanceof Date?function(t){return t.getTime()}(e):(null===(n=Object.getPrototypeOf(e))||void 0===n?void 0:n.constructor)===Object?N(Object.values(e).map((t=>c(t)))):u(s.id(e))}}function l(e,n){var r;return e===n||(null==e?null==n:null!=n&&"object"==typeof e&&(function(t){return"function"==typeof t.Equals}(e)?e.Equals(n):t(e)?t(n)&&function(t,e){return function(t,e,n){if(null==t)return null==e;if(null==e)return!1;if(t.length!==e.length)return!1;for(let r=0;r<t.length;r++)if(!n(t[r],e[r]))return!1;return!0}(t,e,l)}(e,n):e instanceof Date?n instanceof Date&&0===a(e,n):(null===(r=Object.getPrototypeOf(e))||void 0===r?void 0:r.constructor)===Object&&function(t,e){const n=Object.keys(t),r=Object.keys(e);if(n.length!==r.length)return!1;n.sort(),r.sort();for(let A=0;A<n.length;A++)if(n[A]!==r[A]||!l(t[n[A]],e[r[A]]))return!1;return!0}(e,n)))}function a(t,e){let n,r;return"offset"in t&&"offset"in e?(n=t.getTime(),r=e.getTime()):(n=t.getTime()+I(t),r=e.getTime()+I(e)),n===r?0:n<r?-1:1}function L(e,n){var r;return e===n?0:null==e?null==n?0:-1:null==n?1:"object"!=typeof e?e<n?-1:1:function(t){return"function"==typeof t.CompareTo}(e)?e.CompareTo(n):t(e)?t(n)?function(t,e){return function(t,e,n){if(null==t)return null==e?0:1;if(null==e)return-1;if(t.length!==e.length)return t.length<e.length?-1:1;for(let r=0,A=0;r<t.length;r++)if(A=n(t[r],e[r]),0!==A)return A;return 0}(t,e,L)}(e,n):-1:e instanceof Date?n instanceof Date?a(e,n):-1:(null===(r=Object.getPrototypeOf(e))||void 0===r?void 0:r.constructor)===Object?function(t,e){const n=Object.keys(t),r=Object.keys(e);if(n.length!==r.length)return n.length<r.length?-1:1;n.sort(),r.sort();for(let A=0,o=0;A<n.length;A++){const E=n[A];if(E!==r[A])return E<r[A]?-1:1;if(o=L(t[E],e[E]),0!==o)return o}return 0}(e,n):-1}function T(t){const e=t<0,n=(t=Math.abs(t))%36e5/6e4;return(e?"-":"+")+E(~~(t/36e5),2)+":"+E(n,2)}function S(t,e){const n=t.toISOString();return"first"===e?n.substring(0,n.indexOf("T")):n.substring(n.indexOf("T")+1,n.length-1)}function R(t,e,n){return e.replace(/(\w)\1*/g,(e=>{let r=Number.NaN;switch(e.substring(0,1)){case"y":const A=n?t.getUTCFullYear():t.getFullYear();r=e.length<4?A%100:A;break;case"M":r=(n?t.getUTCMonth():t.getMonth())+1;break;case"d":r=n?t.getUTCDate():t.getDate();break;case"H":r=n?t.getUTCHours():t.getHours();break;case"h":const o=n?t.getUTCHours():t.getHours();r=o>12?o%12:o;break;case"m":r=n?t.getUTCMinutes():t.getMinutes();break;case"s":r=n?t.getUTCSeconds():t.getSeconds();break;case"f":r=n?t.getUTCMilliseconds():t.getMilliseconds()}return Number.isNaN(r)?e:r<10&&e.length>1?"0"+r:""+r}))}s.idMap=new WeakMap,s.count=0,Symbol("curried");const f=Symbol("numeric");function M(t,e){return"number"==typeof t?t.toPrecision(e):t[f]().toPrecision(e)}function h(t,e){return"number"==typeof t?t.toExponential(e):t[f]().toExponential(e)}function C(t){return"number"==typeof t?(Number(t)>>>0).toString(16):t[f]().toHex()}function O(t){return t.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&")}function m(t,e=0){var n,r;if(null!=t&&"object"==typeof t){if("function"==typeof t.toString)return t.toString();if(Symbol.iterator in t)return function(t){let e=0,n="[";for(const r of t){if(0===e)n+=m(r);else{if(100===e){n+="; ...";break}n+="; "+m(r)}e++}return n+"]"}(t);{const A=null===(n=Object.getPrototypeOf(t))||void 0===n?void 0:n.constructor;return A===Object&&e<10?"{ "+Object.entries(t).map((([t,n])=>t+" = "+m(n,e+1))).join("\n  ")+" }":null!==(r=null==A?void 0:A.name)&&void 0!==r?r:""}}return String(t)}class g{toJSON(){return function(t){const e={},n=Object.keys(t);for(let r=0;r<n.length;r++)e[n[r]]=t[n[r]];return e}(this)}toString(){return t=this,"{ "+Object.entries(t).map((([t,e])=>t+" = "+m(e))).join("\n  ")+" }";var t}GetHashCode(){return t=this,N(Object.values(t).map((t=>c(t))));var t}Equals(t){return function(t,e){if(t===e)return!0;if(n(t,e)){const n=Object.keys(t);for(let r=0;r<n.length;r++)if(!l(t[n[r]],e[n[r]]))return!1;return!0}return!1}(this,t)}CompareTo(t){return function(t,e){if(t===e)return 0;if(n(t,e)){const n=Object.keys(t);for(let r=0;r<n.length;r++){const A=L(t[n[r]],e[n[r]]);if(0!==A)return A}return 0}return-1}(this,t)}}class H{constructor(t,e){"function"==typeof e?(this.getter=t,this.setter=e):(this.getter=()=>t,this.setter=e=>{t=e})}get contents(){return this.getter()}set contents(t){this.setter(t)}}class d{constructor(t){this.message=t}}function y(t){return(e=t)instanceof d||e instanceof Error?t:new Error(String(t));var e}const D=/(^|[^%])%([0+\- ]*)(\*|\d+)?(?:\.(\d+))?(\w)/g;function G(t){return{input:t,cont:(e=t,t=>{D.lastIndex=0;const n=[],r=[];let A=0,o=D.exec(e);for(;o;){const t=o.index+(o[1]||"").length;n.push(e.substring(A,t).replace(/%%/g,"%")),r.push(o),A=D.lastIndex,D.lastIndex-=1,o=D.exec(e)}return 0===n.length?t(e.replace(/%%/g,"%")):(n.push(e.substring(A).replace(/%%/g,"%")),B(t,n,r))})};var e}function p(t,e){return"string"==typeof e?t(e):e.cont(t)}function K(t,e,n,r,A){let o="";if(e=e||"",A=A||"","number"==typeof(I=t)||(null==I?void 0:I[f]))switch("x"!==A.toLowerCase()&&(function(t,e){return function(t,e){return"number"==typeof t?t<e?-1:t>e?1:0:t.CompareTo(e)}(t,e)<0}(t,0)?(t=function(t,e){return"number"==typeof t?-1*t:t[f]().multiply(-1)}(t),o="-"):e.indexOf(" ")>=0?o=" ":e.indexOf("+")>=0&&(o="+")),r=null==r?null:parseInt(r,10),A){case"f":case"F":t=function(t,e){return"number"==typeof t?t.toFixed(e):t[f]().toFixed(e)}(t,r=null!=r?r:6);break;case"g":case"G":t=null!=r?M(t,r):M(t);break;case"e":case"E":t=null!=r?h(t,r):h(t);break;case"x":t=C(t);break;case"X":t=C(t).toUpperCase();break;default:t=String(t)}else t=t instanceof Date?function(t,e,n){return null!=t.offset?function(t,e){var n,r,A;const o=new Date(t.getTime()+(null!==(n=t.offset)&&void 0!==n?n:0));if("string"!=typeof e)return o.toISOString().replace(/\.\d+/,"").replace(/[A-Z]|\.\d+/g," ")+T(null!==(r=t.offset)&&void 0!==r?r:0);if(1!==e.length)return R(o,e,!0);switch(e){case"D":case"d":return S(o,"first");case"T":case"t":return S(o,"second");case"O":case"o":return function(t,e){const n=t.toISOString();return n.substring(0,n.length-1)+T(e)}(o,null!==(A=t.offset)&&void 0!==A?A:0);default:throw new Error("Unrecognized Date print format")}}(t,e):function(t,e){const n=1===t.kind;if("string"!=typeof e)return n?t.toUTCString():t.toLocaleString();if(1!==e.length)return R(t,e,n);switch(e){case"D":case"d":return n?S(t,"first"):t.toLocaleDateString();case"T":case"t":return n?S(t,"second"):t.toLocaleTimeString();case"O":case"o":return function(t,e){if(e)return t.toISOString();{const e=null==t.kind||2===t.kind;return E(t.getFullYear(),4)+"-"+E(t.getMonth()+1,2)+"-"+E(t.getDate(),2)+"T"+E(t.getHours(),2)+":"+E(t.getMinutes(),2)+":"+E(t.getSeconds(),2)+"."+E(t.getMilliseconds(),3)+(e?T(-6e4*t.getTimezoneOffset()):"")}}(t,n);default:throw new Error("Unrecognized Date print format")}}(t,e)}(t):m(t);var I;if(n="number"==typeof n?n:parseInt(n,10),isNaN(n))t=o+t;else{const r=e.indexOf("0")>=0,A=e.indexOf("-")>=0,E=A||!r?" ":"0";t="0"===E?o+(t=v(t,n-o.length,E,A)):v(o+t,n,E,A)}return t}function B(t,e,n,r="",A=-1){return(...o)=>{let E=r;const I=e.slice(),s=n.slice();for(const t of o){const[,,e,n,r,o]=s[0];let i=n;if(A>=0)i=A,A=-1;else if("*"===i){if(t<0)throw new Error("Non-negative number required");A=t;continue}E+=I[0],E+=K(t,e,i,r,o),I.splice(0,1),s.splice(0,1)}return 0===s.length?(E+=I[0],t(E)):B(t,I,s,E,A)}}function J(t,e){return Array.isArray(e)?e.join(t):Array.from(e).join(t)}function v(t,e,n,r){n=n||" ",e-=t.length;for(let A=0;A<e;A++)t=r?t+n:n+t;return t}function b(t,e,n,r){if(r="number"==typeof r?r:0,(n="number"==typeof n?n:void 0)&&n<0)throw new Error("Count cannot be less than zero");if(0===n)return[];const A=1==(1&r),o=2==(2&r);e=(e=(e=e||[]).filter((t=>t)).map(O)).length>0?e:["\\s"];const E=[],I=new RegExp(e.join("|"),"g");let s=!0,i=0;do{const e=I.exec(t);if(null===e){const e=o?t.substring(i).trim():t.substring(i);(!A||e.length>0)&&E.push(e),s=!1}else{const r=o?t.substring(i,e.index).trim():t.substring(i,e.index);(!A||r.length>0)&&(null!=n&&E.length+1===n?(E.push(o?t.substring(i).trim():t.substring(i)),s=!1):E.push(r)),i=I.lastIndex}}while(s);return E}function U(t,e,n){if(e+(n||0)>t.length)throw new Error("Invalid startIndex and/or length");return null!=n?t.substr(e,n):t.substr(e)}function Y(t,e,n){const r=0|e.length,A=function(t,e){return"function"==typeof t?new t(e):new Array(e)}(n,r);for(let n=0;n<=r-1;n++)A[n]=t(e[n]);return A}class w{constructor(t){this.value=t}toJSON(){return this.value}toString(){return String(this.value)}GetHashCode(){return c(this.value)}Equals(t){return null!=t&&l(this.value,t instanceof w?t.value:t)}CompareTo(t){return null==t?1:L(this.value,t instanceof w?t.value:t)}}function V(t){return null==t||t instanceof w?new w(t):t}function x(t){if(null==t)throw new Error("Option has no value");return t instanceof w?t.value:t}class k extends g{constructor(t,e){super(),this.head=t,this.tail=e}toString(){return"["+J("; ",this)+"]"}Equals(t){return this===t||((t,e)=>{t:for(;;){const n=t,r=e,A=[n.tail,r.tail];if(null!=A[0]){if(null!=A[1]){const o=A[0],E=A[1];if(l(n.head,r.head)){t=o,e=E;continue t}return!1}return!1}return null==A[1]}})(this,t)}GetHashCode(){return 0|((t,e,n)=>{for(;;){const r=t,A=e,o=n,E=o.tail;if(null==E)return 0|A;{const I=E;if(r>18)return 0|A;t=r+1,e=(A<<1)+c(o.head)+631*r,n=I}}})(0,0,this)}toJSON(t){return Array.from(this)}CompareTo(t){return 0|((t,e)=>{t:for(;;){const n=t,r=e,A=[n.tail,r.tail];if(null!=A[0]){if(null!=A[1]){const o=A[0],E=A[1],I=0|L(n.head,r.head);if(0===I){t=o,e=E;continue t}return 0|I}return 1}return null!=A[1]?-1:0}})(this,t)}GetEnumerator(){return new F(this)}[Symbol.iterator](){return o(this.GetEnumerator())}"System.Collections.IEnumerable.GetEnumerator"(){return A(this)}}class F{constructor(t){this.xs=t,this.it=this.xs,this.current=null}"System.Collections.Generic.IEnumerator`1.get_Current"(){return this.current}"System.Collections.IEnumerator.get_Current"(){return this.current}"System.Collections.IEnumerator.MoveNext"(){const t=this,e=t.it.tail;if(null!=e){const n=e;return t.current=t.it.head,t.it=n,!0}return!1}"System.Collections.IEnumerator.Reset"(){const t=this;t.it=t.xs,t.current=null}Dispose(){}}function Z(t){return null==t.tail}function P(t){if(null!=t.tail)return t.head;throw new Error("Collection was empty.\\nParameter name: list")}function j(t){const e=t.tail;if(null!=e)return e;throw new Error("Collection was empty.\\nParameter name: list")}function _(){throw new Error("Enumeration has not started. Call MoveNext.")}function W(){throw new Error("Enumeration already finished.")}class q{constructor(t){this.f=t}toString(){let t=0,n="seq [";const r=A(this);try{for(;t<4&&r["System.Collections.IEnumerator.MoveNext"]();)t>0&&(n+="; "),n+=m(r["System.Collections.Generic.IEnumerator`1.get_Current"]()),t=t+1|0;return 4===t&&(n+="; ..."),n+"]"}finally{e(r)}}GetEnumerator(){return this.f()}[Symbol.iterator](){return o(this.GetEnumerator())}"System.Collections.IEnumerable.GetEnumerator"(){return this.f()}}class z{constructor(t,e,n){this.current=t,this.next=e,this.dispose=n}"System.Collections.Generic.IEnumerator`1.get_Current"(){return this.current()}"System.Collections.IEnumerator.get_Current"(){return this.current()}"System.Collections.IEnumerator.MoveNext"(){return this.next()}"System.Collections.IEnumerator.Reset"(){!function(){throw new Error("Reset is not supported on this enumerator.")}()}Dispose(){this.dispose()}}function X(t,e,n){return new z(t,e,n)}function $(t){return function(t){return new q(t)}(t)}function Q(t){return e="source",null==t&&function(t){throw new Error(t)}(e),A(t);var e}function tt(t){return t instanceof k?function(t){const e=0|function(t){return 0|((t,e)=>{for(;;){const n=t,r=e.tail;if(null==r)return 0|n;t=n+1,e=r}})(0,t)}(t),n=(r=new Array(e),A=e,r.fill(null,0,0+A));var r,A;return((t,e)=>{for(;;){const r=t,A=e;if(Z(A))break;n[r]=P(A),t=r+1,e=j(A)}})(0,t),n}(t):Array.from(t)}function et(t,e,n){return $((()=>function(t,e,n){let r,A=!1,o=V(t());const E=()=>{if(null!=o){const t=x(o);try{n(t)}finally{o=void 0}}},I=()=>{try{E()}finally{r=void 0}};return X((()=>(A||_(),null!=r?x(r):W())),(()=>{if(A||(A=!0),null!=o){const t=x(o);let n;try{n=e(t)}catch(t){throw I(),t}return null!=n?(r=n,!0):(I(),!1)}return!1}),E)}(t,e,n)))}function nt(t,n,r){const A=Q(r);try{let r=n;for(;A["System.Collections.IEnumerator.MoveNext"]();)r=t(r,A["System.Collections.Generic.IEnumerator`1.get_Current"]());return r}finally{e(A)}}function rt(t,n){return et((()=>Q(n)),(e=>e["System.Collections.IEnumerator.MoveNext"]()?V(t(e["System.Collections.Generic.IEnumerator`1.get_Current"]())):void 0),(t=>{e(t)}))}class At{constructor(t,e){this.cleanup=t,this.res=e}Dispose(){this.cleanup()}GetEnumerator(){return getEnumerator(this.res)}[Symbol.iterator](){return toIterator(this.GetEnumerator())}"System.Collections.IEnumerable.GetEnumerator"(){return getEnumerator(this.res)}}function ot(t,e){if(t.has(e))return t.get(e);throw new Error(`The given key '${e}' was not present in the dictionary.`)}class Et{constructor(t,n){const r=new H(null);this.comparer=n,r.contents=this,this.hashMap=new Map([]),this["init@8-2"]=1;const o=A(t);try{for(;o["System.Collections.IEnumerator.MoveNext"]();){const t=o["System.Collections.Generic.IEnumerator`1.get_Current"]();ut(r.contents,t)}}finally{e(o)}}get[Symbol.toStringTag](){return"HashSet"}toJSON(t){return Array.from(this)}"System.Collections.IEnumerable.GetEnumerator"(){return A(this)}GetEnumerator(){return A((t=this.hashMap.values(),$((()=>function(t){let n,r,o,E=!1,I=!1;const s=()=>{if(I=!0,null!=r){const t=r;try{e(t)}finally{r=void 0}}if(null!=n){const t=n;try{e(t)}finally{n=void 0}}};return X((()=>(E?I&&W():_(),null!=o?x(o):W())),(()=>{let i;if(E||(E=!0),I)return!1;{let E;for(;null==E;){const I=[n,r];if(null!=I[0])if(null!=I[1]){const t=I[1];if(t["System.Collections.IEnumerator.MoveNext"]())o=V(t["System.Collections.Generic.IEnumerator`1.get_Current"]()),E=!0;else try{e(t)}finally{r=void 0}}else{const t=I[0];t["System.Collections.IEnumerator.MoveNext"]()?(i=t["System.Collections.Generic.IEnumerator`1.get_Current"](),r=A(i)):(s(),E=!1)}else n=A(t)}return x(E)}}),(()=>{I||s()}))}(t)))));var t}[Symbol.iterator](){return o(this.GetEnumerator())}"System.Collections.Generic.ICollection`1.Add2B595"(t){ut(this,t)}"System.Collections.Generic.ICollection`1.Clear"(){st(this)}"System.Collections.Generic.ICollection`1.Contains2B595"(t){return Nt(this,t)}"System.Collections.Generic.ICollection`1.CopyToZ2E171D71"(t,e){var n;n=(n,r)=>{t[e+n]=r},nt(((t,e)=>(n(t,e),t+1|0)),0,this)}"System.Collections.Generic.ICollection`1.get_Count"(){return 0|it(this)}"System.Collections.Generic.ICollection`1.get_IsReadOnly"(){return!1}"System.Collections.Generic.ICollection`1.Remove2B595"(t){return ct(this,t)}get size(){return 0|it(this)}add(t){return ut(this,t),this}clear(){st(this)}delete(t){return ct(this,t)}has(t){return Nt(this,t)}keys(){return rt((t=>t),this)}values(){return rt((t=>t),this)}entries(){return rt((t=>[t,t]),this)}forEach(t,e){const n=this;var r;r=e=>{t(e,e,n)},nt(((t,e)=>{r(e)}),void 0,n)}}function It(t,e){const n=0|t.comparer.GetHashCode(e);let r,A=null;return r=[(o=t.hashMap,E=n,I=new H((()=>A),(t=>{A=t})),!!o.has(E)&&(I.contents=o.get(E),!0)),A],r[0]?[!0,n,r[1].findIndex((n=>t.comparer.Equals(e,n)))]:[!1,n,-1];var o,E,I}function st(t){t.hashMap.clear()}function it(t){let n=0,r=A(t.hashMap.values());try{for(;r["System.Collections.IEnumerator.MoveNext"]();)n=n+r["System.Collections.Generic.IEnumerator`1.get_Current"]().length|0}finally{e(r)}return 0|n}function ut(t,e){const n=It(t,e);return n[0]?!(n[2]>-1)&&(ot(t.hashMap,n[1]).push(e),!0):(t.hashMap.set(n[1],[e]),!0)}function Nt(t,e){const n=It(t,e);let r;switch(r=n[0]&&n[2]>-1?0:1,r){case 0:return!0;case 1:return!1}}function ct(t,e){const n=It(t,e);let r;switch(r=n[0]&&n[2]>-1?0:1,r){case 0:return ot(t.hashMap,n[1]).splice(n[2],1),!0;case 1:return!1}}function lt(t,n,r){return o=()=>{const A=new Et(t,r);return function(t,n){return function(n,r){return et((()=>Q(r)),(e=>{let n;for(;null==n&&e["System.Collections.IEnumerator.MoveNext"]();)r=e["System.Collections.Generic.IEnumerator`1.get_Current"](),n=t(r)?V(r):void 0;var r;return n}),(t=>{e(t)}))}(0,n)}((t=>{return e=t,!(n=A).has(e)&&(n.add(e),!0);var e,n}),n)},$((()=>A(o())));var o}function at(t,e,n){return tt(lt(t,e,n))}const Lt=["ANNE","KIRSTEN","METTE","HANNE","HELLE","ANNA","SUSANNE","LENE","MARIA","MARIANNE","LONE","CAMILLA","PIA","LOUISE","CHARLOTTE","BENTE","TINA","GITTE","INGE","KAREN","JETTE","JULIE","RIKKE","IDA","EMMA","BIRGIT","SOFIE","CHRISTINA","INGER","PERNILLE","MARIE","BIRTHE","LAURA","LINE","ELSE","ULLA","ANNETTE","HEIDI","JYTTE","CECILIE","ANETTE","EVA","LIS","KARIN","BIRGITTE","TOVE","DORTHE","SIGNE","LISBETH","MAJA","TRINE","MATHILDE","EMILIE","NANNA","SARA","KATRINE","DORTE","ELLEN","CAROLINE","GRETHE","KARINA","STINE","BODIL","VIBEKE","LISE","MALENE","SARAH","JANE","FREJA","ANJA","LINDA","MIA","LÆRKE","AMALIE","NINA","ISABELLA","INGRID","RUTH","ANNI","AASE","MONA","JOSEFINE","HENRIETTE","CLARA","ASTRID","LOTTE","JEANETTE","TINE","ANITA","SONJA","ALBERTE","MICHELLE","JOHANNE","DITTE","VICTORIA","ALICE","MIE","MARGIT","JONNA","LAILA","ELLA","SIMONE","MILLE","FRIDA","BETTINA","ANN","ELISABETH","GERDA","LEA","BRITTA","INGA","HELENE","CONNIE","KRISTINA","OLIVIA","RITA","JOAN","ALMA","TANJA","FREDERIKKE","LENA","SANNE","MERETE","SOFIA","BIRTE","KATHRINE","LISA","BETINA","KAROLINE","ESTHER","BERIT","IRENE","CHRISTINE","SANDRA","LIVA","ASTA","ANDREA","AGNES","JOSEPHINE","JANNE","JANNIE","THEA","EDITH","AMANDA","KRISTINE","SUSAN","CARINA","IBEN","ANNIE","VIVI","ELIN","ANNELISE","RANDI","ROSA","LIV","DIANA","KATJA","JANNI","NADIA","NICOLINE","SOLVEIG","KARLA","LILLIAN","GRETE","LISELOTTE","LUNA","SOPHIA","CONNY","HELENA","KIRSTINE","REBECCA","VERA","KAMILLA","MALOU","ANE","MARLENE","INGELISE","ELSEBETH","WINNIE","SOPHIE","ANNE-MARIE","HANNAH","GURLI","ANNIKA","MAIKEN","SIGRID","NAJA","MATILDE","ANNE-METTE","BRITT","YVONNE","HENNY","SELMA","LYKKE","CATHRINE","LILIAN","JASMIN","NORA","EMILY","MAYA","LILLY","SILJE","ERNA","ELLY","KATE","JULIA","NIKOLINE","MAJBRITT","SABRINA","GUDRUN","FILIPPA","KLARA","CELINA","EMILIA","DORIS","FREYA","THI","GRY","SILLE","AYA","STEPHANIE","MARGRETHE","LISSI","TILDE","HANNA","SILKE","MELANIE","NATASJA","HELGA","LISBET","MAI","INA","HELEN","MONICA","ANNY","MARY","CARLA","FIE","ANNEMETTE","MARTHA","KETTY","MAJ-BRITT","NINNA","SINE","SIDSEL","LILLI","AGNETE","MERLE","ELENA","LINA","JENNY","VIGGA","NADJA","JESSICA","INGE-LISE","DAGMAR","JEANNE","ESTER","EA","VIOLA","BETTY","CECILIA","LISE-LOTTE","CONNI","MAJKEN","VIVIAN","FATIMA","INGEBORG","MINNA","ALBA","DINA","SABINE","VITA","MELISSA","REBEKKA","MONIKA","NICOLE","MARIE-LOUISE","NATASCHA","RONJA","ILSE","STELLA","ELISE","SALLY","NANA","YASMIN","OLGA","EBBA","THERESE","ANNEMARIE","MIRA","ALEXANDRA","BARBARA","RIGMOR","GUNHILD","SIF","PATRICIA","IRMA","BITTEN","SMILLA","ANNE-LISE","TENNA","AUGUSTA","RIE","JOHANNA","KIRA","KAJA","MARIANN","THILDE","MAJBRIT","DORRIT","KAMMA","MAJ","DICTE","ROSE","MAIBRITT","MARIAM","CHRISTA","EDEL","CELINE","SUSSI","LEONORA","NATHALIE","HERDIS","CLAUDIA","ISABEL","STINA","ELISA","NYNNE","MOLLY","JENNIFER","NATASHA","CHRISTEL","KAYA","SISSE","BENEDIKTE","ELNA","AMINA","FATMA","JUDITH","ANNE-SOFIE","CAMILLE","SASCHA","MARINA","REGITZE","JEANNETTE","ANA","LISSY","NATALIE","SABINA","ELIZABETH","MAI-BRITT","BIANCA","SILJA","MAREN","NATALIA","SØS","ANNALISE","LILY","IRIS","VIKTORIA","BENEDICTE","VANESSA","JEANETT","LONNIE","MIRIAM","ELLIE","JOANNA","ELVIRA","MARTA","VEGA","VILMA","MARIAN","SAGA","AGNETHE","BELINDA","SOLVEJG","PETRA","NAYA","DAGNY","MELINA","YRSA","ALINA","KAMILLE","SUSSIE","ELSA","LINEA","AYSE","ERIKA","JUNE","SISSEL","JULIANE","BENTHE","KATHARINA","ELLINOR","NANCY","VICKI","LINETTE","ODA","LILI","ZAHRA","KIA","SELINA","ANNE-GRETHE","LIZZIE","LISETTE","SIRI","KATARZYNA","LEILA","AISHA","SANDIE","LARA","LINNEA","BRITA","ALVA","SOLVEJ","MARYAM","KRISTA","TINNA","SIA","DANIELLA","RAGNHILD","BOLETTE","THERESA","MICHELLA","LUCCA","FLORA","GERTRUD","MICHALA","MAGDALENA","MERETHE","LIZZI","NOVA","ALEKSANDRA","KATHE","DORIT","AGNIESZKA","ELINA","ISABELL","EMMY","KATARINA","SUZANNE","LYDIA","MY","FIONA","WILMA","NELLIE","ZENIA","LEAH","MINA","ELSE-MARIE","MYNTE","STEFANIE","GABRIELLA","EVY","MARIANE","VINNI","KAROLINA","DANIELA","EMMELIE","VIBE","CILLE","ENA","TANIA","LUCIA","MILLA","ÅSE","XENIA","MAIA","MILA","ELINE","MONIQUE","ZAINAB","BIRGITH","IMAN","STINNE","MARTINE","NETE","TERESA","ANN-SOFIE","KIT","LONNI","JACQUELINE","AMAL","DIDDE","PAULA","CORNELIA","LUISE","CRISTINA","JEANET","SIDSE","DORA","NIKITA","EMINE","HATICE","MARTINA","SAMIRA","BJØRK","MALGORZATA","VERONICA","VINNIE","DENISE","AMIRA","EWA","SUSIE","CATHARINA","CATRINE","ZEYNEP","BIBI","TANYA","INGERLISE","CAROLINA","AIDA","BELLA","ANGELINA","NORMA","PAULINE","MELISA","CARMEN","URSULA","GHITA","HILDA","JUTTA","AMELIA","MIKKELINE","MICHAELA","IRINA","LENETTE","BRIT","LILJE","LIZETTE","JESSIE","ANIKA","MYNTHE","ANGELA","RAGNA","GERD","ANASTASIA","OLINE","PAULINA","VICKY","VILDE","SHEILA","INGER-LISE","ELIF","JILL","NATACHA","MARION","NAOMI","LAJLA","SALMA","ELLIS","AMY","KARNA","MAGDA","MADELEINE","JOY","ELINOR","ELVA","JASMINA","LOUISA","BONNIE","SILVIA","TATIANA","CHRISTIANE","VALENTINA","CÆCILIE","MAY","AVA","THORA","TEA","MICHELE","GABRIELA","IDA-MARIE","ALICIA","HEDVIG","NELLY","KIMMIE","SASHA","ZOE","LISSIE","REGINA","EVELYN","META","KARI","DEA","GRETA","MALAK","HJØRDIS","JUDY","NOUR","ANNA-MARIE","ALIS","JANA","ANITTA","MAGGIE","MALIKA","ANNA-LISE","CASSANDRA","DORTHEA","HANAN","GRO","BEATE","VERONIKA","BJØRG","IZABELLA","MELIA","WINNI","AZRA","BEATA","MIMI","NADINE","ANNE-GRETE","SIFF","NADA","ANNABELL","GUNVOR","KATINKA","KHADIJA","TERESE","CINDY","ISABELLE","SIV","LIZA","MERYEM","KIM","PUK","JANET","RUNA","IRYNA","NEEL","SIMONA","MARIANA","KRISTIN","PIL","HANA","SAMANTHA","ANINE","MAIBRIT","DANA","CLAIRE","SUSANNA","RACHEL","ANNE-SOPHIE","MARIANNA","JEANNIE","ULRIKKE","VILJA","IRENA","SUZAN","MANJA","SONIA","MAY-BRITT","AURA","KATRIN","LOLA","ELI","MIKALA","MAISE","LIA","ADRIANA","NOOR","SVETLANA","MEDINA","METHA","BIRTHA","BERITH","RENATA","LEJLA","LEYLA","GYDA","ANNE-DORTHE","VALBORG","BRIGITTE","CHILI","JOHNNA","LISS","MARGOT","OLENA","SACHA","SAHRA","ALIA","MYRNA","PHILIPPA","POULA","ILONA","GUNVER","KERSTIN","RABIA","CATHERINE","CECILLIE","FANNY","LIVIA","ELZBIETA","ADA","SANA","CHALOTTE","OKSANA","DIANNA","GINA","MAYBRITT","MOLLIE","GAIA","ZARA","MARIT","GRITH","JOLANTA","DANIELLE","DOROTA","SAHAR","AJA","HARRIET","CELIA","EMINA","KÄTHE","SYLVIA","JENNIE","TAMARA","MILENA","NINI","ELKE","KITTY","RANA","KITT","MICHELA","ANNEGRETHE","GRACE","YASEMIN","DEBBIE","ISA","ZEINAB","MARWA","MIHAELA","LONA","TINNE","JEAN","ERICA","LULU","MERVE","LILJA","SASJA","ANDREEA","ASMA","BIRGITTA","HELLA","SANNA","TESSA","TONE","FELICIA","DARIA","AMALIA","MALIA","ESRA","IZABELA","JAMILA","MAJSE","RITTA","THYRA","NAIA","ROSEMARIE","ELMA","LONNY","MARIKA","LANA","LINN","LE","MARGARET","FADIME","UMA","ALBERTHE","CIRKELINE","JUSTYNA","ELSEBET","HUDA","ESMA","INES","SAVANNAH","SYLWIA","FATEMEH","AVIAJA","CHANETTE","JELENA","ALLIS","NATALIIA","AGATA","ELA","GITTA","RINA","FENJA","EDA","ANGELIKA","ESTRID","TATJANA","BETH","FARAH","SIGGA","ANNESOFIE","AYAH","ELIZA","MANAL","SANNI","INGE-MARIE","INNA","NORAH","SIW","BERTHA","ELEONORA","DAISY","HELIN","KRISTIANE","MARIJA","RENATE","ANN-BRITT","MAHA","TETIANA","ANN-MARIE","MARNA","HALIMA","ALAA","HALA","MIRJAM","TARA","LISSA","SULTAN","ALICJA","MEJSE","LENI","ANNE-DORTE","ANNE-LOUISE","MELEK","STINNA","BEATRICE","IWONA","MUNA","ANISA","ANNABELLA","GITHA","KAJSA","MANUELA","NAIMA","ZOFIA","NISA","ANETA","ANTONIA","KRYSTYNA","MITZI","NINETTE","CAJA","JANIE","KAREN-MARGRETHE","NOA","ZOEY","JENNI","AMANI","ELLI","SIBEL","MELIKE","HIBA","KIKI","KLAUDIA","KIS","PATRYCJA","VICKIE","EDNA","HILDE","TONI","LOTUS","JASMINE","MADELINE","PETRINE","ANEMONE","ANNE-KATRINE","ANNEGRETE","ISOLDE","MATHILDA","ATHENA","DALIA","MALIN","NANNY","THIT","ANN-LOUISE","IOANA","KATRINA","ELISABET","KAISA","LIN","OFELIA","ZEHRA","MATILDA","RAKEL","GISELA","TRILLE","AYLA","FADUMO","RANIA","ANYA","GUNNA","INGER-MARIE","ZELIHA","FILUCA","INGE-MERETE","SAFIA","LUCY","NICOLA","LIDIA","LUCA","DILEK","FATEMA","LILIANA","ZUZANNA","CHLOE","LAYLA","EMMELI","KAMILA","MARI","ANNA-GRETHE","ASMAA","SINNE","ALISA","ANN-MARI","ZITA","DOMINIKA","ELEANOR","IVANA","AIA","BENDE","KATERINA","SAFA","VIDA","AICHA","BUSHRA","DANUTA","ROBERTA","TABITA","UNA","DILARA","LUISA","SANDY","SYS","WIVI","MARGITH","WIKTORIA","KATERYNA","JANINA","KAREN-MARIE","MEGAN","NICKIE","AINO","KATHERINE","MALINA","AYOE","FATME","GLORIA","SELIN","ANNELI","BENITA","HACER","HEBA","HOLLY","MAJ-BRIT","SUSI","EWELINA","JO","NAWAL","RIMA","SVITLANA","FREIA","SANNIE","ZANDRA","ALVILDA","DERYA","EMELIE","VIKTORIJA","WENDY","HAILEY","CINDIE","GABRIELE","NOLA","BAHAR","CATJA","FRIGG","SIHAM","BETHINA","ESME","HANIN","NATALI","NESRIN","NOOMI","EMMELY","MADINA","SVEA","CATALINA","EVELINA","HÜLYA","CATARINA","MARIA-LOUISE","SADIA","ANN-SOPHI"];class Tt extends Error{constructor(){super("The operation was canceled"),Object.setPrototypeOf(this,Tt.prototype)}}class St{constructor(){this.callCount=0}static get maxTrampolineCallCount(){return 2e3}incrementAndCheck(){return this.callCount++>St.maxTrampolineCallCount}hijack(t){this.callCount=0,setTimeout(t,0)}}function Rt(t){return e=>{if(e.cancelToken.isCancelled)e.onCancel(new Tt);else if(e.trampoline.incrementAndCheck())e.trampoline.hijack((()=>{try{t(e)}catch(t){e.onError(y(t))}}));else try{t(e)}catch(t){e.onError(y(t))}}}const ft=new class{Bind(t,e){return function(t,e){return Rt((n=>{t({onSuccess:t=>{try{e(t)(n)}catch(t){n.onError(y(t))}},onError:n.onError,onCancel:n.onCancel,cancelToken:n.cancelToken,trampoline:n.trampoline})}))}(t,e)}Combine(t,e){return this.Bind(t,(()=>e))}Delay(t){return Rt((e=>t()(e)))}For(t,e){const n=t[Symbol.iterator]();let r=n.next();return this.While((()=>!r.done),this.Delay((()=>{const t=e(r.value);return r=n.next(),t})))}Return(t){return function(t){return Rt((e=>e.onSuccess(t)))}(t)}ReturnFrom(t){return t}TryFinally(t,e){return Rt((n=>{t({onSuccess:t=>{e(),n.onSuccess(t)},onError:t=>{e(),n.onError(t)},onCancel:t=>{e(),n.onCancel(t)},cancelToken:n.cancelToken,trampoline:n.trampoline})}))}TryWith(t,e){return Rt((n=>{t({onSuccess:n.onSuccess,onCancel:n.onCancel,cancelToken:n.cancelToken,trampoline:n.trampoline,onError:t=>{try{e(t)(n)}catch(t){n.onError(y(t))}}})}))}Using(t,e){return this.TryFinally(e(t),(()=>t.Dispose()))}While(t,e){return t()?this.Bind(e,(()=>this.While(t,e))):this.Return(void 0)}Zero(){return Rt((t=>t.onSuccess(void 0)))}};function Mt(t){}const ht=new class{constructor(t=!1){this._id=0,this._cancelled=t,this._listeners=new Map}get isCancelled(){return this._cancelled}cancel(){if(!this._cancelled){this._cancelled=!0;for(const[,t]of this._listeners)t()}}addListener(t){const e=this._id;return this._listeners.set(this._id++,t),e}removeListener(t){return this._listeners.delete(t)}register(t,e){const n=this,r=this.addListener(null==e?t:()=>t(e));return{Dispose(){n.removeListener(r)}}}Dispose(){}};function Ct(t,e){return function(t,e){return function(t,e,n,r,A){"function"!=typeof e&&(A=e,e=void 0);const o=new St;t({onSuccess:e||Mt,onError:n||Mt,onCancel:r||Mt,cancelToken:A||ht,trampoline:o})}(t,e)}(t,e)}function Ot(t){const e=localStorage.getItem(t);return null===e?"":e}function mt(t,e){return b(e,[t],null,0)}function gt(t,e){return J(t,e)}const Ht=document.querySelector("#liked"),dt=document.querySelector("#name"),yt=document.querySelector("#yes"),Dt=document.querySelector("#no"),Gt=document.querySelector("#copy");function pt(t){Ht.textContent=t+"\n"+Ht.textContent}function Kt(t){const e=t.indexOf("-")>=0?"-":" ";return gt(e,Y((t=>U(t,0,1).toLocaleUpperCase()+U(t,1).toLocaleLowerCase()),b(t,[e],null,0)))}const Bt=function(){const t=mt(";",Ot("liked"));pt(gt("\n",t.slice().reverse()));const e=at(mt(";",Ot("disliked")),at(t,Y(Kt,Lt),{Equals:(t,e)=>t===e,GetHashCode:i}),{Equals:(t,e)=>t===e,GetHashCode:i});let n=-1;const r=()=>-1===n?"":e[n];return[()=>(n=n+1|0,r()),r]}(),Jt=Bt[0],vt=Bt[1];function bt(){let t;dt.textContent=(t=Jt(),function(t){return p((t=>t),t)}(G("Do you like %s?"))(t))}function Ut(t,e){const n=Ot(t);!function(t,e){localStorage.setItem(t,e)}(t,""===n?e:n+";"+e)}bt(),Gt.onclick=t=>{Ct(ft.Delay((()=>ft.TryWith(ft.Delay((()=>{let t;return ft.Bind((t=Ht.textContent,e=navigator.clipboard.writeText(t),n=t=>e.then(t[0]).catch((e=>(e instanceof Tt?t[2]:t[1])(e))),Rt((t=>n([t.onSuccess,t.onError,t.onCancel])))),(()=>ft.Return()));var e,n})),(t=>{const e=t.message;return p((t=>console.log(t)),G("Promise rejected %s"))(e),ft.Zero()})))))},yt.onclick=t=>{var e;Ut("liked",e=vt()),pt(e),bt()},Dt.onclick=t=>{Ut("disliked",vt()),bt()}})();