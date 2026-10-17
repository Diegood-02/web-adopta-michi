const carrusel = document.getElementById("carrusel");
const anterior = document.querySelector(".anterior");
const siguiente = document.querySelector(".siguiente");
const indicadores = document.getElementById("indicadores");
const botonPausa = document.getElementById("pausa");
const contador = document.getElementById("contador");
const barra = document.querySelector(".progreso span");

const diapositivas = [...carrusel.querySelectorAll(".slide")];

let indice = 0;
let intervalo;
let pausadoPorUsuario = false;

const movimientoReducido = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

function crearIndicadores() {
  diapositivas.forEach((diapositiva, i) => {
    const punto = document.createElement("button");

    punto.className = "indicador";
    punto.type = "button";
    punto.setAttribute("aria-label", `Ir al gato ${i + 1}`);

    punto.addEventListener("click", () => {
      moverCarrusel(i);
      reiniciarAutomatico();
    });

    indicadores.appendChild(punto);
  });
}

function marcarIndicador() {
  diapositivas.forEach((diapositiva, i) => {
    diapositiva.classList.toggle("activa", i === indice);
  });

  contador.textContent = `${String(indice + 1).padStart(2, "0")} / ${String(
    diapositivas.length,
  ).padStart(2, "0")}`;

  [...indicadores.children].forEach((punto, i) => {
    punto.classList.toggle("activo", i === indice);

    if (i === indice) {
      punto.setAttribute("aria-current", "true");
    } else {
      punto.removeAttribute("aria-current");
    }
  });
}

function moverCarrusel(nuevoIndice) {
  const total = diapositivas.length;

  indice = (nuevoIndice + total) % total;

  carrusel.scrollTo({
    left: diapositivas[indice].offsetLeft - diapositivas[0].offsetLeft,
    behavior: movimientoReducido.matches ? "instant" : "smooth",
  });

  marcarIndicador();
}

const DURACION = 5000;

function reiniciarBarra() {
  barra.style.animation = "none";
  barra.offsetWidth; // fuerza el reinicio de la animación
  barra.style.animation = `progreso ${DURACION}ms linear forwards`;
}

function detenerAutomatico() {
  clearInterval(intervalo);
  barra.style.animationPlayState = "paused";
}

function iniciarAutomatico() {
  clearInterval(intervalo);

  if (movimientoReducido.matches || pausadoPorUsuario) {
    barra.style.animation = "none";
    return;
  }

  reiniciarBarra();

  intervalo = setInterval(() => {
    moverCarrusel(indice + 1);
    reiniciarBarra();
  }, DURACION);
}

function reiniciarAutomatico() {
  iniciarAutomatico();
}

siguiente.addEventListener("click", () => {
  moverCarrusel(indice + 1);
  reiniciarAutomatico();
});

anterior.addEventListener("click", () => {
  moverCarrusel(indice - 1);
  reiniciarAutomatico();
});

// Botón de pausa (accesibilidad)
botonPausa.addEventListener("click", () => {
  pausadoPorUsuario = !pausadoPorUsuario;

  botonPausa.textContent = pausadoPorUsuario ? "▶" : "⏸";
  botonPausa.setAttribute(
    "aria-label",
    pausadoPorUsuario ? "Reanudar carrusel" : "Pausar carrusel",
  );

  iniciarAutomatico();
});

// Navegación con flechas del teclado
carrusel.addEventListener("keydown", (evento) => {
  if (evento.key === "ArrowRight") {
    moverCarrusel(indice + 1);
    reiniciarAutomatico();
  } else if (evento.key === "ArrowLeft") {
    moverCarrusel(indice - 1);
    reiniciarAutomatico();
  }
});

// Sincronizar indicadores cuando el usuario desliza con el dedo o el mouse
carrusel.addEventListener(
  "scroll",
  () => {
    const ancho = carrusel.clientWidth;
    const actual = Math.round(carrusel.scrollLeft / ancho);

    if (actual !== indice && actual >= 0 && actual < diapositivas.length) {
      indice = actual;
      marcarIndicador();
    }
  },
  { passive: true },
);

// Pausar mientras el usuario interactúa o la pestaña está oculta
const seccion = document.getElementById("catalogo");

["mouseenter", "focusin", "touchstart"].forEach((evento) => {
  seccion.addEventListener(evento, detenerAutomatico, {
    passive: true,
  });
});

["mouseleave", "focusout"].forEach((evento) => {
  seccion.addEventListener(evento, iniciarAutomatico);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    detenerAutomatico();
  } else {
    iniciarAutomatico();
  }
});

// Mantener la diapositiva alineada al cambiar el tamaño de la ventana
let temporizadorResize;

window.addEventListener("resize", () => {
  clearTimeout(temporizadorResize);
  temporizadorResize = setTimeout(() => moverCarrusel(indice), 150);
});

crearIndicadores();
moverCarrusel(0);
iniciarAutomatico();

$(function () {
  $(".hero-carrusel").slick({
    slidesToShow: 1,       // Una fotografía a la vez
    slidesToScroll: 1,
    dots: true,           // Puntitos debajo
    arrows: true,         // Flechas
    infinite: true,       // Regresa a la primera foto
    autoplay: true,       // Cambio automático
    autoplaySpeed: 3000,  // Cada 3 segundos
    fade: true,           // Efecto de desvanecimiento
    speed: 600,
    pauseOnHover: true,   // Pausa al colocar el cursor
    pauseOnFocus: true
  });
});