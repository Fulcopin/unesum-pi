'use client';

import { useState, useEffect, useCallback } from 'react';
import { QrCode, FileText, CheckCircle, Clock, AlertCircle, Download, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ETAPA_LABELS: Record<string, string> = {
  decano: 'Decano',
  direccion: 'Dirección de Carrera',
  docente: 'Docente',
};

const ROL_LABELS: Record<string, string> = {
  decano: 'Decano',
  direccion: 'Directora de Carrera',
  docente: 'Docente',
  profesor: 'Docente',
  administrador: 'Administrador',
  comision: 'Comisión',
  comision_academica: 'Comisión Académica',
};

interface Firma {
  etapa: string;
  firmado: boolean;
  usuario_nombre: string | null;
  firmado_at: string | null;
}

interface Documento {
  tipo: string;
  id: number;
  nombre: string;
  periodo: string;
  asignatura?: { id: number; nombre: string; codigo: string; carrera?: { nombre: string } | null } | null;
  profesor?: { id: number; nombre: string } | null;
  firmas: Firma[];
  siguiente_etapa: string | null;
}

interface QRData {
  hash: string;
  url_verificacion: string;
  qr_data_url: string;
  usuario: {
    id: number;
    nombres: string;
    apellidos: string;
    correo_electronico: string;
    rol: string;
  };
}

interface MisDocumentosFirmaProps {
  token: string;
}

export default function MisDocumentosFirma({ token }: MisDocumentosFirmaProps) {
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loadingQR, setLoadingQR] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [firmandoId, setFirmandoId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Record<string, { ok: boolean; texto: string }>>({});
  const [mostrarQR, setMostrarQR] = useState(true);
  const [errorQR, setErrorQR] = useState<string | null>(null);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const cargarQR = useCallback(async () => {
    setLoadingQR(true);
    setErrorQR(null);
    try {
      const res = await fetch(`${API_URL}/api/firmas/mi-qr`, { headers: authHeaders });
      const json = await res.json();
      if (json.success) setQrData(json.data);
      else setErrorQR(json.message || 'Error al cargar QR');
    } catch {
      setErrorQR('No se pudo conectar al servidor. Verifique que el backend esté activo.');
    } finally {
      setLoadingQR(false);
    }
  }, [token]);

  const cargarDocumentos = useCallback(async () => {
    setLoadingDocs(true);
    setErrorDocs(null);
    try {
      const res = await fetch(`${API_URL}/api/firmas/pendientes`, { headers: authHeaders });
      const json = await res.json();
      if (json.success) setDocumentos(json.data || []);
      else setErrorDocs(json.message || 'Error al cargar documentos');
    } catch {
      setErrorDocs('No se pudo conectar al servidor. Verifique que el backend esté activo.');
    } finally {
      setLoadingDocs(false);
    }
  }, [token]);

  useEffect(() => {
    cargarQR();
    cargarDocumentos();
  }, [cargarQR, cargarDocumentos]);

  const firmarDocumento = async (doc: Documento) => {
    const key = `${doc.tipo}-${doc.id}`;
    setFirmandoId(key);
    setMensajes((prev) => ({ ...prev, [key]: { ok: false, texto: '' } }));
    try {
      const res = await fetch(`${API_URL}/api/firmas/${doc.tipo}/${doc.id}/firmar`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ observaciones: '' }),
      });
      const json = await res.json();
      if (json.success) {
        setMensajes((prev) => ({ ...prev, [key]: { ok: true, texto: '¡Documento firmado exitosamente!' } }));
        setDocumentos((prev) => prev.filter((d) => !(d.tipo === doc.tipo && d.id === doc.id)));
      } else {
        setMensajes((prev) => ({ ...prev, [key]: { ok: false, texto: json.message || 'Error al firmar' } }));
      }
    } catch {
      setMensajes((prev) => ({ ...prev, [key]: { ok: false, texto: 'Error de conexión al firmar' } }));
    } finally {
      setFirmandoId(null);
    }
  };

  const descargarQR = () => {
    if (!qrData?.qr_data_url) return;
    const a = document.createElement('a');
    a.href = qrData.qr_data_url;
    a.download = `mi-qr-firma-${qrData.usuario.nombres?.toLowerCase().replace(/\s+/g, '-') || 'usuario'}.png`;
    a.click();
  };

  const usuario = qrData?.usuario;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Mis Documentos para Firmar</h1>
              {usuario && (
                <p className="text-gray-500 mt-1">
                  {usuario.nombres} {usuario.apellidos} &bull; {ROL_LABELS[usuario.rol] || usuario.rol}
                </p>
              )}
            </div>
            <button
              onClick={() => { cargarQR(); cargarDocumentos(); }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Mi QR Personal */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setMostrarQR(!mostrarQR)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Mi QR Personal</p>
                    <p className="text-xs text-gray-500">Sello de identidad digital</p>
                  </div>
                </div>
                {mostrarQR ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {mostrarQR && (
                <div className="p-4 border-t border-gray-100">
                  {loadingQR ? (
                    <div className="flex flex-col items-center py-6 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="text-sm text-gray-500">Generando QR...</p>
                    </div>
                  ) : errorQR ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <p className="text-sm text-red-700">{errorQR}</p>
                    </div>
                  ) : qrData ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={qrData.qr_data_url}
                        alt="Mi QR Personal"
                        className="w-48 h-48 rounded-xl border-4 border-indigo-100 shadow"
                      />
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Código único de identidad</p>
                        <p className="font-semibold text-gray-800 text-sm">
                          {qrData.usuario.nombres} {qrData.usuario.apellidos}
                        </p>
                        <span className="inline-block bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full mt-1">
                          {ROL_LABELS[qrData.usuario.rol] || qrData.usuario.rol}
                        </span>
                      </div>
                      <button
                        onClick={descargarQR}
                        className="flex items-center gap-2 px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full justify-center"
                      >
                        <Download className="w-3 h-3" />
                        Descargar QR
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Documentos Pendientes */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Documentos Pendientes</h2>
                    <p className="text-xs text-gray-500">Documentos que requieren tu firma</p>
                  </div>
                </div>
                {!loadingDocs && (
                  <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">
                    {documentos.length}
                  </span>
                )}
              </div>

              {loadingDocs ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-sm text-gray-500">Cargando documentos...</p>
                </div>
              ) : errorDocs ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-red-700">{errorDocs}</p>
                  <button onClick={cargarDocumentos} className="mt-3 text-sm text-red-600 underline">
                    Reintentar
                  </button>
                </div>
              ) : documentos.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                  <p className="font-medium text-gray-700">¡Todo al día!</p>
                  <p className="text-sm text-gray-500">No tienes documentos pendientes de firma</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentos.map((doc) => {
                    const key = `${doc.tipo}-${doc.id}`;
                    const firmando = firmandoId === key;
                    const msg = mensajes[key];
                    return (
                      <TarjetaDocumento
                        key={key}
                        doc={doc}
                        firmando={firmando}
                        mensaje={msg}
                        onFirmar={() => firmarDocumento(doc)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TarjetaDocumento({
  doc,
  firmando,
  mensaje,
  onFirmar,
}: {
  doc: Documento;
  firmando: boolean;
  mensaje?: { ok: boolean; texto: string };
  onFirmar: () => void;
}) {
  const tipoLabel = doc.tipo === 'syllabus' ? 'Syllabus' : 'Programa Analítico';
  const tipoColor = doc.tipo === 'syllabus' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

  const firmadasCount = doc.firmas.filter((f) => f.firmado).length;
  const totalEtapas = doc.firmas.length;

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipoColor}`}>
              {tipoLabel}
            </span>
            {doc.periodo && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {doc.periodo}
              </span>
            )}
          </div>

          <p className="font-semibold text-gray-900 text-sm truncate">
            {doc.nombre || doc.asignatura?.nombre || `${tipoLabel} #${doc.id}`}
          </p>

          {doc.asignatura && (
            <p className="text-xs text-gray-500 mt-0.5">
              {doc.asignatura.codigo} &bull; {doc.asignatura.nombre}
              {doc.asignatura.carrera && ` &bull; ${doc.asignatura.carrera.nombre}`}
            </p>
          )}
          {doc.profesor && (
            <p className="text-xs text-gray-400 mt-0.5">Docente: {doc.profesor.nombre}</p>
          )}

          {/* Progreso de firmas */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {doc.firmas.map((f) => (
              <div key={f.etapa} className="flex items-center gap-1">
                {f.firmado ? (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> {ETAPA_LABELS[f.etapa] || f.etapa}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" /> {ETAPA_LABELS[f.etapa] || f.etapa}
                  </span>
                )}
              </div>
            ))}
            <span className="text-xs text-gray-400 ml-1">{firmadasCount}/{totalEtapas}</span>
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={onFirmar}
            disabled={firmando}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {firmando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Firmando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Firmar
              </>
            )}
          </button>
        </div>
      </div>

      {mensaje?.texto && (
        <div className={`mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${mensaje.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {mensaje.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
