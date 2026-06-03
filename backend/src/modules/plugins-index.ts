/**
 * corePlugins — danh sách plugin CORE, nạp theo thứ tự bởi plugin-host.
 *
 * Hiện tại MỚI chuyển 'branding' sang plugin (proof scaffold Phase 2+3).
 * 18 module core còn lại vẫn đăng ký trực tiếp trong app.ts — sẽ migrate dần
 * ở Phase 4 (mỗi PR 1-2 module), thêm vào mảng này theo ĐÚNG thứ tự cũ.
 *
 * ⚠️ THỨ TỰ QUAN TRỌNG: auth/middleware trước, route phụ thuộc sau.
 */
import type { ZaloCrmPlugin } from '../plugin-api/index.js';
import { brandingPlugin } from './branding/index.js';

export const corePlugins: ZaloCrmPlugin[] = [
  brandingPlugin,
  // Phase 4 — thêm dần: authPlugin, zaloPlugin, chatPlugin, contactsPlugin, ...
];
