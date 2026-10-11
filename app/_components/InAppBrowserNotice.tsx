// Messenger, Facebook, Instagram зэрэг аппын дотоод браузерт сайт
// хар дэлгэц болж гацдаг тул Safari / Chrome дээр нээхийг санал болгоно.
// React ачаалагдаагүй байсан ч ажиллахаар энгийн HTML + inline script ашиглана.

const script = `(function(){try{
var ua=navigator.userAgent||"";
if(!/FBAN|FBAV|FB_IAB|FBIOS|Messenger|MessengerForiOS|Instagram|Line\\/|KAKAOTALK|Snapchat|TikTok|musical_ly/i.test(ua))return;
var el=document.getElementById("inapp-notice");if(!el)return;
var url=location.href;var ios=/iPhone|iPad|iPod/i.test(ua);
var open=document.getElementById("inapp-open");
if(ios){open.href="x-safari-"+url;open.textContent="Safari дээр нээх";}
else{open.href="intent://"+url.replace(/^https?:\\/\\//,"")+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(url)+";end";open.textContent="Chrome дээр нээх";}
document.getElementById("inapp-copy").onclick=function(){
var b=this;function done(){b.textContent="Хуулагдлаа ✓";}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(done,function(){prompt("Линкийг хуулна уу:",url);});}
else{prompt("Линкийг хуулна уу:",url);}
};
document.getElementById("inapp-close").onclick=function(){el.style.display="none";};
el.style.display="block";
}catch(e){}})();`;

const btn: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 800,
  textAlign: "center",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

export default function InAppBrowserNotice() {
  return (
    <>
      <div
        id="inapp-notice"
        suppressHydrationWarning
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2147483647,
          padding: "calc(env(safe-area-inset-top) + 12px) 16px 14px",
          background: "#111827",
          color: "#f9fafb",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          fontFamily: "-apple-system, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: 560, margin: "0 auto" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>⚠️ Messenger дотор сайт бүрэн ажиллахгүй</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
              Safari эсвэл Chrome дээр нээнэ үү. Болохгүй бол баруун дээд/доод талын ⋯ цэснээс
              &quot;Open in browser / Safari-д нээх&quot;-ийг дарна уу.
            </p>
          </div>
          <button
            id="inapp-close"
            aria-label="Хаах"
            style={{ background: "transparent", border: "none", color: "#9ca3af", fontSize: 18, padding: 4 }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, maxWidth: 560, margin: "10px auto 0" }}>
          <a id="inapp-open" href="#" style={{ ...btn, background: "#22c55e", color: "#052e16" }}>
            Браузер дээр нээх
          </a>
          <button id="inapp-copy" type="button" style={{ ...btn, background: "#374151", color: "#f9fafb" }}>
            Линк хуулах
          </button>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}
