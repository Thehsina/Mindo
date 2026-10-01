export const getAttachmentKind = (name = "") => {
  const lower = String(name).toLowerCase();
  return lower.endsWith(".pdf") ? "pdf" : "image";
};

export const normalizeAttachments = (value = []) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(Boolean)
    .map((attachment, index) => {
      if (!attachment || typeof attachment !== "object") return null;

      const name = attachment.name || `Attachment ${index + 1}`;
      const type = attachment.type || getAttachmentKind(name);
      const dataUrl = attachment.dataUrl || attachment.url || "";

      if (!name && !dataUrl) return null;

      return {
        id: attachment.id || `attachment-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        type,
        dataUrl,
        size: attachment.size || 0,
        createdAt: attachment.createdAt || null,
      };
    })
    .filter(Boolean);
};

export const getAttachmentLabel = (attachment = {}) => attachment?.name || "Attachment";

export const readFileAsDataUrl = (file) => {
  if (!file) {
    return Promise.reject(new Error("No file selected."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
};
