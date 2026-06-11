// ======================================
// COMPROMISOS.JS
// LocalStorage + municipios
// ======================================

const LS_SESION = "municipios_sesion";
const LS_DATOS = "municipios_datos";
const LS_REUNIONES = "municipios_reuniones";
const LS_COMPROMISOS = "municipios_compromisos";

function migrarLocalStorageSiAplica(nuevaKey, viejaKey) {
  if (!localStorage.getItem(nuevaKey) && localStorage.getItem(viejaKey)) {
    localStorage.setItem(nuevaKey, localStorage.getItem(viejaKey));
  }
}

migrarLocalStorageSiAplica(LS_DATOS, "pasto_datos");
migrarLocalStorageSiAplica(LS_REUNIONES, "pasto_reuniones");
migrarLocalStorageSiAplica(LS_COMPROMISOS, "pasto_compromisos");

function safeJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function norm(s) { return (s || "").toString().trim(); }
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = String(v); }
function id(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
function toMunicipio(v) { return norm(v || "Municipio 1").replace(/^Comuna/i, "Municipio"); }

function getSesion() { return safeJSON(LS_SESION, null); }

function getDatos() {
  const d = safeJSON(LS_DATOS, {});
  if (!d || typeof d !== "object") return {};
  const out = {};
  Object.keys(d).forEach(k => {
    out[toMunicipio(k)] = d[k];
  });
  return out;
}

function getReuniones() {
  const arr = safeJSON(LS_REUNIONES, []);
  if (!Array.isArray(arr)) return [];
  return arr.map(r => ({ ...r, municipio: toMunicipio(r.municipio || r.comuna) }));
}

function getCompromisos() {
  const arr = safeJSON(LS_COMPROMISOS, []);
  if (!Array.isArray(arr)) return [];
  return arr;
}

function saveCompromisos(arr) {
  localStorage.setItem(LS_COMPROMISOS, JSON.stringify(arr));
}

function isAprobadorGlobal(rol) {
  const r = (rol || "").toLowerCase();
  return r === "admin" || r === "gerencia" || r === "coordinador";
}

function isAdmin(sesion) {
  return (sesion?.rol || "").toLowerCase() === "admin";
}

function municipioActivo(sesion, datos) {
  const valor = sesion?.municipio || sesion?.comuna || "";
  if (valor && valor !== "ALL") return toMunicipio(valor);
  const keys = Object.keys(datos || {});
  return keys[0] || "Municipio 1";
}

function reunionKey(r) {
  const f = norm(r.fecha);
  const h = norm(r.hora);
  const l = norm(r.lugar).toLowerCase();
  const t = norm(r.tipo).toLowerCase();
  return `${f}|${h}|${l}|${t}`;
}

function cargarLideresDeMunicipio(municipio) {
  const datos = getDatos();
  const municipioData = datos[municipio] || { lideres: [] };
  const lideres = Array.isArray(municipioData.lideres) ? municipioData.lideres : [];
  return lideres.map(l => ({ id: String(l.id || ""), nombre: l.nombre || "" }));
}

function poblarSelectLider(municipio) {
  const select = document.getElementById("comp-lider");
  if (!select) return;

  select.innerHTML = `<option value="">Seleccione un líder</option>`;
  const lideres = cargarLideresDeMunicipio(municipio)
    .filter(l => norm(l.nombre))
    .sort((a,b) => a.nombre.localeCompare(b.nombre));

  lideres.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l.id ? `id:${l.id}` : `name:${l.nombre}`;
    opt.textContent = l.nombre;
    select.appendChild(opt);
  });
}

function poblarSelectReunion(municipio, liderKeyValue) {
  const select = document.getElementById("comp-reunion");
  if (!select) return;

  const reuniones = getReuniones().filter(r => norm(r.municipio) === norm(municipio));

  let liderNombre = "";
  if (liderKeyValue?.startsWith("name:")) liderNombre = liderKeyValue.slice(5);
  if (liderKeyValue?.startsWith("id:")) {
    const idVal = liderKeyValue.slice(3);
    liderNombre = cargarLideresDeMunicipio(municipio).find(l => String(l.id) === String(idVal))?.nombre || "";
  }

  const filtradas = liderNombre
    ? reuniones.filter(r => norm(r.liderNombre || r.lider || "").toLowerCase().includes(liderNombre.toLowerCase()))
    : reuniones;

  filtradas.sort((a,b) => {
    const da = new Date(`${a.fecha || "1970-01-01"}T${a.hora || "00:00"}`);
    const db = new Date(`${b.fecha || "1970-01-01"}T${b.hora || "00:00"}`);
    return da - db;
  });

  select.innerHTML = `<option value="">Sin reunión</option>`;
  filtradas.forEach(r => {
    const opt = document.createElement("option");
    opt.value = reunionKey(r);
    opt.textContent = `${r.fecha || ""} ${r.hora || ""} • ${r.tipo || "Reunión"} • ${r.lugar || ""}`;
    select.appendChild(opt);
  });
}

