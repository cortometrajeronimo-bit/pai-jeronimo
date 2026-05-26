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
    ('JERÓNIMO', 'cortometraje', 10300500, '2026-06-06', '2026-06-11',
     'pre-produccion', 'Tuluá, Valle del Cauca, Colombia', v_user_id)
  returning id into v_project_id;

  -- 2) Crew (21 personas + 4 actores, fuente: 04. BASE DE DATOS Drive)
  insert into public.crew_members
    (project_id, name, role, phone, email, id_number, blood_type,
     emergency_contact_name, emergency_contact_phone, eps, dietary_restrictions, notes)
  values
    (v_project_id, 'Manuelita Sánchez Ortiz', 'Productor',
       '3105290507', 'manuelitasanchezortiz@gmail.com', '1006465303', 'O+',
       'Sandra Ortiz Useche (Madre)', '3206204143', null, null,
       'Hospedaje: Casa Manuelita · Vehículo: Nissan March HWS 637 (conductora)'),
    (v_project_id, 'Daniel Quintero Bernal', 'Asistente de Producción',
       '3186794335', 'daniel.quintero_ber@uao.edu.co', '1117349272', 'A+',
       'Sandra', '3166280709', 'SURA', 'Sin comida de mar',
       'Hospedaje: Hospedaje propio en Tuluá · Vehículo: Nissan Pathfinder BSN 653'),
    (v_project_id, 'Nayara Hoyos', 'Asistente de Producción',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Hospedaje propio en Tuluá · Vehículo: Carro 1 Meza'),
    (v_project_id, 'Daniel Rodriguez Cristancho', 'Productor de Campo',
       '3122229552', 'dan.rod.cr27@gmail.com', '1005745432', 'O+',
       'Jorge Rodríguez', '3154812828', 'Coomeva', null,
       'Hospedaje: Casa Manuelita · Vehículo propio: Renault Kwid KVO 894 (conductor)'),
    (v_project_id, 'Luis Alejandro Vargas Lemus', 'Director',
       '3053081479', 'luis_ale.vargas@uao.edu.co', '1117348575', 'O+',
       'Cristina', '3004940798', 'Nueva EPS', 'Alérgico a camarones',
       'Hospedaje: Casa Alejo · Vehículo propio: Twingo DEL 047 (conductor)'),
    (v_project_id, 'Santiago Laverde Castaño', 'Asistente de Dirección',
       '3234969195', 'santiagolaverdecastano@gmail.com', '1193414954', 'O+',
       'Cecilia Castaño (Madre)', '3028610866', 'Comfenalco', null,
       'Hospedaje: Casa Alejo · Vehículo: Twingo DEL 047'),
    (v_project_id, 'Natalia Mafla Olaya', 'Script',
       '3003948146', 'nataliamafla5431@gmail.com', '1193094781', 'A-',
       'Luisa Olaya', '3013971363', 'SURA', 'No come cebolla cruda ni maní',
       'Hospedaje: Casa Alejo · Vehículo: Twingo DEL 047'),
    (v_project_id, 'Juan David Patiño', 'Director de Fotografía',
       '3184749563', 'juandapatino@gmail.com', '1006009641', 'A+',
       'Elias Patiño', '3113873543', 'SURA', 'Sin cebolla',
       'Hospedaje: Casa Alejo · Vehículo propio: Hyundai Accent CMK 588 (conductor)'),
    (v_project_id, 'Danna Hurtado', 'Primer Asistente de Foto (1AC)',
       '3243961313', 'dannacatalina.hurtado@gmail.com', '1042242742', 'A+',
       'Javier Hurtado', '3042021997', 'Nueva EPS', 'Sin comida de mar, arvejas, cebolla',
       'Hospedaje: Casa Alejo · Vehículo: Carro 1 Meza'),
    (v_project_id, 'Jhon David Balanta', 'Data / DIT',
       '3127714241', 'jhondadit@gmail.com', '1062285356', 'O+',
       'María Deyanira', '3137003824', 'La Habana Medical', null,
       'Hospedaje: Casa Alejo · Vehículo: Nissan March HWS 637'),
    (v_project_id, 'Camila Paredes', 'Gaffer',
       '3137271023', 'camiparedes2001@gmail.com', '1007488998', 'AB+',
       'María Dolores Acosta', '3217712681', 'Emssanar', 'Alérgica a Amoxicilina · Sin verduras crudas',
       'Hospedaje: Casa Alejo · Vehículo propio: Renault Kwid JPL 774'),
    (v_project_id, 'David Valencia', 'Lumino',
       '3136522216', 'davalenciavi@gmail.com', '1111539548', 'A+',
       'Jorge Ivan', '3104143384', 'Salud Total', null,
       'Hospedaje: Casa Manuelita · Vehículo: Nissan March HWS 637'),
    (v_project_id, 'Juan José Muñoz', 'Lumino',
       '3218447751', 'juan_josn.munoz@uao.edu.co', '1105367494', 'O+',
       'Mirian Agudelo', '3127218198', 'SURA', null,
       'Hospedaje: Hospedaje propio en Tuluá · Vehículo: Pathfinder BSN 653 / Twingo DEL 047'),
    (v_project_id, 'Mariana Ospina', 'Foto fija / BTS',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Mariana · Vehículo: Pathfinder BSN 653'),
    (v_project_id, 'Lilá López', 'Directora de Arte',
       '3154872078', 'lilalopezhincapie@gmail.com', '1034288232', 'A+',
       'Cristina López', '3136419622', 'SURA', 'Sin cerdo',
       'Hospedaje: Casa Manuelita · Vehículo: Pathfinder BSN 653'),
    (v_project_id, 'Liliana Potes', 'Asistente de Arte',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Michell · Vehículo: Pathfinder BSN 653'),
    (v_project_id, 'Daniela Avila', 'Asistente de Arte',
       '3172616565', 'danielaavilagrajales@gmail.com', '1117015788', 'A+',
       'María Asceneth Grajales', '3164086886', 'SOS', 'Alérgica a camarones · Sin embutidos',
       'Hospedaje: Hospedaje propio en Tuluá · Vehículo: Pathfinder BSN 653'),
    (v_project_id, 'Michell Florez', 'Asistente de Arte / Vestuario / Makeup',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Michell · Vehículo: Carro 1 Meza'),
    (v_project_id, 'Natalia Peña', 'Makeup',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Michell'),
    (v_project_id, 'Juan Sebastián Meza Cerón', 'Director de Sonido',
       '3176502394', 'jsmece123@gmail.com', '1193224185', 'O+',
       'Oscar Humberto Meza', '3057455118', 'Sanitas', 'Migraña y dolor en los ojos',
       'Hospedaje: Casa Manuelita · Vehículo: Carro 1 Meza'),
    (v_project_id, 'Tomás Riaños', 'Asistente de Sonido / Boom Operator',
       '3053458638', 'tomasrianosm@gmail.com', '1109115524', 'O+',
       'Claudia Muñoz', '3225020770', 'SOS Comfandi', null,
       'Hospedaje: Casa Manuelita · Vehículo: Nissan March HWS 637'),
    (v_project_id, 'Martín Urrea', 'Montajista / Colorista',
       '3217216056', 'martinurreacgs@gmail.com', '1092454804', 'O+',
       'Jorge Urrea', '3108423795', null, null,
       'Fuera de set'),
    (v_project_id, 'Ana Rangel',  'Actriz (ANA)',  null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Mariana · Vehículo: Renault Kwid KVO 894'),
    (v_project_id, 'Juan Martín', 'Actor (MARCO)', null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Manuelita · Vehículo: Renault Kwid KVO 894'),
    (v_project_id, 'Pedro',       'Actor',         null, null, null, null, null, null, null, null,
       'Vehículo: Renault Kwid KVO 894'),
    (v_project_id, 'Bebé',        'Actor (BEBÉ)',  null, null, null, null, null, null, null, null,
       'Nombre real pendiente');

  -- 3) Presupuesto detallado (27 ítems, fuente: 01. PRESUPUESTO GENERAL Drive)
  insert into public.expenses (project_id, concept, category, amount, status) values
    -- DESARROLLO (318.000)
    (v_project_id, 'Transporte a Tuluá (3 paquetes × 56.000)',          'desarrollo',     168000, 'planeado'),
    (v_project_id, 'Transporte en Tuluá (3 paquetes × 50.000)',         'desarrollo',     150000, 'planeado'),
    -- PREPRODUCCIÓN (572.500)
    (v_project_id, 'Contratos de crew (15 × 500)',                      'pre-produccion',   7500, 'planeado'),
    (v_project_id, 'Contratos de elenco (3 × 500)',                     'pre-produccion',   1500, 'planeado'),
    (v_project_id, 'Contratos de locaciones (4 × 500)',                 'pre-produccion',   2000, 'planeado'),
    (v_project_id, 'Contrato productor musical',                        'pre-produccion',    500, 'planeado'),
    (v_project_id, 'Copias de guiones (30 × 200)',                      'pre-produccion',   6000, 'planeado'),
    (v_project_id, 'Hojas de script (25 × 200)',                        'pre-produccion',   5000, 'planeado'),
    (v_project_id, 'Cinta GAFFER',                                      'pre-produccion', 100000, 'planeado'),
    (v_project_id, 'Amarras (2 × 20.000)',                              'pre-produccion',  40000, 'planeado'),
    (v_project_id, 'Pulpos',                                            'pre-produccion',  20000, 'planeado'),
    (v_project_id, 'Panza de embarazo falsa',                           'pre-produccion', 130000, 'planeado'),
    (v_project_id, 'Pilas (2 × 70.000)',                                'pre-produccion', 140000, 'planeado'),
    (v_project_id, 'Memorias (2 × 60.000)',                             'pre-produccion', 120000, 'planeado'),
    -- PRODUCCIÓN (5.910.000)
    (v_project_id, 'Transporte personas (15 × 56.000)',                 'produccion',     840000, 'planeado'),
    (v_project_id, 'Transporte equipos',                                'produccion',     300000, 'planeado'),
    (v_project_id, 'Alimentación desayuno (5 días × 225.000)',          'produccion',    1125000, 'planeado'),
    (v_project_id, 'Alimentación almuerzo (5 días × 300.000)',          'produccion',    1500000, 'planeado'),
    (v_project_id, 'Alimentación cena (5 días × 225.000)',              'produccion',    1125000, 'planeado'),
    (v_project_id, 'Reparación y daños en locaciones',                  'produccion',     500000, 'planeado'),
    (v_project_id, 'Alquiler de locaciones (4 × 100.000)',              'produccion',     400000, 'planeado'),
    (v_project_id, 'Botiquín',                                          'produccion',     120000, 'planeado'),
    -- POSPRODUCCIÓN (3.500.000)
    (v_project_id, 'Discos duros (3 × 300.000)',                        'post-produccion', 900000, 'planeado'),
    (v_project_id, 'Alimentación montaje (4 semanas × 160.000)',        'post-produccion', 640000, 'planeado'),
    (v_project_id, 'Alimentación post de sonido (3 semanas × 160.000)', 'post-produccion', 480000, 'planeado'),
    (v_project_id, 'Alimentación post de color (3 semanas × 160.000)',  'post-produccion', 480000, 'planeado'),
    (v_project_id, 'Música original',                                   'post-produccion',1000000, 'planeado');

  -- 4) Equipos UAO (fuente: 05. EQUIPOS Drive)
  insert into public.equipment (project_id, name, category, units, provider, status) values
    -- FOTOGRAFÍA
    (v_project_id, 'Sony FX9',                                                     'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Wooden para Sony FX9',                                         'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Módulo de grabación',                                          'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Rokinon Lens Kit (24, 35, 50, 85) + Adaptador EF AF',          'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Óptica Rokinon Ojo de pez',                                    'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'EasyRing Mini Max',                                            'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Follow Focus Tilta Nucleus M',                                 'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Monitor Atomos Ninja',                                         'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Monitor Sony Trimaster',                                       'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Teradek Bolt Pro 500 (Tx/Rx)',                                 'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Adaptador CF Express Tipo B a USB-C',                          'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Tarjeta CF Express Tipo B',                                    'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Cargador Dracast V-Mount',                                     'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Batería BPU',                                                  'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Cable SDI',                                                    'foto',   3, 'UAO', 'solicitado'),
    (v_project_id, 'Claqueta Digital',                                             'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Time Code Sync E',                                             'foto',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Sony Z90 (B-cam)',                                             'foto',   1, 'UAO', 'solicitado'),
    -- ILUMINACIÓN
    (v_project_id, 'Sky Panel 2000W',                                              'ilum',   2, 'UAO', 'solicitado'),
    (v_project_id, 'Kit Arri 650 Fresnel',                                         'ilum',   4, 'UAO', 'solicitado'),
    (v_project_id, 'Kit Aputure 300C (linterna, octabox, banderas)',               'ilum',   2, 'UAO', 'solicitado'),
    (v_project_id, 'D200 GripHead (galletas)',                                     'ilum',  10, 'UAO', 'solicitado'),
    (v_project_id, 'Super Clamp (Maffer)',                                         'ilum',   8, 'UAO', 'solicitado'),
    (v_project_id, 'Sky Hook 043 (pinza)',                                         'ilum',   2, 'UAO', 'solicitado'),
    (v_project_id, 'C-500 Pelikan Gaffer',                                         'ilum',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Base de piso hembra F-301',                                    'ilum',   1, 'UAO', 'solicitado'),
    (v_project_id, 'D-500 Avenger 50 cm',                                          'ilum',   6, 'UAO', 'solicitado'),
    (v_project_id, 'D-500 Avenger 1 m',                                            'ilum',   6, 'UAO', 'solicitado'),
    (v_project_id, 'Mombo Combo',                                                  'ilum',   2, 'UAO', 'solicitado'),
    (v_project_id, 'Combo Baby',                                                   'ilum',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Trípode Avenger',                                              'ilum',   6, 'UAO', 'solicitado'),
    (v_project_id, 'Matthews Trípode Hollywood C-Stand',                           'ilum',   3, 'UAO', 'solicitado'),
    (v_project_id, 'C4465 MP Eye Coupler 28 mm',                                   'ilum',   2, 'UAO', 'solicitado'),
    (v_project_id, 'E-200 Spigot 28 mm',                                           'ilum',   2, 'UAO', 'solicitado'),
    (v_project_id, 'Bandera Francesa 70×50',                                       'ilum',   3, 'UAO', 'solicitado'),
    (v_project_id, 'Bandera Francesa 40×40',                                       'ilum',   3, 'UAO', 'solicitado'),
    (v_project_id, 'Bandera Francesa 1×50',                                        'ilum',   3, 'UAO', 'solicitado'),
    (v_project_id, 'Pesas naranjas',                                               'ilum',   2, 'UAO', 'solicitado'),
    (v_project_id, 'Gel de color',                                                 'ilum',   4, 'UAO', 'solicitado'),
    (v_project_id, 'Gel CTB Full',                                                 'ilum',   4, 'UAO', 'solicitado'),
    (v_project_id, 'Gel CTO Full',                                                 'ilum',   4, 'UAO', 'solicitado'),
    (v_project_id, 'Telas blancas',                                                'ilum',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Telas negras',                                                 'ilum',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Kit Apple Box (full, 1/2, 1/4, pancake)',                      'ilum',   2, 'UAO', 'solicitado'),
    (v_project_id, 'Bolsas de arena',                                              'ilum',  10, 'UAO', 'solicitado'),
    (v_project_id, 'Barracuda (5 metros)',                                         'ilum',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Backstage kit (carro)',                                        'ilum',   1, 'UAO', 'solicitado'),
    (v_project_id, 'Extensiones eléctricas (mix 5/10/20 m)',                       'ilum',   8, 'UAO', 'solicitado'),
    -- SONIDO
    (v_project_id, 'Grabadora MixPre-6',                                           'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Micrófono solapa inalámbrico Sennheiser',                      'sonido', 3, 'UAO', 'solicitado'),
    (v_project_id, 'Audífonos Sennheiser',                                         'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Micrófono MKH 416',                                            'sonido', 2, 'UAO', 'solicitado'),
    (v_project_id, 'Micrófono MKH-50',                                             'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Boom',                                                         'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Caña',                                                         'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Cable XLR',                                                    'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Zeppelin',                                                     'sonido', 1, 'UAO', 'solicitado'),
    (v_project_id, 'Cargador Np-F',                                                'sonido', 2, 'UAO', 'solicitado'),
    (v_project_id, 'Cortavientos',                                                 'sonido', 1, 'UAO', 'solicitado');

  -- 5) Memorias iniciales
  insert into public.memories (project_id, type, content) values
    (v_project_id, 'preferencia', 'Natalia Mafla (Script) no come cebolla cruda ni maní.'),
    (v_project_id, 'hecho',       'Rodaje en Tuluá, Valle del Cauca. 6-11 junio 2026 (día 6 = avanzada + día 1).'),
    (v_project_id, 'hecho',       'Equipos provienen de la UAO (Universidad Autónoma de Occidente).'),
    (v_project_id, 'decision',    'Plan B obligatorio: cada call sheet debe imprimirse en físico la noche anterior.');

  raise notice 'Seed JERÓNIMO completado para usuario %', v_user_id;
end $$;
