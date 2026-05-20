import { useEffect, useRef } from 'react';
import { ClipboardList, Plus, X } from 'lucide-react';
import { fmtCurrency } from '../lib/formatters';

/* ── Types ─────────────────────────────────────────────────────────── */

export type MRForm = Record<string, string>;

export type TreatmentItem = {
  id?: number;
  treatment_id: number;
  treatment_name: string;
  quantity: number;
  price: number;
  notes: string;
};

export type PhotoState = {
  url: string;       // existing URL from backend
  file: File | null; // new file to upload
  preview: string;   // local preview URL
  uploading: boolean;
};

export type MRFieldDef = {
  key: string;
  label: string;
  rows?: number;
  required?: boolean;
};

/* ── MR_FIELDS definition (copied from AppointmentComplete) ───────────── */

export const MR_FIELDS: MRFieldDef[] = [
  { key: 'chief_complaint',         label: 'Motivo de consulta' },
  { key: 'current_illness',         label: 'Enfermedad actual',            rows: 2 },
  { key: 'personal_history',        label: 'Antecedentes personales',      rows: 2 },
  { key: 'surgical_history',        label: 'Antecedentes quirúrgicos' },
  { key: 'allergic_history',        label: 'Antecedentes alérgicos' },
  { key: 'pharmacological_history', label: 'Antecedentes farmacológicos' },
  { key: 'family_history',          label: 'Antecedentes familiares' },
  { key: 'physical_exam',           label: 'Examen físico',               rows: 3 },
  { key: 'diagnosis',               label: 'Diagnóstico',                 rows: 2, required: true },
  { key: 'treatment_plan',          label: 'Plan de procedimiento',       rows: 2 },
  { key: 'evolution',               label: 'Evolución',                   rows: 2 },
  { key: 'notes',                   label: 'Notas adicionales' },
];

/* ── Props ───────────────────────────────────────────────────────────── */

export interface MedicalRecordFormProps {
  // Datos
  values: MRForm;
  treatmentItems?: TreatmentItem[];

  // Fotos (opcionales, usadas en Atender)
  photoBefore?: PhotoState;
  photoAfter?: PhotoState;
  onPhotoBeforeChange?: (state: PhotoState) => void;
  onPhotoAfterChange?: (state: PhotoState) => void;

  // Configuración de modo
  mode: 'readonly' | 'editable';

  // Callbacks (solo modo editable)
  onChange?: (field: string, value: string) => void;
  onTreatmentItemsChange?: (items: TreatmentItem[]) => void;
}

/* ── Component ───────────────────────────────────────────────────────── */

