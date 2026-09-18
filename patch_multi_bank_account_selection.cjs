const fs = require("fs");
const acorn = require("acorn");
const esbuild = require("esbuild");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist/assets/index-sn777-v6.js",
  "dist_backup/assets/index-sn777-v6.js"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let code = fs.readFileSync(file, "utf8");

  // 1. Ensure BankAccountSection receives onSelectMethod:Ac in withdraw view
  const oldCall = 'o.jsx(BankAccountSection,{user:ve||{},currentMethod:Be})';
  const newCall = 'o.jsx(BankAccountSection,{user:ve||{},currentMethod:Be,onSelectMethod:Ac})';
  if (code.includes(oldCall)) {
    code = code.replaceAll(oldCall, newCall);
    console.log(`[MultiBank] Updated BankAccountSection invocation with onSelectMethod in ${file}`);
  }

  // 2. Replace BankAccountSection implementation with enhanced interactive multi-account selector
  const startIdx = code.indexOf("var BankAccountSection = function(props)");
  const linkRelMarker = '(function(){const e=document.createElement("link").relList;';
  const endIdx = code.indexOf(linkRelMarker, startIdx);

  if (startIdx !== -1 && endIdx !== -1) {
    const oldSection = code.substring(startIdx, endIdx);

    const newSection = `var BankAccountSection = function(props) {
  var user = props.user || {};
  var currentMethod = props.currentMethod || "bkash";
  var onSelectMethod = props.onSelectMethod;
  var initialHolder = user.username || user.name || "User";
  var userKey = ((user && (user.id || user.uid || user.username || user.phone)) || "").trim() || "default";

  var availableMethods = [
    { id: "bkash", name: "বিকাশ", color: "#e2136e", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi4UEkhLBUdrPpR2LIahMVOX-QLJ1WG4J1qhr1UUXqDsJYu30zIBFnIuzxDCs5GXkxhvfbjYiiWUNi8hxAFjGCVyntU1_eJ0aGlAjBCPy_0sUgYbyViV9dinzv32zD9fJrdTHUv-sWXy-3AVQwxByAJYVKepxzGIOs6eri4O_UgKPUxSa5Gqkm_t4AbMuny/s554/images%20(18).jpeg" },
    { id: "nagad", name: "নগদ", color: "#f7941d", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-QTVs9eBas6GpK2ydqhcGMQylNU_pN-s36BYRmohiHGhQ1WatvM-iqpa1sjGrZIMl2qw0UNhtBFMeNATQy3PJW5z8Eet99916DdaTFQ7fXTGyfEthPITh57pDMhcU4aPXAVvXwMNCmF_h5xSOBP_tRoUzfED_jRU-tzOU0vJx19y_FYAe6C-7Z_7ajilj/s447/images%20(1).png" },
    { id: "rocket", name: "রকেট", color: "#8c3494", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFVmKvc3KffHS-VDzbGcdFHlemdquFGYdtTBmQNpOVkJfOYN1rPJqiyQTSfT3CdTpYZDojYkoH3ZFMToyxMmhBenZSsyjlNavKeD5gjorThl1mD2NM4sAAI9iNpDwPfQrOomgPWQUhruE-jKow3JIeXbjgDQ-BR8-tmHPSeLNgVPI4eRBMC8gSHRwciSQx/s447/images%20(29).jpeg" },
    { id: "upay", name: "উপায়", color: "#ffd100", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgaqzmeDF8LCwofik99NpSLpi_hXf_K0yP27QaksiFaLMVLHmhz70K4Y6c17TdrWzl_gYAbf10fmWT4P7h4TP6BwkUA-R0SxH44EHvKl7TGx_qUYA17rJpF2fh7XgGzJnVPo_4f7Gra99OIOl9EgzUVqktUyvQD9UyWWQsvaeGsE5RSVWqkiqScN_8miJ5L/s240/images%20(4).png" },
    { id: "cellfin", name: "সেলফিন", color: "#169347", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjM8MgX1n_z0wQjpJEmLLM3S7fu63z5pmlsCNWm96H2_GWzGkktfu5pcn3vRcjJ0t5CgKvU5xyY0pybT0Qqin67zvcVPi4g3Y-mSsKlm4Ivw-9sWJwVV59b2M3t1EtKiXCA6H_kW59lWC8IIpAjQxUnL6bnXlSBzT7LxvslWAygv2DuQY3CH5KfcijLFxPk/s447/images%20(3).png" },
    { id: "mcash", name: "এম ক্যাশ", color: "#d32f2f", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhwGgaxy7NlzhwAT3P8KNis4n67oEL5ODUTohrjnREO3QbIZVRrX3gd0z_2XLZsTAF0xN7t2We-mnDPZ2f92ZWDBK8XETivynMjbYoAaLDNbhCLwZWnKOarzlNSXK9UulBIVaTdDxOeYhZPSBZeqbCJ4iPW14IZrQF-ZQNHZQt-32ihYv5gL9ai84Xdnp-V/s240/images%20(2).png" },
    { id: "usdt", name: "USDT TRC20", color: "#26A17B", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEinbv1oI15e-Jp0zB1Azo4pfZ5uXFZ1EaUkAOhBXQedNIxDG5O-7NIFy-gMxUg6b4en5Gc0bXbH4M7tNgbFV354pB3i62yJcdUlOy81JtbLFS3fMJQnt5_XDFFFs9I5imIfBq-7pnPwBQiUDkVtJh255zXfAOzCRkFzmMAKXTqmuY5jDHAAXk7xLAUErDgj/s307/images.png" },
    { id: "usdterc20", name: "USDT ERC20", color: "#26A17B", logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjAfY71CXhfNmfj2KgJlMVO3w5YdBXs8cyxBGKWNya-FgZEb2ekT3bZxSyg3JI_-9uIT1hyjAPmWzbf03fyhROfJtIfdNMKLUEUCXJ43ir7Ayneb_Os7YHlcIsbNpU8bRVp_ofs_9mOK1aanvfeC6V-367VxDI-w76qrw7glWcDueD-A2r0b7Hf1xERrOlF/s307/images%20(1).png" }
  ];

  var stateArr = R.useState(function() {
    try {
      var savedUser = localStorage.getItem("sn777_bank_accounts_" + userKey);
      if (savedUser) {
        var parsedUser = JSON.parse(savedUser);
        if (Array.isArray(parsedUser) && parsedUser.length > 0) return parsedUser;
      }
      var saved = localStorage.getItem("sn777_user_bank_accounts");
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      if (user.bankAccounts && Array.isArray(user.bankAccounts) && user.bankAccounts.length > 0) {
        return user.bankAccounts;
      }
    } catch(e) {}
    return [];
  });
  var accounts = stateArr[0];
  var setAccounts = stateArr[1];

  var idArr = R.useState(function() {
    return localStorage.getItem("sn777_selected_bank_id") || (accounts[0] ? accounts[0].id : "");
  });
  var selectedId = idArr[0];
  var setSelectedId = idArr[1];

  var modalArr = R.useState(false);
  var isModalOpen = modalArr[0];
  var setIsModalOpen = modalArr[1];

  var bTypeArr = R.useState(currentMethod || "bkash");
  var bankType = bTypeArr[0];
  var setBankType = bTypeArr[1];

  var accNumArr = R.useState("");
  var accNumber = accNumArr[0];
  var setAccNumber = accNumArr[1];

  var accHoldArr = R.useState(initialHolder);
  var accHolder = accHoldArr[0];
  var setAccHolder = accHoldArr[1];

  // Sync with server Firestore
  R.useEffect(function() {
    var isMounted = true;
    var uId = (user.id || user.uid || "").trim();
    var uName = (user.username || "").trim();
    var uPhone = (user.phone || "").trim();
    if (!uId && !uName && !uPhone) return;

    fetch("/api/user-bank-accounts?uid=" + encodeURIComponent(uId) + "&username=" + encodeURIComponent(uName) + "&phone=" + encodeURIComponent(uPhone))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (isMounted && data && Array.isArray(data.accounts) && data.accounts.length > 0) {
          setAccounts(function(prev) {
            var map = {};
            (data.accounts || []).forEach(function(a) { if (a && a.id) map[a.id] = a; });
            (prev || []).forEach(function(a) { if (a && a.id) map[a.id] = a; });
            var merged = Object.values(map);
            try {
              localStorage.setItem("sn777_bank_accounts_" + userKey, JSON.stringify(merged));
              localStorage.setItem("sn777_user_bank_accounts", JSON.stringify(merged));
            } catch(e) {}
            return merged;
          });
        }
      })
      .catch(function(err) {
        console.warn("User bank account fetch error:", err);
      });
    return function() { isMounted = false; };
  }, [user ? user.id : null, user ? user.uid : null, user ? user.username : null, user ? user.phone : null]);

  // Determine active account: selectedId has absolute priority
  var activeAcc = accounts.find(function(a) { return a.id === selectedId; }) || accounts[0] || null;

  // Persist active account whenever selectedId or activeAcc changes
  R.useEffect(function() {
    if (activeAcc) {
      try {
        localStorage.setItem("sn777_active_bank_account", JSON.stringify(activeAcc));
        localStorage.setItem("sn777_selected_bank_id", activeAcc.id);
      } catch(e) {}
      if (typeof onSelectMethod === "function" && activeAcc.methodId) {
        onSelectMethod(activeAcc.methodId.toLowerCase());
      }
    } else {
      try {
        localStorage.removeItem("sn777_active_bank_account");
        localStorage.removeItem("sn777_selected_bank_id");
      } catch(e) {}
    }
  }, [activeAcc ? activeAcc.id : null]);

  var handleSelectAccount = function(acc) {
    if (!acc || !acc.id) return;
    setSelectedId(acc.id);
    try {
      localStorage.setItem("sn777_selected_bank_id", acc.id);
      localStorage.setItem("sn777_active_bank_account", JSON.stringify(acc));
    } catch(e) {}
    if (typeof onSelectMethod === "function" && acc.methodId) {
      onSelectMethod(acc.methodId.toLowerCase());
    }
  };

  var handleSave = function() {
    var num = accNumber.trim();
    if (!num || num.length < 8) {
      alert("অনুগ্রহ করে সঠিক নম্বর বা ওয়ালেট অ্যাড্রেস লিখুন");
      return;
    }
    var holder = accHolder.trim() || initialHolder;
    var matchedOpt = availableMethods.find(function(m) { return m.id === bankType; }) || availableMethods[0];
    var newAcc = {
      id: "acc_" + Date.now(),
      methodId: matchedOpt.id,
      bankType: matchedOpt.name,
      logo: matchedOpt.logo,
      accNumber: num,
      accHolder: holder,
      accType: "Personal",
      createdAt: new Date().toISOString()
    };
    var updated = [newAcc].concat(accounts.filter(function(a) {
      return a.id !== newAcc.id && !(a.methodId === matchedOpt.id && a.accNumber === num);
    }));
    setAccounts(updated);
    handleSelectAccount(newAcc);
    try {
      localStorage.setItem("sn777_bank_accounts_" + userKey, JSON.stringify(updated));
      localStorage.setItem("sn777_user_bank_accounts", JSON.stringify(updated));
    } catch(e) {}

    // Save permanently to server & Firestore database
    try {
      fetch("/api/user-bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          uid: (user.id || user.uid || "").trim(),
          username: (user.username || "").trim(),
          phone: (user.phone || "").trim(),
          accounts: updated,
          newAccount: newAcc
        })
      }).catch(function() {});
    } catch(e) {}

    setIsModalOpen(false);
    setAccNumber("");
  };

  var handleDelete = function(e, id) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (window.confirm("আপনি কি এই ব্যাংক একাউন্টটি মুছে ফেলতে চান?")) {
      var updated = accounts.filter(function(a) { return a.id !== id; });
      setAccounts(updated);
      var nextActive = updated.length > 0 ? updated[0] : null;
      if (selectedId === id) {
        setSelectedId(nextActive ? nextActive.id : "");
        if (nextActive) {
          handleSelectAccount(nextActive);
        } else {
          try {
            localStorage.removeItem("sn777_selected_bank_id");
            localStorage.removeItem("sn777_active_bank_account");
          } catch(e) {}
        }
      }
      try {
        localStorage.setItem("sn777_bank_accounts_" + userKey, JSON.stringify(updated));
        localStorage.setItem("sn777_user_bank_accounts", JSON.stringify(updated));
      } catch(e) {}

      // Delete permanently from server & Firestore
      try {
        fetch("/api/user-bank-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            uid: (user.id || user.uid || "").trim(),
            username: (user.username || "").trim(),
            phone: (user.phone || "").trim(),
            deletedId: id,
            accounts: updated
          })
        }).catch(function() {});
      } catch(e) {}
    }
  };

  var isCrypto = ["usdt", "usdterc20"].includes(bankType);

  return o.jsxs("div", {
    className: "bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-100 space-y-4",
    children: [
      // Top header
      o.jsxs("div", {
        className: "flex items-center justify-between pb-1 border-b border-slate-100",
        children: [
          o.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              o.jsx("div", { className: "w-1.5 h-5 bg-[#00559b] rounded-full" }),
              o.jsx("h2", { className: "text-slate-800 font-black text-sm md:text-base", children: accounts.length > 1 ? "উত্তোলনের একাউন্ট সিলেক্ট করুন" : "উত্তোলনের ব্যাংক একাউন্ট" })
            ]
          }),
          accounts.length > 0 && o.jsxs("button", {
            type: "button",
            onClick: function() { setIsModalOpen(true); },
            className: "px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#00559b] text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all border border-blue-200/80 shadow-xs cursor-pointer",
            children: [
              o.jsx("span", { className: "text-base leading-none font-black", children: "+" }),
              o.jsx("span", { children: "নতুন যোগ করুন" })
            ]
          })
        ]
      }),

      // If no account is added yet
      accounts.length === 0 ? o.jsxs("button", {
        type: "button",
        onClick: function() { setIsModalOpen(true); },
        className: "w-full border-2 border-dashed border-[#00559b]/40 hover:border-[#00559b] bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center transition-all group active:scale-[0.99] shadow-xs cursor-pointer",
        children: [
          o.jsx("div", {
            className: "w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00559b] to-[#0072ce] text-white flex items-center justify-center shadow-lg shadow-blue-900/25 group-hover:scale-110 transition-transform",
            children: o.jsx("span", { className: "text-2xl font-black leading-none", children: "+" })
          }),
          o.jsx("span", {
            className: "text-[#00559b] font-black text-base tracking-wide",
            children: "+ ব্যাংক একাউন্ট যোগ করুন"
          }),
          o.jsx("span", {
            className: "text-slate-500 text-xs font-semibold max-w-xs leading-relaxed",
            children: "উত্তোলনের জন্য আপনার বিকাশ, নগদ, রকেট, উপায় বা USDT একাউন্ট যুক্ত করুন"
          })
        ]
      }) : o.jsxs("div", {
        className: "space-y-3",
        children: [
          // Selectable list for all accounts
          o.jsx("div", {
            className: "grid grid-cols-1 gap-2.5",
            children: accounts.map(function(acc) {
              var isSel = acc.id === (activeAcc && activeAcc.id);
              var mInfo = availableMethods.find(function(m) { return m.id === acc.methodId; }) || availableMethods.find(function(m) { return m.name === acc.bankType; }) || {};
              var logoUrl = acc.logo || mInfo.logo;

              return o.jsxs("div", {
                key: acc.id,
                onClick: function() { handleSelectAccount(acc); },
                className: "relative rounded-2xl p-3.5 transition-all cursor-pointer border-2 flex items-center justify-between gap-3 " + (isSel ? "border-[#00559b] bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white shadow-md ring-2 ring-[#00559b]/20" : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-xs"),
                children: [
                  // Left: Radio indicator + Logo + Bank info
                  o.jsxs("div", {
                    className: "flex items-center gap-3 min-w-0 flex-1",
                    children: [
                      // Radio Circle
                      o.jsx("div", {
                        className: "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors " + (isSel ? "border-[#00559b] bg-[#00559b]" : "border-slate-300 bg-white"),
                        children: isSel ? o.jsx("div", { className: "w-2 h-2 rounded-full bg-white" }) : null
                      }),

                      // Bank Logo
                      logoUrl ? o.jsx("img", {
                        src: logoUrl,
                        alt: acc.bankType,
                        className: "w-10 h-10 object-contain rounded-xl bg-white p-1 border border-slate-200 shadow-xs shrink-0"
                      }) : o.jsx("div", {
                        className: "w-10 h-10 rounded-xl bg-[#00559b] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs",
                        children: (acc.bankType || "BANK").substring(0, 3)
                      }),

                      // Account Details
                      o.jsxs("div", {
                        className: "min-w-0 flex-1",
                        children: [
                          o.jsxs("div", {
                            className: "flex items-center gap-2 mb-0.5",
                            children: [
                              o.jsx("span", {
                                className: "font-black text-sm text-slate-800",
                                children: acc.bankType || "ব্যাংক একাউন্ট"
                              }),
                              isSel && o.jsx("span", {
                                className: "px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black tracking-wide border border-emerald-200",
                                children: "✓ সিলেক্টেড"
                              })
                            ]
                          }),
                          o.jsx("span", {
                            className: "text-xs font-mono font-black text-slate-700 block tracking-wide truncate",
                            children: acc.accNumber
                          }),
                          acc.accHolder && o.jsxs("span", {
                            className: "text-[11px] font-medium text-slate-400 block truncate",
                            children: ["হোল্ডার: ", acc.accHolder]
                          })
                        ]
                      })
                    ]
                  }),

                  // Right: Delete button
                  o.jsx("button", {
                    type: "button",
                    onClick: function(e) { handleDelete(e, acc.id); },
                    className: "p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all shrink-0 cursor-pointer active:scale-95",
                    title: "একাউন্ট মুছুন",
                    children: o.jsx("svg", {
                      xmlns: "http://www.w3.org/2000/svg",
                      className: "w-4 h-4",
                      fill: "none",
                      viewBox: "0 0 24 24",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      children: o.jsx("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      })
                    })
                  })
                ]
              });
            })
          }),

          // Subtle helper tip
          accounts.length > 1 && o.jsx("p", {
            className: "text-[11px] text-slate-400 font-semibold text-center pt-0.5",
            children: "যে একাউন্টে টাকা নিতে চান সেটির উপর ট্যাপ করে সিলেক্ট করুন"
          })
        ]
      }),

      // Add Account Modal Dialog
      isModalOpen && o.jsxs("div", {
        className: "fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
        children: [
          o.jsx("div", {
            className: "absolute inset-0",
            onClick: function() { setIsModalOpen(false); }
          }),
          o.jsxs("div", {
            className: "relative bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 z-10 max-h-[90vh] overflow-y-auto",
            children: [
              o.jsxs("div", {
                className: "flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4",
                children: [
                  o.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      o.jsx("div", { className: "w-2 h-5 bg-[#00559b] rounded-full" }),
                      o.jsx("h3", { className: "text-base font-black text-slate-800 uppercase tracking-tight", children: "ব্যাংক একাউন্ট যোগ করুন" })
                    ]
                  }),
                  o.jsx("button", {
                    type: "button",
                    onClick: function() { setIsModalOpen(false); },
                    className: "px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs active:scale-95 transition-all shadow-md shadow-red-600/20 cursor-pointer",
                    children: "বন্ধ করুন"
                  })
                ]
              }),

              o.jsxs("div", {
                className: "space-y-4",
                children: [
                  // Payment method selector buttons
                  o.jsxs("div", {
                    children: [
                      o.jsx("label", { className: "text-xs font-bold text-slate-700 block mb-2", children: "পেমেন্ট মেথড নির্বাচন করুন:" }),
                      o.jsx("div", {
                        className: "grid grid-cols-4 gap-2",
                        children: availableMethods.map(function(m) {
                          var isSelected = bankType === m.id;
                          return o.jsxs("button", {
                            key: m.id,
                            type: "button",
                            onClick: function() { setBankType(m.id); },
                            className: "p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer " + (isSelected ? "border-[#00559b] bg-blue-50 text-[#00559b] font-black ring-2 ring-[#00559b]/20 shadow-xs" : "border-slate-200 hover:border-slate-300 text-slate-600"),
                            children: [
                              o.jsx("img", { src: m.logo, alt: m.name, className: "w-7 h-7 object-contain rounded-lg" }),
                              o.jsx("span", { className: "text-[11px] leading-tight text-center", children: m.name })
                            ]
                          });
                        })
                      })
                    ]
                  }),

                  // Account Holder Name
                  o.jsxs("div", {
                    children: [
                      o.jsx("label", { className: "text-xs font-bold text-slate-700 block mb-1.5", children: "একাউন্ট হোল্ডারের নাম:" }),
                      o.jsx("input", {
                        type: "text",
                        value: accHolder,
                        onChange: function(e) { setAccHolder(e.target.value); },
                        placeholder: "আপনার নাম লিখুন",
                        className: "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#00559b] focus:ring-2 focus:ring-blue-100 outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400"
                      })
                    ]
                  }),

                  // Account / Wallet number
                  o.jsxs("div", {
                    children: [
                      o.jsx("label", { className: "text-xs font-bold text-slate-700 block mb-1.5", children: isCrypto ? "USDT ওয়ালেট অ্যাড্রেস:" : "একাউন্ট / মোবাইল নম্বর:" }),
                      o.jsx("input", {
                        type: "text",
                        value: accNumber,
                        onChange: function(e) { setAccNumber(e.target.value); },
                        placeholder: isCrypto ? "T... / 0x... ওয়ালেট অ্যাড্রেস" : "017xxxxxxxx",
                        className: "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#00559b] focus:ring-2 focus:ring-blue-100 outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 font-mono"
                      })
                    ]
                  }),

                  // Submit button
                  o.jsx("button", {
                    type: "button",
                    onClick: handleSave,
                    className: "w-full bg-[#00559b] hover:bg-[#00447c] active:scale-98 text-white py-3.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-900/25 flex items-center justify-center gap-2 cursor-pointer mt-2",
                    children: "একাউন্ট যুক্ত করুন"
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
};`;

    code = code.replace(oldSection, newSection + ";\n\n");
    console.log(`[MultiBank] Successfully updated BankAccountSection in ${file}`);
  } else {
    console.warn(`[MultiBank] Markers not found in ${file}`);
  }

  // 3. In Rc (Withdraw submission): ensure activeBank is strictly used for withdraw submission
  const oldRcSubmission = 'bankName:(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":(Be?(Be.charAt(0).toUpperCase()+Be.slice(1)):(activeBank?activeBank.bankType:"Nagad"))),accountHolder:(activeBank?activeBank.accHolder:ye.username),accountNumber:(activeBank?activeBank.accNumber:(activeBank&&activeBank.phone?activeBank.phone:"")),amount:ft,method:(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":(Be||(activeBank?activeBank.bankType:"Nagad")))';
  const newRcSubmission = 'bankName:(activeBank?(activeBank.bankType||activeBank.methodId||"Nagad"):(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":"Nagad")),accountHolder:(activeBank?(activeBank.accHolder||ye.username):ye.username),accountNumber:(activeBank?(activeBank.accNumber||activeBank.phone||""):(activeBank&&activeBank.phone?activeBank.phone:"")),amount:ft,method:(activeBank?(activeBank.methodId||activeBank.bankType||"Nagad"):(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":"Nagad"))';

  if (code.includes(oldRcSubmission)) {
    code = code.replaceAll(oldRcSubmission, newRcSubmission);
    console.log(`[MultiBank] Updated Rc withdrawal submission logic in ${file}`);
  }

  // 4. Update _finalWthMethod in Rc
  const oldFinalMethod = 'const _finalWthMethod=(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":(Be||(activeBank?activeBank.bankType:"Nagad")));';
  const newFinalMethod = 'const _finalWthMethod=(activeBank?(activeBank.bankType||activeBank.methodId||"Nagad"):(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":"Nagad"));';
  if (code.includes(oldFinalMethod)) {
    code = code.replaceAll(oldFinalMethod, newFinalMethod);
    console.log(`[MultiBank] Updated _finalWthMethod logic in ${file}`);
  }

  // Validate syntax
  try {
    acorn.parse(code, { ecmaVersion: 2020 });
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code);
    console.log(`[Success] Successfully saved ${file}`);
  } catch (err) {
    console.error(`[Error] Failed to validate ${file}:`, err.message);
    process.exit(1);
  }
}
