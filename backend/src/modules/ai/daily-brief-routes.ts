/**
 * daily-brief-routes.ts — API cho popup "Hỏi AI về khách hôm nay".
 *
 *   GET  /api/v1/ai/daily-brief        → snapshot số liệu hôm nay (không tốn quota AI)
 *   POST /api/v1/ai/daily-brief/ask    → { question, history? } → { answer, snapshot }
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authMiddleware } from '../auth/auth-middleware.js';
import { logger } from '../../shared/utils/logger.js';
import { askDailyBrief, buildDailyBriefSnapshot, type BriefScope } from './daily-brief-service.js';

function statusFromError(err: unknown): { status: number; message: string } {
  const message = err instanceof Error ? err.message : 'AI error';
  if (message.includes('quota exceeded')) return { status: 429, message: 'AI đã hết hạn mức hôm nay. Thử lại vào ngày mai hoặc nâng quota trong Cài đặt AI.' };
  if (message.includes('disabled')) return { status: 400, message: 'AI đang tắt cho tổ chức này. Bật lại trong Cài đặt AI.' };
  if (message.includes('not configured')) return { status: 400, message: 'Chưa cấu hình khoá AI provider. Vào Cài đặt AI để thêm.' };
  if (message.includes('required') || message.includes('quá dài')) return { status: 400, message };
  if (message.includes('429')) return { status: 429, message: 'AI provider đang giới hạn tốc độ (429). Đợi một lát rồi hỏi lại.' };
  return { status: 500, message: 'Trợ lý AI chưa trả lời được. Thử lại sau ít phút.' };
}

async function resolveScope(app: FastifyInstance, request: FastifyRequest): Promise<BriefScope> {
  const user = request.user!;
  const contactScopeWhere = await app.scope.resolve('contact', user.id, user.orgId);
  return { orgId: user.orgId, userId: user.id, role: user.role, contactScopeWhere };
}

export async function dailyBriefRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/api/v1/ai/daily-brief', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const scope = await resolveScope(app, request);
      return await buildDailyBriefSnapshot(scope);
    } catch (err) {
      logger.error('[ai-daily-brief] snapshot error:', err);
      return reply.status(500).send({ error: 'Không lấy được số liệu hôm nay' });
    }
  });

  app.post('/api/v1/ai/daily-brief/ask', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as { question?: unknown; history?: unknown };
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) return reply.status(400).send({ error: 'Nhập câu hỏi trước khi gửi' });
    try {
      const scope = await resolveScope(app, request);
      return await askDailyBrief({ scope, question, history: body.history });
    } catch (err) {
      const handled = statusFromError(err);
      if (handled.status === 500) logger.error('[ai-daily-brief] ask error:', err);
      else logger.warn(`[ai-daily-brief] ask rejected (${handled.status}): ${err instanceof Error ? err.message : err}`);
      return reply.status(handled.status).send({ error: handled.message });
    }
  });
}
