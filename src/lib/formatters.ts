/**
 * Utilidades de formato para fechas y monedas
 * Extraídas de componentes admin para reutilización
 */

/**
 * Formatea una fecha ISO a formato legible en español (Colombia)
 * Ejemplo: "15 ene 2024"
 */
export function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formatea un número como moneda COP (pesos colombianos)
 * Ejemplo: "$1.234.567"
 */
export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}
