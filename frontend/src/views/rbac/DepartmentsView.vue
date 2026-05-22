<template>
  <div class="dept-page">
    <!-- Page header — Airtable canvas + signature accent -->
    <header class="page-hero">
      <div class="hero-left">
        <h1 class="hero-title">Sơ đồ tổ chức</h1>
        <p class="hero-sub">
          Cây phòng ban theo Getfly model. Phòng cha quản lý mọi phòng con. Cùng cấp không quản lý nhau.
        </p>
      </div>
      <button class="btn-primary" @click="openCreate(null)">
        <span class="btn-icon">+</span>
        <span>Thêm phòng ban</span>
      </button>
    </header>

    <!-- Stats summary -->
    <section class="stats-row" v-if="!loading && stats.totalDepts > 0">
      <div class="stat-card stat-primary">
        <div class="stat-label">Tổng phòng ban</div>
        <div class="stat-value">{{ stats.totalDepts }}</div>
      </div>
      <div class="stat-card stat-forest">
        <div class="stat-label">Cấp tối đa</div>
        <div class="stat-value">{{ stats.maxDepth + 1 }}<span class="stat-unit"> / 5</span></div>
      </div>
      <div class="stat-card stat-mustard">
        <div class="stat-label">Có trưởng phòng</div>
        <div class="stat-value">{{ stats.deptsWithLeader }}<span class="stat-unit"> / {{ stats.totalDepts }}</span></div>
      </div>
      <div class="stat-card stat-cream">
        <div class="stat-label">Tổng nhân viên</div>
        <div class="stat-value">{{ stats.totalMembers }}</div>
      </div>
    </section>

    <!-- Loading skeleton -->
    <div v-if="loading" class="loading-state">
      <div class="skel-card" v-for="i in 3" :key="i"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="store.departments.length === 0" class="empty-state">
      <div class="empty-icon">🌳</div>
      <h3>Chưa có phòng ban nào</h3>
      <p>Tạo phòng đầu tiên — vd "Ban Giám Đốc" làm root, rồi thêm con bên dưới.</p>
      <button class="btn-primary" @click="openCreate(null)">+ Thêm phòng ban đầu tiên</button>
    </div>

    <!-- Tree visualization -->
    <section v-else class="tree-section">
      <div class="tree-canvas">
        <DeptCard
          v-for="node in store.departments"
          :key="node.id"
          :node="node"
          :user-name-map="userNameMap"
          @add-child="openCreate"
          @rename="renameNode"
          @archive="archiveNode"
          @assign-member="openAssign"
        />
      </div>
    </section>

    <!-- Create dept modal -->
    <Transition name="modal-fade">
      <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
        <div class="modal-card">
          <header class="modal-head">
            <h3>{{ createParentId ? 'Thêm phòng ban con' : 'Thêm phòng ban gốc' }}</h3>
            <button class="modal-close" @click="showCreate = false">×</button>
          </header>
          <div class="modal-body">
            <p v-if="createParentName" class="parent-hint">
              <span class="hint-label">Thuộc:</span>
              <strong>{{ createParentName }}</strong>
            </p>
            <label class="form-label">Tên phòng ban</label>
            <input
              ref="nameInput"
              v-model="newName"
              placeholder="VD: Phòng Kinh Doanh 1"
              class="form-input"
              @keyup.enter="submitCreate"
            />
            <p v-if="createError" class="form-error">{{ createError }}</p>
          </div>
          <footer class="modal-foot">
            <button class="btn-ghost" @click="showCreate = false">Hủy</button>
            <button class="btn-primary" :disabled="!newName.trim()" @click="submitCreate">Tạo phòng ban</button>
          </footer>
        </div>
      </div>
    </Transition>

    <!-- Assign member modal -->
    <Transition name="modal-fade">
      <div v-if="showAssign" class="modal-backdrop" @click.self="closeAssign">
        <div class="modal-card modal-card-lg">
          <header class="modal-head">
            <h3>Gán nhân viên vào <strong>{{ assignTargetName }}</strong></h3>
            <button class="modal-close" @click="closeAssign">×</button>
          </header>
          <div class="modal-body">
            <label class="form-label">Chọn nhân viên</label>
            <select v-model="assignUserId" class="form-input">
              <option value="">-- Chọn user --</option>
              <option v-for="u in availableUsers" :key="u.id" :value="u.id">
                {{ u.fullName }} ({{ u.email }})
              </option>
            </select>
            <label class="form-label form-label-mt">Vai trò trong phòng</label>
            <div class="role-picker">
              <button
                v-for="r in ROLES"
                :key="r.value"
                type="button"
                class="role-btn"
                :class="{ active: assignRole === r.value }"
                @click="assignRole = r.value"
              >
                <span class="role-icon">{{ r.icon }}</span>
                <div class="role-text">
                  <strong>{{ r.label }}</strong>
                  <small>{{ r.hint }}</small>
                </div>
              </button>
            </div>
            <p v-if="assignError" class="form-error">{{ assignError }}</p>
          </div>
          <footer class="modal-foot">
            <button class="btn-ghost" @click="closeAssign">Hủy</button>
            <button class="btn-primary" :disabled="!assignUserId" @click="submitAssign">Gán</button>
          </footer>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, type Component } from 'vue';
