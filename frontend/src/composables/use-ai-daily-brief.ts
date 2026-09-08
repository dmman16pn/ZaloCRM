/**
 * use-ai-daily-brief — state singleton cho popup "Hỏi AI về khách hôm nay".
 *
 * Singleton (module-level ref) để popup giữ nguyên hội thoại khi chuyển trang.
 * Hội thoại được cache vào sessionStorage theo NGÀY (org TZ) → F5 không mất,
 * sang ngày mới tự bắt đầu lại.
 */
import { ref, computed } from 'vue';
import { api } from '@/api';
import { orgDayKey } from '@/composables/use-org-timezone';

export interface BriefContact {
  id: string;
  name: string;
  status: string | null;
  leadScore: number;
  assignedTo: string | null;
  lastInboundAt: string | null;
  lastInboundPreview: string | null;
}

export interface BriefConversation {
  conversationId: string;
  contactId: string | null;
  contactName: string;
  zaloAccount: string;
  lastMessageAt: string | null;
  waitingMinutes: number | null;
  unreadCount: number;
}

export interface BriefAppointment {
  id: string;
  time: string | null;
  title: string | null;
  type: string | null;
  status: string;
  contactId: string;
  contactName: string;
  assignedTo: string | null;
  location: string | null;
}

export interface DailyBriefSnapshot {
  date: string;
  dateLabel: string;
  timezone: string;
  generatedAt: string;
  scope: 'org' | 'user';
  counts: {
    newContacts: number;
    contactsActive: number;
    inboundMessages: number;
    outboundMessages: number;
    unrepliedConversations: number;
    appointmentsTotal: number;
    appointmentsScheduled: number;
    appointmentsCompleted: number;
    appointmentsCancelled: number;
    notesWritten: number;
    stuckContacts: number;
    hotContacts: number;
  };
  newContacts: BriefContact[];
  activeContacts: BriefContact[];
  unrepliedConversations: BriefConversation[];
  appointments: BriefAppointment[];
  hotContacts: BriefContact[];
  stuckContacts: BriefContact[];
}

export interface BriefMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  at: string;          // ISO
  error?: boolean;     // assistant message là thông báo lỗi (không gửi lại trong history)
}

export const SUGGESTED_QUESTIONS = [
  'Hôm nay có bao nhiêu khách mới, họ là ai?',
  'Khách nào đang chờ trả lời lâu nhất?',
  'Lịch hẹn hôm nay thế nào, cái nào chưa xong?',
  'Tôi nên ưu tiên chăm khách nào ngay bây giờ?',
  'Tóm tắt tình hình khách hàng hôm nay trong 5 dòng.',
];

const STORAGE_KEY = 'ai-daily-brief:chat';

const isOpen = ref(false);
const snapshot = ref<DailyBriefSnapshot | null>(null);
const snapshotLoading = ref(false);
const snapshotError = ref('');
const messages = ref<BriefMessage[]>([]);
const asking = ref(false);
const unseenAnswers = ref(0);
let counter = 0;
let restored = false;

function todayKey(): string {
  return orgDayKey(new Date());
}

function restore() {
  if (restored) return;
  restored = true;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { day: string; messages: BriefMessage[] };
    if (parsed.day === todayKey() && Array.isArray(parsed.messages)) {
      messages.value = parsed.messages;
      counter = parsed.messages.reduce((m, x) => Math.max(m, x.id), 0);
    }
  } catch { /* ignore */ }
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ day: todayKey(), messages: messages.value }));
  } catch { /* ignore */ }
}

function push(role: BriefMessage['role'], content: string, error = false): BriefMessage {
  const msg: BriefMessage = { id: ++counter, role, content, at: new Date().toISOString(), error };
  messages.value.push(msg);
  persist();
  return msg;
}

function errorText(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || fallback;
}

export function useAiDailyBrief() {
  restore();

  const hasMessages = computed(() => messages.value.length > 0);

  async function loadSnapshot(force = false) {
    if (snapshotLoading.value) return;
    if (snapshot.value && !force && snapshot.value.date === todayKey()) return;
    snapshotLoading.value = true;
    snapshotError.value = '';
    try {
      const res = await api.get<DailyBriefSnapshot>('/ai/daily-brief');
      snapshot.value = res.data;
    } catch (err) {
      snapshotError.value = errorText(err, 'Không lấy được số liệu hôm nay.');
    } finally {
      snapshotLoading.value = false;
    }
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || asking.value) return;
    // Sang ngày mới → bắt đầu hội thoại mới cho đúng ngữ cảnh.
    const stored = messages.value[0];
    if (stored && orgDayKey(stored.at) !== todayKey()) messages.value = [];

    const history = messages.value
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    push('user', q);
    asking.value = true;
    try {
      const res = await api.post<{ answer: string; snapshot: DailyBriefSnapshot }>('/ai/daily-brief/ask', { question: q, history });
      snapshot.value = res.data.snapshot;
      push('assistant', res.data.answer);
      if (!isOpen.value) unseenAnswers.value += 1;
    } catch (err) {
      push('assistant', errorText(err, 'Trợ lý AI chưa trả lời được. Thử lại sau ít phút.'), true);
    } finally {
      asking.value = false;
    }
  }

  function open() {
    isOpen.value = true;
    unseenAnswers.value = 0;
    void loadSnapshot();
  }
  function close() { isOpen.value = false; }
  function toggle() { isOpen.value ? close() : open(); }

  function clearChat() {
    messages.value = [];
    persist();
  }

  return {
    isOpen, snapshot, snapshotLoading, snapshotError, messages, asking, hasMessages, unseenAnswers,
    open, close, toggle, ask, loadSnapshot, clearChat,
  };
}
