// ================================
// GUARD: PROTEGE PÁGINAS SEGÚN ROL
// ================================
(function () {
  const current = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const PUBLIC_PAGES = ["index.html"];

  if (PUBLIC_PAGES.includes(current)) return;

  let sesion = null;
  try {
    sesion = JSON.parse(localStorage.getItem("municipios_sesion") || "null");
    if (!sesion && localStorage.getItem("pasto_sesion")) {
      const old = JSON.parse(localStorage.getItem("pasto_sesion") || "null");
      if (old) {
        old.municipio = (old.municipio || old.comuna || "Municipio 1").replace(/^Comuna/i, "Municipio");
        delete old.comuna;
        localStorage.setItem("municipios_sesion", JSON.stringify(old));
        sesion = old;
      }
    }
  } catch {
    sesion = null;
  }

  if (!sesion || !sesion.username) {
    window.location.href = "index.html";
    return;
  }

  const rol = (sesion.rol || "dinamizador").toLowerCase();
  const isFull = ["admin", "gerencia", "coordinador", "supervisor"].includes(rol);

  if (current === "panel-general.html" && !isFull) {
    window.location.href = "index.html";
    return;
  }
})();