function resolverReunionTextoPorKey(municipio, rKey) {
  if (!rKey) return "—";
  const reuniones = getReuniones().filter(r => norm(r.municipio) === norm(municipio));
  const r = reuniones.find(x => reunionKey(x) === rKey);
  if (!r) return "—";
  return `${r.fecha || ""} ${r.hora || ""} • ${r.tipo || "Reunión"}`;
}

function badgePrioridad(p) {
  const v = (p || "").toLowerCase();
  const base = `display:inline-flex; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:900;`;
  if (v === "alta") return `<span style="${base} background:#fee2e2; color:#991b1b;">Alta</span>`;
  if (v === "media") return `<span style="${base} background:#fef9c3; color:#854d0e;">Media</span>`;
  return `<span style="${base} background:#e5e7eb; color:#111827;">Baja</span>`;
}

function badgeEstado(e) {
  const v = (e || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const base = `display:inline-flex; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:900;`;
  if (v.includes("cumpl")) return `<span style="${base} background:#dcfce7; color:#166534;">Cumplido</span>`;
  if (v.includes("gestion")) return `<span style="${base} background:#dbeafe; color:#1e40af;">En gestión</span>`;
  return `<span style="${base} background:#fef9c3; color:#854d0e;">Pendiente</span>`;
}

function parsePotencial(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  return Math.floor(n);
}

function normalizarCompromiso(c) {
  return {
    id: c.id || id("c"),
    municipio: toMunicipio(c.municipio || c.comuna || ""),
    liderKey: c.liderKey || "",
    liderNombre: c.liderNombre || c.lider || "",
    reunionKey: c.reunionKey || "",
    tipoCompromiso: c.tipoCompromiso || c.tipo || "",
    responsable: c.responsable || "",
    potencialVotos: (c.potencialVotos !== undefined && c.potencialVotos !== null) ? parsePotencial(c.potencialVotos) : null,
    estado: c.estado || "Pendiente",
    prioridad: c.prioridad || "Media",
    fecha: c.fecha || "",
    aprobado: typeof c.aprobado === "boolean" ? c.aprobado : false,
    aprobadoPor: c.aprobadoPor || "",
    aprobadoFecha: c.aprobadoFecha || ""
  };
}

function getListaMunicipiosDesdeDatos() {
  const datos = getDatos();
  const municipios = Object.keys(datos || {});
  if (!municipios.length) return Array.from({ length: 12 }, (_, i) => `Municipio ${i + 1}`);
  return municipios.sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || ["0"])[0], 10);
    const nb = parseInt((b.match(/\d+/) || ["0"])[0], 10);
    return na - nb;
  });
}

