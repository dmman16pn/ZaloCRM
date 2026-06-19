# Thiết kế: Đăng bài sản phẩm tự động vào nhóm Zalo (Bot nội bộ → CRM)

> Ngày: 2026-06-19 · Trạng thái: Spec chờ duyệt
> Phạm vi: 2 repo — **BOT NỘI BỘ** (`/Users/man/Downloads/VS/BOT TONG HOP NOI BO`) và **Zalo CRM** (`/Users/man/Downloads/VS/Zalo CRM`).

## 1. Mục tiêu

Cho phép nhân viên ở **app bot nội bộ** tạo một **danh sách bài đăng theo lịch** (module "Đăng Bài"): chọn sản phẩm → bot soạn sẵn nội dung + ảnh, chọn **1 tài khoản Zalo (nick) + nhiều nhóm** của CRM, đặt **lịch lặp định kỳ**. Khi tới giờ, bot gọi API CRM để CRM **đăng bài + ảnh vào các nhóm Zalo đã chọn**.

Phân vai:
- **Bot nội bộ** sở hữu: dữ liệu sản phẩm (bảng `products`, ảnh là URL HTTPS KiotViet CDN), module UI "Đăng Bài", danh sách job, bộ lập lịch (`node-cron`), soạn nội dung bài.
- **CRM** sở hữu: tài khoản Zalo + danh sách nhóm, hành vi **đăng thật** vào Zalo (qua `zca-js`). CRM là "máy đăng" thuần — nhận payload đã sẵn sàng, **không sửa nội dung**.

## 2. Quyết định đã chốt (từ brainstorming)

| Vấn đề | Quyết định |
|---|---|
| Phạm vi | Làm cả 2 phía: CRM + bot nội bộ |
| Chuyển ảnh | Bot cung cấp **URL ảnh HTTPS công khai** (KiotViet CDN) → CRM tải về đăng. Đã xác minh qua được SSRF guard (HTTPS). |
| Phạm vi đăng | **1 tài khoản + nhiều nhóm** mỗi job |
| Kiểu lịch | **Lặp định kỳ** (cron), không có hẹn-1-lần |
| Mô hình nội dung | Bot có module "Đăng Bài", user thêm mục vào danh sách; bot soạn full nội dung |
| Caption | Bot soạn đầy đủ (tên + giá + mô tả + ảnh); **CRM đăng nguyên văn, không sửa** |
| Hướng tiếp cận | **A — endpoint broadcast chuyên dụng** ở CRM (giãn nhịp server-side, trả per-group) |

## 3. Kiến trúc & luồng dữ liệu

```
┌─ BOT NỘI BỘ (Express 5 + pg + node-cron) ─┐        ┌─ ZALO CRM (Fastify) ─┐
│ Module "Đăng Bài"                          │        │ Public API (API-key)  │
│                                            │        │                       │
│ 1. User thêm job vào danh sách:            │        │                       │
│    - chọn SP  → soạn content + image_urls  │  GET   │ /api/public/          │
│    - chọn account + nhiều nhóm  ───────────┼───────►│   zalo-accounts       │
│      (dropdown lấy từ CRM, qua proxy bot)  │  GET   │ /.../:id/groups       │
│    - đặt cron_expr                         │        │                       │
│                                            │        │                       │
│ 2. node-cron quét job tới hạn ─── POST ────┼───────►│ /api/public/groups/   │
│    {accountId, groupIds[],                 │        │   broadcast           │
│     content, imageUrls[]}                  │        │  → đăng từng nhóm      │
│                                            │        │    (giãn nhịp) qua     │
│ 3. Ghi log per-group  ◄────────────────────┼────────┤    zca-js → per-group │
└────────────────────────────────────────────┘        └───────────────────────┘
```

Auth: bot → CRM dùng **API key** `zcrm_...` (đã tạo cho org Kim Mỹ), lưu server-side trong bot (`.env`), gọi qua backend bot (proxy) để **không lộ key ra browser**.

## 4. Phía CRM — chi tiết (repo Zalo CRM)

File: `backend/src/modules/api/public-api-routes.ts` (đã có `apiKeyAuth` preHandler — tái dùng).

### 4.1 `GET /api/public/zalo-accounts`
Liệt kê nick để bot cho chọn "tài khoản đăng".
- Query: `prisma.zaloAccount.findMany({ where: { orgId, archivedAt: null }, select: { id, displayName, status, avatarUrl } })`.
- Response: `{ accounts: [{ id, displayName, status, avatarUrl }] }`.
- Không lọc `status` (trả cả connected/disconnected) để UI hiển thị trạng thái; bot/khuyến nghị chỉ cho chọn `connected`.

