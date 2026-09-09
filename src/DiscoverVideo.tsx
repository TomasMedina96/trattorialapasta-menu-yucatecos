import { useEffect, useRef, useState } from "react";

import { useTemporaryZoom } from "./useTemporaryZoom";
import { ShareProduct } from "./ShareProduct";
import { formatPrice } from "./menuPresentation";
import { Volume2, VolumeX } from "lucide-react";

export function DiscoverVideo({ active, src, onComplete }: {
  active: boolean;
  src: string;
  onComplete?: () => void;
}) {
  const zoom = useTemporaryZoom<HTMLVideoElement>(active);
  const videoRef = zoom.imageRef;
  const heldRef = useRef(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(false);

  const play = () => {
    const video = videoRef.current;
    if (!video || !active || heldRef.current || document.hidden) return;
    void video.play().then(() => setBlocked(false)).catch(error => {
      if (error.name !== "NotAllowedError" || heldRef.current || document.hidden) return;
      video.muted = true;
      setMuted(true);
      void video.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    heldRef.current = false;
    const syncPlayback = () => {
      if (!active || document.hidden) video.pause();
      else {
        if (video.ended) video.currentTime = 0;
        play();
      }
    };
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      video.pause();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [active, src]);

  const pause = () => {
    heldRef.current = true;
    videoRef.current?.pause();
  };
  const resume = () => {
    heldRef.current = false;
    play();
  };

  return (
    <article className="discover-video" aria-label="Video de Trattoria La Pasta" aria-hidden={!active} inert={!active}>
      <button type="button" className="discover-video-surface" ref={zoom.surfaceRef}
        aria-label="Video de Trattoria La Pasta. Mantén pulsado para pausar; suelta para continuar."
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pause();
        }}
        onPointerUp={resume} onPointerCancel={resume} onLostPointerCapture={resume}
        onContextMenu={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.key === " " || event.key === "Enter") { event.preventDefault(); pause(); }
        }}
        onKeyUp={event => {
          if (event.key === " " || event.key === "Enter") { event.preventDefault(); resume(); }
        }}
        onBlur={resume} onClick={play}>
        <video ref={videoRef} src={src} autoPlay={active} muted={muted} playsInline
          loop={!onComplete} controls={false} disablePictureInPicture
          preload={active ? "auto" : "none"}
          onError={() => setFailed(true)}
          onEnded={() => { if (active && !document.hidden) onComplete?.(); }} />
        {failed ? <span className="discover-video-message">No se pudo cargar el video. Desliza para ver los platillos.</span>
          : blocked ? <span className="discover-video-message">Toca para reproducir</span> : null}
      </button>
      <button type="button" className="discover-video-sound"
        aria-label={muted ? "Activar sonido" : "Silenciar video"}
        onClick={() => {
          const video = videoRef.current;
          if (!video) return;
          video.muted = !video.muted;
          setMuted(video.muted);
          play();
        }}>
        {muted ? <VolumeX aria-hidden="true" size={23} /> : <Volume2 aria-hidden="true" size={23} />}
      </button>
      <div className="discover-copy">
        <div className="discover-title-line"><h2>Pizza Frita Pulcinella</h2>
          <ShareProduct active={active} name="Pizza Frita Pulcinella" path={src} /></div>
        <strong className="discover-price">{formatPrice(365)}</strong>
        <p>Rellena de salsa de tomate, mozzarella fresca, queso provolone, salami italiano</p>
      </div>
    </article>
  );
}
