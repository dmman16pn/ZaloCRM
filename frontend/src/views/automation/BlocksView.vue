<template>
  <div class="blocks-view">
    <div class="page-header mb-5">
      <div>
        <h1 class="page-title">Thư viện block</h1>
        <p class="page-subtitle">
          Block là đơn vị action nhỏ nhất (gửi tin, kết bạn, đổi status...). Dùng lại trong nhiều Sequence / Broadcast.
        </p>
      </div>
      <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" @click="openCreate">Tạo Block</v-btn>
    </div>

    <div class="layout-2col">
      <!-- ─── Folder sidebar ─── -->
      <aside class="folder-sidebar">
        <div class="folder-sidebar__head">
          <span class="folder-sidebar__title">Folder</span>
          <v-btn icon size="small" variant="text" @click="createFolderInline" title="Tạo folder">
            <v-icon size="18">mdi-folder-plus</v-icon>
          </v-btn>
        </div>

        <ul class="folder-list">
          <li>
            <button class="folder-item" :class="{ 'is-active': !selectedFolderId && !showArchived }" @click="onSelectAll">
              <v-icon size="16" class="mr-2">mdi-view-grid-outline</v-icon>
              <span class="folder-item__label">Tất cả</span>
              <span class="folder-item__count">{{ allCount }}</span>
            </button>
          </li>
          <li v-for="folder in folders" :key="folder.id">
            <button class="folder-item" :class="{ 'is-active': selectedFolderId === folder.id }" @click="onSelectFolder(folder.id)">
              <v-icon size="16" class="mr-2">mdi-folder</v-icon>
              <span class="folder-item__label">{{ folder.name }}</span>
              <span class="folder-item__count">{{ folder._count?.blocks ?? 0 }}</span>
            </button>
          </li>
          <li>
            <button class="folder-item folder-item--archived" :class="{ 'is-active': showArchived }" @click="onSelectArchived">
              <v-icon size="16" class="mr-2">mdi-archive-outline</v-icon>
              <span class="folder-item__label">Đã archive</span>
            </button>
          </li>
        </ul>
      </aside>

      <!-- ─── Block list ─── -->
      <section class="block-list-section">
        <div class="block-toolbar mb-3">
          <div class="block-toolbar__title">
            {{ selectedFolderName }}
            <span class="block-toolbar__count">{{ filteredBlocks.length }}</span>
          </div>
          <v-chip-group v-model="actionTypeFilter" mandatory>
            <v-chip value="all" size="small" variant="elevated">Tất cả</v-chip>
            <v-chip
              v-for="type in actionTypeChips"
              :key="type.value"
              :value="type.value"
              size="small"
              variant="elevated"
              :prepend-icon="type.icon"
            >
              {{ type.label }}
            </v-chip>
          </v-chip-group>
        </div>

        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate size="28" color="primary" />
        </div>

        <div v-else-if="filteredBlocks.length === 0" class="empty-block-state">
          <v-icon size="48" color="grey-lighten-1">mdi-puzzle-outline</v-icon>
          <p class="mt-2">{{ showArchived ? 'Không có block nào đã archive' : 'Chưa có block nào ở đây' }}</p>
          <v-btn v-if="!showArchived" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openCreate" class="mt-2">
            Tạo block đầu tiên
          </v-btn>
        </div>

        <div v-else class="block-grid">
          <article
            v-for="block in filteredBlocks"
            :key="block.id"
            class="block-card"
            :style="cardStyleFor(block.actionType)"
            :class="{ 'is-archived': block.archivedAt }"
          >
            <div class="block-card__icon">
              <v-icon size="20">{{ ACTION_TYPE_ICONS[block.actionType] }}</v-icon>
            </div>
            <div class="block-card__body">
              <div class="block-card__name">{{ block.name }}</div>
              <div class="block-card__meta">
                <span class="block-card__type">{{ ACTION_TYPE_LABELS[block.actionType] }}</span>
                <span v-if="block.usageCount > 0" class="block-card__usage">
                  <v-icon size="11">mdi-link-variant</v-icon> {{ block.usageCount }}
                </span>
                <span v-if="block.archivedAt" class="block-card__archived-badge">archived</span>
              </div>
            </div>
            <div class="block-card__actions">
              <v-btn icon size="x-small" variant="text" @click="openEdit(block)" title="Sửa">
                <v-icon size="16">mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn icon size="x-small" variant="text" @click="onDuplicate(block)" title="Nhân bản">
                <v-icon size="16">mdi-content-copy</v-icon>
              </v-btn>
              <v-btn v-if="!block.archivedAt" icon size="x-small" variant="text" @click="onArchive(block)" title="Archive">
                <v-icon size="16">mdi-archive-arrow-down-outline</v-icon>
              </v-btn>
              <v-btn v-else icon size="x-small" variant="text" color="success" @click="onUnarchive(block)" title="Bỏ archive">
                <v-icon size="16">mdi-archive-arrow-up-outline</v-icon>
              </v-btn>
            </div>
          </article>
        </div>
      </section>
    </div>

    <BlockEditorDialog
      v-model="editorOpen"
      :block="editingBlock"
      :folders="folders"
      :status-items="statusItems"
      @saved="onSaved"
    />

    <v-snackbar v-model="toastOpen" :color="toastColor" timeout="3000" location="bottom right">
      {{ toastMsg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { blocksApi } from '@/api/automation';
import { ACTION_TYPE_LABELS, ACTION_TYPE_ICONS, SUPPORTED_ACTION_TYPES, type Block, type BlockFolder, type BlockActionType } from '@/api/automation/types';
import BlockEditorDialog from '@/components/automation/phase7/BlockEditorDialog.vue';
import { ACTION_TYPE_COLOR } from '@/components/automation/phase7/design-tokens';
import { api } from '@/api';

const blocks = ref<Block[]>([]);
const folders = ref<BlockFolder[]>([]);
const statusItems = ref<Array<{ id: string; name: string }>>([]);
const loading = ref(true);

const selectedFolderId = ref<string | null>(null);
const showArchived = ref(false);
const actionTypeFilter = ref<BlockActionType | 'all'>('all');

const editorOpen = ref(false);
const editingBlock = ref<Block | null>(null);

const toastOpen = ref(false);
const toastMsg = ref('');
const toastColor = ref<'success' | 'error' | 'info'>('info');

const actionTypeChips = SUPPORTED_ACTION_TYPES.map((value) => ({
  value,
  label: ACTION_TYPE_LABELS[value],
  icon: ACTION_TYPE_ICONS[value],
}));

const selectedFolderName = computed(() => {
  if (showArchived.value) return 'Đã archive';
  if (!selectedFolderId.value) return 'Tất cả block';
  return folders.value.find((f) => f.id === selectedFolderId.value)?.name ?? 'Folder';
});

const allCount = computed(() => blocks.value.filter((b) => !b.archivedAt).length);

const filteredBlocks = computed(() => {
  return blocks.value.filter((b) => {
    if (showArchived.value) { if (!b.archivedAt) return false; }
    else { if (b.archivedAt) return false; }
    if (selectedFolderId.value !== null && b.folderId !== selectedFolderId.value) return false;
    if (actionTypeFilter.value !== 'all' && b.actionType !== actionTypeFilter.value) return false;
    return true;
  });
});

function cardStyleFor(actionType: BlockActionType): Record<string, string> {
  const c = ACTION_TYPE_COLOR[actionType];
  return { '--card-accent': c.bg, '--card-tint': c.tint, '--card-text': c.text };
}

function onSelectAll() { selectedFolderId.value = null; showArchived.value = false; }
function onSelectFolder(id: string) { selectedFolderId.value = id; showArchived.value = false; }
function onSelectArchived() { showArchived.value = true; selectedFolderId.value = null; }

async function loadAll() {
  loading.value = true;
  try {
    const [b, f, statusRes] = await Promise.all([
      blocksApi.listBlocks({ includeArchived: true, limit: 500 }),
      blocksApi.listFolders(),
      api.get<{ statuses: Array<{ id: string; name: string }> }>('/statuses').then((r) => r.data.statuses).catch(() => []),
    ]);
    blocks.value = b;
    folders.value = f;
    statusItems.value = Array.isArray(statusRes) ? statusRes : [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);

function openCreate() {
  editingBlock.value = null;
  editorOpen.value = true;
}
function openEdit(block: Block) {
  editingBlock.value = block;
  editorOpen.value = true;
}

function showToast(msg: string, color: 'success' | 'error' | 'info' = 'info') {
  toastMsg.value = msg; toastColor.value = color; toastOpen.value = true;
}

function onSaved(_block: Block) { loadAll(); showToast('Đã lưu block', 'success'); }

async function onDuplicate(block: Block) {
  await blocksApi.duplicateBlock(block.id);
  loadAll();
  showToast('Đã nhân bản', 'success');
}
async function onArchive(block: Block) {
  if (!confirm(`Archive block "${block.name}"? Task đang chạy vẫn dùng snapshot — không bị ảnh hưởng.`)) return;
  await blocksApi.archiveBlock(block.id);
  loadAll();
  showToast('Đã archive', 'success');
}
async function onUnarchive(block: Block) {
  await blocksApi.unarchiveBlock(block.id);
  loadAll();
  showToast('Đã unarchive', 'success');
}

async function createFolderInline() {
  const name = prompt('Tên folder?');
  if (!name?.trim()) return;
  await blocksApi.createFolder({ name: name.trim() });
  loadAll();
  showToast('Đã tạo folder', 'success');
}
</script>

<style scoped>
.blocks-view { max-width: 1280px; }

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.page-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: rgb(var(--v-theme-on-surface)); }
.page-subtitle { margin: 0; font-size: 13px; color: rgba(var(--v-theme-on-surface), 0.6); }

.layout-2col {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
}

.folder-sidebar {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 12px;
  padding: 14px 12px;
  height: fit-content;
  position: sticky;
  top: 12px;
}
.folder-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
}
.folder-sidebar__title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.folder-list { list-style: none; padding: 0; margin: 0; }
.folder-list li { margin: 0; }
.folder-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.78);
  text-align: left;
  transition: background 0.1s;
}
.folder-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.folder-item.is-active {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.folder-item__label { flex: 1; }
.folder-item__count {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 2px 7px;
  border-radius: 8px;
}
.folder-item.is-active .folder-item__count {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.15);
}
.folder-item--archived { margin-top: 8px; border-top: 1px dashed rgba(var(--v-theme-on-surface), 0.1); padding-top: 12px; }

