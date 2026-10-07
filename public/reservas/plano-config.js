/* Dibuja el plano en un contenedor.
   estadoFn(mesa) → { cls: "libre"|"apagada"|"sel"|"resaltada"|"neutra", tip }
   onClick(id)    → opcional */
window.dibujarPlano = function (container, estadoFn, onClick, opts) {
  const P = window.PLANO; opts = Object.assign({ labels: true, zona: null }, opts || {});
  const zonas = opts.zona ? P.zonas.filter(z => z.id === opts.zona) : P.zonas;
  const mesas = opts.zona ? P.mesas.filter(m => m.zona === opts.zona) : P.mesas;
  let vb = `0 0 ${P.W} ${P.H}`;
  if (opts.zona) { const z = zonas[0]; vb = `${z.x-8} ${z.y-34} ${z.w+16} ${z.h+44}`; }
  let s = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de mesas">`;
  if (!opts.zona) {
    s += `<rect x="0" y="0" width="${P.W}" height="40" fill="#1f4d3a"/>`;
    s += `<text x="${P.W/2}" y="26" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="#f6f1e7">PASEO DE MONTEJO</text>`;
  } else {
    const z = zonas[0];
    s += `<rect x="${z.x-8}" y="${z.y-34}" width="${z.w+16}" height="26" rx="8" fill="#1f4d3a"/>`;
    s += `<text x="${z.x+z.w/2}" y="${z.y-16}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="2.5" fill="#f6f1e7">▲ PASEO DE MONTEJO</text>`;
  }
  zonas.forEach(z => {
    s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="16" fill="${z.color}" stroke="#d9d0bf" stroke-width="1.5"/>`;
    s += `<text x="${z.x+16}" y="${z.y+26}" font-family="'Playfair Display',Georgia,serif" font-size="17" font-weight="700" fill="#1f4d3a">${z.nombre}</text>`;
    s += `<text x="${z.x+16}" y="${z.y+43}" font-family="Inter,Arial,sans-serif" font-size="10.5" fill="#6b645a">${z.desc}</text>`;
    (z.extras || []).forEach(e => {
      if (e.t === "line")  s += `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="#c9c0ae" stroke-width="2" stroke-dasharray="6 5"/>`;
      if (e.t === "label") s += `<text x="${e.x}" y="${e.y}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="600" fill="#b8372a">${e.txt}</text>`;
      if (e.t === "barra") s += `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="6" fill="#5a4634" opacity=".85"/>` + (e.w > 60 ? `<text x="${e.x+e.w/2}" y="${e.y+e.h/2+4}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#f6f1e7">BARRA</text>` : "");
      if (e.t === "arbol") s += `<circle cx="${e.x}" cy="${e.y}" r="${e.r}" fill="#7fa36b" stroke="#4f7a3e" stroke-width="2"/><circle cx="${e.x-5}" cy="${e.y-4}" r="${e.r*0.5}" fill="#9cbf87" opacity=".8"/>`;
    });
  });
  mesas.forEach(m => {
    const st = estadoFn(m);
    s += `<g class="mesa ${st.cls}" data-id="${m.id}" tabindex="0"><title>Mesa ${m.id} · ${m.cap} personas${st.tip ? " · " + st.tip : ""}</title>`;
    if (m.forma === "circle")       s += `<circle cx="${m.x}" cy="${m.y}" r="${m.r}"/>`;
    else if (m.forma === "diamond") s += `<rect x="${m.x - m.r*0.72}" y="${m.y - m.r*0.72}" width="${m.r*1.44}" height="${m.r*1.44}" rx="6" transform="rotate(45 ${m.x} ${m.y})"/>`;
    else                            s += `<rect x="${m.x - m.w/2}" y="${m.y - m.h/2}" width="${m.w}" height="${m.h}" rx="10"/>`;
    s += sillas(m);
    if (opts.labels) {
      const big = m.id.length > 2 ? 11.5 : 13;
      s += `<text class="lbl" x="${m.x}" y="${m.y+1}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${big}" font-weight="700">${m.id}</text>`;
      s += `<text class="cap" x="${m.x}" y="${m.y+14}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="9">${m.cap} pers.</text>`;
    }
    if (m.vista) s += sol(m);
    s += `</g>`;
  });
  s += `</svg>`;
  container.innerHTML = s;
  if (onClick) container.querySelectorAll(".mesa").forEach(g => {
    g.addEventListener("click", () => { if (container._arrastrado) return; onClick(g.dataset.id); });
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(g.dataset.id); } });
  });
};

/* Zoom y desplazamiento táctil (pellizco / arrastre) sobre un contenedor que envuelve al plano.
   wrap = elemento con overflow hidden; inner = hijo que recibe el transform. */
