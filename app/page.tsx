import { redirect } from "next/navigation";

// Página raíz: el middleware redirige según sesión.
// Como fallback, mandamos a /login.
export default function Home() {
  redirect("/login");
}
