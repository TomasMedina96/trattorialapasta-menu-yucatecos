import { useEffect, useRef } from "react";

export function useTemporaryZoom(active: boolean) {
  const surfaceRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !active) return;
    let initialDistance = 0;
    const distance = (touches: TouchList) => Math.hypot(
      touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const reset = () => {
      initialDistance = 0;
      const image = imageRef.current;
      if (image) {
        image.style.transition = "transform 220ms ease-out";
        image.style.transform = "scale(1)";
      }
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length === 1) suppressClick.current = false;
      if (event.touches.length !== 2) return;
      event.preventDefault();
      suppressClick.current = true;
      initialDistance = distance(event.touches);
      const image = imageRef.current;
      if (image) {
        const bounds = image.getBoundingClientRect();
        image.style.transformOrigin = `${(event.touches[0].clientX + event.touches[1].clientX) / 2 - bounds.left}px ${(event.touches[0].clientY + event.touches[1].clientY) / 2 - bounds.top}px`;
        image.style.transition = "none";
      }
    };
    const move = (event: TouchEvent) => {
      if (!initialDistance || event.touches.length !== 2) return;
      event.preventDefault();
      if (imageRef.current) imageRef.current.style.transform = `scale(${Math.max(1, Math.min(3, distance(event.touches) / initialDistance))})`;
    };
    surface.addEventListener("touchstart", start, { passive: false });
    surface.addEventListener("touchmove", move, { passive: false });
    surface.addEventListener("touchend", reset);
    surface.addEventListener("touchcancel", reset);
    return () => {
      reset();
      surface.removeEventListener("touchstart", start);
      surface.removeEventListener("touchmove", move);
      surface.removeEventListener("touchend", reset);
      surface.removeEventListener("touchcancel", reset);
    };
  }, [active]);
  return { surfaceRef, imageRef, suppressClick };
}
