document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const nav = document.querySelector(".sidebar-nav");

  if (!toggleBtn || !sidebar || !nav) return;

  let sesion = null;
  try {
    sesion = JSON.parse(localStorage.getItem("municipios_sesion") || "null");
  } catch {
    sesion = null;
  }

  const rol = (sesion && sesion.rol ? sesion.rol : "dinamizador").toLowerCase();

  let menuHTML = `
    <a href="index.html">Captura</a>
    <a href="reportes.html">Reportes</a>
    <a href="reuniones.html">Reuniones</a>
    <a href="agenda.html">Agenda</a>
    <a href="compromisos.html">Compromisos</a>
  `;

  if (rol === "admin" || rol === "gerencia" || rol === "coordinador" || rol === "supervisor") {
    menuHTML += `<a href="panel-general.html">Panel general</a>`;
  }

  nav.innerHTML = menuHTML;

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    const clickedInside = sidebar.contains(e.target) || toggleBtn.contains(e.target);
    if (!clickedInside && sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
    }
  });

  const current = window.location.pathname.split("/").pop() || "index.html";
  nav.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("href") === current) a.classList.add("active");
  });
});