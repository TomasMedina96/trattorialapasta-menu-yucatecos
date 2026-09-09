import { useEffect, useRef, useState } from "react";
import { type MenuItem } from "./data/menu";
import { discoverItems } from "./discoverOrder";
import { Hand, ArrowUp, Expand } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { DiscoverProduct } from "./DiscoverProduct";
import { DiscoverVideo } from "./DiscoverVideo";
import "./discover.css";
import { useReturnToStart } from "./useReturnToStart";

export function DiscoverMenu({ onClose, onDetails, modalOpen }: {
  onClose: () => void;
  onDetails: (item: MenuItem) => void;
  modalOpen: boolean;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const returnToStart = useReturnToStart(feedRef);
  const backRef = useRef<HTMLButtonElement>(null);
  const items = discoverItems;

  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);


  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting && entry.intersectionRatio >= 0.6);
      if (visible) {
        const focusedSlide = document.activeElement?.closest(".discover-slide");
        if (focusedSlide && focusedSlide !== visible.target) feed.focus({ preventScroll: true });
        setActiveIndex(Number((visible.target as HTMLElement).dataset.index));
      }
    }, { root: feed, threshold: [0.6] });
    Array.from(feed.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, [items]);

  const cancelIntro = () => {
    returnToStart.cancel();
    setShowGuide(false);
  };

  useEffect(() => {
    if (modalOpen) {
      setShowGuide(false);
      return;
    }
    if (activeIndex !== 0 || items.length < 1) return;
    let timer: number | undefined;
    const scheduleAdvance = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        const feed = feedRef.current;
        if (!feed) return;
        feed.scrollTo({ top: feed.clientHeight,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      }, 4000);
    };
    scheduleAdvance();
    document.addEventListener("visibilitychange", scheduleAdvance);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", scheduleAdvance);
    };
  }, [modalOpen, items.length, activeIndex]);

  useEffect(() => {
    if (modalOpen || activeIndex !== 1) return;
    setShowGuide(true);
    const timer = window.setTimeout(() => setShowGuide(false), 4000);
    return () => window.clearTimeout(timer);
  }, [modalOpen, activeIndex]);

  const navigate = (index: number) => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: Math.max(0, Math.min(items.length, index)) * feed.clientHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return (
    <section className="discover" aria-label="Descubrir platillos" inert={modalOpen}
      onPointerDownCapture={cancelIntro} onTouchStartCapture={cancelIntro} onWheelCapture={cancelIntro}
      onKeyDown={event => {
        cancelIntro();
        if (modalOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); navigate(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
      }}>
      <header className="discover-header">
        <div className="discover-header-actions">
          <a className="discover-reserve" href="https://wa.link/v43rqq" target="_blank" rel="noreferrer">
            <WhatsAppIcon />
            Reservar mesa
          </a>
          <button className="discover-back" type="button" ref={backRef} onClick={onClose}>Ver el menú</button>
        </div>
        {activeIndex > 0 && (
          <button className="discover-back discover-home" type="button"
            aria-label="Volver al inicio, al video de Pizza Frita Pulcinella"
            onClick={() => {
              cancelIntro();
              returnToStart.start();
              backRef.current?.focus({ preventScroll: true });
            }}><ArrowUp aria-hidden="true" size={24} /></button>
        )}
      </header>
      {activeIndex > 0 && items[activeIndex - 1] && (
        <button className="discover-detail-fixed" type="button" aria-haspopup="dialog"
          aria-label={`Ver detalles de ${items[activeIndex - 1].name}`}
          onClick={() => { cancelIntro(); onDetails(items[activeIndex - 1]); }}>
          <Expand aria-hidden="true" size={24} strokeWidth={1.6} />
        </button>
      )}
      <div className="discover-feed" ref={feedRef} tabIndex={0} aria-label="Platillos; usa las flechas arriba y abajo">
        <div className="discover-slide" data-index={0}>
          <DiscoverVideo src="/videos/trattoria-intro.mp4" active={activeIndex === 0 && !modalOpen} onDetails={onDetails} />
        </div>
        {items.map((item, index) => (
          <div className="discover-slide" key={item.id} data-index={index + 1}>
            <DiscoverProduct item={item} prepared={Math.abs(index + 1 - activeIndex) <= 1}
              active={index + 1 === activeIndex} onDetails={onDetails} />
          </div>
        ))}
        {!items.length && <p>No hay platillos en esta categoría.</p>}
      </div>
      {(activeIndex === 0 || (showGuide && activeIndex === 1)) && !modalOpen && (
        <div className={`discover-swipe-guide${activeIndex === 0 ? " discover-swipe-repeat" : ""}`} key={activeIndex} aria-hidden="true">
          <ArrowUp className="discover-swipe-arrow" size={30} strokeWidth={2} />
          <Hand className="discover-swipe-hand" size={58} strokeWidth={1.6} />
        </div>
      )}
      <span className="discover-status" role="status" aria-live="polite">
        {activeIndex === 0 ? "Video de Trattoria La Pasta" : `Platillo ${activeIndex} de ${items.length}`}
      </span>
    </section>
  );
}
