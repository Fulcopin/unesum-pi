'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  Clock,
  Loader2,
  PenLine,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type TipoDocumento = 'syllabus' | 'programa_analitico';

const ETAPA_LABELS: Record<string, string> = {
  docente: 'Docente',
  coordinador: 'Coordinador/a de Carrera',
  decano: 'Decano/a de Facultad',
  director_academico: 'Director/a Académico/a',
};

const ROL_A_ETAPA: Record<string, string> = {
  docente: 'docente',
  profesor: 'docente',
  comision: 'coordinador',
  comision_academica: 'coordinador',
  decano: 'decano',
  subdecano: 'decano',
  direccion: 'director_academico',
  administrador: 'director_academico',
};

interface EtapaFirma {
  etapa: string;
  firmado: boolean;
  firma: {
    id: number;
    usuario_nombre: string | null;
    usuario_rol: string | null;
    firmado_at: string;
    observaciones: string | null;
    qr_data_url: string;
    url_verificacion: string;
    hash_firma: string;
  } | null;
}

interface FirmasResponse {
  documento_tipo: TipoDocumento;
  documento_id: number;
  etapas: EtapaFirma[];
  siguiente_etapa: string | null;
  total_firmas: number;
  completo: boolean;
}

interface Props {
  tipo: TipoDocumento;
  documentoId: number;
  documentoNombre?: string;
  onFirmado?: () => void;
}

