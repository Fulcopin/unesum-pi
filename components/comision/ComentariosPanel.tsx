"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Send, Trash2, AlertCircle, RefreshCw, CheckCheck,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface Comentario {
  id: number;
  comentario: string;
  autor_nombre: string;
  autor_rol: string;
  autor_id: number;
  leido: boolean;
  created_at: string;
}

interface Props {
  tipo: "syllabus" | "programa";
  documentoId: number;
  /** ID del usuario autenticado (para saber cuáles mensajes son propios) */
  usuarioId?: number;
  /** Rol activo del usuario autenticado */
  usuarioRol?: string;
  /** Si true, muestra un badge de "no leídos" y marca al abrir */
  marcarLeido?: boolean;
}

const ROL_LABELS: Record<string, { label: string; color: string }> = {
  comision_academica: { label: "Comisión Académica", color: "bg-indigo-100 text-indigo-800" },
  comision: { label: "Comisión", color: "bg-indigo-100 text-indigo-800" },
  administrador: { label: "Administrador", color: "bg-red-100 text-red-800" },
  docente: { label: "Docente", color: "bg-blue-100 text-blue-800" },
  profesor: { label: "Docente", color: "bg-blue-100 text-blue-800" },
};

function formatFecha(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch { return iso; }
}

export function ComentariosPanel({ tipo, documentoId, usuarioId, usuarioRol, marcarLeido = true }: Props) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/comentarios-documento?tipo=${tipo}&id=${documentoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error al cargar comentarios");
      const json = await res.json();
      setComentarios(json.data ?? []);

      // Marcar como leídos si corresponde
      if (marcarLeido) {
        fetch(`${API_URL}/comentarios-documento/marcar-leido`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ tipo, id: documentoId }),
        }).catch(() => {});
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [tipo, documentoId]);

  // Scroll al último mensaje
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comentarios, loading]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/comentarios-documento`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ documento_tipo: tipo, documento_id: documentoId, comentario: texto.trim() }),
      });
      if (!res.ok) throw new Error("Error al enviar comentario");
      setTexto("");
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este comentario?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/comentarios-documento/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al eliminar");
      await cargar();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const noLeidos = comentarios.filter(c => !c.leido && c.autor_id !== usuarioId).length;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <MessageSquare className="h-4 w-4 text-indigo-600" />
        <span className="font-semibold text-sm text-gray-800">Comentarios y Retroalimentación</span>
        {noLeidos > 0 && (
          <Badge className="ml-auto bg-indigo-600 text-white text-[10px] px-1.5">{noLeidos} nuevo{noLeidos > 1 ? "s" : ""}</Badge>
        )}
        <button
          onClick={cargar}
          className="ml-auto p-1.5 rounded-md hover:bg-gray-200 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
        </button>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 border border-red-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && comentarios.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Aún no hay comentarios. Sé el primero en escribir.
          </div>
        )}

        {comentarios.map(c => {
          const esPropio = c.autor_id === usuarioId;
          const rolInfo = ROL_LABELS[c.autor_rol] ?? { label: c.autor_rol, color: "bg-gray-100 text-gray-700" };
          return (
            <div key={c.id} className={`flex flex-col gap-1 ${esPropio ? "items-end" : "items-start"}`}>
              <div className={`flex items-center gap-2 text-[11px] ${esPropio ? "flex-row-reverse" : "flex-row"}`}>
                <span className="font-semibold text-gray-700">{esPropio ? "Tú" : c.autor_nombre}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rolInfo.color}`}>{rolInfo.label}</span>
                {!c.leido && !esPropio && <CheckCheck className="h-3 w-3 text-indigo-400" />}
              </div>
              <div className={`group relative max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                esPropio
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-900 rounded-bl-sm"
              }`}>
                <p className="whitespace-pre-wrap">{c.comentario}</p>
                {esPropio && (
                  <button
                    onClick={() => eliminar(c.id)}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-white rounded-full p-0.5 shadow text-red-500 hover:text-red-700 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <span className="text-[10px] text-gray-400">{formatFecha(c.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Caja de texto */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="flex gap-2 items-end">
          <Textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Escribe un comentario... (Enter para enviar)"
            className="resize-none text-sm min-h-[60px] max-h-32 flex-1"
            rows={2}
          />
          <Button
            onClick={enviar}
            disabled={enviando || !texto.trim()}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 gap-1 self-end h-10 px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Shift+Enter para salto de línea</p>
      </div>
    </div>
  );
}
