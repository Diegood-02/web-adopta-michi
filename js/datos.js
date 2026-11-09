/* Gatos de ejemplo y directorio informativo del prototipo. */
window.MICHI_SEMILLA = {
  gatos: [
    {
      id: 1,
      nombre: "Shiro",
      edad: 48,
      sexo: "Macho",
      personalidad: "Cariñoso",
      descripcion:
        "Shiro es muy tranquilo, disfruta observar por la ventana y descansar cerca de las personas. Busca un hogar paciente y lleno de cariño.",
      historia:
        "Shiro llegó al cuidado del equipo después de ser encontrado en una calle transitada. Está aprendiendo a confiar y disfruta mucho de las caricias.",
      imagen: 3,
      estado: "disponible",
      vacunas: true,
      esterilizado: true,
      desparasitado: true,
    },
    {
      id: 2,
      nombre: "Dewey",
      edad: 24,
      sexo: "Macho",
      personalidad: "Curioso",
      descripcion:
        "Dewey disfruta explorar, jugar con pelotas y descubrir rincones nuevos. Es un compañero muy expresivo.",
      historia:
        "Dewey busca una familia que le ofrezca tiempo de juego y un rincón cómodo para dormir.",
      imagen: 5,
      estado: "disponible",
      vacunas: true,
      esterilizado: true,
      desparasitado: true,
    },
    {
      id: 3,
      nombre: "Cucho",
      edad: 18,
      sexo: "Macho",
      personalidad: "Juguetón",
      descripcion:
        "Cucho es activo y sociable; le encantan los juguetes y las sesiones de juego.",
      historia:
        "Cucho está listo para descubrir un nuevo hogar donde lo cuiden y respeten sus momentos de descanso.",
      imagen: 7,
      estado: "disponible",
      vacunas: true,
      esterilizado: false,
      desparasitado: true,
    },
    {
      id: 4,
      nombre: "Nube",
      edad: 8,
      sexo: "Hembra",
      personalidad: "Tranquilo",
      descripcion: "Nube es observadora y se adapta mejor a espacios calmados.",
      historia:
        "Le gustan los lugares cálidos y se acerca poco a poco a las personas.",
      imagen: 1,
      estado: "disponible",
      vacunas: false,
      esterilizado: false,
      desparasitado: true,
    },
    {
      id: 5,
      nombre: "Canela",
      edad: 12,
      sexo: "Hembra",
      personalidad: "Cariñoso",
      descripcion:
        "Canela busca la compañía humana y disfruta dormir en una manta suave.",
      historia:
        "Canela fue recibida en un hogar temporal y ahora espera encontrar una familia permanente.",
      imagen: 2,
      estado: "disponible",
      vacunas: true,
      esterilizado: false,
      desparasitado: true,
    },
    {
      id: 6,
      nombre: "Mango",
      edad: 11,
      sexo: "Macho",
      personalidad: "Curioso",
      descripcion:
        "Mango es un experto observador de ventanas y disfruta explorar con seguridad.",
      historia:
        "Un pequeño compañero con gran personalidad, listo para recibir cariño.",
      imagen: 6,
      estado: "disponible",
      vacunas: true,
      esterilizado: true,
      desparasitado: true,
    },
    {
      id: 7,
      nombre: "Zafiro",
      edad: 6,
      sexo: "Hembra",
      personalidad: "Juguetón",
      descripcion:
        "Zafiro tiene una mirada muy especial y mucha energía para jugar.",
      historia:
        "Una gatita alegre que busca una familia para crecer acompañada.",
      imagen: 4,
      estado: "disponible",
      vacunas: false,
      esterilizado: false,
      desparasitado: true,
    },
  ],
  solicitudes: [],
  mensajes: [],
  versionDirectorio: 1,
  // Datos públicos de las fichas de Google Maps enlazadas.
  veterinarias: [
    {
      id: 1,
      nombre: "Pet Shop Arvanik",
      especialidad: "Tienda de productos para mascotas",
      zona: "Calle Pinos 307, manzana 4, lote 17, Geovillas de Ixtapaluca 2000, 56530 Ixtapaluca, Estado de México",
      contacto: "+52 55 5475 3747",
      horario:
        "Lunes, martes y jueves a sábado: 11:00–19:00. Miércoles: 12:00–19:00. Domingo: cerrado.",
      maps: "https://maps.app.goo.gl/JHviU27mVpS4EoLB6",
    },
    {
      id: 2,
      nombre: "Huvica Aeropuerto",
      especialidad: "Farmacia veterinaria",
      zona: "Av. 12 275, Ignacio Zaragoza, Venustiano Carranza, 15000 Ciudad de México",
      contacto: "+52 55 5701 6534",
      horario:
        "Lunes a viernes: 09:00–18:00. Sábado: 09:00–14:00. Domingo: cerrado.",
      maps: "https://maps.app.goo.gl/D8D27cVzPqkF5Ser7",
    },
    {
      id: 3,
      nombre: "Hospital Veterinario Médica Animal 24 Horas",
      especialidad: "Hospital veterinario",
      zona: "Diag. San Antonio 1932 ABC, Narvarte Oriente, Benito Juárez, 03023 Ciudad de México",
      contacto: "+52 55 5538 0759",
      horario: "Abierto las 24 horas, todos los días.",
      maps: "https://maps.app.goo.gl/wHQCged4mbC8g7Qq8",
    },
  ],
};
window.MICHI_ARTICULOS = {
  primeros: {
    categoria: "Adopción responsable",
    titulo: "Cuidados básicos de un gato recién adoptado",
    imagen: "img/gato-3.jpg",
    resumen: "Aprende a preparar tu hogar y acompañar a tu nuevo compañero.",
    parrafos: [
      "Antes de recibir a tu michi, prepara un espacio tranquilo con agua, alimento adecuado, arenero y un sitio cómodo para esconderse.",
      "Permite que explore a su ritmo: algunos felinos se adaptan en pocos días y otros necesitan más tiempo.",
      "Agenda una valoración veterinaria para establecer sus cuidados individuales. Evita introducirlo de inmediato con otras mascotas.",
    ],
  },
  esterilizacion: {
    categoria: "Salud felina",
    titulo: "Cuatro beneficios de esterilizar a tu gato",
    imagen: "img/gato-4.jpg",
    resumen:
      "Descubre cómo la esterilización puede favorecer su salud y ayudar a prevenir camadas no planeadas.",
    parrafos: [
      "Si estás pensando en esterilizar a tu gato, considera cómo este procedimiento puede favorecer su salud, facilitar la convivencia y ayudar a prevenir camadas no planeadas.",
    ],
    beneficios: [
      {
        titulo: "Cuidado de su salud",
        texto:
          "En las gatas, la esterilización puede prevenir infecciones uterinas y reducir el riesgo de tumores mamarios. En los machos, la castración previene el cáncer testicular.",
      },
      {
        titulo: "Mejor convivencia",
        texto:
          "En los machos, la castración puede reducir el marcaje con orina y las salidas en busca de pareja. La esterilización habitual de las hembras elimina los ciclos de celo.",
      },
      {
        titulo: "Bienestar en la comunidad",
        texto:
          "La esterilización ayuda a controlar el crecimiento de las colonias felinas. Mantener a los gatos en espacios seguros también puede ayudar a proteger a la fauna local.",
      },
      {
        titulo: "Apoyo a los refugios",
        texto:
          "Prevenir camadas no planeadas puede reducir el número de gatos que llegan a los refugios y permitir que estos dediquen más recursos a quienes ya esperan un hogar.",
      },
    ],
    fuente: {
      nombre: "Beth Dokolasa para Cat Care Society",
      url: "https://www.catcaresociety.org/the-importance-of-spaying-and-neutering-cats/",
    },
  },
  adaptacion: {
    categoria: "Bienestar",
    titulo: "Cómo adaptar tu casa para un gato",
    imagen: "img/gato-5.jpg",
    resumen:
      "Espacios seguros, refugios, juego y rutinas para ayudarlo a adaptarse.",
    parrafos: [
      "Verifica ventanas, balcones, cables y plantas que puedan representar un riesgo para los gatos.",
      "Coloca el arenero lejos del agua y de la comida y ofrece escondites o sitios elevados seguros.",
      "Mantén rutinas estables de alimentación y momentos de juego sin forzar el contacto.",
    ],
  },
  estres: {
    categoria: "Comportamiento",
    titulo: "Señales de estrés felino que no debes ignorar",
    imagen: "img/gato-2.jpg",
    resumen:
      "Aprende a reconocer cambios en el comportamiento de tu compañero.",
    parrafos: [
      "Los cambios repentinos en apetito, eliminación, juego o sueño pueden indicar estrés o problemas de salud.",
      "Observa si se esconde más de lo habitual, muestra agresividad repentina o vocaliza de forma inusual.",
      "Si aparecen señales persistentes, solicita atención veterinaria en lugar de asumir que son solo de conducta.",
    ],
  },
};

