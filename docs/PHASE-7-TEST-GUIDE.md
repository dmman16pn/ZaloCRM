# Phase 7 — Hướng dẫn test toàn bộ

Doc này hướng dẫn test toàn bộ module Bot-Auto Phase 7 (Block / Sequence /
Trigger / Broadcast / CustomerList) từ safest (DB-only) tới riskiest (Zalo SDK
gửi thật). Mục tiêu: validate engine không phá nick + không spam KH thật trước
khi sale dùng production.

## ⚠️ Quy tắc trước khi test

1. **Bật STUB mode trước** — không gọi Zalo SDK thật, chỉ log:
   ```bash
   # docker-compose.yml service app environment:
   AUTOMATION_STUB_MODE: "true"
   ```
   ```bash
   docker compose up -d --force-recreate app
   ```

2. **Dùng nick test riêng** — không dùng nick chính. Lấy `id` từ
   `/settings/channels/zalo`.

3. **Dùng contact test** — đồng nghiệp / số mình, không phải KH thật.

4. **Set delay = 0** trong sequence để test nhanh (mặc định jitter 15-45p làm
   chậm). Vào sequence edit → "Cấu hình chạy" → `Delay ngẫu nhiên` = 0 → 0.

5. **Mở terminal monitor**:
   ```bash
   docker logs -f zalo-crm-app 2>&1 | grep -E "automation|task-worker|materializer|STUB|sent from"
   ```

---

## Bước 0 — Pre-flight (verify deploy)

```bash
# Engine alive?
docker logs zalo-crm-app --tail 50 | grep "automation.engine"
# Expect: [automation.engine] started — event bus + 3 action handlers + worker

# Schema 8 bảng?
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c "\dt automation_* blocks block_folders customer_list*"
# Expect: blocks, block_folders, automation_broadcasts, _campaigns, _sequences,
#   _tasks, _triggers, _rules (legacy), customer_lists, customer_list_entries
```

---

## Bước 1 — Visual smoke test (UI load OK?)

Mở `http://localhost:3080` → đăng nhập → click 🤖 **Bot-Auto** trên top nav.

| Trang | Expected |
|---|---|
| `/automation/bot/triggers` Catalog | 11 card grouped theo category |
| `/automation/bot/triggers` Configured | Empty state + CTA "Xem catalog" |
| `/automation/bot/blocks` | Folder sidebar, empty state CTA "Tạo block đầu tiên" |
| `/automation/bot/sequences` | Sidebar trống, main pane "Chọn sequence" |
| `/automation/bot/broadcasts` | Placeholder "Phase F sẽ ship sau" |
| `/automation/bot/lists` | CustomerList view (đã ship 20/05) |

**Responsive (DevTools F12):**
- iPhone 12 (~390px): hamburger bar trên cùng → drawer slide từ trái
- iPad (~900px): sidebar thu thành 72px icon-only
- Desktop ≥1024px: sidebar full 240px

---

## Bước 2 — CRUD test (không hit Zalo)

### 2.1 Tạo Block "TEST update_status"

`/blocks` → **Tạo Block**:
| Field | Value |
|---|---|
| Tên | `TEST — đổi status` |
| Loại action | **Đổi trạng thái** |
| Đổi sang | Pick status có sẵn (vd "Tiếp cận") |

### 2.2 Tạo Sequence "TEST flow"

`/sequences` → **Sequence mới**:
- Tên: `TEST — update status flow`
- Thêm bước → pick Block 2.1 → delay 0
- Bật → Lưu

### 2.3 Tạo Trigger "TEST manual"

`/triggers` → Catalog → "Chạy thủ công theo segment" → **Khởi tạo**:
- Tên: `TEST — manual run`
- Bind sequence → pick "TEST — update status flow"
- ✅ Bật trigger

---

## Bước 3 — Engine smoke test (update_status REAL, không Zalo)

### 3.1 Lấy contactId

```bash
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT id, full_name, status_id FROM contacts ORDER BY created_at DESC LIMIT 5"
```

### 3.2 Manual run

Tab Configured → ▶ Play trên trigger TEST → nhập contactId → OK.

