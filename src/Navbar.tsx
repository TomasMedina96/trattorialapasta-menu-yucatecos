import { ArrowRight, Bike, Clipboard, House, Mail, MoreHorizontal, Newspaper, Utensils, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import './navbar.css';

const website = 'https://trattorialapasta.com';
function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none"><path d="M14 21v-8h3l.5-4H14V7c0-1 .3-1.5 1.5-1.5H18V2.1c-.6-.1-1.9-.1-3-.1-3 0-5 1.8-5 5v2H7v4h3v8z" /></svg>;
}
const links = {
  home: `${website}/?lang=es`,
  reserve: '/reservas',
  orders: 'https://wa.link/wrtxlm',
  blog: `${website}/news/?lang=es`,
  contact: `${website}/contact/?lang=es`,
  facebook: 'https://www.facebook.com/TrattoriaLaPastaMid',
};

export function Navbar({ moreOpen, onMoreChange, onMenuClick, active = 'menu' }: {
  moreOpen: boolean;
  onMoreChange: (open: boolean) => void;
  onMenuClick: () => void;
  active?: 'menu' | 'reservas';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    closeButtonRef.current?.focus({ preventScroll: true });
    const mobile = window.matchMedia('(max-width: 1100px), (max-width: 1400px) and (hover: none) and (pointer: coarse)');
    const closeOnDesktop = () => { if (!mobile.matches) onMoreChange(false); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMoreChange(false);
      if (event.key !== 'Tab') return;
      const controls = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('a[href], button') ?? [])
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    mobile.addEventListener('change', closeOnDesktop);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      mobile.removeEventListener('change', closeOnDesktop);
      window.removeEventListener('keydown', onKeyDown);
      moreButtonRef.current?.focus({ preventScroll: true });
    };
  }, [moreOpen, onMoreChange]);

  const menuLink = (className: string, mobile = false) => (
    <a className={className} href={active === 'menu' ? '#menu' : '/'} aria-current={active === 'menu' ? 'page' : undefined} onClick={event => {
      event.preventDefault(); onMoreChange(false); onMenuClick();
    }}>
      {mobile && <Clipboard aria-hidden="true" />}<span>Menú</span>
    </a>
  );

  return (
    <div className="restaurant-navigation" ref={containerRef}
      role={moreOpen ? 'dialog' : undefined} aria-modal={moreOpen || undefined}
      aria-label={moreOpen ? 'Más opciones de navegación' : undefined}>
      <nav className="desktop-navbar" aria-label="Navegación principal">
        {menuLink('desktop-navbar-link')}
        <a href={links.reserve} aria-current={active === 'reservas' ? 'page' : undefined}>Reserva</a>
        <a className="navbar-brand" href={links.home} aria-label="Inicio de Trattoria La Pasta">
          <img src="/navbar-logo.png" alt="Trattoria La Pasta" width="80" height="80" />
        </a>
        <a href={links.orders}>Pedidos</a>
        <a href={links.blog}>Blog</a>
        <a href={links.contact}>Contáctanos</a>
      </nav>

      {moreOpen && <section className="navbar-more-panel" id="navbar-more-panel" aria-label="Más opciones">
        <button ref={closeButtonRef} className="navbar-more-close" type="button" onClick={() => onMoreChange(false)} aria-label="Cerrar más opciones"><X size={24} /></button>
        <div className="navbar-more-content">
          {[
            { href: links.blog, label: 'Blog de Trattoria', Icon: Newspaper },
            { href: links.contact, label: 'Contáctanos', Icon: Mail },
            { href: links.facebook, label: 'Síguenos', Icon: FacebookIcon },
          ].map(({ href, label, Icon }) => <a className="navbar-more-card" href={href} key={href}>
            <Icon aria-hidden="true" /><span>{label}</span><ArrowRight className="navbar-more-arrow" aria-hidden="true" />
          </a>)}
          <div className="navbar-language-grid" aria-label="Idiomas del sitio principal">
            {[
              [['en', 'English'], ['es', 'Español']], [['it', 'Italiano'], ['fr', 'Français']],
            ].map((languages, index) => <div className="navbar-language-row" key={index}>
              {languages.map(([code, label]) => <a href={`${website}/?lang=${code}`} lang={code} hrefLang={code} key={code}>{label}</a>)}
            </div>)}
          </div>
        </div>
      </section>}

      <nav className="mobile-navbar" aria-label="Navegación principal móvil">
        <a href={links.home}><House aria-hidden="true" /><span>Inicio</span></a>
        <a href={links.reserve} aria-current={active === 'reservas' ? 'page' : undefined}><Utensils aria-hidden="true" /><span>Reserva</span></a>
        {menuLink('mobile-navbar-menu', true)}
        <a href={links.orders}><Bike aria-hidden="true" /><span>Pedidos</span></a>
        <button ref={moreButtonRef} type="button" onClick={() => onMoreChange(!moreOpen)}
          aria-expanded={moreOpen} aria-controls={moreOpen ? 'navbar-more-panel' : undefined} aria-haspopup="dialog">
          <MoreHorizontal aria-hidden="true" /><span>Más</span>
        </button>
      </nav>
    </div>
  );
}