.block-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.block-toolbar__title {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}
.block-toolbar__count {
  font-size: 12px;
  margin-left: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 2px 8px;
  border-radius: 10px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.block-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}
.block-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.12s;
  position: relative;
}
.block-card::before {
  content: '';
  position: absolute;
  left: 0; top: 12px; bottom: 12px;
  width: 3px;
  border-radius: 2px;
  background: var(--card-accent);
  opacity: 0.85;
}
.block-card:hover {
  border-color: var(--card-accent);
  box-shadow: 0 6px 16px -6px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}
.block-card.is-archived { opacity: 0.6; }

.block-card__icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: var(--card-tint);
  color: var(--card-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.block-card__body { flex: 1; min-width: 0; }
.block-card__name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.block-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 3px;
  font-size: 11.5px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.block-card__usage {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.block-card__archived-badge {
  background: rgba(var(--v-theme-on-surface), 0.08);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.block-card__actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s;
}
.block-card:hover .block-card__actions { opacity: 1; }

.loading-state, .empty-block-state {
  text-align: center;
  padding: 64px 16px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.empty-block-state p { margin: 12px 0 0; }

@media (max-width: 900px) {
  .layout-2col { grid-template-columns: 1fr; }
  .folder-sidebar { position: relative; }
}
</style>
