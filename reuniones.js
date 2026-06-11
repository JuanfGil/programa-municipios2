document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-panel-general");
  if (!btn) return;

  let sesion = null;
  try {
    sesion = JSON.parse(localStorage.getItem("municipios_sesion") || "null");
  } catch {
    sesion = null;
  }

  if (!sesion || !sesion.rol) {
    btn.style.display = "none";
    return;
  }

  const rol = sesion.rol.toLowerCase();
  const isAdmin = rol === "admin" || rol === "gerencia" || rol === "coordinador" || rol === "supervisor";

  btn.style.display = isAdmin ? "inline-flex" : "none";
});