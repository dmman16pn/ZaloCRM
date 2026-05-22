<template>
  <div class="privacy-settings">
    <header class="page-head">
      <h2>🔒 Chế độ Riêng Tư</h2>
      <p class="muted">
        Bật "Riêng tư" cho nick chính của bạn — admin và sale khác sẽ thấy nội dung tin nhắn bị làm mờ (▒▒▒▒).
        Chỉ bạn unlock bằng PIN mới xem được.
      </p>
    </header>

    <!-- PIN Setup card -->
    <section class="card">
      <div class="card-head">
        <h3>PIN bảo mật</h3>
        <span class="status-tag" :class="store.hasPin ? 'green' : 'orange'">
          {{ store.hasPin ? '✅ Đã setup' : '⚠ Chưa setup' }}
        </span>
      </div>
      <p v-if="!store.hasPin" class="muted">Setup PIN 4 số để bật chế độ Riêng tư.</p>
      <p v-else-if="store.isUnlocked" class="muted">
        Đang mở khoá — còn {{ store.remainingMinutes }} phút.
      </p>
      <p v-else class="muted">Đã setup PIN. Click nút mở khoá khi cần xem nội dung nick chính.</p>
      <div class="card-actions">
        <button v-if="!store.hasPin" class="btn-primary" @click="showUnlockModal = true">Setup PIN</button>
        <button v-else-if="!store.isUnlocked" class="btn-primary" @click="showUnlockModal = true">🔓 Mở khoá</button>
        <button v-else class="btn-ghost" @click="lockNow">Khoá ngay</button>
      </div>
    </section>

    <!-- Nick list with privacy toggle -->
    <section class="card">
      <div class="card-head">
        <h3>Danh sách nick</h3>
        <span class="muted small">Bật switch để chuyển nick sang chế độ Riêng tư.</span>
      </div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <div v-else-if="nicks.length === 0" class="empty">Bạn chưa có nick Zalo nào.</div>
      <table v-else class="nicks-table">
        <thead>
          <tr>
            <th>Nick</th>
            <th>Phone</th>
            <th>Trạng thái</th>
            <th>Riêng tư</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in nicks" :key="n.id">
            <td>
              <div class="nick-cell">
                <img v-if="n.avatarUrl" :src="n.avatarUrl" class="avatar" />
                <span>{{ n.displayName || '(không tên)' }}</span>
              </div>
            </td>
            <td>{{ n.phone || '—' }}</td>
            <td>
              <span class="status-pill" :class="`s-${n.status}`">{{ statusLabel(n.status) }}</span>
            </td>
            <td>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="n.privacyMode === 'main'"
                  :disabled="flipping === n.id"
                  @change="flipMode(n.id, n.privacyMode === 'main' ? 'sub' : 'main')"
                />
                <span class="slider"></span>
                <span class="switch-label">{{ n.privacyMode === 'main' ? '🔒 Riêng tư' : 'Công khai' }}</span>
              </label>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Active sessions -->
    <section v-if="store.activeSessions.length > 0" class="card">
      <div class="card-head"><h3>Phiên mở khoá đang hoạt động</h3></div>
      <ul class="session-list">
        <li v-for="s in store.activeSessions" :key="s.id">
          <span class="session-info">
            <strong>{{ formatDate(s.unlockedAt) }}</strong>
            <span class="muted small">— hết hạn {{ formatDate(s.expiresAt) }}</span>
          </span>
          <span class="muted small">{{ uaShort(s.userAgent) }}</span>
        </li>
      </ul>
    </section>

    <PrivacyUnlockModal :show="showUnlockModal" @close="showUnlockModal = false" @unlocked="onUnlocked" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/index';
import { usePrivacyStore } from '@/stores/privacy';
import PrivacyUnlockModal from '@/components/privacy/PrivacyUnlockModal.vue';

interface NickRow {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: string;
  privacyMode: 'main' | 'sub';
}

const store = usePrivacyStore();
const nicks = ref<NickRow[]>([]);
const loading = ref(false);
const showUnlockModal = ref(false);
const flipping = ref<string | null>(null);

