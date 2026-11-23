# Base de datos (Supabase)

- `schema.sql`: tablas, validaciones y reglas de seguridad (RLS). Es idempotente.
- `seed.sql`: datos iniciales (gatos, veterinarias y un gato "Michi borrador").
- Los correos de administrador **no** están en el repo: viven solo en la tabla `admin_emails` de la base.

## Cambiar de administrador
En el SQL Editor de Supabase:

```sql
select public.cambiar_admin('correo-anterior@ejemplo.com', 'correo-nuevo@ejemplo.com');
-- agregar otro admin sin quitar al actual:  select public.cambiar_admin(null, 'otro@ejemplo.com');
```

## Configuración del sitio
`js/supabase-config.js` lleva la URL del proyecto y la llave **anon** (pública por diseño).
Nunca pongas la llave `service_role` en el repo.

## Ajustes de Auth recomendados (Dashboard → Authentication)
- Confirm email: activado.
- Longitud mínima de contraseña: 8; activar protección contra contraseñas filtradas.
- URL Configuration → Site URL y Redirect URLs: `http://127.0.0.1:5500/**` (Live Server) y la URL de GitHub Pages.
