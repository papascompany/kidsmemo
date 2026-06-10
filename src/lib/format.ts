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
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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
