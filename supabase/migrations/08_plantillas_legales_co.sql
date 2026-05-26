-- Plantillas legales colombianas para auto-generación de contratos.
-- Las plantillas del "sistema" tienen project_id = NULL y son visibles para todos.
-- DISCLAIMER: Estas plantillas son apoyo y NO sustituyen asesoría jurídica formal.

-- 1. Permitir project_id NULL para "plantillas del sistema" globales
alter table public.contract_templates
  alter column project_id drop not null;

-- 2. Actualizar políticas RLS para permitir leer/usar plantillas globales
drop policy if exists "templates_select" on public.contract_templates;
create policy "templates_select" on public.contract_templates
  for select using (auth.uid() is not null);

-- Solo el creador del proyecto puede modificar templates de SU proyecto.
-- Las plantillas globales (project_id = null) son de solo lectura para usuarios normales.
drop policy if exists "templates_write" on public.contract_templates;
create policy "templates_write" on public.contract_templates
  for all using (
    project_id is not null
    and auth.uid() = (
      select created_by from public.projects where id = project_id
    )
  )
  with check (
    project_id is not null
    and auth.uid() = (
      select created_by from public.projects where id = project_id
    )
  );

-- 3. Marcador para distinguir plantillas legales del sistema (sin tocar nombre)
alter table public.contract_templates
  add column if not exists is_legal_co boolean not null default false;

-- 4. Insertar las 5 plantillas si no existen ya
insert into public.contract_templates (project_id, name, type, content, is_legal_co)
select null, 'Prestación de servicios artísticos (actor/actriz) — Ley CO',
  'talento',
$plantilla$
CONTRATO DE PRESTACIÓN DE SERVICIOS ARTÍSTICOS
(Ley 1493 de 2011 sobre espectáculos públicos de las artes escénicas — Código Civil Colombiano arts. 1495 y ss.)

Entre los suscritos, de una parte, el CORTOMETRAJE {{proyecto}}, en adelante "EL CONTRATANTE", representado por su productor general, y de la otra parte {{nombre}}, mayor de edad, identificado(a) con cédula de ciudadanía N° {{cedula}}, con domicilio en {{ubicacion}}, en adelante "EL/LA ARTISTA", se ha celebrado el presente contrato de prestación de servicios artísticos que se regirá por las siguientes cláusulas:

PRIMERA — OBJETO. EL/LA ARTISTA se obliga a prestar a EL CONTRATANTE sus servicios artísticos en el rol de "{{rol}}" para la producción audiovisual del cortometraje "{{proyecto}}", incluyendo participación en ensayos, rodaje, sesiones de doblaje y material promocional necesario.

SEGUNDA — DURACIÓN. El presente contrato regirá desde el {{fecha_inicio}} hasta el {{fecha_fin}}, pudiendo prorrogarse de común acuerdo escrito entre las partes.

TERCERA — VALOR Y FORMA DE PAGO. EL CONTRATANTE pagará a EL/LA ARTISTA la suma de {{tarifa_diaria}} por día efectivo de trabajo, valor que incluye todos los conceptos. El pago se realizará mediante transferencia bancaria dentro de los quince (15) días siguientes a la finalización del rodaje, previa entrega de cuenta de cobro y soportes.

CUARTA — DERECHOS PATRIMONIALES. En desarrollo de la Ley 23 de 1982, EL/LA ARTISTA cede a EL CONTRATANTE, de manera exclusiva, gratuita e ilimitada en el tiempo y territorio, los derechos patrimoniales sobre su interpretación incluida en la obra audiovisual, para todas las modalidades de explotación conocidas y por conocer.

QUINTA — USO DE IMAGEN. EL/LA ARTISTA autoriza expresamente el uso de su imagen, voz y nombre artístico en la obra audiovisual y en el material promocional asociado, sin que ello genere remuneración adicional.

SEXTA — OBLIGACIONES DEL/LA ARTISTA. (a) Asistir puntualmente a los llamados de producción. (b) Cumplir las indicaciones de dirección. (c) Mantener confidencialidad sobre el contenido del guion y de la producción.

SÉPTIMA — INDEPENDENCIA. El presente contrato es de naturaleza civil y no genera vínculo laboral. EL/LA ARTISTA es responsable de sus propias afiliaciones a salud, pensión y riesgos laborales.

OCTAVA — DATOS PERSONALES. EL CONTRATANTE tratará los datos personales de EL/LA ARTISTA conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.

NOVENA — RESOLUCIÓN DE CONFLICTOS. Las diferencias se resolverán inicialmente por arreglo directo. De no lograrse, serán sometidas a la jurisdicción ordinaria de los jueces de Colombia con sede en {{ubicacion}}.

