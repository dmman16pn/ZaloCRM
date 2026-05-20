// Phase G — send_message action handler (STUB for now).
//
// Real impl wiring (Phase E2/G full):
//   1. Pick a textVariant from blockSnapshot.textVariants
//   2. Resolve nick conversation to contact (via Friend row + Conversation)
//   3. Call zaloOps.sendMessage(nickId, threadId, text, attachments)
//   4. Worker updates ZaloAccount.lastMessageSentAt on success
//
// Stub mode: log + return success so engine + sequence advancement works.

import { logger } from '../../../../shared/utils/logger.js';
import type { ActionContext, ActionResult } from '../types.js';

const STUB_MODE = process.env.AUTOMATION_STUB_MODE !== 'false';

export async function sendMessageHandler(ctx: ActionContext): Promise<ActionResult> {
  const snap = ctx.blockSnapshot as {
    textVariants?: string[];
    attachments?: Array<{ kind: string; url: string; caption?: string }>;
  };

  if (!Array.isArray(snap.textVariants) || snap.textVariants.length === 0) {
    return {
      outcome: 'failure',
      errorCode: 'BAD_SNAPSHOT',
      errorMessage: 'blockSnapshot.textVariants empty',
      retryable: false,
    };
  }
  if (!ctx.assignedNickId) {
    return {
      outcome: 'failure',
      errorCode: 'NO_NICK',
      errorMessage: 'assignedNickId required for send_message',
      retryable: false,
    };
  }

  const text = snap.textVariants[Math.floor(Math.random() * snap.textVariants.length)];

  if (STUB_MODE) {
    logger.info(`[send-message STUB] would send "${text.slice(0, 40)}..." from nick ${ctx.assignedNickId} to contact ${ctx.contactId}`);
    return {
      outcome: 'success',
      data: {
        stub: true,
        textUsed: text,
        attachmentCount: snap.attachments?.length ?? 0,
        note: 'real Zalo SDK call deferred to Phase E2/G full impl',
      },
    };
  }

  // ── Real impl (Phase E2/G) — placeholder ───────────────────────────────
  // 1. Find Friend row for (assignedNickId, contactId) → get conversation threadId
  // 2. zaloOps.sendMessage(...)
  // 3. Update Conversation.lastMessageAt + Message row creation
  return {
    outcome: 'failure',
    errorCode: 'NOT_IMPLEMENTED',
    errorMessage: 'send_message real impl pending Phase E2/G',
    retryable: false,
  };
}
