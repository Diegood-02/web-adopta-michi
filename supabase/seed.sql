-- Datos iniciales (generado desde js/datos.js). Ejecutar después de schema.sql.
truncate public.gatos restart identity cascade;
truncate public.veterinarias restart identity;
insert into public.gatos (nombre,edad,sexo,personalidad,descripcion,historia,imagen,estado,vacunas,esterilizado,desparasitado) values
('Shiro',48,'Macho','Cariñoso','Shiro es muy tranquilo, disfruta observar por la ventana y descansar cerca de las personas. Busca un hogar paciente y lleno de cariño.','Shiro llegó al cuidado del equipo después de ser encontrado en una calle transitada. Está aprendiendo a confiar y disfruta mucho de las caricias.',3,'disponible',true,true,true),
('Dewey',24,'Macho','Curioso','Dewey disfruta explorar, jugar con pelotas y descubrir rincones nuevos. Es un compañero muy expresivo.','Dewey busca una familia que le ofrezca tiempo de juego y un rincón cómodo para dormir.',5,'disponible',true,true,true),
('Cucho',18,'Macho','Juguetón','Cucho es activo y sociable; le encantan los juguetes y las sesiones de juego.','Cucho está listo para descubrir un nuevo hogar donde lo cuiden y respeten sus momentos de descanso.',7,'disponible',true,false,true),
('Nube',8,'Hembra','Tranquilo','Nube es observadora y se adapta mejor a espacios calmados.','Le gustan los lugares cálidos y se acerca poco a poco a las personas.',1,'disponible',false,false,true),
('Canela',12,'Hembra','Cariñoso','Canela busca la compañía humana y disfruta dormir en una manta suave.','Canela fue recibida en un hogar temporal y ahora espera encontrar una familia permanente.',2,'disponible',true,false,true),
('Mango',11,'Macho','Curioso','Mango es un experto observador de ventanas y disfruta explorar con seguridad.','Un pequeño compañero con gran personalidad, listo para recibir cariño.',6,'disponible',true,true,true),
('Zafiro',6,'Hembra','Juguetón','Zafiro tiene una mirada muy especial y mucha energía para jugar.','Una gatita alegre que busca una familia para crecer acompañada.',4,'disponible',false,false,true),
('Michi borrador',12,'Macho','Tranquilo','Descripción pendiente.','Historia pendiente.',1,'borrador',false,false,false);
insert into public.veterinarias (nombre,especialidad,zona,contacto,horario,maps) values
('Pet Shop Arvanik','Tienda de productos para mascotas','Calle Pinos 307, manzana 4, lote 17, Geovillas de Ixtapaluca 2000, 56530 Ixtapaluca, Estado de México','+52 55 5475 3747','Lunes, martes y jueves a sábado: 11:00–19:00. Miércoles: 12:00–19:00. Domingo: cerrado.','https://maps.app.goo.gl/JHviU27mVpS4EoLB6'),
('Huvica Aeropuerto','Farmacia veterinaria','Av. 12 275, Ignacio Zaragoza, Venustiano Carranza, 15000 Ciudad de México','+52 55 5701 6534','Lunes a viernes: 09:00–18:00. Sábado: 09:00–14:00. Domingo: cerrado.','https://maps.app.goo.gl/D8D27cVzPqkF5Ser7'),
('Hospital Veterinario Médica Animal 24 Horas','Hospital veterinario','Diag. San Antonio 1932 ABC, Narvarte Oriente, Benito Juárez, 03023 Ciudad de México','+52 55 5538 0759','Abierto las 24 horas, todos los días.','https://maps.app.goo.gl/wHQCged4mbC8g7Qq8');

