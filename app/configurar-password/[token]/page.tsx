// Ruta: app/configurar-password/[token]/page.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation" // O el hook de tu router
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, KeyRound } from "lucide-react"

// Hook de toast simulado (reemplaza con tu implementación real)
function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      alert(props.variant === "destructive" ? `Error: ${props.description}` : `${props.title}: ${props.description}`);
    }
  };
}


export default function ConfigurarPasswordPage() {
  const router = useRouter();
  const params = useParams(); // Hook para obtener parámetros de la URL
  const { toast } = useToast();
  
  const token = params.token as string; // Extraemos el token de la URL

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !passwordConfirm) {
      setError("Ambos campos son obligatorios.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
    }

    setLoading(true);

    try {
      // Petición a la nueva ruta del backend
      const response = await fetch(`http://localhost:4000/api/profesores/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, passwordConfirm }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "No se pudo actualizar la contraseña.");
      }

      setSuccess(true);
      toast({
        title: "¡Éxito!",
        description: "Tu contraseña ha sido actualizada. Serás redirigido para iniciar sesión.",
      });

      // Redirigir al login después de unos segundos
      setTimeout(() => {
        router.push('/login'); // Ajusta a tu ruta de login
      }, 3000);

    } catch (err: any) {
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto bg-emerald-100 p-3 rounded-full w-fit mb-4">
            <KeyRound className="h-8 w-8 text-emerald-700" />
          </div>
          <CardTitle className="text-2xl">
            {success ? "Contraseña Actualizada" : "Configura tu Contraseña"}
          </CardTitle>
          <CardDescription>
            {success 
              ? "¡Todo listo! Ya puedes usar tu nueva contraseña para acceder a la plataforma." 
              : "Ingresa una nueva contraseña segura para tu cuenta."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passwordConfirm">Confirmar Contraseña</Label>
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                ) : (
                  "Guardar Contraseña"
                )}
              </Button>
            </form>
          ) : (
             <p className="text-center text-gray-600">Serás redirigido en unos momentos...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}