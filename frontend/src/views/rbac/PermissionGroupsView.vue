<template>
  <div class="dept-page">
    <header class="page-hero">
      <div class="hero-left">
        <h1 class="hero-title">Nhóm quyền</h1>
        <p class="hero-sub">Quản lý các nhóm quyền · Ma trận {{ resources.length }} chức năng × {{ actions.length }} hành động · Áp dụng quyền cho từng user qua nhóm</p>
      </div>
      <div class="hero-actions">
        <button class="btn-ghost" :disabled="seeding" @click="seedDefaults">
          {{ seeding ? 'Đang seed...' : '⚙ Seed 7 nhóm mặc định' }}
        </button>
        <button class="btn-primary" @click="openCreate(null)">
          <span class="btn-icon">+</span> Thêm nhóm quyền
        </button>
      </div>
    </header>

    <section class="stats-row" v-if="!loading && stats.total > 0">
      <div class="stat-card stat-primary">
        <div class="stat-label">Tổng nhóm</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-card stat-forest">
        <div class="stat-label">Nhóm hệ thống</div>
        <div class="stat-value">{{ stats.system }}<span class="stat-unit"> / {{ stats.total }}</span></div>
      </div>
      <div class="stat-card stat-mustard">
        <div class="stat-label">Tổng user đã gán</div>
        <div class="stat-value">{{ stats.totalMembers }}</div>
      </div>
      <div class="stat-card stat-cream">
        <div class="stat-label">Slot quyền tối đa</div>
        <div class="stat-value">{{ totalSlots }}<span class="stat-unit"> / nhóm</span></div>
      </div>
    </section>

    <!-- Toolbar -->
    <div class="toolbar" v-if="!loading && store.permissionGroups.length > 0">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="searchQ" placeholder="Tìm nhóm quyền..." />
        <button v-if="searchQ" class="search-clear" @click="searchQ = ''">×</button>
      </div>
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'tree' }" @click="viewMode = 'tree'">
          🌳 Cây thư mục
        </button>
        <button :class="{ active: viewMode === 'org' }" @click="viewMode = 'org'">
          📊 Sơ đồ tổ chức
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skel-card" v-for="i in 3" :key="i"></div>
    </div>

    <div v-else-if="store.permissionGroups.length === 0" class="empty-state">
      <div class="empty-icon">🛡</div>
      <h3>Chưa có nhóm quyền nào</h3>
      <p>Bắt đầu bằng seed 7 nhóm mặc định (CEO, Trưởng phòng, Sale Senior, Sale, Marketing, Kế toán, Khách).</p>
      <button class="btn-primary" :disabled="seeding" @click="seedDefaults">
        {{ seeding ? 'Đang seed...' : '⚙ Seed 7 nhóm mặc định' }}
      </button>
    </div>

    <!-- TREE VIEW -->
    <section v-else-if="viewMode === 'tree'" class="tree-view">
      <GroupTreeNode
        v-for="node in filteredTree"
        :key="node.id"
        :node="node"
        :depth="0"
        :expanded-ids="expandedIds"
        :expanded-matrix="expandedMatrix"
        :resources="resources"
        :actions="actions"
        :resource-actions="resourceActions"
        :member-counts="memberCountsLive"
        @toggle="toggleNode"
        @add-child="openCreate"
        @open-panel="openPanel"
        @toggle-matrix="toggleMatrix"
      />
    </section>

    <!-- ORG CHART VIEW -->
    <section v-else class="org-chart">
      <div class="org-canvas">
        <OrgGroupNode
          v-for="node in filteredTree"
          :key="node.id"
          :node="node"
          :expanded-matrix="expandedMatrix"
          :resources="resources"
          :actions="actions"
          :resource-actions="resourceActions"
          :member-counts="memberCountsLive"
          @add-child="openCreate"
          @open-panel="openPanel"
          @toggle-matrix="toggleMatrix"
        />
      </div>
    </section>

    <!-- Create modal -->
    <Transition name="modal-fade">
      <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
        <div class="modal-card">
          <header class="modal-head">
            <h3>{{ createParentId ? 'Thêm nhóm con' : 'Thêm nhóm quyền gốc' }}</h3>
            <button class="modal-close" @click="showCreate = false">×</button>
          </header>
          <div class="modal-body">
            <p v-if="createParentName" class="parent-hint">
              <span class="hint-label">Thuộc:</span><strong>{{ createParentName }}</strong>
            </p>
            <label class="form-label">Tên nhóm quyền</label>
            <input
              ref="nameInput"
              v-model="newName"
              placeholder="VD: Sale Cấp Cao"
              class="form-input"
              @keyup.enter="submitCreate"
            />
            <label class="form-label" style="margin-top: 14px">Clone quyền từ</label>
            <select v-model="cloneFromId" class="form-input">
              <option value="">— Tạo mới (không clone) —</option>
              <option v-for="g in flatGroupsList" :key="g.id" :value="g.id">
                {{ '— '.repeat(g._depth) }}{{ g.name }} {{ g.isSystem ? '(hệ thống)' : '' }}
              </option>
            </select>
            <p v-if="createError" class="form-error">{{ createError }}</p>
          </div>
          <footer class="modal-foot">
            <button class="btn-ghost" @click="showCreate = false">Hủy</button>
            <button class="btn-primary" :disabled="!newName.trim()" @click="submitCreate">
              Tạo nhóm
            </button>
          </footer>
        </div>
      </div>
    </Transition>

    <!-- Side panel -->
    <PermissionGroupEditPanel
      :open="panelOpen"
      :node="selectedNode"
      :parent-name="selectedParentName"
      :all-users="allUsers"
      @close="closePanel"
      @archived="onArchived"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, type Component, reactive, watch } from 'vue';
