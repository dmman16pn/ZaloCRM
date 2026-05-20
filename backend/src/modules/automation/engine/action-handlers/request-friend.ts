// Phase G — request_friend action handler (STUB for now).
//
// Real impl wiring (Phase E2/G full):
//   1. Pick a greetingVariant from blockSnapshot.greetingVariants
//   2. Lookup contact phone → call zaloOps.findUser(nickId, phone)
//   3. If found: create/update FriendshipAttempt (queued → looked_up)
//   4. Call zaloOps.sendFriendRequest(nickId, uid, greeting)
//   5. Update FriendshipAttempt → sent, Friend row → pending_sent
//   6. Update ZaloAccount.lastFriendReqSentAt (worker already does this on
//      success, but we may want to set lookedUpAt before send to gate throttle).
//
// For now: returns mock success so the engine can run end-to-end. When the
// real Zalo wiring lands, this file is the only edit needed.

import { prisma } from '../../../../shared/database/prisma-client.js';
import { logger } from '../../../../shared/utils/logger.js';
import type { ActionContext, ActionResult } from '../types.js';

const STUB_MODE = process.env.AUTOMATION_STUB_MODE !== 'false';

export async function requestFriendHandler(ctx: ActionContext): Promise<ActionResult> {
  const snap = ctx.blockSnapshot as { greetingVariants?: string[] };

  if (!Array.isArray(snap.greetingVariants) || snap.greetingVariants.length === 0) {
    return {
      outcome: 'failure',
      errorCode: 'BAD_SNAPSHOT',
      errorMessage: 'blockSnapshot.greetingVariants empty',
      retryable: false,
    };
  }
  if (!ctx.assignedNickId) {
    return {
      outcome: 'failure',
      errorCode: 'NO_NICK',
      errorMessage: 'assignedNickId required for request_friend',
      retryable: false,
    };
  }

  const greeting = snap.greetingVariants[Math.floor(Math.random() * snap.greetingVariants.length)];

  // Stub mode (Phase E1): record the attempt but skip the Zalo SDK call.
  // Lets us verify state machine + sequence advancement without hitting Zalo.
  if (STUB_MODE) {
    logger.info(`[request-friend STUB] would send "${greeting.slice(0, 40)}..." from nick ${ctx.assignedNickId} to contact ${ctx.contactId}`);
    return {
      outcome: 'success',
      data: {
        stub: true,
        greetingUsed: greeting,
        note: 'real Zalo SDK call deferred to Phase E2/G full impl',
      },
    };
  }

  // ── Real impl (Phase E2/G — placeholder, wire when zaloOps imported safely) ──
  // const contact = await prisma.contact.findFirst({ where: { id: ctx.contactId, orgId: ctx.orgId }, select: { phoneNormalized: true } });
  // if (!contact?.phoneNormalized) return { outcome: 'no_zalo', errorMessage: 'No phone on contact' };
  // const lookup = await zaloOps.findUser(ctx.assignedNickId, contact.phoneNormalized);
  // ...

  return {
    outcome: 'failure',
    errorCode: 'NOT_IMPLEMENTED',
    errorMessage: 'request_friend real impl pending Phase E2/G',
    retryable: false,
  };
}
