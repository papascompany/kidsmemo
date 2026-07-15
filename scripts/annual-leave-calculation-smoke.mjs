import assert from "node:assert/strict";

const cases = [
  ["1년 미만 11개월 개근", { hireDate: "2025-01-10", asOfDate: "2026-01-09", headcount: 5, weeklyHours: 40, monthlyAttendance: Object.fromEntries(Array.from({ length: 11 }, (_, index) => [`2025-${String(index + 2).padStart(2, "0")}`, true])) }, 11],
  ["1년 이상 출근율 80%", { hireDate: "2024-01-10", asOfDate: "2025-01-10", headcount: 5, weeklyHours: 40, attendanceRate: 0.8, monthlyAttendance: {} }, 15],
  ["3년 이상 가산 누적", { hireDate: "2022-01-10", asOfDate: "2025-01-10", headcount: 5, weeklyHours: 40, attendanceRate: 1, monthlyAttendance: {} }, 46],
  ["5인 미만 적용 제외", { hireDate: "2024-01-10", asOfDate: "2025-01-10", headcount: 4, weeklyHours: 40, attendanceRate: 1 }, 0],
  ["주 15시간 미만 적용 제외", { hireDate: "2024-01-10", asOfDate: "2025-01-10", headcount: 5, weeklyHours: 14.99, attendanceRate: 1 }, 0]
];

console.log(`[START] annual leave calculation smoke (${cases.length} cases)`);
for (const [label, input, expected] of cases) {
  const summary = await calculateAnnualLeave(input);
  assert.equal(summary.accruedDays, expected, label);
  if (label.includes("3년 이상")) assert.equal(summary.grants.at(-1)?.entitlementDays, 16, `${label} 가산일수`);
  console.log(`[PASS] ${label}: ${summary.accruedDays}일`);
}

console.log(JSON.stringify({ ok: true, checks: cases.map(([label]) => label) }, null, 2));

async function calculateAnnualLeave(input) {
  const module = await import("../src/lib/annual-leave.ts");
  return module.calculateAnnualLeave(input);
}
