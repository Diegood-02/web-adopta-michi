/* Animaciones integradas: modelo .glb del usuario y video del logotipo.
   Solo HTML, CSS y JavaScript. El visor 3D usa una biblioteca externa bajo demanda. */
'use strict';
(() => {
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const videos = [...document.querySelectorAll('.video-logo')];

  // Reproduce solo los videos visibles, conserva la pausa manual y respeta las preferencias de movimiento.
  videos.forEach(video => {
    const contenedor = video.closest('.multimedia-tarjeta, .multimedia-nosotros');
    const boton = contenedor?.querySelector('.alternar-video');
    if (!boton) return;
    let pausarManualmente = reducirMovimiento;
    let visible = false;
    const pintar = () => {
      const pausado = video.paused;
      boton.textContent = pausado ? '▶ Reproducir animación' : '⏸ Pausar animación';
      boton.setAttribute('aria-pressed', String(!pausado));
    };
    const actualizar = () => {
      if (pausarManualmente || !visible || document.hidden) video.pause();
      else video.play().catch(() => { });
      pintar();
    };
    boton.addEventListener('click', () => {
      pausarManualmente = !video.paused;
      if (pausarManualmente) video.pause();
      else video.play().catch(() => { });
      pintar();
    });
    video.addEventListener('play', pintar);
    video.addEventListener('pause', pintar);
    video.addEventListener('error', () => { boton.disabled = true; boton.textContent = 'Video no disponible'; });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .15;
        actualizar();
      }, { threshold: [0, .15, .5] });
      observer.observe(video);
    } else { visible = true; actualizar(); }
    document.addEventListener('visibilitychange', actualizar);
    pintar();
  });

  const boton3d = document.querySelector('#activar-3d');
  window.MICHI_CARGAR_3D = cargarBiblioteca3d;
  if (!boton3d) return;
  const stage = document.querySelector('#visor-3d-stage');
  const mensaje = document.querySelector('#mensaje-3d');
  const controles = document.querySelector('#controles-3d');
  const alternar = document.querySelector('#alternar-giro');
  const reiniciar = document.querySelector('#reiniciar-camara');

  // Se inyecta la biblioteca al pulsar el botón: la descarga del modelo de ~25 MB
  // no bloquea el carrusel, las fotos ni los formularios.
  function cargarBiblioteca3d() {
    if (customElements.get('model-viewer')) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.onload = () => customElements.whenDefined('model-viewer').then(resolve, reject);
      script.onerror = () => reject(new Error('No hay conexión con la biblioteca 3D.'));
      document.head.appendChild(script);
    });
  }
  boton3d.addEventListener('click', async () => {
    boton3d.disabled = true;
    boton3d.textContent = 'Cargando visor 3D…';
    mensaje.textContent = 'Preparando visor, espera un momento…';
    try {
      await cargarBiblioteca3d();
      const viewer = document.createElement('model-viewer');
      viewer.id = 'modelo-gatito';
      viewer.src = 'modelos/gatito-3d.glb';
      viewer.alt = 'Gato tridimensional de Tu Michi Adopción, puedes rotarlo con el mouse o con el dedo';
      viewer.setAttribute('camera-controls', '');
      viewer.setAttribute('shadow-intensity', '0.9');
      viewer.setAttribute('interaction-prompt', 'auto');
      viewer.setAttribute('poster', 'img/gatito-3d-preview.jpg');
      viewer.setAttribute('exposure', '1');
      if (!reducirMovimiento) viewer.setAttribute('auto-rotate', '');
      stage.replaceChildren(viewer);
      controles.hidden = false;
      alternar.textContent = reducirMovimiento ? '▶ Activar giro' : '⏸ Detener giro';
      alternar.setAttribute('aria-pressed', String(!reducirMovimiento));
      mensaje.textContent = 'Descargando modelo 3D… Arrastra para girarlo.';
      viewer.addEventListener('load', () => { mensaje.textContent = 'Modelo 3D listo. Arrastra para girarlo.'; });
      viewer.addEventListener('error', () => { mensaje.textContent = 'No se pudo abrir el archivo 3D. Intenta con Live Server.'; });
      alternar.addEventListener('click', () => {
        const activo = viewer.hasAttribute('auto-rotate');
        if (activo) viewer.removeAttribute('auto-rotate');
        else viewer.setAttribute('auto-rotate', '');
        alternar.textContent = activo ? '▶ Activar giro' : '⏸ Detener giro';
        alternar.setAttribute('aria-pressed', String(!activo));
      });

    
reiniciar.addEventListener('click', async () => {

    viewer.removeAttribute('auto-rotate');
    alternar.textContent = '▶ Activar giro';
    alternar.setAttribute('aria-pressed', 'false');
    viewer.cameraOrbit = '0deg 75deg 105%';
    viewer.cameraTarget = 'auto auto auto';
    viewer.fieldOfView = 'auto';
    await viewer.updateComplete;
    viewer.jumpCameraToGoal();

});

    } catch (e) {
      console.warn('No fue posible activar el visor 3D:', e);
      mensaje.textContent = 'Para ver el modelo 3D necesitas internet y abrir el sitio con Live Server.';
      boton3d.disabled = false;
      boton3d.textContent = '↻ Intentar cargar 3D';
    }
  });
})();
