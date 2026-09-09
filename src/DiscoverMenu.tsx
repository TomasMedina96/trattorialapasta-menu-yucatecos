import { useEffect, useRef, useState } from "react";
import { type MenuItem } from "./data/menu";
import { discoverItems } from "./discoverOrder";
import { Hand, ArrowUp, Expand } from "lucide-react";
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
  const [showVideoGuide, setShowVideoGuide] = useState(true);
  const introCancelledRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const returnToStart = useReturnToStart(feedRef);
  const backRef = useRef<HTMLButtonElement>(null);
  const items = discoverItems;

  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowVideoGuide(false), 4200);
    return () => window.clearTimeout(timer);
  }, []);

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
    setShowVideoGuide(false);
    if (activeIndex === 0) return;
    introCancelledRef.current = true;
    setShowGuide(false);
  };

  useEffect(() => {
    if (modalOpen) {
      introCancelledRef.current = true;
      setShowGuide(false);
      return;
    }
    // Let the video play; demonstrate scrolling only on the first photo.
    if (activeIndex !== 1 || introCancelledRef.current || items.length < 2 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      const feed = feedRef.current;
      if (introCancelledRef.current || document.hidden || !feed || Math.abs(feed.scrollTop - feed.clientHeight) > 8) return;
      introCancelledRef.current = true;
      setShowGuide(true);
      feed.scrollTo({ top: feed.clientHeight * 2, behavior: "smooth" });
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [modalOpen, items.length, activeIndex]);

  useEffect(() => {
    if (!showGuide || activeIndex !== 2) return;
    const timer = window.setTimeout(() => setShowGuide(false), 4200);
    return () => window.clearTimeout(timer);
  }, [showGuide, activeIndex]);

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
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M20.52 3.48A11.9 11.9 0 0 0 12.05 0C5.47 0 .11 5.35.1 11.94c0 2.1.55 4.16 1.6 5.97L0 24l6.26-1.64a11.96 11.96 0 0 0 5.78 1.47h.01c6.58 0 11.94-5.35 11.95-11.94a11.87 11.87 0 0 0-3.48-8.41ZM12.05 21.8a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.9 9.9 0 0 1-1.52-5.25c0-5.47 4.45-9.92 9.92-9.92a9.85 9.85 0 0 1 7.01 2.91 9.86 9.86 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.93 9.92Zm5.44-7.43c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.11 4.52.71.3 1.27.49 1.7.62.71.23 1.36.2 1.88.12.57-.09 1.77-.73 2.02-1.43.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.34Z" />
            </svg>
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
          <DiscoverVideo src="/videos/trattoria-intro.mp4" active={activeIndex === 0 && !modalOpen}
            onComplete={items.length ? () => navigate(1) : undefined} />
        </div>
        {items.map((item, index) => (
          <div className="discover-slide" key={item.id} data-index={index + 1}>
            <DiscoverProduct item={item} prepared={Math.abs(index + 1 - activeIndex) <= 1}
              active={index + 1 === activeIndex} onDetails={onDetails} />
          </div>
        ))}
        {!items.length && <p>No hay platillos en esta categoría.</p>}
      </div>
      {((showVideoGuide && activeIndex === 0) || (showGuide && activeIndex === 2)) && !modalOpen && (
        <div className="discover-swipe-guide" aria-hidden="true">
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