import { useRbacStore, type PermissionGroupNode, type RbacUser } from '@/stores/rbac';
import { api } from '@/api/index';
import PermissionGroupEditPanel from '@/components/rbac/PermissionGroupEditPanel.vue';

const store = useRbacStore();
const allUsers = ref<RbacUser[]>([]);
const viewMode = ref<'tree' | 'org'>('org');
const searchQ = ref('');
const seeding = ref(false);

const expandedIds = reactive(new Set<string>());
const expandedMatrix = reactive(new Set<string>());

const panelOpen = ref(false);
const selectedNode = ref<(PermissionGroupNode & { _depth?: number }) | null>(null);
const selectedParentName = ref<string | null>(null);

onMounted(async () => {
  await Promise.all([
    store.loadPermissionGroups(),
    api.get('/rbac/users').then((r) => { allUsers.value = r.data.users ?? []; }).catch(() => {}),
  ]);
  for (const n of store.permissionGroups) expandedIds.add(n.id);
});

const resources = computed(() => store.matrixMeta?.resources ?? []);
const actions = computed(() => store.matrixMeta?.actions ?? []);
const resourceActions = computed(() => store.matrixMeta?.resourceActions ?? {});
const totalSlots = computed(() => {
  let total = 0;
  for (const r of resources.value) total += (resourceActions.value[r] ?? []).length;
  return total;
});

// Live member counts (recompute from allUsers since memberCount from backend may lag)
const memberCountsLive = computed(() => {
  const m: Record<string, number> = {};
  for (const u of allUsers.value) {
    if (u.permissionGroupId) m[u.permissionGroupId] = (m[u.permissionGroupId] ?? 0) + 1;
  }
  return m;
});

// Flat list for clone dropdown
const flatGroupsList = computed(() => {
  const out: Array<PermissionGroupNode & { _depth: number }> = [];
  function walk(nodes: PermissionGroupNode[], depth: number) {
    for (const n of nodes) {
      out.push({ ...n, _depth: depth });
      if (n.children?.length) walk(n.children, depth + 1);
    }
  }
  walk(store.permissionGroups, 0);
  return out;
});

const filteredTree = computed<PermissionGroupNode[]>(() => {
  if (!searchQ.value.trim()) return store.permissionGroups;
  const q = searchQ.value.toLowerCase();
  function matches(n: PermissionGroupNode): boolean {
    if (n.name.toLowerCase().includes(q)) return true;
    return (n.children ?? []).some(matches);
  }
  function filter(nodes: PermissionGroupNode[]): PermissionGroupNode[] {
    return nodes.filter(matches).map((n) => ({ ...n, children: filter(n.children ?? []) }));
  }
  function collectAll(nodes: PermissionGroupNode[]) {
    for (const n of nodes) { expandedIds.add(n.id); collectAll(n.children ?? []); }
  }
  const result = filter(store.permissionGroups);
  collectAll(result);
  return result;
});

