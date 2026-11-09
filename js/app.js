/* Tu Michi Adopción: navegación multipágina y prototipo sin backend. */
"use strict";
(() => {
  const CLAVE = "tu_michi_adopcion_multipagina_v1";
  const pagina = document.body.dataset.pagina;
  if (["index", "ayuda"].includes(pagina) && !window.MICHI_RESPONDER) {
    const motorChat = document.createElement("script");
    motorChat.src = "js/michi-chat.js";
    document.head.append(motorChat);
  }
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clonar = (x) => JSON.parse(JSON.stringify(x));
  const semilla = () => clonar(window.MICHI_SEMILLA);
  const escapeHTML = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  const img = (g) =>
    `img/gato-${Number(g.imagen) >= 1 && Number(g.imagen) <= 7 ? Number(g.imagen) : 1}.jpg`;
  const fotosGato = (g) => [
    img(g),
    ...(window.MICHI_GALERIAS?.[Number(g.imagen)] || []),
  ];
  const gatoPorId = (id) => datos.gatos.find((g) => g.id === Number(id));
  const meses = (n) =>
    n < 12
      ? `${n} ${n === 1 ? "mes" : "meses"}`
      : Number.isInteger(n / 12)
        ? `${n / 12} ${n === 12 ? "año" : "años"}`
        : `${(n / 12).toFixed(1)} años`;
  const estadoEtiqueta = (x) =>
    ({
      disponible: "En adopción",
      adoptado: "Adoptado",
      archivado: "Archivado",
      pendiente: "En revisión",
      aprobada: "Aceptada",
      rechazada: "Rechazada",
    })[x] || x;
  const fecha = (x) => {
    const d = new Date(x);
    return Number.isNaN(d.getTime())
      ? "Fecha no disponible"
      : d.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  };
  const vacio = (t) => `<div class="vacio">🐾 ${escapeHTML(t)}</div>`;
  let datos,
    puedeGuardar = true;
  try {
    const v = localStorage.getItem(CLAVE);
    datos = v ? JSON.parse(v) : semilla();
    if (
      !datos ||
      !Array.isArray(datos.gatos) ||
      !Array.isArray(datos.solicitudes) ||
      !Array.isArray(datos.veterinarias) ||
      !Array.isArray(datos.mensajes)
    )
      throw new Error("Formato inválido");
  } catch (error) {
    datos = semilla();
    puedeGuardar = false;
    console.warn("Sin localStorage:", error);
  }
  let avisoTiempo;
  function avisar(m) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = m;
    t.hidden = false;
    clearTimeout(avisoTiempo);
    avisoTiempo = setTimeout(() => (t.hidden = true), 5200);
  }
  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      puedeGuardar = true;
      return true;
    } catch (err) {
      puedeGuardar = false;
      avisar(
        "El navegador bloqueó el almacenamiento. Los cambios podrían perderse al recargar.",
      );
      return false;
    }
  }
  function actualizarDirectorio() {
  const { versionDirectorio, veterinarias } = window.MICHI_SEMILLA;
  const migrar = datos.versionDirectorio !== versionDirectorio;
  let fichas = datos.veterinarias;

  if (migrar) {
    const personalizadas = fichas.filter(
      (v) =>
        !(
          /^Veterinaria aliada 0[123]$/.test(v.nombre) &&
          v.zona === "Ubicación pendiente de confirmar" &&
          v.contacto === "Datos por integrar"
        ),
    );

    let ultimoId = Math.max(0, ...personalizadas.map((v) => Number(v.id) || 0));
    fichas = [
      ...veterinarias.map((v) => ({ ...v, id: ++ultimoId })),
      ...personalizadas,
    ];
  }

  const lugares = new Set();
  const enlaces = new Set();

  const unicas = fichas.filter((v) => {
    const nombre = String(v.nombre ?? "").trim();
    const zona = String(v.zona ?? "").trim();
    const lugar = normalizarBusqueda(nombre + "|" + zona);

    if (lugares.has(lugar) || (v.maps && enlaces.has(v.maps))) return false;

    lugares.add(lugar);
    if (v.maps) enlaces.add(v.maps);
    return true;
  });

  if (migrar || unicas.length !== datos.veterinarias.length) {
    datos.veterinarias = unicas;
    datos.versionDirectorio = versionDirectorio;
    guardar();
  }
}
  function cardGato(g) {
    return `<article class="gato-card"><img src="${img(g)}" alt="${escapeHTML(g.nombre)}, gatito del catálogo" loading="lazy"><div class="gato-card-cuerpo"><div class="fila-card"><h3>${escapeHTML(g.nombre)}</h3><span class="etiqueta-estado ${escapeHTML(g.estado)}">${escapeHTML(estadoEtiqueta(g.estado))}</span></div><span class="ficha-edad">${escapeHTML(meses(g.edad))} · ${escapeHTML(g.sexo)} · ${escapeHTML(g.personalidad)}</span><p>${escapeHTML(g.descripcion)}</p><a class="btn btn-rosa" href="gato.html?id=${g.id}">Ver perfil</a></div></article>`;
  }
  function configurarMenu() {
    const btn = $("#menu-toggle"),
      nav = $("#menu-principal");
    if (!btn || !nav) return;
    btn.addEventListener("click", () => {
      const abierto = nav.classList.toggle("abierto");
      btn.setAttribute("aria-expanded", String(abierto));
    });
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        nav.classList.remove("abierto");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }
  function initInicio() {
    const slides = $$("[data-slide]");
    let idx = 0,
      timer;
    function mostrar(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach((slide, k) => {
        slide.hidden = k !== idx;
        slide.classList.toggle("activo", k === idx);
      });
      $$("[data-ir]").forEach((b, k) => {
        b.classList.toggle("activo", k === idx);
        if (k === idx) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
    }
    const hero = $("#carrusel-inicio");
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    function pausar() {
      clearInterval(timer);
      timer = null;
    }
    function iniciar() {
      pausar();
      if (!reduced && !document.hidden)
        timer = setInterval(() => mostrar(idx + 1), 6500);
    }
    $("#hero-prev").addEventListener("click", () => {
      mostrar(idx - 1);
      iniciar();
    });
    $("#hero-next").addEventListener("click", () => {
      mostrar(idx + 1);
      iniciar();
    });
    $$("[data-ir]").forEach((b) =>
      b.addEventListener("click", () => {
        mostrar(Number(b.dataset.ir));
        iniciar();
      }),
    );
    hero.addEventListener("mouseenter", pausar);
    hero.addEventListener("mouseleave", iniciar);
    hero.addEventListener("focusin", pausar);
    hero.addEventListener("focusout", (e) => {
      if (!hero.contains(e.relatedTarget)) iniciar();
    });
    document.addEventListener("visibilitychange", () =>
      document.hidden ? pausar() : iniciar(),
    );
    mostrar(0);
    iniciar();
    const num = $("#hero-numero");
    if (num) {
      const observer = new MutationObserver(() => {
        const actual = $("[data-slide].activo");
        num.textContent = String(
          (Number(actual?.dataset.slide) || 0) + 1,
        ).padStart(2, "0");
      });
      observer.observe(hero, {
        attributes: true,
        attributeFilter: ["class"],
        subtree: true,
      });
    }
    const carrusel = $("#michis-destacados"),
      track = $("#marquee-track"),
      pausaBtn = $("#pausar-marquee");
    const disponibles = datos.gatos.filter((g) => g.estado === "disponible");
    const tarjeta = (g, duplicado = false) =>
      `<article class="card-testimonial"><a href="gato.html?id=${encodeURIComponent(g.id)}" ${duplicado ? 'tabindex="-1"' : ""} aria-label="Ver ficha de ${escapeHTML(g.nombre)}"><div class="marquee-foto"><img src="${img(g)}" alt="Gato ${escapeHTML(g.nombre)}" loading="lazy"><span class="marquee-imagen-etiqueta">♥ EN ADOPCIÓN</span></div><div class="marquee-contenido"><span class="marquee-ficha">${escapeHTML(g.sexo)} · ${escapeHTML(meses(g.edad))}</span><h3>${escapeHTML(g.nombre)}</h3><p>${escapeHTML(g.descripcion)}</p><span class="marquee-ver">Conocer su historia <span aria-hidden="true">↗</span></span></div></a></article>`;
    if (!disponibles.length) {
      track.innerHTML = vacio("No hay michis disponibles en este momento.");
      pausaBtn.hidden = true;
      return;
    }
    const grupo = (dupe = false) =>
      `<div class="marquee-grupo" ${dupe ? 'aria-hidden="true"' : ""}>${disponibles.map((g) => tarjeta(g, dupe)).join("")}</div>`;
    track.innerHTML = grupo() + grupo(true);
    if (reduced) {
      carrusel.classList.add("sin-animacion");
      pausaBtn.hidden = true;
    } else
      pausaBtn.addEventListener("click", () => {
        const pausado = carrusel.classList.toggle("pausa-forzada");
        pausaBtn.setAttribute("aria-pressed", String(pausado));
        pausaBtn.textContent = pausado
          ? "▶ Reanudar carrusel"
          : "⏸ Pausar carrusel";
      });
  }
  function initAdopciones() {
    const buscar = $("#buscar-gato"),
      personalidad = $("#filtro-personalidad"),
      estado = $("#filtro-estado");
    function dibujar() {
      const q = buscar.value.trim().toLocaleLowerCase("es");
      const l = datos.gatos.filter(
        (g) =>
          (estado.value === "todos" || g.estado === estado.value) &&
          (!personalidad.value || g.personalidad === personalidad.value) &&
          (!q ||
            [g.nombre, g.personalidad, g.descripcion]
              .join(" ")
              .toLocaleLowerCase("es")
              .includes(q)),
      );
      $("#lista-gatos").innerHTML = l.length
        ? l.map(cardGato).join("")
        : vacio("No encontramos gatos con esos filtros.");
      $("#conteo-gatos").textContent =
        `${datos.gatos.filter((g) => g.estado === "disponible").length} michis buscan un hogar. Usa los filtros para conocerlos.`;
    }
    [buscar, personalidad, estado].forEach((el) =>
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", dibujar),
    );
    dibujar();
  }
  function paramsId() {
    return new URLSearchParams(location.search).get("id");
  }
  function initGato() {
    const g = gatoPorId(paramsId());
    const el = $("#perfil-gato");
    if (!g) {
      el.innerHTML = vacio("Ese perfil no existe. Vuelve al catálogo.");
      return;
    }
    document.title = `${g.nombre} | Tu Michi Adopción`;
    const med = [
      ["Vacunación", g.vacunas],
      ["Esterilización", g.esterilizado],
      ["Desparasitación", g.desparasitado],
    ]
      .map(
        ([t, v]) =>
          `<li><span>${escapeHTML(t)}</span><b class="${v ? "si" : "no"}">${v ? "☑ Sí" : "◻ Pendiente"}</b></li>`,
      )
      .join("");
    el.innerHTML = `<div class="perfil-layout"><div><img class="perfil-foto-principal" src="${img(g)}" alt="Foto de ${escapeHTML(g.nombre)}"><div class="mini-fotos" role="group" aria-label="Galería de ${escapeHTML(g.nombre)}">${fotosGato(
      g,
    )
      .map(
        (foto, i) =>
          `<button type="button" class="mini-foto-boton" data-foto="${foto}" aria-label="Ver foto ${i + 1} de ${escapeHTML(g.nombre)}" aria-pressed="${i === 0}"><img src="${foto}" alt="${i === 0 ? "Foto principal" : "Foto de referencia de apariencia similar"}" loading="lazy"></button>`,
      )
      .join(
        "",
      )}</div><p class="galeria-nota texto-muted">Fotos de referencia para el prototipo; pueden mostrar gatos de apariencia similar.</p></div><div class="perfil-datos"><span class="pre-titulo">♥ CONOCE A TU NUEVO AMIGO</span><h1>${escapeHTML(g.nombre)}</h1><p><strong>${escapeHTML(meses(g.edad))} · ${escapeHTML(g.sexo)} · ${escapeHTML(g.personalidad)}</strong></p><span class="etiqueta-estado ${escapeHTML(g.estado)}">${escapeHTML(estadoEtiqueta(g.estado))}</span><div class="medico"><h3>🩺 Estado médico de ejemplo</h3><ul>${med}</ul><small class="texto-muted">Información ilustrativa, no reemplaza un expediente o valoración veterinaria.</small></div><h3>Su historia</h3><p class="perfil-historia">${escapeHTML(g.historia)}</p><p>${escapeHTML(g.descripcion)}</p><div class="perfil-banner">🐱 Antes de adoptar, recuerda que el compromiso de cuidar a un gato es de largo plazo.</div>${g.estado === "disponible" ? `<a href="solicitar.html?id=${g.id}" class="btn btn-rosa">Solicitar adopción</a>` : `<a href="adopciones.html" class="btn btn-outline">Buscar otro gatito</a>`}</div></div>`;
  }
  document.addEventListener("click", (e) => {
    const boton = e.target.closest(".mini-foto-boton");
    if (!boton) return;
    const perfil = boton.closest(".perfil-layout");
    const principal = perfil.querySelector(".perfil-foto-principal");
    principal.src = boton.dataset.foto;
    principal.alt = boton
      .getAttribute("aria-label")
      .replace("Ver foto", "Foto");
    perfil
      .querySelectorAll(".mini-foto-boton")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === boton)));
  });
  function initSolicitar() {
    const g = gatoPorId(paramsId()),
      elegido = $("#gato-elegido"),
      f = $("#form-adopcion");
    if (!g || g.estado !== "disponible") {
      elegido.innerHTML = vacio(
        "Este michi no está disponible para una solicitud.",
      );
      $(".form-tarjeta").hidden = true;
      return;
    }
    elegido.innerHTML = `<img src="${img(g)}" alt="${escapeHTML(g.nombre)}"><div><strong>Solicitud de adopción para ${escapeHTML(g.nombre)}</strong><p>${escapeHTML(meses(g.edad))} · ${escapeHTML(g.personalidad)}</p></div>`;
    f.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (!f.reportValidity()) return;
      if (gatoPorId(g.id)?.estado !== "disponible") {
        avisar("Este gatito ya no está disponible.");
        return;
      }
      const a = Object.fromEntries(new FormData(f));
      if (Number(a.edad) < 18) {
        avisar(
          "El formulario de prueba es solo para personas mayores de edad.",
        );
        return;
      }
      if (a.acuerdo !== "Sí") {
        avisar(
          "Para continuar, todas las personas del hogar deben estar de acuerdo.",
        );
        return;
      }
      const folio = `MICH-${Date.now().toString(36).toUpperCase()}`;
      datos.solicitudes.unshift({
        id: folio,
        gatoId: g.id,
        gatoNombre: g.nombre,
        nombre: String(a.nombre).trim(),
        edad: Number(a.edad),
        telefono: String(a.telefono).trim(),
        correo: String(a.correo).trim(),
        direccion: String(a.direccion).trim(),
        mascotas: a.mascotas,
        experiencia: a.experiencia,
        acuerdo: a.acuerdo,
        motivo: String(a.motivo).trim(),
        estado: "pendiente",
        fecha: new Date().toISOString(),
      });
      const guardo = guardar();
      f.reset();
      $(".form-tarjeta").innerHTML =
        `<div class="centrar"><span style="font-size:3rem">💗</span><h1>¡Solicitud registrada!</h1><p>Tu folio de prueba es <strong>${escapeHTML(folio)}</strong>.</p><p>${guardo ? "Quedó guardada solo en este navegador." : "Tu navegador bloqueó el guardado; puede perderse al salir."} No fue enviada a ningún refugio.</p><a href="solicitudes.html" class="btn btn-rosa">Ver mis solicitudes</a></div>`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  function resumenCifra(n, texto) {
    return `<article class="tarjeta-cifra"><strong>${n}</strong><span>${escapeHTML(texto)}</span></article>`;
  }
  function solicitudCard(s, admin = false) {
    const g = gatoPorId(s.gatoId);
    return `<article class="solicitud-fila">${g ? `<img src="${img(g)}" alt="Foto de ${escapeHTML(g.nombre)}">` : '<span aria-hidden="true">🐾</span>'}<div class="crecer"><strong>${escapeHTML(s.gatoNombre || g?.nombre || "Michi")} ${admin ? `— ${escapeHTML(s.nombre)}` : ""}</strong><small>Folio: ${escapeHTML(s.id)} · ${fecha(s.fecha)}</small>${admin ? `<small>Correo demo: ${escapeHTML(s.correo)} · Motivo: ${escapeHTML(s.motivo)}</small>` : ""}</div><span class="status ${escapeHTML(s.estado)}">${escapeHTML(estadoEtiqueta(s.estado))}</span>${admin && s.estado === "pendiente" ? `<div class="acciones"><button type="button" class="btn-small" data-aprobar="${escapeHTML(s.id)}">Aprobar</button><button type="button" class="btn-small peligro" data-rechazar="${escapeHTML(s.id)}">Rechazar</button></div>` : ""}</article>`;
  }
  function initSolicitudes() {
    const a = datos.solicitudes;
    $("#resumen-solicitudes").innerHTML =
      resumenCifra(a.length, "Solicitudes enviadas") +
      resumenCifra(
        a.filter((x) => x.estado === "pendiente").length,
        "En revisión",
      ) +
      resumenCifra(
        a.filter((x) => x.estado === "aprobada").length,
        "Aceptadas",
      );
    $("#lista-solicitudes").innerHTML = a.length
      ? a.map((s) => solicitudCard(s)).join("")
      : vacio(
          "Aún no tienes solicitudes de prueba. Visita Adopciones para crear una.",
        );
  }
  function initBlog() {
    const arts = window.MICHI_ARTICULOS,
      d = arts.primeros;
    $("#blog-destacado").innerHTML =
      `<article class="blog-destacado"><img src="${d.imagen}" alt="Gatito blanco de pelo suave"><div class="contenido"><span class="pre-titulo">ARTÍCULO DESTACADO</span><h2>${escapeHTML(d.titulo)}</h2><p>${escapeHTML(d.resumen)}</p><a class="btn btn-rosa" href="articulo.html?id=primeros">Leer artículo</a></div></article>`;
    $("#blog-grid").innerHTML = Object.entries(arts)
      .filter(([id]) => id !== "primeros")
      .map(
        ([id, a]) =>
          `<article class="articulo-card"><img src="${a.imagen}" alt="Fotografía de gatito"><div><span class="pre-titulo">${escapeHTML(a.categoria)}</span><h3>${escapeHTML(a.titulo)}</h3><p>${escapeHTML(a.resumen)}</p><a class="texto-enlace" href="articulo.html?id=${id}">Leer artículo →</a></div></article>`,
      )
      .join("");
  }
  function initArticulo() {
  const a = window.MICHI_ARTICULOS[paramsId()];
  const contenido = $("#contenido-articulo");

  if (!a) {
    contenido.innerHTML = vacio("No se encontró este artículo.");
    return;
  }

  document.title = `${a.titulo} | Tu Michi Adopción`;

  const parrafos = a.parrafos.map((p, i) => {
    const clase = i === 0 && a.beneficios?.length ? ' class="lectura-entrada"' : "";
    return `<p${clase}>${escapeHTML(p)}</p>`;
  }).join("");

  const tarjetas = (a.beneficios ?? []).map((b) =>
    `<li><h3>${escapeHTML(b.titulo)}</h3><p>${escapeHTML(b.texto)}</p></li>`
  ).join("");

  const fuente = a.fuente
    ? `<p class="lectura-fuente">Adaptado de <a class="texto-enlace" href="${escapeHTML(a.fuente.url)}">${escapeHTML(a.fuente.nombre)}</a>.</p>`
    : "";

  contenido.innerHTML = `
    <img src="${escapeHTML(a.imagen)}" alt="Fotografía de un gato">
    <div class="lectura-contenido">
      <span class="pre-titulo">${escapeHTML(a.categoria)}</span>
      <h1>${escapeHTML(a.titulo)}</h1>
      ${parrafos}
      ${tarjetas ? `<h2 class="lectura-subtitulo">Beneficios principales</h2>
        <ul class="lectura-beneficios" role="list">${tarjetas}</ul>` : ""}
      <p>Consulta a un médico veterinario para orientar los cuidados de tu gato.</p>
      ${fuente}
      <a href="blog.html" class="btn btn-outline">Volver al blog</a>
    </div>`;
}
  const normalizarBusqueda = (texto) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  function enlaceGoogleMaps(valor) {
    if (!valor) return "";
    try {
      const url = new URL(valor);
      if (url.protocol !== "https:" || url.username || url.password) return "";
      const esEnlaceCorto =
        url.hostname === "maps.app.goo.gl" && url.pathname.length > 1;
      const esGoogle = [
        "www.google.com",
        "google.com",
        "www.google.com.mx",
        "google.com.mx",
      ].includes(url.hostname);
      const esRutaDeMaps = esGoogle && /^\/maps(?:\/|$)/.test(url.pathname);
      return esEnlaceCorto || esRutaDeMaps || url.hostname === "maps.google.com"
        ? url.href
        : "";
    } catch {
      return "";
    }
  }
  function cardVet(v) {
    const nombre = escapeHTML(v.nombre);
    const contacto = escapeHTML(v.contacto);
    const numero = String(v.contacto ?? "").replace(/[\s().-]/g, "");
    const telefono = /^\+?\d{10,15}$/.test(numero)
      ? `<a class="texto-enlace" href="tel:${numero}">${contacto}</a>`
      : contacto;
    const mapa = enlaceGoogleMaps(v.maps);
    const horario = v.horario
      ? `<p><strong>Horario:</strong> ${escapeHTML(v.horario)}</p>`
      : "";
    const ubicacion = mapa
      ? `<a class="btn btn-rosa" href="${escapeHTML(mapa)}" target="_blank" rel="noopener noreferrer" aria-label="Cómo llegar a ${nombre} en Google Maps">Cómo llegar</a>`
      : "";
    return `<article class="gato-card vet-card">
  <div class="vet-foto" aria-hidden="true"><span>🩺</span></div>
  <div class="gato-card-cuerpo">
   <h3>${nombre}</h3>
   <p><strong>Tipo:</strong> ${escapeHTML(v.especialidad)}</p>
   <p><strong>Dirección:</strong> ${escapeHTML(v.zona)}</p>
   <p><strong>Contacto:</strong> ${telefono}</p>
   ${horario}
   ${ubicacion}
  </div>
 </article>`;
  }
  function initVets() {
    const input = $("#buscar-vet"),
      lista = $("#lista-vets");
    function dibujar() {
      const consulta = normalizarBusqueda(input.value.trim());
      const coincidencias = datos.veterinarias.filter((v) =>
        normalizarBusqueda(
          [v.nombre, v.especialidad, v.zona].join(" "),
        ).includes(consulta),
      );
      lista.innerHTML = coincidencias.length
        ? coincidencias.map(cardVet).join("")
        : vacio("No se encontraron establecimientos con esa búsqueda.");
    }
    input.addEventListener("input", dibujar);
    dibujar();
  }
  function respuestaChat(p) {
    return window.MICHI_RESPONDER
      ? window.MICHI_RESPONDER(p)
      : "El asistente todavía se está cargando. Intenta de nuevo en unos segundos.";
  }
  function initAyuda() {
    const dialogo = $("#chat-conversacion");
    function agregar(texto, yo) {
      const div = document.createElement("div");
      div.className = `burbuja ${yo ? "yo" : ""}`;
      div.textContent = texto;
      dialogo.append(div);
      dialogo.scrollTop = dialogo.scrollHeight;
    }
    function preguntar(t) {
      const q = String(t).trim().slice(0, 240);
      if (!q) return;
      agregar(q, true);
      agregar(respuestaChat(q), false);
    }
    agregar(
      "¡Hola! Soy Michi 🐱. Puedes preguntar por adopciones, solicitudes, veterinarias o cuidados.",
      false,
    );
    $("#form-chat").addEventListener("submit", (e) => {
      e.preventDefault();
      preguntar($("#chat-input").value);
      e.currentTarget.reset();
    });
    $$("[data-pregunta]").forEach((b) =>
      b.addEventListener("click", () => preguntar(b.dataset.pregunta)),
    );
    $("#form-contacto")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      datos.mensajes.unshift({
        id: Date.now(),
        nombre: d.nombre.trim(),
        correo: d.correo.trim(),
        motivo: d.motivo,
        mensaje: d.mensaje.trim(),
        fecha: new Date().toISOString(),
      });
      guardar();
      f.reset();
      avisar(
        "Mensaje de prueba guardado localmente. No se envió ningún correo.",
      );
    });
  }
  function initGestion() {
    const tabs = $$("[data-tab]");
    tabs.forEach((b) =>
      b.addEventListener("click", () => {
        tabs.forEach((t) => {
          const act = t === b;
          t.classList.toggle("activo", act);
          t.setAttribute("aria-selected", String(act));
        });
        $$(".panel-tab").forEach(
          (p) => (p.hidden = p.id !== `tab-${b.dataset.tab}`),
        );
      }),
    );
    function dibujar() {
      $("#resumen-gestion").innerHTML =
        resumenCifra(
          datos.gatos.filter((g) => g.estado === "disponible").length,
          "Michis disponibles",
        ) +
        resumenCifra(
          datos.solicitudes.filter((s) => s.estado === "pendiente").length,
          "Solicitudes pendientes",
        ) +
        resumenCifra(
          datos.solicitudes.filter((s) => s.estado === "aprobada").length,
          "Adopciones aprobadas",
        );
      $("#gestion-gatos").innerHTML = datos.gatos.length
        ? datos.gatos
            .map(
              (g) =>
                `<div class="item-admin"><div class="info"><strong>${escapeHTML(g.nombre)}</strong><small>${escapeHTML(meses(g.edad))} · ${escapeHTML(estadoEtiqueta(g.estado))}</small></div><div class="acciones"><button type="button" class="btn-small" data-editar="${g.id}">Editar</button><button type="button" class="btn-small ${g.estado === "archivado" ? "" : "peligro"}" data-archivo="${g.id}">${g.estado === "archivado" ? "Restaurar" : "Archivar"}</button></div></div>`,
            )
            .join("")
        : vacio("No hay gatos registrados.");
      $("#gestion-solicitudes").innerHTML = datos.solicitudes.length
        ? datos.solicitudes.map((s) => solicitudCard(s, true)).join("")
        : vacio("Todavía no hay solicitudes para revisar.");
      $("#gestion-vets").innerHTML = datos.veterinarias.length
        ? datos.veterinarias
            .map(
              (v) =>
                `<div class="item-admin"><div class="info"><strong>${escapeHTML(v.nombre)}</strong><small>${escapeHTML(v.especialidad)}</small></div><button type="button" class="btn-small peligro" data-borrar-vet="${v.id}">Quitar</button></div>`,
            )
            .join("")
        : vacio("No hay fichas en el directorio.");
      $("#gestion-mensajes").innerHTML = datos.mensajes.length
        ? datos.mensajes
            .map(
              (m) =>
                `<div class="item-admin"><div class="info"><strong>${escapeHTML(m.motivo)} · ${escapeHTML(m.nombre)}</strong><small>${escapeHTML(m.correo)} · ${fecha(m.fecha)}</small><small>${escapeHTML(m.mensaje)}</small></div><button type="button" class="btn-small peligro" data-borrar-mensaje="${m.id}">Eliminar</button></div>`,
            )
            .join("")
        : vacio("No hay mensajes de prueba.");
    }
    const f = $("#form-gato");
    function limpiar() {
      f.reset();
      f.elements.id.value = "";
      $("#titulo-form-gato").textContent = "Agregar gatito";
      $("#cancelar-edicion").hidden = true;
    }
    $("#cancelar-edicion").addEventListener("click", limpiar);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      const nombre = d.nombre.trim(),
        edad = Number(d.edad),
        descripcion = d.descripcion.trim(),
        historia = d.historia.trim();
      if (
        !nombre ||
        !Number.isInteger(edad) ||
        edad < 1 ||
        edad > 240 ||
        !descripcion ||
        !historia
      ) {
        avisar("Revisa los campos del perfil.");
        return;
      }
      const entrada = {
        nombre,
        edad,
        sexo: d.sexo,
        personalidad: d.personalidad,
        descripcion,
        historia,
        imagen: Number(d.imagen),
        estado: d.estado,
        vacunas: !!d.vacunas,
        esterilizado: !!d.esterilizado,
        desparasitado: !!d.desparasitado,
      };
      if (d.id) {
        const g = gatoPorId(d.id);
        if (!g) {
          avisar("No encontramos ese perfil.");
          return;
        }
        Object.assign(g, entrada);
      } else
        datos.gatos.push({
          id: Math.max(0, ...datos.gatos.map((g) => g.id)) + 1,
          ...entrada,
        });
      guardar();
      limpiar();
      dibujar();
      avisar("Perfil guardado en este navegador.");
    });
    $("#form-vet").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      if (!form.reportValidity()) return;
      const v = Object.fromEntries(
        [...new FormData(form)].map(([k, valor]) => [k, valor.trim()]),
      );
      if (v.maps && !enlaceGoogleMaps(v.maps)) {
        avisar("Pega un enlace válido de Google Maps.");
        form.elements.maps.focus();
        return;
      }
      datos.veterinarias.push({
        id: Math.max(0, ...datos.veterinarias.map((x) => x.id)) + 1,
        ...v,
      });
      guardar();
      form.reset();
      dibujar();
      avisar("Ficha agregada al directorio en este navegador.");
    });
    document.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.editar) {
        const g = gatoPorId(b.dataset.editar);
        if (!g) return;
        for (const k of [
          "id",
          "nombre",
          "edad",
          "sexo",
          "personalidad",
          "descripcion",
          "historia",
          "imagen",
          "estado",
        ])
          f.elements[k].value = g[k];
        for (const k of ["vacunas", "esterilizado", "desparasitado"])
          f.elements[k].checked = !!g[k];
        $("#titulo-form-gato").textContent = `Editar a ${g.nombre}`;
        $("#cancelar-edicion").hidden = false;
        f.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (b.dataset.archivo) {
        const g = gatoPorId(b.dataset.archivo);
        if (g) {
          g.estado = g.estado === "archivado" ? "disponible" : "archivado";
          guardar();
          dibujar();
          avisar("Estado del gatito actualizado.");
        }
      }
      if (b.dataset.aprobar || b.dataset.rechazar) {
        const id = b.dataset.aprobar || b.dataset.rechazar;
        const s = datos.solicitudes.find(
          (x) => x.id === id && x.estado === "pendiente",
        );
        if (!s) return;
        if (b.dataset.aprobar) {
          const g = gatoPorId(s.gatoId);
          if (!g || g.estado !== "disponible") {
            avisar("No se puede aprobar: el michi ya no está disponible.");
            return;
          }
          s.estado = "aprobada";
          g.estado = "adoptado";
          datos.solicitudes.forEach((o) => {
            if (
              o.gatoId === s.gatoId &&
              o.id !== s.id &&
              o.estado === "pendiente"
            )
              o.estado = "rechazada";
          });
        } else s.estado = "rechazada";
        guardar();
        dibujar();
        avisar(`Solicitud: ${estadoEtiqueta(s.estado)}.`);
      }
      if (b.dataset.borrarVet) {
        datos.veterinarias = datos.veterinarias.filter(
          (v) => v.id !== Number(b.dataset.borrarVet),
        );
        guardar();
        dibujar();
        avisar("Ficha quitada del directorio en este navegador.");
      }
      if (b.dataset.borrarMensaje) {
        datos.mensajes = datos.mensajes.filter(
          (m) => m.id !== Number(b.dataset.borrarMensaje),
        );
        guardar();
        dibujar();
        avisar("Mensaje de prueba eliminado.");
      }
    });
    $("#reiniciar-demo").addEventListener("click", () => {
      if (
        !confirm(
          "¿Restablecer todos los datos de ejemplo? Se borrarán las solicitudes, mensajes y cambios hechos en este navegador.",
        )
      )
        return;
      datos = semilla();
      guardar();
      limpiar();
      dibujar();
      avisar("Datos iniciales restaurados.");
    });
    dibujar();
  }
  window.MICHI_INICIAR_CHAT = initAyuda;
  actualizarDirectorio();
  configurarMenu();
  const inicializar = {
    index: initInicio,
    nosotros: () => {},
    adopciones: initAdopciones,
    gato: initGato,
    solicitar: initSolicitar,
    solicitudes: initSolicitudes,
    blog: initBlog,
    articulo: initArticulo,
    veterinarias: initVets,
    ayuda: initAyuda,
    gestion: initGestion,
  };
  if (inicializar[pagina]) inicializar[pagina]();
  if (!puedeGuardar)
    avisar(
      "Almacenamiento local deshabilitado; los cambios podrían perderse al recargar.",
    );
})();
