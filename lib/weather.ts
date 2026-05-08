// Clima Tuluá — usa Open-Meteo (gratis, sin API key, sin registro)
// https://open-meteo.com/  |  Tuluá lat: 4.0847  lon: -76.1956

export type Clima = {
  tempC: number;
  tempMin: number;
  tempMax: number;
  codigo: number;
  descripcion: string;
  emoji: string;
  vientoKmh: number;
  precipitacionMm: number;
  ciudad: string;
};

// Mapeo simplificado del código WMO a descripción/emoji
function descripcionWMO(codigo: number): { descripcion: string; emoji: string } {
  if (codigo === 0) return { descripcion: "Despejado", emoji: "☀️" };
  if ([1, 2].includes(codigo)) return { descripcion: "Parcialmente nublado", emoji: "🌤️" };
  if (codigo === 3) return { descripcion: "Nublado", emoji: "☁️" };
  if ([45, 48].includes(codigo)) return { descripcion: "Niebla", emoji: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(codigo))
    return { descripcion: "Llovizna", emoji: "🌦️" };
  if ([61, 63, 65, 66, 67].includes(codigo))
    return { descripcion: "Lluvia", emoji: "🌧️" };
  if ([71, 73, 75, 77].includes(codigo)) return { descripcion: "Nieve", emoji: "🌨️" };
  if ([80, 81, 82].includes(codigo))
    return { descripcion: "Chubascos", emoji: "🌧️" };
  if ([95, 96, 99].includes(codigo))
    return { descripcion: "Tormenta", emoji: "⛈️" };
  return { descripcion: "—", emoji: "🌡️" };
}

export async function climaTulua(): Promise<Clima | null> {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=4.0847&longitude=-76.1956" +
      "&current=temperature_2m,weather_code,wind_speed_10m,precipitation" +
      "&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FBogota";
    const r = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
    if (!r.ok) return null;
    const data = (await r.json()) as {
      current: {
        temperature_2m: number;
        weather_code: number;
        wind_speed_10m: number;
        precipitation: number;
      };
      daily: {
        temperature_2m_max: number[];
        temperature_2m_min: number[];
      };
    };

    const wmo = descripcionWMO(data.current.weather_code);
    return {
      tempC: data.current.temperature_2m,
      tempMin: data.daily.temperature_2m_min[0],
      tempMax: data.daily.temperature_2m_max[0],
      codigo: data.current.weather_code,
      descripcion: wmo.descripcion,
      emoji: wmo.emoji,
      vientoKmh: data.current.wind_speed_10m,
      precipitacionMm: data.current.precipitation,
      ciudad: "Tuluá, Valle del Cauca",
    };
  } catch (err) {
    console.warn("[weather] falló Open-Meteo:", err);
    return null;
  }
}
