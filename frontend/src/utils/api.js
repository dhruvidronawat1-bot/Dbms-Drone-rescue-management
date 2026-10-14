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

// Stats & Overview
export async function fetchStats() {
  return { success: true, stats: await request('/stats') };
}

// Drones
export async function getDrones() {
  return request('/drones');
}

export async function createDrone(form) {
  return request('/drones', {
    method: 'POST',
    body: JSON.stringify(form),
  });
}

export async function updateDrone(id, changes) {
  return request(`/drones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
}

export async function deleteDrone(id) {
  return request(`/drones/${id}`, { method: 'DELETE' });
}

// Missions
export async function getMissions() {
  return request('/missions');
}

export async function createMission(form) {
  return request('/missions', {
    method: 'POST',
    body: JSON.stringify(form),
  });
}

export async function completeMission(id) {
  return request(`/missions/${id}/complete`, { method: 'PUT' });
}

// Victims & SOS
export async function getVictims() {
  return request('/victims');
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
    body: JSON.stringify({
      name: form.FullName || form.name,
      dob,
      gender: form.gender || 'O',
      priority: titlePriority,
      emergencyDetails: form.EmergencyDetails || form.details || '',
    }),
  });
  return { success: true, VictimID: result.victimId };
}

// Relief Camps
export async function getCamps() {
  return request('/camps');
}

export async function createCamp(form) {
  return request('/camps', {
    method: 'POST',
    body: JSON.stringify(form),
  });
}

// Supplies
export async function getSupplies() {
  return request('/supplies');
}

export async function createSupply(form) {
  return request('/supplies', {
    method: 'POST',
    body: JSON.stringify(form),
  });
}

export async function deleteSupply(id) {
  return request(`/supplies/${id}`, { method: 'DELETE' });
}

// Operators
export async function getOperators() {
  return request('/operators');
}

export async function createOperator(form) {
  return request('/operators', {
    method: 'POST',
    body: JSON.stringify(form),
  });
}

// Organizations
export async function getOrganizations() {
  return request('/organizations');
}

// SQL Playground execution
export async function executeSql(sql) {
  return request('/sql', {
    method: 'POST',
    body: JSON.stringify({ sql }),
  });
}