export function FirmasPanel({ tipo, documentoId, documentoNombre, onFirmado }: Props) {
  const { user, getToken } = useAuth();
  const [data, setData] = useState<FirmasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [firmando, setFirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [mostrarFormFirmar, setMostrarFormFirmar] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const cargar = async (): Promise<FirmasResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const res = await fetch(`${API_URL}/firmas/${tipo}/${documentoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Error al cargar firmas');
      }
      setData(json.data);
      return json.data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [tipo, documentoId]);

  const firmar = async () => {
    if (!user) return;
    try {
      setFirmando(true);
      setError(null);
      const token = getToken();
      const res = await fetch(`${API_URL}/firmas/${tipo}/${documentoId}/firmar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ observaciones: observaciones.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Error al firmar');
      }
      setMostrarFormFirmar(false);
      setObservaciones('');
      const updatedData = await cargar();
      if (updatedData?.completo) {
        setShowCelebration(true);
      }
      onFirmado?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFirmando(false);
    }
  };

  const rolUsuario = user?.rol || '';
  const etapaUsuario = ROL_A_ETAPA[rolUsuario] || null;
  const meTocaFirmar =
    !!data && etapaUsuario === data.siguiente_etapa && !data.completo;

  return (
    <>
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          Firmas digitales con QR
          {data?.completo && (
            <Badge className="bg-green-600 hover:bg-green-700 ml-2">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Documento totalmente firmado
            </Badge>
          )}
        </CardTitle>
        {documentoNombre && (
          <p className="text-xs text-slate-500 mt-1">{documentoNombre}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-6 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando firmas...
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.etapas.map((e, idx) => (
                <div
                  key={e.etapa}
                  className={`rounded-lg border p-3 transition ${
                    e.firmado
                      ? 'border-green-300 bg-green-50/50'
                      : data.siguiente_etapa === e.etapa
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm">
                          {ETAPA_LABELS[e.etapa] || e.etapa}
                        </span>
                      </div>
                      {e.firmado && e.firma ? (
                        <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                          <p className="font-medium text-slate-800">
                            {e.firma.usuario_nombre}
                          </p>
                          <p>
                            {new Date(e.firma.firmado_at).toLocaleString('es-EC')}
                          </p>
                          {e.firma.observaciones && (
                            <p className="italic text-slate-500 mt-1">
                              "{e.firma.observaciones}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">
                          {data.siguiente_etapa === e.etapa
                            ? 'Pendiente: siguiente firma'
                            : 'Pendiente'}
                        </p>
                      )}
                    </div>

                    <div>
                      {e.firmado ? (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Firmado
                        </Badge>
                      ) : data.siguiente_etapa === e.etapa ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          <Clock className="h-3 w-3 mr-1" /> En turno
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">
                          En espera
                        </Badge>
                      )}
                    </div>
                  </div>

                  {e.firmado && e.firma?.qr_data_url && (
                    <div className="mt-3 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={e.firma.qr_data_url}
                        alt="QR firma"
                        className="h-20 w-20 border rounded bg-white"
                      />
                      <div className="text-[10px] text-slate-500 break-all">
                        <p className="font-semibold mb-1 text-slate-700">
                          Comprobante QR
                        </p>
                        <a
                          href={e.firma.url_verificacion}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Verificar firma
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {meTocaFirmar && (
              <div className="rounded-lg border-2 border-blue-300 bg-blue-50/40 p-4">
                {!mostrarFormFirmar ? (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900">
                        Te toca firmar este documento como{' '}
                        <span className="underline">
                          {ETAPA_LABELS[etapaUsuario || ''] || etapaUsuario}
                        </span>
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Al firmar se generará un código QR único como
                        comprobante.
                      </p>
                    </div>
                    <Button
                      onClick={() => setMostrarFormFirmar(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <PenLine className="h-4 w-4 mr-2" />
                      Firmar ahora
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="obs" className="text-sm">
                        Observaciones (opcional)
                      </Label>
                      <Textarea
                        id="obs"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Agrega un comentario sobre tu revisión..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMostrarFormFirmar(false);
                          setObservaciones('');
                        }}
                        disabled={firmando}
                      >
                        <X className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                      <Button
                        onClick={firmar}
                        disabled={firmando}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {firmando ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Firmando...
                          </>
                        ) : (
                          <>
                            <PenLine className="h-4 w-4 mr-2" /> Confirmar
                            firma
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!meTocaFirmar && data.siguiente_etapa && (
              <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                Próxima firma pendiente:{' '}
                <strong>
                  {ETAPA_LABELS[data.siguiente_etapa] || data.siguiente_etapa}
                </strong>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>

    {/* ══ CELEBRACIÓN: Todas las firmas completadas ══ */}
    {showCelebration && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={() => setShowCelebration(false)}
      >
        {/* Confeti decorativo */}
        {[...Array(24)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-sm opacity-90 animate-bounce"
            style={{
              width:  `${8 + (i * 3) % 10}px`,
              height: `${8 + (i * 5) % 10}px`,
              backgroundColor: ['#f43f5e','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'][i % 6],
              left:   `${4 + (i * 4.1) % 92}%`,
              top:    `${2 + (i * 5.7) % 30}%`,
              animationDelay:    `${(i * 0.13) % 0.9}s`,
              animationDuration: `${0.5 + (i * 0.09) % 0.7}s`,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <span
            key={`b${i}`}
            className="absolute rounded-sm opacity-90 animate-bounce"
            style={{
              width:  `${6 + (i * 4) % 10}px`,
              height: `${6 + (i * 6) % 10}px`,
              backgroundColor: ['#f43f5e','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'][(i + 3) % 6],
              left:   `${4 + (i * 8.3) % 92}%`,
              top:    `${65 + (i * 3.1) % 30}%`,
              animationDelay:    `${(i * 0.17) % 0.9}s`,
              animationDuration: `${0.6 + (i * 0.11) % 0.8}s`,
            }}
          />
        ))}

        <div
          className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icono principal animado */}
          <div className="text-7xl mb-2 animate-bounce">🎉</div>
          <div className="flex justify-center gap-3 text-4xl mb-4">
            🏆&nbsp;🎊&nbsp;🏆
          </div>

          <h2 className="text-2xl font-bold text-green-700 mb-2">
            ¡Proceso Completado!
          </h2>
          <p className="text-gray-700 font-medium mb-1">
            Todas las firmas han sido registradas.
          </p>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            El documento fue firmado por todos los responsables,
            incluyendo el{' '}
            <span className="font-semibold text-green-700">Director de Carrera</span>.
            El proceso está oficialmente concluido. 🎯
          </p>

          <button
            onClick={() => setShowCelebration(false)}
            className="bg-green-600 hover:bg-green-700 active:scale-95 transition-all text-white font-semibold px-8 py-2.5 rounded-xl shadow-md text-base"
          >
            ¡Excelente! 👏
          </button>

          <p className="text-xs text-gray-400 mt-4">Haz clic fuera para cerrar</p>
        </div>
      </div>
    )}
  </>);
}
