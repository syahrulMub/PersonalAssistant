export const formatDateTime = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);

  // Validasi jika string tanggal tidak valid
  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Format tanggal saja tanpa jam
 * Contoh hasil: "12 September 2026"
 */
export const formatDateOnly = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
