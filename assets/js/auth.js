// ================================
// AUTH.JS - Login único de administrador
// ================================
(function () {
  const AUTH_USERS = [
    {
      username: "admin",
      password: "admin123",
      rol: "admin",
      municipio: "ALL"
    }
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
    try {
      return JSON.parse(localStorage.getItem(LS_SESION) || "null");
    } catch {
      return null;
    }
  }

  function authLogout() {
    localStorage.removeItem(LS_SESION);
    window.location.href = "index.html";
  }

  function authLogin(username, password) {
    const u = AUTH_USERS.find(x => x.username === username && x.password === password);

    if (!u) return null;

    authGuardarSesion({
      username: u.username,
      rol: u.rol,
      municipio: u.municipio
    });

    return u;
  }

  function isAprobadorGlobal(rol) {
    const r = (rol || "").toLowerCase();
    return r === "admin";
  }

  function isFullAccess(rol) {
    const r = (rol || "").toLowerCase();
    return r === "admin";
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
