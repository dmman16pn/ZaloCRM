/**
 * use-daily-brief.ts — State singleton cho popup "Hỏi AI về khách hàng hôm nay".
 *
 * Giữ ở module scope để đổi route / đổi layout (desktop ↔ mobile) không mất
 * hội thoại đang hỏi. Mọi gọi API đi qua đây; component chỉ lo render.
 */
import { ref, computed } from 'vue';
import { api } from '@/api';

export interface DailyBriefKpi {
  newContacts: number;
  inboundMessages: number;
  outboundMessages: number;
  activeCustomers: number;
  unrepliedConversations: number;
  unreadConversations: number;
  appointmentsToday: number;
  appointmentsCompleted: number;
  stuckLeads: number;
  notesToday: number;
}
export interface DailyBriefSnapshot {
  date: string;
  timezone: string;
  scope: 'org' | 'mine';
  kpi: DailyBriefKpi;
}
export interface DailyBriefTurn {
  role: 'user' | 'assistant';
  content: string;
  source?: 'ai' | 'fallback';
  error?: boolean;
}

export const DAILY_BRIEF_SUGGESTIONS = [
  'Tóm tắt tình trạng khách hàng hôm nay',
  'Khách nào đang chờ trả lời lâu nhất?',
  'Hôm nay có lịch hẹn nào?',
  'Khách mới hôm nay đến từ nguồn nào?',
  'Tôi nên ưu tiên việc gì bây giờ?',
];

const open = ref(false);
const messages = ref<DailyBriefTurn[]>([]);
const snapshot = ref<DailyBriefSnapshot | null>(null);
const asking = ref(false);
const loadingSnapshot = ref(false);
const lastError = ref<string | null>(null);

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string } } };
  return e?.response?.data?.error || fallback;
}

async function loadSnapshot(force = false): Promise<void> {
  if (loadingSnapshot.value) return;
  if (snapshot.value && !force) return;
  loadingSnapshot.value = true;
  lastError.value = null;
  try {
    const { data } = await api.get<DailyBriefSnapshot>('/ai/daily-brief');
    snapshot.value = data;
  } catch (err) {
    lastError.value = errorMessage(err, 'Không lấy được số liệu hôm nay');
  } finally {
    loadingSnapshot.value = false;
  }
}

/** Gửi câu hỏi kèm tối đa 8 lượt gần nhất làm ngữ cảnh. Trả về lỗi (nếu có) để UI toast. */
async function ask(question: string): Promise<string | null> {
  const q = question.trim();
  if (!q || asking.value) return null;
  const history = messages.value
    .filter((m) => !m.error)
    .slice(-8)
    .map(({ role, content }) => ({ role, content }));
  messages.value.push({ role: 'user', content: q });
  asking.value = true;
  lastError.value = null;
  try {
    const { data } = await api.post<{ answer: string; source: 'ai' | 'fallback'; snapshot: DailyBriefSnapshot }>(
      '/ai/daily-brief/ask',
      { question: q, history },
    );
    messages.value.push({ role: 'assistant', content: data.answer, source: data.source });
    if (data.snapshot) snapshot.value = data.snapshot;
    return null;
  } catch (err) {
    const msg = errorMessage(err, 'Không hỏi được AI lúc này, thử lại sau nhé');
    messages.value.push({ role: 'assistant', content: `⚠️ ${msg}`, source: 'fallback', error: true });
    lastError.value = msg;
    return msg;
  } finally {
    asking.value = false;
  }
}

function clear(): void {
  messages.value = [];
}

export function useDailyBrief() {
  const unrepliedBadge = computed(() => snapshot.value?.kpi.unrepliedConversations ?? 0);
  return {
    open,
    messages,
    snapshot,
    asking,
    loadingSnapshot,
    lastError,
    unrepliedBadge,
    suggestions: DAILY_BRIEF_SUGGESTIONS,
    loadSnapshot,
    ask,
    clear,
  };
}