window.activarZoom = function (wrap, inner, controles) {
  const Z = { s: 1, tx: 0, ty: 0, min: 1, max: 4 };
  const ptrs = new Map(); let startDist = 0, startS = 1, startMid = null, startT = null, moved = 0;
  function aplicar() { Z.tx = Math.min(0, Math.max(Z.tx, wrap.clientWidth - inner.offsetWidth * Z.s)); Z.ty = Math.min(0, Math.max(Z.ty, wrap.clientHeight - inner.offsetHeight * Z.s)); if (Z.s === 1) { Z.tx = 0; Z.ty = 0; } inner.style.transform = `translate(${Z.tx}px,${Z.ty}px) scale(${Z.s})`; }
  function zoomEn(f, cx, cy) { const ns = Math.min(Z.max, Math.max(Z.min, Z.s * f)); const k = ns / Z.s; Z.tx = cx - (cx - Z.tx) * k; Z.ty = cy - (cy - Z.ty) * k; Z.s = ns; aplicar(); }
  inner.style.transformOrigin = "0 0"; wrap.style.touchAction = "none"; wrap.style.overflow = "hidden";
  wrap.addEventListener("pointerdown", e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; inner._arrastrado = false;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; startDist = Math.hypot(a.x-b.x, a.y-b.y); startS = Z.s; } startT = { x: Z.tx, y: Z.ty, px: e.clientX, py: e.clientY }; });
  wrap.addEventListener("pointermove", e => { if (!ptrs.has(e.pointerId)) return; const prev = ptrs.get(e.pointerId); moved += Math.hypot(e.clientX-prev.x, e.clientY-prev.y); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (moved > 8) inner._arrastrado = true;
    const r = wrap.getBoundingClientRect();
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x-b.x, a.y-b.y); const mid = { x: (a.x+b.x)/2 - r.left, y: (a.y+b.y)/2 - r.top }; const ns = Math.min(Z.max, Math.max(Z.min, startS * d / startDist)); const k = ns / Z.s; Z.tx = mid.x - (mid.x - Z.tx) * k; Z.ty = mid.y - (mid.y - Z.ty) * k; Z.s = ns; aplicar(); }
    else if (ptrs.size === 1 && Z.s > 1) { Z.tx = startT.x + (e.clientX - startT.px); Z.ty = startT.y + (e.clientY - startT.py); aplicar(); } });
  const fin = e => { ptrs.delete(e.pointerId); if (ptrs.size === 1) { const p = [...ptrs.values()][0]; startT = { x: Z.tx, y: Z.ty, px: p.x, py: p.y }; } setTimeout(() => { inner._arrastrado = false; }, 50); };
  wrap.addEventListener("pointerup", fin); wrap.addEventListener("pointercancel", fin); wrap.addEventListener("pointerleave", fin);
  wrap.addEventListener("wheel", e => { e.preventDefault(); const r = wrap.getBoundingClientRect(); zoomEn(e.deltaY < 0 ? 1.2 : 1/1.2, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  wrap.addEventListener("dblclick", e => { const r = wrap.getBoundingClientRect(); zoomEn(Z.s > 1.5 ? 1/Z.s : 2, e.clientX - r.left, e.clientY - r.top); });
  if (controles) { controles.mas.onclick = () => zoomEn(1.4, wrap.clientWidth/2, wrap.clientHeight/2); controles.menos.onclick = () => zoomEn(1/1.4, wrap.clientWidth/2, wrap.clientHeight/2); controles.reset.onclick = () => { Z.s = 1; aplicar(); }; }
  return { reset: () => { Z.s = 1; aplicar(); } };
};

function sillas(m) {
  const pts = []; const n = m.cap;
  if (m.forma === "circle" || m.forma === "diamond") {
    const R = (m.r || 26) + 8;
    for (let i = 0; i < n; i++) { const a = -Math.PI/2 + i * 2*Math.PI/n; pts.push([m.x + Math.cos(a)*R, m.y + Math.sin(a)*R]); }
  } else if (m.h > m.w) { // mesa vertical: sillas a los costados
    const left = Math.ceil(n/2), right = n - left;
    for (let i = 0; i < left; i++)  pts.push([m.x - m.w/2 - 8, m.y - m.h/2 + (i+0.5)*m.h/left]);
    for (let i = 0; i < right; i++) pts.push([m.x + m.w/2 + 8, m.y - m.h/2 + (i+0.5)*m.h/right]);
  } else {
    const top = Math.ceil(n/2), bot = n - top;
    for (let i = 0; i < top; i++) pts.push([m.x - m.w/2 + (i+0.5)*m.w/top, m.y - m.h/2 - 8]);
    for (let i = 0; i < bot; i++) pts.push([m.x - m.w/2 + (i+0.5)*m.w/bot, m.y + m.h/2 + 8]);
  }
  return pts.map(p => `<circle class="silla" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4"/>`).join("");
}

/* Sol dorado = mesa con vista al Paseo de Montejo */
function sol(m) {
  const top = m.forma === "rect" ? m.h/2 : (m.r || 26);
  const cx = m.x + (m.forma === "rect" ? m.w/2 - 6 : (m.r||26)*0.7), cy = m.y - top - 2;
  let r = `<g class="sol"><circle cx="${cx}" cy="${cy}" r="5.5" fill="#e3b341" stroke="#b7791f" stroke-width="1.2"/>`;
  for (let i = 0; i < 8; i++) { const a = i*Math.PI/4; r += `<line x1="${(cx+Math.cos(a)*8).toFixed(1)}" y1="${(cy+Math.sin(a)*8).toFixed(1)}" x2="${(cx+Math.cos(a)*11).toFixed(1)}" y2="${(cy+Math.sin(a)*11).toFixed(1)}" stroke="#b7791f" stroke-width="1.6" stroke-linecap="round"/>`; }
  return r + `</g>`;
}
