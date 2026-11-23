/* Capa de datos y cuentas (Supabase). Si no hay configuración, MICHI_DB.activo es false
   y el sitio sigue usando localStorage como antes. */
"use strict";

(() => {
  const cfg = window.MICHI_SUPABASE || {};
  const activo = !!(cfg.url && cfg.anonKey && window.supabase?.createClient);
  const DB = { activo, cliente: null, usuario: null, admin: false };
  window.MICHI_DB = DB;
  if (!activo) return;

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  DB.cliente = sb;

  // ---------- Mensajes de error en español ----------
  const MENSAJES = [
    [/invalid login credentials/i, "Correo o contraseña incorrectos."],
    [/email not confirmed/i, "Primero confirma tu correo con el enlace que te enviamos."],
    [/user already registered/i, "Ese correo ya tiene una cuenta. Prueba iniciar sesión."],
    [/password should be at least|weak.password|password.*(short|weak)/i, "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números."],
    [/rate limit|too many|over_email_send_rate_limit/i, "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."],
    [/same password/i, "La nueva contraseña debe ser distinta a la anterior."],
    [/row-level security|42501|permission denied|no autorizado/i, "No tienes permiso para hacer esto."],
    [/duplicate key|solicitudes_unica_pendiente/i, "Ya tienes una solicitud pendiente para este michi."],
    [/failed to fetch|networkerror|load failed/i, "No pudimos conectar con el servidor. Revisa tu internet."],
  ];
  const traducir = (error) => {
    const texto = String(error?.message || error || "");
    for (const [re, msg] of MENSAJES) if (re.test(texto)) return msg;
    // Mensajes que escribimos nosotros en la base (P0001) ya vienen en español.
    if (error?.code === "P0001") return texto;
    return "Ocurrió un error. Inténtalo de nuevo.";
  };
  const ok = ({ data, error }) => {
    if (error) throw new Error(traducir(error));
    return data;
  };
  DB.traducir = traducir;

  // ---------- Conversión fila de base ↔ objeto del sitio ----------
  const aGato = (r) => ({ ...r, creado: undefined });
  const aSolicitud = (r) => ({
    id: r.id, gatoId: r.gato_id, gatoNombre: r.gato_nombre, nombre: r.nombre, edad: r.edad,
    telefono: r.telefono, correo: r.correo, direccion: r.direccion, mascotas: r.mascotas,
    experiencia: r.experiencia, acuerdo: r.acuerdo, motivo: r.motivo, estado: r.estado,
    fecha: r.fecha, userId: r.user_id,
  });
  const aMensaje = (r) => ({ id: r.id, nombre: r.nombre, correo: r.correo, motivo: r.motivo, mensaje: r.mensaje, fecha: r.fecha });

  // ---------- Sesión ----------
  DB.iniciar = async () => {
    const { data } = await sb.auth.getSession();
    DB.usuario = data.session?.user ?? null;
    DB.admin = false;
    if (DB.usuario) {
      const r = await sb.rpc("es_admin");
      DB.admin = r.data === true;
    }
    return DB;
  };
  DB.nombreUsuario = () =>
    DB.usuario?.user_metadata?.nombre || DB.usuario?.email?.split("@")[0] || "";

  DB.registrar = async (correo, clave, nombre) =>
    ok(await sb.auth.signUp({
      email: correo, password: clave,
      options: { data: { nombre }, emailRedirectTo: new URL("acceso.html", location.href).href },
    }));
  DB.entrar = async (correo, clave) => ok(await sb.auth.signInWithPassword({ email: correo, password: clave }));
  DB.salir = async () => { await sb.auth.signOut(); };
  DB.recuperar = async (correo) =>
    ok(await sb.auth.resetPasswordForEmail(correo, { redirectTo: new URL("acceso.html", location.href).href }));
  DB.cambiarClave = async (clave) => ok(await sb.auth.updateUser({ password: clave }));
  DB.alCambiarSesion = (fn) => sb.auth.onAuthStateChange((evento) => fn(evento));

  // ---------- Lecturas ----------
  DB.cargar = async () => {
    const [gatos, vets] = await Promise.all([
      sb.from("gatos").select("*").order("id"),
      sb.from("veterinarias").select("*").order("id"),
    ]);
    const datos = {
      gatos: ok(gatos).map(aGato),
      veterinarias: ok(vets),
      solicitudes: [],
      mensajes: [],
    };
    if (DB.usuario) {
      const s = ok(await sb.from("solicitudes").select("*").order("fecha", { ascending: false }));
      datos.solicitudes = s.map(aSolicitud);
      if (DB.admin) {
        datos.mensajes = ok(await sb.from("mensajes").select("*").order("fecha", { ascending: false })).map(aMensaje);
      }
    }
    return datos;
  };

  // ---------- Escrituras ----------
  const CAMPOS_GATO = ["nombre", "edad", "sexo", "personalidad", "descripcion", "historia", "imagen", "estado", "vacunas", "esterilizado", "desparasitado", "foto_url"];
  const soloCampos = (o, lista) => Object.fromEntries(lista.map((k) => [k, o[k]]));
  DB.guardarGato = async (g, id) => {
    const fila = soloCampos(g, CAMPOS_GATO);
    const q = id ? sb.from("gatos").update(fila).eq("id", id) : sb.from("gatos").insert(fila);
    return aGato(ok(await q.select().single()));
  };
  DB.crearSolicitud = async (s) =>
    aSolicitud(ok(await sb.from("solicitudes").insert({
      gato_id: s.gatoId, nombre: s.nombre, edad: s.edad, telefono: s.telefono, correo: s.correo,
      direccion: s.direccion, mascotas: s.mascotas, experiencia: s.experiencia, acuerdo: s.acuerdo, motivo: s.motivo,
    }).select().single()));
  DB.resolverSolicitud = async (folio, aprobar) =>
    ok(await sb.rpc("resolver_solicitud", { folio, aprobar }));
  DB.guardarVet = async (v) =>
    ok(await sb.from("veterinarias").insert(soloCampos(v, ["nombre", "especialidad", "zona", "contacto", "horario", "maps"])).select().single());
  DB.borrarVet = async (id) => ok(await sb.from("veterinarias").delete().eq("id", id));
  DB.crearMensaje = async (m) =>
    ok(await sb.from("mensajes").insert(soloCampos(m, ["nombre", "correo", "motivo", "mensaje"])));
  DB.borrarMensaje = async (id) => ok(await sb.from("mensajes").delete().eq("id", id));
  // Pregunta del chat sin respuesta: solo si hay sesión; nunca interrumpe al usuario.
  DB.preguntaSinRespuesta = (texto) => {
    if (!DB.usuario) return;
    sb.from("chat_sin_respuesta").insert({ pregunta: String(texto).slice(0, 240) }).then(() => {});
  };

  // ---------- Fotos y eliminación de gatos (solo administradores; lo filtra la base) ----------
  const TIPOS_FOTO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const MAX_FOTO = 2 * 1024 * 1024;
  DB.subirFoto = async (archivo) => {
    const ext = TIPOS_FOTO[archivo.type];
    if (!ext) throw new Error("La foto debe ser JPG, PNG o WebP.");
    if (archivo.size > MAX_FOTO) throw new Error("La foto no puede pesar más de 2 MB.");
    const ruta = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("gatos").upload(ruta, archivo, {
      contentType: archivo.type,
      cacheControl: "3600",
    });
    if (error) throw new Error(traducir(error));
    return sb.storage.from("gatos").getPublicUrl(ruta).data.publicUrl;
  };
  DB.borrarGato = async (g) => {
    ok(await sb.from("gatos").delete().eq("id", g.id));
    // Las solicitudes del gato se borran en cascada en la base.
    if (g.foto_url) {
      const ruta = g.foto_url.split("/gatos/").pop();
      if (ruta) await sb.storage.from("gatos").remove([ruta]);
    }
  };

  // ---------- Enlace de acceso en el menú (usa los estilos existentes) ----------
  DB.pintarMenu = () => {
    const nav = document.getElementById("menu-principal");
    if (!nav) return;
    nav.querySelector("[data-acceso]")?.remove();
    // Quien no es administrador no ve el enlace a Gestión (la protección real está en la base).
    if (!DB.admin) document.querySelectorAll('a[href="gestion.html"]').forEach((a) => a.remove());
    const a = document.createElement("a");
    a.dataset.acceso = "1";
    a.href = "acceso.html";
    a.textContent = DB.usuario ? "Mi cuenta" : "Iniciar sesión";
    if (document.body.dataset.pagina === "acceso") {
      a.classList.add("activo");
      a.setAttribute("aria-current", "page");
    }
    nav.append(a);
  };
})();
