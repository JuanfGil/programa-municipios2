const LS_SESION_KEY = "municipios_sesion";
const LS_DATOS_KEY = "municipios_datos";
const LS_COMPROMISOS_KEY = "municipios_compromisos";

function migrarLocalStorageSiAplica(nuevaKey, viejaKey) {
  if (!localStorage.getItem(nuevaKey) && localStorage.getItem(viejaKey)) {
    localStorage.setItem(nuevaKey, localStorage.getItem(viejaKey));
  }
}

function toMunicipio(v) {
  const valor = (v || "Municipio 1").toString().trim();
  if (valor === "ALL") return "Municipio 1";
  return valor.replace(/^Comuna/i, "Municipio");
}

function cargarSesionReportes() {
  try {
    const raw = localStorage.getItem(LS_SESION_KEY);
    if (!raw) return null;
    const sesion = JSON.parse(raw);
    if (!sesion || !sesion.username) return null;
    sesion.municipio = toMunicipio(sesion.municipio || sesion.comuna);
    return sesion;
  } catch (e) {
    console.warn("Error cargando sesión en reportes:", e);
    return null;
  }
}

function cargarDatosReportes() {
  migrarLocalStorageSiAplica(LS_DATOS_KEY, "pasto_datos");

  try {
    const raw = localStorage.getItem(LS_DATOS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    Object.keys(parsed).forEach(k => out[toMunicipio(k)] = parsed[k]);
    return out;
  } catch (e) {
    console.warn("Error cargando datos en reportes:", e);
    return {};
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function normalizarCompromisoLider(v) {
  return (v || "")
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function badgeCompromisoLider(valor) {
  const v = normalizarCompromisoLider(valor);
  const base = `display:inline-flex; align-items:center; justify-content:center; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:900; white-space:nowrap;`;

  if (v === "comprometido") return `<span style="${base} background:#dcfce7; color:#166534;">🟢 Comprometido</span>`;
  if (v === "no ubicado" || v === "no_ubicado" || v === "no-ubicado") return `<span style="${base} background:#fef9c3; color:#854d0e;">🟡 No ubicado</span>`;
  if (v === "no apoyan" || v === "no_apoyan" || v === "no-apoyan") return `<span style="${base} background:#fee2e2; color:#991b1b;">🔴 No apoyan</span>`;
  return `<span style="${base} background:#e5e7eb; color:#111827;">⚪ Sin definir</span>`;
}

function renderSemaforoLideres(datos, municipio) {
  const cont = document.getElementById("rep-lideres-semaforo");
  if (!cont) return;

  const municipioData = datos[municipio] || { lideres: [] };
  const lideres = Array.isArray(municipioData.lideres) ? municipioData.lideres : [];

  if (!lideres.length) {
    cont.innerHTML = `<div class="small-text">Aún no hay líderes registrados para este municipio.</div>`;
    return;
  }

  const lista = [...lideres].sort((a, b) => {
    const na = (a.nombre || "").toString().toLowerCase();
    const nb = (b.nombre || "").toString().toLowerCase();
    return na.localeCompare(nb);
  });

  cont.innerHTML = lista.map((l) => {
    const nombre = (l.nombre || "(Sin nombre)").toString();
    const doc = (l.documento || "N/D").toString();
    const tipo = (l.tipo || "N/D").toString();
    const comp = l.compromisoLider || l.compromiso || "";

    return `
      <div style="border:1px solid #e5e7eb; border-radius:14px; padding:12px; background:#fff;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
          <div style="display:flex; flex-direction:column; gap:3px;">
            <div style="font-weight:900;">${nombre}</div>
            <div style="font-size:12px; color:#64748b;">Doc: ${doc} · Tipo: ${tipo}</div>
          </div>
          <div>${badgeCompromisoLider(comp)}</div>
        </div>
      </div>
    `;
  }).join("");
}

function renderResumenMunicipio(datos, municipio, sesion) {
  const reportesSection = document.getElementById("reportes-section");
  const noSessionSection = document.getElementById("no-session-section");
  const titulo = document.getElementById("rep-comuna-title");
  const infoUsuario = document.getElementById("rep-user-info");

  if (!sesion) {
    if (reportesSection) reportesSection.style.display = "none";
    if (noSessionSection) noSessionSection.style.display = "block";
    return;
  }

  if (reportesSection) reportesSection.style.display = "block";
  if (noSessionSection) noSessionSection.style.display = "none";
  if (titulo) titulo.textContent = municipio;
  if (infoUsuario) infoUsuario.textContent = "Sesión activa como: " + sesion.username;

  const municipioData = datos[municipio] || { lideres: [] };
  const lideres = Array.isArray(municipioData.lideres) ? municipioData.lideres : [];

  let totalLideres = lideres.length;
  let totalPersonas = 0;
  let totalVotan = 0;

  lideres.forEach(lider => {
    const personas = Array.isArray(lider.personas) ? lider.personas : [];
    totalPersonas += personas.length;
    personas.forEach(p => {
      if (p.votaCandidato || p.votaTeresa) totalVotan++;
    });
  });

  setText("rep-total-lideres", totalLideres);
  setText("rep-total-personas", totalPersonas);
  setText("rep-total-votan", totalVotan);
  setText("rep-total-no-votan", totalPersonas - totalVotan);
}

function normalizarEstado(e) {
  return (e || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function renderCompromisosMunicipio(municipio) {
  migrarLocalStorageSiAplica(LS_COMPROMISOS_KEY, "pasto_compromisos");

  let compromisos = [];
  try {
    compromisos = JSON.parse(localStorage.getItem(LS_COMPROMISOS_KEY) || "[]");
    if (!Array.isArray(compromisos)) compromisos = [];
  } catch (e) {
    console.warn("Error cargando compromisos:", e);
    compromisos = [];
  }

  const lista = compromisos
    .map(c => ({ ...c, municipio: toMunicipio(c.municipio || c.comuna) }))
    .filter(c => c.municipio === municipio);

  const total = lista.length;
  const pendientes = lista.filter(c => normalizarEstado(c.estado) === "pendiente").length;
  const gestion = lista.filter(c => ["gestion", "en gestion"].includes(normalizarEstado(c.estado))).length;
  const cumplidos = lista.filter(c => ["cumplido", "cumplidos"].includes(normalizarEstado(c.estado))).length;

  setText("rep-comp-total", total);
  setText("rep-comp-pendientes", pendientes);
  setText("rep-comp-gestion", gestion);
  setText("rep-comp-cumplidos", cumplidos);

  const canvas = document.getElementById("chartCompromisos");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Pendientes", "En gestión", "Cumplidos"],
      datasets: [{ data: [pendientes, gestion, cumplidos], backgroundColor: ["#fbbf24", "#38bdf8", "#22c55e"] }]
    },
    options: { plugins: { legend: { position: "bottom" } }, maintainAspectRatio: true }
  });
}

function renderGraficoPersonasPorLider(datos, municipio) {
  const municipioData = datos[municipio] || { lideres: [] };
  const lideres = Array.isArray(municipioData.lideres) ? municipioData.lideres : [];
  const labels = lideres.map(l => l.nombre || "Líder " + (l.id || ""));
  const valores = lideres.map(l => Array.isArray(l.personas) ? l.personas.length : 0);

  const canvas = document.getElementById("chartPersonasPorLider");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ label: "Personas vinculadas", data: valores, borderWidth: 1 }] },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      maintainAspectRatio: true
    }
  });
}

