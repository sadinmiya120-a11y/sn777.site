const fs = require('fs');

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File ${filePath} does not exist. Skipping.`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Fix Rf object in signup to never spread ...ve and always initialize clean active state
  // For minified version:
  const targetMinRf = 'Rf={...ve,username:ee,email:Sr,phone:an.phone,password:W,balance:"777.00",totalDeposited:0,parentId:Jt,rewardTier:Jt?1:0,inviteCode:wl(),referralEarnings:0,totalReferrals:0,personalWinRate:50,role:ee.toLowerCase()==="admin"?"admin":"user",registrationDate:new Date().toISOString(),deviceId:ye,lastIp:wd}';
  const replaceMinRf = 'Rf={name:"সম্পূর্ণ নাম",username:ee,email:Sr,phone:an.phone,password:W,birthday:"১৯৯৮/০১/০১",rank:"Bronze",points:0,balance:"777.00",testCoin:0,totalDeposited:0,approvedDepositsCount:0,adminApproved:!1,withdrawEnabled:!1,status:"active",isBlocked:!1,parentId:Jt,rewardTier:Jt?1:0,inviteCode:wl(),referralEarnings:0,totalReferrals:0,personalWinRate:50,role:ee.toLowerCase()==="admin"?"admin":"user",registrationDate:new Date().toISOString(),deviceId:ye,lastIp:wd,lastActive:ac()}';

  if (content.includes(targetMinRf)) {
    content = content.replace(targetMinRf, replaceMinRf);
    modified = true;
    console.log(`[${filePath}] Patched minified Rf object`);
  }

  // For unminified / formatted version:
  const targetBeautifiedRf = `Rf = {
              ...ve,
              username: ee,
              email: Sr,
              phone: wt,
              password: W,
              balance: "777.00",
              totalDeposited: 0,
              parentId: Jt,
              rewardTier: Jt ? 1 : 0,
              inviteCode: wl(),
              referralEarnings: 0,
              totalReferrals: 0,
              personalWinRate: 50,
              role: ee.toLowerCase() === "admin" ? "admin" : "user",
              registrationDate: new Date().toISOString(),
              deviceId: ye,
              lastIp: wd,
            }`;

  const replaceBeautifiedRf = `Rf = {
              name: "সম্পূর্ণ নাম",
              username: ee,
              email: Sr,
              phone: wt,
              password: W,
              birthday: "১৯৯৮/০১/০১",
              rank: "Bronze",
              points: 0,
              balance: "777.00",
              testCoin: 0,
              totalDeposited: 0,
              approvedDepositsCount: 0,
              adminApproved: !1,
              withdrawEnabled: !1,
              status: "active",
              isBlocked: !1,
              parentId: Jt,
              rewardTier: Jt ? 1 : 0,
              inviteCode: wl(),
              referralEarnings: 0,
              totalReferrals: 0,
              personalWinRate: 50,
              role: ee.toLowerCase() === "admin" ? "admin" : "user",
              registrationDate: new Date().toISOString(),
              deviceId: ye,
              lastIp: wd,
              lastActive: ac(),
            }`;

  if (content.includes(targetBeautifiedRf)) {
    content = content.replace(targetBeautifiedRf, replaceBeautifiedRf);
    modified = true;
    console.log(`[${filePath}] Patched beautified Rf object`);
  }

  // 2. Clear modal on signup start and prevent stale disabled modal
  const targetSignupStartMin = '_l=async()=>{var E,L;if(an.username&&an.password&&an.phone)try{xe(!0);';
  const replaceSignupStartMin = '_l=async()=>{var E,L;Fe("");Je(!1);if(an.username&&an.password&&an.phone)try{xe(!0);';

  if (content.includes(targetSignupStartMin)) {
    content = content.replace(targetSignupStartMin, replaceSignupStartMin);
    modified = true;
    console.log(`[${filePath}] Patched minified signup start`);
  }

  const targetSignupStartBeautified = 'const _l = async () => {\n      var E, L;\n      if (an.username && an.password && an.phone)\n        try {\n          xe(!0);';
  const replaceSignupStartBeautified = 'const _l = async () => {\n      var E, L;\n      Fe("");\n      Je(!1);\n      if (an.username && an.password && an.phone)\n        try {\n          xe(!0);';

  if (content.includes(targetSignupStartBeautified)) {
    content = content.replace(targetSignupStartBeautified, replaceSignupStartBeautified);
    modified = true;
    console.log(`[${filePath}] Patched beautified signup start`);
  }

  // 3. Clear modal when logged out in ee()
  const targetLogoutResetMin = 'ss({name:"সম্পূর্ণ নাম",username:"ব্যবহারকারী",birthday:"১৯৯৮/০১/০১",phone:"+880 1XXXXXXXXX",email:"",password:"",rank:"Bronze",points:0,balance:"0.00",testCoin:0,totalDeposited:0,approvedDepositsCount:0,adminApproved:!1,withdrawEnabled:!1})';
  const replaceLogoutResetMin = 'on.removeItem("sn777_cached_profile_full");Fe("");Je(!1);ss({name:"সম্পূর্ণ নাম",username:"ব্যবহারকারী",birthday:"১৯৯৮/০১/০১",phone:"+880 1XXXXXXXXX",email:"",password:"",rank:"Bronze",points:0,balance:"0.00",testCoin:0,totalDeposited:0,approvedDepositsCount:0,adminApproved:!1,withdrawEnabled:!1,status:"active",isBlocked:!1})';

  if (content.includes(targetLogoutResetMin)) {
    content = content.replace(targetLogoutResetMin, replaceLogoutResetMin);
    modified = true;
    console.log(`[${filePath}] Patched minified logout reset`);
  }

  const targetLogoutResetBeautified = `ss({
            name: "সম্পূর্ণ নাম",
            username: "ব্যবহারকারী",
            birthday: "১৯৯৮/০১/০১",
            phone: "+880 1XXXXXXXXX",
            email: "",
            password: "",
            rank: "Bronze",
            points: 0,
            balance: "0.00",
            testCoin: 0,
            totalDeposited: 0,
            approvedDepositsCount: 0,
            adminApproved: !1,
            withdrawEnabled: !1,
          })`;

  const replaceLogoutResetBeautified = `on.removeItem("sn777_cached_profile_full");
          Fe("");
          Je(!1);
          ss({
            name: "সম্পূর্ণ নাম",
            username: "ব্যবহারকারী",
            birthday: "১৯৯৮/০১/০১",
            phone: "+880 1XXXXXXXXX",
            email: "",
            password: "",
            rank: "Bronze",
            points: 0,
            balance: "0.00",
            testCoin: 0,
            totalDeposited: 0,
            approvedDepositsCount: 0,
            adminApproved: !1,
            withdrawEnabled: !1,
            status: "active",
            isBlocked: !1,
          })`;

  if (content.includes(targetLogoutResetBeautified)) {
    content = content.replace(targetLogoutResetBeautified, replaceLogoutResetBeautified);
    modified = true;
    console.log(`[${filePath}] Patched beautified logout reset`);
  }

  // 4. In onAuthStateChanged listener, ensure clean handling when user is disabled vs active
  const targetSyncActiveMin = 'else{e(!0);Je(!1);Fe("")}';
  if (content.includes(targetSyncActiveMin)) {
    console.log(`[${filePath}] targetSyncActiveMin verified`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated ${filePath}`);
  } else {
    console.log(`No changes needed or targets not found for ${filePath}`);
  }
}

patchFile('dist_backup/assets/index-CUhzlpga-v3.js');
patchFile('test_cand.js');
patchFile('dist/assets/index-CUhzlpga-v3.js');
