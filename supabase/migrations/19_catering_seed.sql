-- Insert catering data from Excel

DO $$
DECLARE
    v_project_id uuid;
BEGIN
    SELECT id INTO v_project_id FROM public.projects LIMIT 1;
    IF v_project_id IS NOT NULL THEN
       -- First delete existing to avoid duplicates if re-run
       DELETE FROM public.catering WHERE project_id = v_project_id;

       INSERT INTO public.catering (project_id, date, meal_type, menu, provider, portions_count) VALUES
       (v_project_id, '2026-06-07', 'desayuno', 'Huevos rancheros con pancito y chocolate', 'SANDRA', 23),
       (v_project_id, '2026-06-07', 'refrigerio_1', 'Pastel de Pollo o carne y botellita de jugo', NULL, 23),
       (v_project_id, '2026-06-07', 'almuerzo', 'Chuleta, arroz, papa, ensalada y sobremesa', 'CRHISTINA', 23),
       (v_project_id, '2026-06-07', 'refrigerio_2', 'Salpicón y lulada', 'SANDRA', 23),
       (v_project_id, '2026-06-07', 'cena', 'Arroz con chorizo y papa con pico de gallo', NULL, 23),

       (v_project_id, '2026-06-08', 'desayuno', 'Arepa con queso y huevos revueltos', 'SANDRA', 23),
       (v_project_id, '2026-06-08', 'refrigerio_1', 'Pastel de Pollo o Carne y botellita de jugo', NULL, 23),
       (v_project_id, '2026-06-08', 'almuerzo', 'Arroz con pollo y sobremesa', 'CRHISTINA', 23),
       (v_project_id, '2026-06-08', 'refrigerio_2', 'Fruta Picada', 'SANDRA', 23),
       (v_project_id, '2026-06-08', 'cena', 'Arroz con huevos con maicitos y maduro', NULL, 23),

       (v_project_id, '2026-06-09', 'desayuno', 'Huevos rancheros con pan y chocolate', 'SANDRA', 23),
       (v_project_id, '2026-06-09', 'refrigerio_1', 'Café o Jugo, pastel de carne', 'SANDRA', 23),
       (v_project_id, '2026-06-09', 'almuerzo', 'Pasta a la boloñesa con arroz y pan', 'CRHISTINA', 23),
       (v_project_id, '2026-06-09', 'refrigerio_2', 'Colitas cubanas', NULL, 23),
       (v_project_id, '2026-06-09', 'cena', 'Chorizo, arroz y maduro', NULL, 23),

       (v_project_id, '2026-06-10', 'desayuno', 'Sándwich con huevo y chocolate', 'SANDRA', 26),
       (v_project_id, '2026-06-10', 'refrigerio_1', 'Pastelito de pollo con juguito', 'SANDRA', 26),
       (v_project_id, '2026-06-10', 'almuerzo', 'Almuerzo en Galería', 'CRHISTINA', 26),
       (v_project_id, '2026-06-10', 'refrigerio_2', 'Colitas cubanas', NULL, 26),
       (v_project_id, '2026-06-10', 'cena', 'Arroz con pechuga con papa', NULL, 26),

       (v_project_id, '2026-06-11', 'desayuno', 'Huevos rancheros con pan y chocolate', 'SANDRA', 23),
       (v_project_id, '2026-06-11', 'almuerzo', 'Sobrebarriga en salsa, arroz y ensalada', 'CRHISTINA', 23),
       (v_project_id, '2026-06-11', 'cena', 'Chorizo, arroz y maduro', 'SANDRA', 23);
    END IF;
END $$;
