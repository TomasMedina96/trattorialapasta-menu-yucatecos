import { useEffect, useRef, useState } from 'react';
import { api } from '../catalog';
import '../reservations.css';

type Status = 'pendiente' | 'aceptada' | 'rechazada';
type Reservation = {
  id: string; creado: string; fecha: string; hora: string; pax: number; mesa: string; zona: string;
  nombre: string; telefono: string; email: string; comentarios: string; estado: Status;
  aviso: { estado: 'pendiente' | 'enviado'; intentos: number };
  conflictos: { id: string; hora: string; estado: Status }[];
};
type Snapshot = { solicitudes: Reservation[]; correoConfigurado: boolean; correoModo: 'smtp' | 'https' | 'gmail-api' | null; config: { pausado: boolean; mensaje: string; bloqueos: { fecha: string; motivo: string }[] } };
const prettyDate = (value: string) => new Date(value + 'T12:00:00Z').toLocaleDateString('es-MX', { timeZone: 'America/Merida', weekday: 'long', day: 'numeric', month: 'long' });
function responseText(r: Reservation, accept: boolean) {
  const name = r.nombre.split(' ')[0];
  return accept ? `Hola ${name}! Te confirmamos tu reserva en Trattoria La Pasta:\n📅 ${prettyDate(r.fecha)} a las ${r.hora} h\n👥 ${r.pax} ${r.pax === 1 ? 'persona' : 'personas'}\n📍 Mesa ${r.mesa} · ${r.zona}\n\nTe esperamos en Paseo de Montejo. Mantenemos la mesa 10 minutos después de la hora reservada; pasado ese tiempo se libera.\n¡Grazie! 🇮🇹`
    : `Hola ${name}, gracias por tu solicitud para el ${prettyDate(r.fecha)} a las ${r.hora} h.\nLamentablemente no tenemos disponible la mesa ${r.mesa} en ese horario. Si querés, respondé este mensaje con otra hora u otra mesa y lo revisamos.\nUn saludo, Trattoria La Pasta`;
}

