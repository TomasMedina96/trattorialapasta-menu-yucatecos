import { useEffect, useRef, useState } from "react";
import { Forward, Link, X } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function ShareProduct({ name, path, active = true }: { name: string; path: string; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const feed = triggerRef.current?.closest(".discover-feed");
    if (!feed) return;
    // No focus restoration: preserve the user's scroll gesture.
    const dismiss = () => setOpen(false);
    feed.addEventListener("scroll", dismiss, { passive: true });
    feed.addEventListener("wheel", dismiss, { passive: true });
    feed.addEventListener("touchmove", dismiss, { passive: true });
    return () => {
      feed.removeEventListener("scroll", dismiss);
      feed.removeEventListener("wheel", dismiss);
      feed.removeEventListener("touchmove", dismiss);
    };
  }, [open]);
  const url = new URL(path, window.location.href).href;
  const text = `${name} · Trattoria La Pasta`;
  // Facebook shares a web page, rather than the raw MP4 resource.
  const facebookUrl = new URL(url);
  if (/\.mp4$/i.test(facebookUrl.pathname)) {
    facebookUrl.pathname = window.location.pathname;
    facebookUrl.search = "?novedades=1";
    facebookUrl.hash = "";
  }
  const facebookShareUrl = "https://www.facebook.com/sharer/sharer.php?" +
    new URLSearchParams({ u: facebookUrl.href, display: "popup" }).toString();
  const close = () => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); };
  return (
    <div className="discover-share">
      <button ref={triggerRef} className={`discover-share-button${active ? " is-share-active" : ""}`} type="button"
        aria-label={`Compartir ${name}`} aria-expanded={open} onClick={() => { setOpen(!open); }}>
        <span className="share-symbols" aria-hidden="true">
          <span className="share-blue"><Link size={25} strokeWidth={2.5} /></span>
          <span className="share-white"><Forward size={28} strokeWidth={2} /></span>
        </span>
        <span>Compartir</span>
      </button>
      {open && active && <div className="discover-share-options" role="group" aria-label="Compartir platillo"
        onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
        <div className="share-panel-heading"><strong>Compartir</strong><button type="button" aria-label="Cerrar opciones" onClick={close}><X size={20} /></button></div>
        <div className="share-networks">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer"><span className="social-icon social-whatsapp"><WhatsAppIcon /></span>WhatsApp</a>
          <a href={facebookShareUrl} target="_blank" rel="noreferrer"
            onClick={event => {
              // Open the final share URL directly during the click, without
              // redirecting an intermediate blank window on mobile Safari.
              const popup = window.open(facebookShareUrl, "_blank", "popup,width=640,height=620");
              if (popup) {
                event.preventDefault();
                popup.opener = null;
              }
            }}><span className="social-icon social-facebook"><svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 21v-8h3l.5-4H14V7c0-1.2.3-2 2-2h2V1.4A25 25 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v8Z" /></svg></span>Facebook</a>

        </div>
      </div>}
    </div>
  );
}
