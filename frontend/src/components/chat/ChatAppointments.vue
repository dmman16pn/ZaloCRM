<template>
  <div class="chat-appointments">
    <v-divider class="my-3" />
    <div class="d-flex align-center mb-2">
      <v-icon size="16" color="warning" class="mr-1">mdi-calendar-clock</v-icon>
      <span class="text-caption font-weight-bold">Lịch hẹn ({{ appointments.length }})</span>
      <v-spacer />
      <v-btn
        size="x-small"
        :variant="showForm ? 'flat' : 'tonal'"
        color="primary"
        rounded
        @click="showForm = !showForm"
      >
        <v-icon size="14" class="mr-1">{{ showForm ? 'mdi-close' : 'mdi-plus' }}</v-icon>
        {{ showForm ? 'Đóng' : 'Tạo' }}
      </v-btn>
    </div>

    <!-- Quick create form — single datetime-local + quick presets -->
    <div v-if="showForm" class="apt-form">
      <!-- Quick preset chips -->
      <div class="d-flex flex-wrap gap-1 mb-2">
        <v-chip
          v-for="preset in quickPresets"
          :key="preset.label"
          size="x-small"
          variant="outlined"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </v-chip>
      </div>

      <!-- Combined datetime input (cleaner than separate date + time) -->
      <v-text-field
        v-model="createForm.datetime"
        label="Thời gian hẹn"
        type="datetime-local"
        density="compact"
        variant="outlined"
        hide-details
        prepend-inner-icon="mdi-clock-outline"
        class="mb-2"
      />

      <v-text-field
        v-model="createForm.notes"
        label="Ghi chú (tuỳ chọn)"
        density="compact"
        variant="outlined"
        hide-details
        prepend-inner-icon="mdi-text"
        class="mb-2"
        placeholder="VD: Tư vấn căn 2PN view sông"
      />

      <v-btn
        size="small"
        color="warning"
        block
        :disabled="!createForm.datetime"
        :loading="creating"
        @click="submitCreate"
      >
        <v-icon size="14" class="mr-1">mdi-check</v-icon>
        Tạo lịch hẹn
      </v-btn>
    </div>

    <!-- Appointment list — sorted upcoming first, source badge per row -->
    <div
      v-for="apt in sortedAppointments"
      :key="apt.id"
      class="apt-row"
      :class="{ past: isPast(apt) }"
    >
      <div v-if="editingId !== apt.id">
        <!-- Row 1: source badge + status -->
        <div class="d-flex align-center mb-1">
          <v-chip
            v-if="apt.source === 'zalo'"
            size="x-small"
            color="info"
            variant="tonal"
            prepend-icon="mdi-bell-ring"
            class="mr-1"
          >
            {{ apt.emoji || '🔔' }} Zalo
          </v-chip>
          <v-chip
            v-else
            size="x-small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-pencil-outline"
            class="mr-1"
          >
            CRM
          </v-chip>
          <v-spacer />
          <v-chip
            size="x-small"
            :color="statusColor(apt.status)"
            variant="tonal"
          >
            {{ statusLabel(apt.status) }}
          </v-chip>
        </div>

        <!-- Row 2: date/time + edit -->
        <div class="d-flex align-center">
          <div class="flex-grow-1">
            <div class="apt-datetime">
              {{ formatAptDate(apt.appointmentDate) }}
              <span v-if="apt.appointmentTime" class="apt-time">· {{ apt.appointmentTime }}</span>
            </div>
            <div v-if="apt.notes" class="apt-notes">{{ apt.notes }}</div>
          </div>
          <v-btn icon size="x-small" variant="text" color="primary" @click="startEdit(apt)">
            <v-icon size="14">mdi-pencil</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Edit mode -->
      <div v-else>
        <v-text-field
          v-model="editForm.datetime"
          label="Thời gian"
          type="datetime-local"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />
        <v-text-field
          v-model="editForm.notes"
          label="Ghi chú"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />
        <v-select
          v-model="editForm.status"
          :items="statusOptions"
          item-title="title"
          item-value="value"
          label="Trạng thái"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />
        <div class="d-flex gap-1">
          <v-btn size="small" color="warning" :loading="saving" @click="submitEdit(apt.id)">
            Lưu
          </v-btn>
          <v-btn size="small" variant="text" @click="editingId = null">Hủy</v-btn>
        </div>
      </div>
    </div>

    <div v-if="appointments.length === 0 && !showForm" class="apt-empty">
      Chưa có lịch hẹn nào
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { api } from '@/api/index';

export interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string | null;
  type: string | null;
  status: string;
  notes: string | null;
  source?: 'manual' | 'zalo';
  emoji?: string | null;
  externalRef?: string | null;
  zaloMessageId?: string | null;
}