export function ReservationsManager() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('pendiente');
  const [search, setSearch] = useState('');
  const [pauseMessage, setPauseMessage] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const initialized = useRef(false);
  async function load() {
    const result = await api<Snapshot>('reservations/manage');
    setData(result);
    if (!initialized.current) { setPauseMessage(result.config.mensaje); initialized.current = true; }
  }
  useEffect(() => {
    void load().catch(e => setError(e.message));
    const timer = window.setInterval(() => { void load().catch(e => setError(e.message)); }, 30000);
    return () => window.clearInterval(timer);
  }, []);
  async function action(payload: Record<string, unknown>, success: string) {
    setBusy(true); setError(''); setMessage('');
    try { await api('reservations/manage', { method: 'POST', body: JSON.stringify(payload) }); await load(); setMessage(success); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Merida', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const list = data?.solicitudes.filter(r => (filter === 'todas' || (filter === 'proximas' ? r.estado === 'aceptada' && r.fecha >= today : r.estado === filter)) && `${r.nombre} ${r.telefono} ${r.fecha} ${r.mesa}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  if (filter === 'proximas') list?.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  return <section className="reservation-manager">
    <h2>Reservas</h2><p>Solicitudes de mesa · Las respuestas al cliente se envían manualmente. Después de enviar el mensaje, marca el estado.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {message && <p className="admin-success" role="status">{message}</p>}
    {!data ? <p>Cargando solicitudes…</p> : <>
      {!data.correoConfigurado && <p className="admin-error">El envío de avisos todavía no está configurado en el servidor. Las solicitudes se guardan y sus avisos quedan pendientes.</p>}
      {data.correoConfigurado && <p>Envío de avisos: {data.correoModo === 'gmail-api' ? 'Gmail API por HTTPS' : data.correoModo === 'https' ? 'Gmail por HTTPS' : 'Gmail por SMTP'}. <button disabled={busy} onClick={() => void action({ action: 'verificar-correo' }, 'Conexión y autorización de correo verificadas. Esta comprobación no envía correos.')}>Comprobar conexión con Gmail</button></p>}
      <div className="reservation-toolbar">
        <label>Mostrar solicitudes<select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="pendiente">Pendientes ({data.solicitudes.filter(r => r.estado === 'pendiente').length})</option>
          <option value="proximas">Próximas confirmadas</option><option value="rechazada">Rechazadas</option><option value="todas">Todas</option>
        </select></label>
        <label>Buscar reserva<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre, fecha, teléfono o mesa" /></label>
        <button disabled={busy} onClick={() => { void load().catch(e => setError(e.message)); }}>Actualizar</button>
      </div>
      <div className="reservation-list">
        {list?.map(r => <article key={r.id} className="reservation-card" data-status={r.estado}>
          <h3>{prettyDate(r.fecha)} · {r.hora} h</h3>
          <p><strong>{r.pax} personas · Mesa {r.mesa} · {r.zona}</strong></p>
          <p>{r.nombre} · +{r.telefono} · {r.email}</p>
          {r.comentarios && <p>Comentarios: {r.comentarios}</p>}
          <p>Estado: <strong>{r.estado}</strong> · Aviso al restaurante: {r.aviso.estado === 'enviado' ? 'enviado' : 'pendiente de envío'}</p>
          {r.conflictos.length > 0 && <p className="reservation-conflict">Atención: misma mesa a menos de dos horas: {r.conflictos.map(c => `${c.hora} (${c.estado})`).join(', ')}.</p>}
          <details><summary>Ver mesa en el plano</summary><img className="reservation-map" src={`/reservas/mapa/${encodeURIComponent(r.mesa)}.png`} alt={`Plano de la mesa ${r.mesa}`} loading="lazy" /></details>
          <div className="reservation-actions">
            {[true, false].map(accept => {
              const text = responseText(r, accept), subject = accept ? 'Reserva confirmada · Trattoria La Pasta' : 'Sobre tu solicitud de reserva';
              return <span key={String(accept)} className="reservation-actions">
                <a href={`https://wa.me/${r.telefono}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">{accept ? 'Aceptar' : 'Rechazar'} por WhatsApp</a>
                <a href={`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}>{accept ? 'Aceptar' : 'Rechazar'} por correo</a>
              </span>;
            })}
          </div>
          <div className="reservation-actions">
            {(['aceptada', 'rechazada', 'pendiente'] as const).map(status => <button key={status} disabled={busy || status === r.estado} onClick={() => {
              const overlap = status === 'aceptada' && r.conflictos.some(c => c.estado === 'aceptada');
              if (overlap && !window.confirm('Ya hay una reserva aceptada para esta mesa a menos de dos horas. ¿Confirmar también esta solicitud?')) return;
              void action({ action: 'estado', id: r.id, estado: status, confirmOverlap: overlap }, `Solicitud marcada como ${status}.`);
            }}>Marcar {status}</button>)}
            {r.aviso.estado !== 'enviado' && <button disabled={busy || !data.correoConfigurado} onClick={() => void action({ action: 'reintentar', id: r.id }, 'Aviso programado para reintentar el envío.')}>Reintentar aviso</button>}
          </div>
          <small>{r.id}</small>
        </article>)}
        {!list?.length && <p>No hay solicitudes con estos filtros.</p>}
      </div>
      <fieldset disabled={busy} className="admin-fieldset reservation-settings">
        <section className="admin-panel"><h3>Pausar solicitudes</h3><p>{data.config.pausado ? 'Las reservas están en pausa.' : 'El formulario está activo.'}</p>
          <label>Mensaje de pausa<textarea maxLength={500} value={pauseMessage} onChange={e => setPauseMessage(e.target.value)} /></label>
          <div className="reservation-actions"><button onClick={() => void action({ action: 'pausa', pausado: !data.config.pausado, mensaje: pauseMessage }, 'Disponibilidad actualizada.')}>{data.config.pausado ? 'Reactivar reservas' : 'Pausar reservas'}</button>
            <button onClick={() => void action({ action: 'pausa', pausado: data.config.pausado, mensaje: pauseMessage }, 'Mensaje guardado.')}>Guardar mensaje</button></div>
        </section>
        <section className="admin-panel"><h3>Bloquear fechas</h3><p>Viernes, sábado y domingo ya están excluidos por las reglas.</p>
          <label>Fecha a bloquear<input type="date" min={today} value={blockDate} onChange={e => setBlockDate(e.target.value)} /></label>
          <label>Motivo del bloqueo<input maxLength={200} value={blockReason} onChange={e => setBlockReason(e.target.value)} /></label>
          <button disabled={!blockDate} onClick={() => void action({ action: 'bloquear', fecha: blockDate, motivo: blockReason }, 'Fecha bloqueada.')}>Bloquear fecha</button>
          {data.config.bloqueos.filter(b => b.fecha >= today).sort((a,b) => a.fecha.localeCompare(b.fecha)).map(b => <p key={b.fecha}>{prettyDate(b.fecha)} · {b.motivo} <button onClick={() => void action({ action: 'desbloquear', fecha: b.fecha }, 'Fecha desbloqueada.')}>Desbloquear</button></p>)}
        </section>
      </fieldset>
    </>}
  </section>;
}