### 3.3 Watch log

```
[automation.event-bus] emit { type: 'manual_run', ... }
[materializer] event handled { campaigns: 1, tasks: 1 }
[task-worker] processing 1 tasks
[update-status] contact <id>: <old> → <new>
```

### 3.4 Verify DB

```bash
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT t.state, t.skip_reason, t.executed_at, b.action_type
 FROM automation_tasks t LEFT JOIN blocks b ON b.id=t.current_block_id
 ORDER BY t.created_at DESC LIMIT 3"
# Expect: state='done', executed_at có timestamp

docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT id, full_name, status_id FROM contacts WHERE id='<contactId>'"
# Expect: status_id = status mới
```

---

## Bước 4 — STUB mode: request_friend + send_message

Vẫn để `AUTOMATION_STUB_MODE=true`.

### 4.1 Tạo 2 block mới

**Block A — TEST kết bạn** (action: Gửi kết bạn):
- Greeting variants:
  - `Em chào anh/chị, em từ DA XYZ ạ`
  - `Xin chào, em được giới thiệu anh/chị`

**Block B — TEST gửi tin** (action: Gửi tin nhắn):
- Text variants:
  - `Em chào anh, em là Hoa hỗ trợ DA XYZ`
  - `Chào anh, em Hoa từ team XYZ`

### 4.2 Sequence chain

Bước 1: Block A · Bước 2: Block "TEST đổi status" (delay 0)

Bật → Lưu → tạo trigger manual_run bind → run.

Log expected:
```
[request-friend STUB] would send "Em chào..." from nick X to contact Y
[task-worker] task <id> ... state='done'
[update-status] contact Y: ... → ...  (step 2)
```

---

## Bước 5 — REAL Zalo: request_friend (rủi ro thấp)

⚠️ **Chỉ làm sau khi Bước 4 PASS**.

### 5.1 Tắt STUB

```bash
# Xoá AUTOMATION_STUB_MODE khỏi docker-compose.yml hoặc .env
docker compose up -d --force-recreate app
sleep 8
docker logs zalo-crm-app --tail 5 | grep automation.engine
```

### 5.2 Pre-check

```bash
# Contact test có phone?
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT id, full_name, phone_normalized FROM contacts WHERE id='<test>'"

# Nick test connected + cap còn?
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT id, display_name, status, daily_friend_add_cap, last_friend_req_sent_at
 FROM zalo_accounts WHERE id='<nick>'"
```

### 5.3 Chạy

Manual run trigger "Kết bạn + đổi status" với contactId.

Log expected:
```
[request-friend] sent from nick=<id> to uid=<uid> contact=<id>
```

### 5.4 Verify

```bash
# FriendshipAttempt
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT zalo_account_id, contact_id, state, sent_at, error_code
 FROM friendship_attempts ORDER BY queued_at DESC LIMIT 3"
# Expect: state='sent'

# Friend pending_sent
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT friendship_status, zalo_uid_in_nick
 FROM friends WHERE contact_id='<test>' ORDER BY id DESC LIMIT 1"
```

**Mở Zalo nick test app/desktop** → KH có nhận lời mời? ✅

---

## Bước 6 — REAL: send_message (rủi ro cao nhất)

Chỉ test khi đã có Friend status `accepted` với contact.

### 6.1 Pick contact đã là friend

```bash
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT f.contact_id, c.full_name, f.friendship_status
 FROM friends f JOIN contacts c ON c.id=f.contact_id
 WHERE f.zalo_account_id='<nick>' AND f.friendship_status='accepted' LIMIT 5"
```

### 6.2 Sequence 1 bước Block B (send_message)

Tạo trigger manual_run bind → manual run với contactId từ 6.1.

Log expected:
```
[send-message] sent from nick=<id> to contact=<id>, msgId=<zalo-msg-id>
```

### 6.3 Verify