const props = defineProps<{
  contactId: string;
  appointments: Appointment[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const showForm = ref(false);
const creating = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);

const createForm = reactive({ datetime: '', notes: '' });
const editForm = reactive({ datetime: '', notes: '', status: '' });

const statusOptions = [
  { title: 'Sắp tới', value: 'scheduled' },
  { title: 'Hoàn thành', value: 'completed' },
  { title: 'Huỷ', value: 'cancelled' },
  { title: 'Không đến', value: 'no_show' },
];

// Quick presets: render datetime-local string format YYYY-MM-DDTHH:mm
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const quickPresets = computed(() => {
  const now = new Date();
  const today14 = new Date(now); today14.setHours(14, 0, 0, 0);
  const tomorrow9 = new Date(now); tomorrow9.setDate(now.getDate() + 1); tomorrow9.setHours(9, 0, 0, 0);
  const tomorrow14 = new Date(now); tomorrow14.setDate(now.getDate() + 1); tomorrow14.setHours(14, 0, 0, 0);
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7); nextWeek.setHours(9, 0, 0, 0);
  return [
    { label: 'Hôm nay 14:00', value: toLocalInput(today14) },
    { label: 'Mai 09:00', value: toLocalInput(tomorrow9) },
    { label: 'Mai 14:00', value: toLocalInput(tomorrow14) },
    { label: 'Tuần sau', value: toLocalInput(nextWeek) },
  ];
});
function applyPreset(preset: { label: string; value: string }) {
  createForm.datetime = preset.value;
}

const sortedAppointments = computed(() => {
  // Sắp xếp: chưa qua trước (gần nhất lên đầu), đã qua sau (gần nhất lên đầu)
  const now = Date.now();
  const upcoming: Appointment[] = [];
  const past: Appointment[] = [];
  for (const a of props.appointments) {
    if (new Date(a.appointmentDate).getTime() >= now) upcoming.push(a);
    else past.push(a);
  }
  upcoming.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  past.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
  return [...upcoming, ...past];
});

function isPast(apt: Appointment): boolean {
  return new Date(apt.appointmentDate).getTime() < Date.now();
}

function statusColor(s: string): string {
  switch (s) {
    case 'scheduled': return 'blue';
    case 'completed': return 'green';
    case 'cancelled': return 'grey';
    case 'no_show': return 'orange';
    default: return 'grey';
  }
}

function statusLabel(s: string): string {
  return statusOptions.find(o => o.value === s)?.title || s;
}

function formatAptDate(d: string): string {
  return new Date(d).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function startEdit(apt: Appointment) {
  editingId.value = apt.id;
  const baseDate = apt.appointmentDate ? new Date(apt.appointmentDate) : new Date();
  // Nếu có appointmentTime "HH:mm" thì override
  if (apt.appointmentTime) {
    const [hh, mm] = apt.appointmentTime.split(':').map(Number);
    baseDate.setHours(hh || 0, mm || 0, 0, 0);
  }
  editForm.datetime = toLocalInput(baseDate);
  editForm.notes = apt.notes ?? '';
  editForm.status = apt.status;
}

async function submitCreate() {
  if (!createForm.datetime || !props.contactId) return;
  creating.value = true;
  try {
    const dt = new Date(createForm.datetime);
    await api.post('/appointments', {
      contactId: props.contactId,
      appointmentDate: dt.toISOString(),
      appointmentTime: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
      type: 'follow_up',
      notes: createForm.notes || null,
    });
    showForm.value = false;
    createForm.datetime = '';
    createForm.notes = '';
    emit('refresh');
  } catch (err) {
    console.error('Create appointment error:', err);
  } finally {
    creating.value = false;
  }
}

async function submitEdit(appointmentId: string) {
  saving.value = true;
  try {
    const dt = editForm.datetime ? new Date(editForm.datetime) : null;
    await api.put(`/appointments/${appointmentId}`, {
      appointmentDate: dt ? dt.toISOString() : undefined,
      appointmentTime: dt ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : null,
      notes: editForm.notes || null,
      status: editForm.status,
    });
    editingId.value = null;
    emit('refresh');
  } catch (err) {
    console.error('Update appointment error:', err);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.apt-form {
  background: rgba(255, 183, 77, 0.08);
  border: 1px solid rgba(255, 183, 77, 0.2);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
}

.apt-row {
  background: rgba(255, 183, 77, 0.05);
  border: 1px solid rgba(255, 183, 77, 0.15);
  border-radius: 10px;
  padding: 8px 10px;
  margin-bottom: 6px;
  transition: background 0.15s ease;
}
.apt-row.past {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
  opacity: 0.75;
}

.apt-datetime {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
}
.apt-time {
  color: var(--smax-primary, #2962ff);
  font-weight: 500;
}
.apt-notes {
  font-size: 11px;
  color: #757575;
  margin-top: 2px;
  line-height: 1.4;
}

.apt-empty {
  font-size: 11px;
  color: #9e9e9e;
  text-align: center;
  padding: 14px 0;
  font-style: italic;
}
</style>
