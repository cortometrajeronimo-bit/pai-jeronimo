// Layout para rutas de autenticación: centrado, minimal
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-acento tracking-tight">P.A.I.</h1>
          <p className="text-sm text-textoSec mt-1">
            Producer Assistant Intelligence · JERÓNIMO
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
