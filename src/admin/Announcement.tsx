import { useEffect, useRef, useState } from 'react';
import type { Popup } from '../catalog';
import './admin.css';
export function Announcement({ popup }: { popup: Popup }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dismissed, setDismissed] = useState('');
  const signature = JSON.stringify(popup);
  useEffect(() => {
    if (popup.enabled && signature !== dismissed) dialog.current?.showModal();
    else dialog.current?.close();
  }, [signature, dismissed, popup.enabled]);
  return <dialog ref={dialog} className="announcement" onCancel={() => setDismissed(signature)} aria-labelledby="announcement-title">
    {popup.image && <img src={popup.image} alt="" />}
    <h2 id="announcement-title">{popup.title}</h2><p>{popup.message}</p>
    <button autoFocus onClick={() => { setDismissed(signature); dialog.current?.close(); }}>Continuar al menú</button>
  </dialog>;
}
