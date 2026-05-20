<template>
  <div class="triggers-view">
    <!-- Header -->
    <div class="page-header mb-5">
      <div>
        <h1 class="page-title">Kịch bản (Triggers)</h1>
        <p class="page-subtitle">
          Khi event xảy ra → engine tự động khởi động sequence/block bạn đã cấu hình
        </p>
      </div>
      <v-btn-toggle v-model="tab" mandatory variant="outlined" density="comfortable" color="primary">
        <v-btn value="configured">
          <v-icon start size="small">mdi-cog-outline</v-icon>
          Đã cấu hình
          <v-chip v-if="configured.length > 0" size="x-small" class="ml-2" color="primary">{{ configured.length }}</v-chip>
        </v-btn>
        <v-btn value="catalog">
          <v-icon start size="small">mdi-shape-outline</v-icon>
          Catalog
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- ─── CATALOG TAB ─── -->
    <div v-if="tab === 'catalog'">
      <div class="catalog-toolbar mb-4">
        <v-text-field
          v-model="catalogSearch"
          placeholder="Tìm trigger theo tên / mô tả..."
          variant="solo-filled"
          density="comfortable"
          flat
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          class="search-field"
        />
        <v-chip-group v-model="categoryFilter" mandatory>
          <v-chip value="all" size="small" variant="elevated">Tất cả</v-chip>
          <v-chip
            v-for="cat in availableCategories"
            :key="cat.key"
            :value="cat.key"
            size="small"
            variant="elevated"
            :prepend-icon="cat.icon"
          >
            {{ cat.label }}
          </v-chip>
        </v-chip-group>
      </div>

      <!-- Cards grouped by category -->
      <div v-for="group in groupedCatalog" :key="group.category" class="mb-6">
        <div class="category-header mb-3">
          <div class="category-color-bar" :style="{ background: CATEGORY_COLOR[group.category].bg }" />
          <span class="category-label">{{ CATEGORY_COLOR[group.category].label }}</span>
          <span class="category-count">{{ group.items.length }}</span>
        </div>

        <div class="catalog-grid">
          <article
            v-for="entry in group.items"
            :key="entry.eventType"
            class="catalog-card"
            :style="{ '--accent': CATEGORY_COLOR[entry.category].bg, '--accent-tint': CATEGORY_COLOR[entry.category].tint }"
          >
            <div class="catalog-card__head">
              <div class="catalog-card__icon" :style="{ background: CATEGORY_COLOR[entry.category].tint, color: CATEGORY_COLOR[entry.category].text }">
                <v-icon size="22">{{ iconForEvent(entry.eventType) }}</v-icon>
              </div>
              <span class="catalog-card__binding-chip">
                <v-icon size="12">{{ bindingIcon(entry.recommendedBinding) }}</v-icon>
                {{ bindingLabel(entry.recommendedBinding) }}
              </span>
            </div>
            <h3 class="catalog-card__title">{{ entry.title }}</h3>
            <p class="catalog-card__desc">{{ entry.description }}</p>
            <button class="catalog-card__cta" @click="openCreateFromCatalog(entry)">
              Khởi tạo
              <v-icon size="14">mdi-arrow-right</v-icon>
            </button>
          </article>
        </div>
      </div>

      <div v-if="groupedCatalog.length === 0" class="empty-state">
        <v-icon size="48" color="grey-lighten-1">mdi-magnify-close</v-icon>
        <p>Không tìm thấy trigger phù hợp</p>
      </div>
    </div>

    <!-- ─── CONFIGURED TAB ─── -->
    <div v-else>
      <v-card v-if="loading" class="pa-8 text-center">
        <v-progress-circular indeterminate size="28" color="primary" />
      </v-card>

      <v-card v-else-if="configured.length === 0" class="empty-state-card">
        <v-icon size="64" color="primary" class="mb-3">mdi-lightning-bolt-outline</v-icon>
        <h3 class="text-h6 mb-2">Chưa có trigger nào</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Vào tab <strong>Catalog</strong> để chọn 1 trong {{ catalog.length }} trigger mẫu, hoặc tạo trigger thủ công.
        </p>
        <v-btn color="primary" variant="elevated" @click="tab = 'catalog'">
          <v-icon start>mdi-shape-outline</v-icon>
          Xem catalog
        </v-btn>
      </v-card>

      <v-card v-else class="configured-card">
        <v-table hover>
          <thead>
            <tr>
              <th>Trigger</th>
              <th style="width: 180px">Event</th>
              <th style="width: 220px">Bind tới</th>
              <th style="width: 100px" class="text-center">Bật</th>
              <th style="width: 180px" class="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trig in configured" :key="trig.id">
              <td>
                <div class="d-flex align-center">
                  <div class="trig-icon mr-3" :style="{ background: CATEGORY_COLOR[trig.category].tint, color: CATEGORY_COLOR[trig.category].text }">
                    <v-icon size="18">{{ iconForEvent(trig.eventType) }}</v-icon>
                  </div>
                  <div>
                    <div class="font-weight-medium">{{ trig.name }}</div>
                    <div class="text-caption text-medium-emphasis">{{ CATEGORY_COLOR[trig.category].label }}</div>
                  </div>
                </div>
              </td>
              <td>
                <v-chip size="small" variant="tonal" :color="categoryColorRef(trig.category)">{{ trig.eventType }}</v-chip>
              </td>
              <td>
                <span v-if="trig.sequence" class="binding-link"><v-icon size="14">mdi-format-list-numbered</v-icon> {{ trig.sequence.name }}</span>
                <span v-else-if="trig.broadcast" class="binding-link"><v-icon size="14">mdi-bullhorn</v-icon> {{ trig.broadcast.name }}</span>
                <span v-else-if="trig.blockId" class="binding-link"><v-icon size="14">mdi-puzzle</v-icon> Block</span>
                <span v-else class="text-error text-caption">⚠ Chưa bind</span>
              </td>
              <td class="text-center">
                <v-switch
                  :model-value="trig.enabled"
                  hide-details inline density="compact" color="success"
                  @update:model-value="toggleTrigger(trig)"
                />
              </td>
              <td class="text-right">
                <v-btn icon size="small" variant="text" @click="openEdit(trig)" title="Sửa">
                  <v-icon size="18">mdi-pencil-outline</v-icon>
                </v-btn>
                <v-btn icon size="small" variant="text" color="primary" :disabled="!trig.enabled" @click="onManualRun(trig)" title="Chạy thủ công">
                  <v-icon size="18">mdi-play-circle-outline</v-icon>
                </v-btn>
                <v-btn icon size="small" variant="text" color="error" @click="onDelete(trig)" title="Xoá">
                  <v-icon size="18">mdi-delete-outline</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- Editor dialog -->
    <v-dialog v-model="editorOpen" max-width="640" persistent>
      <v-card v-if="draft">
        <v-card-title class="d-flex align-center">
          <div class="trig-icon mr-3" :style="iconStyleForDraft">
            <v-icon size="22">{{ iconForEvent(draft.eventType) }}</v-icon>
          </div>
          <div>
            <div class="text-h6">{{ draft.id ? 'Sửa Trigger' : 'Tạo Trigger' }}</div>
            <div class="text-caption text-medium-emphasis">{{ draft.eventType }}</div>
          </div>
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="editorOpen = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-text-field v-model="draft.name" label="Tên" variant="outlined" density="comfortable" prepend-inner-icon="mdi-tag-outline" />

          <v-select
            v-model="draft.eventType"
            :items="eventTypeItems"
            label="Event type"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-lightning-bolt-outline"
            class="mt-2"
          />

          <v-select
            v-model="draft.bindingKind"
            :items="bindingKindItems"
            label="Bind tới gì khi event fire"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-link-variant"
            class="mt-2"
          />

          <v-select
            v-if="draft.bindingKind === 'sequence'"
            v-model="draft.sequenceId"
            :items="sequenceOptions"
            label="Sequence sẽ chạy"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-format-list-numbered"
            class="mt-2"
            :no-data-text="'Chưa có sequence enabled — tạo ở tab Kịch bản chăm sóc trước'"
          />
          <v-select
            v-if="draft.bindingKind === 'block'"
            v-model="draft.blockId"
            :items="blockOptions"
            label="Block sẽ chạy"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-puzzle"
            class="mt-2"
            :no-data-text="'Chưa có block — tạo ở tab Thư viện block trước'"
          />

          <v-switch v-model="draft.enabled" label="Bật trigger ngay sau khi lưu" color="success" hide-details class="mt-2" />

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" closable @click:close="error = ''">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="editorOpen = false">Huỷ</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" @click="saveTrigger">
            <v-icon start>mdi-check</v-icon>
            Lưu
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="toastOpen" :color="toastColor" timeout="3000" location="bottom right">
      {{ toastMsg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { triggersApi, sequencesApi, blocksApi } from '@/api/automation';
import type {
  AutomationTrigger, TriggerCatalogEntry, AutomationSequence, Block,
  TriggerEventType, TriggerBindingKind, TriggerCategory,
} from '@/api/automation/types';
import { CATEGORY_COLOR, iconForEvent } from '@/components/automation/phase7/design-tokens';

const tab = ref<'configured' | 'catalog'>('configured');
const catalog = ref<TriggerCatalogEntry[]>([]);
const configured = ref<AutomationTrigger[]>([]);
const sequences = ref<AutomationSequence[]>([]);
const blocks = ref<Block[]>([]);
const loading = ref(true);

const catalogSearch = ref('');
const categoryFilter = ref<'all' | TriggerCategory>('all');

const editorOpen = ref(false);
const saving = ref(false);
const error = ref('');

const toastOpen = ref(false);
const toastMsg = ref('');
const toastColor = ref<'success' | 'error' | 'info'>('info');

interface Draft {
  id: string | null;
  name: string;
  eventType: TriggerEventType;
  category: TriggerCategory;
  bindingKind: TriggerBindingKind;
  sequenceId: string | null;
  blockId: string | null;
  broadcastId: string | null;
  enabled: boolean;
}
const draft = ref<Draft | null>(null);

const availableCategories = computed(() => {
  const present = new Set(catalog.value.map((c) => c.category));
  return Array.from(present).map((key) => ({
    key,
    label: CATEGORY_COLOR[key].label,
    icon: { general: 'mdi-flash', keyword: 'mdi-text-search', bot_api: 'mdi-api', livechat: 'mdi-message-text', genai: 'mdi-robot' }[key] ?? 'mdi-flash',
  }));
});

const filteredCatalog = computed(() => {
  const q = catalogSearch.value?.trim().toLowerCase() ?? '';
  return catalog.value.filter((c) => {
    if (categoryFilter.value !== 'all' && c.category !== categoryFilter.value) return false;
    if (!q) return true;
    return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });
});

const groupedCatalog = computed(() => {
  const map = new Map<TriggerCategory, TriggerCatalogEntry[]>();
  for (const e of filteredCatalog.value) {
    if (!map.has(e.category)) map.set(e.category, []);
    map.get(e.category)!.push(e);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
});

const eventTypeItems = computed(() =>
  catalog.value.map((c) => ({ value: c.eventType, title: `${c.title}  ·  ${c.eventType}` })),
);

const bindingKindItems = [
  { value: 'sequence', title: 'Sequence (multi-step flow)' },
  { value: 'block', title: 'Block (1 action)' },
  { value: 'broadcast', title: 'Broadcast (Phase F)', props: { disabled: true } },
];

const sequenceOptions = computed(() =>
  sequences.value.filter((s) => s.enabled).map((s) => ({ value: s.id, title: s.name })),
);
const blockOptions = computed(() =>
  blocks.value.filter((b) => !b.archivedAt).map((b) => ({ value: b.id, title: b.name })),
);

const iconStyleForDraft = computed(() => {
  if (!draft.value) return {};
  const c = CATEGORY_COLOR[draft.value.category];
  return { background: c.tint, color: c.text };
});

function bindingLabel(b: TriggerBindingKind): string {
  return { sequence: 'Sequence', block: 'Block', broadcast: 'Broadcast' }[b];
}
function bindingIcon(b: TriggerBindingKind): string {
  return { sequence: 'mdi-format-list-numbered', block: 'mdi-puzzle', broadcast: 'mdi-bullhorn' }[b];
}
function categoryColorRef(_cat: TriggerCategory): string {
  return 'primary';
}

async function loadAll() {
  loading.value = true;
  try {
    const [cat, conf, seqs, blks] = await Promise.all([
      triggersApi.listTriggerCatalog(),
      triggersApi.listTriggers(),
      sequencesApi.listSequences(),
      blocksApi.listBlocks({ limit: 500 }),
    ]);
    catalog.value = cat;
    configured.value = conf;
    sequences.value = seqs;
    blocks.value = blks;
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);

function openCreateFromCatalog(entry: TriggerCatalogEntry) {
  draft.value = {
    id: null,
    name: entry.title,
    eventType: entry.eventType,
    category: entry.category,
    bindingKind: entry.recommendedBinding === 'broadcast' ? 'sequence' : entry.recommendedBinding,
    sequenceId: null,
    blockId: null,
    broadcastId: null,
    enabled: false,
  };
  error.value = '';
  editorOpen.value = true;
}

function openEdit(trig: AutomationTrigger) {
  draft.value = {
    id: trig.id,
    name: trig.name,
    eventType: trig.eventType,
    category: trig.category,
    bindingKind: trig.bindingKind,
    sequenceId: trig.sequenceId,
    blockId: trig.blockId,
    broadcastId: trig.broadcastId,
    enabled: trig.enabled,
  };
  error.value = '';
  editorOpen.value = true;
}

function showToast(msg: string, color: 'success' | 'error' | 'info' = 'info') {
  toastMsg.value = msg;
  toastColor.value = color;
  toastOpen.value = true;
}

async function saveTrigger() {
  if (!draft.value) return;
  error.value = '';
  if (!draft.value.name.trim()) { error.value = 'Tên không được rỗng'; return; }
  saving.value = true;
  try {
    const payload = {
      name: draft.value.name.trim(),
      eventType: draft.value.eventType,
      bindingKind: draft.value.bindingKind,
      sequenceId: draft.value.bindingKind === 'sequence' ? draft.value.sequenceId : null,
      blockId: draft.value.bindingKind === 'block' ? draft.value.blockId : null,
      broadcastId: draft.value.bindingKind === 'broadcast' ? draft.value.broadcastId : null,
      enabled: draft.value.enabled,
    };
    if (draft.value.id) {
      await triggersApi.updateTrigger(draft.value.id, payload);
      showToast('Đã lưu thay đổi', 'success');
    } else {
      await triggersApi.createTrigger(payload);
      showToast('Đã tạo trigger', 'success');
    }
    editorOpen.value = false;
    tab.value = 'configured';
    await loadAll();
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Lỗi không xác định';
  } finally {
    saving.value = false;
  }
}

async function toggleTrigger(trig: AutomationTrigger) {
  try {
    if (trig.enabled) await triggersApi.disableTrigger(trig.id);
    else              await triggersApi.enableTrigger(trig.id);
    await loadAll();
    showToast(trig.enabled ? 'Đã tắt' : 'Đã bật', 'success');
  } catch (err: any) {
    showToast(err?.response?.data?.error ?? 'Lỗi toggle', 'error');
  }
}

async function onManualRun(trig: AutomationTrigger) {
  const contactId = prompt(`Chạy "${trig.name}" cho contactId nào? (để trống dùng segmentSpec mặc định)`);
  if (contactId === null) return;
  try {
    await triggersApi.runTrigger(trig.id, contactId ? { contactId } : {});
    showToast('Event đã emit. Worker sẽ pick task trong ~10s.', 'success');
  } catch (err: any) {
    showToast(err?.response?.data?.error ?? err?.message, 'error');
  }
}

async function onDelete(trig: AutomationTrigger) {
  if (!confirm(`Xoá trigger "${trig.name}"?`)) return;
  try {
    await triggersApi.deleteTrigger(trig.id);
    await loadAll();
    showToast('Đã xoá', 'success');
  } catch (err: any) {
    showToast(err?.response?.data?.detail || err?.response?.data?.error || 'Không xoá được', 'error');
  }
}
</script>

<style scoped>
.triggers-view { max-width: 1280px; }

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 4px;
  color: rgb(var(--v-theme-on-surface));
}
.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.catalog-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.search-field {
  max-width: 480px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.category-color-bar {
  width: 4px;
  height: 18px;
  border-radius: 2px;
}
.category-label {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.category-count {
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 11px;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.catalog-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}
.catalog-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--accent);
  opacity: 0;
  transition: opacity 0.15s;
}
.catalog-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -8px rgba(0,0,0,0.12);
}
.catalog-card:hover::before { opacity: 1; }
.catalog-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.catalog-card__icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.catalog-card__binding-chip {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.55);
  background: rgba(var(--v-theme-on-surface), 0.05);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.catalog-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
}
.catalog-card__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.65);
  min-height: 36px;
}
.catalog-card__cta {
  margin-top: auto;
  align-self: flex-start;
  background: var(--accent);
  color: white;
  border: 0;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: filter 0.15s;
}
.catalog-card__cta:hover { filter: brightness(1.1); }

.empty-state {
  text-align: center;
  padding: 64px 16px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.empty-state p { margin-top: 12px; }
.empty-state-card {
  text-align: center;
  padding: 56px 24px;
  border-radius: 16px;
}

.configured-card {
  border-radius: 14px;
  overflow: hidden;
}
.trig-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.binding-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
</style>
