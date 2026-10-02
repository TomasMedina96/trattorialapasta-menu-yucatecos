import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Popup } from '../catalog';
import './admin.css';
export function Announcement({ popup }: { popup: Popup }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dismissed, setDismissed] = useState('');
  const signature = JSON.stringify(popup);
  const title = popup.title.trim();
  useEffect(() => {
    const element = dialog.current;
    if (!popup.enabled || signature === dismissed) {
      element?.close();
      return;
    }
    element?.showModal();
    const timer = window.setTimeout(() => {
      setDismissed(signature);
      element?.close();
    }, 4000);
    return () => {
      window.clearTimeout(timer);
      element?.close();
    };
  }, [signature, dismissed, popup.enabled]);
  return <dialog ref={dialog} className="announcement" onCancel={() => setDismissed(signature)} aria-labelledby={title ? 'announcement-title' : undefined} aria-label={title ? undefined : 'Aviso'}>
    <button className="announcement-close" type="button" autoFocus aria-label="Cerrar aviso" onClick={() => { setDismissed(signature); dialog.current?.close(); }}><X size={30} strokeWidth={3} aria-hidden="true" /></button>
    {title && <h2 id="announcement-title">{title}</h2>}
    {popup.image && <img src={popup.image} alt="" />}
    {popup.message.trim() && <p>{popup.message}</p>}
  </dialog>;
}