### 4.2 `GET /api/public/zalo-accounts/:accountId/groups`
Liệt kê nhóm của 1 nick để bot cho chọn nhóm.
- Verify account thuộc org (404 nếu không).
- Query: `prisma.conversation.findMany({ where: { orgId, zaloAccountId, threadType: 'group' }, select: { externalThreadId, groupName, groupAvatarUrl, groupMembersCount }, orderBy: { lastMessageAt: 'desc' } })`.
- Response: `{ groups: [{ groupId: externalThreadId, name: groupName, avatar: groupAvatarUrl, membersCount }] }`.
- Lưu ý: nguồn nhóm là các Conversation `threadType='group'` CRM đã đồng bộ. Nếu nick có nhóm mới chưa sync → không hiện. (Mục Rủi ro §8.)

### 4.3 `POST /api/public/groups/broadcast`
Đăng 1 bài (content + ảnh) vào **nhiều nhóm** của **1 nick**.
- Body: `{ zaloAccountId, groupIds: string[], content?: string, imageUrls?: string[] }`.
- Validate: `zaloAccountId` + `groupIds` (≥1) bắt buộc; phải có `content` HOẶC ≥1 ảnh; `groupIds.length ≤ 50`; `imageUrls.length ≤ 10`.
- Verify account thuộc org + `status='connected'` + có trong pool (giống `messages/send`).
- Với mỗi `groupId` (tuần tự, **giãn nhịp** `BROADCAST_GROUP_DELAY_MS`, mặc định 7000ms, env-config):
  - Tải ảnh (tái dùng `downloadImage` đã có: HTTPS-only, type/size guard) → tmp.
  - `api.sendMessage({ msg: content ?? '', attachments: tmpPaths }, groupId, /*threadType group*/ 1)` (hoặc text-only nếu không ảnh).
  - Thu kết quả `{ groupId, ok: true }` hoặc `{ groupId, ok: false, error }` — **không dừng cả lô khi 1 nhóm lỗi**.
  - Cleanup tmp sau mỗi nhóm (hoặc cuối cùng).
- Response: `{ success: true, results: [{ groupId, ok, error? }], sent, failed }` (HTTP 200 kể cả khi vài nhóm lỗi; 4xx chỉ khi sai input/account).
- Tái dùng tối đa code `messages/send`: tách helper `sendToThread(api, threadId, threadType, content, imageUrls)` để cả `messages/send` (group/user đơn) lẫn `broadcast` (nhiều nhóm) dùng chung → tránh trùng logic tải ảnh.

### 4.4 Rate limit / chống khóa nick
- `broadcast` **không** áp daily limit (đồng nhất chủ trương đã chốt: gửi không giới hạn ngày).
- Giãn nhịp giữa nhóm (`BROADCAST_GROUP_DELAY_MS`) là cơ chế chính giảm rủi ro khóa nick khi đăng loạt.
- Burst guard CRM (`ZALO_MSG_BURST`) vẫn còn cho đường `messages/send`; broadcast tự giãn nhịp nên không trip.

## 5. Phía Bot — chi tiết (repo BOT NỘI BỘ)

Stack: Express 5 + pg + node-cron. Pattern module: `modules/<tool>/config.json` (đăng ký tool) + `frontend/modules/<tool>.js` (UI) + `backend/routes/<tool>.js` (API). DB: `botniobo` (container `bot-postgres`), migration hiện tại 040 → tạo mới **041**.

