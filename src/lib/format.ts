export const channelLabels = {
  alimtalk: "카카오 알림톡",
  sms: "SMS/LMS",
  email: "이메일"
} as const;

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium"
  }).format(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${dateLabel} ${hours}:${minutes}`;
}

export function isTomorrow(date: string, now = new Date()) {
  const target = new Date(date);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return (
    target.getFullYear() === tomorrow.getFullYear() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getDate() === tomorrow.getDate()
  );
}