function toggleNode(id: string) {
  if (expandedIds.has(id)) expandedIds.delete(id);
  else expandedIds.add(id);
}
function toggleMatrix(id: string) {
  if (expandedMatrix.has(id)) expandedMatrix.delete(id);
  else expandedMatrix.add(id);
}

function findParentName(nodeId: string): string | null {
  function walk(nodes: PermissionGroupNode[], parentName: string | null): string | null {
    for (const n of nodes) {
      if (n.id === nodeId) return parentName;
      if (n.children?.length) {
        const found = walk(n.children, n.name);
        if (found !== null) return found;
      }
    }
    return null;
  }
  return walk(store.permissionGroups, null);
}

function getNodeDepth(nodeId: string): number {
  function walk(nodes: PermissionGroupNode[], depth: number): number {
    for (const n of nodes) {
      if (n.id === nodeId) return depth;
      if (n.children?.length) {
        const found = walk(n.children, depth + 1);
        if (found >= 0) return found;
      }
    }
    return -1;
  }
  return Math.max(0, walk(store.permissionGroups, 0));
}

function openPanel(node: PermissionGroupNode) {
  selectedNode.value = { ...node, _depth: getNodeDepth(node.id) };
  selectedParentName.value = findParentName(node.id);
  panelOpen.value = true;
}
function closePanel() {
  panelOpen.value = false;
  selectedNode.value = null;
  selectedParentName.value = null;
}
async function onArchived() {
  closePanel();
  await Promise.all([
    store.loadPermissionGroups(),
    api.get('/rbac/users').then((r) => { allUsers.value = r.data.users ?? []; }).catch(() => {}),
  ]);
}

// Re-sync allUsers when store updates (grants change re-fetches groups, but member counts come from users)
watch(
  () => store.permissionGroups,
  async () => {
    try {
      const { data } = await api.get('/rbac/users');
      allUsers.value = data.users ?? [];
    } catch {}
  }
);

const stats = computed(() => {
  let total = 0, system = 0, totalMembers = 0;
  function walk(nodes: PermissionGroupNode[]) {
    for (const n of nodes) {
      total++;
      if (n.isSystem) system++;
      totalMembers += memberCountsLive.value[n.id] ?? 0;
      if (n.children?.length) walk(n.children);
    }
  }
  walk(store.permissionGroups);
  return { total, system, totalMembers };
});

const loading = computed(() => store.loading);

// ── Create modal ──
const showCreate = ref(false);
const createParentId = ref<string | null>(null);
const createParentName = ref('');
const newName = ref('');
const cloneFromId = ref('');
const createError = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

function openCreate(parent: PermissionGroupNode | null) {
  createParentId.value = parent?.id ?? null;
  createParentName.value = parent?.name ?? '';
  newName.value = '';
  cloneFromId.value = '';
  createError.value = '';
  showCreate.value = true;
  setTimeout(() => nameInput.value?.focus(), 50);
}
async function submitCreate() {
  if (!newName.value.trim()) return;
  try {
    await store.createPermissionGroup({
      name: newName.value.trim(),
      parentId: createParentId.value,
      cloneFromId: cloneFromId.value || undefined,
    });
    showCreate.value = false;
  } catch (e: any) {
    createError.value = e?.response?.data?.error || 'Lỗi tạo nhóm quyền';
  }
}

async function seedDefaults() {
  seeding.value = true;
  try {
    const res = await store.seedDefaultGroups();
    alert(`Seed xong: ${res.created} mới, ${res.existing} đã có`);
  } catch (e: any) {
    alert(e?.response?.data?.error || 'Lỗi seed');
  } finally {
    seeding.value = false;
  }
}

// ────────── Helpers ──────────
const ACTION_LABELS: Record<string, string> = {
  access: 'Truy cập', create: 'Thêm', edit: 'Sửa', delete: 'Xóa',
  approve: 'Duyệt', pay: 'TT', view_all: 'Xem all',
};
function actionLabel(a: string) { return ACTION_LABELS[a] ?? a; }
const RESOURCE_LABELS: Record<string, string> = {
  department: 'Phòng ban', user: 'Người dùng', permission_group: 'Quyền',
  conversation: 'Hội thoại', contact: 'KH', friend: 'Friends',
  customer_list: 'Tệp KH', broadcast: 'Chiến dịch', sequence: 'Sequence',
  trigger: 'Trigger', block: 'Block', zalo_account: 'Nick Zalo',
  webhook: 'Webhook', engagement_score: 'Score', audit_log: 'Audit',
  settings: 'Cài đặt',
};
function resourceLabel(r: string) { return RESOURCE_LABELS[r] ?? r; }

