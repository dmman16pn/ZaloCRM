<template>
  <div class="broadcasts-view">
    <header class="at-page-header">
      <div>
        <h1 class="at-page-title">Broadcast &amp; Re-marketing</h1>
        <p class="at-page-subtitle">
          Mass send qua Zalo cá nhân với pacing per-nick (cap, hour range, throttle, random delay).
          Mỗi broadcast = 1 block + 1 segment + lịch chạy.
        </p>
      </div>
      <span class="at-chip">Đang phát triển · Phase F</span>
    </header>

    <div class="placeholder-card at-card at-card--lg">
      <div class="placeholder-icon">
        <v-icon size="36">mdi-bullhorn-outline</v-icon>
      </div>
      <h2 class="placeholder-title">Phase F sẽ ship sau</h2>
      <p class="placeholder-desc">
        Backend đã có schema (<code>automation_broadcasts</code> + materializer hooks).
        UI Broadcast CRUD + pacing engine + scheduler cron sẽ build sau khi
        engine wiring Phase E3 + Phase G full hoàn tất.
      </p>

      <div class="placeholder-grid">
        <div class="placeholder-item">
          <v-icon size="18" color="success">mdi-check-circle</v-icon>
          <div>
            <strong>Schema sẵn</strong>
            <span>7 cột, indexed, ready</span>
          </div>
        </div>
        <div class="placeholder-item">
          <v-icon size="18" color="success">mdi-check-circle</v-icon>
          <div>
            <strong>Engine hỗ trợ</strong>
            <span>Campaign materializer xử lý broadcastId</span>
          </div>
        </div>
        <div class="placeholder-item">
          <v-icon size="18" style="color: var(--at-mustard)">mdi-progress-clock</v-icon>
          <div>
            <strong>CRUD UI</strong>
            <span>Cần build</span>
          </div>
        </div>
        <div class="placeholder-item">
          <v-icon size="18" style="color: var(--at-mustard)">mdi-progress-clock</v-icon>
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

.placeholder-card {
  text-align: center;
  padding: var(--at-s-xxl) var(--at-s-xl);
  max-width: 720px;
  margin: 0 auto;
  border-style: dashed;
}
.placeholder-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--at-r-md);
  background: var(--at-cream);
  color: var(--at-mustard);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--at-s-md);
}
.placeholder-title {
  font-size: 20px;
  font-weight: 500;
  margin: 0 0 var(--at-s-xs);
  color: var(--at-ink);
}
.placeholder-desc {
  font-size: 14px;
  color: var(--at-body);
  line-height: 1.5;
  max-width: 520px;
  margin: 0 auto var(--at-s-lg);
}
.placeholder-desc code {
  background: var(--at-surface-soft);
  padding: 1px 6px;
  border-radius: var(--at-r-xs);
  font-size: 12px;
  border: 1px solid var(--at-hairline);
}

.placeholder-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--at-s-sm);
  text-align: left;
  max-width: 480px;
  margin: 0 auto;
}

@media (max-width: 767px) {
  .placeholder-card { padding: var(--at-s-xl) var(--at-s-md); }
  .placeholder-grid { grid-template-columns: 1fr; }
  .placeholder-title { font-size: 18px; }
  .placeholder-desc { font-size: 13px; }
}
.placeholder-item {
  display: flex;
  align-items: center;
  gap: var(--at-s-sm);
  padding: var(--at-s-sm);
  background: var(--at-surface-soft);
  border-radius: var(--at-r-md);
}
.placeholder-item strong {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--at-ink);
}
.placeholder-item span {
  display: block;
  font-size: 12px;
  color: var(--at-muted);
  margin-top: 2px;
}
</style>
