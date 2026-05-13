'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  LogIn,
  PenLine,
  QrCode,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/* Flujo vigente: Docente → Coordinador/a → Decano/a → Dirección Académica */
const ETAPAS = ['docente', 'coordinador', 'decano', 'director_academico'];
const ETAPA_LABELS: Record<string, string> = {
  docente: 'Docente',
  coordinador: 'Coordinador/a de Carrera',
  decano: 'Decano/a de Facultad',
  director_academico: 'Director/a Académico/a',
};
const ROL_A_ETAPA: Record<string, string> = {
  docente: 'docente',
  profesor: 'docente',
  coordinador: 'coordinador',
  comision: 'coordinador',
  comision_academica: 'coordinador',
  decano: 'decano',
  subdecano: 'decano',
  direccion: 'director_academico',
  administrador: 'director_academico',
};
const TIPO_LABELS: Record<string, string> = {
  syllabus: 'Syllabus',
  programa_analitico: 'Programa Analítico',
};

interface EtapaInfo {
  etapa: string;
  firmado: boolean;
  firma: {
    usuario_nombre: string | null;
    firmado_at: string;
    qr_data_url?: string;
    url_verificacion?: string;
    hash_firma?: string;
  } | null;
}

interface DocInfo {
  documento_tipo: string;
  documento_id: number;
  documento: {
    nombre: string;
    periodo: string;
    asignatura: { nombre: string; codigo: string | null } | null;
    profesor: { nombre: string } | null;
  } | null;
  etapas: EtapaInfo[];
  siguiente_etapa: string | null;
  completo: boolean;
}

interface FirmaResult {
  qr_data_url: string;
  url_verificacion: string;
  firma: { etapa: string; usuario_nombre: string; firmado_at: string };
}

