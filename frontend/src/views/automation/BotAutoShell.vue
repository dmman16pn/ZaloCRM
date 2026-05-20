<template>
  <div class="bot-auto-shell">
    <aside class="bot-auto-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <v-icon size="20" color="primary">mdi-robot-outline</v-icon>
        </div>
        <div>
          <div class="sidebar-title">Bot-Auto</div>
          <div class="sidebar-subtitle">Phase 7 framework</div>
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
          <div class="sidebar-link__icon" :style="{ '--icon-color': item.color }">
            <v-icon size="18">{{ item.icon }}</v-icon>
          </div>
          <span class="sidebar-link__label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-card">
          <v-icon size="16" color="primary">mdi-information-outline</v-icon>
          <div class="footer-card__body">
            <div class="footer-card__title">Phase 7 đang phát triển</div>
            <div class="footer-card__desc">Channel: Zalo cá nhân (per-nick).
              Block / Sequence / Trigger / Broadcast.</div>
          </div>
        </div>
      </div>
    </aside>

    <main class="bot-auto-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
const navItems = [
  { to: '/automation/bot/triggers',   label: 'Kịch bản',                  icon: 'mdi-lightning-bolt',          color: '#0EA5E9' },
  { to: '/automation/bot/blocks',     label: 'Thư viện block',            icon: 'mdi-puzzle',                  color: '#8B5CF6' },
  { to: '/automation/bot/sequences',  label: 'Kịch bản chăm sóc',         icon: 'mdi-format-list-numbered',    color: '#10B981' },
  { to: '/automation/bot/broadcasts', label: 'Broadcast & Re-marketing',  icon: 'mdi-bullhorn',                color: '#F59E0B' },
];
</script>

<style scoped>
.bot-auto-shell {
  display: flex;
  height: calc(100vh - 64px);
  background: #F6F8FC;
}

.bot-auto-sidebar {
  width: 248px;
  flex-shrink: 0;
  background: rgb(var(--v-theme-surface));
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
  gap: 18px;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
}
.sidebar-logo {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
}
.sidebar-subtitle {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-top: 1px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 10px;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.12s;
}
.sidebar-link:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: rgb(var(--v-theme-on-surface));
}
.sidebar-link.is-active {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.sidebar-link__icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: rgba(var(--icon-color, 100, 100, 100), 0.12);
  color: var(--icon-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sidebar-link.is-active .sidebar-link__icon {
  background: var(--icon-color);
  color: white;
}

.sidebar-footer {
  margin-top: auto;
}
.footer-card {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: 10px;
  font-size: 11.5px;
}
.footer-card__title {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.85);
  margin-bottom: 2px;
}
.footer-card__desc {
  color: rgba(var(--v-theme-on-surface), 0.6);
  line-height: 1.4;
}

.bot-auto-content {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  background: #F6F8FC;
}

@media (max-width: 900px) {
  .bot-auto-sidebar { width: 200px; padding: 12px 8px; }
  .bot-auto-content { padding: 16px; }
}
</style>
