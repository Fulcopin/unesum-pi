"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Pencil, Trash2, Plus, Save, Loader2, Home, Eye, EyeOff, X,
  Search, UserPlus, Upload, Download, FileSpreadsheet, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

const ROLES_DISPONIBLES = [
  { value: "administrador",      label: "Administrador" },
  { value: "comision_academica", label: "Comisión Académica" },
  { value: "comision",           label: "Comisión" },
  { value: "direccion",          label: "Dirección" },
  { value: "decano",             label: "Decano" },
  { value: "subdecano",          label: "Sub Decano" },
  { value: "coordinador",        label: "Coordinador/a de Carrera" },
  { value: "docente",            label: "Docente" },
  { value: "profesor",           label: "Profesor" },
  { value: "estudiante",         label: "Estudiante" },
]

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLES_DISPONIBLES.map(r => [r.value, r.label])
)

// ────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────
interface Usuario {
  id: number
  nombres: string
  apellidos: string
  cedula_identidad: string
  correo_electronico: string
  telefono?: string
  fecha_nacimiento?: string
  direccion?: string
  facultad?: string
  carrera?: string
  rol: string
  roles: string[]
  estado: boolean
}

interface FormData {
  nombres: string
  apellidos: string
  cedula_identidad: string
  correo_electronico: string
  contraseña: string
  confirmar_contraseña: string
  telefono: string
  fecha_nacimiento: string
  direccion: string
  facultad: string
  carrera: string
  roles: string[]
  estado: "activo" | "inactivo"
}

interface FilaImportada {
  _fila: number
  nombres: string
  apellidos: string
  cedula_identidad: string
  correo_electronico: string
  contraseña: string
  roles: string          // "docente,comision" separado por coma
  telefono?: string
  fecha_nacimiento?: string
  facultad?: string
  carrera?: string
  direccion?: string
  _error?: string        // mensaje si hay problema de validación
  _estado?: "pendiente" | "ok" | "error"
  _msg?: string
}

