export async function api(path, body, method) {
  const response = await fetch(`/api${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      Array.isArray(data.detail)
        ? data.detail
            .map((e) => `${e.loc.slice(1).join(".")}: ${e.msg}`)
            .join(" · ")
        : data.detail || `Request failed (${response.status})`,
    );
  }
  return response.json();
}

export const number = (value) =>
  value == null
    ? "N/A"
    : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(
        value,
      );
export const money = (value) => (value == null ? "N/A" : `₹${number(value)}`);
export const percent = (value) => `${number(value * 100)}%`;
export const label = (value) =>
  String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
