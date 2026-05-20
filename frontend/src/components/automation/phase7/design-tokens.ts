// Phase 7 UI — shared design tokens for color-coding action types and
// trigger categories. Keep these consistent across all phase-7 views.

import type { BlockActionType, TriggerCategory } from '@/api/automation/types';

// ── Action type color palette ──────────────────────────────────────────────
// Each action gets: hex color (icon avatar bg), light bg (card tint), label.
export const ACTION_TYPE_COLOR: Record<BlockActionType, { bg: string; tint: string; text: string }> = {
  request_friend:    { bg: '#6366F1', tint: '#EEF2FF', text: '#4338CA' }, // indigo
  send_message:      { bg: '#10B981', tint: '#ECFDF5', text: '#047857' }, // emerald
  update_status:     { bg: '#F59E0B', tint: '#FFFBEB', text: '#B45309' }, // amber
  send_image:        { bg: '#06B6D4', tint: '#ECFEFF', text: '#0E7490' }, // cyan
  send_file:         { bg: '#6B7280', tint: '#F9FAFB', text: '#374151' }, // gray
  send_template:     { bg: '#8B5CF6', tint: '#F5F3FF', text: '#6D28D9' }, // violet
  add_tag:           { bg: '#EC4899', tint: '#FDF2F8', text: '#BE185D' }, // pink
  remove_tag:        { bg: '#94A3B8', tint: '#F8FAFC', text: '#475569' }, // slate
  assign_user:       { bg: '#0EA5E9', tint: '#F0F9FF', text: '#0369A1' }, // sky
  update_lead_score: { bg: '#F43F5E', tint: '#FFF1F2', text: '#BE123C' }, // rose
};

// ── Trigger category palette ───────────────────────────────────────────────
export const CATEGORY_COLOR: Record<TriggerCategory, { bg: string; tint: string; text: string; label: string }> = {
  general:  { bg: '#0EA5E9', tint: '#F0F9FF', text: '#0369A1', label: 'Chung' },
  keyword:  { bg: '#8B5CF6', tint: '#F5F3FF', text: '#6D28D9', label: 'Từ khoá' },
  bot_api:  { bg: '#10B981', tint: '#ECFDF5', text: '#047857', label: 'Bot API' },
  livechat: { bg: '#F59E0B', tint: '#FFFBEB', text: '#B45309', label: 'Live Chat' },
  genai:    { bg: '#EC4899', tint: '#FDF2F8', text: '#BE185D', label: 'GenAI' },
};

// ── Event-type → icon (used by Triggers Catalog cards) ─────────────────────
export const EVENT_ICON: Record<string, string> = {
  friendship_accepted:     'mdi-account-heart',
  friendship_received:     'mdi-account-question-outline',
  first_message_received:  'mdi-message-reply-text-outline',
  message_received:        'mdi-message-outline',
  keyword_match:           'mdi-text-search',
  contact_created:         'mdi-account-plus',
  contact_status_changed:  'mdi-tag-arrow-right',
  contact_imported:        'mdi-database-import',
  birthday:                'mdi-cake-variant',
  scheduled_cron:          'mdi-clock-time-eight-outline',
  time_elapsed:            'mdi-timer-sand',
  manual_run:              'mdi-gesture-tap-button',
  order_success:           'mdi-cart-check',
};

export function iconForEvent(eventType: string): string {
  return EVENT_ICON[eventType] ?? 'mdi-flash';
}
