// ================================
// AUTH.JS - Usuarios / Roles
// ================================
(function () {
  const AUTH_USERS = [
    { username: "admin", password: "admin123", rol: "admin", municipio: "ALL" },
    { username: "candidato", password: "candidato123", rol: "admin", municipio: "ALL" },
    { username: "camilo", password: "camilo123", rol: "gerencia", municipio: "ALL" },
    { username: "mario", password: "mario123", rol: "coordinador", municipio: "ALL" },
    { username: "darwin", password: "darwin123", rol: "supervisor", municipio: "ALL" },

    { username: "din1",  password: "municipio1",  rol: "dinamizador", municipio: "Municipio 1" },
    { username: "din2",  password: "municipio2",  rol: "dinamizador", municipio: "Municipio 2" },
    { username: "din3",  password: "municipio3",  rol: "dinamizador", municipio: "Municipio 3" },
    { username: "din4",  password: "municipio4",  rol: "dinamizador", municipio: "Municipio 4" },
    { username: "din5",  password: "municipio5",  rol: "dinamizador", municipio: "Municipio 5" },
    { username: "din6",  password: "municipio6",  rol: "dinamizador", municipio: "Municipio 6" },
    { username: "din7",  password: "municipio7",  rol: "dinamizador", municipio: "Municipio 7" },
    { username: "din8",  password: "municipio8",  rol: "dinamizador", municipio: "Municipio 8" },
    { username: "din9",  password: "municipio9",  rol: "dinamizador", municipio: "Municipio 9" },
    { username: "din10", password: "municipio10", rol: "dinamizador", municipio: "Municipio 10" },
    { username: "din11", password: "municipio11", rol: "dinamizador", municipio: "Municipio 11" },
    { username: "din12", password: "municipio12", rol: "dinamizador", municipio: "Municipio 12" },
  ];

  const LS_SESION = "municipios_sesion";

  function authGuardarSesion({ username, rol, municipio }) {
    localStorage.setItem(LS_SESION, JSON.stringify({
      username,
      rol,
      municipio,
      ts: Date.now()
    }));
  }

  function authGetSesion() {
    try { return JSON.parse(localStorage.getItem(LS_SESION) || "null"); }
    catch { return null; }
  }

  function authLogout() {
    localStorage.removeItem(LS_SESION);
    window.location.href = "index.html";
  }

  function authLogin(username, password) {
    const u = AUTH_USERS.find(x => x.username === username && x.password === password);
    if (!u) return null;
    authGuardarSesion({ username: u.username, rol: u.rol, municipio: u.municipio });
    return u;
  }

  function isAprobadorGlobal(rol) {
    const r = (rol || "").toLowerCase();
    return r === "admin" || r === "gerencia" || r === "coordinador";
  }

  function isFullAccess(rol) {
    const r = (rol || "").toLowerCase();
    return r === "admin" || r === "gerencia" || r === "coordinador" || r === "supervisor";
  }

  window.MUNICIPIOS_AUTH = {
    AUTH_USERS,
    authLogin,
    authGetSesion,
    authLogout,
    authGuardarSesion,
    isAprobadorGlobal,
    isFullAccess
  };
})();