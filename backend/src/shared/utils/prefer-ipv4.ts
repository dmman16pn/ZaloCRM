/**
 * prefer-ipv4.ts — Ép Node ưu tiên IPv4 cho MỌI DNS lookup (side-effect, import đầu tiên).
 *
 * Lý do: VPS production KHÔNG có route IPv6 (connect IPv6 → ENETUNREACH/timeout), nhưng DNS
 * của Zalo (chat.zalo.me / wpa.chat.zalo.me) trả CẢ bản ghi AAAA (IPv6) lẫn A (IPv4) theo thứ
 * tự xoay vòng. Khi Node (global fetch / undici dùng trong zca-js) bốc trúng địa chỉ IPv6 trước,
 * kết nối treo ~12s rồi ném `ETIMEDOUT` → biểu hiện "fetch failed" khi gửi tin/ảnh vào nhóm
 * (đăng càng nhiều ảnh = càng nhiều kết nối song song = càng dễ trúng IPv6 → fail/partial).
 *
 * `ipv4first` đảm bảo IPv4 luôn được thử trước; `autoSelectFamily` bật để Happy Eyeballs fallback
 * nhanh nếu một họ địa chỉ hỏng. Không ảnh hưởng kết nối nội bộ (db/redis/minio đều IPv4).
 *
 * PHẢI import module này TRƯỚC mọi import khác trong app.ts để thiết lập trước khi có lookup nào.
 */
import dns from 'node:dns';
import net from 'node:net';

dns.setDefaultResultOrder('ipv4first');

// Node 20: bật Happy Eyeballs để nếu vẫn lỡ thử IPv6 thì fallback IPv4 trong ~250ms thay vì treo.
if (typeof (net as unknown as { setDefaultAutoSelectFamily?: (v: boolean) => void }).setDefaultAutoSelectFamily === 'function') {
  (net as unknown as { setDefaultAutoSelectFamily: (v: boolean) => void }).setDefaultAutoSelectFamily(true);
}