export function MedicalRecordForm({
  values,
  treatmentItems = [],
  photoBefore,
  photoAfter,
  onPhotoBeforeChange,
  onPhotoAfterChange,
  mode,
  onChange,
  onTreatmentItemsChange,
}: MedicalRecordFormProps) {
  const isReadOnly = mode === 'readonly';
  
  // Ref para trackear URLs de objeto que necesitan ser revocadas
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup de URLs de objeto al desmontar
  useEffect(() => {
    return () => {
      // Revocar todas las URLs pendientes al desmontar
      objectUrlsRef.current.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      objectUrlsRef.current.clear();
    };
  }, []);

  // Función helper para crear URL y trackearla
  const createObjectUrl = (file: File): string => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  };

  // Función helper para revocar URL y remover del tracking
  const revokeObjectUrl = (url: string | undefined) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  const handleFieldChange = (key: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    onChange?.(key, e.target.value);
  };

  const handlePhotoFileChange = (
    file: File | null,
    currentState: PhotoState | undefined,
    onChange: ((state: PhotoState) => void) | undefined
  ) => {
    if (!file || !onChange) return;

    // Revocar preview anterior si existe
    if (currentState?.preview) {
      revokeObjectUrl(currentState.preview);
    }

    const preview = createObjectUrl(file);
    onChange({
      url: currentState?.url || '',
      file,
      preview,
      uploading: false,
    });
  };

  const handleRemovePhoto = (
    currentState: PhotoState | undefined,
    onChange: ((state: PhotoState) => void) | undefined
  ) => {
    if (!onChange) return;
    
    // Revocar la URL de preview al eliminar
    if (currentState?.preview) {
      revokeObjectUrl(currentState.preview);
    }
    onChange({
      url: '',
      file: null,
      preview: '',
      uploading: false,
    });
  };

  const addTreatmentItem = () => {
    if (isReadOnly || !onTreatmentItemsChange) return;
    onTreatmentItemsChange([
      ...treatmentItems,
      {
        treatment_id: 0,
        treatment_name: '',
        quantity: 1,
        price: 0,
        notes: '',
      },
    ]);
  };

  const updateTreatmentItem = (index: number, updates: Partial<TreatmentItem>) => {
    if (isReadOnly || !onTreatmentItemsChange) return;
    const updated = treatmentItems.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    onTreatmentItemsChange(updated);
  };

  const removeTreatmentItem = (index: number) => {
    if (isReadOnly || !onTreatmentItemsChange) return;
    onTreatmentItemsChange(treatmentItems.filter((_, i) => i !== index));
  };

  const totalAmount = treatmentItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">Historia Clínica</h2>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* MR Fields */}
        <div className="space-y-4">
          {MR_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              {isReadOnly ? (
                // Readonly mode: show as disabled textarea or div
                <div
                  className={`w-full px-3 py-2 bg-gray-50 text-gray-600 border border-gray-100 rounded-lg text-sm whitespace-pre-wrap min-h-[2.5rem] ${
                    !values[f.key] ? 'text-gray-400 italic' : ''
                  }`}
                >
                  {values[f.key] || '—'}
                </div>
              ) : (
                // Editable mode: textarea with onChange
                <textarea
                  value={values[f.key] || ''}
                  onChange={handleFieldChange(f.key)}
                  rows={f.rows ?? 1}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none transition-colors
                    ${f.required && !values[f.key]?.trim() ? 'border-red-300' : 'border-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Treatment Items Section */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Procedimientos realizados</label>
            {!isReadOnly && onTreatmentItemsChange && (
              <button
                type="button"
                onClick={addTreatmentItem}
                className="inline-flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            )}
          </div>

          {treatmentItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Sin procedimientos registrados</p>
          ) : (
            <div className="space-y-2">
              {isReadOnly ? (
                // Readonly: show as list
                <div className="space-y-2">
                  {treatmentItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{item.treatment_name || 'Procedimiento'}</span>
                        <span className="text-gray-500 text-sm ml-2">× {item.quantity}</span>
                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                        )}
                      </div>
                      <span className="font-medium text-gray-800">
                        {fmtCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="text-sm font-semibold text-gray-900 text-right pt-1">
                    Total: {fmtCurrency(totalAmount)}
                  </div>
                </div>
              ) : (
                // Editable: show as editable table
                <>
                  {treatmentItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg"
                    >
                      <input
                        type="text"
                        value={item.treatment_name}
                        onChange={(e) => updateTreatmentItem(i, { treatment_name: e.target.value })}
                        placeholder="Procedimiento"
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateTreatmentItem(i, { quantity: Math.max(1, Number(e.target.value)) })}
                        className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={item.price}
                        onChange={(e) => updateTreatmentItem(i, { price: Number(e.target.value) })}
                        placeholder="Precio"
                        className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <button
                        onClick={() => removeTreatmentItem(i)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="text-sm font-semibold text-gray-900 text-right pr-10 pt-1">
                    Total: {fmtCurrency(totalAmount)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Photos Section */}
        {(photoBefore || photoAfter || !isReadOnly) && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <label className="text-sm font-medium text-gray-700">Fotos</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Before Photo */}
              <div className="space-y-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Antes</span>
                {isReadOnly ? (
                  // Readonly: show thumbnail or placeholder
                  photoBefore?.url || photoBefore?.preview ? (
                    <div className="relative">
                      <img
                        src={photoBefore.preview || photoBefore.url}
                        alt="Foto antes"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Sin foto
                    </div>
                  )
                ) : (
                  // Editable: upload + preview
                  <div className="space-y-2">
                    {(photoBefore?.preview || photoBefore?.url) ? (
                      <div className="relative">
                        <img
                          src={photoBefore?.preview || photoBefore?.url}
                          alt="Foto antes preview"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => handleRemovePhoto(photoBefore, onPhotoBeforeChange)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                        <Plus className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Subir foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoFileChange(
                            e.target.files?.[0] || null,
                            photoBefore,
                            onPhotoBeforeChange
                          )}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* After Photo */}
              <div className="space-y-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Después</span>
                {isReadOnly ? (
                  // Readonly: show thumbnail or placeholder
                  photoAfter?.url || photoAfter?.preview ? (
                    <div className="relative">
                      <img
                        src={photoAfter.preview || photoAfter.url}
                        alt="Foto después"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Sin foto
                    </div>
                  )
                ) : (
                  // Editable: upload + preview
                  <div className="space-y-2">
                    {(photoAfter?.preview || photoAfter?.url) ? (
                      <div className="relative">
                        <img
                          src={photoAfter?.preview || photoAfter?.url}
                          alt="Foto después preview"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => handleRemovePhoto(photoAfter, onPhotoAfterChange)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                        <Plus className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Subir foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoFileChange(
                            e.target.files?.[0] || null,
                            photoAfter,
                            onPhotoAfterChange
                          )}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
