import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * PageHint — hiển thị gợi ý một lần khi người dùng vào trang lần đầu.
 * Tự động ẩn khi đã dismiss (lưu vào localStorage).
 *
 * Props:
 *   storageKey  string   — khóa localStorage, vd: 'aita-hint-transcribe'
 *   icon        string   — emoji icon
 *   message     string   — nội dung gợi ý
 *   color       string   — màu accent (CSS color), mặc định cyan
 */
export default function PageHint({ storageKey, icon = '💡', message, color = '#6EE7F7' }) {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(storageKey)
  );

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  const bg = color
    .replace('#', '')
    .match(/.{2}/g)
    ?.map(h => parseInt(h, 16))
    .join(', ');

  return (
    <div
      className="page-hint"
      style={{ '--hint-color': color, '--hint-rgb': bg }}
      role="status"
      aria-live="polite"
    >
      <span className="page-hint__icon" aria-hidden="true">{icon}</span>
      <span className="page-hint__msg">{message}</span>
      <button
        className="page-hint__close"
        onClick={dismiss}
        aria-label="Đóng gợi ý"
        type="button"
      >
        <X size={14} />
      </button>
    </div>
  );
}
