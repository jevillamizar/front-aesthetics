import { useState } from 'react';
import { FileSignature, CheckCircle2, Stethoscope, User } from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';

/* ── Types ─────────────────────────────────────────────────────────── */

export type ConsentFormData = {
  procedure_description: string;
  risks: string;
  notes: string;
  signed_by_name: string;
  signature_data_url: string;
};

export type DoctorInfo = {
  name: string;
  profession?: string;
  specialty?: string;
  rethus_number?: string;
  professional_seal?: string;
};

/* ── Props ───────────────────────────────────────────────────────────── */

export interface ConsentFormProps {
  // Datos
  values: ConsentFormData;
  signedAt?: string | null;
  doctorInfo?: DoctorInfo;

  // Configuración de modo
  mode: 'readonly' | 'editable';

  // Callbacks (solo modo editable)
  onChange?: (field: string, value: string) => void;
  onSign?: (signatureDataUrl: string, signedByName: string) => void;
  onUnsign?: () => void;
  // Modo auto-save: se dispara en cada cambio del canvas (cada trazo o limpiar)
  // Compatible con onSign (flujo de botón) - ambas pueden coexistir
  onSignatureChange?: (dataUrl: string) => void;
}

/* ── Component ───────────────────────────────────────────────────────── */

export function ConsentForm({
  values,
  signedAt,
  doctorInfo,
  mode,
  onChange,
  onSign,
  onUnsign,
  onSignatureChange,
}: ConsentFormProps) {
  const isReadOnly = mode === 'readonly';
  const isSigned = !!signedAt;

  // Estado local para el flujo de firma en modo editable
  const [localSignature, setLocalSignature] = useState<string>(values.signature_data_url || '');
  const [localSignedByName, setLocalSignedByName] = useState<string>(values.signed_by_name || '');

  const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (isReadOnly) return;
    onChange?.(field, e.target.value);
  };

  const handleCanvasSign = (dataUrl: string) => {
    if (isReadOnly) return;
    setLocalSignature(dataUrl);
    // Propagar inmediatamente si está en modo auto-save
    onSignatureChange?.(dataUrl);
  };

  const handleCanvasClear = () => {
    if (isReadOnly) return;
    setLocalSignature('');
    // Propagar limpieza en modo auto-save
    onSignatureChange?.('');
  };

  const handleSign = () => {
    if (isReadOnly || !localSignature || !localSignedByName.trim()) return;
    onSign?.(localSignature, localSignedByName.trim());
  };

  const handleUnsign = () => {
    if (isReadOnly) return;
    setLocalSignature('');
    setLocalSignedByName('');
    onUnsign?.();
  };

  // Formatear fecha de firma para mostrar
  const formatSignedDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <FileSignature className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">Consentimiento Informado</h2>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Estado Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Estado</span>
          {isSigned ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              <CheckCircle2 className="w-3 h-3" /> Firmado
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              Pendiente
            </span>
          )}
        </div>

        {/* Procedimiento */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Descripción del procedimiento</label>
          {isReadOnly ? (
            <div className={`w-full px-3 py-2 bg-gray-50 text-gray-600 border border-gray-100 rounded-lg text-sm whitespace-pre-wrap min-h-[2.5rem] ${
              !values.procedure_description ? 'text-gray-400 italic' : ''
            }`}>
              {values.procedure_description || '—'}
            </div>
          ) : (
            <textarea
              value={values.procedure_description}
              onChange={handleFieldChange('procedure_description')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          )}
        </div>

        {/* Riesgos */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Riesgos y consideraciones</label>
          {isReadOnly ? (
            <div className={`w-full px-3 py-2 bg-gray-50 text-gray-600 border border-gray-100 rounded-lg text-sm whitespace-pre-wrap min-h-[2.5rem] ${
              !values.risks ? 'text-gray-400 italic' : ''
            }`}>
              {values.risks || '—'}
            </div>
          ) : (
            <textarea
              value={values.risks}
              onChange={handleFieldChange('risks')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          )}
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Notas adicionales</label>
          {isReadOnly ? (
            <div className={`w-full px-3 py-2 bg-gray-50 text-gray-600 border border-gray-100 rounded-lg text-sm whitespace-pre-wrap min-h-[2.5rem] ${
              !values.notes ? 'text-gray-400 italic' : ''
            }`}>
              {values.notes || '—'}
            </div>
          ) : (
            <textarea
              value={values.notes}
              onChange={handleFieldChange('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          )}
        </div>

        {/* Sección de Firma */}
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Firma del paciente</h3>
            {isSigned && signedAt && (
              <span className="text-xs text-gray-500">
                Firmado el {formatSignedDate(signedAt)}
              </span>
            )}
          </div>

          {isReadOnly ? (
            // Modo readonly: mostrar firma o mensaje de pendiente
            isSigned && values.signature_data_url ? (
              <SignatureCanvas
                readOnly={true}
                existingDataUrl={values.signature_data_url}
                onSign={() => {}}
                onClear={() => {}}
              />
            ) : (
              <div className="w-full h-[160px] border border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <span className="text-sm text-gray-400">Sin firma registrada</span>
              </div>
            )
          ) : (
            // Modo editable: flujo de firma
            <div className="space-y-3">
              {/* Nombre del firmante */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Nombre del firmante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={localSignedByName || values.signed_by_name}
                  onChange={(e) => setLocalSignedByName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Canvas de firma */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Firma</label>
                <SignatureCanvas
                  onSign={handleCanvasSign}
                  onClear={handleCanvasClear}
                  readOnly={false}
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={!localSignature || !localSignedByName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Firmar ahora
                </button>
                {isSigned && (
                  <button
                    type="button"
                    onClick={handleUnsign}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Deshacer firma
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sección Médico Responsable */}
        {doctorInfo && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Médico responsable</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{doctorInfo.name}</p>
                  {doctorInfo.profession && (
                    <p className="text-sm text-gray-600">{doctorInfo.profession}</p>
                  )}
                  {doctorInfo.specialty && (
                    <p className="text-sm text-gray-500">{doctorInfo.specialty}</p>
                  )}
                </div>
              </div>
              {(doctorInfo.rethus_number || doctorInfo.professional_seal) && (
                <div className="pt-2 border-t border-gray-200 space-y-1">
                  {doctorInfo.rethus_number && (
                    <p className="text-xs text-gray-500">
                      RETHUS: {doctorInfo.rethus_number}
                    </p>
                  )}
                  {doctorInfo.professional_seal && (
                    <p className="text-xs text-gray-500">
                      Sello: {doctorInfo.professional_seal}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
