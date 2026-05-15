<template>
  <div class="activity-item" :class="`cat-${item.category || 'system'}`">
    <span class="act-icon" :style="`color: ${categoryColor}`">{{ icon }}</span>
    <div class="act-body">
      <div class="act-text">
        <strong>{{ actionLabel }}</strong>
        <span v-if="detailsLine" class="act-details" v-html="detailsLine"></span>
      </div>
      <div class="act-meta">
        <span class="act-actor" :title="actorTooltip">{{ actorLabel }}</span>
        <span class="act-sep">·</span>
        <time class="act-time" :title="absTime">{{ relTime }}</time>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ActivityLogItem } from '@/composables/use-timeline';
import { CATEGORY_META, ACTION_META, categoryOf, type ActivityCategory } from '@/constants/activity-types';

const props = defineProps<{ item: ActivityLogItem }>();

const cat = computed<ActivityCategory>(() =>
  (props.item.category as ActivityCategory) || categoryOf(props.item.action),
);
const categoryMeta = computed(() => CATEGORY_META[cat.value]);
const actionMeta = computed(() => ACTION_META[props.item.action] || { label: props.item.action });
const icon = computed(() => actionMeta.value.icon || categoryMeta.value.icon);
const categoryColor = computed(() => categoryMeta.value.color);
const actionLabel = computed(() => actionMeta.value.label);

const actorLabel = computed(() => {
  const it = props.item;
  if (it.actorType === 'user' && it.user) return it.user.fullName || it.user.email || 'Người dùng';
  if (it.actorType === 'bot') return `🤖 ${it.botName || 'Bot'}`;
  if (it.actorType === 'system') return `⚙️ ${it.systemSource || 'Hệ thống'}`;
  return '—';
});
const actorTooltip = computed(() => {
  const it = props.item;
  if (it.actorType === 'user' && it.user) return `User · ${it.user.email}`;
  if (it.actorType === 'bot') return `Bot · ${it.botName || ''}`;
  return `System · ${it.systemSource || ''}`;
});

const relTime = computed(() => {
  const d = new Date(props.item.createdAt).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}n`;
  const dt = new Date(props.item.createdAt);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
});

const absTime = computed(() => new Date(props.item.createdAt).toLocaleString('vi-VN'));

/* Details rendering — pick out common fields based on action type */
const detailsLine = computed(() => {
  const d = props.item.details || {};
  const action = props.item.action;

  // Status change: old → new
  if (action === 'status_change' && (d.old || d.new)) {
    return `: <span class="diff-old">${escape(String(d.old || '—'))}</span> → <span class="diff-new">${escape(String(d.new || '—'))}</span>`;
  }
  // Score change: delta
  if (action === 'score_change') {
    const delta = typeof d.delta === 'number' ? d.delta : 0;
    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? 'green' : 'red';
    return `: <span class="diff-${color}">${sign}${delta}</span> (${d.old} → ${d.new})`;
  }
  // Tag add/remove
  if ((action === 'tag_add_crm' || action === 'tag_remove_crm' || action === 'tag_add_zalo' || action === 'tag_remove_zalo') && d.tag) {
    return `: <em>${escape(String(d.tag))}</em>`;
  }
  // Appointment: show date
  if (action === 'appointment_create' && d.appointmentDate) {
    const dt = new Date(String(d.appointmentDate));
    const time = d.appointmentTime ? ` lúc ${escape(String(d.appointmentTime))}` : '';
    return `: <strong>${dt.toLocaleDateString('vi-VN')}${time}</strong>`;
  }
  if (action === 'appointment_reschedule' && d.oldDate && d.newDate) {
    return `: ${new Date(String(d.oldDate)).toLocaleDateString('vi-VN')} → ${new Date(String(d.newDate)).toLocaleDateString('vi-VN')}`;
  }
  // Customer update: show count of changed fields
  if (action === 'customer_update' && d.changes && typeof d.changes === 'object') {
    const fields = Object.keys(d.changes as Record<string, unknown>);
    return `: ${fields.length} trường (${fields.slice(0, 3).join(', ')}${fields.length > 3 ? '...' : ''})`;
  }
  // Friend alias change
  if (action === 'friend_alias_change' && (d.old !== undefined || d.new !== undefined)) {
    return `: "${escape(String(d.old || ''))}" → "${escape(String(d.new || ''))}"`;
  }
  return '';
});

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}
</script>

<style scoped>
.activity-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12.5px;
  line-height: 1.45;
  transition: background 0.12s;
}
.activity-item:hover {
  background: var(--smax-grey-50, #fafbfc);
}
.act-icon {
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  width: 18px;
  text-align: center;
}
.act-body {
  flex: 1;
  min-width: 0;
}
.act-text {
  color: var(--smax-text, #212121);
  word-break: break-word;
}
.act-text strong {
  font-weight: 600;
}
.act-details {
  color: var(--smax-grey-700);
  margin-left: 2px;
}
.act-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--smax-grey-500);
  margin-top: 1px;
}
.act-sep { color: var(--smax-grey-300); }
.act-actor {
  font-weight: 500;
  cursor: help;
}

/* Diff styling */
.act-details :deep(.diff-old) {
  text-decoration: line-through;
  color: var(--smax-grey-500);
}
.act-details :deep(.diff-new) {
  font-weight: 600;
  color: var(--smax-primary, #2962ff);
}
.act-details :deep(.diff-green) {
  color: #00897b;
  font-weight: 700;
}
.act-details :deep(.diff-red) {
  color: #c62828;
  font-weight: 700;
}
.act-details :deep(em) {
  font-style: normal;
  background: var(--smax-grey-100, #f5f6fa);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}
</style>
