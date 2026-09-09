import { useEffect, useState, type RefObject } from "react";
import { ChevronDown } from "lucide-react";

export function ProductDialogMore({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const update = () => setHasMore(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 8);
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    scroller.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); scroller.removeEventListener("scroll", update); };
  }, [scrollRef]);

  return (
    <div className="product-dialog-more-bar">
      <button className="product-dialog-more" type="button" disabled={!hasMore}
        style={{ visibility: hasMore ? "visible" : "hidden" }}
        onClick={() => {
          const scroller = scrollRef.current;
          scroller?.scrollBy({ top: scroller.clientHeight * 0.8,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        }}>
        Ver más <ChevronDown aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
