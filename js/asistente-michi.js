/* Asistente flotante de Inicio. Usa el chat y el visor de Tu Michi. */
"use strict";

(() => {
  if (document.body.dataset.pagina !== "index") return;

  const asistente = document.createElement("div");
  asistente.className = "asistente-michi";
  asistente.innerHTML = `
    <section class="michi-chat" id="michi-chat-panel" role="dialog"
             aria-labelledby="michi-chat-titulo" hidden>
      <header class="michi-chat-cabecera">
        <div>
          <h2 id="michi-chat-titulo">Chat con Michi</h2>
          <p>Adopción y cuidados</p>
        </div>
        <button type="button" class="michi-chat-cerrar"
                aria-label="Cerrar el chat">×</button>
      </header>

      <div class="chat-conversacion" id="chat-conversacion"
           role="log" aria-label="Conversación con Michi" aria-live="polite"></div>

      <div class="preguntas-rapidas">
        <button type="button" data-pregunta="¿Cómo puedo adoptar?">Adopciones</button>
        <button type="button" data-pregunta="¿Dónde hay veterinarias?">Veterinarias</button>
      </div>

      <form id="form-chat" class="fila-chat">
        <label class="sr-only" for="chat-input">Mensaje para Michi</label>
        <input id="chat-input" type="text" placeholder="Escribe tu pregunta"
               maxlength="240" autocomplete="off" required>
        <button type="submit" class="btn btn-rosa">Enviar</button>
      </form>
    </section>

    <button class="michi-lanzador" type="button" aria-controls="michi-chat-panel"
            aria-expanded="false">
      <span class="michi-avatar" aria-hidden="true" inert>
        <img src="img/gatito-3d-preview.jpg" width="72" height="72" alt="">
      </span>
      <span>Habla con Michi</span>
    </button>
  `;
  document.body.append(asistente);

  const lanzador = asistente.querySelector(".michi-lanzador");
  const panel = asistente.querySelector(".michi-chat");
  const cerrar = asistente.querySelector(".michi-chat-cerrar");
  const avatar = asistente.querySelector(".michi-avatar");
  const reducirMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  let chatListo = false;
  let cargandoModelo = false;
  let modelo;

  function sincronizarGiro() {
    modelo?.toggleAttribute(
      "auto-rotate",
      !panel.hidden && !reducirMovimiento.matches,
    );
  }

  async function cargarAvatar() {
    if (
      modelo ||
      cargandoModelo ||
      typeof window.MICHI_CARGAR_3D !== "function"
    )
      return;
    cargandoModelo = true;
    try {
      await window.MICHI_CARGAR_3D();
      const visor = document.createElement("model-viewer");
      visor.className = "michi-modelo";
      visor.alt = "Gato 3D de Tu Michi";
      visor.addEventListener(
        "load",
        () => {
          visor.classList.add("michi-modelo-listo");
        },
        { once: true },
      );
      visor.addEventListener(
        "error",
        () => {
          visor.remove();
          modelo = undefined;
        },
        { once: true },
      );
      modelo = visor;
      visor.src = "modelos/gatito-3d.glb";
      avatar.append(visor);
      sincronizarGiro();
    } catch (error) {
      console.warn("Michi conserva su imagen de vista previa:", error);
    } finally {
      cargandoModelo = false;
    }
  }

  function mostrarChat(mostrar) {
    if (mostrar && !chatListo) {
      if (typeof window.MICHI_INICIAR_CHAT !== "function") {
        window.location.href = "ayuda.html#form-chat";
        return;
      }
      window.MICHI_INICIAR_CHAT();
      chatListo = true;
    }

    panel.hidden = !mostrar;
    lanzador.setAttribute("aria-expanded", String(mostrar));
    sincronizarGiro();
    if (mostrar) {
      cerrar.focus();
      cargarAvatar();
    } else {
      lanzador.focus();
    }
  }

  lanzador.addEventListener("click", () => mostrarChat(panel.hidden));
  cerrar.addEventListener("click", () => mostrarChat(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) mostrarChat(false);
  });
  reducirMovimiento.addEventListener?.("change", sincronizarGiro);
})();