```bash
# Outbound Message persisted
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT m.id, m.content, m.sender_type, m.zalo_msg_id
 FROM messages m JOIN conversations c ON c.id=m.conversation_id
 WHERE c.contact_id='<test>' AND m.sender_type='self' ORDER BY m.sent_at DESC LIMIT 3"

# Conversation timestamp
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT id, last_message_at FROM conversations WHERE contact_id='<test>'"

# Nick lastMessageSentAt (throttle gate state)
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"SELECT id, last_message_sent_at FROM zalo_accounts WHERE id='<nick>'"
```

**Mở Zalo nick** → chat với KH → thấy tin "Em chào anh..." vừa gửi ✅

---

## Bước 7 — Event tự fire (event-driven, không manual)

### 7.1 first_message_received

`/triggers` → Catalog → "KH nhắn tin lần đầu" → Khởi tạo.
Bind = sequence chỉ có **update_status** (an toàn, không gửi gì cho KH).
Bật, lưu.

Nhờ 1 KH chưa từng nhắn nick test → nhắn 1 tin → đợi ~30-45p (hoặc set delay=0).

Log expected:
```
[automation.event-bus] emit { type: 'first_message_received', contactId: ... }
[materializer] event handled
[task-worker] ... [update-status] contact ...
```

### 7.2 Các event khác

| Event | Test thế nào |
|---|---|
| `friendship_accepted` | Nick gửi lời mời → KH accept → trigger fire |
| `keyword_match` | KH nhắn text khớp `eventFilter.keyword` |
| `message_received` | Mọi msg inbound — **cẩn thận volume cao** |
| `contact_created` | POST /api/v1/contacts qua UI hoặc API |

---

## Bước 8 — Dọn dẹp

```bash
# Disable test triggers (KHÔNG xoá để giữ history)
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"UPDATE automation_triggers SET enabled=false WHERE name LIKE '%TEST%'"

# Archive test blocks
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"UPDATE blocks SET archived_at=NOW() WHERE name LIKE '%TEST%'"
```

---

## Rollback khẩn cấp

Nếu phát hiện engine gửi sai / spam KH:

```bash
# Cancel mọi task queued + running
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"UPDATE automation_tasks SET state='skipped', skip_reason='emergency_rollback'
 WHERE state IN ('queued','running')"

# Pause active campaigns
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"UPDATE automation_campaigns SET state='paused' WHERE state='active'"

# Disable all triggers
docker exec zalo-crm-db psql -U crmuser -d zalocrm -c \
"UPDATE automation_triggers SET enabled=false"
```

Sau khi xử lý, restart container nếu cần: `docker compose restart app`.

---

## Bảng checklist tóm tắt

| # | Test | Pass? |
|---|---|:---:|
| 0 | Pre-flight: engine + bảng schema | ☐ |
| 1 | Visual smoke 4 page + responsive 3 size | ☐ |
| 2 | CRUD: Block + Sequence + Trigger qua UI | ☐ |
| 3 | Engine: manual_run + update_status (DB-only) | ☐ |
| 4 | STUB: request_friend + send_message (log only) | ☐ |
| 5 | REAL: request_friend gửi 1 friend req thật | ☐ |
| 6 | REAL: send_message gửi 1 tin thật cho friend | ☐ |
| 7 | Event tự fire: first_message_received → DB update | ☐ |
| 8 | Cleanup test data | ☐ |

---

## Troubleshooting common gates

| Skip reason | Nguyên nhân | Cách xử |
|---|---|---|
| `hour_range` | Test ngoài giờ 6-22 | Sequence edit → hour_range = [0, 23] |
| `per_nick_throttle` | Nick vừa gửi gần đây | Đợi >15p hoặc tắt throttle |
| `stop_on_accept` | KH đã accept với nick khác | Tắt rule trong sequence |
| `no_friend_nick` | send_message nhưng chưa có Friend | Kết bạn manual trước |
| `all_nicks_capped_or_attempted` | request_friend hết quota | Đợi sang ngày mai hoặc thêm nick |
| `block_archived` | Block bị archive sau khi task enqueue | Unarchive block hoặc tạo block mới |
| `rule_disabled` | Sequence/Trigger bị disable | Toggle on lại |

---

Maintainer: cập nhật doc này khi ship Phase F (broadcast), cron triggers, hoặc
webhook order_success — thêm test step tương ứng vào checklist.
