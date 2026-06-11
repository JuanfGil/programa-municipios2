// ================================
// CONFIGURACIÓN GENERAL
// ================================
const LS_SESION_KEY = "municipios_sesion";
const LS_DATOS_KEY = "municipios_datos";
const OLD_LS_SESION_KEY = "pasto_sesion";
const OLD_LS_DATOS_KEY = "pasto_datos";

let datos = {};
let municipioActual = null;
let usuarioActual = null;
let nextLiderId = 1;
let nextPersonaId = 1;

function norm(s) { return (s || "").toString().trim(); }

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

function normalizarDatosMunicipios(rawDatos) {
  const normalizados = {};
  Object.keys(rawDatos || {}).forEach((key) => {
    const nuevoKey = key.replace(/^Comuna/i, "Municipio");
    const item = rawDatos[key] || { lideres: [] };
    const lideres = Array.isArray(item.lideres) ? item.lideres : [];

    normalizados[nuevoKey] = {
      lideres: lideres.map((lider) => ({
        ...lider,
        personas: Array.isArray(lider.personas)
          ? lider.personas.map((p) => ({
              ...p,
              votaCandidato: typeof p.votaCandidato === "boolean" ? p.votaCandidato : !!p.votaTeresa
            }))
          : []
      }))
    };
  });
  return normalizados;
}

function normalizarCompromisoLider(v) {
  const t = norm(v).toLowerCase();
  if (t === "comprometido") return "Comprometido";
  if (t === "no ubicado" || t === "noubi" || t === "no_ubicado") return "No ubicado";
  if (t === "no apoyan" || t === "noapoyan" || t === "no_apoyan") return "No apoyan";
  return "";
}

function badgeCompromisoLider(v) {
  const val = normalizarCompromisoLider(v);
  const base = `display:inline-flex; align-items:center; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:900;`;

  if (val === "Comprometido") return `<span style="${base} background:#dcfce7; color:#166534;">🟢 Comprometido</span>`;
  if (val === "No ubicado") return `<span style="${base} background:#fef9c3; color:#854d0e;">🟡 No ubicado</span>`;
  if (val === "No apoyan") return `<span style="${base} background:#fee2e2; color:#991b1b;">🔴 No apoyan</span>`;
  return `<span style="${base} background:#e5e7eb; color:#111827;">⚪ Sin definir</span>`;
}

// ================================
// SESIÓN
// ================================
function cargarSesion() {
  migrarLocalStorageSiAplica(LS_SESION_KEY, OLD_LS_SESION_KEY);

  try {
    const raw = localStorage.getItem(LS_SESION_KEY);
    if (!raw) return null;
    const sesion = JSON.parse(raw);
    if (!sesion || !sesion.username) return null;
    if (!sesion.municipio && sesion.comuna) {
      sesion.municipio = nombreMunicipioDesdeSesion(sesion);
      delete sesion.comuna;
      localStorage.setItem(LS_SESION_KEY, JSON.stringify(sesion));
    }
    return sesion;
  } catch (e) {
    console.warn("Error al cargar sesión:", e);
    return null;
  }
}

function guardarSesion(username, municipio, rol = "dinamizador") {
  const sesion = { username, rol, municipio };
  localStorage.setItem(LS_SESION_KEY, JSON.stringify(sesion));
}

function cerrarSesion() {
  localStorage.removeItem("municipios_sesion");
  localStorage.removeItem("pasto_sesion");

  sessionStorage.clear();

  window.location.replace("index.html");
}

