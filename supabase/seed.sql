-- =====================================================
-- P.A.I. JERÓNIMO — Seed con datos reales
-- =====================================================
-- INSTRUCCIONES:
-- 1. Registra tu cuenta en /register de la app primero.
-- 2. En Supabase Dashboard → Authentication → Users, copia tu UUID.
-- 3. Reemplaza '00000000-0000-0000-0000-000000000000' abajo por tu UUID.
-- 4. Pega TODO este archivo en SQL Editor y ejecuta.
-- =====================================================

do $$
declare
  v_user_id uuid := '6dd2f0f6-942a-475c-83be-ce8d1aab82c6'; -- ⬅️ REEMPLAZAR
  v_project_id uuid;
begin
  -- 1) Proyecto
  insert into public.projects
    (name, type, budget_total, start_date, end_date, status, location, created_by)
  values
    ('JERÓNIMO', 'cortometraje', 9540500, '2026-06-04', '2026-06-10',
     'pre-produccion', 'Tuluá, Valle del Cauca, Colombia', v_user_id)
  returning id into v_project_id;

  -- 2) Crew (19 personas)
  insert into public.crew_members
    (project_id, name, role, phone, email, id_number, blood_type,
     emergency_contact_name, emergency_contact_phone, eps, dietary_restrictions)
  values
    (v_project_id, 'Manuelita Sánchez Ortiz', 'Productor General', null, null, null, null, null, null, null, null),
    (v_project_id, 'Daniel Quintero Bernal', 'Asistente de Producción', '3186794335', null, '1117349272', null, null, null, null, null),
    (v_project_id, 'Daniel Rodriguez Cristancho', 'Productor de Campo', null, null, null, null, null, null, null, null),
    (v_project_id, 'Luis Alejandro Vargas Lemus', 'Director', null, null, null, null, null, null, null, null),
    (v_project_id, 'Santiago Laverde', 'Asistente de Dirección', null, null, null, null, null, null, null, null),
    (v_project_id, 'Natalia Mafla Olaya', 'Script', '3003948146', 'nataliamafla5431@gmail.com',
      '1193094781', 'A-', 'Luisa Olaya', '3013971363', 'SURA', 'No come cebolla cruda ni maní'),
    (v_project_id, 'Juan David Patiño', 'Director de Foto', null, null, null, null, null, null, null, null),
    (v_project_id, 'Danna Hurtado', 'Primer Asistente de Foto', null, null, null, null, null, null, null, null),
    (v_project_id, 'Jhon David', 'Data / DIT', '3127714241', 'jhondadit@gmail.com',
      '1062285356', 'O+', 'Maria Deyanira', '3137003824', 'La Habana Medical', null),
    (v_project_id, 'Camila Paredes', 'Gaffer', null, null, null, null, null, null, null, null),
    (v_project_id, 'Alejandro Bravo', 'Lumino 1', null, null, null, null, null, null, null, null),
    (v_project_id, 'Lilá López', 'Directora de Arte', null, null, null, null, null, null, null, null),
    (v_project_id, 'Liliana Potes', 'Asistente de Arte', null, null, null, null, null, null, null, null),
    (v_project_id, 'Michelle Florez', 'Asistente de Arte', null, null, null, null, null, null, null, null),
    (v_project_id, 'Juan Sebastián Meza Cerón', 'Sonidista', null, null, null, null, null, null, null, null),
    (v_project_id, 'Tomás Riaños', 'Asistente de Sonido', '3053458638', 'tomasrianosm@gmail.com',
      '1109115524', 'O+', 'Claudia Muñoz', '3225020770', 'SOS Comfandi', null),
    (v_project_id, 'Gabriela Lucero Pazmiño', 'Montajista', null, null, null, null, null, null, null, null),
    (v_project_id, 'Martin Urrea', 'Colorista', null, null, null, null, null, null, null, null),
    (v_project_id, 'ANA / MARCO / BEBÉ', 'Actores', null, null, null, null, null, null, null, null);

  -- 3) Presupuesto resumen (1 entrada por categoría)
  insert into public.expenses (project_id, concept, category, amount, status) values
    (v_project_id, 'Transporte (desarrollo)', 'desarrollo', 318000, 'planeado'),
    (v_project_id, 'Contratos, cinta GAFER, amarras, pilas, memorias, panza embarazo', 'pre-produccion', 412500, 'planeado'),
    (v_project_id, 'Transporte 15 personas (5 días)', 'produccion', 840000, 'planeado'),
    (v_project_id, 'Equipos extras', 'produccion', 300000, 'planeado'),
    (v_project_id, 'Alimentación 5 días', 'produccion', 3750000, 'planeado'),
    (v_project_id, 'Locaciones', 'produccion', 900000, 'planeado'),
    (v_project_id, 'Botiquín', 'produccion', 120000, 'planeado'),
    (v_project_id, 'Discos duros', 'post-produccion', 900000, 'planeado'),
    (v_project_id, 'Alimentación post-producción', 'post-produccion', 1000000, 'planeado'),
    (v_project_id, 'Música', 'post-produccion', 1000000, 'planeado');

  -- 4) Equipos UAO
  insert into public.equipment (project_id, name, category, units, provider, status) values
    -- Fotografía
    (v_project_id, 'RED Gemini', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Óptica 25mm', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Óptica 35mm', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Óptica 50mm', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Óptica 85mm', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'EasyRing', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Follow Focus Tilta', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Monitor Elvid', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Monitor Sony', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Teradek', 'foto', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Sony Alfa 6300', 'foto', 1, 'UAO', 'solicitado'),
    -- Iluminación
    (v_project_id, 'ARRI 1000W', 'ilum', 4, 'UAO', 'solicitado'),
    (v_project_id, 'Aputure kit', 'ilum', 4, 'UAO', 'solicitado'),
    (v_project_id, 'Grips', 'ilum', 15, 'UAO', 'solicitado'),
    (v_project_id, 'Clamps', 'ilum', 15, 'UAO', 'solicitado'),
    (v_project_id, 'Hooks', 'ilum', 5, 'UAO', 'solicitado'),
    (v_project_id, 'Avenger stands', 'ilum', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Banderas', 'ilum', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Gels CTB/CTO', 'ilum', 1, 'UAO', 'solicitado'),
    -- Sonido
    (v_project_id, 'MixPre-6', 'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Sennheiser lavs', 'sonido', 2, 'UAO', 'solicitado'),
    (v_project_id, 'Audífonos', 'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'MKH-70', 'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'MKH-50', 'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Boom', 'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Caña', 'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Cables XLR', 'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Zeppelin', 'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Cortavientos', 'sonido', 1, 'UAO', 'solicitado');

  -- 5) Memorias iniciales
  insert into public.memories (project_id, type, content) values
    (v_project_id, 'preferencia', 'Natalia Mafla (Script) no come cebolla cruda ni maní.'),
    (v_project_id, 'hecho', 'Rodaje en Tuluá, Valle del Cauca. 4-10 junio 2026.'),
    (v_project_id, 'hecho', 'Equipos provienen de la UAO (Universidad Autónoma de Occidente).'),
    (v_project_id, 'decision', 'Plan B obligatorio: cada call sheet debe imprimirse en físico la noche anterior.');

  raise notice 'Seed JERÓNIMO completado para usuario %', v_user_id;
end $$;
