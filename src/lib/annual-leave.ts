export type LeaveCalculationBasis = "hire_date" | "calendar_year";

export interface AnnualLeaveCalculationInput {
  hireDate: string;
  asOfDate: string;
  terminationDate?: string | null;
  headcount: number;
  weeklyHours: number;
  attendanceRate?: number | null;
  monthlyAttendance?: Record<string, boolean | null | undefined>;
  calculationBasis?: LeaveCalculationBasis;
}

export interface AnnualLeaveGrant {
  grantDate: string;
  periodStart: string;
  periodEnd: string;
  expiresOn: string;
  entitlementDays: number;
  kind: "monthly" | "annual";
  note: string;
}

export interface AnnualLeaveSummary {
  eligible: boolean;
  eligibilityReason: string | null;
  calculationBasis: LeaveCalculationBasis;
  asOfDate: string;
  hireDate: string;
  continuousServiceYears: number;
  accruedDays: number;
  usedDays: number;
  remainingDays: number;
  grants: AnnualLeaveGrant[];
  needsAttendanceInput: boolean;
  warnings: string[];
}

const MAX_MONTHLY_GRANTS = 11;
const MAX_ANNUAL_DAYS = 25;

export function calculateAnnualLeave(
  input: AnnualLeaveCalculationInput,
  usedDays = 0
): AnnualLeaveSummary {
  const calculationBasis = input.calculationBasis ?? "hire_date";
  const hireDate = parseDate(input.hireDate, "hireDate");
  const asOfDate = parseDate(input.asOfDate, "asOfDate");
  const terminationDate = input.terminationDate ? parseDate(input.terminationDate, "terminationDate") : null;
  const effectiveEnd = terminationDate && terminationDate < asOfDate ? terminationDate : asOfDate;
  const warnings: string[] = [];

  if (calculationBasis === "calendar_year") {
    warnings.push("회계연도 기준은 입사일 기준보다 불리하지 않은지 퇴직 시 재정산해야 합니다.");
  }

  const eligible = input.headcount >= 5 && input.weeklyHours >= 15 && effectiveEnd >= hireDate;
  let eligibilityReason: string | null = null;
  if (input.headcount < 5) eligibilityReason = "상시근로자 5인 미만 사업장으로 연차 적용 대상이 아닙니다.";
  else if (input.weeklyHours < 15) eligibilityReason = "4주 평균 주 소정근로시간이 15시간 미만입니다.";
  else if (effectiveEnd < hireDate) eligibilityReason = "산정 기준일이 입사일보다 빠릅니다.";

  if (!eligible) {
    return emptySummary({ input, calculationBasis, hireDate, asOfDate, usedDays, eligibilityReason, warnings });
  }

  const grants: AnnualLeaveGrant[] = [];
  let needsAttendanceInput = false;

  for (let month = 1; month <= MAX_MONTHLY_GRANTS; month += 1) {
    const grantDate = addMonths(hireDate, month);
    if (grantDate > effectiveEnd || grantDate >= addYears(hireDate, 1)) break;

    const monthKey = formatDate(grantDate).slice(0, 7);
    const monthAttendance = input.monthlyAttendance?.[monthKey];
    if (monthAttendance === undefined || monthAttendance === null) {
      needsAttendanceInput = true;
      continue;
    }
    if (!monthAttendance) continue;

    const periodStart = addMonths(hireDate, month - 1);
    const periodEnd = addDays(grantDate, -1);
    grants.push({
      grantDate: formatDate(grantDate),
      periodStart: formatDate(periodStart),
      periodEnd: formatDate(periodEnd),
      expiresOn: formatDate(addYears(grantDate, 1)),
      entitlementDays: 1,
      kind: "monthly",
      note: "1년 미만 기간의 1개월 개근 연차"
    });
  }

  for (let serviceYear = 1; ; serviceYear += 1) {
    const grantDate = addYears(hireDate, serviceYear);
    if (grantDate > effectiveEnd) break;

    if (input.attendanceRate === undefined || input.attendanceRate === null) {
      needsAttendanceInput = true;
      continue;
    }
    if (input.attendanceRate < 0.8) continue;

    const entitlementDays = Math.min(MAX_ANNUAL_DAYS, 15 + Math.floor((serviceYear - 1) / 2));
    grants.push({
      grantDate: formatDate(grantDate),
      periodStart: formatDate(addYears(hireDate, serviceYear - 1)),
      periodEnd: formatDate(addDays(grantDate, -1)),
      expiresOn: formatDate(addYears(grantDate, 1)),
      entitlementDays,
      kind: "annual",
      note: input.attendanceRate >= 0.8 ? "직전 1년 출근율 80% 이상" : ""
    });
  }

  if (needsAttendanceInput) {
    warnings.push("출근율 또는 월별 개근 자료가 없어 일부 발생분을 계산하지 않았습니다.");
  }

  const accruedDays = roundDays(grants.reduce((total, grant) => total + grant.entitlementDays, 0));
  const safeUsedDays = Math.max(0, roundDays(usedDays));
  return {
    eligible: true,
    eligibilityReason: null,
    calculationBasis,
    asOfDate: formatDate(asOfDate),
    hireDate: formatDate(hireDate),
    continuousServiceYears: completedServiceYears(hireDate, effectiveEnd),
    accruedDays,
    usedDays: safeUsedDays,
    remainingDays: roundDays(accruedDays - safeUsedDays),
    grants,
    needsAttendanceInput,
    warnings
  };
}

function emptySummary({
  input,
  calculationBasis,
  hireDate,
  asOfDate,
  usedDays,
  eligibilityReason,
  warnings
}: {
  input: AnnualLeaveCalculationInput;
  calculationBasis: LeaveCalculationBasis;
  hireDate: Date;
  asOfDate: Date;
  usedDays: number;
  eligibilityReason: string | null;
  warnings: string[];
}): AnnualLeaveSummary {
  const safeUsedDays = Math.max(0, roundDays(usedDays));
  return {
    eligible: false,
    eligibilityReason,
    calculationBasis,
    asOfDate: formatDate(asOfDate),
    hireDate: formatDate(hireDate),
    continuousServiceYears: 0,
    accruedDays: 0,
    usedDays: safeUsedDays,
    remainingDays: 0,
    grants: [],
    needsAttendanceInput: false,
    warnings
  };
}

function parseDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} must be YYYY-MM-DD`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${field} is not a valid date`);
  }
  return date;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  const targetMonth = next.getUTCMonth() + amount;
  const targetYear = next.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  next.setUTCFullYear(targetYear, normalizedMonth, Math.min(next.getUTCDate(), lastDay));
  return next;
}

function addYears(date: Date, amount: number) {
  const next = new Date(date);
  const targetYear = next.getUTCFullYear() + amount;
  const month = next.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
  next.setUTCFullYear(targetYear, month, Math.min(next.getUTCDate(), lastDay));
  return next;
}

function completedServiceYears(hireDate: Date, asOfDate: Date) {
  let years = asOfDate.getUTCFullYear() - hireDate.getUTCFullYear();
  const anniversary = addYears(hireDate, years);
  if (anniversary > asOfDate) years -= 1;
  return Math.max(0, years);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundDays(value: number) {
  return Math.round(value * 100) / 100;
}