// ────────── TREE VIEW NODE ──────────
const GroupTreeNode: Component = {
  name: 'GroupTreeNode',
  props: ['node', 'depth', 'expandedIds', 'expandedMatrix', 'resources', 'actions', 'resourceActions', 'memberCounts'],
  emits: ['toggle', 'add-child', 'open-panel', 'toggle-matrix'],
  setup(props, { emit }) {
    return () => {
      const node: PermissionGroupNode = props.node;
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isExpanded = props.expandedIds.has(node.id);
      const isMatrixOpen = props.expandedMatrix.has(node.id);
      const accentColor = ['#181d26', '#aa2d00', '#0a2e0e', '#d9a441', '#1b61c9'][Math.min(props.depth, 4)];
      const memberCount = props.memberCounts[node.id] ?? node.memberCount ?? 0;
      const grantsCount = countGrants(node.grants, props.resources, props.resourceActions);
      const totalSlots = countSlots(props.resources, props.resourceActions);

      const header = h('div', { class: 'dept-row', style: { '--depth': props.depth, '--accent': accentColor } }, [
        h('button', {
          class: ['dept-toggle', { invisible: !hasChildren }],
          onClick: (e: Event) => { e.stopPropagation(); hasChildren && emit('toggle', node.id); },
        }, [hasChildren ? (isExpanded ? '▾' : '▸') : '·']),
        h('div', { class: 'dept-card', onClick: () => emit('open-panel', node) }, [
          h('div', { class: 'dept-card-accent' }),
          h('div', { class: 'dept-card-body' }, [
            h('div', { class: 'dept-card-head' }, [
              h('div', { class: 'dept-name-wrap' }, [
                h('span', { class: 'dept-name' }, node.name),
                node.isSystem
                  ? h('span', { class: 'dept-depth-tag tag-system' }, 'Hệ thống')
                  : h('span', { class: 'dept-depth-tag' }, `Tùy chỉnh`),
              ]),
              h('div', { class: 'dept-quick-actions' }, [
                h('button', {
                  class: 'btn-quick btn-quick-add',
                  title: 'Thêm nhóm con',
                  onClick: (e: Event) => { e.stopPropagation(); emit('add-child', node); },
                }, '+ Nhóm con'),
                h('button', {
                  class: 'btn-quick btn-quick-edit',
                  title: 'Mở chi tiết',
                  onClick: (e: Event) => { e.stopPropagation(); emit('open-panel', node); },
                }, '✎ Chi tiết'),
              ]),
            ]),
            h('div', { class: 'dept-rows' }, [
              h('div', { class: 'dept-info-row' }, [
                h('span', { class: 'info-ico' }, '👥'),
                h('span', { class: 'info-label' }, 'User đã gán:'),
                memberCount > 0
                  ? h('span', { class: 'info-count' }, String(memberCount))
                  : h('span', { class: 'info-empty' }, 'Chưa có user'),
              ]),
              h('div', { class: 'dept-info-row dept-info-row-members' }, [
                h('span', { class: 'info-ico' }, '🛡'),
                h('span', { class: 'info-label' }, 'Quyền active:'),
                h('span', { class: 'info-count' }, `${grantsCount} / ${totalSlots}`),
                h('button', {
                  class: 'btn-expand-members',
                  title: isMatrixOpen ? 'Thu gọn' : 'Xem ma trận',
                  onClick: (e: Event) => { e.stopPropagation(); emit('toggle-matrix', node.id); },
                }, isMatrixOpen ? '−' : '+'),
              ]),
              h('div', { class: 'dept-info-row' }, [
                h('span', { class: 'info-ico' }, '📋'),
                h('span', { class: 'info-label' }, 'Loại nhóm:'),
                h('span', { class: 'info-name' }, node.isSystem ? 'Mặc định hệ thống' : 'Tùy chỉnh'),
              ]),
              isMatrixOpen
                ? h('div', { class: 'inline-matrix-wrap' }, [
                    renderInlineMatrix(node.grants, props.resources, props.actions, props.resourceActions),
                  ])
                : null,
            ].filter(Boolean)),
          ]),
        ]),
      ]);

      const children = isExpanded && hasChildren
        ? node.children!.map((c: PermissionGroupNode) =>
            h(GroupTreeNode as any, {
              key: c.id,
              node: c,
              depth: props.depth + 1,
              expandedIds: props.expandedIds,
              expandedMatrix: props.expandedMatrix,
              resources: props.resources,
              actions: props.actions,
              resourceActions: props.resourceActions,
              memberCounts: props.memberCounts,
              onToggle: (id: string) => emit('toggle', id),
              onAddChild: (n: PermissionGroupNode) => emit('add-child', n),
              onOpenPanel: (n: PermissionGroupNode) => emit('open-panel', n),
              onToggleMatrix: (id: string) => emit('toggle-matrix', id),
            }))
        : null;

      return h('div', { class: 'dept-group' }, [header, children]);
    };
  },
};

