const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.detail || payload.message || `Request failed (${response.status})`);
  }
  return payload;
}

export async function getVictims() {
  return request('/victims');
}

export async function getCamps() {
  return request('/camps');
}

export async function createVictim(form) {
  const age = Math.max(0, Number(form.Age) || 30);
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - age);
  const dob = birth.toISOString().slice(0, 10);
  const priority = String(form.Priority || 'High').toLowerCase();
  const titlePriority = priority.charAt(0).toUpperCase() + priority.slice(1);
  const result = await request('/victims', {
    method: 'POST',
    body: JSON.stringify({ name: form.FullName, dob, gender: 'O', priority: titlePriority }),
  });
  return { success: true, VictimID: result.victimId };
}

export async function fetchStats() {
  return { success: true, stats: await request('/stats') };
}
