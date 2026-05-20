<template>
  <div class="airtable-scope bot-auto-shell">
    <aside class="bot-auto-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <v-icon size="20">mdi-robot-outline</v-icon>
        </div>
        <div>
          <div class="sidebar-title">Bot-Auto</div>
          <div class="sidebar-subtitle">Automation framework</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          active-class="is-active"
        >
          <v-icon size="18" class="sidebar-link__icon">{{ item.icon }}</v-icon>
          <span class="sidebar-link__label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-foot-card">
          <div class="sidebar-foot-card__title">Phase 7 đang phát triển</div>
          <p class="sidebar-foot-card__desc">
            Block · Sequence · Trigger · Broadcast.
            Channel: Zalo cá nhân (per-nick).
          </p>
        </div>
      </div>
    </aside>

    <main class="bot-auto-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import '@/components/automation/phase7/airtable.css';

const navItems = [
  { to: '/automation/bot/triggers',   label: 'Kịch bản',                  icon: 'mdi-lightning-bolt' },
  { to: '/automation/bot/blocks',     label: 'Thư viện block',            icon: 'mdi-puzzle' },
  { to: '/automation/bot/sequences',  label: 'Kịch bản chăm sóc',         icon: 'mdi-format-list-numbered' },
  { to: '/automation/bot/broadcasts', label: 'Broadcast & Re-marketing',  icon: 'mdi-bullhorn' },
];
</script>

<style scoped>
.bot-auto-shell {
  display: flex;
  height: calc(100vh - 64px);
}

.bot-auto-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--at-canvas);
  border-right: 1px solid var(--at-hairline);
  display: flex;
  flex-direction: column;
  padding: var(--at-s-lg) var(--at-s-md);
  gap: var(--at-s-lg);
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: var(--at-s-sm);
  padding: 0 var(--at-s-xxs);
}
.sidebar-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--at-r-md);
  background: var(--at-ink);
  color: var(--at-on-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sidebar-title {
  font-size: 18px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--at-ink);
}
.sidebar-subtitle {
  font-size: 12px;
  color: var(--at-muted);
  margin-top: 2px;
  letter-spacing: 0.16px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: var(--at-s-sm);
  padding: 10px 12px;
  border-radius: var(--at-r-sm);
  color: var(--at-body);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid transparent;
}
.sidebar-link:active {
  background: var(--at-surface-soft);
}
.sidebar-link.is-active {
  background: var(--at-ink);
  color: var(--at-on-primary);
  border-color: var(--at-ink);
}
.sidebar-link__icon {
  flex-shrink: 0;
}

.sidebar-footer {
  margin-top: auto;
}
.sidebar-foot-card {
  padding: var(--at-s-md);
  background: var(--at-cream);
  border-radius: var(--at-r-md);
}
.sidebar-foot-card__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--at-ink);
  margin-bottom: 4px;
}
.sidebar-foot-card__desc {
  font-size: 12px;
  line-height: 1.45;
  color: var(--at-body);
  margin: 0;
}

.bot-auto-content {
  flex: 1;
  padding: var(--at-s-xxl) var(--at-s-xxl);
  overflow-y: auto;
  background: var(--at-canvas);
}

@media (max-width: 900px) {
  .bot-auto-sidebar { width: 200px; padding: var(--at-s-md) var(--at-s-sm); }
  .bot-auto-content { padding: var(--at-s-md); }
}
</style>