Para constancia se firma en {{ubicacion}} el {{fecha_hoy}}.

_____________________________            _____________________________
EL CONTRATANTE                            EL/LA ARTISTA
Cortometraje {{proyecto}}                  {{nombre}}
                                          C.C. {{cedula}}
                                          Tel: {{telefono}}
                                          Email: {{email}}
$plantilla$,
  true
where not exists (
  select 1 from public.contract_templates
  where name = 'Prestación de servicios artísticos (actor/actriz) — Ley CO'
    and project_id is null
);

insert into public.contract_templates (project_id, name, type, content, is_legal_co)
select null, 'Prestación de servicios técnicos (crew) — Ley CO',
  'equipo',
$plantilla$
CONTRATO DE PRESTACIÓN DE SERVICIOS TÉCNICOS
(Código Civil Colombiano arts. 1495, 2063 y ss. — De naturaleza civil, no laboral)

Entre los suscritos, de una parte el CORTOMETRAJE {{proyecto}}, en adelante "EL CONTRATANTE", y de la otra parte {{nombre}}, mayor de edad, identificado(a) con cédula de ciudadanía N° {{cedula}}, en adelante "EL/LA CONTRATISTA", han convenido celebrar el presente contrato civil de prestación de servicios, regido por las siguientes cláusulas:

PRIMERA — OBJETO. EL/LA CONTRATISTA prestará a EL CONTRATANTE sus servicios profesionales y técnicos en el cargo de "{{rol}}" para la producción audiovisual del cortometraje "{{proyecto}}", aportando sus conocimientos, criterio y herramientas propias.

SEGUNDA — DURACIÓN. El contrato tendrá vigencia desde el {{fecha_inicio}} hasta el {{fecha_fin}}, cubriendo la totalidad de los días requeridos por la producción.

TERCERA — VALOR Y FORMA DE PAGO. EL CONTRATANTE pagará la suma de {{tarifa_diaria}} por día efectivo de trabajo. El pago se efectuará dentro de los quince (15) días calendario siguientes a la entrega de la cuenta de cobro y al cumplimiento del objeto contratado.

CUARTA — INDEPENDENCIA Y AUTONOMÍA. EL/LA CONTRATISTA actuará con plena autonomía técnica, administrativa y financiera. El presente contrato no genera relación laboral ni subordinación, conforme al artículo 23 del Código Sustantivo del Trabajo y al Decreto 2400 de 2002.

QUINTA — AFILIACIÓN A SEGURIDAD SOCIAL. EL/LA CONTRATISTA acreditará su afiliación al Sistema General de Seguridad Social (salud, pensión y riesgos laborales — ARL) y será responsable del pago de sus aportes durante la vigencia del contrato.

SEXTA — OBLIGACIONES DEL/LA CONTRATISTA. (a) Ejecutar el objeto del contrato con la diligencia y calidad esperadas. (b) Asistir a los llamados de producción en los horarios acordados. (c) Cuidar el equipo asignado y los recursos de la producción. (d) Mantener confidencialidad sobre la información de la producción.

SÉPTIMA — PROPIEDAD INTELECTUAL. Todo material, registro, fotografía, video o aporte creativo generado en ejecución del contrato pertenecerá a EL CONTRATANTE, en aplicación de la Ley 23 de 1982 sobre derechos de autor. EL/LA CONTRATISTA renuncia expresamente a cualquier pretensión sobre dichos materiales.

OCTAVA — TERMINACIÓN. El contrato podrá terminarse por (a) cumplimiento del objeto, (b) mutuo acuerdo escrito, (c) incumplimiento grave de cualquiera de las partes, o (d) fuerza mayor o caso fortuito.

NOVENA — DATOS PERSONALES. EL CONTRATANTE tratará los datos personales de EL/LA CONTRATISTA conforme a la Ley 1581 de 2012.

DÉCIMA — JURISDICCIÓN. Las controversias se someterán a los jueces civiles de la República de Colombia con sede en {{ubicacion}}.

Para constancia se firma en {{ubicacion}} el {{fecha_hoy}}.

_____________________________            _____________________________
EL CONTRATANTE                            EL/LA CONTRATISTA
Cortometraje {{proyecto}}                  {{nombre}}
                                          C.C. {{cedula}}
                                          Tel: {{telefono}}
                                          Email: {{email}}
                                          EPS: {{eps}}  RH: {{rh}}
$plantilla$,
  true
