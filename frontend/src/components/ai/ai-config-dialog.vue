<template>
  <v-dialog :model-value="modelValue" max-width="520" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>Cấu hình AI</v-card-title>
      <v-card-text>
        <v-select v-model="local.provider" :items="providers" label="Provider" class="mb-3" @update:model-value="onProviderChange" />
        <v-select v-model="local.model" :items="modelOptions" label="Model" class="mb-3" />
        <v-text-field v-model.number="local.maxDaily" type="number" label="Quota mỗi ngày" :min="1" :rules="[v => v >= 1 || 'Tối thiểu 1']" class="mb-3" />
        <v-switch v-model="local.enabled" label="Bật AI" inset color="primary" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Đóng</v-btn>
        <v-btn color="primary" :loading="loading" @click="$emit('save', local)">Lưu</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  loading: boolean;
  config: { provider: string; model: string; maxDaily: number; enabled: boolean };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [value: { provider: string; model: string; maxDaily: number; enabled: boolean }];
}>();

const providers = [
  { title: 'Anthropic', value: 'anthropic' },
  { title: 'Gemini', value: 'gemini' },
];

/* Models grouped by provider */
const modelsByProvider: Record<string, { title: string; value: string }[]> = {
  anthropic: [
    { title: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
    { title: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { title: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
    { title: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
  ],
  gemini: [
    { title: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
    { title: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
    { title: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
    { title: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
  ],
};

const modelOptions = computed(() => modelsByProvider[local.provider] ?? []);

const local = reactive({ provider: 'anthropic', model: '', maxDaily: 500, enabled: true });

/* When provider changes, auto-select first model if current is invalid */
function onProviderChange() {
  const valid = modelOptions.value.some(m => m.value === local.model);
  if (!valid) local.model = modelOptions.value[0]?.value ?? '';
}

watch(() => props.config, (value) => {
  local.provider = value.provider;
  local.model = value.model;
  local.maxDaily = value.maxDaily;
  local.enabled = value.enabled;
}, { immediate: true, deep: true });
</script>