import { useRbacStore, type DepartmentNode } from '@/stores/rbac';
import { api } from '@/api/index';

const store = useRbacStore();

interface UserBrief { id: string; email: string; fullName: string; }
const allUsers = ref<UserBrief[]>([]);

onMounted(async () => {
  await Promise.all([
    store.loadDepartments(),
    api.get('/rbac/users').then((r) => { allUsers.value = r.data.users ?? []; }).catch(() => {}),
  ]);
});

const userNameMap = computed(() => {
  const m = new Map<string, string>();
  for (const u of allUsers.value) m.set(u.id, u.fullName || u.email);
  return m;
});

const stats = computed(() => {
  let total = 0, withLeader = 0, totalMembers = 0, maxDepth = 0;
  function walk(nodes: DepartmentNode[]) {
    for (const n of nodes) {
      total++;
      if (n.leaderUserId) withLeader++;
      totalMembers += n.memberCount;
      if (n.depth > maxDepth) maxDepth = n.depth;
      if (n.children?.length) walk(n.children);
    }
  }
  walk(store.departments);
  return { totalDepts: total, deptsWithLeader: withLeader, totalMembers, maxDepth };
});

const loading = computed(() => store.loading);

// ── Create modal ───────────────────────────────────────────────────
const showCreate = ref(false);
const createParentId = ref<string | null>(null);
const createParentName = ref('');
const newName = ref('');
const createError = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

function openCreate(parent: DepartmentNode | null) {
  createParentId.value = parent?.id ?? null;
  createParentName.value = parent?.name ?? '';
  newName.value = '';
  createError.value = '';
  showCreate.value = true;
  setTimeout(() => nameInput.value?.focus(), 50);
}
async function submitCreate() {
  if (!newName.value.trim()) return;
  try {
    await store.createDepartment({ name: newName.value.trim(), parentId: createParentId.value });
    showCreate.value = false;
  } catch (e: any) {
    createError.value = e?.response?.data?.error || 'Lỗi tạo phòng ban';
  }
}

async function renameNode(node: DepartmentNode) {
  const newN = prompt('Đổi tên phòng ban', node.name);
  if (newN && newN.trim() && newN !== node.name) {
    try { await store.renameDepartment(node.id, newN.trim()); }
    catch (e: any) { alert(e?.response?.data?.error || 'Lỗi đổi tên'); }
  }
}
async function archiveNode(node: DepartmentNode) {
  if (!confirm(`Xóa "${node.name}"? Phòng ban phải rỗng (không còn thành viên, không còn phòng con).`)) return;
  try { await store.archiveDepartment(node.id); }
  catch (e: any) { alert(e?.response?.data?.error || 'Lỗi xóa'); }
}

// ── Assign member modal ───────────────────────────────────────────
const showAssign = ref(false);
const assignTargetDeptId = ref<string | null>(null);
const assignTargetName = ref('');
const assignUserId = ref('');
const assignRole = ref<'leader' | 'deputy' | 'member'>('member');
const assignError = ref('');

