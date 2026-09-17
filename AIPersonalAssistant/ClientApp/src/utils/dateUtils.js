// Helper Pemformatan Tanggal & Jam Lokal (WIB)

export const formatWibTime = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const time = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const date = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
    return `${time} WIB, ${date}`;
  } catch {
    return null;
  }
};

// Mengonversi Date object atau ISO string ke format string untuk <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
export const toInputDatetimeString = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
};
