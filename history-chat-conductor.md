# Lịch sử Chat — Conductor + ClaudeKit Pipeline

> Ngày: 30-31/03/2026
> Công cụ: Claude Code + gstack Conductor + ClaudeKit
> Cập nhật: 31/03/2026

---

## Chủ đề chính

- Tìm hiểu ClaudeKit có dùng được với Conductor không
- Setup 6 workspace Conductor trỏ vào 6 sprint trong ZaloCRM plan
- Thiết kế pipeline ClaudeKit: Brainstorm → Plan → Cook

---

## Q&A 1 — ClaudeKit có dùng được Conductor không?

**Hỏi:** gstack dùng conductor được, ClaudeKit có thể dùng conductor được không, nếu có thì dùng như thế nào?

**Kết luận:**
- ClaudeKit **không có tích hợp trực tiếp** với Conductor của gstack
- ClaudeKit có hệ thống orchestration **riêng** (14 agent điều phối qua workflow định trước)
- **Có thể kết hợp** bằng cách dùng Conductor để gọi các lệnh `/ck:*` của ClaudeKit như agent steps

| | gstack Conductor | ClaudeKit Orchestration |
|---|---|---|
| Cơ chế | MCP-based, chạy agent song song qua Conductor tool | Built-in workflow, tự động khi dùng `/ck:cook`, `/ck:fix` |
| Kiểm soát | Bạn define pipeline thủ công | ClaudeKit tự điều phối dựa trên lệnh |
| Agent | Custom hoặc gstack agents | 14 agent chuyên biệt của ClaudeKit |

---

## Q&A 2 — Setup 6 workspace Conductor cho ZaloCRM

**Hỏi:** Đã tạo 6 workspace trên Conductor, làm sao để mỗi cái trỏ vào một sprint trong plan?

**Context phát hiện:**
- File plan: `/root/0project/ZaloCRM/plans/sprint-plan.md`
- 6 sprint song song, thiết kế sẵn để chạy trên Conductor
- `conductor.json` hiện tại chỉ có `setup/archive` scripts

**Giải pháp — Prompt cho từng workspace:**

| Workspace | Branch | Prompt |
|-----------|--------|--------|
| 1 | `feat/ai-assistant` | "Đọc file plans/sprint-plan.md, tìm phần Sprint S1: AI Assistant. Thực hiện đầy đủ từ Phase 1 đến Phase 7." |
| 2 | `feat/workflow-automation` | "Đọc file plans/sprint-plan.md, tìm phần Sprint S2: Workflow Automation. Thực hiện đầy đủ từ Phase 1 đến Phase 7." |
| 3 | `feat/advanced-analytics` | "Đọc file plans/sprint-plan.md, tìm phần Sprint S3: Advanced Analytics. Thực hiện đầy đủ từ Phase 1 đến Phase 7." |
| 4 | `feat/contact-intelligence` | "Đọc file plans/sprint-plan.md, tìm phần Sprint S4: Contact Intelligence. Thực hiện đầy đủ từ Phase 1 đến Phase 7." |
| 5 | `feat/mobile-pwa` | "Đọc file plans/sprint-plan.md, tìm phần Sprint S5: Mobile API + PWA. Thực hiện đầy đủ từ Phase 1 đến Phase 7." |
| 6 | `feat/integration-hub` | "Đọc file plans/sprint-plan.md, tìm phần Sprint S6: Integration Hub. Thực hiện đầy đủ từ Phase 1 đến Phase 7." |

**Cập nhật conductor.json đề xuất:**
```json
{
  "scripts": {
    "setup": "bin/dev-setup",
    "archive": "bin/dev-teardown"
  },
  "workspaces": {
    "ai-assistant":         { "branch": "feat/ai-assistant" },
    "workflow-automation":  { "branch": "feat/workflow-automation" },
    "advanced-analytics":   { "branch": "feat/advanced-analytics" },
    "contact-intelligence": { "branch": "feat/contact-intelligence" },
    "mobile-pwa":           { "branch": "feat/mobile-pwa" },
    "integration-hub":      { "branch": "feat/integration-hub" }
  }
}
```

**Thứ tự merge khuyến nghị:**
```
Đợt 1 (song song):  S3, S4, S5, S6   ← độc lập nhau
Đợt 2:              S2               ← dùng templates từ các sprint trước
Đợt 3:              S1               ← dùng AI + templates
```

---

## Q&A 3 — Pipeline ClaudeKit: Brainstorm → Plan → Cook