function poblarFiltroMunicipioSiAplica(sesion) {
  const wrap = document.getElementById("comuna-filter-wrap");
  const sel = document.getElementById("comp-filter-comuna");
  if (!wrap || !sel) return;

  const rol = (sesion?.rol || "").toLowerCase();
  const aprobadorGlobal = isAprobadorGlobal(rol);

  if (!aprobadorGlobal) {
    wrap.style.display = "none";
    return;
  }

  wrap.style.display = "block";
  sel.innerHTML = `<option value="__ALL__">Todos los municipios</option>`;

  getListaMunicipiosDesdeDatos().forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

function getTablaFiltrada(sesion, municipioBase, filtroMunicipio) {
  const rol = (sesion?.rol || "").toLowerCase();
  const aprobadorGlobal = isAprobadorGlobal(rol);
  const all = getCompromisos().map(normalizarCompromiso);

  let data;
  if (aprobadorGlobal) {
    data = (filtroMunicipio && filtroMunicipio !== "__ALL__")
      ? all.filter(c => norm(c.municipio) === norm(filtroMunicipio))
      : all;
  } else {
    data = all.filter(c => norm(c.municipio) === norm(municipioBase));
  }

  data.sort((a,b) => {
    const cf = (b.fecha || "").localeCompare(a.fecha || "");
    if (cf !== 0) return cf;
    return (a.municipio || "").localeCompare(b.municipio || "");
  });

  return { data, aprobadorGlobal };
}

function renderTabla(sesion, municipioBase, filtroMunicipio) {
  const tbody = document.getElementById("comp-tbody");
  if (!tbody) return;

  const { data, aprobadorGlobal } = getTablaFiltrada(sesion, municipioBase, filtroMunicipio);
  const puedeEliminar = isAdmin(sesion);

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="small-text">No hay compromisos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => {
    const reunionTxt = resolverReunionTextoPorKey(c.municipio || municipioBase, c.reunionKey);
    const checked = c.aprobado ? "checked" : "";
    const disabled = aprobadorGlobal ? "" : "disabled";
    const title = c.aprobado ? `Aprobado por: ${c.aprobadoPor || "—"}` : "No aprobado";

    const acciones = puedeEliminar
      ? `<button type="button" class="btn-secondary" data-del-comp-id="${c.id}" style="font-size:11px; padding:3px 10px;">Eliminar</button>`
      : `<span class="small-text">—</span>`;

    const potTxt = (c.potencialVotos === null || c.potencialVotos === undefined) ? "—" : String(c.potencialVotos);

    return `
      <tr>
        <td>${norm(c.municipio) || "—"}</td>
        <td>${norm(c.fecha) || "—"}</td>
        <td>${norm(c.liderNombre) || "—"}</td>
        <td>${reunionTxt}</td>
        <td>${norm(c.tipoCompromiso) || "—"}</td>
        <td>${norm(c.responsable) || "—"}</td>
        <td>${potTxt}</td>
        <td>${badgePrioridad(c.prioridad)}</td>
        <td>${badgeEstado(c.estado)}</td>
        <td style="text-align:center;">
          <input type="checkbox" data-comp-id="${c.id}" ${checked} ${disabled} title="${title}">
        </td>
        <td>${acciones}</td>
      </tr>
    `;
  }).join("");
}

