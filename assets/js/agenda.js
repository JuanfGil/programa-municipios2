// ================================
// AGENDA.JS
// ================================

function agGetSesion() {
  try {
    return JSON.parse(localStorage.getItem("municipios_sesion") || "null");
  } catch {
    return null;
  }
}

function agMunicipioSesion(sesion) {
  const valor = sesion?.municipio || sesion?.comuna || "Municipio 1";
  if (valor === "ALL") return "Municipio 1";
  return valor.replace(/^Comuna/i, "Municipio");
}

function agSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function agNormalizarEstado(estado) {
  return (estado || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function agNormalizarPrioridad(p) {
  const v = (p || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (v === "alta") return "alta";
  if (v === "baja") return "baja";
  return "media";
}

function agBadgePrioridad(p) {
  const pr = agNormalizarPrioridad(p);
  const base = `display:inline-flex; align-items:center; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800;`;

  if (pr === "alta") return `<span style="${base} background:#fee2e2; color:#991b1b;">Alta</span>`;
  if (pr === "baja") return `<span style="${base} background:#e5e7eb; color:#111827;">Baja</span>`;
  return `<span style="${base} background:#fef9c3; color:#854d0e;">Media</span>`;
}

function agCargarReuniones() {
  const keysPosibles = ["municipios_reuniones", "pasto_reuniones", "reuniones", "pasto_meetings"];
  for (const k of keysPosibles) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(r => ({
          ...r,
          municipio: (r.municipio || r.comuna || "").replace(/^Comuna/i, "Municipio")
        }));
      }
    } catch {}
  }
  return [];
}