**Hỏi:** ClaudeKit theo pipeline Brainstorm → Plan → Cook theo Plan, file report brainstorm và plan là file .md, 14 agent chuyên biệt — tư vấn pipeline.

**14 Agent của ClaudeKit:**

| Nhóm | Agent |
|------|-------|
| Development | Planner, Scout, Debugger, Tester |
| QA | Code Reviewer |
| Docs & PM | Docs Manager, Project Manager |
| Creative | UI/UX Designer, Copywriter, Brainstormer |
| Research | Researcher, Journal Writer |
| DevOps | Git Manager, Database Admin |

---

### Pipeline được thiết kế

```
PHASE 1          PHASE 2              PHASE 3
Brainstorm  ──►  Plan                ──►  Cook
    │                │                       │
Brainstormer    Researcher                Scout
Researcher      Planner               Planner (context)
                UI/UX Designer        Tester
                Database Admin        Code Reviewer
                                      Git Manager
```

---

### Phase 1 — BRAINSTORM

**Agents:** `Brainstormer` + `Researcher`

**Output:** `plans/<feature>/phase-1-brainstorm.md`

Nội dung:
- Vấn đề cần giải quyết
- Các hướng tiếp cận (pros/cons từng hướng)
- Kết quả research (best practices, thư viện, patterns)
- Quyết định cuối: chọn hướng nào và tại sao

**Trigger:** `/ck:brainstorm [mô tả feature]`

---

### Phase 2 — PLAN

**Agents:** `Planner` + `UI/UX Designer` + `Database Admin`

**Input:** Đọc `phase-1-brainstorm.md`

**Output:** `plans/<feature>/phase-2-plan.md`

Nội dung:
- Database schema (Database Admin)
- API endpoints + data flow
- Component structure (UI/UX Designer)
- File/folder cần tạo (Planner)
- Edge cases & constraints
- Definition of Done

**Trigger:** `/ck:plan` (tự đọc phase-1-brainstorm.md làm context)

---

### Phase 3 — COOK

**Agents:** `Scout` → `Planner` (context) → build → `Tester` → `Code Reviewer` → `Git Manager`

**Input:** Đọc `phase-2-plan.md`

**Luồng nội bộ:**
```
Scout          ──► tìm đúng file cần sửa/tạo
Planner        ──► giữ context plan, không lạc hướng
(build code)   ──► implement theo plan
Tester         ──► viết test, chạy test
Code Reviewer  ──► review trước khi commit
Git Manager    ──► stage, commit message chuẩn, push
```

**Trigger:** `/ck:cook` (tự đọc phase-2-plan.md làm context)

---

### Áp dụng cho Conductor (ZaloCRM)

```
Workspace 1 (feat/ai-assistant):
  → /ck:brainstorm Sprint S1: AI Assistant  →  phase-1-brainstorm.md
  → /ck:plan                                →  phase-2-plan.md
  → /ck:cook                                →  code + PR

(Tương tự Workspace 2-6)
```

---

### Điểm mấu chốt

| Điều cần nhớ | Lý do |
|---|---|
| Phase 1 & 2 ra file .md trước | Cook phải có plan cụ thể để không bịa |
| Scout chạy đầu tiên trong Cook | Tránh tạo file trùng hoặc sửa nhầm chỗ |
| Code Reviewer trước Git Manager | Không commit code chưa review |
| Mỗi sprint = branch riêng | 6 workspace không conflict nhau |

---

## Q&A 4 — Tạo prompt mẫu cụ thể cho từng phase để paste vào Conductor

**Hỏi:** Tạo prompt mẫu cụ thể cho từng phase để post vào Conductor, theo chuẩn ClaudeKit (KHÔNG theo gstack).

**Kết luận — cấu trúc mỗi prompt:**

| Phase | Skill | Flag | Output |
|-------|-------|------|--------|
| Brainstorm | `/ck:brainstorm` | (none) | `plans/sX-name/phase-1-brainstorm.md` |
| Plan | `/ck:plan` | `--hard` | `plans/sX-name/plan.md` + `phase-XX-*.md` |
| Cook | `/ck:cook` | `--auto` | code + test + review + commit |

**Lý do chọn `--hard` cho Plan:** Dùng 2 researcher song song + red-team review — tốt hơn `--fast` cho sprint lớn.

**Lý do chọn `--auto` cho Cook:** Bỏ qua review gate thủ công, agents tự chain: scout → implement → tester → code-reviewer → git-manager.