// ================================
// DATOS
// ================================
function cargarDatos() {
  migrarLocalStorageSiAplica(LS_DATOS_KEY, OLD_LS_DATOS_KEY);

  try {
    const raw = localStorage.getItem(LS_DATOS_KEY);
    if (!raw) {
      datos = {};
      return;
    }
    const parsed = JSON.parse(raw);
    datos = parsed && typeof parsed === "object" ? normalizarDatosMunicipios(parsed) : {};
    guardarDatos();
  } catch (e) {
    console.warn("Error al cargar datos:", e);
    datos = {};
  }

  let maxLider = 0;
  let maxPersona = 0;

  Object.values(datos).forEach((municipioData) => {
    if (!municipioData || !Array.isArray(municipioData.lideres)) return;
    municipioData.lideres.forEach((lider) => {
      if (lider.id && lider.id > maxLider) maxLider = lider.id;
      if (Array.isArray(lider.personas)) {
        lider.personas.forEach((p) => {
          if (p.id && p.id > maxPersona) maxPersona = p.id;
        });
      }
    });
  });

  nextLiderId = maxLider + 1;
  nextPersonaId = maxPersona + 1;
}

function guardarDatos() {
  try {
    localStorage.setItem(LS_DATOS_KEY, JSON.stringify(datos));
  } catch (e) {
    console.warn("Error al guardar datos:", e);
    alert("No fue posible guardar localmente. El almacenamiento del navegador puede estar lleno o bloqueado.");
  }
}

function obtenerDatosMunicipioActual() {
  if (!municipioActual) return null;
  if (!datos[municipioActual]) {
    datos[municipioActual] = { lideres: [] };
  }
  if (!Array.isArray(datos[municipioActual].lideres)) {
    datos[municipioActual].lideres = [];
  }
  return datos[municipioActual];
}

