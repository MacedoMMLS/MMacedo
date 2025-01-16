import { intercept as L } from "@neptune";

function R(e) {
    return e.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

var b = window.neptune.actions;
var w = (e, t) => {
    let n = [];
    for (let r in b) {
        for (let u in window.neptune.actions[r]) {
            let d = `${r}/${R(u)}`;
            if (e.test(d)) {
                n.push(L(d, (i) => t(i[1], i[0])));
            }
        }
    }
    return () => n.forEach((r) => r());
};

var A = NeptuneNative.createEvalScope(`
  electron.ipcMain.removeHandler("__Testing/src/test.native.ts_registerExports");
  electron.ipcMain.handle("__Testing/src/test.native.ts_registerExports", (_, code, globalName) => {
    const exports = eval(`(() => {${ code }; return ${ globalName }; })()`);
    electron.ipcMain.removeHandler("__Testing/src/test.native.ts");
    electron.ipcMain.handle("__Testing/src/test.native.ts", (_, exportName, ...args) => exports[exportName](...args));
  });
`);

NeptuneNative.deleteEvalScope(A);

await window.electron.ipcRenderer.invoke(
    "__Testing/src/test.native.ts_registerExports",
    `"use strict";var neptuneExports=(()=>{var d=Object.defineProperty;var R=Object.getOwnPropertyDescriptor;var T=Object.getOwnPropertyNames;var _=Object.prototype.hasOwnProperty;var l=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,n)=>(typeof require<"u"?require:t)[n]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var w=(e,t)=>{for(var n in t)d(e,n,{get:t[n],enumerable:!0})},C=(e,t,n,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of T(t))!_.call(e,o)&&o!==n&&d(e,o,{get:()=>t[o],enumerable:!(i=R(t,o))||i.enumerable});return e};var h=e=>C(d({"__esModule":{value:!0}},e);var F={};w(F,{AppEventEnum:()=>v,getClientMessageChannelEnum:()=>b,startNativeIpcLogging:()=>y,stopNativeIpcLogging:()=>M});var E=l("electron");var c=e=>e.default.default,g=e=>Function(`return import("${e}")`)();var f=g("../original.asar/app/shared/client/ClientMessageChannelEnum.js").then(c);var N=l("electron"),a=(e,...t)=>{for(let n of N.BrowserWindow.getAllWindows())n.webContents.send(e,...t)};var m=e=>{let t=r=>{let u=(...p)=>{r(e,...p)};return u.withContext=p=>(...L)=>{r(e,p,...L)},u},n=t((...r)=>a("NEPTUNE_RENDERER_LOG","log",...r)),i=t((...r)=>a("NEPTUNE_RENDERER_LOG","warn",...r)),o=t((...r)=>a("NEPTUNE_RENDERER_LOG","error",...r)),x=t((...r)=>a("NEPTUNE_RENDERER_LOG","debug",...r));return{log:n,warn:i,err:o,debug:x}},A=m("[lib.native]");var P=m("[test.native]"),v=g("../original.asar/app/shared/AppEventEnum.js").then(c),b=()=>f,s={},y=async()=>{for(let e of Object.values(await v))e!=="playback.current.time"&&(s[e]=(t,...n)=>P.log(e,...n),E.ipcMain.on(e,s[e]))},M=async()=>{for(let e in s)E.ipcMain.removeListener(e,s[e]),delete s[e]};return h(F);})();
`,
        "neptuneExports"
);

var v = (e) => (...t) =>
    window.electron.ipcRenderer
        .invoke("__Testing/src/test.native.ts", e, ...t)
        .catch((n) => {
            let r = n.stack?.replaceAll(
                "Error invoking remote method '__Testing/src/test.native.ts': Error: ",
                ""
            );
            throw new Error(`[Testing/src/test.native.ts.${e}] ${r}`);
        });

var O = v("AppEventEnum"),
    y = v("getClientMessageChannelEnum"),
    h = v("startNativeIpcLogging"),
    x = v("stopNativeIpcLogging");

var M = y(),
    C = window.electron.ipcRenderer,
    l = {},
    T = async () => {
        for (let e of Object.values(await M)) {
            if (e !== "client.playback.playersignal") {
                l[e] = (t, ...n) => o.log(e, ...n);
                C.on(e, l[e]);
            }
        }
    },
    _ = async () => {
        for (let e in l) {
            C.removeListener(e, l[e]);
            delete l[e];
        }
    };

import { actions as f } from "@neptune";

var E = (e) => {
    let t = (a) => {
        let c = (...s) => {
            a(e, ...s);
        };
        return (c.withContext = (s) =>
            (...m) => {
                a(e, s, ...m);
            }),
            c;
    };

    let n = t(console.log),
        r = t(console.warn),
        u = t(console.error),
        d = t(console.debug),
        i = (a, c, s) => {
            let m = (g) => {
                a(g);
                c({
                    message: `${e} - ${g}`,
                    category: "OTHER",
                    severity: s,
                });
            };
            return (m.withContext = (g) => {
                let N = a.withContext(g);
                return (p) => {
                    N(p);
                    if (p instanceof Error) p = p.message;
                    c({
                        message: `${e}.${g} - ${p}`,
                        category: "OTHER",
                        severity: s,
                    });
                };
            }),
                m;
        };

    return {
        log: n,
        warn: r,
        err: u,
        debug: d,
        msg: {
            log: i(n, f.message.messageInfo, "INFO"),
            warn: i(r, f.message.messageWarn, "WARN"),
            err: i(u, f.message.messageError, "ERROR"),
        },
    };
};

var o = E("[test]"),
    P = w(/.*/, o.log);

h().catch(o.err.withContext("Failed to start native IPC logging"));
T().catch(o.err.withContext("Failed to start client IPC logging"));

var B = () => {
    P?.();
    x().catch(o.err.withContext("Failed to stop native IPC logging"));
    _().catch(o.err.withContext("Failed to stop client IPC logging"));
};

export { B as onUnload, o as trace };

