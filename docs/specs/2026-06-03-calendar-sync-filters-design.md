# Diseño: Filtros de Sincronización de Calendario y Proyecciones de Presupuesto

Este documento detalla el diseño técnico para la implementación de la sincronización selectiva en Google Calendar (llamados y/o transportes) y la separación de métricas de presupuesto real vs. proyectado en P.A.I. (Productor Asistente Inteligente).

## Objetivos
1. **Presupuesto vs Proyección**: Registrar los gastos asignados a transportes como proyecciones (`is_projected = true`) en lugar de egresos definitivos en el flujo de caja, y mostrar en la UI tanto el presupuesto disponible real (en tiempo real) como el presupuesto disponible neto (restando proyecciones futuras).
2. **Sincronización Selectiva**: Permitir que el usuario configure a través de interruptores (toggles) permanentes en la interfaz qué tipo de eventos (Llamados o Transportes) desea sincronizar en el Google Calendar público.
3. **Mapeo de Errores Amigable**: Detectar errores de configuración de Google Cloud (especialmente el error 403 de API desactivada) y ofrecer un enlace directo de configuración al usuario en un banner destacado de la interfaz móvil y web.

---

## 1. Modelo de Datos y Migración de BD

Crearemos la migración `supabase/migrations/17_calendar_sync_filters.sql` para añadir las opciones al proyecto:

```sql
-- Agregar columnas para habilitar/deshabilitar la sincronización selectiva de Google Calendar
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS sync_transports boolean not null default true,
ADD COLUMN IF NOT EXISTS sync_call_sheets boolean not null default true;
```

Actualizaremos la interfaz `Project` en [lib/types.ts](file:///c:/Users/danielito/Desktop/AGENTES/P.A.I/pai-jeronimo/lib/types.ts):
```typescript
export type Project = {
  id: string;
  name: string;
  type: string | null;
  budget_total: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  location: string | null;
  created_by: string | null;
  created_at: string;
  google_calendar_id: string | null;
  google_calendar_link: string | null;
  sync_transports: boolean;
  sync_call_sheets: boolean;
};
```

---

## 2. Lógica del Lado del Servidor (Server Actions y Helpers)

### A. Registro de Transportes como Proyecciones
En [app/(dashboard)/transport/actions.ts](file:///c:/Users/danielito/Desktop/AGENTES/P.A.I/pai-jeronimo/app/(dashboard)/transport/actions.ts):
- Modificar el payload de inserción/edición de `cash_flow` para poner `is_projected: true` en lugar de `false`.
- Los gastos de vehículos ahora son proyecciones.

### B. Control de Sincronización en Google Calendar
En [lib/google-calendar.ts](file:///c:/Users/danielito/Desktop/AGENTES/P.A.I/pai-jeronimo/lib/google-calendar.ts):
- En `sincronizarTransporteACalendar`:
  1. Consultar `google_calendar_id` y `sync_transports` del proyecto.
  2. Si `sync_transports` es `false`, llamar a `eliminarEventoCalendar` para remover el evento si ya existía y salir.
- En `sincronizarCallSheetACalendar`:
  1. Consultar `google_calendar_id` y `sync_call_sheets` del proyecto.
  2. Si `sync_call_sheets` es `false`, llamar a `eliminarEventoCalendar` para remover el evento si ya existía y salir.

### C. Acción para Actualizar Configuración
En [app/(dashboard)/proyecto/actions.ts](file:///c:/Users/danielito/Desktop/AGENTES/P.A.I/pai-jeronimo/app/(dashboard)/proyecto/actions.ts):
- Crear `actualizarConfiguracionCalendario(projectId, config)` que:
  1. Guarde en `projects` los flags `sync_transports` y `sync_call_sheets`.
  2. Recupere todos los transportes y llamados.
  3. Ejecute la sincronización condicional (crear/actualizar si está activo, eliminar de Google Calendar si se desactivó).
  4. Llame a `revalidatePath` para refrescar las pantallas afectadas.

---

## 3. Rediseño de la Interfaz de Usuario (UI)

### A. Toggles en Calendario (`CalendarSync.tsx`)
- Mostrar un panel permanente de configuración cuando el calendario esté activo.
- Contendrá dos checkboxes estilizados: "Sincronizar Llamados (Call Sheets)" y "Sincronizar Transportes".
- Modificar un toggle guardará la preferencia de inmediato usando `startTransition`.
- **Mapeador de Errores**: Si `error` contiene la cadena `Google Calendar API has not been used`, la interfaz mostrará un mensaje amigable con un botón directo a la consola del desarrollador de Google para habilitarla:
  - URL dinámica: `https://console.developers.google.com/apis/library/calendar.googleapis.com?project=265049982046`

### B. Métricas en Flujo de Caja (`CashFlowClient.tsx`)
- Modificar la tarjeta de resumen superior para mostrar de forma limpia y móvil las tres métricas:
  1. **Presupuesto disponible en este momento** (Caja Real sin proyecciones).
  2. **Egresos futuros proyectados** (Transportes y proyecciones).
  3. **Presupuesto disponible neto** (Resultado de restar proyecciones).

### C. Métricas en Presupuesto (`PresupuestoClient.tsx`)
- Cambiar la distribución de las 5 tarjetas de resumen:
  - **Presupuesto Total**: `$10.300.500 COP`
  - **Ejecutado (Real)**: Suma de egresos reales de caja y gastos ejecutados de presupuesto (con badge de porcentaje ejecutado).
  - **Proyectado / Comprometido**: Suma de egresos futuros y comprometidos.
  - **Disponible Actual (Real)**: Presupuesto total menos ejecutado.
  - **Disponible Neto**: Presupuesto total menos ejecutado y comprometido.

---

## 4. Plan de Verificación

### Pruebas de Flujo
1. **Creación de Transportes**:
   - Crear un transporte y verificar que en `/cashflow` aparezca bajo la pestaña "Proyecciones" y no afecte el "Disponible Actual", pero sí disminuya el "Disponible Neto".
2. **Habilitación Selectiva del Calendario**:
   - Desactivar "Sincronizar Transportes" y verificar que los eventos correspondientes se eliminen del Google Calendar público.
   - Activar "Sincronizar Transportes" y confirmar que reaparezcan automáticamente en Google Calendar.
3. **Manejo de Errores**:
   - Forzar un error de API en el simulador o ver el banner actual de error para asegurar que muestre el botón interactivo de ayuda con el enlace de Google Console.
