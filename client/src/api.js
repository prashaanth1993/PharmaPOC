const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3000/server/dam_api/execute';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export async function listAssets(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const data = await request(`/assets?${params}`);
  return data.assets;
}

export async function getAsset(id) {
  const data = await request(`/assets/${id}`);
  return data.asset;
}

export async function getSuggestions(id, assetType) {
  const data = await request(`/assets/${id}/suggestions?assetType=${encodeURIComponent(assetType)}`);
  return data.suggestions;
}

export async function createAsset(formData) {
  const res = await fetch(`${BASE_URL}/assets`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.asset;
}

export async function submitAsset(id, body) {
  return request(`/assets/${id}/submit`, { method: 'POST', body });
}
export async function approveAsset(id, body) {
  return request(`/assets/${id}/approve`, { method: 'POST', body });
}
export async function rejectAsset(id, body) {
  return request(`/assets/${id}/reject`, { method: 'POST', body });
}
export async function delegateAsset(id, body) {
  return request(`/assets/${id}/delegate`, { method: 'POST', body });
}
export async function annotateAsset(id, body) {
  return request(`/assets/${id}/annotate`, { method: 'POST', body });
}
export async function getAnalytics() {
  return request('/admin/analytics');
}
export async function getAudit() {
  const data = await request('/admin/audit');
  return data.audit;
}
export async function getTags() {
  const data = await request('/admin/tags');
  return data.tags;
}
export async function logUsage(body) {
  return request('/usage-log', { method: 'POST', body });
}
