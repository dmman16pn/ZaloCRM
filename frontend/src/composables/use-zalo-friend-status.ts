/**
 * use-zalo-friend-status.ts — Phase C: Cross-check friend state via Zalo SDK.
 *
 * Khi mở conv → 1 lần check `getFriendRequestStatus(uid)`:
 *   - is_friend = 1   → confirm Friend.relationshipKind = 'friend'
 *   - is_requesting = 1 → 'pending_sent' (mình đã gửi mời)
 *   - is_requested = 1  → 'pending_received' (KH gửi mời mình)
 *   - else            → 'ghost' (đã unfriend HOẶC chưa từng)
 *
 * Cache 5 phút per (accountId, friendUid) để tránh spam khi sale switch conv nhanh.
 * Display: chỉ override DB state nếu Zalo trả KHÁC — nếu giống thì giữ DB.
 */
import { ref, watch, onUnmounted } from 'vue';
import { api } from '@/api/index';

interface FriendStatus {
  isFriend: boolean;
  isRequesting: boolean; // KH gửi mời mình
  isRequested: boolean;  // Mình đã gửi mời
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60_000; // 5 min
const cache = new Map<string, FriendStatus>();

function cacheKey(accountId: string, friendUid: string) {
  return `${accountId}:${friendUid}`;
}

export function useZaloFriendStatus(
  accountId: () => string | null | undefined,
  friendUid: () => string | null | undefined,
) {
  const status = ref<FriendStatus | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchStatus() {
    const acc = accountId();
    const uid = friendUid();
    if (!acc || !uid) {
      status.value = null;
      return;
    }

    // Cache check
    const k = cacheKey(acc, uid);
    const cached = cache.get(k);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      status.value = cached;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      // Backend route: /friends/requests/:userId/status → response { data: { is_friend, is_requested, is_requesting } }
      const { data: wrap } = await api.get(`/zalo-accounts/${acc}/friends/requests/${uid}/status`);
      const data = wrap?.data ?? wrap; // unwrap if wrapped
      const result: FriendStatus = {
        isFriend: data?.is_friend === 1,
        isRequesting: data?.is_requesting === 1,
        isRequested: data?.is_requested === 1,
        fetchedAt: Date.now(),
      };
      cache.set(k, result);
      status.value = result;
    } catch (err: any) {
      error.value = err?.response?.data?.error || 'fetch_failed';
      status.value = null;
    } finally {
      loading.value = false;
    }
  }

  watch([accountId, friendUid], fetchStatus, { immediate: true });

  onUnmounted(() => {
    // Cache shared across components — không clear
  });

  /**
   * Manually set status (sau action như accept/reject/cancel). Update cả local ref +
   * shared cache để mọi component khác trên cùng (accountId, uid) cũng thấy state mới.
   */
  function setStatus(s: Partial<Omit<FriendStatus, 'fetchedAt'>>) {
    const acc = accountId();
    const uid = friendUid();
    if (!acc || !uid) return;
    const next: FriendStatus = {
      isFriend: s.isFriend ?? false,
      isRequesting: s.isRequesting ?? false,
      isRequested: s.isRequested ?? false,
      fetchedAt: Date.now(),
    };
    cache.set(cacheKey(acc, uid), next);
    status.value = next;
  }

  /** Clear cache cho cặp (accountId, uid) hiện tại để refresh lấy fresh data. */
  function invalidate() {
    const acc = accountId();
    const uid = friendUid();
    if (!acc || !uid) return;
    cache.delete(cacheKey(acc, uid));
    status.value = null;
  }

  return { status, loading, error, refresh: fetchStatus, setStatus, invalidate };
}
