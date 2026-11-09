/* Motor del chat de Michi: búsqueda local por palabras clave sobre el contenido publicado del sitio.
   Sin modelos de IA ni servidor. Solo responde con información que ya aparece en el sitio. */
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
        titulo: g.nombre,
        texto: `${g.descripcion} ${g.historia} ${g.personalidad} ${g.sexo} ${estado}`,
        etiquetas: "gato gatito michi",
        respuesta:
          `${g.nombre}: ${g.sexo.toLowerCase()}, ${meses(g.edad)}, ${g.personalidad.toLowerCase()}. ` +
          `${g.descripcion} Vacunado: ${si(g.vacunas)} · Esterilizado: ${si(g.esterilizado)} · ` +
          `Desparasitado: ${si(g.desparasitado)}. Lo encuentras en la página Adopciones.`,
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
    });

    for (const v of S.veterinarias) {
      agregar({
        tipo: "veterinaria",
        titulo: v.nombre,
        texto: `${v.especialidad} ${v.zona} ${v.horario} ${v.contacto}`,
        campos: {
          horario: `Horario de ${v.nombre}: ${v.horario}`,
          ubicacion: `${v.nombre}: ${v.zona}. Puedes abrir la ubicación en Google Maps desde Veterinarias.`,
          contacto: `${v.nombre}: teléfono ${v.contacto}.`,
        },
        respuesta: `${v.nombre} (${v.especialidad.toLowerCase()}). Zona: ${v.zona}. Horario: ${v.horario} Contacto: ${v.contacto}.`,
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
        url: `articulo.html?id=${id}`,
      });
    }

    // Preguntas frecuentes: solo con texto que el sitio ya publica.
    const faq = [
      {
        titulo: "Cómo adoptar",
        texto: "adoptar adopcion solicitar proceso pasos ficha formulario",
        respuesta:
          "Abre Adopciones, elige un gatito, entra a su ficha y pulsa “Solicitar adopción”. Es una solicitud de prueba: no se envía a ningún refugio.",
      },
      {
        titulo: "Requisitos del formulario",
        texto: "requisito requisitos adoptar adopcion mayor 18 edad formulario telefono correo direccion mascotas experiencia acuerdo motivo",
        respuesta:
          "El formulario pide nombre, edad (mayor de 18 años), teléfono, correo, dirección general, si tienes otras mascotas, si has tenido gatos antes, si todas las personas del hogar están de acuerdo y por qué quieres adoptar. Los datos son de prueba y se guardan solo en tu navegador.",
      },
      {
        titulo: "Estado de mi solicitud",
        texto: "solicitud estado revision folio aprobado rechazado",
        respuesta:
          "Puedes revisar las solicitudes en la página Solicitudes. En Gestión (demo) es posible simular su aprobación o rechazo.",
      },
      {
        titulo: "Costos de adopción",
        texto: "costo costos precio cuesta pagar gratis tarifa cuanto",
        respuesta:
          "Este sitio no publica costos de adopción, así que no tengo esa información.",
      },
      {
        titulo: "Sobre este proyecto",
        texto: "sitio proyecto prototipo academico real demo base datos cuentas inicio sesion",
        respuesta:
          "Tu Michi Adopción es un proyecto académico: un prototipo interactivo con HTML, CSS y JavaScript. No tiene inicio de sesión ni base de datos, y las solicitudes son de prueba.",
      },
      {
        titulo: "Ayuda y contacto",
        texto: "contacto ayuda escribir mensaje correo duda contactar",
        respuesta:
          "En Ayuda y contacto puedes dejar un mensaje de prueba. Los mensajes no se envían: se guardan en el panel de Gestión (demo).",
      },
    ];
    for (const f of faq) agregar({ tipo: "faq", ...f });

    return fragmentos;
  }

  // ---------- Búsqueda: puntuación tipo TF-IDF con bonus por título ----------

  let indice = null;

  // BM25: favorece fragmentos cortos y enfocados sobre textos largos que repiten la palabra.
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

  // ---------- Respuesta ----------

  function respuesta(pregunta) {
    const texto = String(pregunta ?? "").trim();
    if (!texto) return "Escribe tu pregunta y con gusto te ayudo.";
    if (DATOS_PERSONALES.test(texto))
      return "Por tu privacidad, no escribas correos, teléfonos ni datos personales en este chat.";
    if (SINTOMAS.test(norm(texto)))
      return "No puedo evaluar la salud de tu gato. Si tiene vómito, diarrea persistente, dificultad para respirar, sangrado, convulsiones o deja de comer, acude pronto con un veterinario. En Veterinarias puedes ver opciones del directorio.";

    const { q, ranking } = buscar(texto);
    const NO_SE =
      "No encuentro esa información en el sitio. Puedo ayudarte con adopciones, solicitudes, cuidados, gatos en adopción y veterinarias.";

    if (q.length && q.every((t) => t === "saludo" || t === "gracias")) {
      return q.includes("saludo")
        ? "¡Miau! 🐾 Puedo ayudarte con adopciones, solicitudes, cuidados, gatos en adopción y veterinarias."
        : "¡De nada! 🐾 ¿Quieres saber algo más de adopciones o cuidados?";
    }

    // 1) Si la pregunta nombra a un gato o a una veterinaria, responde sobre esa ficha.
    const distintivos = (f) => f.titulo.filter((t) => !GENERICOS.has(t));
    const entidad = ranking.find(
      ({ f }) =>
        (f.tipo === "gato" || f.tipo === "veterinaria") &&
        distintivos(f).some((t) => q.includes(t)),
    );
    if (entidad) return responderEntidad(entidad.f, texto);

    // 2) Sin tema del sitio en la pregunta, no se busca nada.
    const dominio = [...indice.nombres, ...Object.keys(SINONIMOS)].filter(
      (t) => !SIN_DOMINIO.has(t),
    );
    if (!q.some((t) => dominio.includes(t))) return NO_SE;

    // 3) "Gatos esterilizados" o "gatos vacunados": lista filtrada.
    const S = window.MICHI_SEMILLA;
    const soloEstado = q.every((t) => ["gato", "esterilizacion", "vacuna", "disponible"].includes(t));
    if (soloEstado && q.includes("gato") && (q.includes("esterilizacion") || q.includes("vacuna"))) {
      const esterilizados = q.includes("esterilizacion");
      const cumplen = S.gatos.filter((g) => (esterilizados ? g.esterilizado : g.vacunas));
      const etiqueta = esterilizados ? "esterilizados" : "vacunados";
      return cumplen.length
        ? `Gatos ${etiqueta} en adopción: ${cumplen.map((g) => g.nombre).join(", ")}. Entra a su ficha en Adopciones para conocer más.`
        : `Por ahora no hay gatos ${etiqueta} registrados en el sitio.`;
    }

    // 4) Preguntas generales sobre veterinarias: directorio completo.
    if (q.includes("veterinaria")) {
      return ranking.find(({ f }) => f.tipo === "lista-veterinarias").f.respuesta;
    }

    // 5) Mejor fragmento general.
    const mejor = ranking[0];
    if (!mejor || mejor.s < UMBRAL) return NO_SE;
    return recortar(mejor.f.respuesta, LIMITE_RESPUESTA);
  }

  function responderEntidad(f, texto) {
    if (f.tipo === "veterinaria") {
      const n = norm(texto);
      if (/horario|abre|abierto|cierra|hora/.test(n)) return f.campos.horario;
      if (/donde|ubicac|direccion|zona|mapa|llegar|cerca|queda/.test(n)) return f.campos.ubicacion;
      if (/telefono|contacto|llamar|correo|whatsapp|celular/.test(n)) return f.campos.contacto;
    }
    return recortar(f.respuesta, LIMITE_RESPUESTA);
  }

  window.MICHI_RESPONDER = respuesta;
})();
