/* ===========================================================================
   Seed: organizaciones oficiales para donar (Enlaces de utilidad → Donativos)
   Fuente: AJE Venezuela — https://ajevenezuela.org/ayuda-venezuela/donaciones
   14 organizaciones desde centrosdeacopiovzla.com (#donaciones).
   =========================================================================== */

DO $$
DECLARE
  cat_id uuid;
BEGIN
  SELECT id INTO cat_id FROM help_categories WHERE name = 'Donativos' LIMIT 1;
  IF cat_id IS NULL THEN
    INSERT INTO help_categories (name) VALUES ('Donativos')
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO cat_id;
    IF cat_id IS NULL THEN
      SELECT id INTO cat_id FROM help_categories WHERE name = 'Donativos' LIMIT 1;
    END IF;
  END IF;

  INSERT INTO help_links (category_id, label, description, href, sort_order) VALUES
      (cat_id, 'Hazlo Hoy · Venezuela Ayuda', 'Plataforma comunitaria sin fines de lucro que coordina la respuesta a la emergencia: reportes de desaparecidos, edificios dañados, voluntarios y canales de donación verificados. Trabaja con iniciativas no afiliadas como Yummy (logística), Digitel (comunicaciones), Ingeniería Solidaria/RedesAyuda (evaluación estructural), SismoAyuda VE y la Cámara Venezolana de la Construcción.', 'https://terremoto.hazlohoy.org/', 1),
      (cat_id, 'Alimenta La Solidaridad, Inc.', 'Organización sin fines de lucro 501(c)3 dedicada a alimentar a niños venezolanos. Las donaciones son deducibles de impuestos en EE.UU.', 'https://donate.alimentalasolidaridad.org/campaign/815565/donate', 2),
      (cat_id, 'Dividendo Voluntario para la Comunidad (DVC)', 'Asociación civil venezolana canalizando aportes para la respuesta humanitaria. Donaciones en bolívares (Pago Móvil y transferencia) y en divisas vía Mercantil Banco Panamá. Métodos: Pago Móvil (Banco Mercantil): RIF J-000579105, Teléfono 0412-332-1367 · Transferencia (Banco Mercantil): Titular Dividendo Voluntario para la Comunidad, A.C., Cuenta Corriente 0105-0026-5410-2642-4518, RIF J-000579105 · Transferencia (Banco Nacional de Crédito (BNC)): Titular Dividendo Voluntario para la Comunidad, A.C., Cuenta Corriente 0191-0154-1321-0019-6480, RIF J-000579105 · Cuenta en divisas (Mercantil Banco, S.A. (Panamá)): Titular Dividendo Voluntario para la Comunidad, A.C., SWIFT MPANPAPA, N° de cuenta 300016658, Dirección del banco Torre de las Américas, Punta Pacífica, Ciudad de Panamá, Panamá.', 'https://ajevenezuela.org/ayuda-venezuela/donaciones', 3),
      (cat_id, 'GoFundMe — Emergency Relief for Venezuela Earthquake', 'Campaña internacional de recaudación para víctimas del terremoto en Venezuela.', 'https://www.gofundme.com/f/emergency-relief-for-venezuela-earthquake-victims', 4),
      (cat_id, 'UNICEF España — Emergencia Terremoto Venezuela', 'Donaciones para la respuesta de UNICEF ante el terremoto en Venezuela.', 'https://www.unicef.es/colabora/dona/emergencia-terremoto-en-venezuela', 5),
      (cat_id, 'Cruz Roja Española', 'Cruz Roja Española activó una campaña específica para el terremoto en Venezuela. Puedes donar con tarjeta, Bizum, PayPal o transferencia bancaria desde España.', 'https://www.cruzroja.es/colabora/haz-un-donativo', 6),
      (cat_id, 'Cruz Roja Colombiana', 'Cruz Roja Colombiana habilitó su portal de donaciones nacional y el programa "Accionistas Humanitarios" para destinar recursos a los afectados por los sismos en Venezuela. Métodos: Donación online (Portal oficial): Sitio principal dona.cruzrojacolombiana.org, Programa Accionistas Humanitarios accionistashumanitarios.org · Transferencia bancaria directa (Davivienda (Colombia)): Titular Sociedad Nacional de la Cruz Roja Colombiana, Cuenta Corriente 455-069996904.', 'https://dona.cruzrojacolombiana.org/', 7),
      (cat_id, 'Cruz Roja Venezolana', 'La Sociedad Venezolana de la Cruz Roja se encuentra brindando asistencia humanitaria a las personas afectadas por el terremoto. Puedes realizar tu donación a través de sus cuentas oficiales en bolívares o dólares. Métodos: Transferencia bolívares (VES) (Banco Banesco): Titular Sociedad Venezolana de la Cruz Roja, RIF J-00235031-8, Cuenta 0134-0224-82-2243028658 · Transferencia dólares (USD) en Venezuela (Banco Banesco): Titular Sociedad Venezolana de la Cruz Roja, RIF J-00235031-8, Cuenta 0134-1736-99-0001006051.', 'https://www.cruzrojavenezolana.org/', 8),
      (cat_id, 'Save the Children', 'Organización internacional que protege a la niñez en emergencias humanitarias.', 'https://www.savethechildren.net/', 9),
      (cat_id, 'International Medical Corps', 'Respuesta médica de emergencia ante los terremotos en Venezuela.', 'https://internationalmedicalcorps.org/emergency-response/venezuela-earthquakes/?form=Ven2606', 10),
      (cat_id, 'Fundana', 'Fundación venezolana dedicada a la protección de niños en situación de vulnerabilidad.', 'https://www.fundana.org/donaci%C3%B3n-econ%C3%B3mica', 11),
      (cat_id, 'I Love Venezuela Foundation', 'Organización dedicada a apoyar causas humanitarias y sociales en Venezuela.', 'https://ilovevenezuelafoundation.org/', 12),
      (cat_id, 'World Central Kitchen (WCK)', 'ONG internacional que provee comidas calientes a comunidades afectadas por desastres. Se está movilizando para servir comidas a familias y rescatistas tras los terremotos de magnitud 7.2 y 7.5 en Venezuela. Acepta donaciones por tarjeta, PayPal, criptomonedas y donaciones recurrentes.', 'https://donate.wck.org/campaign/815521/donate?src=site-blog-rlf183', 13),
      (cat_id, 'VACC Foundation — Dona Venezuela Se VACC', 'Fundación internacional canalizando donaciones para la emergencia en Venezuela.', 'https://vaccfoundation.org/donate-now/', 14)
  ON CONFLICT DO NOTHING;
END $$;