const ROLES = [
  { value: 'leader' as const, label: 'Trưởng phòng', icon: '👑', hint: 'Quản lý toàn dept + dept con' },
  { value: 'deputy' as const, label: 'Phó phòng', icon: '🎖️', hint: 'Cùng quyền trưởng' },
  { value: 'member' as const, label: 'Nhân viên', icon: '👤', hint: 'Member thường' },
];

const availableUsers = computed(() => allUsers.value);

function openAssign(node: DepartmentNode) {
  assignTargetDeptId.value = node.id;
  assignTargetName.value = node.name;
  assignUserId.value = '';
  assignRole.value = 'member';
  assignError.value = '';
  showAssign.value = true;
}
function closeAssign() {
  showAssign.value = false;
}
async function submitAssign() {
  if (!assignUserId.value || !assignTargetDeptId.value) return;
  try {
    await store.assignMember(assignTargetDeptId.value, assignUserId.value, assignRole.value);
    showAssign.value = false;
  } catch (e: any) {
    assignError.value = e?.response?.data?.error || 'Lỗi gán';
  }
}

// ── Recursive Department Card component ──────────────────────────
const DeptCard: Component = {
  name: 'DeptCard',
  props: ['node', 'userNameMap'],
  emits: ['add-child', 'rename', 'archive', 'assign-member'],
  setup(props, { emit }) {
    const node: DepartmentNode = props.node;
    return () => {
      const leaderName = node.leaderUserId ? props.userNameMap.get(node.leaderUserId) : null;
      const deputyName = node.deputyUserId ? props.userNameMap.get(node.deputyUserId) : null;
      const depthClass = `depth-${Math.min(node.depth, 4)}`;
      return h('div', { class: ['dept-branch', depthClass] }, [
        h('div', { class: 'dept-card' }, [
          h('div', { class: 'card-accent' }),
          h('div', { class: 'card-body' }, [
            h('div', { class: 'card-head' }, [
              h('div', { class: 'card-title' }, [
                h('span', { class: 'depth-pill' }, `Cấp ${node.depth + 1}`),
                h('h4', node.name),
              ]),
              h('div', { class: 'card-actions' }, [
                h('button', {
                  class: 'btn-mini btn-mini-primary',
                  onClick: () => emit('assign-member', node),
                  title: 'Gán nhân viên',
                }, ['👤+']),
                h('button', { class: 'btn-mini', onClick: () => emit('add-child', node), title: 'Thêm phòng con' }, ['+ Con']),
                h('button', { class: 'btn-mini', onClick: () => emit('rename', node), title: 'Đổi tên' }, ['Sửa']),
                h('button', { class: 'btn-mini btn-mini-danger', onClick: () => emit('archive', node), title: 'Xóa' }, ['Xóa']),
              ]),
            ]),
            h('div', { class: 'card-meta' }, [
              h('div', { class: 'meta-item' }, [
                h('span', { class: 'meta-label' }, '👥 Thành viên'),
                h('span', { class: 'meta-value' }, String(node.memberCount)),
              ]),
              leaderName
                ? h('div', { class: 'meta-item meta-leader' }, [
                    h('span', { class: 'meta-label' }, '👑 Trưởng'),
                    h('span', { class: 'meta-value' }, leaderName),
                  ])
                : h('div', { class: 'meta-item meta-empty' }, [
                    h('span', { class: 'meta-label' }, '👑 Trưởng'),
                    h('span', { class: 'meta-value-empty' }, 'Chưa gán'),
                  ]),
              deputyName
                ? h('div', { class: 'meta-item meta-deputy' }, [
                    h('span', { class: 'meta-label' }, '🎖️ Phó'),
                    h('span', { class: 'meta-value' }, deputyName),
                  ])
                : null,
            ].filter(Boolean)),
          ]),
        ]),
        node.children?.length
          ? h('div', { class: 'children-wrap' }, [
              h('div', { class: 'children-line' }),
              h('div', { class: 'children-list' }, node.children.map((c: DepartmentNode) =>
                h(DeptCard as any, {
                  key: c.id,
                  node: c,
                  userNameMap: props.userNameMap,
                  onAddChild: (n: DepartmentNode) => emit('add-child', n),
                  onRename: (n: DepartmentNode) => emit('rename', n),
                  onArchive: (n: DepartmentNode) => emit('archive', n),
                  onAssignMember: (n: DepartmentNode) => emit('assign-member', n),
                }),
              )),
            ])
          : null,
      ].filter(Boolean));
    };
  },
};
</script>

