function pgGetSesion() {
  try {
    return JSON.parse(localStorage.getItem("municipios_sesion") || "null");
  } catch {
    return null;
  }
}

function pgRolValido(sesion) {
  if (!sesion || !sesion.rol) return false;
  const rol = sesion.rol.toLowerCase();
  return rol === "admin" || rol === "gerencia" || rol === "coordinador" || rol === "supervisor";
}

function pgToMunicipio(v) {
  return (v || "Municipio 1").toString().trim().replace(/^Comuna/i, "Municipio");
}

function pgCargarDatos() {
  try {
    if (!localStorage.getItem("municipios_datos") && localStorage.getItem("pasto_datos")) {
      localStorage.setItem("municipios_datos", localStorage.getItem("pasto_datos"));
    }
    const raw = localStorage.getItem("municipios_datos");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    Object.keys(parsed).forEach(k => out[pgToMunicipio(k)] = parsed[k]);
    return out;
  } catch {
    return {};
  }
}

function pgCargarCompromisos() {
  try {
    if (!localStorage.getItem("municipios_compromisos") && localStorage.getItem("pasto_compromisos")) {
      localStorage.setItem("municipios_compromisos", localStorage.getItem("pasto_compromisos"));
    }
    const raw = localStorage.getItem("municipios_compromisos") || "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(c => ({ ...c, municipio: pgToMunicipio(c.municipio || c.comuna) }));
  } catch {
    return [];
  }
}

function pgSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function pgEstadoSimple(v) {
  return (v || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pgConstruirResumenPorMunicipio() {
  const datos = pgCargarDatos();
  const compromisos = pgCargarCompromisos();
  const mapa = {};

  Object.keys(datos).forEach((municipio) => {
    const municipioData = datos[municipio] || { lideres: [] };
    const lideres = Array.isArray(municipioData.lideres) ? municipioData.lideres : [];

    if (!mapa[municipio]) {
      mapa[municipio] = { municipio, lideres: 0, personas: 0, votan: 0, compromisosTotal: 0, pend: 0, gest: 0, cump: 0 };
    }

    mapa[municipio].lideres += lideres.length;

    lideres.forEach((lider) => {
      const personas = Array.isArray(lider.personas) ? lider.personas : [];
      mapa[municipio].personas += personas.length;
      personas.forEach((p) => {
        if (p.votaCandidato || p.votaTeresa) mapa[municipio].votan++;
      });
    });
  });

  compromisos.forEach((c) => {
    const municipio = pgToMunicipio(c.municipio || c.comuna || "");
    if (!municipio) return;

    if (!mapa[municipio]) {
      mapa[municipio] = { municipio, lideres: 0, personas: 0, votan: 0, compromisosTotal: 0, pend: 0, gest: 0, cump: 0 };
    }

    const est = pgEstadoSimple(c.estado);
    mapa[municipio].compromisosTotal++;

    if (est === "pendiente") mapa[municipio].pend++;
    else if (est === "gestion" || est === "en gestion") mapa[municipio].gest++;
    else if (est === "cumplido" || est === "cumplidos") mapa[municipio].cump++;
  });

  return mapa;
}

function pgOrdenarMunicipios(mapa) {
  return Object.keys(mapa).sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || ["0"])[0], 10);
    const nb = parseInt((b.match(/\d+/) || ["0"])[0], 10);
    if (na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

function pgRenderTablaYResumen(mapa) {
  const tbody = document.getElementById("pg-tbody-comunas");
  if (!tbody) return;
  tbody.innerHTML = "";

  const municipios = pgOrdenarMunicipios(mapa);
  let totalLideres = 0;
  let totalPersonas = 0;
  let totalCompromisos = 0;

  municipios.forEach((municipio) => {
    const info = mapa[municipio];

    totalLideres += info.lideres;
    totalPersonas += info.personas;
    totalCompromisos += info.compromisosTotal;

    const porcentaje = info.personas > 0 ? ((info.votan / info.personas) * 100).toFixed(1) + "%" : "0%";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${info.municipio}</td>
      <td>${info.lideres}</td>
      <td>${info.personas}</td>
      <td>${info.votan}</td>
      <td>${porcentaje}</td>
      <td>${info.compromisosTotal}</td>
      <td>${info.pend}</td>
      <td>${info.gest}</td>
      <td>${info.cump}</td>
    `;
    tbody.appendChild(tr);
  });

  pgSetText("pg-total-comunas", municipios.length);
  pgSetText("pg-total-lideres", totalLideres);
  pgSetText("pg-total-personas", totalPersonas);
  pgSetText("pg-total-compromisos", totalCompromisos);
}

function pgRenderGraficoPersonas(mapa) {
  const canvas = document.getElementById("pg-chart-personas");
  if (!canvas || !window.Chart) return;

  const municipios = pgOrdenarMunicipios(mapa);
  const valores = municipios.map((m) => mapa[m].personas);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: municipios,
      datasets: [{ label: "Personas vinculadas", data: valores, borderWidth: 1 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      maintainAspectRatio: true
    }
  });
}

function pgRenderGraficoCompromisos(mapa) {
  const canvas = document.getElementById("pg-chart-compromisos");
  if (!canvas || !window.Chart) return;

  const municipios = pgOrdenarMunicipios(mapa);
  const valores = municipios.map((m) => mapa[m].compromisosTotal);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: municipios,
      datasets: [{ label: "Compromisos", data: valores, borderWidth: 1 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      maintainAspectRatio: true
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const sesion = pgGetSesion();
  const panelSection = document.getElementById("panel-section");
  const noSessionSection = document.getElementById("no-session-section");

  if (!pgRolValido(sesion)) {
    if (panelSection) panelSection.style.display = "none";
    if (noSessionSection) noSessionSection.style.display = "block";
    return;
  }

  if (panelSection) panelSection.style.display = "block";
  if (noSessionSection) noSessionSection.style.display = "none";

  const mapa = pgConstruirResumenPorMunicipio();
  pgRenderTablaYResumen(mapa);
  pgRenderGraficoPersonas(mapa);
  pgRenderGraficoCompromisos(mapa);
});