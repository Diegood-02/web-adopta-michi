/* Motor del chat de Michi: búsqueda local por palabras clave sobre el contenido publicado del sitio.
   Sin modelos de IA ni servidor. Solo responde con información que ya aparece en el sitio.
   Devuelve { texto, enlace } y recuerda el último gato, veterinaria o artículo para preguntas de seguimiento. */
"use strict";

(() => {
  const UMBRAL = 1.0;
  const K1 = 1.2;
  const B = 0.75;
  const LIMITE_RESPUESTA = 600;

  const norm = (s) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  // Variantes de una misma idea. Todo se lleva a la palabra canónica (la clave).
  const SINONIMOS = {
    adopcion: ["adopcion", "adopciones", "adoptar", "adopto", "adoptarlo", "adoptarla", "adoptable", "adoptables", "adoptan", "adoptas"],
    solicitud: ["solicitud", "solicitudes", "solicitar", "solicito", "folio", "estado", "revision", "revisar", "tramite"],
    requisito: ["requisito", "requisitos", "documentos", "cumplir", "formulario"],
    veterinaria: ["veterinaria", "veterinarias", "veterinario", "veterinarios", "vet", "clinica", "clinicas", "hospital", "consultorio"],
    cuidado: ["cuidado", "cuidados", "cuidar", "cuido", "comida", "alimento", "alimentacion", "alimentar", "bienestar", "salud", "sano", "rutina", "consejo", "consejos", "recomendacion", "recomendaciones", "tips"],
    esterilizacion: ["esterilizacion", "esterilizar", "esterilizado", "esterilizada", "esterilizados", "esterilizadas", "castrar", "castrado", "castracion"],
    vacuna: ["vacuna", "vacunas", "vacunado", "vacunada", "vacunados", "vacunadas"],
    sitio: ["sitio", "pagina", "web", "proyecto", "prototipo", "demo", "real", "academico", "app", "aplicacion"],
    estres: ["estres", "estresado", "estresada", "miedo", "asustado", "asustada", "esconde", "escondido", "esconderse"],
    horario: ["horario", "horarios", "abre", "abren", "abierto", "abierta", "cierra", "cierran"],
    ubicacion: ["ubicacion", "direccion", "zona", "cerca", "mapa", "llegar", "ubicado", "ubicada"],
    contacto: ["contacto", "telefono", "celular", "llamar", "whatsapp", "correo"],
    costo: ["costo", "costos", "precio", "precios", "cuesta", "cuanto", "caro", "cara", "barato", "gratis", "pagar", "tarifa"],
    disponible: ["disponible", "disponibles", "hay", "lista", "listado", "todos", "cuales", "quienes"],
    gato: ["gato", "gatos", "gatito", "gatitos", "michi", "michis", "minino", "felino", "felinos"],
    casa: ["casa", "hogar", "departamento", "depa", "espacio", "apartamento", "pequeno", "pequena", "chica"],
    saludo: ["hola", "buenas", "buenos", "saludos", "hey"],
    gracias: ["gracias"],
  };

  const CANON = new Map();
  for (const [canon, variantes] of Object.entries(SINONIMOS)) {
    for (const v of variantes) CANON.set(norm(v), canon);
  }

  const VACIAS = new Set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "en", "y", "o", "u", "e",
    "que", "es", "son", "por", "para", "con", "sin", "se", "me", "mi", "mis", "tu", "tus", "su", "sus", "lo",
    "le", "les", "nos", "ya", "si", "no", "pero", "muy", "mas", "como", "cual", "cuando", "puedo", "puede",
    "puedes", "pueden", "quiero", "quisiera", "necesito", "tengo", "tiene", "tienen", "hacer", "ser", "estar",
    "esta", "este", "esto", "ese", "eso", "favor", "ayuda", "ayudame", "ayudarme", "sobre", "algo", "alguna",
    "alguno", "cualquier", "entonces", "bueno", "donde", "estan", "hay",
  ]);

  // Términos que no identifican a un gato ni a una veterinaria concreta.
  const GENERICOS = new Set(["veterinaria", "gato", "horario", "ubicacion", "contacto", "cuidado", "adopcion", "animal", "horas"]);
  // Términos que indican que la pregunta es del tema del sitio (sin ellos, se responde que no hay información).
  const SIN_DOMINIO = new Set(["costo", "disponible", "saludo", "gracias"]);
  // Si la pregunta trae uno de estos temas, ya no es un seguimiento de la conversación anterior.
  const TEMAS_NUEVOS = new Set(["gato", "veterinaria", "disponible", "solicitud", "requisito", "adopcion", "cuidado", "sitio", "saludo", "gracias"]);

  // Enlaces a páginas del propio sitio (o a Google Maps, como ya aparece en el directorio).
  const ENLACE = {
    adopciones: { href: "adopciones.html", texto: "Ver gatos en adopción" },
    solicitudes: { href: "solicitudes.html", texto: "Ver mis solicitudes" },
    veterinarias: { href: "veterinarias.html", texto: "Ver veterinarias" },
  };
  const R = (texto, enlace = null) => ({ texto, enlace });

  const tokens = (texto) =>
    norm(texto)
      .replace(/[^a-z0-9ñ\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => CANON.get(t) ?? t)
      .filter((t) => !VACIAS.has(t));

  const meses = (n) =>
    n < 12
      ? `${n} ${n === 1 ? "mes" : "meses"}`
      : Number.isInteger(n / 12)
        ? `${n / 12} ${n === 12 ? "año" : "años"}`
        : `${(n / 12).toFixed(1)} años`;

  const recortar = (texto, max) => {
    const t = String(texto).replace(/\s+/g, " ").trim();
    if (t.length <= max) return t;
    const corte = t.lastIndexOf(" ", max - 1);
    return `${t.slice(0, corte > 0 ? corte : max).trim()}…`;
  };

  const si = (v) => (v ? "sí" : "no");

  // ---------- Base de conocimiento: fragmentos construidos desde los datos del sitio ----------

  function construirFragmentos() {
    const S = window.MICHI_SEMILLA || { gatos: [], veterinarias: [] };
    const A = window.MICHI_ARTICULOS || {};
    const fragmentos = [];

    const agregar = (f) =>
      fragmentos.push({
        ...f,
        titulo: tokens(f.titulo),
        tokens: tokens(`${f.titulo} ${f.texto ?? ""} ${f.etiquetas ?? ""}`),
      });

    for (const g of S.gatos) {
      const estado = [
        g.vacunas ? "vacunado" : "sin vacuna registrada",
        g.esterilizado ? "esterilizado" : "no esterilizado",
        g.desparasitado ? "desparasitado" : "no desparasitado",
      ].join(" ");
      agregar({
        tipo: "gato",
        gato: g,
        titulo: g.nombre,
        texto: `${g.descripcion} ${g.historia} ${g.personalidad} ${g.sexo} ${estado}`,
        etiquetas: "gato gatito michi",
        respuesta:
          `${g.nombre}: ${g.sexo.toLowerCase()}, ${meses(g.edad)}, ${g.personalidad.toLowerCase()}. ` +
          `${g.descripcion} Vacunado: ${si(g.vacunas)} · Esterilizado: ${si(g.esterilizado)} · ` +
          `Desparasitado: ${si(g.desparasitado)}. Lo encuentras en la página Adopciones.`,
        enlace: { href: `gato.html?id=${g.id}`, texto: `Ver ficha de ${g.nombre}` },
      });
    }

    const nombresGatos = S.gatos.map((g) => g.nombre);
    agregar({
      tipo: "lista-gatos",
      titulo: "Gatos en adopción",
      texto: `disponibles ${nombresGatos.join(" ")}`,
      etiquetas: "gato disponible",
      respuesta:
        "Estos michis están disponibles para adopción: " +
        S.gatos.map((g) => `${g.nombre} (${g.personalidad.toLowerCase()})`).join(", ") +
        ". Entra a su ficha en Adopciones para conocer su historia.",
      enlace: ENLACE.adopciones,
    });

    for (const v of S.veterinarias) {
      agregar({
        tipo: "veterinaria",
        vet: v,
        titulo: v.nombre,
        texto: `${v.especialidad} ${v.zona} ${v.horario} ${v.contacto}`,
        campos: {
          horario: R(`Horario de ${v.nombre}: ${v.horario}`, ENLACE.veterinarias),
          ubicacion: R(`${v.nombre}: ${v.zona}.`, { href: v.maps, texto: "Abrir en Google Maps" }),
          contacto: R(`${v.nombre}: teléfono ${v.contacto}.`, ENLACE.veterinarias),
        },
        respuesta: `${v.nombre} (${v.especialidad.toLowerCase()}). Zona: ${v.zona}. Horario: ${v.horario} Contacto: ${v.contacto}.`,
        enlace: ENLACE.veterinarias,
      });
    }
    agregar({
      tipo: "lista-veterinarias",
      titulo: "Veterinarias aliadas",
      texto: `directorio veterinario ${S.veterinarias.map((v) => v.nombre).join(" ")}`,
      etiquetas: "veterinaria directorio",
      respuesta:
        "Estas veterinarias aparecen en el directorio: " +
        S.veterinarias.map((v) => v.nombre).join(", ") +
        ". Pregúntame por el nombre para ver su horario, ubicación o contacto.",
      enlace: ENLACE.veterinarias,
    });

    for (const [id, a] of Object.entries(A)) {
      const beneficios = (a.beneficios || []).map((b) => `${b.titulo}. ${b.texto}`).join(" ");
      const cuerpo = [a.resumen, ...(a.parrafos || []), beneficios].join(" ");
      const fuente = a.fuente?.nombre
        ? `Fuente: ${a.fuente.nombre}.`
        : `Artículo del Blog: ${a.titulo}.`;
      agregar({
        tipo: "articulo",
        titulo: a.titulo,
        texto: `${a.categoria} ${cuerpo}`,
        respuesta: `${a.resumen} ${(a.parrafos || []).slice(0, 2).join(" ")} ${fuente}`,
        enlace: { href: `articulo.html?id=${id}`, texto: "Leer artículo" },
      });
    }

    // Preguntas frecuentes: solo con texto que el sitio ya publica.
    const faq = [
      {
        titulo: "Cómo adoptar",
        texto: "adoptar adopcion solicitar proceso pasos ficha formulario",
        respuesta:
          "Abre Adopciones, elige un gatito, entra a su ficha y pulsa “Solicitar adopción”. Es una solicitud de prueba: no se envía a ningún refugio.",
        enlace: ENLACE.adopciones,
      },
      {
        titulo: "Requisitos del formulario",
        texto: "requisito requisitos adoptar adopcion mayor 18 edad formulario telefono correo direccion mascotas experiencia acuerdo motivo",
        respuesta:
          "El formulario pide nombre, edad (mayor de 18 años), teléfono, correo, dirección general, si tienes otras mascotas, si has tenido gatos antes, si todas las personas del hogar están de acuerdo y por qué quieres adoptar. Los datos son de prueba y se guardan solo en tu navegador.",
        enlace: ENLACE.adopciones,
      },
      {
        titulo: "Estado de mi solicitud",
        texto: "solicitud estado revision folio aprobado rechazado",
        respuesta:
          "Puedes revisar las solicitudes en la página Solicitudes. En Gestión (demo) es posible simular su aprobación o rechazo.",
        enlace: ENLACE.solicitudes,
      },
      {
        titulo: "Costos de adopción",
        texto: "costo costos precio cuesta pagar gratis tarifa cuanto",
        respuesta:
          "Este sitio no publica costos de adopción, así que no tengo esa información.",
        enlace: ENLACE.adopciones,
      },
      {
        titulo: "Sobre este proyecto",
        texto: "sitio proyecto prototipo academico real demo base datos cuentas inicio sesion",
        respuesta:
          "Tu Michi Adopción es un proyecto académico: un prototipo interactivo con HTML, CSS y JavaScript. No tiene inicio de sesión ni base de datos, y las solicitudes son de prueba.",
        enlace: null,
      },
      {
        titulo: "Ayuda y contacto",
        texto: "contacto ayuda escribir mensaje correo duda contactar",
        respuesta:
          "En Ayuda y contacto puedes dejar un mensaje de prueba. Los mensajes no se envían: se guardan en el panel de Gestión (demo).",
        enlace: null,
      },
    ];
    for (const f of faq) agregar({ tipo: "faq", ...f });

    return fragmentos;
  }

  // ---------- Búsqueda: BM25 con bonus por título ----------

  let indice = null;
  // Último gato, veterinaria o artículo del que se respondió; sirve para preguntas de seguimiento.
  let ultimo = null;

  function prepararIndice() {
    const fragmentos = construirFragmentos();
    const N = fragmentos.length;
    const df = new Map();
    for (const f of fragmentos) {
      f.tf = new Map();
      for (const t of f.tokens) f.tf.set(t, (f.tf.get(t) || 0) + 1);
      for (const t of new Set(f.tokens)) df.set(t, (df.get(t) || 0) + 1);
    }
    const promedio = fragmentos.reduce((a, f) => a + f.tokens.length, 0) / (N || 1);
    const idf = (t) => {
      const n = df.get(t) || 0;
      return Math.log(1 + (N - n + 0.5) / (n + 0.5));
    };
    const nombres = new Set(
      fragmentos
        .filter((f) => f.tipo === "gato" || f.tipo === "veterinaria")
        .flatMap((f) => f.titulo.filter((t) => !GENERICOS.has(t))),
    );
    return { fragmentos, idf, promedio, nombres };
  }

  function buscar(pregunta) {
    if (!indice) indice = prepararIndice();
    const q = [...new Set(tokens(pregunta))];
    const ranking = indice.fragmentos
      .map((f) => {
        let s = 0;
        for (const t of q) {
          const w = indice.idf(t);
          const n = f.tf.get(t) || 0;
          if (n) {
            const norma = n + K1 * (1 - B + (B * f.tokens.length) / indice.promedio);
            s += w * ((n * (K1 + 1)) / norma);
          }
          if (f.titulo.includes(t)) s += w; // bonus de título: nombres de gatos y veterinarias
        }
        return { f, s };
      })
      .sort((a, b) => b.s - a.s);
    return { q, ranking };
  }

  // ---------- Filtros de seguridad ----------

  const SINTOMAS = /\b(vomit\w*|diarre\w*|sangr\w*|convulsi\w*|respira\w*|herid\w*|fiebre|envenen\w*|atropell\w*|letarg\w*|desmay\w*|cojea\w*|tos|estornud\w*|golpe\w*|no come|no orina|no defeca)\b/;
  const DATOS_PERSONALES = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\+?\d[\d\s-]{8,}\d|\b(curp|rfc|contrasena|password|tarjeta|cuenta bancaria)\b/i;

  // ---------- Respuestas por ficha ----------

  // Responde solo si la pregunta pide un dato concreto del gato; si no, devuelve null.
  function campoGato(g, n) {
    const ficha = { href: `gato.html?id=${g.id}`, texto: `Ver ficha de ${g.nombre}` };
    if (/costo|cuesta|precio|pagar|cuanto vale/.test(n))
      return R("Este sitio no publica costos de adopción, así que no tengo esa información.", ENLACE.adopciones);
    if (/vacun/.test(n)) return R(`${g.nombre}: vacunado: ${si(g.vacunas)}.`, ficha);
    if (/esteril|castr/.test(n)) return R(`${g.nombre}: esterilizado: ${si(g.esterilizado)}.`, ficha);
    if (/desparas/.test(n)) return R(`${g.nombre}: desparasitado: ${si(g.desparasitado)}.`, ficha);
    if (/anos|edad|meses|cumple|cuanto tiene/.test(n)) return R(`${g.nombre} tiene ${meses(g.edad)}.`, ficha);
    if (/personalidad|caracter|como es/.test(n)) return R(`${g.nombre} es ${g.personalidad.toLowerCase()}. ${g.descripcion}`, ficha);
    if (/historia|llego|paso|vida/.test(n)) return R(`${g.nombre}: ${g.historia}`, ficha);
    return null;
  }

  // Responde solo si la pregunta pide horario, ubicación o contacto; si no, devuelve null.
  function campoVet(f, n) {
    if (/horario|abre|abierto|cierra|hora/.test(n)) return f.campos.horario;
    if (/donde|ubicac|direccion|zona|mapa|llegar|cerca|queda/.test(n)) return f.campos.ubicacion;
    if (/telefono|contacto|llamar|correo|whatsapp|celular/.test(n)) return f.campos.contacto;
    return null;
  }

  function fichaCompleta(f) {
    return R(recortar(f.respuesta, LIMITE_RESPUESTA), f.enlace);
  }

  function esSeguimiento(n, q) {
    const empieza = /^\s*¿?\s*(y|tambien|pues|entonces)\b/.test(n);
    const pronombre = /\b(su|sus|ella|eso|esa|ese|lo|la)\b/.test(n);
    return (empieza || pronombre) && !q.some((t) => TEMAS_NUEVOS.has(t));
  }

  // ---------- Respuesta ----------

  function responder(pregunta) {
    const texto = String(pregunta ?? "").trim();
    if (!texto) return R("Escribe tu pregunta y con gusto te ayudo.");
    if (DATOS_PERSONALES.test(texto))
      return R("Por tu privacidad, no escribas correos, teléfonos ni datos personales en este chat.");

    const n = norm(texto);
    if (SINTOMAS.test(n))
      return R(
        "No puedo evaluar la salud de tu gato. Si tiene vómito, diarrea persistente, dificultad para respirar, sangrado, convulsiones o deja de comer, acude pronto con un veterinario. En Veterinarias puedes ver opciones del directorio.",
        ENLACE.veterinarias,
      );

    const { q, ranking } = buscar(texto);
    const NO_SE = R(
      "No encuentro esa información en el sitio. Puedo ayudarte con adopciones, solicitudes, cuidados, gatos en adopción y veterinarias.",
    );

    if (q.length && q.every((t) => t === "saludo" || t === "gracias")) {
      return R(
        q.includes("saludo")
          ? "¡Miau! 🐾 Puedo ayudarte con adopciones, solicitudes, cuidados, gatos en adopción y veterinarias."
          : "¡De nada! 🐾 ¿Quieres saber algo más de adopciones o cuidados?",
      );
    }

    // 1) Si la pregunta nombra a un gato o a una veterinaria, responde sobre esa ficha.
    const distintivos = (f) => f.titulo.filter((t) => !GENERICOS.has(t));
    const entidad = ranking.find(
      ({ f }) =>
        (f.tipo === "gato" || f.tipo === "veterinaria") &&
        distintivos(f).some((t) => q.includes(t)),
    );
    if (entidad) {
      const f = entidad.f;
      ultimo = f;
      const campo = f.tipo === "gato" ? campoGato(f.gato, n) : campoVet(f, n);
      return campo ?? fichaCompleta(f);
    }

    // 2) Pregunta de seguimiento ("¿y cuánto cuesta?", "¿y su historia?") sobre la ficha anterior.
    const pocasPalabras = q.length <= 3 && !q.some((t) => TEMAS_NUEVOS.has(t));
    if (ultimo && ultimo.tipo !== "articulo" && (esSeguimiento(n, q) || pocasPalabras)) {
      const campo = ultimo.tipo === "gato" ? campoGato(ultimo.gato, n) : campoVet(ultimo, n);
      if (campo) return campo;
    }

    // 3) Sin tema del sitio en la pregunta, no se busca nada.
    const dominio = [...indice.nombres, ...Object.keys(SINONIMOS)].filter(
      (t) => !SIN_DOMINIO.has(t),
    );
    if (!q.some((t) => dominio.includes(t))) return NO_SE;

    // 4) "Gatos esterilizados" o "gatos vacunados": lista filtrada.
    const S = window.MICHI_SEMILLA;
    const soloEstado = q.every((t) => ["gato", "esterilizacion", "vacuna", "disponible"].includes(t));
    if (soloEstado && q.includes("gato") && (q.includes("esterilizacion") || q.includes("vacuna"))) {
      ultimo = null;
      const esterilizados = q.includes("esterilizacion");
      const cumplen = S.gatos.filter((g) => (esterilizados ? g.esterilizado : g.vacunas));
      const etiqueta = esterilizados ? "esterilizados" : "vacunados";
      return cumplen.length
        ? R(`Gatos ${etiqueta} en adopción: ${cumplen.map((g) => g.nombre).join(", ")}. Entra a su ficha en Adopciones para conocer más.`, ENLACE.adopciones)
        : R(`Por ahora no hay gatos ${etiqueta} registrados en el sitio.`);
    }

    // 5) Preguntas generales sobre veterinarias: directorio completo.
    if (q.includes("veterinaria")) {
      ultimo = null;
      return fichaCompleta(ranking.find(({ f }) => f.tipo === "lista-veterinarias").f);
    }

    // 6) Mejor fragmento general.
    const mejor = ranking[0];
    if (!mejor || mejor.s < UMBRAL) return NO_SE;
    ultimo = mejor.f.tipo === "articulo" ? mejor.f : null;
    return fichaCompleta(mejor.f);
  }

  window.MICHI_RESPONDER = responder;
})();