where not exists (
  select 1 from public.contract_templates
  where name = 'Prestación de servicios técnicos (crew) — Ley CO'
    and project_id is null
);

insert into public.contract_templates (project_id, name, type, content, is_legal_co)
select null, 'Cesión de derechos patrimoniales (Ley 23/1982) — Ley CO',
  'talento',
$plantilla$
CONTRATO DE CESIÓN DE DERECHOS PATRIMONIALES DE AUTOR
(Ley 23 de 1982 arts. 30, 76, 77, 182 y 183 — Decisión Andina 351 de 1993)

Entre los suscritos, de una parte el CORTOMETRAJE {{proyecto}}, en adelante "EL CESIONARIO", y de la otra parte {{nombre}}, mayor de edad, identificado(a) con C.C. N° {{cedula}}, en adelante "EL/LA CEDENTE", se celebra el presente contrato de cesión de derechos patrimoniales conforme a las siguientes cláusulas:

PRIMERA — OBJETO. EL/LA CEDENTE cede a EL CESIONARIO, de manera exclusiva, gratuita e ilimitada en el tiempo y en el territorio, la totalidad de los derechos patrimoniales sobre el aporte creativo que realizó en su calidad de "{{rol}}" dentro de la obra audiovisual "{{proyecto}}", incluyendo sin limitarse a: reproducción, comunicación pública, transformación, distribución, doblaje, subtitulación, traducción y puesta a disposición del público por cualquier medio o tecnología, presente o futura.

SEGUNDA — DERECHOS MORALES. EL/LA CEDENTE conserva en todo momento los derechos morales sobre su aporte, en los términos del artículo 30 de la Ley 23 de 1982. EL CESIONARIO se obliga a respetar y mencionar adecuadamente la autoría en los créditos finales de la obra.

TERCERA — REMUNERACIÓN. La presente cesión se realiza a título gratuito como contraprestación incluida en el contrato de prestación de servicios suscrito entre las partes. EL/LA CEDENTE renuncia a cualquier remuneración adicional por la explotación futura de la obra.

CUARTA — GARANTÍAS. EL/LA CEDENTE declara y garantiza que su aporte es original, de su autoría, y que no infringe derechos de terceros. Saldrá al saneamiento de cualquier reclamación que por este motivo se le formule a EL CESIONARIO.

QUINTA — EXPLOTACIÓN. EL CESIONARIO podrá explotar la obra audiovisual de cualquier manera, incluyendo distribución en festivales, plataformas digitales, televisión, salas comerciales y cualquier otro canal, sin necesidad de autorización adicional.

SEXTA — DATOS PERSONALES. El tratamiento de datos personales se sujeta a la Ley 1581 de 2012.

SÉPTIMA — JURISDICCIÓN. Las diferencias se resolverán ante los jueces civiles de Colombia con sede en {{ubicacion}}.

Para constancia se firma en {{ubicacion}} el {{fecha_hoy}}.

_____________________________            _____________________________
EL CESIONARIO                             EL/LA CEDENTE
Cortometraje {{proyecto}}                  {{nombre}}
                                          C.C. {{cedula}}
$plantilla$,
  true
where not exists (
  select 1 from public.contract_templates
  where name = 'Cesión de derechos patrimoniales (Ley 23/1982) — Ley CO'
    and project_id is null
);

insert into public.contract_templates (project_id, name, type, content, is_legal_co)
select null, 'Autorización de uso de imagen — Ley CO',
  'talento',
$plantilla$
AUTORIZACIÓN DE USO DE IMAGEN, VOZ Y NOMBRE
(Art. 87 Ley 23 de 1982 — Ley 1581 de 2012 de Habeas Data — Sentencia C-748 de 2011 C.C.)

Yo, {{nombre}}, mayor de edad, identificado(a) con cédula de ciudadanía N° {{cedula}}, actuando en nombre propio y de manera libre, expresa, voluntaria e informada, AUTORIZO al CORTOMETRAJE {{proyecto}}, en adelante "EL PRODUCTOR", para el uso de mi imagen, voz, fotografía y nombre, captados durante mi participación como "{{rol}}" en la producción audiovisual mencionada.

ALCANCE DE LA AUTORIZACIÓN.
1. La presente autorización se otorga de manera gratuita, exclusiva y por tiempo indefinido.
2. EL PRODUCTOR podrá usar mi imagen y voz en: (a) la obra audiovisual "{{proyecto}}" en su versión final y futuras versiones, (b) material promocional (carteles, trailers, redes sociales, prensa), (c) festivales y muestras nacionales e internacionales, (d) plataformas digitales y de streaming, (e) cualquier otro medio de comunicación presente o futuro.
3. La autorización aplica para territorio nacional e internacional, sin limitación geográfica.

