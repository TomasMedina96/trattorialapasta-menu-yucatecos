import { useEffect, useRef, type RefObject } from "react";

export function useReturnToStart(feedRef: RefObject<HTMLDivElement | null>) {
  const cancelRef = useRef<() => void>(() => {});
  useEffect(() => () => cancelRef.current(), []);
  return {
    cancel: () => cancelRef.current(),
    start: () => {
      cancelRef.current();
      const feed = feedRef.current;
      if (!feed) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        feed.scrollTo({ top: 0, behavior: "instant" });
        return;
      }
      const from = feed.scrollTop;
      const duration = Math.max(650, Math.min(2200, from / feed.clientHeight * 90));
      const started = performance.now();
      const previousSnap = feed.style.scrollSnapType;
      feed.style.scrollSnapType = "none";
      let frame = 0;
      const cancel = () => {
        cancelAnimationFrame(frame);
        feed.style.scrollSnapType = previousSnap;
        cancelRef.current = () => {};
      };
      cancelRef.current = cancel;
      const step = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        // Brief acceleration, then a fast, steady return.
        const ramp = 0.15;
        const eased = progress < ramp
          ? progress * progress / (2 * ramp * (1 - ramp / 2))
          : (progress - ramp / 2) / (1 - ramp / 2);
        feed.scrollTo({ top: from * (1 - eased), behavior: "instant" });
        if (progress < 1) frame = requestAnimationFrame(step);
        else cancel();
      };
      frame = requestAnimationFrame(step);
    },
  };
}
