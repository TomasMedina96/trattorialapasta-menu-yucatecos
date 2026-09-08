import { useEffect, useMemo, useRef, useState } from "react";
import { categories, menuItems, type MenuItem } from "./data/menu";
import { DiscoverProduct } from "./DiscoverProduct";
import "./discover.css";

export function DiscoverMenu({ onClose, onDetails, modalOpen }: {
  onClose: () => void;
  onDetails: (item: MenuItem) => void;
  modalOpen: boolean;
}) {
  const [category, setCategory] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const items = useMemo(() => menuItems.filter(item => !category || item.category === category), [category]);

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

  const navigate = (index: number) => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: Math.max(0, Math.min(items.length - 1, index)) * feed.clientHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return (
    <section className="discover" aria-label="Descubrir platillos" inert={modalOpen}
      onKeyDown={event => {
        if (modalOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); navigate(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
      }}>
      <header className="discover-header">
        <button className="discover-back" type="button" ref={backRef} onClick={onClose}>← Volver al menú</button>
        <span>Descubrir platillos</span>
      </header>
      <nav className="discover-categories" aria-label="Filtrar platillos por categoría">
        {[{ id: "", label: "Todos" }, ...categories].map(option => (
          <button type="button" key={option.id} className={`category-link${category === option.id ? " is-active" : ""}`}
            aria-pressed={category === option.id} onClick={event => {
              setCategory(option.id);
              setActiveIndex(0);
              feedRef.current?.scrollTo({ top: 0, behavior: "instant" });
              event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
            }}>{option.label}</button>
        ))}
      </nav>
      <div className="discover-feed" ref={feedRef} key={category} tabIndex={0} aria-label="Platillos; usa las flechas arriba y abajo">
        {items.map((item, index) => (
          <div className="discover-slide" key={item.id} data-index={index}>
            <DiscoverProduct item={item} prepared={Math.abs(index - activeIndex) <= 1}
              active={index === activeIndex} onDetails={onDetails} />
          </div>
        ))}
        {!items.length && <p>No hay platillos en esta categoría.</p>}
      </div>
      <span className="discover-status" role="status" aria-live="polite">
        {items.length ? activeIndex + 1 : 0} de {items.length}
      </span>
    </section>
  );
}
