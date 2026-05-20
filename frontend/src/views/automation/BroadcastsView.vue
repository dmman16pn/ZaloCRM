<template>
  <div class="broadcasts-view">
    <div class="page-header mb-5">
      <div>
        <h1 class="page-title">Broadcast & Re-marketing</h1>
        <p class="page-subtitle">
          Mass send qua Zalo cá nhân với pacing per-nick (cap, hour range, throttle, random delay).
        </p>
      </div>
      <v-chip color="warning" variant="tonal" size="small">
        <v-icon start size="small">mdi-progress-wrench</v-icon>
        Đang phát triển — Phase F
      </v-chip>
    </div>

    <div class="placeholder-card">
      <div class="placeholder-icon">
        <v-icon size="40" color="warning">mdi-bullhorn</v-icon>
      </div>
      <h2 class="placeholder-title">Phase F sẽ ship sau</h2>
      <p class="placeholder-desc">
        Backend đã có schema (<code>automation_broadcasts</code> + materializer hooks).
        UI Broadcast CRUD + pacing engine + scheduler cron sẽ build sau khi
        engine wiring Phase E3 + Phase G full hoàn tất.
      </p>

      <div class="placeholder-grid">
        <div class="placeholder-item">
          <v-icon size="20" color="success">mdi-check-circle</v-icon>
          <div>
            <strong>Schema sẵn</strong>
            <span>7 cột, indexed, ready</span>
          </div>
        </div>
        <div class="placeholder-item">
          <v-icon size="20" color="success">mdi-check-circle</v-icon>
          <div>
            <strong>Engine hỗ trợ</strong>
            <span>Campaign materializer xử lý broadcastId</span>
          </div>
        </div>
        <div class="placeholder-item">
          <v-icon size="20" color="warning">mdi-progress-clock</v-icon>
          <div>
            <strong>CRUD UI</strong>
            <span>Cần build</span>
          </div>
        </div>
        <div class="placeholder-item">
          <v-icon size="20" color="warning">mdi-progress-clock</v-icon>
          <div>
            <strong>Pacing scheduler</strong>
            <span>Cần build cron + token bucket</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.broadcasts-view { max-width: 1080px; }
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.page-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: rgb(var(--v-theme-on-surface)); }
.page-subtitle { margin: 0; font-size: 13px; color: rgba(var(--v-theme-on-surface), 0.6); }

.placeholder-card {
  background: rgb(var(--v-theme-surface));
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  max-width: 720px;
  margin: 0 auto;
}
.placeholder-icon {
  width: 72px; height: 72px;
  border-radius: 16px;
  background: rgba(245, 158, 11, 0.1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.placeholder-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px;
  color: rgb(var(--v-theme-on-surface));
}
.placeholder-desc {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  line-height: 1.5;
  max-width: 520px;
  margin: 0 auto 24px;
}
.placeholder-desc code {
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.placeholder-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  text-align: left;
  max-width: 480px;
  margin: 0 auto;
}
.placeholder-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 10px;
}
.placeholder-item strong {
  display: block;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface));
}
.placeholder-item span {
  display: block;
  font-size: 11.5px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-top: 1px;
}
</style>
