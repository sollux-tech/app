export interface Appointment {
  id: string;
  kpi_smart_liberated_id: string;
  value: number | null;
  note: string | null;
  appointment_date: string; // ISO date string
  created_at: string;
}

// O AppointmentFormData já está definido no componente KpiApontamentosForm.tsx
// Se for necessário um tipo separado para o formulário, pode ser criado aqui.