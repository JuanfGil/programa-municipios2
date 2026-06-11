const LS_SESION_KEY = "municipios_sesion";
const LS_REUNIONES_KEY = "municipios_reuniones";
const OLD_LS_REUNIONES_KEY = "pasto_reuniones";

let reuniones = [];
let municipioActual = null;
let usuarioActual = null;
let nextReunionId = 1;

function migrarLocalStorageSiAplica(nuevaKey, viejaKey) {
  if (!localStorage.getItem(nuevaKey) && localStorage.getItem(viejaKey)) {
    localStorage.setItem(nuevaKey, localStorage.getItem(viejaKey));
  }
}

function nombreMunicipioDesdeSesion(sesion) {
  const valor = sesion?.municipio || sesion?.comuna || "Municipio 1";
  if (valor === "ALL") return "Municipio 1";
  return valor.replace(/^Comuna/i, "Municipio");
}

function cargarSesionReu() {
  try {
    const raw = localStorage.getItem(LS_SESION_KEY);
    if (!raw) return null;
    const sesion = JSON.parse(raw);
    if (!sesion || !sesion.username) return null;
    return sesion;
  } catch (e) {
    console.warn("Error al cargar sesión en reuniones:", e);
    return null;
  }
}

function cargarReuniones() {
  migrarLocalStorageSiAplica(LS_REUNIONES_KEY, OLD_LS_REUNIONES_KEY);

  try {
    const data = JSON.parse(localStorage.getItem(LS_REUNIONES_KEY) || "[]");
    if (Array.isArray(data)) {
      reuniones = data.map(r => ({
        ...r,
        municipio: (r.municipio || r.comuna || "").replace(/^Comuna/i, "Municipio")
      }));
      if (reuniones.length > 0) {
        nextReunionId = Math.max(...reuniones.map((r) => r.id || 0)) + 1;
      }
      guardarReuniones();
    } else {
      reuniones = [];
    }
  } catch (e) {
    console.warn("Error al cargar reuniones:", e);
    reuniones = [];
  }
}

function guardarReuniones() {
  try {
    localStorage.setItem(LS_REUNIONES_KEY, JSON.stringify(reuniones));
  } catch (e) {
    console.warn("Error al guardar reuniones:", e);
    alert("No fue posible guardar localmente. Revisa el almacenamiento del navegador.");
  }
}

function normalizarPrioridad(p) {
  const v = (p || "").toString().trim().toLowerCase();
  if (v === "alta") return "Alta";
  if (v === "baja") return "Baja";
  return "Media";
}

function badgePrioridad(p) {
  const v = normalizarPrioridad(p).toLowerCase();
  const base = `display:inline-flex; padding:2px 10px; border-radius:9999px; font-size:12px; font-weight:600; white-space:nowrap;`;
  if (v === "alta") return `<span style="${base} background:#fee2e2; color:#991b1b;">Alta</span>`;
  if (v === "baja") return `<span style="${base} background:#e5e7eb; color:#111827;">Baja</span>`;
  return `<span style="${base} background:#fef9c3; color:#854d0e;">Media</span>`;
}

function parseNumPersonas(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  return Math.floor(n);
}

function normText(v) {
  return (v ?? "").toString().trim();
}

document.addEventListener("DOMContentLoaded", () => {
  const noSessionSection = document.getElementById("no-session-section");
  const reunionesSection = document.getElementById("reuniones-section");

  const sesion = cargarSesionReu();
  if (!sesion) {
    if (noSessionSection) noSessionSection.style.display = "block";
    if (reunionesSection) reunionesSection.style.display = "none";
    return;
  }

  usuarioActual = sesion.username;
  municipioActual = nombreMunicipioDesdeSesion(sesion);

  cargarReuniones();

  const reuMunicipioTitle = document.getElementById("reu-comuna-title");
  const reuUserInfo = document.getElementById("reu-user-info");
  const reunionForm = document.getElementById("reunion-form");
  const tbodyReuniones = document.getElementById("tbody-reuniones");

  if (reuMunicipioTitle) reuMunicipioTitle.textContent = municipioActual;
  if (reuUserInfo) reuUserInfo.textContent = `Sesión activa como: ${usuarioActual}`;

  if (noSessionSection) noSessionSection.style.display = "none";
  if (reunionesSection) reunionesSection.style.display = "block";

  if (reunionForm) {
    reunionForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!municipioActual || !usuarioActual) {
        alert("No hay municipio ni usuario activos.");
        return;
      }

      const fechaInput = document.getElementById("reunion-fecha");
      const horaInput = document.getElementById("reunion-hora");
      const lugarInput = document.getElementById("reunion-lugar");
      const tipoInput = document.getElementById("reunion-tipo");
      const prioridadInput = document.getElementById("reunion-prioridad");
      const numInput = document.getElementById("reunion-num-personas");
      const respInput = document.getElementById("reunion-responsable");

      const fecha = normText(fechaInput?.value);
      const hora = normText(horaInput?.value);
      const lugar = normText(lugarInput?.value);
      const tipo = normText(tipoInput?.value);
      const prioridad = normalizarPrioridad(prioridadInput?.value || "Media");
      const numPersonas = parseNumPersonas(numInput?.value);
      const responsable = normText(respInput?.value);

      if (!fecha || !hora || !lugar) {
        alert("Por favor diligencia fecha, hora y lugar.");
        return;
      }

      const nuevaReunion = {
        id: nextReunionId++,
        municipio: municipioActual,
        dinamizador: usuarioActual,
        fecha,
        hora,
        lugar,
        tipo: tipo || "Organización",
        prioridad,
        numPersonas,
        responsable,
        estado: "pendiente",
        fechaCreacion: new Date().toISOString(),
      };

      reuniones.push(nuevaReunion);
      guardarReuniones();

      if (fechaInput) fechaInput.value = "";
      if (horaInput) horaInput.value = "";
      if (lugarInput) lugarInput.value = "";
      if (tipoInput) tipoInput.value = "";
      if (prioridadInput) prioridadInput.value = "Media";
      if (numInput) numInput.value = "";
      if (respInput) respInput.value = "";

      renderReuniones(tbodyReuniones);
    });
  }

  renderReuniones(tbodyReuniones);
});