TRATAMIENTO DE DATOS PERSONALES. EL PRODUCTOR informa que los datos personales serán tratados con la finalidad de identificar al/la participante en créditos y comunicaciones de la obra, conforme a la política de tratamiento de datos del proyecto y a la Ley 1581 de 2012. El titular podrá ejercer los derechos de conocer, actualizar, rectificar y suprimir sus datos en cualquier momento.

RENUNCIA A INDEMNIZACIONES. Declaro que entiendo el alcance de esta autorización y renuncio a reclamar indemnización, contraprestación o remuneración adicional por el uso de mi imagen y voz, distinta a la pactada en mi contrato de participación.

GARANTÍA DE AUTORÍA. Declaro que la autorización se otorga sobre mi propia imagen y que cuento con la capacidad legal para hacerlo.

Para constancia se firma en {{ubicacion}} el {{fecha_hoy}}.

_____________________________
{{nombre}}
C.C. {{cedula}}
Tel: {{telefono}}
Email: {{email}}
$plantilla$,
  true
where not exists (
  select 1 from public.contract_templates
  where name = 'Autorización de uso de imagen — Ley CO'
    and project_id is null
);

insert into public.contract_templates (project_id, name, type, content, is_legal_co)
select null, 'Autorización de uso de locación — Ley CO',
  'locacion',
$plantilla$
AUTORIZACIÓN DE USO DE LOCACIÓN PARA RODAJE AUDIOVISUAL
(Código Civil Colombiano — Comodato precario sobre inmueble — Contrato atípico)

Entre los suscritos, de una parte el CORTOMETRAJE {{proyecto}}, en adelante "EL PRODUCTOR", y de la otra parte {{nombre}}, identificado(a) con C.C. N° {{cedula}}, en adelante "EL PROPIETARIO" o "POSEEDOR" del inmueble objeto de la presente autorización, se acuerda lo siguiente:

PRIMERA — OBJETO. EL PROPIETARIO autoriza a EL PRODUCTOR el uso del inmueble ubicado en {{ubicacion}}, exclusivamente para la realización de las actividades de rodaje del cortometraje "{{proyecto}}" en las fechas comprendidas entre el {{fecha_inicio}} y el {{fecha_fin}}.

SEGUNDA — ALCANCE. La autorización incluye: (a) ingreso del equipo de producción, talento y equipos técnicos; (b) instalación temporal de luces, escenografía y demás elementos necesarios; (c) captura de imágenes y sonido en interiores y/o exteriores del inmueble; (d) uso del nombre o referencia del lugar en los créditos de la obra, si así se acuerda.

TERCERA — CONTRAPRESTACIÓN. La presente autorización se otorga (marcar lo aplicable):
 ( ) De manera gratuita como apoyo al cortometraje.
 ( ) A cambio de la suma de {{tarifa_diaria}} por día de uso.

CUARTA — OBLIGACIONES DE EL PRODUCTOR. (a) Devolver el inmueble en las mismas condiciones en que lo recibió. (b) Reparar cualquier daño causado durante el rodaje. (c) Contar con seguro de responsabilidad civil que cubra eventuales daños. (d) Respetar los horarios y normas del lugar. (e) Retirar todos los elementos al finalizar el uso.

QUINTA — CESIÓN DE DERECHOS DE IMAGEN DEL INMUEBLE. EL PROPIETARIO cede a EL PRODUCTOR los derechos de uso de la imagen del inmueble para los fines de la obra audiovisual y su promoción, de manera gratuita, exclusiva y por tiempo indefinido.

SEXTA — RESPONSABILIDAD. EL PRODUCTOR responderá por los actos de sus empleados, contratistas y colaboradores que se encuentren en el inmueble en ejecución del rodaje.

SÉPTIMA — DATOS PERSONALES. Conforme a la Ley 1581 de 2012.

OCTAVA — JURISDICCIÓN. Diferencias ante los jueces civiles de Colombia con sede en {{ubicacion}}.

Para constancia se firma en {{ubicacion}} el {{fecha_hoy}}.

_____________________________            _____________________________
EL PRODUCTOR                              EL PROPIETARIO
Cortometraje {{proyecto}}                  {{nombre}}
                                          C.C. {{cedula}}
                                          Tel: {{telefono}}
$plantilla$,
  true
where not exists (
  select 1 from public.contract_templates
  where name = 'Autorización de uso de locación — Ley CO'
    and project_id is null
);
