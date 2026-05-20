import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  ChevronRight, ClipboardList, FileText, Loader2, Search,
} from 'lucide-react';

type Patient = { id: number; first_name: string; last_name: string };

type TreatmentItem = {
  id?: number;
  treatment_id: number;
  treatment_name: string;
  quantity: number;
  price: number;
  notes: string;
};

type MedicalRecord = {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  doctor_profession: string;
  doctor_specialty: string;
  doctor_rethus_number: string;
  doctor_rethus_status: string;
  doctor_professional_seal: string;
  appointment_id: number | null;
  chief_complaint: string;
  current_illness: string;
  personal_history: string;
  surgical_history: string;
  allergic_history: string;
  pharmacological_history: string;
  family_history: string;
  physical_exam: string;
  diagnosis: string;
  treatment_plan: string;
  evolution: string;
  informed_consent: string;
  consent_signed: boolean;
  notes: string;
  photo_before_url: string;
  photo_after_url: string;
  created_at: string;
  treatment_items: TreatmentItem[];
};


function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

export function MedicalRecordsAdmin() {
  const navigate = useNavigate();
  const [records, setRecords]     = useState<MedicalRecord[]>([]);
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [patientFilter, setPatientFilter] = useState<number | ''>('');

  const loadMeta = async () => {
    const pRes = await apiFetch('/api/patients/');
    const pJson = await pRes.json();
    setPatients(pJson.patients || []);
  };

  const load = useCallback(async (q = '', pid: number | '' = '') => {
    setLoading(true);
    try {
      let url = '/api/medical-records/';
      const params: string[] = [];
      if (q)   params.push(`search=${encodeURIComponent(q)}`);
      if (pid) params.push(`patient_id=${pid}`);
      if (params.length) url += '?' + params.join('&');
      const res = await apiFetch(url);
      const json = await res.json();
      setRecords(json.records || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeta(); load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search, patientFilter); };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Historial Clínico</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Registros médicos por paciente</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por paciente o diagnóstico…"
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 w-64" />
          </div>
          <button type="submit" className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Buscar</button>
        </form>
        <select value={patientFilter} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : ''; setPatientFilter(v); load(search, v); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Todos los pacientes</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
        </select>
        {(search || patientFilter !== '') && (
          <button onClick={() => { setSearch(''); setPatientFilter(''); load(); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Limpiar</button>
        )}
      </div>

      {/* Records list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No hay registros médicos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((r) => {
              const total = r.treatment_items.reduce((s, it) => s + it.price * it.quantity, 0);
              const hasPhotos = !!(r.photo_before_url || r.photo_after_url);
              return (
                <div key={r.id} className="flex items-center gap-2 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <button onClick={() => navigate(`/admin/medical-records/${r.id}`)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                      <FileText className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{r.patient_name}</p>
                      <p className="text-xs text-gray-400 truncate">{r.chief_complaint || r.diagnosis || 'Sin motivo de consulta'}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-sm text-gray-500">{r.doctor_name}</span>
                      <span className="text-xs text-gray-400">{fmt(r.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasPhotos && <span className="text-xs text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">Fotos</span>}
                      {total > 0 && <span className="text-sm font-semibold text-gray-900">{fmtCurrency(total)}</span>}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