const initialForm: FormData = {
  nombres: "", apellidos: "", cedula_identidad: "", correo_electronico: "",
  contraseña: "", confirmar_contraseña: "", telefono: "", fecha_nacimiento: "",
  direccion: "", facultad: "", carrera: "", roles: [], estado: "activo",
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────
function alertMsg(title: string, desc: string, bad?: boolean) {
  alert(`${bad ? "❌" : "✅"} ${title}\n${desc}`)
}

function validarRoles(rolesStr: string): string[] {
  return rolesStr
    .split(",")
    .map(r => r.trim().toLowerCase())
    .filter(r => ROLES_DISPONIBLES.some(rd => rd.value === r))
}

// ────────────────────────────────────────────────────────────────────
// Página principal
// ────────────────────────────────────────────────────────────────────
export default function GestionUsuariosPage() {
  const router  = useRouter()
  const { token, getToken } = useAuth()

  const [usuarios,   setUsuarios]   = useState<Usuario[]>([])
  const [filtered,   setFiltered]   = useState<Usuario[]>([])
  const [search,     setSearch]     = useState("")
  const [editingId,  setEditingId]  = useState<number | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [showPass,   setShowPass]   = useState(false)
  const [formData,   setFormData]   = useState<FormData>(initialForm)
  const [rolToAdd,   setRolToAdd]   = useState("")

  // Carga masiva
  const [showBulk,     setShowBulk]     = useState(false)
  const [filas,        setFilas]        = useState<FilaImportada[]>([])
  const [importando,   setImportando]   = useState(false)
  const [progreso,     setProgreso]     = useState(0)
  const [resultados,   setResultados]   = useState<FilaImportada[]>([])
  const [mostrarResult, setMostrarResult] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── API helper ──────────────────────────────────────────────────
  const api = useCallback(async (path: string, opts: RequestInit = {}) => {
    const url = `${API_URL}/${path.replace(/^\//, "")}`
    const tok = token || getToken()
    return fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok}`,
        ...((opts.headers as Record<string, string>) || {}),
      },
    })
  }, [token, getToken])

  // ── Cargar usuarios ─────────────────────────────────────────────
  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true)
      const res  = await api("/usuarios")
      const data = await res.json()
      const lista: Usuario[] = data.data || []
      setUsuarios(lista)
      setFiltered(lista)
    } catch { alertMsg("Error", "No se pudieron cargar los usuarios", true) }
    finally   { setLoading(false) }
  }, [api])

  useEffect(() => { if (token) fetchUsuarios() }, [token, fetchUsuarios])

  // ── Búsqueda ────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(usuarios.filter(u =>
      `${u.nombres} ${u.apellidos} ${u.cedula_identidad} ${u.correo_electronico} ${u.rol}`
        .toLowerCase().includes(q)
    ))
  }, [search, usuarios])

  // ── Formulario individual ───────────────────────────────────────
  const handleNew = () => {
    setFormData(initialForm); setEditingId(null)
    setShowForm(true); setShowPass(false); setRolToAdd("")
    setShowBulk(false)
  }

  const handleEdit = (u: Usuario) => {
    setFormData({
      nombres: u.nombres, apellidos: u.apellidos,
      cedula_identidad: u.cedula_identidad, correo_electronico: u.correo_electronico,
      contraseña: "", confirmar_contraseña: "",
      telefono: u.telefono || "", fecha_nacimiento: u.fecha_nacimiento || "",
      direccion: u.direccion || "", facultad: u.facultad || "", carrera: u.carrera || "",
      roles: u.roles?.length ? u.roles : [u.rol],
      estado: u.estado ? "activo" : "inactivo",
    })
    setEditingId(u.id); setShowForm(true); setShowPass(false)
    setRolToAdd(""); setShowBulk(false)
  }

  const addRol = () => {
    if (!rolToAdd || formData.roles.includes(rolToAdd)) return
    setFormData(p => ({ ...p, roles: [...p.roles, rolToAdd] }))
    setRolToAdd("")
  }

  const removeRol = (r: string) =>
    setFormData(p => ({ ...p, roles: p.roles.filter(x => x !== r) }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombres.trim() || !formData.apellidos.trim())
      return alertMsg("Error", "Nombres y apellidos son obligatorios", true)
    if (!formData.cedula_identidad.trim())
      return alertMsg("Error", "La cédula de identidad es obligatoria", true)
    if (!formData.correo_electronico.trim())
      return alertMsg("Error", "El correo electrónico es obligatorio", true)
    if (formData.roles.length === 0)
      return alertMsg("Error", "Debe asignar al menos un rol", true)
    if (!editingId && !formData.contraseña)
      return alertMsg("Error", "La contraseña es obligatoria para nuevos usuarios", true)
    if (formData.contraseña) {
      if (formData.contraseña.length < 6)
        return alertMsg("Error", "La contraseña debe tener al menos 6 caracteres", true)
      if (formData.contraseña !== formData.confirmar_contraseña)
        return alertMsg("Error", "Las contraseñas no coinciden", true)
    }

    const payload: Record<string, unknown> = {
      nombres: formData.nombres.trim(), apellidos: formData.apellidos.trim(),
      cedula_identidad: formData.cedula_identidad.trim(),
      correo_electronico: formData.correo_electronico.trim(),
      roles: formData.roles, rol: formData.roles[0],
      estado: formData.estado === "activo",
      ...(formData.telefono       && { telefono:        formData.telefono.trim() }),
      ...(formData.fecha_nacimiento && { fecha_nacimiento: formData.fecha_nacimiento }),
      ...(formData.direccion      && { direccion:        formData.direccion.trim() }),
      ...(formData.facultad       && { facultad:         formData.facultad.trim() }),
      ...(formData.carrera        && { carrera:          formData.carrera.trim() }),
    }
    if (!editingId || formData.contraseña) payload.contraseña = formData.contraseña

    try {
      setSubmitting(true)
      const res = await api(editingId ? `/usuarios/${editingId}` : "/usuarios", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Error al guardar")
      }
      alertMsg("Éxito", editingId ? "Usuario actualizado" : "Usuario registrado")
      setShowForm(false); setEditingId(null); setFormData(initialForm)
      fetchUsuarios()
    } catch (err: unknown) {
      alertMsg("Error", err instanceof Error ? err.message : "Error al guardar", true)
    } finally { setSubmitting(false) }
  }

  const handleToggleStatus = async (u: Usuario) => {
    if (!confirm(`¿${u.estado ? "Desactivar" : "Activar"} a ${u.nombres} ${u.apellidos}?`)) return
    try {
      setLoading(true)
      await api(`/usuarios/${u.id}/estado`, { method: "PATCH" })
      fetchUsuarios()
    } catch { alertMsg("Error", "No se pudo cambiar el estado", true) }
    finally { setLoading(false) }
  }

  const handleDelete = async (u: Usuario) => {
    if (!confirm(`¿Eliminar definitivamente a ${u.nombres} ${u.apellidos}?`)) return
    try {
      setLoading(true)
      const res = await api(`/usuarios/${u.id}`, { method: "DELETE" })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message) }
      alertMsg("Éxito", "Usuario eliminado")
      fetchUsuarios()
    } catch (err: unknown) {
      alertMsg("Error", err instanceof Error ? err.message : "Error al eliminar", true)
    } finally { setLoading(false) }
  }

  // ── Carga masiva ────────────────────────────────────────────────

  /** Genera y descarga la plantilla Excel */
  const descargarPlantilla = () => {
    const encabezados = [
      "nombres", "apellidos", "cedula_identidad", "correo_electronico",
      "contraseña", "roles", "telefono", "fecha_nacimiento", "facultad", "carrera", "direccion",
    ]
    const ejemplos = [
      ["Juan Carlos", "Pérez López",  "1234567890", "juan.perez@unesum.edu.ec",  "Pass123", "docente",                "0991234567", "1985-03-15", "Ciencias Técnicas", "Ingeniería en Sistemas", "Machala"],
      ["María Elena", "Torres Vega",  "0987654321", "maria.torres@unesum.edu.ec", "Pass456", "comision,docente",       "0997654321", "1990-07-22", "Ciencias Técnicas", "Ing. en Sistemas",       "Machala"],
      ["Carlos",      "Mendoza Ruiz", "1112223334", "c.mendoza@unesum.edu.ec",    "Pass789", "decano",                 "",           "1978-01-10", "Ciencias Técnicas", "",                       ""],
      ["Ana Lucia",   "Salas Mora",   "5556667778", "ana.salas@unesum.edu.ec",    "Pass000", "administrador",          "0999988877", "",           "",                  "",                       ""],
      ["Roberto",     "Castillo Diaz","9998887776", "r.castillo@unesum.edu.ec",   "Pass111", "subdecano",              "",           "",           "",                  "",                       ""],
    ]
    const ws = XLSX.utils.aoa_to_sheet([encabezados, ...ejemplos])
    ws["!cols"] = encabezados.map((_, i) => ({ wch: [18,18,18,30,12,28,14,16,22,24,16][i] || 16 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios")

    // Hoja de referencia de roles
    const rolesRef = [
      ["Código de rol", "Descripción"],
      ...ROLES_DISPONIBLES.map(r => [r.value, r.label]),
      [],
      ["NOTA:", "Para asignar varios roles sepáralos con coma. Ej: docente,comision"],
      ["NOTA:", "El primer rol es el rol principal del usuario."],
    ]
    const wsRoles = XLSX.utils.aoa_to_sheet(rolesRef)
    wsRoles["!cols"] = [{ wch: 22 }, { wch: 35 }]
    XLSX.utils.book_append_sheet(wb, wsRoles, "Roles disponibles")

    XLSX.writeFile(wb, "plantilla_usuarios_masivos.xlsx")
  }

  /** Lee el archivo Excel y valida cada fila */
  const leerArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target?.result, { type: "binary" })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" })

        const parsed: FilaImportada[] = rows.map((row, idx) => {
          const fila: FilaImportada = {
            _fila:             idx + 2,
            nombres:           String(row["nombres"]           || "").trim(),
            apellidos:         String(row["apellidos"]         || "").trim(),
            cedula_identidad:  String(row["cedula_identidad"]  || "").trim(),
            correo_electronico:String(row["correo_electronico"]|| "").trim(),
            contraseña:        String(row["contraseña"]        || "").trim(),
            roles:             String(row["roles"]             || "").trim(),
            telefono:          String(row["telefono"]          || "").trim(),
            fecha_nacimiento:  String(row["fecha_nacimiento"]  || "").trim(),
            facultad:          String(row["facultad"]          || "").trim(),
            carrera:           String(row["carrera"]           || "").trim(),
            direccion:         String(row["direccion"]         || "").trim(),
            _estado:           "pendiente",
          }

          const errores: string[] = []
          if (!fila.nombres)            errores.push("nombres vacío")
          if (!fila.apellidos)          errores.push("apellidos vacío")
          if (!fila.cedula_identidad)   errores.push("cédula vacía")
          if (!fila.correo_electronico) errores.push("correo vacío")
          if (!fila.contraseña || fila.contraseña.length < 6)
                                        errores.push("contraseña inválida (mín. 6 chars)")
          const rolesValidos = validarRoles(fila.roles)
          if (rolesValidos.length === 0) errores.push(`rol inválido: "${fila.roles}"`)

          if (errores.length > 0) {
            fila._error  = errores.join(" · ")
            fila._estado = "error"
          }
          return fila
        })

        setFilas(parsed)
        setResultados([])
        setMostrarResult(false)
        setProgreso(0)
      } catch {
        alertMsg("Error", "No se pudo leer el archivo. Asegúrate de usar la plantilla descargada.", true)
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  /** Importa fila por fila y muestra progreso */
  const importarUsuarios = async () => {
    const validas = filas.filter(f => f._estado !== "error")
    if (validas.length === 0)
      return alertMsg("Error", "No hay filas válidas para importar", true)
    if (!confirm(`¿Importar ${validas.length} usuario(s)? Las filas con error serán omitidas.`)) return

    setImportando(true)
    setProgreso(0)
    const resultado: FilaImportada[] = [...filas]

    for (let i = 0; i < resultado.length; i++) {
      const f = resultado[i]
      if (f._estado === "error") continue

      const rolesArr = validarRoles(f.roles)
      const payload: Record<string, unknown> = {
        nombres: f.nombres, apellidos: f.apellidos,
        cedula_identidad: f.cedula_identidad,
        correo_electronico: f.correo_electronico,
        contraseña: f.contraseña,
        roles: rolesArr, rol: rolesArr[0], estado: true,
        ...(f.telefono       && { telefono:         f.telefono }),
        ...(f.fecha_nacimiento && { fecha_nacimiento: f.fecha_nacimiento }),
        ...(f.facultad       && { facultad:          f.facultad }),
        ...(f.carrera        && { carrera:           f.carrera }),
        ...(f.direccion      && { direccion:         f.direccion }),
      }

      try {
        const res = await api("/usuarios", { method: "POST", body: JSON.stringify(payload) })
        if (res.ok) {
          resultado[i] = { ...f, _estado: "ok", _msg: "Creado correctamente" }
        } else {
          const err = await res.json().catch(() => ({}))
          resultado[i] = { ...f, _estado: "error", _msg: err.message || "Error del servidor" }
        }
      } catch {
        resultado[i] = { ...f, _estado: "error", _msg: "Sin conexión al servidor" }
      }

      setProgreso(Math.round(((i + 1) / resultado.length) * 100))
      setResultados([...resultado])
    }

    setImportando(false)
    setMostrarResult(true)
    fetchUsuarios()
    alertMsg(
      "Importación completada",
      `✔ ${resultado.filter(f => f._estado === "ok").length} creados  ·  ` +
      `✖ ${resultado.filter(f => f._estado === "error").length} con error`
    )
  }

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  const rolesNoAgregados = ROLES_DISPONIBLES.filter(r => !formData.roles.includes(r.value))
  const filasValidas   = filas.filter(f => f._estado !== "error").length
  const filasConError  = filas.filter(f => f._estado === "error").length
  const importados     = resultados.filter(f => f._estado === "ok").length
  const fallidos       = resultados.filter(f => f._estado === "error" && f._msg).length

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Encabezado */}
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold">GESTIÓN DE USUARIOS</h1>
              <p className="text-emerald-100 text-sm mt-0.5">
                Registra y administra todos los usuarios del sistema
              </p>
            </div>
            <Badge className="bg-white text-emerald-700 text-sm px-3 py-1">
              {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6 space-y-6">

            {/* ── Barra de acciones ── */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, cédula, correo, rol..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleNew}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  NUEVO USUARIO
                </Button>
                <Button
                  onClick={() => { setShowBulk(b => !b); setShowForm(false) }}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CARGA MASIVA
                  {showBulk
                    ? <ChevronUp className="h-4 w-4 ml-1" />
                    : <ChevronDown className="h-4 w-4 ml-1" />}
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/admin")}>
                  <Home className="h-4 w-4 mr-2" />
                  MENÚ
                </Button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                PANEL DE CARGA MASIVA
            ════════════════════════════════════════════════════ */}
            {showBulk && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Carga Masiva de Usuarios desde Excel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Paso 1 — Descargar plantilla */}
                  <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-blue-100">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 mb-1">Descargar la plantilla Excel</p>
                      <p className="text-sm text-gray-500 mb-3">
                        Contiene las columnas requeridas y ejemplos para todos los tipos de usuario.
                        La hoja <em>"Roles disponibles"</em> lista todos los códigos aceptados.
                      </p>
                      <Button
                        onClick={descargarPlantilla}
                        variant="outline"
                        className="border-blue-400 text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar plantilla .xlsx
                      </Button>
                    </div>
                  </div>

                  {/* Paso 2 — Subir archivo */}
                  <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-blue-100">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 mb-1">Completar y subir el archivo</p>
                      <p className="text-sm text-gray-500 mb-3">
                        Rellena los datos en la plantilla y sube el archivo. El sistema validará
                        cada fila antes de importar.
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={leerArchivo}
                      />
                      <Button
                        onClick={() => fileRef.current?.click()}
                        variant="outline"
                        className="border-blue-400 text-blue-700 hover:bg-blue-50"
                        disabled={importando}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Seleccionar archivo Excel / CSV
                      </Button>
                    </div>
                  </div>

                  {/* Vista previa */}
                  {filas.length > 0 && (
                    <div className="space-y-3">
                      {/* Resumen */}
                      <div className="flex flex-wrap gap-3 items-center">
                        <Badge className="bg-blue-100 text-blue-800 text-sm px-3">
                          {filas.length} fila{filas.length !== 1 ? "s" : ""} leídas
                        </Badge>
                        {filasValidas > 0 && (
                          <Badge className="bg-green-100 text-green-800 text-sm px-3">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />
                            {filasValidas} válida{filasValidas !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {filasConError > 0 && (
                          <Badge className="bg-red-100 text-red-800 text-sm px-3">
                            <AlertTriangle className="h-3.5 w-3.5 mr-1 inline" />
                            {filasConError} con error
                          </Badge>
                        )}
                      </div>

                      {/* Tabla previa */}
                      <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-72">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 text-xs">
                              <TableHead className="w-10">#</TableHead>
                              <TableHead>Nombre completo</TableHead>
                              <TableHead>Cédula</TableHead>
                              <TableHead>Correo</TableHead>
                              <TableHead>Roles</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(mostrarResult ? resultados : filas).map((f) => (
                              <TableRow
                                key={f._fila}
                                className={
                                  f._estado === "ok"    ? "bg-green-50" :
                                  f._estado === "error" ? "bg-red-50"   : ""
                                }
                              >
                                <TableCell className="text-xs text-gray-400">{f._fila}</TableCell>
                                <TableCell className="text-sm font-medium">
                                  {f.nombres} {f.apellidos}
                                </TableCell>
                                <TableCell className="text-xs">{f.cedula_identidad}</TableCell>
                                <TableCell className="text-xs">{f.correo_electronico}</TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex flex-wrap gap-1">
                                    {f.roles.split(",").map(r => r.trim()).filter(Boolean).map(r => (
                                      <Badge key={r} variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 px-1">
                                        {ROLE_LABEL[r] || r}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {f._estado === "ok" && (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Creado
                                    </span>
                                  )}
                                  {f._estado === "error" && (
                                    <span className="text-red-600 flex items-center gap-1" title={f._error || f._msg}>
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      {f._msg || f._error}
                                    </span>
                                  )}
                                  {f._estado === "pendiente" && (
                                    <span className="text-gray-400">Pendiente</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Barra de progreso */}
                      {importando && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Importando...</span>
                            <span>{progreso}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Paso 3 — Importar */}
                      {!mostrarResult && (
                        <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-blue-100">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 mb-1">Importar usuarios</p>
                            <p className="text-sm text-gray-500 mb-3">
                              Se crearán {filasValidas} usuario(s).
                              {filasConError > 0 && ` Las ${filasConError} fila(s) con error serán omitidas.`}
                            </p>
                            <Button
                              onClick={importarUsuarios}
                              disabled={importando || filasValidas === 0}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {importando
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando {progreso}%...</>
                                : <><Upload className="h-4 w-4 mr-2" />IMPORTAR {filasValidas} USUARIO{filasValidas !== 1 ? "S" : ""}</>
                              }
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Resumen final */}
                      {mostrarResult && (
                        <div className="flex flex-wrap gap-3 p-4 bg-white rounded-lg border border-gray-200">
                          <div className="text-sm font-medium text-gray-700">Resultado de la importación:</div>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />
                            {importados} creados correctamente
                          </Badge>
                          {fallidos > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1 inline" />
                              {fallidos} con error
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setFilas([]); setResultados([]); setMostrarResult(false) }}
                          >
                            Nueva importación
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════
                FORMULARIO INDIVIDUAL
            ════════════════════════════════════════════════════ */}
            {showForm && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-emerald-800 flex items-center justify-between">
                    {editingId ? "Editar Usuario" : "Registrar Nuevo Usuario"}
                    <Button variant="ghost" size="sm"
                      onClick={() => { setShowForm(false); setEditingId(null); setFormData(initialForm) }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Nombres *</Label>
                        <Input placeholder="Ej. Juan Carlos"
                          value={formData.nombres}
                          onChange={e => setFormData(p => ({ ...p, nombres: e.target.value }))} required />
                      </div>
                      <div className="space-y-1">
                        <Label>Apellidos *</Label>
                        <Input placeholder="Ej. Pérez López"
                          value={formData.apellidos}
                          onChange={e => setFormData(p => ({ ...p, apellidos: e.target.value }))} required />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Cédula de Identidad *</Label>
                        <Input placeholder="1234567890"
                          value={formData.cedula_identidad}
                          onChange={e => setFormData(p => ({ ...p, cedula_identidad: e.target.value }))} required maxLength={20} />
                      </div>
                      <div className="space-y-1">
                        <Label>Correo Electrónico *</Label>
                        <Input type="email" placeholder="usuario@ejemplo.com"
                          value={formData.correo_electronico}
                          onChange={e => setFormData(p => ({ ...p, correo_electronico: e.target.value }))} required />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Contraseña {editingId ? "(vacío = no cambiar)" : "*"}</Label>
                        <div className="relative">
                          <Input type={showPass ? "text" : "password"} placeholder="Mínimo 6 caracteres"
                            value={formData.contraseña}
                            onChange={e => setFormData(p => ({ ...p, contraseña: e.target.value }))}
                            required={!editingId} minLength={editingId && !formData.contraseña ? undefined : 6} />
                          <button type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            onClick={() => setShowPass(p => !p)}>
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Confirmar Contraseña</Label>
                        <Input type={showPass ? "text" : "password"} placeholder="Repite la contraseña"
                          value={formData.confirmar_contraseña}
                          onChange={e => setFormData(p => ({ ...p, confirmar_contraseña: e.target.value }))}
                          required={!!formData.contraseña} />
                      </div>
                    </div>

                    {/* Roles */}
                    <div className="space-y-2">
                      <Label>Roles del usuario *</Label>
                      <div className="flex flex-wrap gap-2 min-h-[36px] p-2 bg-white rounded border border-gray-200">
                        {formData.roles.length === 0
                          ? <span className="text-sm text-gray-400">Sin roles asignados</span>
                          : formData.roles.map(r => (
                            <Badge key={r} className="bg-emerald-100 text-emerald-800 flex items-center gap-1 pr-1">
                              {ROLE_LABEL[r] || r}
                              <button type="button" onClick={() => removeRol(r)} className="ml-1 hover:text-red-600">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        }
                      </div>
                      <div className="flex gap-2">
                        <Select value={rolToAdd} onValueChange={setRolToAdd}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar rol..." />
                          </SelectTrigger>
                          <SelectContent>
                            {rolesNoAgregados.map(r => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={addRol} disabled={!rolToAdd} variant="outline"
                          className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                          <Plus className="h-4 w-4 mr-1" /> Agregar
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        El primer rol es el rol principal. Puedes asignar múltiples roles.
                      </p>
                    </div>

                    {/* Datos opcionales */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label>Teléfono</Label>
                        <Input placeholder="0999999999" value={formData.telefono}
                          onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))} maxLength={20} />
                      </div>
                      <div className="space-y-1">
                        <Label>Fecha de Nacimiento</Label>
                        <Input type="date" value={formData.fecha_nacimiento}
                          onChange={e => setFormData(p => ({ ...p, fecha_nacimiento: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Estado</Label>
                        <Select value={formData.estado}
                          onValueChange={(v: "activo" | "inactivo") => setFormData(p => ({ ...p, estado: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="inactivo">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label>Facultad</Label>
                        <Input placeholder="Ej. Ciencias Técnicas" value={formData.facultad}
                          onChange={e => setFormData(p => ({ ...p, facultad: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Carrera</Label>
                        <Input placeholder="Ej. Ing. en Sistemas" value={formData.carrera}
                          onChange={e => setFormData(p => ({ ...p, carrera: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Dirección</Label>
                        <Input placeholder="Ciudad, Provincia" value={formData.direccion}
                          onChange={e => setFormData(p => ({ ...p, direccion: e.target.value }))} />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={submitting}>
                        {submitting
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />GUARDANDO...</>
                          : <><Save className="h-4 w-4 mr-2" />{editingId ? "ACTUALIZAR" : "REGISTRAR"}</>}
                      </Button>
                      <Button type="button" variant="outline"
                        onClick={() => { setShowForm(false); setEditingId(null); setFormData(initialForm) }}
                        disabled={submitting}>
                        <X className="h-4 w-4 mr-2" /> CANCELAR
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════
                TABLA DE USUARIOS
            ════════════════════════════════════════════════════ */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Usuarios registrados — {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Nombre Completo</TableHead>
                          <TableHead>Cédula</TableHead>
                          <TableHead>Correo</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((u, idx) => (
                          <TableRow key={u.id} className="hover:bg-gray-50">
                            <TableCell className="text-gray-400 text-sm">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{u.nombres} {u.apellidos}</TableCell>
                            <TableCell className="text-sm text-gray-600">{u.cedula_identidad}</TableCell>
                            <TableCell className="text-sm text-gray-600">{u.correo_electronico}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(u.roles?.length ? u.roles : [u.rol]).map(r => (
                                  <Badge key={r} variant="outline"
                                    className="text-xs border-emerald-300 text-emerald-700">
                                    {ROLE_LABEL[r] || r}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={u.estado
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"}>
                                {u.estado ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(u)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50" title="Editar">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleToggleStatus(u)}
                                  className={u.estado
                                    ? "text-orange-600 border-orange-200 hover:bg-orange-50"
                                    : "text-green-600 border-green-200 hover:bg-green-50"}
                                  title={u.estado ? "Desactivar" : "Activar"}>
                                  {u.estado ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDelete(u)}
                                  className="text-red-600 border-red-200 hover:bg-red-50" title="Eliminar">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                              {search
                                ? "No se encontraron usuarios con ese criterio"
                                : "No hay usuarios registrados"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
