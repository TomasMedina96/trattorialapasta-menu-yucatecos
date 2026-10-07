import { useEffect, useRef, useState } from 'react';
import { Navbar } from './Navbar';
import './reservations.css';

export function Reservations() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [height, setHeight] = useState(720);
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const value = event.data?.tlpReservasAlto;
      if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 16000) setHeight(Math.ceil(value) + 24);
      if (event.data?.tlpReservasPaso === true) frameRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [moreOpen]);
  return <main className="site-main reservations-page">
    <Navbar active="reservas" moreOpen={moreOpen} onMoreChange={setMoreOpen} onMenuClick={() => window.location.assign('/')} />
    <div className="reservations-page-content" inert={moreOpen} aria-hidden={moreOpen || undefined}>
      <a className="reservations-back" href="/">← Volver al menú</a>
      <iframe ref={frameRef} className="reservations-frame" src="/reservas/index.html" title="Solicitud de reserva de mesa" style={{ height }} />
    </div>
  </main>;
}
