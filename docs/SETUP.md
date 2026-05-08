# Setup — P.A.I. JERÓNIMO

## 1. Supabase

1. Crear proyecto en https://supabase.com (free tier)
2. Settings → API → copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (no exponer al cliente)
3. SQL Editor → pegar y ejecutar `supabase/schema.sql`
4. (Opcional) Authentication → Settings → desactivar "Confirm email" para desarrollo rápido.

## 2. Variables de entorno

```bash
cp .env.local.example .env.local
# Editar .env.local con tus valores reales
```

## 3. Correr en local

```bash
npm run dev
```
Abrir http://localhost:3000 → redirige a `/login`.

## 4. Cargar datos JERÓNIMO (seed)

1. En la app, ir a `/register` y crear tu cuenta.
2. En Supabase → Authentication → Users → copiar tu `UUID`.
3. Abrir `supabase/seed.sql` y reemplazar `'00000000-0000-0000-0000-000000000000'` por tu UUID.
4. Pegar todo el SQL en el SQL Editor → Run.
5. Recargar `/proyecto` en la app → ya verás los datos.

## 5. Deploy en Vercel

```bash
# Desde la raíz del proyecto pai-jeronimo
git init && git add . && git commit -m "init: P.A.I. JERÓNIMO fase 1"
# Crear repo en GitHub y push
git remote add origin git@github.com:TU-USUARIO/pai-jeronimo.git
git push -u origin main
```

1. https://vercel.com/new → import repo
2. Framework: Next.js (auto-detect)
3. Environment Variables → pegar las 3 de Supabase
4. Deploy

## 6. Plan B físico (obligatorio antes del rodaje)

- Imprimir cada call sheet la noche anterior.
- Llevar lista de crew con teléfonos y RH en papel.
- Llevar lista de equipos UAO en papel.

> Recordatorio: P.A.I. es ayuda, no dependencia. El rodaje NO se detiene por un bug.