### 5.1 DB migration 041 (file mới, KHÔNG sửa migration cũ)
```sql
-- 041_zalo_post_jobs.sql
CREATE TABLE IF NOT EXISTS zalo_post_jobs (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255),                 -- nhãn job (tự gợi ý từ tên SP)
  product_ids     INTEGER[] DEFAULT '{}',       -- SP nguồn (để soạn lại content khi sửa)
  crm_account_id  VARCHAR(64) NOT NULL,         -- zaloAccountId bên CRM
  crm_account_name VARCHAR(255),                -- snapshot tên nick (hiển thị)
  crm_group_ids   TEXT[] NOT NULL DEFAULT '{}', -- externalThreadId các nhóm
  crm_group_names JSONB DEFAULT '[]',           -- snapshot tên nhóm (hiển thị)
  content         TEXT,                         -- nội dung đã soạn (bot gửi nguyên văn)
  image_urls      JSONB DEFAULT '[]',           -- URL ảnh HTTPS
  cron_expr       VARCHAR(120) NOT NULL,        -- lịch lặp (node-cron 5-field)
  enabled         BOOLEAN DEFAULT true,
  last_run_at     TIMESTAMPTZ,
  last_status     VARCHAR(20),                  -- ok | partial | failed
  next_run_at     TIMESTAMPTZ,
  created_by      INTEGER,                      -- nhân viên tạo
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zalo_post_job_runs (
  id          SERIAL PRIMARY KEY,
  job_id      INTEGER REFERENCES zalo_post_jobs(id) ON DELETE CASCADE,
  ran_at      TIMESTAMPTZ DEFAULT now(),
  trigger     VARCHAR(20) DEFAULT 'cron',       -- cron | manual
  status      VARCHAR(20),                       -- ok | partial | failed
  results     JSONB DEFAULT '[]',                -- [{groupId, groupName, ok, error}]
  sent        INTEGER DEFAULT 0,
  failed      INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_zpj_enabled ON zalo_post_jobs(enabled);
CREATE INDEX IF NOT EXISTS idx_zpjr_job ON zalo_post_job_runs(job_id, ran_at DESC);
INSERT INTO schema_migrations (version, description) VALUES ('041', 'Zalo post jobs + runs')
ON CONFLICT DO NOTHING;
```

### 5.2 Backend route (`backend/routes/dang-bai.js` — file mới)
Một router Express, mount vào server hiện có. Endpoint nội bộ (auth theo cơ chế bot sẵn có):
- `GET  /api/dang-bai/jobs` — danh sách job + last run.
- `POST /api/dang-bai/jobs` — tạo job (body: name, product_ids, crm_account_id, crm_group_ids, content, image_urls, cron_expr).
- `PUT  /api/dang-bai/jobs/:id` — sửa.
- `DELETE /api/dang-bai/jobs/:id` — xoá.
- `POST /api/dang-bai/jobs/:id/run` — **đăng ngay** (trigger='manual').
- `POST /api/dang-bai/jobs/:id/toggle` — bật/tắt.
- `GET  /api/dang-bai/jobs/:id/runs` — lịch sử chạy.
- **Proxy CRM** (giữ key server-side):
  - `GET /api/dang-bai/crm/accounts` → gọi CRM `GET /api/public/zalo-accounts`.
  - `GET /api/dang-bai/crm/accounts/:id/groups` → gọi CRM `GET /api/public/zalo-accounts/:id/groups`.
- Cấu hình CRM trong `.env` bot: `CRM_BASE_URL` (vd `http://localhost:3080` nội bộ VPS — bot↔CRM cùng máy nên gọi nội bộ được), `CRM_API_KEY=zcrm_...`.
  - Lưu ý: proxy ảnh/post đi qua **broadcast** dùng `imageUrls` (URL HTTPS công khai), không phụ thuộc CRM_BASE_URL có HTTPS hay không.

### 5.3 Bộ lập lịch (`backend/services/dang-bai-cron.js` — file mới)
- `node-cron.schedule('* * * * *', tick)` — mỗi phút.
- `tick()`: lấy job `enabled=true` có `next_run_at <= now()` (hoặc khớp cron). Cơ chế: lưu `cron_expr`, tính `next_run_at` bằng thư viện parse cron (vd `cron-parser`) sau mỗi lần chạy; tick so sánh `next_run_at`.
- Mỗi job tới hạn: POST CRM `broadcast` với `{zaloAccountId: crm_account_id, groupIds: crm_group_ids, content, imageUrls: image_urls}` → ghi `zalo_post_job_runs` + cập nhật `last_run_at/last_status/next_run_at`.
- **Khoá chống chạy chồng** (mutex theo job_id) để tick phút sau không chạy lại job đang chạy.
- Lỗi gọi CRM → ghi run `failed`, vẫn tính `next_run_at` để lần sau thử lại.