// ────────── ORG CHART NODE ──────────
const OrgGroupNode: Component = {
  name: 'OrgGroupNode',
  props: ['node', 'expandedMatrix', 'resources', 'actions', 'resourceActions', 'memberCounts'],
  emits: ['add-child', 'open-panel', 'toggle-matrix'],
  setup(props, { emit }) {
    return () => {
      const node: PermissionGroupNode = props.node;
      const depth = getDepthInTree(node, props);
      const accentColor = ['#181d26', '#aa2d00', '#0a2e0e', '#d9a441', '#1b61c9'][Math.min(depth, 4)];
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isMatrixOpen = props.expandedMatrix.has(node.id);
      const memberCount = props.memberCounts[node.id] ?? node.memberCount ?? 0;
      const grantsCount = countGrants(node.grants, props.resources, props.resourceActions);
      const totalSlots = countSlots(props.resources, props.resourceActions);

      return h('div', { class: 'org-node' }, [
        h('div', {
          class: 'org-card-wrap dept-card',
          style: { '--accent': accentColor },
          onClick: () => emit('open-panel', node),
        }, [
          h('div', { class: 'dept-card-accent' }),
          h('div', { class: 'dept-card-body' }, [
            h('div', { class: 'dept-card-head' }, [
              h('div', { class: 'dept-name-wrap' }, [
                h('span', { class: 'dept-name' }, node.name),
                node.isSystem
                  ? h('span', { class: 'dept-depth-tag tag-system' }, 'Hệ thống')
                  : h('span', { class: 'dept-depth-tag' }, `Tùy chỉnh`),
              ]),
              h('div', { class: 'dept-quick-actions' }, [
                h('button', {
                  class: 'btn-quick btn-quick-add',
                  onClick: (e: Event) => { e.stopPropagation(); emit('add-child', node); },
                }, '+'),
                h('button', {
                  class: 'btn-quick btn-quick-edit',
                  onClick: (e: Event) => { e.stopPropagation(); emit('open-panel', node); },
                }, '✎'),
              ]),
            ]),
            h('div', { class: 'dept-rows' }, [
              h('div', { class: 'dept-info-row' }, [
                h('span', { class: 'info-ico' }, '👥'),
                h('span', { class: 'info-label' }, 'User:'),
                memberCount > 0
                  ? h('span', { class: 'info-count' }, String(memberCount))
                  : h('span', { class: 'info-empty' }, 'Chưa có'),
              ]),
              h('div', { class: 'dept-info-row dept-info-row-members' }, [
                h('span', { class: 'info-ico' }, '🛡'),
                h('span', { class: 'info-label' }, 'Quyền:'),
                h('span', { class: 'info-count' }, `${grantsCount} / ${totalSlots}`),
                h('button', {
                  class: 'btn-expand-members',
                  onClick: (e: Event) => { e.stopPropagation(); emit('toggle-matrix', node.id); },
                }, isMatrixOpen ? '−' : '+'),
              ]),
              isMatrixOpen
                ? h('div', { class: 'inline-matrix-wrap' }, [
                    renderInlineMatrix(node.grants, props.resources, props.actions, props.resourceActions),
                  ])
                : null,
            ].filter(Boolean)),
          ]),
        ]),
        hasChildren
          ? h('div', { class: 'org-children' }, [
              h('div', { class: 'org-connector-down' }),
              h('div', { class: 'org-children-row' }, node.children!.map((c: PermissionGroupNode) =>
                h('div', { class: 'org-child-wrap', key: c.id }, [
                  h('div', { class: 'org-connector-up' }),
                  h(OrgGroupNode as any, {
                    node: c,
                    expandedMatrix: props.expandedMatrix,
                    resources: props.resources,
                    actions: props.actions,
                    resourceActions: props.resourceActions,
                    memberCounts: props.memberCounts,
                    onAddChild: (n: PermissionGroupNode) => emit('add-child', n),
                    onOpenPanel: (n: PermissionGroupNode) => emit('open-panel', n),
                    onToggleMatrix: (id: string) => emit('toggle-matrix', id),
                  }),
                ]),
              )),
            ])
          : null,
      ].filter(Boolean));
    };
  },
};

