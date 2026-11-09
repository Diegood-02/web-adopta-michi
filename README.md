# Tu Michi Adopción — revisión integral (HTML + CSS + JavaScript)

## Abre el proyecto
1. Extrae este ZIP **completo**, sin mover archivos de las carpetas.
2. En Visual Studio Code abre la carpeta `Tu_Michi_Adopcion_Revision_2026`.
3. Ejecuta `index.html` con la extensión **Live Server**. No necesitas instalar PHP, MySQL ni XAMPP.
4. Navega por `nosotros.html`, `adopciones.html`, `blog.html`, `solicitudes.html`, `gestion.html`, etc.

## Cambios de la revisión
- **Inicio:** carrusel hero editorial con 3 diapositivas y controles existentes; imágenes verticales nuevas y textos de adopción, cuidados y veterinarias.
- **Pequeñas huellas que buscan hogar:** carrusel continuo, basado en el archivo `carrusel.txt`, corregido porque traía etiquetas y propiedades CSS traducidas que no funcionan en un navegador. Las tarjetas se alimentan de `js/datos.js` y de `localStorage`, con enlace a la ficha real. Se pausa al pasar el mouse, enfocarlo o con el botón, y evita movimiento continuo si el sistema solicita reducir animaciones.
- **Fotos:** ocho imágenes de `Nueva carpeta (2).zip`, optimizadas a **800 × 1000 px (4:5)** y guardadas como `img/gato-1.jpg` a `img/gato-8.jpg`. Se conservaron todas las páginas, modelos 3D y el video del logotipo.
- **Quiénes somos:** se añadieron la tarjeta y el `iframe` de Delightex 360° (`https://edu.delightex.com/FDA-FDV`) y el QR 3D existente. El QR ya estaba configurado para apuntar al mismo recorrido y conserva el enlace fijo.
- **Identidad visual:** la paleta original y todas las funciones previas se mantienen; los ajustes de diseño nuevos están en `css/revision.css`.

## Consideraciones
- El recorrido 360° y el QR 3D usan **servicios/bibliotecas externos**: requieren internet. El recorrido externo puede bloquear la visualización dentro de un iframe según sus propias políticas; siempre hay un botón para abrirlo directamente.
- Este prototipo no tiene cuentas, base de datos ni autorización real. Las solicitudes se guardan exclusivamente en `localStorage` del navegador.
- Si tienes datos previos de prueba en el mismo origen y las fotografías de algún gato se ven distintas de su nombre, puedes usar la opción **Restablecer datos** del panel de demostración para volver a la semilla actual. Esto borrará tus solicitudes de prueba.
- El proyecto contiene fotos de referencia de los recursos compartidos, no fotografías verificadas de gatos realmente disponibles para adoptar.

## Archivos
- `index.html`: inicio, hero nuevo y carrusel en movimiento.
- `nosotros.html`: recorrido 360° junto al QR 3D.
- `css/estilos.css`: estilo original.
- `css/revision.css`: cambios solicitados.
- `js/app.js`: lógica de carruseles, solicitudes y resto de la web.
- `img/`: imágenes nuevas 4:5, favicon y miniaturas.
- `modelos/gatito-3d.glb` y `videos/logo-animado.mp4`: animaciones conservadas.


## Ajuste visual de Quiénes somos (recorrido y QR)
Las tarjetas del recorrido 360° y del QR interactivo usan columnas iguales (50/50) en escritorio, la misma altura de visor (540 px), encabezados y pie de tarjeta alineados. En tabletas y celulares las tarjetas se apilan con alturas adaptadas para mantener la legibilidad. Los cambios están en `nosotros.html` y al final de `css/revision.css`. No requieren JavaScript nuevo.
