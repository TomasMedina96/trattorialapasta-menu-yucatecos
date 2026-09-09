import { useEffect, useRef, useState } from "react";
import { type MenuItem } from "./data/menu";
import { discoverItems } from "./discoverOrder";
import { Hand, ArrowUp } from "lucide-react";
import { DiscoverProduct } from "./DiscoverProduct";
import "./discover.css";

export function DiscoverMenu({ onClose, onDetails, modalOpen }: {
  onClose: () => void;
  onDetails: (item: MenuItem) => void;
  modalOpen: boolean;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const introCancelledRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
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
    introCancelledRef.current = true;
    setShowGuide(false);
  };

  useEffect(() => {
    if (modalOpen) {
      introCancelledRef.current = true;
      setShowGuide(false);
      return;
    }
    if (introCancelledRef.current || items.length < 2 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      const feed = feedRef.current;
      if (introCancelledRef.current || document.hidden || !feed || feed.scrollTop > 8) return;
      introCancelledRef.current = true;
      setShowGuide(true);
      feed.scrollTo({ top: feed.clientHeight, behavior: "smooth" });
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [modalOpen, items.length]);

  useEffect(() => {
    if (!showGuide || activeIndex !== 1) return;
    const timer = window.setTimeout(() => setShowGuide(false), 4200);
    return () => window.clearTimeout(timer);
  }, [showGuide, activeIndex]);

  const navigate = (index: number) => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: Math.max(0, Math.min(items.length - 1, index)) * feed.clientHeight,
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
        <button className="discover-back" type="button" ref={backRef} onClick={onClose}>← Volver al menú</button>
      </header>
      <div className="discover-feed" ref={feedRef} tabIndex={0} aria-label="Platillos; usa las flechas arriba y abajo">
        {items.map((item, index) => (
          <div className="discover-slide" key={item.id} data-index={index}>
            <DiscoverProduct item={item} prepared={Math.abs(index - activeIndex) <= 1}
              active={index === activeIndex} onDetails={onDetails} />
          </div>
        ))}
        {!items.length && <p>No hay platillos en esta categoría.</p>}
      </div>
      {showGuide && activeIndex === 1 && !modalOpen && (
        <div className="discover-swipe-guide" aria-hidden="true">
          <ArrowUp className="discover-swipe-arrow" size={30} strokeWidth={2} />
          <Hand className="discover-swipe-hand" size={58} strokeWidth={1.6} />
        </div>
      )}
      <span className="discover-status" role="status" aria-live="polite">
        {items.length ? activeIndex + 1 : 0} de {items.length}
      </span>
    </section>
  );
}
