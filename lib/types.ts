// Tipos de la base de datos. Generables con `npx supabase gen types typescript`.
// Por ahora declarados manualmente — actualizar tras correr migraciones reales.

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
};

export type CrewMember = {
  id: string;
  project_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  blood_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  eps: string | null;
  dietary_restrictions: string | null;
  notes: string | null;
  daily_rate: number | null;
  is_active: boolean;
  is_confirmed: boolean;
};

export type Contact = {
  id: string;
  project_id: string;
  name: string;
  company: string | null;
  type: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_favorite: boolean;
  tags: string[] | null;
};

export type Expense = {
  id: string;
  project_id: string;
  concept: string;
  category: string;
  amount: number;
  date: string | null;
  status: string;
  receipt_url: string | null;
  created_at: string;
};

export type CallSheet = {
  id: string;
  project_id: string;
  date: string;
  location: string | null;
  call_time: string | null;
  crew_ids: string[];
  notes: string | null;
  safety_notes: string | null;
  weather_backup: string | null;
  weather_plan_b: string | null;
  status: string;
  created_at: string;
};

export type Equipment = {
  id: string;
  project_id: string;
  name: string;
  category: string;
  units: number;
  provider: string | null;
  status: string;
  notes: string | null;
  brand: string | null;
  model: string | null;
};

export type Memory = {
  id: string;
  project_id: string;
  type: string;
  content: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  project_id: string;
  user_message: string;
  ai_response: string | null;
  context_used: unknown | null;
  sources: unknown | null;
  role: string | null;
  created_at: string;
};

export type CashFlow = {
  id: string;
  project_id: string;
  date: string;
  concept: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  is_projected: boolean;
  notes: string | null;
  created_at: string;
};

export type DriveFile = {
  id: string;
  project_id: string;
  drive_file_id: string;
  name: string;
  mime_type: string | null;
  web_view_link: string | null;
  last_synced_at: string;
  content_text: string | null;
  created_at: string;
};

// FASE 4 — Control de producción
export type DailyReport = {
  id: string;
  project_id: string;
  date: string;
  crew_present: string[];
  scenes_completed: string | null;
  incidents: string | null;
  expenses_total: number;
  notes: string | null;
  created_at: string;
};

export type ProducerLogUpdate = {
  id: string;
  log_id: string;
  note: string;
  created_at: string;
};

export type ProducerLog = {
  id: string;
  project_id: string;
  date: string;
  category: "general" | "urgente" | "proveedor" | "elenco" | "UAO";
  content: string;
  created_at: string;
  completed_at: string | null;
  last_notified_at: string | null;
  producer_log_updates?: ProducerLogUpdate[];
};

export type Contract = {
  id: string;
  project_id: string;
  name: string;
  type: "locacion" | "talento" | "equipo" | "seguro" | "otro";
  sign_date: string | null;
  expiry_date: string | null;
  status: "vigente" | "por_firmar" | "vencido";
  file_url: string | null;
  notes: string | null;
  created_at: string;
  // Añadido en migration 13: distinguir origen y archivar firmados
  origin?: "auto" | "template_docx" | "uploaded";
  storage_path?: string | null;
  mime_type?: string | null;
  signed_at?: string | null;
  missing_fields?: string[];
  crew_member_id?: string | null;
};

export type ContractTemplate = {
  id: string;
  // null = plantilla global del sistema (p.ej. plantillas legales Colombia)
  project_id: string | null;
  name: string;
  type: "locacion" | "talento" | "equipo" | "seguro" | "otro";
  content: string;
  is_legal_co?: boolean;
  created_at: string;
  // Añadido en migration 13: plantillas DOCX subidas
  source_type?: "text" | "docx";
  storage_path?: string | null;
};

export type CrewPayment = {
  id: string;
  project_id: string;
  crew_member_id: string;
  amount: number;
  agreed_date: string | null;
  paid_date: string | null;
  status: "pendiente" | "pagado" | "atrasado";
  method: string | null;
  notes: string | null;
  created_at: string;
};

// FASE 5 — Logística
export type Transport = {
  id: string;
  project_id: string;
  vehicle_name: string;
  driver: string | null;
  capacity: number | null;
  date: string | null;
  departure_time: string | null;
  route: string | null;
  crew_assigned: string[];
  notes: string | null;
  created_at: string;
};

export type Catering = {
  id: string;
  project_id: string;
  date: string;
  meal_type: "desayuno" | "almuerzo" | "cena";
  menu: string | null;
  provider: string | null;
  portions_count: number | null;
  notes: string | null;
  created_at: string;
};

export type Attendance = {
  id: string;
  project_id: string;
  crew_member_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: "presente" | "ausente" | "retardo";
  notes: string | null;
  created_at: string;
};

export type Incident = {
  id: string;
  project_id: string;
  date: string;
  type: "menor" | "medio" | "grave";
  description: string;
  affected_person: string | null;
  action_taken: string | null;
  reporter: string | null;
  created_at: string;
};

export type ProjectDocument = {
  id: string;
  project_id: string;
  category:
    | "guion"
    | "guion_tecnico"
    | "cronograma"
    | "plan_rodaje"
    | "propuesta_direccion"
    | "propuesta_foto"
    | "propuesta_arte"
    | "propuesta_sonido"
    | "propuesta_montaje"
    | "otro";
  title: string;
  drive_file_id: string;
  pinned_in_proyecto: boolean;
  display_order: number;
  created_at: string;
};

export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

// Forma exacta esperada por @supabase/ssr para tipar queries
type Optional<T> = { [K in keyof T]?: T[K] };

type Tabla<R> = { Row: R; Insert: Optional<R>; Update: Optional<R>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      projects: Tabla<Project>;
      crew_members: Tabla<CrewMember>;
      contacts: Tabla<Contact>;
      expenses: Tabla<Expense>;
      call_sheets: Tabla<CallSheet>;
      equipment: Tabla<Equipment>;
      memories: Tabla<Memory>;
      conversations: Tabla<Conversation>;
      cash_flow: Tabla<CashFlow>;
      drive_files: Tabla<DriveFile>;
      daily_reports: Tabla<DailyReport>;
      producer_logs: Tabla<ProducerLog>;
      contracts: Tabla<Contract>;
      contract_templates: Tabla<ContractTemplate>;
      crew_payments: Tabla<CrewPayment>;
      transport: Tabla<Transport>;
      catering: Tabla<Catering>;
      attendance: Tabla<Attendance>;
      incidents: Tabla<Incident>;
      project_documents: Tabla<ProjectDocument>;
      producer_log_updates: Tabla<ProducerLogUpdate>;
      push_subscriptions: Tabla<PushSubscription>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
