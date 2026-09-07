<template>
  <div class="brief-root" :style="{ bottom: `${bottomOffset}px` }">
    <!-- ── Popup ───────────────────────────────────────────────────────── -->
    <transition name="brief-pop">
      <div v-if="open" class="brief-card" role="dialog" aria-label="Trợ lý AI khách hàng hôm nay">
        <header class="brief-head">
          <div class="brief-avatar"><v-icon size="18" color="white">mdi-robot-happy-outline</v-icon></div>
          <div class="brief-title">
            <div class="t">Trợ lý AI · Hôm nay</div>
            <div class="s">{{ subtitle }}</div>
          </div>
          <v-btn icon size="x-small" variant="text" title="Làm mới số liệu" :loading="loadingSnapshot" @click="refresh">
            <v-icon size="18">mdi-refresh</v-icon>
          </v-btn>
          <v-btn icon size="x-small" variant="text" title="Xoá hội thoại" :disabled="!messages.length" @click="clearChat">
            <v-icon size="18">mdi-broom</v-icon>
          </v-btn>
          <v-btn icon size="x-small" variant="text" title="Đóng" @click="close">
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </header>

        <!-- KPI nhanh -->
        <div v-if="snapshot" class="brief-kpis">
          <span class="kpi" title="Khách mới hôm nay"><b>{{ snapshot.kpi.newContacts }}</b> KH mới</span>
          <span class="kpi" title="Khách có tin nhắn đến hôm nay"><b>{{ snapshot.kpi.activeCustomers }}</b> đang tương tác</span>
          <span class="kpi" :class="{ warn: snapshot.kpi.unrepliedConversations > 0 }" title="Hội thoại chưa trả lời"><b>{{ snapshot.kpi.unrepliedConversations }}</b> chưa trả lời</span>
          <span class="kpi" title="Lịch hẹn hôm nay"><b>{{ snapshot.kpi.appointmentsToday }}</b> lịch hẹn</span>
          <span v-if="snapshot.kpi.stuckLeads > 0" class="kpi warn" title="Khách đình trệ"><b>{{ snapshot.kpi.stuckLeads }}</b> đình trệ</span>
        </div>

        <!-- Hội thoại -->
        <div ref="scrollRef" class="brief-body">
          <div class="msg msg--ai">
            <div class="bubble">
              Chào {{ firstName }} 👋 Hỏi mình bất cứ điều gì về khách hàng hôm nay: khách mới, ai đang chờ trả lời, lịch hẹn, việc nên ưu tiên…
            </div>
          </div>

          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role === 'user' ? 'msg--user' : 'msg--ai'">
            <div class="bubble" :class="{ 'bubble--error': m.error }">{{ m.content }}</div>
            <div v-if="m.role === 'assistant' && !m.error" class="meta">
              <span v-if="m.source === 'fallback'" class="fallback-tag" title="AI chưa bật hoặc chưa có API key — đây là tóm tắt tự động">tóm tắt tự động</span>
              <button v-if="canSpeak" class="speak" :class="{ on: speakingIndex === i }" :title="speakingIndex === i ? 'Dừng đọc' : 'Đọc to câu trả lời'" @click="toggleSpeak(i, m.content)">
                <v-icon size="15">{{ speakingIndex === i ? 'mdi-stop-circle-outline' : 'mdi-volume-high' }}</v-icon>
              </button>
            </div>
          </div>

          <div v-if="asking" class="msg msg--ai">
            <div class="bubble typing"><span></span><span></span><span></span></div>
          </div>
        </div>

        <!-- Gợi ý câu hỏi -->
        <div class="brief-suggest">
          <button v-for="q in suggestions" :key="q" class="chip" :disabled="asking" @click="send(q)">{{ q }}</button>
        </div>

        <!-- Nhập câu hỏi -->
        <footer class="brief-input">
          <textarea
            ref="inputRef"
            v-model="draft"
            rows="1"
            maxlength="500"
            placeholder="Hỏi về khách hàng hôm nay… (Enter để gửi)"
            :disabled="asking"
            @keydown.enter.exact.prevent="send()"
          />
          <v-btn icon size="small" color="primary" variant="flat" :disabled="!draft.trim() || asking" :loading="asking" title="Gửi" @click="send()">
            <v-icon size="18">mdi-send</v-icon>
          </v-btn>
        </footer>
      </div>
    </transition>

    <!-- ── Nút nổi ─────────────────────────────────────────────────────── -->
    <button class="brief-fab" :class="{ open }" :title="open ? 'Đóng trợ lý AI' : 'Hỏi AI về khách hàng hôm nay'" @click="toggle">
      <v-icon size="24" color="white">{{ open ? 'mdi-close' : 'mdi-robot-happy-outline' }}</v-icon>
      <span v-if="!open && unrepliedBadge > 0" class="badge">{{ unrepliedBadge > 99 ? '99+' : unrepliedBadge }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/use-toast';
import { useDailyBrief } from '@/composables/use-daily-brief';

withDefaults(defineProps<{ bottomOffset?: number }>(), { bottomOffset: 24 });

const auth = useAuthStore();
const toast = useToast();
const {
  open, messages, snapshot, asking, loadingSnapshot, lastError, unrepliedBadge, suggestions,
  loadSnapshot, ask, clear,
} = useDailyBrief();

const draft = ref('');
const scrollRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const firstName = computed(() => (auth.user?.fullName || '').trim().split(' ').pop() || 'bạn');
const subtitle = computed(() => {
  if (!snapshot.value) return 'Tình trạng khách hàng trong ngày';
  const [y, m, d] = snapshot.value.date.split('-');
  return `${d}/${m}/${y} · ${snapshot.value.scope === 'mine' ? 'khách của bạn' : 'toàn tổ chức'}`;
});

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

async function refresh() {
  await loadSnapshot(true);
  if (lastError.value) toast.push(lastError.value, 'error');
}

async function send(preset?: string) {
  const question = (preset ?? draft.value).trim();
  if (!question || asking.value) return;
  if (!preset) draft.value = '';
  scrollToBottom();
  const err = await ask(question);
  if (err) toast.push(err, 'error');
  scrollToBottom();
  nextTick(() => inputRef.value?.focus());
}

function clearChat() {
  stopSpeaking();
  clear();
}

function toggle() {
  open.value ? close() : openPopup();
}
async function openPopup() {
  open.value = true;
  scrollToBottom();
  nextTick(() => inputRef.value?.focus());
  await loadSnapshot();
  if (lastError.value) toast.push(lastError.value, 'error');
}
function close() {
  stopSpeaking();
  open.value = false;
}

// ── Đọc to câu trả lời (Web Speech API, giọng tiếng Việt nếu trình duyệt có) ──
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
const speakingIndex = ref<number | null>(null);

function stopSpeaking() {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  speakingIndex.value = null;
}
function toggleSpeak(index: number, text: string) {
  if (!canSpeak) return;
  if (speakingIndex.value === index) { stopSpeaking(); return; }
  stopSpeaking();
  const utter = new SpeechSynthesisUtterance(text.replace(/[•▪◦]/g, ' '));
  utter.lang = 'vi-VN';
  const viVoice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi'));
  if (viVoice) utter.voice = viVoice;
  utter.onend = () => { if (speakingIndex.value === index) speakingIndex.value = null; };
  utter.onerror = () => { if (speakingIndex.value === index) speakingIndex.value = null; };
  speakingIndex.value = index;
  window.speechSynthesis.speak(utter);
}

watch(open, (v) => { if (v) scrollToBottom(); });
watch(() => messages.value.length, scrollToBottom);
onBeforeUnmount(stopSpeaking);
</script>

<style scoped>
.brief-root {
  position: fixed;
  right: 20px;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  pointer-events: none;
}
.brief-root > * { pointer-events: auto; }

/* ── FAB ── */
.brief-fab {
  position: relative;
  width: 52px; height: 52px;
  border-radius: 50%;
  border: none; cursor: pointer;
  background: linear-gradient(135deg, #2962ff, #00b0ff);
  box-shadow: 0 8px 24px rgba(41, 98, 255, 0.35);
  display: flex; align-items: center; justify-content: center;
  transition: transform .15s ease, box-shadow .15s ease;
}
.brief-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(41, 98, 255, 0.45); }
.brief-fab.open { background: #1f2330; box-shadow: 0 6px 18px rgba(0,0,0,.3); }
.brief-fab .badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 10px;
  background: #ff3d00; color: white;
  font-size: 11px; font-weight: 700; line-height: 20px;
  border: 2px solid white;
}

/* ── Card ── */
.brief-card {
  width: min(400px, calc(100vw - 24px));
  height: min(560px, calc(100vh - 120px));
  background: var(--smax-bg, #fff);
  color: var(--smax-text, #212121);
  border-radius: 16px;
  box-shadow: 0 18px 48px rgba(0,0,0,.22);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.brief-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 10px 10px 14px;
  background: var(--smax-header-bg, #1f2330);
  color: white;
}
.brief-head :deep(.v-btn) { color: rgba(255,255,255,.8); }
.brief-avatar {
  width: 32px; height: 32px; border-radius: 10px;
  background: linear-gradient(135deg, #2962ff, #00b0ff);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.brief-title { flex: 1; min-width: 0; }
.brief-title .t { font-size: 14px; font-weight: 600; line-height: 1.2; }
.brief-title .s { font-size: 11.5px; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.brief-kpis {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--smax-grey-200, #ebedf0);
}
.kpi {
  font-size: 11.5px;
  padding: 3px 8px; border-radius: 999px;
  background: var(--smax-grey-100, #f5f6fa);
  color: var(--smax-grey-700, #5a6478);
  white-space: nowrap;
}
.kpi b { color: var(--smax-text, #212121); margin-right: 2px; }
.kpi.warn { background: #fff3e0; color: #e65100; }
.kpi.warn b { color: #e65100; }

.brief-body {
  flex: 1; overflow-y: auto;
  padding: 12px;
  display: flex; flex-direction: column; gap: 10px;
  background: var(--smax-grey-50, #fafbfc);
}
.msg { display: flex; flex-direction: column; max-width: 88%; }
.msg--ai { align-self: flex-start; }
.msg--user { align-self: flex-end; align-items: flex-end; }
.bubble {
  padding: 9px 12px;
  border-radius: 14px;
  font-size: 13.5px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word;
}
.msg--ai .bubble { background: var(--smax-bg, #fff); border: 1px solid var(--smax-grey-200, #ebedf0); border-bottom-left-radius: 4px; }
.msg--ai .bubble--error { background: #fff3e0; border-color: #ffcc80; color: #e65100; }
.msg--user .bubble { background: var(--smax-primary, #2962ff); color: white; border-bottom-right-radius: 4px; }
.meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; padding-left: 4px; }
.fallback-tag { font-size: 10.5px; color: var(--smax-grey-700, #5a6478); background: var(--smax-grey-200, #ebedf0); padding: 1px 6px; border-radius: 999px; }
.speak {
  border: none; background: transparent; cursor: pointer; padding: 2px;
  color: var(--smax-grey-700, #5a6478); border-radius: 6px; display: flex;
}
.speak:hover, .speak.on { color: var(--smax-primary, #2962ff); background: var(--smax-primary-soft, #e3f2fd); }

.typing { display: flex; gap: 4px; align-items: center; padding: 12px 14px; }
.typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--smax-grey-300, #d4d8de);
  animation: brief-bounce 1.2s infinite ease-in-out;
}
.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }
@keyframes brief-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-4px); opacity: 1; } }

.brief-suggest {
  display: flex; gap: 6px; overflow-x: auto;
  padding: 8px 12px 4px;
  scrollbar-width: none;
}
.brief-suggest::-webkit-scrollbar { display: none; }
.chip {
  flex-shrink: 0;
  font-size: 12px;
  padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--smax-grey-300, #d4d8de);
  background: var(--smax-bg, #fff);
  color: var(--smax-text, #212121);
  cursor: pointer;
}
.chip:hover:not(:disabled) { border-color: var(--smax-primary, #2962ff); color: var(--smax-primary, #2962ff); background: var(--smax-primary-soft, #e3f2fd); }
.chip:disabled { opacity: .5; cursor: default; }

.brief-input {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 8px 10px 10px 12px;
  border-top: 1px solid var(--smax-grey-200, #ebedf0);
}
.brief-input textarea {
  flex: 1; resize: none;
  min-height: 38px; max-height: 96px;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid var(--smax-grey-300, #d4d8de);
  background: var(--smax-grey-50, #fafbfc);
  color: var(--smax-text, #212121);
  font: inherit; font-size: 13.5px; line-height: 1.4;
  outline: none;
}
.brief-input textarea:focus { border-color: var(--smax-primary, #2962ff); background: var(--smax-bg, #fff); }

/* Transition */
.brief-pop-enter-active, .brief-pop-leave-active { transition: opacity .16s ease, transform .16s ease; }
.brief-pop-enter-from, .brief-pop-leave-to { opacity: 0; transform: translateY(12px) scale(.98); }

@media (max-width: 600px) {
  .brief-root { right: 12px; }
  .brief-card { height: min(560px, calc(100vh - 160px)); }
}
</style>