function exportExcel(sesion, municipioBase, filtroMunicipio) {
  const rol = (sesion?.rol || "").toLowerCase();
  const aprobadorGlobal = isAprobadorGlobal(rol);

  const all = getCompromisos().map(normalizarCompromiso);
  let data;

  if (aprobadorGlobal) {
    data = (filtroMunicipio && filtroMunicipio !== "__ALL__")
      ? all.filter(c => norm(c.municipio) === norm(filtroMunicipio))
      : all;
  } else {
    data = all.filter(c => norm(c.municipio) === norm(municipioBase));
  }

  const rows = data.map(c => ({
    Municipio: c.municipio || "",
    Fecha: c.fecha || "",
    "Líder/Contacto": c.liderNombre || "",
    "Tipo de compromiso": c.tipoCompromiso || "",
    Responsable: c.responsable || "",
    "Potencial de votos": (c.potencialVotos === null || c.potencialVotos === undefined) ? "" : c.potencialVotos,
    Estado: c.estado || "",
    Prioridad: c.prioridad || "",
    "Reunión": resolverReunionTextoPorKey(c.municipio || municipioBase, c.reunionKey),
    Aprobado: c.aprobado ? "SI" : "NO",
    "Aprobado por": c.aprobadoPor || "",
    "Aprobado fecha": c.aprobadoFecha || ""
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Compromisos");

  let nombre = aprobadorGlobal
    ? ((filtroMunicipio && filtroMunicipio !== "__ALL__") ? filtroMunicipio : "TODOS")
    : municipioBase;

  XLSX.writeFile(wb, `Compromisos_${String(nombre).replace(/\s+/g, "_")}.xlsx`);
}

document.addEventListener("DOMContentLoaded", () => {
  const sesion = getSesion();
  const noSes = document.getElementById("no-session-section");
  const sec = document.getElementById("compromisos-section");

  if (!sesion?.username) {
    if (sec) sec.style.display = "none";
    if (noSes) noSes.style.display = "block";
    return;
  }

  if (noSes) noSes.style.display = "none";
  if (sec) sec.style.display = "block";

  const datos = getDatos();
  const municipioBase = municipioActivo(sesion, datos);

  const rol = (sesion.rol || "").toLowerCase();
  const aprobadorGlobal = isAprobadorGlobal(rol);

  setText("comp-comuna-title", aprobadorGlobal ? "TODOS LOS MUNICIPIOS" : municipioBase);
  setText("comp-user-info", `Sesión activa como: ${sesion.username} (${sesion.rol || "dinamizador"})`);

  poblarFiltroMunicipioSiAplica(sesion);

  const selFiltro = document.getElementById("comp-filter-comuna");
  if (selFiltro && aprobadorGlobal) {
    selFiltro.addEventListener("change", () => renderTabla(sesion, municipioBase, selFiltro.value));
  }

  poblarSelectLider(municipioBase);
  poblarSelectReunion(municipioBase, "");

  const selLider = document.getElementById("comp-lider");
  selLider?.addEventListener("change", () => poblarSelectReunion(municipioBase, selLider.value || ""));

  const filtroInicial = selFiltro ? selFiltro.value : "__ALL__";
  renderTabla(sesion, municipioBase, filtroInicial);

  const tbody = document.getElementById("comp-tbody");

  tbody?.addEventListener("click", (ev) => {
    const delBtn = ev.target?.closest?.("button[data-del-comp-id]");
    if (!delBtn) return;

    if (!isAdmin(sesion)) {
      alert("Acción no permitida.");
      return;
    }

    const compId = delBtn.getAttribute("data-del-comp-id");
    if (!compId) return;

    if (!confirm("¿Seguro que deseas eliminar este compromiso?")) return;

    const raw = getCompromisos().map(normalizarCompromiso);
    const nuevo = raw.filter(x => (x?.id || "") !== compId);
    saveCompromisos(nuevo);

    const filtro = selFiltro ? selFiltro.value : "__ALL__";
    renderTabla(sesion, municipioBase, filtro);
  });

  tbody?.addEventListener("change", (ev) => {
    const chk = ev.target;
    if (!chk || chk.type !== "checkbox" || !chk.hasAttribute("data-comp-id")) return;
    if (!aprobadorGlobal) return;

    const compId = chk.getAttribute("data-comp-id");
    const nuevoValor = !!chk.checked;

    const arr = getCompromisos().map(normalizarCompromiso);
    const idx = arr.findIndex(x => x.id === compId);
    if (idx === -1) return;

    arr[idx].aprobado = nuevoValor;
    arr[idx].aprobadoPor = nuevoValor ? (sesion.username || "") : "";
    arr[idx].aprobadoFecha = nuevoValor ? new Date().toISOString() : "";

    saveCompromisos(arr);

    const filtro = selFiltro ? selFiltro.value : "__ALL__";
    renderTabla(sesion, municipioBase, filtro);
  });

  document.getElementById("comp-form")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const liderKey = norm(document.getElementById("comp-lider")?.value);
    const reunionKeySel = norm(document.getElementById("comp-reunion")?.value);
    const tipoCompromiso = norm(document.getElementById("comp-tipo")?.value);
    const responsable = norm(document.getElementById("comp-responsable")?.value);
    const potencialVotos = parsePotencial(document.getElementById("comp-potencial")?.value);
    const estado = norm(document.getElementById("comp-estado")?.value) || "Pendiente";
    const prioridad = norm(document.getElementById("comp-prioridad")?.value) || "Media";
    const fecha = norm(document.getElementById("comp-fecha")?.value);

    if (!liderKey || !tipoCompromiso || !estado || !prioridad || !fecha) return;

    const liderNombre = (() => {
      if (liderKey.startsWith("name:")) return liderKey.slice(5);
      if (liderKey.startsWith("id:")) {
        const idVal = liderKey.slice(3);
        const lideres = cargarLideresDeMunicipio(municipioBase);
        return lideres.find(l => String(l.id) === String(idVal))?.nombre || "";
      }
      return "";
    })();

    const comp = {
      id: id("c"),
      municipio: municipioBase,
      liderKey,
      liderNombre: liderNombre || "Contacto",
      reunionKey: reunionKeySel || "",
      tipoCompromiso,
      responsable,
      potencialVotos,
      estado,
      prioridad,
      fecha,
      aprobado: false,
      aprobadoPor: "",
      aprobadoFecha: ""
    };

    const arr = getCompromisos().map(normalizarCompromiso);
    arr.push(comp);
    saveCompromisos(arr);

    e.target.reset();
    poblarSelectLider(municipioBase);
    poblarSelectReunion(municipioBase, "");

    const filtro = selFiltro ? selFiltro.value : "__ALL__";
    renderTabla(sesion, municipioBase, filtro);
  });

  document.getElementById("btn-export-excel")?.addEventListener("click", () => {
    const filtro = selFiltro ? selFiltro.value : "__ALL__";
    exportExcel(sesion, municipioBase, filtro);
  });
});