-- 12_refresh_data_drive.sql
-- Sincroniza la BD con la fuente de verdad en Drive (folder JERÓNIMO):
--   01. PRESUPUESTO GENERAL → expenses
--   02. CRONOGRAMA          → start_date/end_date + 6 call_sheets
--   04. BASE DE DATOS       → crew_members (con hospedaje + transporte en notes)
--   05. EQUIPOS             → equipment
--   06. HOSPEDAJE           → notes en crew_members
--   07. TRANSPORTE          → notes en crew_members
-- Además ancla guion + propuestas en /proyecto vía project_documents.
-- Todo en una sola transacción para que un error revierta el conjunto.

begin;

-- 0) Normaliza status de expenses (cura el bug "100% ejecutado")
update public.expenses
   set status = 'planeado'
 where status is null
    or status = ''
    or status not in ('planeado','comprometido','ejecutado','cancelado');

-- 1) Fechas + budget total del proyecto
update public.projects
   set start_date   = '2026-06-06',
       end_date     = '2026-06-11',
       budget_total = 10300500
 where name = 'JERÓNIMO';

-- A partir de aquí todo trabaja contra el id del proyecto JERÓNIMO
do $$
declare
  v_pid uuid := (select id from public.projects where name = 'JERÓNIMO');
begin
  if v_pid is null then
    raise exception 'No existe el proyecto JERÓNIMO en projects';
  end if;

  -- 2) EXPENSES — wipe + reinsert con desglose real del sheet
  delete from public.expenses where project_id = v_pid;

  insert into public.expenses (project_id, concept, category, amount, status) values
    -- DESARROLLO (318.000)
    (v_pid, 'Transporte a Tuluá (3 paquetes × 56.000)',                'desarrollo',     168000, 'planeado'),
    (v_pid, 'Transporte en Tuluá (3 paquetes × 50.000)',               'desarrollo',     150000, 'planeado'),
    -- PREPRODUCCIÓN (572.500)
    (v_pid, 'Contratos de crew (15 × 500)',                            'pre-produccion',   7500, 'planeado'),
    (v_pid, 'Contratos de elenco (3 × 500)',                           'pre-produccion',   1500, 'planeado'),
    (v_pid, 'Contratos de locaciones (4 × 500)',                       'pre-produccion',   2000, 'planeado'),
    (v_pid, 'Contrato productor musical (1 × 500)',                    'pre-produccion',    500, 'planeado'),
    (v_pid, 'Copias de guiones (30 × 200)',                            'pre-produccion',   6000, 'planeado'),
    (v_pid, 'Hojas de script (25 × 200)',                              'pre-produccion',   5000, 'planeado'),
    (v_pid, 'Cinta GAFFER (1 paquete)',                                'pre-produccion', 100000, 'planeado'),
    (v_pid, 'Amarras (2 × 20.000)',                                    'pre-produccion',  40000, 'planeado'),
    (v_pid, 'Pulpos (1 paquete × 20.000)',                             'pre-produccion',  20000, 'planeado'),
    (v_pid, 'Panza de embarazo falsa',                                 'pre-produccion', 130000, 'planeado'),
    (v_pid, 'Pilas (2 × 70.000)',                                      'pre-produccion', 140000, 'planeado'),
    (v_pid, 'Memorias (2 × 60.000)',                                   'pre-produccion', 120000, 'planeado'),
    -- PRODUCCIÓN (5.910.000)
    (v_pid, 'Transporte personas (15 × 56.000)',                       'produccion',     840000, 'planeado'),
    (v_pid, 'Transporte equipos',                                      'produccion',     300000, 'planeado'),
    (v_pid, 'Alimentación desayuno (5 días × 225.000)',                'produccion',    1125000, 'planeado'),
    (v_pid, 'Alimentación almuerzo (5 días × 300.000)',                'produccion',    1500000, 'planeado'),
    (v_pid, 'Alimentación cena (5 días × 225.000)',                    'produccion',    1125000, 'planeado'),
    (v_pid, 'Reparación y daños en locaciones',                        'produccion',     500000, 'planeado'),
    (v_pid, 'Alquiler de locaciones (4 × 100.000)',                    'produccion',     400000, 'planeado'),
    (v_pid, 'Botiquín',                                                'produccion',     120000, 'planeado'),
    -- POSPRODUCCIÓN (3.500.000)
    (v_pid, 'Discos duros (3 × 300.000)',                              'post-produccion', 900000, 'planeado'),
    (v_pid, 'Alimentación montaje (4 semanas × 160.000)',              'post-produccion', 640000, 'planeado'),
    (v_pid, 'Alimentación post de sonido (3 semanas × 160.000)',       'post-produccion', 480000, 'planeado'),
    (v_pid, 'Alimentación post de color (3 semanas × 160.000)',        'post-produccion', 480000, 'planeado'),
    (v_pid, 'Música original — derechos y producción',                 'post-produccion',1000000, 'planeado');

  -- 3) CREW_MEMBERS — wipe + reinsert desde 04. BASE DE DATOS, con notes = Hospedaje + Vehículo
  delete from public.crew_members where project_id = v_pid;

  insert into public.crew_members
    (project_id, name, role, phone, email, id_number, blood_type,
     emergency_contact_name, emergency_contact_phone, eps, dietary_restrictions, notes)
  values
    -- PRODUCCIÓN
    (v_pid, 'Manuelita Sánchez Ortiz', 'Productor',
       '3105290507', 'manuelitasanchezortiz@gmail.com', '1006465303', 'O+',
       'Sandra Ortiz Useche (Madre)', '3206204143', null, null,
       'Hospedaje: Casa Manuelita · Vehículo: Nissan March HWS 637 (conductora)'),
    (v_pid, 'Daniel Quintero Bernal', 'Asistente de Producción',
       '3186794335', 'daniel.quintero_ber@uao.edu.co', '1117349272', 'A+',
       'Sandra', '3166280709', 'SURA', 'Sin comida de mar',
       'Hospedaje: Hospedaje propio en Tuluá · Vehículo: Nissan Pathfinder BSN 653'),
    (v_pid, 'Nayara Hoyos', 'Asistente de Producción',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Hospedaje propio en Tuluá · Vehículo: Carro 1 Meza (conductor: Juan David Patiño)'),
    (v_pid, 'Daniel Rodriguez Cristancho', 'Productor de Campo',
       '3122229552', 'dan.rod.cr27@gmail.com', '1005745432', 'O+',
       'Jorge Rodríguez', '3154812828', 'Coomeva', null,
       'Hospedaje: Casa Manuelita · Vehículo propio: Renault Kwid KVO 894 (conductor)'),
    -- DIRECCIÓN
    (v_pid, 'Luis Alejandro Vargas Lemus', 'Director',
       '3053081479', 'luis_ale.vargas@uao.edu.co', '1117348575', 'O+',
       'Cristina', '3004940798', 'Nueva EPS', 'Alérgico a camarones',
       'Hospedaje: Casa Alejo · Vehículo propio: Twingo DEL 047 (conductor) + Pathfinder BSN 653'),
    (v_pid, 'Santiago Laverde Castaño', 'Asistente de Dirección',
       '3234969195', 'santiagolaverdecastano@gmail.com', '1193414954', 'O+',
       'Cecilia Castaño (Madre)', '3028610866', 'Comfenalco', null,
       'Hospedaje: Casa Alejo · Vehículo: Twingo DEL 047'),
    (v_pid, 'Natalia Mafla Olaya', 'Script',
       '3003948146', 'nataliamafla5431@gmail.com', '1193094781', 'A-',
       'Luisa Olaya', '3013971363', 'SURA', 'No come cebolla cruda ni maní',
       'Hospedaje: Casa Alejo · Vehículo: Twingo DEL 047'),
    -- FOTOGRAFÍA
    (v_pid, 'Juan David Patiño', 'Director de Fotografía',
       '3184749563', 'juandapatino@gmail.com', '1006009641', 'A+',
       'Elias Patiño', '3113873543', 'SURA', 'Sin cebolla',
       'Hospedaje: Casa Alejo · Vehículo propio: Hyundai Accent CMK 588 / Carro 1 Meza (conductor)'),
    (v_pid, 'Danna Hurtado', 'Primer Asistente de Foto (1AC)',
       '3243961313', 'dannacatalina.hurtado@gmail.com', '1042242742', 'A+',
       'Javier Hurtado', '3042021997', 'Nueva EPS', 'Sin comida de mar, arvejas, cebolla',
       'Hospedaje: Casa Alejo · Vehículo: Carro 1 Meza'),
    (v_pid, 'Jhon David Balanta', 'Data / DIT',
       '3127714241', 'jhondadit@gmail.com', '1062285356', 'O+',
       'María Deyanira', '3137003824', 'La Habana Medical', null,
       'Hospedaje: Casa Alejo · Vehículo: Nissan March HWS 637'),
    -- ILUMINACIÓN
    (v_pid, 'Camila Paredes', 'Gaffer',
       '3137271023', 'camiparedes2001@gmail.com', '1007488998', 'AB+',
       'María Dolores Acosta', '3217712681', 'Emssanar', 'Alérgica a la Amoxicilina · No come verduras crudas',
       'Hospedaje: Casa Alejo · Vehículo propio: Renault Kwid JPL 774 / Pathfinder BSN 653'),
    (v_pid, 'David Valencia', 'Lumino',
       '3136522216', 'davalenciavi@gmail.com', '1111539548', 'A+',
       'Jorge Ivan', '3104143384', 'Salud Total', null,
       'Hospedaje: Casa Manuelita · Vehículo: Nissan March HWS 637'),
    (v_pid, 'Juan José Muñoz', 'Lumino',
       '3218447751', 'juan_josn.munoz@uao.edu.co', '1105367494', 'O+',
       'Mirian Agudelo', '3127218198', 'SURA', null,
       'Hospedaje: Hospedaje propio en Tuluá · Vehículo: Pathfinder BSN 653 + Twingo DEL 047'),
    -- FOTO FIJA / BTS
    (v_pid, 'Mariana Ospina', 'Foto fija / BTS',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Mariana · Vehículo: Pathfinder BSN 653'),
    -- ARTE
    (v_pid, 'Lilá López', 'Directora de Arte',
       '3154872078', 'lilalopezhincapie@gmail.com', '1034288232', 'A+',
       'Cristina López', '3136419622', 'SURA', 'Sin cerdo',
       'Hospedaje: Casa Manuelita · Vehículo: Pathfinder BSN 653'),
    (v_pid, 'Liliana Potes', 'Asistente de Arte',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Michell · Vehículo: Pathfinder BSN 653'),
    (v_pid, 'Daniela Avila', 'Asistente de Arte',
       '3172616565', 'danielaavilagrajales@gmail.com', '1117015788', 'A+',
       'María Asceneth Grajales', '3164086886', 'SOS', 'Alérgica a camarones · Sin embutidos',
       'Hospedaje: Hospedaje propio en Tuluá · Vehículo: Pathfinder BSN 653'),
    (v_pid, 'Michell Florez', 'Asistente de Arte / Vestuario / Makeup',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Michell · Vehículo: Carro 1 Meza'),
    (v_pid, 'Natalia Peña', 'Makeup',
       null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Michell'),
    -- SONIDO
    (v_pid, 'Juan Sebastián Meza Cerón', 'Director de Sonido',
       '3176502394', 'jsmece123@gmail.com', '1193224185', 'O+',
       'Oscar Humberto Meza', '3057455118', 'Sanitas', 'Migraña y dolor en los ojos',
       'Hospedaje: Casa Manuelita · Vehículo: Carro 1 Meza'),
    (v_pid, 'Tomás Riaños', 'Asistente de Sonido / Boom Operator',
       '3053458638', 'tomasrianosm@gmail.com', '1109115524', 'O+',
       'Claudia Muñoz', '3225020770', 'SOS Comfandi', null,
       'Hospedaje: Casa Manuelita · Vehículo: Nissan March HWS 637'),
    -- POSTPRODUCCIÓN
    (v_pid, 'Martín Urrea', 'Montajista / Colorista',
       '3217216056', 'martinurreacgs@gmail.com', '1092454804', 'O+',
       'Jorge Urrea', '3108423795', null, null,
       'Fuera de set'),
    -- CAST (actores)
    (v_pid, 'Ana Rangel',  'Actriz (ANA)',  null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Mariana · Vehículo: Renault Kwid KVO 894'),
    (v_pid, 'Juan Martín', 'Actor (MARCO)', null, null, null, null, null, null, null, null,
       'Hospedaje: Casa Manuelita · Vehículo: Renault Kwid KVO 894'),
    (v_pid, 'Pedro',       'Actor',         null, null, null, null, null, null, null, null,
       'Vehículo: Renault Kwid KVO 894'),
    (v_pid, 'Bebé',        'Actor (BEBÉ)',  null, null, null, null, null, null, null, null,
       'Nombre real pendiente');

  -- 4) EQUIPMENT — wipe + reinsert desde 05. EQUIPOS
  delete from public.equipment where project_id = v_pid;

  insert into public.equipment (project_id, name, category, units, provider, status) values
    -- FOTOGRAFÍA
    (v_pid, 'Sony FX9',                                                     'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Wooden para Sony FX9',                                         'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Módulo de grabación',                                          'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Rokinon Lens Kit (24, 35, 50, 85) + Adaptador EF AF',          'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Óptica Rokinon Ojo de pez',                                    'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'EasyRing Mini Max',                                            'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Follow Focus Tilta Nucleus M',                                 'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Monitor Atomos Ninja',                                         'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Monitor Sony Trimaster',                                       'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Teradek Bolt Pro 500 (Tx/Rx)',                                 'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Adaptador CF Express Tipo B a USB-C',                          'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Tarjeta CF Express Tipo B (cant. por confirmar)',              'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Cargador Dracast V-Mount',                                     'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Batería BPU',                                                  'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Cable SDI',                                                    'foto',   3, 'UAO', 'solicitado'),
    (v_pid, 'Claqueta Digital',                                             'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Time Code Sync E',                                             'foto',   1, 'UAO', 'solicitado'),
    (v_pid, 'Sony Z90 (B-cam)',                                             'foto',   1, 'UAO', 'solicitado'),
    -- ILUMINACIÓN
    (v_pid, 'Sky Panel 2000W',                                              'ilum',   2, 'UAO', 'solicitado'),
    (v_pid, 'Kit Arri 650 Fresnel',                                         'ilum',   4, 'UAO', 'solicitado'),
    (v_pid, 'Kit Aputure 300C (linterna, octabox, banderas)',               'ilum',   2, 'UAO', 'solicitado'),
    (v_pid, 'D200 GripHead (galletas)',                                     'ilum',  10, 'UAO', 'solicitado'),
    (v_pid, 'Super Clamp (Maffer)',                                         'ilum',   8, 'UAO', 'solicitado'),
    (v_pid, 'Sky Hook 043 (pinza)',                                         'ilum',   2, 'UAO', 'solicitado'),
    (v_pid, 'C-500 Pelikan Gaffer',                                         'ilum',   1, 'UAO', 'solicitado'),
    (v_pid, 'Base de piso hembra F-301',                                    'ilum',   1, 'UAO', 'solicitado'),
    (v_pid, 'D-500 Avenger 50 cm',                                          'ilum',   6, 'UAO', 'solicitado'),
    (v_pid, 'D-500 Avenger 1 m',                                            'ilum',   6, 'UAO', 'solicitado'),
    (v_pid, 'Mombo Combo',                                                  'ilum',   2, 'UAO', 'solicitado'),
    (v_pid, 'Combo Baby',                                                   'ilum',   1, 'UAO', 'solicitado'),
    (v_pid, 'Trípode Avenger',                                              'ilum',   6, 'UAO', 'solicitado'),
    (v_pid, 'Matthews Trípode Hollywood C-Stand Century',                   'ilum',   3, 'UAO', 'solicitado'),
    (v_pid, 'C4465 MP Eye Coupler 28 mm',                                   'ilum',   2, 'UAO', 'solicitado'),
    (v_pid, 'E-200 Spigot 28 mm',                                           'ilum',   2, 'UAO', 'solicitado'),
    (v_pid, 'Bandera Francesa 70×50 floppy',                                'ilum',   3, 'UAO', 'solicitado'),
    (v_pid, 'Bandera Francesa 40×40 floppy',                                'ilum',   3, 'UAO', 'solicitado'),
    (v_pid, 'Bandera Francesa 1×50 floppy',                                 'ilum',   3, 'UAO', 'solicitado'),
    (v_pid, 'Pesas naranjas',                                               'ilum',   2, 'UAO', 'solicitado'),
    (v_pid, 'Gel de color',                                                 'ilum',   4, 'UAO', 'solicitado'),
    (v_pid, 'Gel CTB Full',                                                 'ilum',   4, 'UAO', 'solicitado'),
    (v_pid, 'Gel CTO Full',                                                 'ilum',   4, 'UAO', 'solicitado'),
    (v_pid, 'Telas blancas',                                                'ilum',   1, 'UAO', 'solicitado'),
    (v_pid, 'Telas negras',                                                 'ilum',   1, 'UAO', 'solicitado'),
    (v_pid, 'Kit Apple Box (full, 1/2, 1/4, pancake)',                      'ilum',   2, 'UAO', 'solicitado'),
    (v_pid, 'Bolsas de arena',                                              'ilum',  10, 'UAO', 'solicitado'),
    (v_pid, 'Barracuda (5 metros)',                                         'ilum',   1, 'UAO', 'solicitado'),
    (v_pid, 'Backstage kit (carro de transporte)',                          'ilum',   1, 'UAO', 'solicitado'),
    (v_pid, 'Extensiones eléctricas (2 de 20 m, 3 de 10 m, 4 de 5 m)',      'ilum',   8, 'UAO', 'solicitado'),
    -- SONIDO
    (v_pid, 'Grabadora MixPre-6',                                           'sonido', 1, 'UAO', 'solicitado'),
    (v_pid, 'Micrófono solapa inalámbrico Sennheiser',                      'sonido', 3, 'UAO', 'solicitado'),
    (v_pid, 'Audífonos Sennheiser',                                         'sonido', 1, 'UAO', 'solicitado'),
    (v_pid, 'Micrófono MKH 416',                                            'sonido', 2, 'UAO', 'solicitado'),
    (v_pid, 'Micrófono MKH-50',                                             'sonido', 1, 'UAO', 'solicitado'),
    (v_pid, 'Boom',                                                         'sonido', 1, 'UAO', 'solicitado'),
    (v_pid, 'Caña',                                                         'sonido', 1, 'UAO', 'solicitado'),
    (v_pid, 'Cable XLR',                                                    'sonido', 1, 'UAO', 'solicitado'),
    (v_pid, 'Zeppelin',                                                     'sonido', 1, 'UAO', 'solicitado'),
    (v_pid, 'Cargador Np-F',                                                'sonido', 2, 'UAO', 'solicitado'),
    (v_pid, 'Cortavientos',                                                 'sonido', 1, 'UAO', 'solicitado');

  -- 5) CALL SHEETS — 6 días de rodaje 6→11 jun
  delete from public.call_sheets where project_id = v_pid and date between '2026-06-06' and '2026-06-11';

  insert into public.call_sheets (project_id, date, location, status, notes) values
    (v_pid, '2026-06-06', 'Tuluá', 'borrador', 'Avanzada + Día 1 (montaje + grabación inicial)'),
    (v_pid, '2026-06-07', 'Tuluá', 'borrador', 'Día 2'),
    (v_pid, '2026-06-08', 'Tuluá', 'borrador', 'Día 3'),
    (v_pid, '2026-06-09', 'Tuluá', 'borrador', 'Día 4'),
    (v_pid, '2026-06-10', 'Tuluá', 'borrador', 'Día 5'),
    (v_pid, '2026-06-11', 'Tuluá', 'borrador', 'Día 6 (último día)');

  -- 6) PROJECT_DOCUMENTS — extiende enum + ancla guion y propuestas en /proyecto
  --    Primero re-arma el CHECK constraint para soportar las nuevas categorías
  alter table public.project_documents drop constraint if exists project_documents_category_check;
  alter table public.project_documents
    add constraint project_documents_category_check
    check (category in (
      'guion', 'guion_tecnico', 'cronograma', 'plan_rodaje', 'otro',
      'propuesta_direccion', 'propuesta_foto', 'propuesta_arte',
      'propuesta_sonido', 'propuesta_montaje'
    ));

  --    Limpia anclajes previos para evitar duplicados (otros docs del usuario se respetan)
  delete from public.project_documents
   where project_id = v_pid
     and drive_file_id in (
       '19-oh_q6PrzPooxiiNoY-twBUVRWVzB4I',
       '1vnU3PyvmD3Mt0y2SgCp4yCPYJMYJpL-8',
       '1b0fGqRxNel4-l8kuV1J-SDB51qZ57tan',
       '1f0aW1FYmtwUXWeK8hVBQAVa_nIQdmA0g',
       '1ko5t5YpiB98o_gqO-ltusFLLUGazDkWx',
       '1BS037gs0RS9ciXvJGg9xJN9aBuJkfItx'
     );

  --    Asegura que la tabla drive_files exista (la 03_fase3 no corrió en algunos entornos)
  create table if not exists public.drive_files (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    drive_file_id text not null,
    name text not null,
    mime_type text,
    web_view_link text,
    last_synced_at timestamptz not null default now(),
    content_text text,
    created_at timestamptz not null default now(),
    unique (project_id, drive_file_id)
  );
  create index if not exists idx_drive_files_project
    on public.drive_files(project_id, last_synced_at desc);
  alter table public.drive_files enable row level security;
  drop policy if exists "drive_files_owner_all" on public.drive_files;
  create policy "drive_files_owner_all" on public.drive_files
    for all
    using (project_id in (select id from public.projects where created_by = auth.uid()))
    with check (project_id in (select id from public.projects where created_by = auth.uid()));

  --    Inserta drive_files (ON CONFLICT para que sea idempotente)
  insert into public.drive_files (project_id, drive_file_id, name, mime_type, web_view_link) values
    (v_pid, '19-oh_q6PrzPooxiiNoY-twBUVRWVzB4I', 'Jeronimo (Final) — Guion V7',         'application/pdf',
       'https://drive.google.com/file/d/19-oh_q6PrzPooxiiNoY-twBUVRWVzB4I/view'),
    (v_pid, '1vnU3PyvmD3Mt0y2SgCp4yCPYJMYJpL-8', 'Guion Técnico — Jerónimo',            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'https://drive.google.com/file/d/1vnU3PyvmD3Mt0y2SgCp4yCPYJMYJpL-8/view'),
    (v_pid, '1b0fGqRxNel4-l8kuV1J-SDB51qZ57tan', 'Propuesta de Fotografía',             'application/pdf',
       'https://drive.google.com/file/d/1b0fGqRxNel4-l8kuV1J-SDB51qZ57tan/view'),
    (v_pid, '1f0aW1FYmtwUXWeK8hVBQAVa_nIQdmA0g', 'Propuesta de Arte',                   'application/pdf',
       'https://drive.google.com/file/d/1f0aW1FYmtwUXWeK8hVBQAVa_nIQdmA0g/view'),
    (v_pid, '1ko5t5YpiB98o_gqO-ltusFLLUGazDkWx', 'Propuesta de Dirección de Sonido',    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'https://drive.google.com/file/d/1ko5t5YpiB98o_gqO-ltusFLLUGazDkWx/view'),
    (v_pid, '1BS037gs0RS9ciXvJGg9xJN9aBuJkfItx', 'Cronograma General',                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'https://drive.google.com/file/d/1BS037gs0RS9ciXvJGg9xJN9aBuJkfItx/view')
  on conflict (project_id, drive_file_id) do update
    set name          = excluded.name,
        mime_type     = excluded.mime_type,
        web_view_link = excluded.web_view_link,
        last_synced_at = now();

  --    Inserta los anclajes en project_documents
  insert into public.project_documents (project_id, category, title, drive_file_id, pinned_in_proyecto, display_order) values
    (v_pid, 'guion',              'Jeronimo (Final) — Guion V7',      '19-oh_q6PrzPooxiiNoY-twBUVRWVzB4I', true, 1),
    (v_pid, 'guion_tecnico',      'Guion Técnico',                    '1vnU3PyvmD3Mt0y2SgCp4yCPYJMYJpL-8', true, 2),
    (v_pid, 'propuesta_foto',     'Propuesta de Fotografía',          '1b0fGqRxNel4-l8kuV1J-SDB51qZ57tan', true, 3),
    (v_pid, 'propuesta_arte',     'Propuesta de Arte',                '1f0aW1FYmtwUXWeK8hVBQAVa_nIQdmA0g', true, 4),
    (v_pid, 'propuesta_sonido',   'Propuesta de Dirección de Sonido', '1ko5t5YpiB98o_gqO-ltusFLLUGazDkWx', true, 5),
    (v_pid, 'cronograma',         'Cronograma General',               '1BS037gs0RS9ciXvJGg9xJN9aBuJkfItx', true, 6);

  raise notice 'Migración 12 completada para proyecto %', v_pid;
end $$;

commit;
