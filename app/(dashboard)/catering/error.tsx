"use client";

import { useEffect } from "react";

export default function CateringError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Catering Route Error:", error);
  }, [error]);

  return (
    <div className="p-6 bg-red-950 text-red-100 rounded-md border border-red-500 m-4">
      <h2 className="text-xl font-bold mb-4">Error Inesperado en Catering</h2>
      <p className="mb-2">Ha ocurrido un error en el cliente:</p>
      <pre className="bg-black p-4 rounded overflow-auto text-xs whitespace-pre-wrap">
        {error.message}
        {"\n"}
        {error.stack}
      </pre>
      <button
        className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
        onClick={() => reset()}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