### 5.4 Frontend (`frontend/modules/dang-bai.js` + `modules/dangbai-tool/`)
- Tận dụng tool "Đăng Bài" (`modules/dangbai-tool/config.json`) đang là placeholder → thay `index.html`/wire vào module thật. (Chỉ mở đúng file module này.)
- Màn chính: bảng danh sách job (tên, nick, số nhóm, lịch, trạng thái lần chạy cuối, nút bật/tắt, đăng ngay, sửa, xoá, xem log).
- Form thêm/sửa job:
  1. Chọn sản phẩm (từ module hàng hoá) → preview content tự soạn (tên + giá + mô tả) + ảnh (từ `products.images`); cho sửa content.
  2. Chọn tài khoản (dropdown từ `GET /api/dang-bai/crm/accounts`).
  3. Chọn nhiều nhóm (multiselect từ `GET /api/dang-bai/crm/accounts/:id/groups`).
  4. Đặt lịch lặp (UI thân thiện → sinh `cron_expr`: hàng ngày giờ X / hàng tuần thứ Y giờ X / cron tuỳ chỉnh).
- Xem log: bảng `zalo_post_job_runs` với kết quả per-group.

## 6. Hợp đồng API (contract tóm tắt)

CRM broadcast (bot gọi):
```http
POST /api/public/groups/broadcast
x-api-key: zcrm_...
{ "zaloAccountId":"66c4...", "groupIds":["123","456"],
  "content":"Hộp Trang Sức 3 Tầng Sunmi\nGiá: 150.000đ\n...",
  "imageUrls":["https://cdn2-retail-images.kiotviet.vn/.../a.jpg"] }
→ 200 { "success":true, "sent":2, "failed":0,
        "results":[{"groupId":"123","ok":true},{"groupId":"456","ok":true}] }
```

## 7. Xử lý lỗi & ràng buộc

- CRM broadcast: 1 nhóm lỗi (vd nhết là member, ảnh tải fail) → ghi `ok:false` nhóm đó, tiếp tục nhóm khác; HTTP vẫn 200.
- Nick `disconnected` lúc chạy → CRM trả 422; bot ghi run `failed`, giữ job để lần sau.
- Ảnh URL chết / không HTTPS → nhóm đó lỗi (báo trong results), không vỡ cả job.
- Bot cron lỗi mạng tới CRM → run `failed`, retry lần lịch kế tiếp (không retry dồn).
- Idempotency: chấp nhận "at-most-once mỗi mốc lịch" (mutex job + next_run_at). Không chống trùng nếu user bấm "đăng ngay" nhiều lần (có cảnh báo UI).

## 8. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Khóa nick do đăng loạt nhiều nhóm | Giãn nhịp `BROADCAST_GROUP_DELAY_MS` (mặc định 7s); khuyến nghị user chia nhỏ số nhóm/job, giãn lịch |
| Nhóm mới chưa sync → không hiện trong dropdown | Nút "đồng bộ nhóm" (gọi sync nhóm CRM) hoặc nhập groupId thủ công (v2) |
| API key lộ | Key chỉ ở backend bot (`.env`), proxy; không xuống browser |
| Spam nội dung trùng → Zalo cờ spam | Trách nhiệm nội dung thuộc người dùng; có thể thêm xoay ảnh/nội dung (v2) |
| Lệch giờ cron (server UTC vs VN) | Chuẩn hoá: lưu cron theo giờ VN, quy đổi rõ trong UI |

## 9. Phạm vi loại trừ (YAGNI / để v2)

- Không làm đăng-1-lần (chỉ lặp định kỳ — đã chốt).
- Không gộp nhiều SP trong 1 bài ở v1 (mỗi job 1 nội dung; có thể nhiều ảnh).
- Không nhiều tài khoản/job ở v1 (1 nick/job — đã chốt).
- Không xoay nội dung/ảnh tự động chống spam (v2).
- Không gửi video/file (chỉ text + ảnh).

## 10. Kiểm thử

CRM:
- Unit/integration cho 3 endpoint: liệt kê accounts/groups (mock prisma), broadcast happy-path + 1 nhóm lỗi + account disconnected + sai input. Theo mẫu `tests/chat-operations-routes.test.ts` (mockIO/mockPrisma).
Bot:
- Test route CRUD job + cron tick (mock thời gian/next_run + mock CRM call) + proxy.
Thủ công (E2E): tạo job test → "đăng ngay" tới 1 nhóm test → kiểm tra bài + ảnh lên nhóm Zalo + log per-group.

## 11. Thứ tự triển khai (cho writing-plans)

1. CRM: helper `sendToThread` (refactor `messages/send`) + 3 endpoint public + test.
2. CRM: deploy (rebuild image) + tạo nhóm test, verify broadcast bằng key thật.
3. Bot: migration 041 + backend route + proxy + cron service + đăng ký router/cron vào server.
4. Bot: frontend module "Đăng Bài" (form + danh sách + log).
5. E2E + tài liệu hướng dẫn nội bộ.