**File sinh ra:** `plans/conductor-prompts-claudekit.md` — 18 prompt (6 workspace × 3 phase).

---

## Q&A 5 — Meta-prompt: hướng dẫn tự tạo conductor-prompts cho dự án bất kỳ

**Hỏi:** Hướng dẫn cách viết prompt để Claude tự tạo Conductor Prompts theo ClaudeKit pipeline cho bất kỳ dự án nào.

**Kết luận — cấu trúc meta-prompt:**

```
1. Thông tin dự án (tên, mô tả, tech stack, file plan chính)
2. Bảng tính năng: STT | Tên | Branch | Mô tả | File ownership
3. Yêu cầu: tạo 3 phase, dùng đúng skill ClaudeKit, file ownership rõ ràng,
   thêm thứ tự chạy khuyến nghị, lưu ra plans/conductor-prompts.md
```

**Biến thể:**
- Dự án có MVP sẵn: mô tả rõ module đã có
- Chưa có file plan: bảo Claude đọc README + CLAUDE.md để tự suy context
- Phase tuần tự (không song song): ghi rõ thứ tự bắt buộc
- Chạy nhanh (skip brainstorm): dùng `/ck:plan --fast` + `/ck:cook --fast`

**File sinh ra:** `plans/how-to-generate-conductor-prompts.md`

---

## Q&A 6 — Quản lý file conductor-prompts: gstack vs ClaudeKit

**Hỏi:** Phục hồi lại bản conductor-prompts gstack và lưu bản ClaudeKit riêng.

**Phát hiện:** Bản gstack chưa bao giờ là file riêng — nội dung nằm trong `sprint-plan.md` phần "Conductor Setup". File `conductor-prompts.md` mà mình tạo là bản ClaudeKit đầu tiên và duy nhất.

**Kết quả:**

| File | Nội dung |
|------|----------|
| `plans/conductor-prompts.md` | Index, so sánh 2 phiên bản |
| `plans/conductor-prompts-gstack.md` | Bản gstack — 7 phase: Think→Plan→Build→Review→Test→Ship→Reflect |
| `plans/conductor-prompts-claudekit.md` | Bản ClaudeKit — 3 phase: Brainstorm→Plan→Cook, 18 prompts đầy đủ |

---

## Q&A 7 — Có cần tạo sprint-plan riêng cho ClaudeKit không?

**Hỏi:** Làm sao tạo ra sprint-plan.md theo pipeline ClaudeKit, có cần tạo không hay chỉ cần conductor-prompts-claudekit.md là đủ?

**Kết luận:**

**Không bắt buộc** — ClaudeKit tự sinh ra toàn bộ file chi tiết trong pipeline.

| | gstack sprint-plan | ClaudeKit sprint-plan |
|---|---|---|
| Mục đích | Agent đọc và thực thi trực tiếp | Context hint cho `/ck:brainstorm` |
| Bạn phải viết | Schema SQL, endpoints, component tree | Ý tưởng + constraints + câu hỏi gợi ý |
| Ai viết schema? | Bạn | ClaudeKit tự research và quyết định |
| Output | Agent thực thi thẳng | `phase-1-brainstorm.md` → `plan.md` → `phase-XX.md` |

**Luồng thực tế với ZaloCRM:**
```
sprint-plan-claudekit.md (context hint)
        ↓
/ck:brainstorm đọc → hỏi clarify → tạo phase-1-brainstorm.md
        ↓
/ck:plan đọc brainstorm → tạo plan.md + phase-XX-*.md
        ↓
/ck:cook đọc plan.md → implement → test → review → commit
```

**File sinh ra:** `plans/sprint-plan-claudekit.md`

---

## Tổng hợp tất cả file đã tạo trong session này

| File | Mô tả |
|------|-------|
| `plans/conductor-prompts.md` | Index so sánh gstack vs ClaudeKit |
| `plans/conductor-prompts-gstack.md` | 6 workspace prompts theo gstack 7-phase |
| `plans/conductor-prompts-claudekit.md` | 18 prompts đầy đủ (6 workspace × 3 phase ClaudeKit) |
| `plans/how-to-generate-conductor-prompts.md` | Meta-prompt để tự sinh conductor-prompts cho dự án bất kỳ |
| `plans/sprint-plan-claudekit.md` | Sprint plan dạng "context hint" cho ClaudeKit pipeline |
| `/root/0project/history-chat-conductor.md` | File này |