function getDepthInTree(node: PermissionGroupNode, _props: any): number {
  // Org chart top-level always 0; the recursion children will get visual depth via tree
  return node.parentId == null ? 0 : 1;
}

function countGrants(grants: Record<string, Record<string, boolean>> | undefined, resources: string[], resourceActions: Record<string, string[]>): number {
  if (!grants) return 0;
  let n = 0;
  for (const r of resources) {
    for (const a of (resourceActions[r] ?? [])) {
      if (grants[r]?.[a]) n++;
    }
  }
  return n;
}
function countSlots(resources: string[], resourceActions: Record<string, string[]>): number {
  let n = 0;
  for (const r of resources) n += (resourceActions[r] ?? []).length;
  return n;
}

function renderInlineMatrix(
  grants: Record<string, Record<string, boolean>> | undefined,
  resources: string[],
  actions: string[],
  resourceActions: Record<string, string[]>
) {
  return h('table', { class: 'inline-matrix' }, [
    h('thead', [
      h('tr', [
        h('th', { class: 'im-th-res' }, 'Chức năng'),
        ...actions.map((a) => h('th', { class: 'im-th-act', title: actionLabel(a) }, actionLabel(a))),
      ]),
    ]),
    h('tbody',
      resources.map((r) =>
        h('tr', { key: r }, [
          h('td', { class: 'im-res' }, resourceLabel(r)),
          ...actions.map((a) =>
            h('td', { class: 'im-cell' },
              (resourceActions[r] ?? []).includes(a)
                ? (grants?.[r]?.[a]
                    ? h('span', { class: 'im-on' }, '✓')
                    : h('span', { class: 'im-off' }, '·'))
                : h('span', { class: 'im-dash' }, '—')
            )
          ),
        ])
      )
    ),
  ]);
}
</script>

<style>
/* PermissionGroupsView — reuse .dept-page / .dept-card / .dept-rows etc. from DepartmentsView non-scoped styles */
/* Add only group-specific overrides + inline matrix */

.tag-system {
  background: #fdf3df !important;
  color: #7a5818 !important;
}

.hero-actions { display: flex; gap: 8px; align-items: flex-end; }

.inline-matrix-wrap {
  margin-top: 8px;
  padding: 10px 0 4px 30px;
  border-top: 1px dashed #e0e2e6;
}
.inline-matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  background: white;
  border: 1px solid #e0e2e6;
  border-radius: 6px;
  overflow: hidden;
}
.inline-matrix th, .inline-matrix td {
  padding: 3px 5px;
  border-bottom: 1px solid #f0f1f3;
  border-right: 1px solid #f0f1f3;
}
.inline-matrix th:last-child, .inline-matrix td:last-child { border-right: 0; }
.inline-matrix tr:last-child td { border-bottom: 0; }
.im-th-res {
  background: #f8fafc;
  font-weight: 600;
  font-size: 9px;
  color: #41454d;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  text-align: left;
  padding: 4px 6px;
}
.im-th-act {
  background: #f8fafc;
  font-weight: 600;
  font-size: 9px;
  color: #41454d;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  text-align: center;
  width: 40px;
}
.im-res { font-size: 10px; color: #181d26; font-weight: 500; }
.im-cell { text-align: center; }
.im-on { color: #0a2e0e; font-weight: 700; font-size: 11px; }
.im-off { color: #d6d8dc; font-size: 11px; }
.im-dash { color: #d6d8dc; font-size: 10px; }
</style>
