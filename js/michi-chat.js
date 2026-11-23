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
    gato: ["gato", "gatos", "gata", "gatas", "gatito", "gatitos", "michi", "michis", "minino", "felino", "felinos"],
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
  const R = (texto, enlace = null, sugerencias = null) => ({ texto, enlace, sugerencias });
  const REAL = () => !!window.MICHI_DB?.activo;

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
        palabras: norm(`${f.titulo} ${f.texto ?? ""} ${f.etiquetas ?? ""}`).match(/[a-zñ]{5,}/g) || [],
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
          `Desparasitado: ${si(g.desparasitado)}. ` +
          ((g.estado ?? "disponible") === "adoptado" ? "Ya encontró hogar." : "Lo encuentras en la página Adopciones."),
        enlace: { href: `gato.html?id=${g.id}`, texto: `Ver ficha de ${g.nombre}` },
      });
    }

    const disponibles = S.gatos.filter((g) => (g.estado ?? "disponible") === "disponible");
    const nombresGatos = disponibles.map((g) => g.nombre);
    agregar({
      tipo: "lista-gatos",
      titulo: "Gatos en adopción",
      texto: `disponibles ${nombresGatos.join(" ")}`,
      etiquetas: "gato disponible",
      respuesta:
        "Estos michis están disponibles para adopción: " +
        disponibles.map((g) => `${g.nombre} (${g.personalidad.toLowerCase()})`).join(", ") +
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
          "Abre Adopciones, elige un gatito, entra a su ficha y pulsa “Solicitar adopción”." +
          " Necesitas una cuenta para enviarla; el equipo del refugio la revisa.",
        enlace: ENLACE.adopciones,
      },
      {
        titulo: "Requisitos del formulario",
        texto: "requisito requisitos adoptar adopcion mayor 18 edad formulario telefono correo direccion mascotas experiencia acuerdo motivo",
        respuesta:
          "El formulario pide nombre, edad (mayor de 18 años), teléfono, correo, dirección general, si tienes otras mascotas, si has tenido gatos antes, si todas las personas del hogar están de acuerdo y por qué quieres adoptar." +
          " Tus datos se guardan en tu cuenta y solo los ve el equipo del refugio.",
        enlace: ENLACE.adopciones,
      },
      {
        titulo: "Estado de mi solicitud",
        texto: "solicitud estado revision folio aprobado rechazado",
        respuesta:
          "Puedes revisar el estado de tus solicitudes en la página Solicitudes, con tu sesión iniciada.",
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
          "Tu Michi Adopción es un proyecto con HTML, CSS y JavaScript. Tiene cuentas de usuario y una base de datos protegida.",
        enlace: null,
      },
      {
        titulo: "Ayuda y contacto",
        texto: "contacto ayuda escribir mensaje correo duda contactar",
        respuesta:
          "En Ayuda y contacto puedes dejar un mensaje (con tu sesión iniciada). El equipo lo revisa desde el panel de gestión.",
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
    const vocab = new Set(fragmentos.flatMap((f) => f.palabras));
    for (const v of CANON.keys()) if (v.length >= 5) vocab.add(v);
    for (const v of ["ninos", "ninas", "hijos", "perros", "familia", "departamento", "pequeno", "chiquito"]) vocab.add(v);
    return { fragmentos, idf, promedio, nombres, vocab };
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

  // ---------- Errores de escritura ----------

  // Distancia de edición con transposiciones (acotada: palabras cortas).
  function distancia(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++) {
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    return d[m][n];
  }

  // Cambia palabras mal escritas por la palabra conocida más parecida; deja todo lo demás igual.
  function corregir(texto) {
    const vocab = indice.vocab;
    return norm(texto).replace(/[a-zñ]{6,}/g, (w) => {
      if (vocab.has(w) || VACIAS.has(w)) return w;
      const tol = w.length >= 8 ? 2 : 1;
      let mejor = w, menor = tol + 1;
      for (const c of vocab) {
        if (Math.abs(c.length - w.length) > tol) continue;
        const dist = distancia(w, c);
        if (dist < menor) { menor = dist; mejor = c; }
      }
      return mejor;
    });
  }

  // ---------- Filtros de gatos y recomendación ----------

  const PERSONALIDADES = [
    ["Cariñoso", /carino|amoros|mimos/],
    ["Curioso", /curios|explorador/],
    ["Juguetón", /jugue|activ[oa]|energic/],
    ["Tranquilo", /tranquil|calm|relajad|sosegad/],
  ];

  function criterios(n) {
    const c = {};
    if (/\b(hembras?|gatas?)\b/.test(n)) c.sexo = "Hembra";
    else if (/\bmachos?\b/.test(n)) c.sexo = "Macho";
    for (const [nombre, re] of PERSONALIDADES) if (re.test(n)) c.personalidad = nombre;
    let m;
    if (/menos de (un|1) ano|cachorr|bebes?\b|recien nacid/.test(n)) c.maxEdad = 11;
    else if ((m = n.match(/menos de (\d+) (ano|mes)/))) c.maxEdad = Number(m[1]) * (m[2] === "ano" ? 12 : 1) - 1;
    else if ((m = n.match(/mas de (\d+) (ano|mes)/))) c.minEdad = Number(m[1]) * (m[2] === "ano" ? 12 : 1) + 1;
    else if (/\badult[oa]s?\b/.test(n)) c.minEdad = 12;
    if (/esteril|castr/.test(n)) c.esterilizado = true;
    if (/vacun/.test(n)) c.vacunas = true;
    if (/desparas/.test(n)) c.desparasitado = true;
    if (/mas (pequen|joven|chiquit)/.test(n)) c.orden = "menor";
    else if (/mas (grande|viejit|adult)|mayor de todos/.test(n)) c.orden = "mayor";
    return c;
  }

  const disponibles = () =>
    (window.MICHI_SEMILLA?.gatos || []).filter((g) => (g.estado ?? "disponible") === "disponible");

  function filtrarGatos(n, q) {
    const c = criterios(n);
    if (!Object.keys(c).length) return null;
    const habla = q.includes("gato") || q.includes("disponible") || /\b(hay|tienen|busco|quiero|muestrame|cuales|alguna?|algun|cual)\b/.test(n);
    if (!habla || q.some((t) => ["cuidado", "costo", "requisito", "veterinaria", "solicitud"].includes(t))) return null;
    let lista = disponibles().filter(
      (g) =>
        (!c.sexo || g.sexo === c.sexo) &&
        (!c.personalidad || g.personalidad === c.personalidad) &&
        (c.maxEdad == null || g.edad <= c.maxEdad) &&
        (c.minEdad == null || g.edad >= c.minEdad) &&
        (!c.esterilizado || g.esterilizado) &&
        (!c.vacunas || g.vacunas) &&
        (!c.desparasitado || g.desparasitado),
    );
    if (c.orden) lista = [...lista].sort((a, b) => (c.orden === "menor" ? a.edad - b.edad : b.edad - a.edad)).slice(0, 1);
    if (!lista.length)
      return R("Ahora mismo no hay gatos con esas características. Revisa todos los michis disponibles en Adopciones.", ENLACE.adopciones);
    ultimo = lista.length === 1 ? { tipo: "gato", gato: lista[0], titulo: [] } : null;
    const detalle = (g) => `${g.nombre} (${meses(g.edad)}, ${g.sexo.toLowerCase()}, ${g.personalidad.toLowerCase()})`;
    return lista.length === 1
      ? R(`Encontré a ${detalle(lista[0])}.`, { href: `gato.html?id=${lista[0].id}`, texto: `Ver ficha de ${lista[0].nombre}` })
      : R(`Encontré ${lista.length} michis: ${lista.map(detalle).join("; ")}.`, ENLACE.adopciones);
  }

  const SITUACIONES = [
    { re: /\b(depa|departamento|apartamento)\b|espacio (pequeno|chico|reducido)|casa (pequena|chica)/, pers: { Tranquilo: 2, Cariñoso: 1 }, txt: "vives en un espacio reducido" },
    { re: /\b(trabajo|estudio|salgo|fuera|ausente|ocupad[oa])\b|poco tiempo/, pers: { Tranquilo: 2, Curioso: 1 }, edadMin: 12, txt: "pasas poco tiempo en casa" },
    { re: /\b(ninos|ninas|hijos|familia)\b/, pers: { Juguetón: 2, Cariñoso: 1 }, edadMin: 6, txt: "hay niños en casa" },
    { re: /\b(perros?|otro gato|otras mascotas|mascotas)\b/, pers: { Cariñoso: 1, Juguetón: 1, Tranquilo: 1 }, txt: "ya tienes mascotas" },
    { re: /primera vez|nunca he tenido|principiante|novato|sin experiencia/, pers: { Cariñoso: 2, Tranquilo: 1 }, edadMin: 12, txt: "es tu primera vez con un gato" },
    { re: /\bjugar\b|energ|deporte|muy activ/, pers: { Juguetón: 2, Curioso: 2 }, txt: "buscas un compañero activo" },
  ];

  function recomendar(n, q) {
    const pideRecomendacion = /me conviene|recomiend|cual (me )?(elijo|adopto|conviene)|que gato|cual gato|ideal para|mejor para mi|me sugieres/.test(n);
    const hits = SITUACIONES.filter((s) => s.re.test(n));
    const cuenta = /\b(vivo|tengo|soy|trabajo|estudio|mi casa|mi familia|mi depa)\b/.test(n);
    if (!pideRecomendacion && !(hits.length && cuenta && (q.includes("gato") || q.includes("adopcion")))) return null;
    if (!hits.length)
      return R(
        "Con gusto te oriento. Cuéntame un poco: ¿vives en departamento o casa? ¿hay niños u otras mascotas? ¿es tu primera vez con un gato? Con eso te sugiero a los michis que mejor encajan.",
        null,
        ["Vivo en un departamento pequeño", "Tengo niños y un perro", "Es mi primera vez con un gato"],
      );
    const lista = disponibles()
      .map((g) => {
        let puntos = 0;
        for (const h of hits) {
          puntos += h.pers[g.personalidad] || 0;
          if (h.edadMin != null) puntos += g.edad >= h.edadMin ? 1 : -1;
        }
        return { g, puntos };
      })
      .sort((a, b) => b.puntos - a.puntos)
      .filter((x) => x.puntos > 0)
      .slice(0, 2);
    if (!lista.length) return R("Por ahora no veo un michi que encaje claramente. Revisa Adopciones y cuéntame más de tu situación.", ENLACE.adopciones);
    ultimo = { tipo: "gato", gato: lista[0].g, titulo: [] };
    const motivos = hits.map((h) => h.txt).join(", ");
    return R(
      `Como ${motivos}, te sugiero a ${lista.map(({ g }) => `${g.nombre} (${g.personalidad.toLowerCase()}, ${meses(g.edad)})`).join(" o a ")}. Es una sugerencia según su descripción; lo mejor es conocerlos en su ficha.`,
      { href: `gato.html?id=${lista[0].g.id}`, texto: `Ver ficha de ${lista[0].g.nombre}` },
    );
  }

  const SUGERENCIAS = ["¿Cómo puedo adoptar?", "¿Qué gatos hay disponibles?", "¿Dónde hay veterinarias?"];
  function noSe(texto) {
    window.MICHI_DB?.preguntaSinRespuesta?.(texto);
    return R(
      "No encuentro esa información en el sitio. Puedo ayudarte con adopciones, solicitudes, cuidados, gatos en adopción y veterinarias.",
      null,
      SUGERENCIAS,
    );
  }

  function miSolicitud() {
    const ctx = window.MICHI_CONTEXTO;
    if (!ctx?.usuario)
      return R("Para ver tus solicitudes necesitas iniciar sesión.", { href: "acceso.html?volver=solicitudes.html", texto: "Iniciar sesión" });
    const a = ctx.solicitudes || [];
    if (!a.length) return R("Aún no tienes solicitudes. Elige un michi en Adopciones y envía la primera.", ENLACE.adopciones);
    const por = (e) => a.filter((s) => s.estado === e).length;
    const ultima = a[0];
    return R(
      `Tienes ${a.length} solicitud${a.length === 1 ? "" : "es"}: ${por("pendiente")} en revisión, ${por("aprobada")} aceptada${por("aprobada") === 1 ? "" : "s"} y ${por("rechazada")} rechazada${por("rechazada") === 1 ? "" : "s"}. ` +
        `La más reciente es la de ${ultima.gatoNombre || "tu michi"} (${{ pendiente: "en revisión", aprobada: "aceptada", rechazada: "rechazada" }[ultima.estado] || ultima.estado}).`,
      ENLACE.solicitudes,
    );
  }

  // ---------- Filtros de seguridad ----------

  const SINTOMAS = /\b(vomit\w*|diarre\w*|sangr\w*|convulsi\w*|respira\w*|herid\w*|fiebre|envenen\w*|atropell\w*|letarg\w*|desmay\w*|cojea\w*|tos|estornud\w*|golpe\w*|no come|no orina|no defeca)\b/;
  const DATOS_PERSONALES = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\+?\d[\d\s-]{8,}\d|\b(curp|rfc|contrasena|password|tarjeta|cuenta bancaria)\b/i;

  // ---------- Respuestas por ficha ----------

  const estadoTexto = (e) => ({ adoptado: "ya fue adoptado", archivado: "su perfil está archivado", borrador: "su perfil aún no es público" }[e] || e);

  // Responde solo si la pregunta pide un dato concreto del gato; si no, devuelve null.
  function campoGato(g, n) {
    const ficha = { href: `gato.html?id=${g.id}`, texto: `Ver ficha de ${g.nombre}` };
    if (/costo|cuesta|precio|pagar|cuanto vale/.test(n))
      return R("Este sitio no publica costos de adopción, así que no tengo esa información.", ENLACE.adopciones);
    if (/\b(macho|hembra|sexo|nino|nina)\b/.test(n)) return R(`${g.nombre} es ${g.sexo.toLowerCase()}.`, ficha);
    if (/disponible|adoptad|sigue en adopcion/.test(n))
      return R((g.estado ?? "disponible") === "disponible" ? `${g.nombre} sigue disponible para adopción.` : `${g.nombre} ya no está disponible: ${estadoTexto(g.estado)}.`, ficha);
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

    if (!indice) indice = prepararIndice();
    const n = corregir(texto);
    if (SINTOMAS.test(n))
      return R(
        "No puedo evaluar la salud de tu gato. Si tiene vómito, diarrea persistente, dificultad para respirar, sangrado, convulsiones o deja de comer, acude pronto con un veterinario. En Veterinarias puedes ver opciones del directorio.",
        ENLACE.veterinarias,
      );

    const { q, ranking } = buscar(n);

    if (q.length && q.every((t) => t === "saludo" || t === "gracias")) {
      return R(
        q.includes("saludo")
          ? "¡Miau! 🐾 Puedo ayudarte con adopciones, solicitudes, cuidados, gatos en adopción y veterinarias."
          : "¡De nada! 🐾 ¿Quieres saber algo más de adopciones o cuidados?",
      );
    }

    if (/\b(mi|mis) solicitud|como va mi|estado de mi (solicitud|adopcion)/.test(n)) return miSolicitud();

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

    // 2b) Recomendación según la situación de la persona y filtros por características.
    const sugerido = recomendar(n, q) ?? filtrarGatos(n, q);
    if (sugerido) return sugerido;

    // 3) Sin tema del sitio en la pregunta, no se busca nada.
    const dominio = [...indice.nombres, ...Object.keys(SINONIMOS)].filter(
      (t) => !SIN_DOMINIO.has(t),
    );
    if (!q.some((t) => dominio.includes(t))) return noSe(texto);

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
    if (!mejor || mejor.s < UMBRAL) return noSe(texto);
    ultimo = mejor.f.tipo === "articulo" ? mejor.f : null;
    return fichaCompleta(mejor.f);
  }

  window.MICHI_RESPONDER = responder;
})();