function renderGraficoVotan(datos, municipio) {
  const municipioData = datos[municipio] || { lideres: [] };
  const lideres = Array.isArray(municipioData.lideres) ? municipioData.lideres : [];

  let totalPersonas = 0;
  let totalVotan = 0;

  lideres.forEach(lider => {
    const personas = Array.isArray(lider.personas) ? lider.personas : [];
    totalPersonas += personas.length;
    personas.forEach(p => {
      if (p.votaCandidato || p.votaTeresa) totalVotan++;
    });
  });

  const canvas = document.getElementById("chartVotanTeresa");
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Votan por Candidato", "Sin compromiso"],
      datasets: [{ data: [totalVotan, totalPersonas - totalVotan], backgroundColor: ["#22c55e", "#e5e7eb"] }]
    },
    options: { plugins: { legend: { position: "bottom" } }, maintainAspectRatio: true }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const sesion = cargarSesionReportes();
  const reportesSection = document.getElementById("reportes-section");
  const noSessionSection = document.getElementById("no-session-section");

  if (!sesion) {
    if (reportesSection) reportesSection.style.display = "none";
    if (noSessionSection) noSessionSection.style.display = "block";
    return;
  }

  const municipio = sesion.municipio;
  const datos = cargarDatosReportes();

  renderResumenMunicipio(datos, municipio, sesion);
  renderSemaforoLideres(datos, municipio);
  renderCompromisosMunicipio(municipio);
  renderGraficoPersonasPorLider(datos, municipio);
  renderGraficoVotan(datos, municipio);
});