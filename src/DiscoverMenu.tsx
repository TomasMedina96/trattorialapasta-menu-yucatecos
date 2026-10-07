import { useEffect, useMemo, useRef, useState } from "react";
import { type MenuItem } from "./data/menu";
import { buildDiscoverSlides } from "./discoverOrder";
import type { NewsEntry } from './catalog';
import { Hand, ArrowUp, Expand } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { DiscoverProduct } from "./DiscoverProduct";
import { DiscoverVideo } from "./DiscoverVideo";
import { DiscoverImage } from './DiscoverImage';
import "./discover.css";
import { useReturnToStart } from "./useReturnToStart";

export function DiscoverMenu({ onClose, onDetails, modalOpen, products, available, entries }: {
  products: MenuItem[];
  available: MenuItem[];
  entries: NewsEntry[];
  onClose: () => void;
  onDetails: (item: MenuItem) => void;
  modalOpen: boolean;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const returnToStart = useReturnToStart(feedRef);
  const backRef = useRef<HTMLButtonElement>(null);
  const slides = useMemo(() => buildDiscoverSlides(available, products, entries), [available, products, entries]);
  const currentItem = slides[activeIndex]?.item;
  const startsWithVideo = slides[0]?.type === 'video';

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
  }, [slides]);

  const cancelIntro = () => {
    returnToStart.cancel();
    setShowGuide(false);
  };

  useEffect(() => {
    if (modalOpen) {
      setShowGuide(false);
      return;
    }
    if (!startsWithVideo || activeIndex !== 0 || slides.length < 2) return;
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
  }, [modalOpen, slides.length, activeIndex, startsWithVideo]);

  useEffect(() => {
    if (modalOpen || activeIndex !== 1) return;
    setShowGuide(true);
    const timer = window.setTimeout(() => setShowGuide(false), 4000);
    return () => window.clearTimeout(timer);
  }, [modalOpen, activeIndex]);

  const navigate = (index: number) => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: Math.max(0, Math.min(slides.length - 1, index)) * feed.clientHeight,
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
          <a className="discover-reserve" href="/reservas">
            <WhatsAppIcon />
            Reservar mesa
          </a>
          <button className="discover-back" type="button" ref={backRef} onClick={onClose}>Ver el menú</button>
        </div>
        {activeIndex > 0 && (
          <button className="discover-back discover-home" type="button"
            aria-label="Volver al inicio de novedades"
            onClick={() => {
              cancelIntro();
              returnToStart.start();
              backRef.current?.focus({ preventScroll: true });
            }}><ArrowUp aria-hidden="true" size={24} /></button>
        )}
      </header>
      {currentItem && (
        <button className="discover-detail-fixed" type="button" aria-haspopup="dialog"
          aria-label={`Ver detalles de ${currentItem.name}`}
          onClick={() => { cancelIntro(); onDetails(currentItem); }}>
          <Expand aria-hidden="true" size={24} strokeWidth={1.6} />
        </button>
      )}
      <div className="discover-feed" ref={feedRef} tabIndex={0} aria-label="Platillos; usa las flechas arriba y abajo">
        {!slides.length && <div className="discover-slide" data-index={0}><p>No hay novedades por ahora. Vuelve pronto.</p></div>}
        {slides.map((slide, index) => (
          <div className="discover-slide" key={slide.id} data-index={index}>
            {slide.type === 'video' ? <DiscoverVideo src={slide.src} title={slide.title} videoItem={slide.item} active={index === activeIndex && !modalOpen} onDetails={onDetails} />
              : slide.item ? <DiscoverProduct item={slide.item} image={slide.custom ? slide.src : undefined} title={slide.custom ? slide.title : undefined} prepared={Math.abs(index - activeIndex) <= 1}
                active={index === activeIndex && !modalOpen} onDetails={onDetails} />
              : <DiscoverImage src={slide.src} title={slide.title} prepared={Math.abs(index - activeIndex) <= 1} active={index === activeIndex && !modalOpen} />}
          </div>
        ))}
      </div>
      {slides.length > 1 && (activeIndex === 0 || (showGuide && activeIndex === 1)) && !modalOpen && (
        <div className={`discover-swipe-guide${activeIndex === 0 ? " discover-swipe-repeat" : ""}`} key={activeIndex} aria-hidden="true">
          <ArrowUp className="discover-swipe-arrow" size={30} strokeWidth={2} />
          <Hand className="discover-swipe-hand" size={58} strokeWidth={1.6} />
        </div>
      )}
      <span className="discover-status" role="status" aria-live="polite">
        {slides.length ? `Novedad ${activeIndex + 1} de ${slides.length}` : 'Sin novedades'}
      </span>
    </section>
  );
}
