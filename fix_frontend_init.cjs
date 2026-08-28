const fs = require('fs');

const files = ['dist/assets/index-sn777-v5.js', 'dist_backup/assets/index-sn777-v5.js'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // In frontend we changed:
    // fetch(depCh==="gopay"?"/api/gopay-init":"/api/propay-init"
    
    // We should bypass the fetch completely for ProPay, but simplest is just let it fail and fallback, or we can make it bypass if depCh === "propay".
    // Let's replace the whole try block.
    
    const target = 'try{const _initRes=await fetch(depCh==="gopay"?"/api/gopay-init":"/api/propay-init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:gt.currentUser.uid,amount:Number(E),method:Be,goods_name:Be.toUpperCase(),order_no:Te})});const _initData=await _initRes.json();if(_initData&&_initData.success&&_initData.payInfo){window.location.href=_initData.payInfo;fi("");return;}else{throw new Error((_initData&&_initData.error)||"পেমেন্ট গেটওয়ে সমস্যা");}}catch(_initErr){console.warn("Init err:",_initErr);const _fallbackUrl=(depCh==="gopay"?"/gopay_pay.php":"/propay_pay.php")+"?uid="+encodeURIComponent(gt.currentUser.uid)+"&amount="+encodeURIComponent(E)+"&method="+encodeURIComponent(Be)+"&goods_name="+encodeURIComponent(Be.toUpperCase())+"&order_no="+encodeURIComponent(Te);window.location.href=_fallbackUrl;fi("");}';
    
    const bypass = `if(depCh==="propay"){const _fallbackUrl="/propay_pay.php?uid="+encodeURIComponent(gt.currentUser.uid)+"&amount="+encodeURIComponent(E)+"&method="+encodeURIComponent(Be)+"&goods_name="+encodeURIComponent(Be.toUpperCase())+"&order_no="+encodeURIComponent(Te);window.location.href=_fallbackUrl;fi("");return;}try{const _initRes=await fetch("/api/gopay-init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:gt.currentUser.uid,amount:Number(E),method:Be,goods_name:Be.toUpperCase(),order_no:Te})});const _initData=await _initRes.json();if(_initData&&_initData.success&&_initData.payInfo){window.location.href=_initData.payInfo;fi("");return;}else{throw new Error((_initData&&_initData.error)||"পেমেন্ট গেটওয়ে সমস্যা");}}catch(_initErr){console.warn("Init err:",_initErr);const _fallbackUrl="/gopay_pay.php?uid="+encodeURIComponent(gt.currentUser.uid)+"&amount="+encodeURIComponent(E)+"&method="+encodeURIComponent(Be)+"&goods_name="+encodeURIComponent(Be.toUpperCase())+"&order_no="+encodeURIComponent(Te);window.location.href=_fallbackUrl;fi("");}`;
    
    if (content.includes(target)) {
      content = content.replace(target, bypass);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed ' + file);
    }
  }
});
