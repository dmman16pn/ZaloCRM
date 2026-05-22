<!--
  PrivateBlur — wrapper component cho content có thể bị server redact.

  Usage:
    <PrivateBlur :redacted="msg.redacted">{{ msg.content }}</PrivateBlur>

  Behavior:
    - redacted=false: pass-through, render slot bình thường
    - redacted=true: render slot blurred + cursor pointer + click → emit unlock-request

  Server đã trả ▒▒▒▒ trong content khi redacted, FE chỉ wrap visual + interaction.
-->
<template>
  <span
    v-if="redacted"
    class="private-blur"
    role="button"
    tabindex="0"
    title="Nội dung riêng tư — click để mở khoá"
    @click.stop="$emit('unlock-request')"
    @keyup.enter="$emit('unlock-request')"
  >
    <span class="blur-content"><slot /></span>
    <span class="lock-icon">🔒</span>
  </span>
  <span v-else><slot /></span>
</template>

<script setup lang="ts">
defineProps<{ redacted?: boolean }>();
defineEmits<{ 'unlock-request': [] }>();
</script>

<style scoped>
.private-blur {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  position: relative;
}
.blur-content {
  filter: blur(4px);
  letter-spacing: 1px;
  color: #6B7280;
  pointer-events: none;
  font-family: monospace;
}
.lock-icon {
  font-size: 0.85em;
  opacity: 0.6;
}
.private-blur:hover .blur-content {
  filter: blur(3px);
  color: #1D4ED8;
}
.private-blur:hover .lock-icon {
  opacity: 1;
}
.private-blur:focus {
  outline: 2px solid #5E6AD2;
  outline-offset: 2px;
  border-radius: 3px;
}
</style>