/* Fotos de referencia del prototipo, agrupadas por apariencia. */
window.MICHI_GALERIAS = {
  1: [
    "img/galeria/d1e1767f232a6235a27e04f558cfd581.jpg",
    "img/galeria/d8e4fae634feecb5697eabd6a92f8dcb.jpg",
    "img/galeria/de8eb3b624c3420d3c7ee04f09caf9be.jpg",
  ],
  2: [
    "img/galeria/081a1ed8a83d3fd3ec929a752d2007bd.jpg",
    "img/galeria/9f79048afe902390456d30c72a75df96.jpg",
    "img/galeria/bf31149ac633afa074acbaeb47172b58.jpg",
  ],
  3: [
    "img/galeria/70fb12865432df2b998869fddb7f341e.jpg",
    "img/galeria/b8771e2b594b19e77ec1f71d696e90b0.jpg",
  ],
  4: [
    "img/galeria/701e9008e3ccd9814a637b098681235b.jpg",
    "img/galeria/a401ec7f7d1cf981d5a0ea73c85d4670.jpg",
    "img/galeria/bcbdaa33d529149f7cd339c42e429bcf.jpg",
  ],
  5: [
    "img/galeria/b8771e2b594b19e77ec1f71d696e90b0.jpg",
    "img/galeria/d4bb78d13dbae2c7332eb963f628c91d.jpg",
  ],
  6: [
    "img/galeria/d4bb78d13dbae2c7332eb963f628c91d.jpg",
    "img/galeria/70fb12865432df2b998869fddb7f341e.jpg",
  ],
  7: [
    "img/galeria/230f558968c94e8d675f3508cad29e75.jpg",
    "img/galeria/2944e530a35366275aac7ac04bab3ca3.jpg",
    "img/galeria/8f65fda117c327f56222a5f61f2fa891.jpg",
    "img/galeria/b957d12a7b73928dee8e1ab10c81eb63.jpg",
  ],
};