// ─── Login simple ────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const ok = await login(email.trim(), password);
      if (ok) onSuccess();
      else setError('Correo o contraseña incorrectos.');
    } catch {
      setError('Error al conectar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="email" className="text-sm">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@unesum.edu.ec"
          required
          className="mt-1"
          autoFocus
        />
      </div>
      <div>
        <Label htmlFor="pwd" className="text-sm">Contraseña</Label>
        <Input
          id="pwd"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="mt-1"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <LogIn className="h-5 w-5 mr-2" />}
        Entrar y firmar
      </Button>
    </form>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function FirmarPage() {
  const params = useParams<{ tipo: string; id: string }>();
  const { user, isLoading: authLoading, getToken } = useAuth();

  const tipo = params?.tipo as string;
  const docId = parseInt(params?.id || '0', 10);
  const tipoValido = tipo === 'syllabus' || tipo === 'programa_analitico';

  // Estados
  const [docInfo, setDocInfo]       = useState<DocInfo | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [errorDoc, setErrorDoc]     = useState<string | null>(null);

  const [firmando, setFirmando]     = useState(false);
  const [obs, setObs]               = useState('');
  const [mostrarObs, setMostrarObs] = useState(false);
  const [resultado, setResultado]   = useState<FirmaResult | null>(null);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);

  // Cargar info del documento
  const cargar = async () => {
    if (!tipoValido || !docId) return;
    try {
      setLoadingDoc(true);
      setErrorDoc(null);
      const token = getToken();
      const res = await fetch(`${API_URL}/firmas/${tipo}/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Error al cargar');
      setDocInfo(json.data);
    } catch (e: any) {
      setErrorDoc(e.message);
    } finally {
      setLoadingDoc(false);
    }
  };

  useEffect(() => {
    if (user) cargar();
  }, [user]);

  // Firmar
  const firmar = async () => {
    setFirmando(true);
    setErrorFirma(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/firmas/${tipo}/${docId}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ observaciones: obs.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Error al firmar');
      setResultado(json.data);
      setObs('');
      setMostrarObs(false);
      cargar();
    } catch (e: any) {
      setErrorFirma(e.message);
    } finally {
      setFirmando(false);
    }
  };

  // Derivar estado
  const rolUsuario   = user?.rol || '';
  const etapaUsuario = ROL_A_ETAPA[rolUsuario] || null;
  const esSiguiente  = !!docInfo && docInfo.siguiente_etapa === etapaUsuario;
  const yaFirmo      = !!docInfo?.etapas?.find((e) => e.etapa === etapaUsuario && e.firmado);
  const doc          = docInfo?.documento;

  // ── Pantalla de carga inicial ──────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-blue-700 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  // ── Tipo inválido ──────────────────────────────────────────────────────────
  if (!tipoValido || !docId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center text-red-600">
          <XCircle className="h-14 w-14 mx-auto mb-3" />
          <p className="font-bold text-lg">Enlace de firma inválido</p>
          <p className="text-sm text-slate-500 mt-1">Escanea un QR válido generado por el sistema UNESUM.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-blue-800 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="mb-5 text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-white">
          <QrCode className="h-5 w-5" />
          <span className="font-bold tracking-wide">UNESUM · Firma Digital</span>
        </div>
      </div>

      <div className="w-full max-w-md">

        {/* ── Tarjeta principal ── */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header del documento */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-white">
            <div className="flex items-start gap-3">
              <div className="bg-white/10 rounded-lg p-2 flex-shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge className="text-[10px] bg-white/20 hover:bg-white/20 mb-1">
                  {TIPO_LABELS[tipo] || tipo}
                </Badge>
                <p className="font-bold text-base leading-tight">
                  {doc?.asignatura?.nombre || doc?.nombre || `Documento #${docId}`}
                </p>
                {doc?.asignatura?.codigo && (
                  <p className="text-white/70 text-xs mt-0.5">{doc.asignatura.codigo}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/60">
                  {doc?.periodo && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {doc.periodo}
                    </span>
                  )}
                  {doc?.profesor && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {doc.profesor.nombre}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progreso de firmas (solo si hay docInfo) */}
          {docInfo && (
            <div className="px-5 py-3 bg-slate-50 border-b">
              <div className="flex items-center gap-1.5">
                {ETAPAS.map((e, i) => {
                  const etapaInfo = docInfo.etapas.find((x) => x.etapa === e);
                  const firmado = etapaInfo?.firmado ?? false;
                  const esTurno = docInfo.siguiente_etapa === e;
                  return (
                    <div key={e} className="flex items-center gap-1.5 flex-1">
                      <div className={`flex-1 flex flex-col items-center gap-0.5`}>
                        <div
                          className={`h-2 rounded-full w-full ${
                            firmado ? 'bg-green-500' : esTurno ? 'bg-amber-400' : 'bg-slate-200'
                          }`}
                        />
                        <span className={`text-[9px] font-medium ${
                          firmado ? 'text-green-700' : esTurno ? 'text-amber-700' : 'text-slate-400'
                        }`}>
                          {ETAPA_LABELS[e]}
                        </span>
                      </div>
                      {i < ETAPAS.length - 1 && (
                        <div className="w-3 h-px bg-slate-300 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-5">

            {/* ── ESTADO: Firma completada exitosamente ── */}
            {resultado && (
              <div className="space-y-4">
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-green-800">¡Documento firmado!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Tu firma ha sido registrada con código QR de verificación.
                  </p>
                </div>

                {/* QR de verificación */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  {resultado.qr_data_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resultado.qr_data_url}
                      alt="QR de verificación"
                      className="mx-auto h-36 w-36 border-2 border-green-300 rounded-lg mb-2"
                    />
                  )}
                  <p className="text-xs font-semibold text-green-800">Código QR de verificación</p>
                  <p className="text-[10px] text-green-600 mt-0.5">
                    Este QR confirma tu firma como {ETAPA_LABELS[etapaUsuario || ''] || rolUsuario}
                  </p>
                  {resultado.url_verificacion && (
                    <a
                      href={resultado.url_verificacion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline mt-1 inline-block"
                    >
                      Verificar firma →
                    </a>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setResultado(null); cargar(); }}
                >
                  Ver estado del documento
                </Button>
              </div>
            )}

            {/* ── ESTADO: No logueado ── */}
            {!user && !resultado && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                  <p className="font-bold text-slate-800">Inicia sesión para firmar</p>
                  <p className="text-sm text-slate-500">
                    Usa tus credenciales del sistema UNESUM.
                  </p>
                </div>
                <LoginForm onSuccess={cargar} />
              </div>
            )}

            {/* ── ESTADO: Logueado, cargando ── */}
            {user && loadingDoc && !resultado && (
              <div className="py-8 text-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-sm">Cargando documento...</p>
              </div>
            )}

            {/* ── ESTADO: Error ── */}
            {user && errorDoc && !resultado && (
              <div className="text-center py-6 space-y-3">
                <XCircle className="h-10 w-10 text-red-400 mx-auto" />
                <p className="text-red-600 text-sm font-medium">{errorDoc}</p>
                <Button variant="outline" size="sm" onClick={cargar}>Reintentar</Button>
              </div>
            )}

            {/* ── ESTADO: Logueado + doc cargado ── */}
            {user && docInfo && !loadingDoc && !errorDoc && !resultado && (
              <div className="space-y-4">

                {/* Info del usuario logueado */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border">
                  <div className="bg-emerald-100 rounded-full p-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {user.nombres} {user.apellidos}
                    </p>
                    <p className="text-xs text-emerald-700">
                      {ETAPA_LABELS[etapaUsuario || ''] || rolUsuario}
                    </p>
                  </div>
                  {yaFirmo && (
                    <Badge className="bg-green-600 hover:bg-green-600 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Ya firmado
                    </Badge>
                  )}
                  {esSiguiente && !yaFirmo && (
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-xs">
                      <Clock className="h-3 w-3 mr-1" /> Tu turno
                    </Badge>
                  )}
                </div>

                {/* ── CASO A: Le toca firmar ── */}
                {esSiguiente && !yaFirmo && (
                  <div className="space-y-3">
                    {errorFirma && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {errorFirma}
                      </p>
                    )}

                    {/* Botón principal de firma */}
                    {!mostrarObs ? (
                      <div className="space-y-2">
                        <Button
                          className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg"
                          onClick={firmar}
                          disabled={firmando}
                        >
                          {firmando ? (
                            <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                          ) : (
                            <PenLine className="h-6 w-6 mr-2" />
                          )}
                          {firmando ? 'Firmando...' : 'FIRMAR AHORA'}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setMostrarObs(true)}
                          className="w-full text-xs text-slate-400 hover:text-slate-600 text-center py-1"
                        >
                          + Agregar observaciones
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          value={obs}
                          onChange={(e) => setObs(e.target.value)}
                          placeholder="Escribe tus observaciones (opcional)..."
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => setMostrarObs(false)}>
                            Cancelar
                          </Button>
                          <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={firmar}
                            disabled={firmando}
                          >
                            {firmando ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <PenLine className="h-4 w-4 mr-1" />
                            )}
                            Firmar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── CASO B: Ya firmó ── */}
                {yaFirmo && (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-800">Ya firmaste este documento</p>
                    <p className="text-xs text-green-600 mt-1">
                      Tu firma como {ETAPA_LABELS[etapaUsuario || ''] || rolUsuario} está registrada.
                    </p>
                    {/* Mostrar QR de la firma existente */}
                    {(() => {
                      const miFirma = docInfo.etapas.find((e) => e.etapa === etapaUsuario)?.firma;
                      return miFirma?.qr_data_url ? (
                        <div className="mt-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={miFirma.qr_data_url}
                            alt="QR"
                            className="mx-auto h-28 w-28 border rounded-lg"
                          />
                          {miFirma.url_verificacion && (
                            <a
                              href={miFirma.url_verificacion}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 hover:underline mt-1 block"
                            >
                              Verificar mi firma →
                            </a>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* ── CASO C: No le toca (esperando otro rol) ── */}
                {!esSiguiente && !yaFirmo && docInfo.siguiente_etapa && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                    <Clock className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-amber-800">Aún no es tu turno</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Esperando firma de:{' '}
                      <strong>{ETAPA_LABELS[docInfo.siguiente_etapa] || docInfo.siguiente_etapa}</strong>
                    </p>
                  </div>
                )}

                {/* ── CASO D: Documento completo ── */}
                {docInfo.completo && (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-800">Documento completamente firmado</p>
                    <p className="text-xs text-green-600 mt-1">
                      Todas las firmas requeridas han sido registradas.
                    </p>
                  </div>
                )}

                {/* Firmas registradas */}
                {docInfo.etapas.some((e) => e.firmado) && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Firmas registradas</p>
                    {docInfo.etapas
                      .filter((e) => e.firmado && e.firma)
                      .map((e) => (
                        <div key={e.etapa} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-green-800">{ETAPA_LABELS[e.etapa] || e.etapa}</p>
                            <p className="text-[10px] text-slate-500">
                              {e.firma!.usuario_nombre} · {new Date(e.firma!.firmado_at).toLocaleDateString('es-EC')}
                            </p>
                          </div>
                          {e.firma?.qr_data_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.firma.qr_data_url} alt="QR" className="h-10 w-10 border rounded flex-shrink-0" />
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-white/50 mt-4">
          UNESUM · Sistema de Firma Digital con QR
        </p>
      </div>
    </div>
  );
}