function agParseFechaHora(item) {
  const f = (item.fecha || "").toString().trim();
  const h = (item.hora || "").toString().trim();
  const fh = (item.fechaHora || item.datetime || "").toString().trim();

  if (fh) {
    const d = new Date(fh);
    if (!isNaN(d.getTime())) return d;
  }

  if (f && h) {
    const d = new Date(`${f}T${h}`);
    if (!isNaN(d.getTime())) return d;
  }

  if (f) {
    const d = new Date(`${f}T00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date(0);
}

function agFechaISO(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function agFiltrarPorMunicipio(reuniones, municipio) {
  const ref = (municipio || "").toString().toLowerCase().trim();
  return reuniones.filter((r) => {
    const m = (r.municipio || r.comuna || "").toString().toLowerCase().trim().replace(/^comuna/i, "municipio");
    return m === ref;
  });
}

function agRenderResumen(lista) {
  const total = lista.length;
  const pend = lista.filter(r => agNormalizarEstado(r.estado) === "pendiente").length;
  const real = lista.filter(r => agNormalizarEstado(r.estado) === "realizada").length;
  const canc = lista.filter(r => agNormalizarEstado(r.estado) === "cancelada").length;

  agSetText("ag-total", total);
  agSetText("ag-pend", pend);
  agSetText("ag-real", real);
  agSetText("ag-canc", canc);
}

function agBadgeEstado(estado) {
  const est = agNormalizarEstado(estado);
  const base = `display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:800;`;

  if (est === "realizada") return `<span style="${base} background:#dcfce7; color:#166534;">Realizada</span>`;
  if (est === "cancelada") return `<span style="${base} background:#fee2e2; color:#991b1b;">Cancelada</span>`;
  return `<span style="${base} background:#fef9c3; color:#854d0e;">Pendiente</span>`;
}

function agCard(item) {
  const fecha = (item.fecha || "").toString().trim();
  const hora = (item.hora || "").toString().trim();
  const lugar = (item.lugar || "").toString().trim();
  const tipo = (item.tipo || "").toString().trim();
  const estado = item.estado || "Pendiente";
  const prioridad = item.prioridad || "Media";

  return `
    <div style="border:1px solid #e5e7eb; border-radius:14px; padding:14px; background:#fff;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <div style="font-weight:900;">${tipo || "Reunión"}</div>
          ${agBadgeEstado(estado)}
          ${agBadgePrioridad(prioridad)}
        </div>
        <div style="color:#6b7280; font-size:13px;">
          ${fecha || "Sin fecha"} ${hora ? "• " + hora : ""}
        </div>
      </div>

      <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <div style="font-size:12px; color:#6b7280;">Lugar</div>
          <div style="font-weight:700;">${lugar || "No especificado"}</div>
        </div>
        <div>
          <div style="font-size:12px; color:#6b7280;">Municipio</div>
          <div style="font-weight:700;">${item.municipio || "—"}</div>
        </div>
      </div>
    </div>
  `;
}

function agRenderLista(containerId, lista) {
  const cont = document.getElementById(containerId);
  if (!cont) return;

  if (!lista.length) {
    cont.innerHTML = `<div class="small-text">No hay reuniones en esta sección.</div>`;
    return;
  }

  cont.innerHTML = lista.map(agCard).join("");
}

function agSeccionar(lista) {
  const hoyISO = agFechaISO(new Date());

  const hoy = [];
  const proximas = [];
  const pasadas = [];

  for (const r of lista) {
    const d = agParseFechaHora(r);
    const iso = agFechaISO(d);

    if (iso === hoyISO) hoy.push(r);
    else if (iso > hoyISO) proximas.push(r);
    else pasadas.push(r);
  }

  hoy.sort((a, b) => agParseFechaHora(a) - agParseFechaHora(b));
  proximas.sort((a, b) => agParseFechaHora(a) - agParseFechaHora(b));
  pasadas.sort((a, b) => agParseFechaHora(b) - agParseFechaHora(a));

  return { hoy, proximas, pasadas };
}

document.addEventListener("DOMContentLoaded", () => {
  const sesion = agGetSesion();
  const noSession = document.getElementById("no-session-section");
  const agendaSection = document.getElementById("agenda-section");

  if (!sesion || !sesion.username) {
    if (agendaSection) agendaSection.style.display = "none";
    if (noSession) noSession.style.display = "block";
    return;
  }

  if (noSession) noSession.style.display = "none";
  if (agendaSection) agendaSection.style.display = "block";

  const municipio = agMunicipioSesion(sesion);
  const title = document.getElementById("agenda-comuna-title");
  const info = document.getElementById("agenda-user-info");
  if (title) title.textContent = municipio;
  if (info) info.textContent = `Sesión activa como: ${sesion.username}`;

  const all = agCargarReuniones();
  const baseLista = agFiltrarPorMunicipio(all, municipio);

  const filtroEstado = document.getElementById("ag-filter-estado");
  const search = document.getElementById("ag-search");

  function aplicarFiltrosYRender() {
    const est = (filtroEstado?.value || "todas").toLowerCase();
    const q = (search?.value || "").toLowerCase().trim();

    let filtrada = [...baseLista];

    if (est !== "todas") {
      filtrada = filtrada.filter(r => agNormalizarEstado(r.estado) === est);
    }

    if (q) {
      filtrada = filtrada.filter(r => {
        const lugar = (r.lugar || "").toString().toLowerCase();
        const tipo = (r.tipo || "").toString().toLowerCase();
        const pr = agNormalizarPrioridad(r.prioridad || "media");
        return lugar.includes(q) || tipo.includes(q) || pr.includes(q);
      });
    }

    agRenderResumen(filtrada);

    const { hoy, proximas, pasadas } = agSeccionar(filtrada);

    agSetText("ag-count-hoy", hoy.length);
    agSetText("ag-count-proximas", proximas.length);
    agSetText("ag-count-pasadas", pasadas.length);

    agRenderLista("agenda-list-hoy", hoy);
    agRenderLista("agenda-list-proximas", proximas);
    agRenderLista("agenda-list-pasadas", pasadas);
  }

  aplicarFiltrosYRender();

  if (filtroEstado) filtroEstado.addEventListener("change", aplicarFiltrosYRender);
  if (search) search.addEventListener("input", aplicarFiltrosYRender);
});