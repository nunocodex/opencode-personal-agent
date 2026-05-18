<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface Status {
  status: string;
  sessions: number;
  uptime: number;
}

interface Quota {
  quotaUsed: number;
}

const status = ref<Status>({ status: "unknown", sessions: 0, uptime: 0 });
const quota = ref<Quota>({ quotaUsed: 0 });
const error = ref("");

let statusTimer: ReturnType<typeof setInterval>;

async function fetchStatus() {
  try {
    const res = await fetch("/api/status");
    status.value = await res.json();
    error.value = "";
  } catch {
    error.value = "Unable to connect to server";
  }
}

async function fetchQuota() {
  try {
    const res = await fetch("/api/quota");
    quota.value = await res.json();
  } catch {
    // quota is optional
  }
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

onMounted(() => {
  fetchStatus();
  fetchQuota();
  statusTimer = setInterval(fetchStatus, 5000);
});

onUnmounted(() => {
  clearInterval(statusTimer);
});
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>AI Assistant Dashboard</h1>
      <span :class="['dot', status.status === 'online' ? 'green' : 'red']"></span>
      {{ status.status }}
    </header>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="grid">
      <div class="card">
        <h3>Active Sessions</h3>
        <p class="big">{{ status.sessions }}</p>
      </div>
      <div class="card">
        <h3>Uptime</h3>
        <p class="big">{{ formatUptime(status.uptime) }}</p>
      </div>
      <div class="card">
        <h3>Quota Used</h3>
        <p class="big">${{ quota.quotaUsed.toFixed(2) }}</p>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100vh;
}

.dashboard {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  font-size: 1.2rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.green { background: #4caf50; }
.red { background: #f44336; }

.error {
  background: #f44336;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.card {
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 12px;
  padding: 1.5rem;
}

.card h3 {
  color: #7b8ab8;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.big {
  font-size: 2rem;
  font-weight: 700;
}
</style>
