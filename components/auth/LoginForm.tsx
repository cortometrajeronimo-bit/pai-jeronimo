"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modoReset, setModoReset] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setError("Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.");
      } else if (error.message.includes("Invalid login credentials")) {
        setError("Email o contraseña incorrectos.");
      } else {
        setError(error.message);
      }
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetEnviado(true);
  }

  if (modoReset) {
    return (
      <Card>
        <CardContent className="pt-6">
          {resetEnviado ? (
            <div className="space-y-4 text-center">
              <p className="text-acento font-semibold">Correo enviado</p>
              <p className="text-sm text-textoSec">
                Revisa <span className="text-texto">{email}</span> y sigue el enlace para crear una nueva contraseña.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setModoReset(false); setResetEnviado(false); }}>
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={onReset} className="space-y-4">
              <p className="text-sm text-textoSec">
                Ingresa tu correo y te enviamos un enlace para restablecer tu contraseña.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email-reset">Email</Label>
                <Input
                  id="email-reset"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cortometrajeronimo@gmail.com"
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
              <button
                type="button"
                onClick={() => setModoReset(false)}
                className="w-full text-center text-sm text-textoSec hover:text-texto"
              >
                Cancelar
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cortometrajeronimo@gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Iniciar sesión"}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setModoReset(true); setError(null); }}
              className="text-textoSec hover:text-acento"
            >
              Olvidé mi contraseña
            </button>
            <Link href="/register" className="text-acento hover:underline">
              Registrarse
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