onMounted(async () => {
  await Promise.all([store.fetchStatus(true), loadNicks()]);
});

async function loadNicks() {
  loading.value = true;
  try {
    const { data } = await api.get('/zalo-accounts/my');
    nicks.value = (data.accounts ?? data ?? []).map((a: any) => ({
      id: a.id,
      displayName: a.displayName,
      avatarUrl: a.avatarUrl,
      phone: a.phone,
      status: a.status,
      privacyMode: a.privacyMode ?? 'sub',
    }));
  } catch (e) {
    console.warn('Load nicks failed', e);
    nicks.value = [];
  } finally {
    loading.value = false;
  }
}

async function flipMode(nickId: string, newMode: 'main' | 'sub') {
  if (newMode === 'main' && !store.hasPin) {
    alert('Bạn cần setup PIN trước khi bật Riêng tư cho nick.');
    showUnlockModal.value = true;
    return;
  }
  flipping.value = nickId;
  try {
    await store.flipNickPrivacyMode(nickId, newMode);
    await loadNicks();
  } catch (e: any) {
    alert(e?.response?.data?.error || 'Lỗi flip mode');
  } finally {
    flipping.value = null;
  }
}

async function lockNow() {
  if (!confirm('Khoá tất cả phiên Riêng tư ngay bây giờ?')) return;
  await store.lock();
}

function onUnlocked() {
  // Modal đóng, refresh status
  store.fetchStatus(true);
}

function statusLabel(s: string): string {
  if (s === 'connected') return '🟢 Đã kết nối';
  if (s === 'disconnected') return '⚪ Ngắt kết nối';
  if (s === 'qr_pending') return '🟡 Chờ QR';
  return s;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleString('vi-VN'); } catch { return iso; }
}

function uaShort(ua: string | null): string {
  if (!ua) return '';
  return ua.length > 50 ? ua.slice(0, 50) + '...' : ua;
}
</script>

<style scoped>
.privacy-settings { padding: 20px 24px; max-width: 900px; }
.page-head { margin-bottom: 20px; }
.page-head h2 { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
.muted { color: #6B7280; font-size: 13px; margin: 0; }
.muted.small { font-size: 11px; }

.card { background: white; border: 1px solid #E4E5E9; border-radius: 10px; padding: 16px 18px; margin-bottom: 16px; }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 700; }
.card-actions { margin-top: 12px; }

.status-tag { font-size: 11px; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
.status-tag.green { background: #DCFCE7; color: #166534; }
.status-tag.orange { background: #FEF3C7; color: #92400E; }

.btn-primary { background: #5E6AD2; color: white; border: 0; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
.btn-ghost { background: white; border: 1px solid #E4E5E9; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }

.nicks-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.nicks-table th { background: #F9FAFB; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; color: #6B7280; text-transform: uppercase; }
.nicks-table td { padding: 10px; border-bottom: 1px solid #F4F4F7; }
.nicks-table tr:last-child td { border-bottom: 0; }
.nick-cell { display: flex; align-items: center; gap: 8px; }
.avatar { width: 28px; height: 28px; border-radius: 50%; }
.status-pill { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.status-pill.s-connected { background: #DCFCE7; color: #166534; }
.status-pill.s-disconnected { background: #F4F4F7; color: #6B7280; }
.status-pill.s-qr_pending { background: #FEF3C7; color: #92400E; }

.switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.switch input { position: absolute; opacity: 0; pointer-events: none; }
.switch .slider { width: 36px; height: 20px; background: #D1D5DB; border-radius: 999px; position: relative; transition: 0.2s; }
.switch .slider::before { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: 0.2s; }
.switch input:checked + .slider { background: #5E6AD2; }
.switch input:checked + .slider::before { transform: translateX(16px); }
.switch input:disabled + .slider { opacity: 0.5; }
.switch-label { font-size: 12px; min-width: 90px; }

.session-list { list-style: none; margin: 0; padding: 0; }
.session-list li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F4F4F7; font-size: 12px; }
.session-list li:last-child { border-bottom: 0; }

.loading, .empty { padding: 30px; text-align: center; color: #97A0AC; font-size: 13px; }
</style>
