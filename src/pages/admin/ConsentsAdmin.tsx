import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  CheckCircle2, ChevronRight, ClipboardCheck, Loader2,
  Search,
} from 'lucide-react';


type Consent = {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number | null;
  doctor_name: string;
  doctor_profession: string;
  doctor_specialty: string;
  doctor_rethus_number: string;
  doctor_professional_seal: string;
  medical_record_id: number | null;
  procedure_description: string;
  risks: string;
  notes: string;
  signed_by_name: string;
  signed_at: string | null;
  signature_image: string;
  created_at: string;
};


function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Main Component ───────────────────────────────────────── */
export function ConsentsAdmin() {
  const navigate = useNavigate();
  const [consents, setConsents]     = useState<Consent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterSigned, setFilterSigned] = useState<'all' | 'signed' | 'pending'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cRes = await apiFetch('/api/consents/').then((r) => r.json());
      setConsents(cRes.consents || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = consents.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.patient_name.toLowerCase().includes(q) || c.procedure_description.toLowerCase().includes(q);
    const matchSigned =
      filterSigned === 'all' ||
      (filterSigned === 'signed' && !!c.signed_at) ||
      (filterSigned === 'pending' && !c.signed_at);
    return matchSearch && matchSigned;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-900 rounded-xl"><ClipboardCheck className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Consentimientos</h1>
            <p className="text-sm text-gray-500">{consents.length} registrado{consents.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por paciente o procedimiento…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1" role="group" aria-label="Filtrar por estado">
          {(['all', 'signed', 'pending'] as const).map((v) => (
            <button 
              key={v} 
              onClick={() => setFilterSigned(v)}
              aria-pressed={filterSigned === v}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterSigned === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'all' ? 'Todos' : v === 'signed' ? 'Firmados' : 'Pendientes'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div 
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        role="region"
        aria-label={`Lista de consentimientos - ${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-40" role="status" aria-label="Cargando consentimientos">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400" role="status">
            <ClipboardCheck className="w-8 h-8 mb-2 opacity-40" aria-hidden="true" />
            <p className="text-sm">No hay consentimientos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50" role="list">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group" role="listitem">
                <button 
                  onClick={() => navigate(`/admin/consents/${c.id}`)} 
                  className="flex-1 flex items-center gap-4 text-left"
                  aria-label={`Consentimiento de ${c.patient_name}, estado: ${c.signed_at ? 'Firmado' : 'Pendiente'}, creado el ${fmt(c.created_at)}`}
                >
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{c.patient_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{c.procedure_description || 'Sin procedimiento registrado'}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    {c.signed_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700" aria-label="Estado: Firmado">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Firmado
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700" aria-label="Estado: Pendiente">Pendiente</span>
                    )}
                    <span className="text-xs text-gray-400">{fmt(c.created_at)}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