// ================================
// RENDER
// ================================
function refrescarUICaptura() {
  const municipioData = obtenerDatosMunicipioActual();
  if (!municipioData) return;

  const lideres = municipioData.lideres || [];

  const totalLideresSpan = document.getElementById("total-lideres");
  const totalPersonasSpan = document.getElementById("total-personas");
  const totalVotanSpan = document.getElementById("total-votan");

  let totalPersonas = 0;
  let totalVotan = 0;

  lideres.forEach((lider) => {
    if (!Array.isArray(lider.personas)) return;
    totalPersonas += lider.personas.length;
    lider.personas.forEach((p) => {
      if (p.votaCandidato || p.votaTeresa) totalVotan += 1;
    });
  });

  if (totalLideresSpan) totalLideresSpan.textContent = lideres.length.toString();
  if (totalPersonasSpan) totalPersonasSpan.textContent = totalPersonas.toString();
  if (totalVotanSpan) totalVotanSpan.textContent = totalVotan.toString();

  const selectLiderPersona = document.getElementById("select-lider-persona");
  if (selectLiderPersona) {
    const valorPrevio = selectLiderPersona.value;
    selectLiderPersona.innerHTML = "";
    const optDefault = document.createElement("option");
    optDefault.value = "";
    optDefault.textContent = "Seleccione un líder";
    selectLiderPersona.appendChild(optDefault);

    lideres.forEach((lider) => {
      const opt = document.createElement("option");
      opt.value = String(lider.id);
      opt.textContent = lider.nombre || `Líder #${lider.id}`;
      selectLiderPersona.appendChild(opt);
    });

    if (valorPrevio) selectLiderPersona.value = valorPrevio;
  }

  const contListaLideres = document.getElementById("lista-lideres");
  if (!contListaLideres) return;
  contListaLideres.innerHTML = "";

  if (lideres.length === 0) {
    const p = document.createElement("p");
    p.className = "small-text";
    p.textContent = "Aún no hay líderes registrados para este municipio.";
    contListaLideres.appendChild(p);
    return;
  }

  lideres.forEach((lider) => {
    const card = document.createElement("div");
    card.className = "lider-card";

    const header = document.createElement("div");
    header.className = "lider-header";

    const infoLider = document.createElement("div");
    const filaNombre = document.createElement("div");
    filaNombre.style.display = "flex";
    filaNombre.style.flexWrap = "wrap";
    filaNombre.style.alignItems = "center";
    filaNombre.style.gap = "8px";

    const nombreEl = document.createElement("div");
    nombreEl.className = "lider-nombre";
    nombreEl.textContent = lider.nombre || "(Sin nombre)";

    const badgeWrap = document.createElement("div");
    badgeWrap.innerHTML = badgeCompromisoLider(lider.compromisoLider);

    filaNombre.appendChild(nombreEl);
    filaNombre.appendChild(badgeWrap);

    const metaEl = document.createElement("div");
    metaEl.className = "lider-meta";
    const docText = lider.documento ? `Doc: ${lider.documento}` : "Doc: N/D";
    const tipoText = lider.tipo ? `Tipo: ${lider.tipo}` : "Tipo: N/D";
    metaEl.textContent = `${docText} · ${tipoText}`;

    infoLider.appendChild(filaNombre);
    infoLider.appendChild(metaEl);

    const bloqueBtnsLider = document.createElement("div");
    bloqueBtnsLider.style.display = "flex";
    bloqueBtnsLider.style.flexDirection = "column";
    bloqueBtnsLider.style.gap = "4px";

    const btnEditarLider = document.createElement("button");
    btnEditarLider.className = "btn-secondary";
    btnEditarLider.style.fontSize = "11px";
    btnEditarLider.style.padding = "3px 8px";
    btnEditarLider.textContent = "Editar líder";
    btnEditarLider.addEventListener("click", () => editarLider(lider.id));

    const btnEliminarLider = document.createElement("button");
    btnEliminarLider.className = "btn-secondary";
    btnEliminarLider.style.fontSize = "11px";
    btnEliminarLider.style.padding = "3px 8px";
    btnEliminarLider.textContent = "Eliminar líder";
    btnEliminarLider.addEventListener("click", () => eliminarLider(lider.id));

    bloqueBtnsLider.appendChild(btnEditarLider);
    bloqueBtnsLider.appendChild(btnEliminarLider);

    header.appendChild(infoLider);
    header.appendChild(bloqueBtnsLider);
    card.appendChild(header);

    const resumen = document.createElement("div");
    resumen.className = "lider-resumen";

    const numPersonas = Array.isArray(lider.personas) ? lider.personas.length : 0;
    let numVotan = 0;
    if (Array.isArray(lider.personas)) {
      lider.personas.forEach((p) => {
        if (p.votaCandidato || p.votaTeresa) numVotan += 1;
      });
    }

    resumen.textContent = `Personas vinculadas: ${numPersonas} · Votan por Candidato: ${numVotan}`;
    card.appendChild(resumen);

    const wrapperTabla = document.createElement("div");
    wrapperTabla.className = "lider-tabla-wrapper";

    const tabla = document.createElement("table");
    tabla.className = "lider-tabla";

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    ["Nombre", "Documento", "Teléfono", "Dirección", "Zona", "Conoce líder", "Vota Candidato", "Acciones"].forEach((txt) => {
      const th = document.createElement("th");
      th.textContent = txt;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    tabla.appendChild(thead);

    const tbody = document.createElement("tbody");

    if (Array.isArray(lider.personas) && lider.personas.length > 0) {
      lider.personas.forEach((persona) => {
        const tr = document.createElement("tr");

        const campos = [
          persona.nombre || "",
          persona.documento || "",
          persona.telefono || "",
          persona.direccion || "",
          persona.zona || "",
          persona.conoceLider ? "Sí" : "No",
          (persona.votaCandidato || persona.votaTeresa) ? "Sí" : "No",
        ];

        campos.forEach((valor) => {
          const td = document.createElement("td");
          td.textContent = valor;
          tr.appendChild(td);
        });

        const tdAcciones = document.createElement("td");
        const contBtns = document.createElement("div");
        contBtns.style.display = "flex";
        contBtns.style.flexDirection = "column";
        contBtns.style.gap = "4px";

        const btnEditarPersona = document.createElement("button");
        btnEditarPersona.className = "btn-secondary";
        btnEditarPersona.style.fontSize = "11px";
        btnEditarPersona.style.padding = "3px 8px";
        btnEditarPersona.textContent = "Editar";
        btnEditarPersona.addEventListener("click", () => editarPersona(lider.id, persona.id));

        const btnEliminarPersona = document.createElement("button");
        btnEliminarPersona.className = "btn-secondary";
        btnEliminarPersona.style.fontSize = "11px";
        btnEliminarPersona.style.padding = "3px 8px";
        btnEliminarPersona.textContent = "Eliminar";
        btnEliminarPersona.addEventListener("click", () => eliminarPersona(lider.id, persona.id));

        contBtns.appendChild(btnEditarPersona);
        contBtns.appendChild(btnEliminarPersona);
        tdAcciones.appendChild(contBtns);
        tr.appendChild(tdAcciones);

        tbody.appendChild(tr);
      });
    } else {
      const trVacio = document.createElement("tr");
      const tdVacio = document.createElement("td");
      tdVacio.colSpan = 8;
      tdVacio.textContent = "Este líder aún no tiene personas vinculadas.";
      tdVacio.className = "small-text";
      trVacio.appendChild(tdVacio);
      tbody.appendChild(trVacio);
    }

    tabla.appendChild(tbody);
    wrapperTabla.appendChild(tabla);
    card.appendChild(wrapperTabla);
    contListaLideres.appendChild(card);
  });
}

// ================================
// CRUD LÍDER
// ================================
function agregarLiderDesdeFormulario() {
  const municipioData = obtenerDatosMunicipioActual();
  if (!municipioData) return;

  const nombreInput = document.getElementById("lider-nombre");
  const docInput = document.getElementById("lider-documento");
  const telInput = document.getElementById("lider-telefono");
  const dirInput = document.getElementById("lider-direccion");
  const zonaInput = document.getElementById("lider-zona");
  const tipoSelect = document.getElementById("lider-tipo");
  const compSelect = document.getElementById("lider-compromiso");

  const nombre = norm(nombreInput?.value);
  const documento = norm(docInput?.value);
  const telefono = norm(telInput?.value);
  const direccion = norm(dirInput?.value);
  const zona = norm(zonaInput?.value);
  const tipo = norm(tipoSelect?.value);
  const compromisoLider = normalizarCompromisoLider(compSelect?.value);

  if (!nombre || !documento) {
    alert("Por favor diligencia al menos nombre y número de documento del líder.");
    return;
  }

  const duplicado = municipioData.lideres.some(l => norm(l.documento) === documento);
  if (duplicado && !confirm("Ya existe un líder con este documento en el municipio. ¿Deseas guardarlo de todas formas?")) {
    return;
  }

  const nuevoLider = {
    id: nextLiderId++,
    nombre,
    documento,
    telefono,
    direccion,
    zona,
    tipo,
    compromisoLider,
    personas: [],
  };

  municipioData.lideres.push(nuevoLider);
  guardarDatos();
  refrescarUICaptura();

  if (nombreInput) nombreInput.value = "";
  if (docInput) docInput.value = "";
  if (telInput) telInput.value = "";
  if (dirInput) dirInput.value = "";
  if (zonaInput) zonaInput.value = "";
  if (tipoSelect) tipoSelect.value = "";
  if (compSelect) compSelect.value = "";
}

function editarLider(idLider) {
  const municipioData = obtenerDatosMunicipioActual();
  if (!municipioData) return;

  const lider = municipioData.lideres.find((l) => l.id === idLider);
  if (!lider) return;

  const nuevoNombre = prompt("Nombre del líder:", lider.nombre || "");
  if (nuevoNombre === null) return;

  const nuevoDoc = prompt("Número de documento:", lider.documento || "");
  if (nuevoDoc === null) return;

  const nuevoTel = prompt("Teléfono:", lider.telefono || "");
  if (nuevoTel === null) return;

  const nuevaDir = prompt("Dirección / Barrio:", lider.direccion || "");
  if (nuevaDir === null) return;

  const nuevaZona = prompt("Zona de votación:", lider.zona || "");
  if (nuevaZona === null) return;

  const nuevoTipo = prompt("Tipo de líder (A, B o C):", lider.tipo || "");
  if (nuevoTipo === null) return;

  const nuevoComp = prompt("Compromiso del líder (Comprometido / No ubicado / No apoyan):", lider.compromisoLider || "");
  if (nuevoComp === null) return;

  lider.nombre = norm(nuevoNombre);
  lider.documento = norm(nuevoDoc);
  lider.telefono = norm(nuevoTel);
  lider.direccion = norm(nuevaDir);
  lider.zona = norm(nuevaZona);
  lider.tipo = norm(nuevoTipo).toUpperCase();
  lider.compromisoLider = normalizarCompromisoLider(nuevoComp);

  guardarDatos();
  refrescarUICaptura();
}

function eliminarLider(idLider) {
  const municipioData = obtenerDatosMunicipioActual();
  if (!municipioData) return;

  const lider = municipioData.lideres.find((l) => l.id === idLider);
  if (!lider) return;

  const confirmar = confirm(`¿Seguro que deseas eliminar al líder "${lider.nombre}" y TODAS sus personas vinculadas?`);
  if (!confirmar) return;

  municipioData.lideres = municipioData.lideres.filter((l) => l.id !== idLider);
  guardarDatos();
  refrescarUICaptura();
}

// ================================
// CRUD PERSONA
// ================================
function agregarPersonaDesdeFormulario() {
  const municipioData = obtenerDatosMunicipioActual();
  if (!municipioData) return;

  const selectLider = document.getElementById("select-lider-persona");
  const nombreInput = document.getElementById("persona-nombre");
  const docInput = document.getElementById("persona-documento");
  const telInput = document.getElementById("persona-telefono");
  const dirInput = document.getElementById("persona-direccion");
  const zonaInput = document.getElementById("persona-zona");
  const chkConoce = document.getElementById("persona-conoce-lider");
  const chkVota = document.getElementById("persona-vota-teresa");

  const idLider = parseInt(selectLider.value, 10);
  if (!idLider) {
    alert("Selecciona un líder para asociar la persona.");
    return;
  }

  const lider = municipioData.lideres.find((l) => l.id === idLider);
  if (!lider) {
    alert("No se encontró el líder seleccionado. Intenta de nuevo.");
    return;
  }

  const nombre = norm(nombreInput?.value);
  const documento = norm(docInput?.value);
  const telefono = norm(telInput?.value);
  const direccion = norm(dirInput?.value);
  const zona = norm(zonaInput?.value);
  const conoceLider = !!chkConoce?.checked;
  const votaCandidato = !!chkVota?.checked;

  if (!nombre || !documento) {
    alert("Por favor diligencia al menos nombre y número de documento de la persona.");
    return;
  }

  if (!Array.isArray(lider.personas)) lider.personas = [];

  const duplicado = lider.personas.some(p => norm(p.documento) === documento);
  if (duplicado && !confirm("Ya existe una persona con este documento asociada a este líder. ¿Deseas guardarla de todas formas?")) {
    return;
  }

  const nuevaPersona = {
    id: nextPersonaId++,
    nombre,
    documento,
    telefono,
    direccion,
    zona,
    conoceLider,
    votaCandidato,
  };

  lider.personas.push(nuevaPersona);
  guardarDatos();
  refrescarUICaptura();

  if (nombreInput) nombreInput.value = "";
  if (docInput) docInput.value = "";
  if (telInput) telInput.value = "";
  if (dirInput) dirInput.value = "";
  if (zonaInput) zonaInput.value = "";
  if (chkConoce) chkConoce.checked = true;
  if (chkVota) chkVota.checked = false;
}

function editarPersona(idLider, idPersona) {
  const municipioData = obtenerDatosMunicipioActual();
  if (!municipioData) return;

  const lider = municipioData.lideres.find((l) => l.id === idLider);
  if (!lider || !Array.isArray(lider.personas)) return;

  const persona = lider.personas.find((p) => p.id === idPersona);
  if (!persona) return;

  const nuevoNombre = prompt("Nombre de la persona:", persona.nombre || "");
  if (nuevoNombre === null) return;

  const nuevoDoc = prompt("Número de documento:", persona.documento || "");
  if (nuevoDoc === null) return;

  const nuevoTel = prompt("Teléfono:", persona.telefono || "");
  if (nuevoTel === null) return;

  const nuevaDir = prompt("Dirección:", persona.direccion || "");
  if (nuevaDir === null) return;

  const nuevaZona = prompt("Zona de votación:", persona.zona || "");
  if (nuevaZona === null) return;

  const respConoce = prompt("¿Conoce al líder? (s/n)", persona.conoceLider ? "s" : "n");
  if (respConoce === null) return;

  const respVota = prompt("¿Se compromete a votar por Candidato? (s/n)", (persona.votaCandidato || persona.votaTeresa) ? "s" : "n");
  if (respVota === null) return;

  persona.nombre = norm(nuevoNombre);
  persona.documento = norm(nuevoDoc);
  persona.telefono = norm(nuevoTel);
  persona.direccion = norm(nuevaDir);
  persona.zona = norm(nuevaZona);
  persona.conoceLider = respConoce.toLowerCase().startsWith("s");
  persona.votaCandidato = respVota.toLowerCase().startsWith("s");
  delete persona.votaTeresa;

  guardarDatos();
  refrescarUICaptura();
}

function eliminarPersona(idLider, idPersona) {
  const municipioData = obtenerDatosMunicipioActual();
  if (!municipioData) return;

  const lider = municipioData.lideres.find((l) => l.id === idLider);
  if (!lider || !Array.isArray(lider.personas)) return;

  const persona = lider.personas.find((p) => p.id === idPersona);
  if (!persona) return;

  const confirmar = confirm(`¿Seguro que deseas eliminar a la persona "${persona.nombre}"?`);
  if (!confirmar) return;

  lider.personas = lider.personas.filter((p) => p.id !== idPersona);
  guardarDatos();
  refrescarUICaptura();
}

// ================================
// INICIO
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("login-section");
  const municipioSection = document.getElementById("comuna-section");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const municipioTitle = document.getElementById("comuna-title");
  const dinamizadorInfo = document.getElementById("dinamizador-info");
  const logoutBtn = document.getElementById("logout-btn");

  cargarDatos();

  const sesion = cargarSesion();
  if (sesion) {
    usuarioActual = sesion.username;
    municipioActual = nombreMunicipioDesdeSesion(sesion);

    if (loginSection) loginSection.style.display = "none";
    if (municipioSection) municipioSection.style.display = "block";

    if (municipioTitle) municipioTitle.textContent = municipioActual;
    if (dinamizadorInfo) dinamizadorInfo.textContent = `Sesión activa como: ${usuarioActual}`;

    refrescarUICaptura();
  } else {
    if (loginSection) loginSection.style.display = "block";
    if (municipioSection) municipioSection.style.display = "none";
  }

  // Login de respaldo si auth.js no está cargado
  if (loginForm && !window.MUNICIPIOS_AUTH) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const usernameInput = document.getElementById("username");
      const passwordInput = document.getElementById("password");

      const user = norm(usernameInput?.value);
      const pass = norm(passwordInput?.value);

      const encontrado = user.startsWith("din") && pass;
      if (!encontrado) {
        if (loginError) loginError.style.display = "block";
        return;
      }

      usuarioActual = user;
      municipioActual = "Municipio 1";
      guardarSesion(usuarioActual, municipioActual);

      if (loginError) loginError.style.display = "none";
      if (loginSection) loginSection.style.display = "none";
      if (municipioSection) municipioSection.style.display = "block";
      if (municipioTitle) municipioTitle.textContent = municipioActual;
      if (dinamizadorInfo) dinamizadorInfo.textContent = `Sesión activa como: ${usuarioActual}`;

      refrescarUICaptura();
    });
  }

  if (logoutBtn) logoutBtn.addEventListener("click", cerrarSesion);

  const liderForm = document.getElementById("lider-form");
  if (liderForm) {
    liderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      agregarLiderDesdeFormulario();
    });
  }

  const personaForm = document.getElementById("persona-form");
  if (personaForm) {
    personaForm.addEventListener("submit", (event) => {
      event.preventDefault();
      agregarPersonaDesdeFormulario();
    });
  }
});
