document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");

  if (!form || !window.MUNICIPIOS_AUTH) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    const username = (document.getElementById("username")?.value || "").trim();
    const password = (document.getElementById("password")?.value || "").trim();

    const user = window.MUNICIPIOS_AUTH.authLogin(username, password);

    if (!user) {
      if (errorEl) errorEl.style.display = "block";
      return;
    }

    if (errorEl) errorEl.style.display = "none";
    window.location.reload();
  });
});