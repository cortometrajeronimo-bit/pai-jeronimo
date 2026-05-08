# P.A.I. — JERÓNIMO

**Producer Assistant Intelligence** para el cortometraje *JERÓNIMO* (Tuluá, junio 2026).

Asistente de producción con dashboard de crew, call sheets, presupuesto, equipos, chat IA con RAG y memoria persistente.

## Stack
Next.js 14 · TypeScript · Tailwind · shadcn/ui · Supabase · Vercel

## Quickstart
Ver [`docs/SETUP.md`](docs/SETUP.md).

```bash
npm install
cp .env.local.example .env.local   # llenar con keys de Supabase
npm run dev
```

## Estructura
```
app/
  (auth)/      → login, register
  (dashboard)/ → proyecto, crew, call-sheets, presupuesto, equipos, chat, memorias
  auth/signout → cierre de sesión
components/
  ui/          → primitives (button, card, input, table, label)
  layout/      → Sidebar, Header
  auth/        → LoginForm, RegisterForm
lib/
  supabase/    → client, server, middleware
  types.ts     → tipos DB
  utils.ts     → cn, formatCOP, formatDate
supabase/
  schema.sql   → tablas + índices + RLS
  seed.sql     → datos reales JERÓNIMO
docs/
  TODO.md, progreso.md
  specs/       → 13 specs por módulo
  SETUP.md     → instrucciones de configuración
```

## Estética
Fondo `#0a0a0a` · Acento dorado `#d4af37` · Inter

## Roadmap
1. **Fase 1 (esta):** Fundación — schema, layout, auth, datos.
2. **Fase 2:** CRUDs, generador call sheet con PDF, gráficos presupuesto.
3. **Fase 3:** Chat IA, RAG con ChromaDB, memorias auto, emails.
4. **Fase 4:** Carga real, plan B impreso, migración Claude→Kimi.

## Regla de oro
P.A.I. es **ayuda, no dependencia**. El rodaje NO se detiene por un bug.
