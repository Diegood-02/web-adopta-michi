/* Página de acceso: entrar, crear cuenta, recuperar contraseña y cerrar sesión. */
"use strict";

(async () => {
  if (document.body.dataset.pagina !== "acceso") return;
  const $ = (s) => document.querySelector(s);
  const DB = window.MICHI_DB;
  const aviso = $("#acceso-aviso");
  const mostrar = (texto, tipo = "") => {
    aviso.textContent = texto;
    aviso.hidden = !texto;
    aviso.dataset.tipo = tipo;
  };

  if (!DB?.activo) {
    $("#acceso-titulo").textContent = "Cuentas no disponibles";
    $("#form-acceso").hidden = true;
    $("#acceso-tabs").hidden = true;
    mostrar("Las cuentas aún no están activadas en esta versión de vista previa.");
    return;
  }

  // A dónde volver después de entrar (solo rutas internas del sitio).
  const volver = (() => {
    const v = new URLSearchParams(location.search).get("volver") || "";
    return /^[a-z0-9_-]+\.html(\?[\w=&%-]*)?$/i.test(v) ? v : "adopciones.html";
  })();
  if (new URLSearchParams(location.search).has("volver"))
    mostrar("Inicia sesión o crea una cuenta para continuar.");

  const form = $("#form-acceso");
  const enviar = $("#acceso-enviar");
  let modo = "entrar";
  const textos = { entrar: "Entrar", crear: "Crear cuenta", recuperar: "Enviar enlace" };

  function poner(m) {
    modo = m;
    document.querySelectorAll("#acceso-tabs button").forEach((b) => {
      const act = b.dataset.modo === m;
      b.classList.toggle("activo", act);
      b.setAttribute("aria-selected", String(act));
    });
    form.querySelector('[data-campo="nombre"]').hidden = m !== "crear";
    form.querySelector('[data-campo="clave"]').hidden = m === "recuperar";
    form.querySelector('[data-campo="ayuda-clave"]').hidden = m !== "crear";
    form.elements.clave.required = m !== "recuperar";
    form.elements.nombre.required = m === "crear";
    form.elements.clave.autocomplete = m === "crear" ? "new-password" : "current-password";
    enviar.textContent = textos[m];
    mostrar("");
  }
  document.querySelectorAll("#acceso-tabs button").forEach((b) => b.addEventListener("click", () => poner(b.dataset.modo)));

  const claveValida = (c) => c.length >= 8 && /[A-Za-z]/.test(c) && /\d/.test(c);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const correo = form.elements.correo.value.trim();
    const clave = form.elements.clave.value;
    enviar.disabled = true;
    try {
      if (modo === "entrar") {
        await DB.entrar(correo, clave);
        location.href = volver;
        return;
      }
      if (modo === "crear") {
        if (!claveValida(clave)) {
          mostrar("La contraseña necesita al menos 8 caracteres, con letras y números.", "error");
          return;
        }
        await DB.registrar(correo, clave, form.elements.nombre.value.trim());
        form.reset();
        mostrar("¡Listo! Te enviamos un correo para confirmar tu cuenta. Después podrás iniciar sesión.", "ok");
        return;
      }
      await DB.recuperar(correo);
      // Mismo mensaje exista o no la cuenta, para no revelar quién está registrado.
      mostrar("Si ese correo tiene cuenta, te enviamos un enlace para cambiar la contraseña.", "ok");
    } catch (err) {
      mostrar(err.message, "error");
    } finally {
      enviar.disabled = false;
    }
  });

  // Cambio de contraseña desde el enlace del correo.
  const nueva = $("#form-nueva-clave");
  DB.alCambiarSesion((evento) => {
    if (evento !== "PASSWORD_RECOVERY") return;
    form.hidden = true;
    $("#acceso-tabs").hidden = true;
    nueva.hidden = false;
    $("#acceso-titulo").textContent = "Nueva contraseña";
  });
  nueva.addEventListener("submit", async (e) => {
    e.preventDefault();
    const clave = nueva.elements.clave.value;
    if (!claveValida(clave)) {
      mostrar("La contraseña necesita al menos 8 caracteres, con letras y números.", "error");
      return;
    }
    try {
      await DB.cambiarClave(clave);
      nueva.hidden = true;
      mostrar("Contraseña actualizada. Ya puedes seguir navegando.", "ok");
      setTimeout(() => (location.href = "adopciones.html"), 1500);
    } catch (err) {
      mostrar(err.message, "error");
    }
  });

  await DB.iniciar();
  if (DB.usuario && nueva.hidden) {
    form.hidden = true;
    $("#acceso-tabs").hidden = true;
    $("#acceso-titulo").textContent = "Mi cuenta";
    $("#acceso-sesion").hidden = false;
    $("#acceso-hola").textContent = `Sesión iniciada como ${DB.usuario.email}${DB.admin ? " (administrador)" : ""}.`;
    $("#acceso-salir").addEventListener("click", async () => {
      await DB.salir();
      location.href = "index.html";
    });
  }
})();