<style scoped>
/* ── Airtable canvas ─────────────────────────────────────────── */
.dept-page {
  background: #ffffff;
  min-height: 100%;
  padding: 32px 32px 96px;
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  color: #181d26;
  letter-spacing: -0.005em;
}

/* ── Hero ───────────────────────────────────────────────────── */
.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  gap: 24px;
}
.hero-title {
  font-size: 32px;
  font-weight: 400;
  line-height: 1.2;
  margin: 0 0 8px;
  color: #181d26;
  letter-spacing: 0;
}
.hero-sub {
  font-size: 14px;
  font-weight: 400;
  color: #41454d;
  margin: 0;
  max-width: 540px;
  line-height: 1.5;
}

/* ── Stats row — signature card colors ──────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}
.stat-card {
  border-radius: 12px;
  padding: 16px 20px;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
}
.stat-primary { background: #f8fafc; }
.stat-primary::before { background: #181d26; }
.stat-forest { background: #e3ede4; }
.stat-forest::before { background: #0a2e0e; }
.stat-mustard { background: #fdf3df; }
.stat-mustard::before { background: #d9a441; }
.stat-cream { background: #f5e9d4; }
.stat-cream::before { background: #aa2d00; }
.stat-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #41454d;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 28px;
  font-weight: 400;
  color: #181d26;
  letter-spacing: -0.5px;
}
.stat-unit {
  font-size: 14px;
  color: #9297a0;
  font-weight: 400;
}

/* ── Tree section ───────────────────────────────────────────── */
.tree-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #dddddd;
}
.tree-canvas {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Dept Card recursive ────────────────────────────────────── */
.dept-branch {
  position: relative;
}
.dept-card {
  background: white;
  border-radius: 10px;
  border: 1px solid #dddddd;
  display: flex;
  overflow: hidden;
  transition: border-color 0.15s;
}
.dept-card:hover {
  border-color: #9297a0;
}
.card-accent {
  width: 4px;
  flex: 0 0 4px;
  background: #181d26;
}
.depth-0 > .dept-card .card-accent { background: #181d26; }
.depth-1 > .dept-card .card-accent { background: #aa2d00; }
.depth-2 > .dept-card .card-accent { background: #0a2e0e; }
.depth-3 > .dept-card .card-accent { background: #d9a441; }
.depth-4 > .dept-card .card-accent { background: #1b61c9; }
.card-body {
  flex: 1;
  padding: 16px 20px;
  min-width: 0;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.card-title h4 {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  color: #181d26;
  line-height: 1.3;
}
.depth-pill {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 9999px;
  background: #e0e2e6;
  color: #41454d;
}
.depth-0 .depth-pill { background: #181d26; color: white; }
.depth-1 .depth-pill { background: #fbe6dc; color: #7a2000; }
.depth-2 .depth-pill { background: #e3ede4; color: #0a2e0e; }
.depth-3 .depth-pill { background: #fdf3df; color: #7a5818; }
.depth-4 .depth-pill { background: #dfeafc; color: #1a3866; }

.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.btn-mini {
  background: white;
  border: 1px solid #dddddd;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: #41454d;
  transition: all 0.1s;
}
.btn-mini:hover {
  background: #f8fafc;
  border-color: #9297a0;
}
.btn-mini-primary {
  background: #181d26;
  color: white;
  border-color: #181d26;
}
.btn-mini-primary:hover {
  background: #0d1218;
}
.btn-mini-danger {
  color: #aa2d00;
  border-color: #fbe6dc;
}
.btn-mini-danger:hover {
  background: #fbe6dc;
}

.card-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 13px;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.meta-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #9297a0;
}
.meta-value {
  color: #181d26;
  font-weight: 500;
}
.meta-value-empty {
  color: #9297a0;
  font-style: italic;
  font-size: 12px;
}

/* ── Tree connector lines ───────────────────────────────────── */
.children-wrap {
  position: relative;
  margin-top: 12px;
  margin-left: 32px;
  padding-left: 24px;
  border-left: 2px solid #dddddd;
}
.children-line {
  position: absolute;
  left: -2px;
  top: 0;
  bottom: 0;
}
.children-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.children-list .dept-branch::before {
  content: '';
  position: absolute;
  left: -26px;
  top: 24px;
  width: 24px;
  height: 2px;
  background: #dddddd;
}

/* ── Loading skeleton ───────────────────────────────────────── */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skel-card {
  height: 80px;
  background: linear-gradient(90deg, #f0f1f3 0%, #e0e2e6 50%, #f0f1f3 100%);
  background-size: 200% 100%;
  border-radius: 10px;
  animation: skel 1.4s ease-in-out infinite;
}
@keyframes skel { 0%, 100% { background-position: 0% 0%; } 50% { background-position: -200% 0%; } }

/* ── Empty state ────────────────────────────────────────────── */
.empty-state {
  background: #f8fafc;
  border: 2px dashed #dddddd;
  border-radius: 12px;
  padding: 64px 24px;
  text-align: center;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state h3 {
  font-size: 20px;
  font-weight: 500;
  margin: 0 0 8px;
  color: #181d26;
}
.empty-state p {
  font-size: 14px;
  color: #41454d;
  margin: 0 0 24px;
}

/* ── Primary CTA + ghost ────────────────────────────────────── */
.btn-primary {
  background: #181d26;
  color: white;
  border: 0;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.1s;
}
.btn-primary:hover { background: #0d1218; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-icon { font-size: 18px; font-weight: 400; line-height: 1; }
.btn-ghost {
  background: white;
  border: 1px solid #dddddd;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #41454d;
}
.btn-ghost:hover { background: #f8fafc; }

/* ── Modal ──────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(24, 29, 38, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}
.modal-card {
  background: white;
  border-radius: 16px;
  width: 440px;
  max-width: 92vw;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(24,29,38,0.25);
}
.modal-card-lg { width: 520px; }
.modal-head {
  padding: 20px 24px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f1f3;
}
.modal-head h3 { margin: 0; font-size: 18px; font-weight: 500; color: #181d26; }
.modal-close {
  background: none; border: 0;
  font-size: 24px; color: #9297a0;
  cursor: pointer; width: 32px; height: 32px;
  border-radius: 8px;
  line-height: 1;
}
.modal-close:hover { background: #f0f1f3; color: #181d26; }
.modal-body { padding: 20px 24px; }
.modal-foot {
  padding: 16px 24px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #f0f1f3;
  background: #f8fafc;
}
.parent-hint {
  font-size: 13px;
  color: #41454d;
  margin: 0 0 16px;
  padding: 10px 12px;
  background: #fdf3df;
  border-radius: 6px;
  border-left: 3px solid #d9a441;
}
.hint-label { font-weight: 500; margin-right: 6px; }
.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #41454d;
  margin-bottom: 6px;
}
.form-label-mt { margin-top: 16px; }
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #dddddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  color: #181d26;
  background: white;
}
.form-input:focus {
  outline: none;
  border-color: #181d26;
  box-shadow: 0 0 0 3px rgba(24,29,38,0.08);
}
.form-error {
  color: #aa2d00;
  font-size: 13px;
  margin: 12px 0 0;
  padding: 10px 12px;
  background: #fbe6dc;
  border-radius: 6px;
}

/* ── Role picker ────────────────────────────────────────────── */
.role-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.role-btn {
  background: white;
  border: 1px solid #dddddd;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.1s;
}
.role-btn:hover { background: #f8fafc; }
.role-btn.active {
  border-color: #181d26;
  background: #181d26;
  color: white;
}
.role-btn.active .role-icon { background: white; color: #181d26; }
.role-icon {
  font-size: 18px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f0f1f3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.role-text { display: flex; flex-direction: column; gap: 2px; }
.role-text strong { font-size: 14px; font-weight: 500; }
.role-text small { font-size: 11px; opacity: 0.7; }

/* ── Modal transition ───────────────────────────────────────── */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.15s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card { transition: transform 0.2s ease; }
.modal-fade-enter-from .modal-card { transform: translateY(20px); }
.modal-fade-leave-to .modal-card { transform: translateY(20px); }
</style>
