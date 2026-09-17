const fs = require("fs");

const files = ["dist/index.html", "dist_backup/index.html"];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Add or update CSS to guarantee full height, full page visibility and top-scrolling behavior
  const fullViewCss = `
    <style id="sn777-full-page-view">
      html, body {
        width: 100% !important;
        min-height: 100% !important;
        min-height: 100dvh !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        scroll-behavior: smooth !important;
      }
      #root {
        width: 100% !important;
        min-height: 100dvh !important;
        height: auto !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: visible !important;
        justify-content: flex-start !important;
        align-items: stretch !important;
      }
      #root > div {
        justify-content: flex-start !important;
        align-items: stretch !important;
        height: auto !important;
        min-height: 100dvh !important;
        overflow-y: visible !important;
        display: block !important; /* Force block to break out of flex centering if needed */
      }
      /* Aggressively target any full-screen flex containers that might be centering */
      .items-center, .justify-center, .h-screen, .min-h-screen {
         align-items: flex-start !important;
         justify-content: flex-start !important;
         height: auto !important;
         min-height: 100vh !important;
      }
    </style>
  `;

  // Script to scroll page to the top from the beginning on load / navigation
  const scrollTopScript = `
    <script type="text/javascript">
      (function() {
        function scrollToBeginning() {
          try {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            if (document.documentElement) document.documentElement.scrollTop = 0;
            if (document.body) document.body.scrollTop = 0;
            
            // Also try finding any scrollable inner containers and reset them
            const scrollables = document.querySelectorAll('*');
            for(let i=0; i<scrollables.length; i++) {
                if (window.getComputedStyle(scrollables[i]).overflowY === 'auto' || window.getComputedStyle(scrollables[i]).overflowY === 'scroll') {
                    scrollables[i].scrollTop = 0;
                }
            }
          } catch(e) {
            window.scrollTo(0, 0);
          }
        }

        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", scrollToBeginning);
        } else {
          scrollToBeginning();
        }

        window.addEventListener("load", scrollToBeginning);
        window.addEventListener("pageshow", scrollToBeginning);
        window.addEventListener("popstate", scrollToBeginning);
        window.addEventListener("hashchange", scrollToBeginning);
        
        // Force aggressive check for first 2 seconds
        let checks = 0;
        let interval = setInterval(function() {
            scrollToBeginning();
            checks++;
            if (checks > 20) clearInterval(interval);
        }, 100);
      })();
    </script>
  `;

  // Replace existing snippet if already present, or inject before </head>
  if (html.includes('id="sn777-full-page-view"')) {
    html = html.replace(/<style id="sn777-full-page-view">[\s\S]*?<\/style>/, fullViewCss.trim());
  } else {
    html = html.replace("</head>", fullViewCss + "\n</head>");
  }

  if (!html.includes("scrollToBeginning")) {
    html = html.replace("</head>", scrollTopScript + "\n</head>");
  }

  fs.writeFileSync(file, html, "utf8");
  console.log("Successfully patched full page view & scroll-to-top in:", file);
});