function actualizarResumenReuniones(reunionesMunicipio) {
  const total = reunionesMunicipio.length;
  const realizadas = reunionesMunicipio.filter((r) => r.estado === "realizada").length;
  const pendientes = reunionesMunicipio.filter((r) => r.estado === "pendiente").length;
  const canceladas = reunionesMunicipio.filter((r) => r.estado === "cancelada").length;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("reu-total", total);
  set("reu-realizadas", realizadas);
  set("reu-pendientes", pendientes);
  set("reu-canceladas", canceladas);
}

function renderReuniones(tbody) {
  if (!tbody) return;

  tbody.innerHTML = "";

  const reunionesMunicipio = reuniones
    .filter((r) => (r.municipio || r.comuna) === municipioActual)
    .map((r) => ({
      ...r,
      prioridad: normalizarPrioridad(r.prioridad || "Media"),
      numPersonas: (r.numPersonas === undefined ? null : r.numPersonas),
      responsable: normText(r.responsable || ""),
    }));

  actualizarResumenReuniones(reunionesMunicipio);

  if (reunionesMunicipio.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.textContent = "Aún no hay reuniones registradas para este municipio.";
    td.className = "small-text";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  reunionesMunicipio
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))
    .forEach((reunion) => {
      const tr = document.createElement("tr");

      const crearTd = (txt) => {
        const td = document.createElement("td");
        td.textContent = txt;
        return td;
      };

      tr.appendChild(crearTd(reunion.fecha || ""));
      tr.appendChild(crearTd(reunion.hora || ""));
      tr.appendChild(crearTd(reunion.lugar || ""));
      tr.appendChild(crearTd(reunion.tipo || ""));

      const tdPrioridad = document.createElement("td");
      tdPrioridad.innerHTML = badgePrioridad(reunion.prioridad);
      tr.appendChild(tdPrioridad);

      tr.appendChild(crearTd(reunion.numPersonas === null || reunion.numPersonas === undefined ? "—" : String(reunion.numPersonas)));
      tr.appendChild(crearTd(reunion.responsable ? reunion.responsable : "—"));

      const tdEstado = document.createElement("td");
      tdEstado.classList.add("col-estado");

      const estadoBadge = document.createElement("span");
      estadoBadge.classList.add("estado-badge");

      if (reunion.estado === "realizada") {
        estadoBadge.classList.add("estado-realizada");
        estadoBadge.textContent = "Realizada";
      } else if (reunion.estado === "cancelada") {
        estadoBadge.classList.add("estado-cancelada");
        estadoBadge.textContent = "Cancelada";
      } else {
        estadoBadge.classList.add("estado-pendiente");
        estadoBadge.textContent = "Pendiente";
      }

      tdEstado.appendChild(estadoBadge);
      tr.appendChild(tdEstado);

      const tdAcciones = document.createElement("td");
      tdAcciones.classList.add("col-acciones");

      const contBtns = document.createElement("div");
      contBtns.className = "reuniones-acciones";

      const acciones = [
        ["Pendiente", "pendiente"],
        ["Realizada", "realizada"],
        ["Cancelada", "cancelada"],
      ];

      acciones.forEach(([texto, estado]) => {
        const btn = document.createElement("button");
        btn.textContent = texto;
        btn.className = "btn-secondary";
        btn.addEventListener("click", () => actualizarEstadoReunion(reunion.id, estado, tbody));
        contBtns.appendChild(btn);
      });

      const btnEliminar = document.createElement("button");
      btnEliminar.textContent = "Eliminar";
      btnEliminar.className = "btn-secondary";
      btnEliminar.addEventListener("click", () => eliminarReunion(reunion.id, tbody));
      contBtns.appendChild(btnEliminar);

      tdAcciones.appendChild(contBtns);
      tr.appendChild(tdAcciones);

      tbody.appendChild(tr);
    });
}

function actualizarEstadoReunion(id, nuevoEstado, tbody) {
  const r = reuniones.find((x) => x.id === id);
  if (!r) return;
  r.estado = nuevoEstado;
  guardarReuniones();
  renderReuniones(tbody);
}

function eliminarReunion(id, tbody) {
  if (!confirm("¿Seguro que deseas eliminar esta reunión?")) return;
  reuniones = reuniones.filter((r) => r.id !== id);
  guardarReuniones();
  renderReuniones(tbody);
}