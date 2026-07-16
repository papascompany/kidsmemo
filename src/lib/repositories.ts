import { events, messageJobs, staffCouponDownloads, staffCoupons } from "./mock-data";
import { isLiveSupabaseMode, isMockRuntimeAllowed } from "./env-flags";
import { isTomorrow } from "./format";
import { AccessControlError, assertLiveSupabaseAnonConfigured, type RequestAccessContext } from "./access-control";
import { createSupabaseServiceClient, createSupabaseUserClient } from "./supabase";
import type { EventSchedule, MessageJob, StaffCoupon, StaffCouponDownload } from "./types";

type Row = Record<string, unknown>;

export type CreateEventInput = Omit<EventSchedule, "id" | "reminderStatus"> & {
  reminderStatus?: EventSchedule["reminderStatus"];
};

export type UpdateEventInput = Partial<
  Pick<
    EventSchedule,
    "title" | "eventDate" | "audience" | "classNames" | "description" | "supplies" | "repeatRule"
  >
>;

export interface EventRepository {
  list(): Promise<EventSchedule[]>;
  findById(eventId: string): Promise<EventSchedule | undefined>;
  findTomorrow(now: Date): Promise<EventSchedule[]>;
  create(input: CreateEventInput): Promise<EventSchedule>;
  update(eventId: string, input: UpdateEventInput): Promise<EventSchedule | undefined>;
}

export interface MessageJobRepository {
  findExistingJob(eventId: string, scheduledDate: string): Promise<MessageJob | undefined>;
}

export interface StaffCouponDownloadInput {
  couponId: string;
  organizationId: string;
  profileId: string;
}

export interface StaffCouponDownloadResult {
  recorded: boolean;
  duplicate?: boolean;
  reason?: "coupon_not_found" | "organization_mismatch";
  download?: StaffCouponDownload;
}

export interface StaffCouponRepository {
  list(): Promise<StaffCoupon[]>;
  findById(couponId: string): Promise<StaffCoupon | undefined>;
  recordDownload(input: StaffCouponDownloadInput): Promise<StaffCouponDownloadResult>;
}

export interface RepositorySet {
  events: EventRepository;
  messageJobs: MessageJobRepository;
  staffCoupons: StaffCouponRepository;
}

export const mockEventRepository: EventRepository = {
  async list() {
    return events;
  },
  async findById(eventId) {
    return events.find((event) => event.id === eventId);
  },
  async findTomorrow(now) {
    return events.filter((event) => isTomorrow(event.eventDate, now));
  },
  async create(input) {
    const event: EventSchedule = {
      id: `event-${events.length + 1}`,
      reminderStatus: input.reminderStatus ?? "not_scheduled",
      ...input
    };
    events.push(event);
    return event;
  },
  async update(eventId, input) {
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return undefined;
    }

    Object.assign(event, input);
    return event;
  }
};

export const mockMessageJobRepository: MessageJobRepository = {
  async findExistingJob(eventId, scheduledDate) {
    return messageJobs.find((job) => {
      return job.eventId === eventId && job.scheduledFor.slice(0, 10) === scheduledDate;
    });
  }
};

export const mockStaffCouponRepository: StaffCouponRepository = {
  async list() {
    return staffCoupons;
  },
  async findById(couponId) {
    return staffCoupons.find((coupon) => coupon.id === couponId);
  },
  async recordDownload(input) {
    const coupon = staffCoupons.find((item) => item.id === input.couponId);
    if (!coupon) {
      return {
        recorded: false,
        reason: "coupon_not_found"
      };
    }

    if (coupon.organizationId !== input.organizationId) {
      return {
        recorded: false,
        reason: "organization_mismatch"
      };
    }

    const existing = staffCouponDownloads.find(
      (download) =>
        download.couponId === input.couponId &&
        download.organizationId === input.organizationId &&
        download.profileId === input.profileId
    );

    if (existing) {
      return {
        recorded: true,
        duplicate: true,
        download: existing
      };
    }

    const download = {
      id: `staff-coupon-download-${staffCouponDownloads.length + 1}`,
      couponId: input.couponId,
      organizationId: input.organizationId,
      profileId: input.profileId,
      downloadedAt: new Date().toISOString()
    };

    staffCouponDownloads.push(download);

    const couponRow = staffCoupons.find((item) => item.id === input.couponId);
    if (couponRow && couponRow.status === "available") {
      couponRow.status = "downloaded";
    }

    return {
      recorded: true,
      download
    };
  }
};

export function getRepositories(_access?: RequestAccessContext): RepositorySet {
  const dataBackend = process.env.KIDSMEMO_DATA_BACKEND ?? "mock";

  if (dataBackend !== "supabase" || !isLiveSupabaseMode()) {
    if (!isMockRuntimeAllowed()) {
      throw new AccessControlError(
        "live_backend_required",
        "Production API는 live Supabase backend 설정이 필요합니다.",
        503
      );
    }

    return {
      events: mockEventRepository,
      messageJobs: mockMessageJobRepository,
      staffCoupons: mockStaffCouponRepository
    };
  }

  const supabase = _access?.accessToken && _access.source === "session"
    ? createSupabaseUserClient(_access.accessToken)
    : null;

  if (!supabase) {
    assertLiveSupabaseAnonConfigured();
    throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
  }

  return createSupabaseRepositories(supabase, _access);
}

export function getServiceRepositories(): RepositorySet {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    throw new Error("Supabase service client is not configured.");
  }

  return createSupabaseRepositories(supabase, {
    profileId: null,
    organizationId: null,
    role: "admin",
    source: "session"
  });
}

function createSupabaseRepositories(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  access?: RequestAccessContext
): RepositorySet {
  if (!supabase) {
    throw new Error("Supabase service client is not configured.");
  }

  const eventRepository: EventRepository = {
    async list() {
      const organizationId = getReadableOrganizationId(access);
      if (organizationId === null) {
        return [];
      }

      const query = supabase.from("events").select("*").order("event_date", { ascending: true });
      const { data, error } = await (organizationId ? query.eq("organization_id", organizationId) : query);
      if (error) throw error;
      return (data as Row[]).map(mapEvent);
    },
    async findById(eventId) {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return data ? mapEvent(data as Row) : undefined;
    },
    async findTomorrow(now) {
      const organizationId = getReadableOrganizationId(access);
      if (organizationId === null) {
        return [];
      }

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const date = tomorrow.toISOString().slice(0, 10);
      const query = supabase.from("events").select("*").eq("event_date", date);
      const { data, error } = await (organizationId ? query.eq("organization_id", organizationId) : query);
      if (error) throw error;
      return (data as Row[]).map(mapEvent);
    },
    async create(input) {
      const { data, error } = await supabase.from("events").insert(toEventRow(input)).select("*").single();
      if (error) throw error;
      return mapEvent(data as Row);
    },
    async update(eventId, input) {
      const { data, error } = await supabase
        .from("events")
        .update(toEventRow(input))
        .eq("id", eventId)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? mapEvent(data as Row) : undefined;
    }
  };

  const messageJobRepository: MessageJobRepository = {
    async findExistingJob(eventId, scheduledDate) {
      const start = `${scheduledDate}T00:00:00.000Z`;
      const end = `${scheduledDate}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from("message_jobs")
        .select("*")
        .eq("event_id", eventId)
        .gte("scheduled_for", start)
        .lte("scheduled_for", end)
        .maybeSingle();
      if (error) throw error;
      return data ? mapMessageJob(data as Row) : undefined;
    }
  };

  const staffCouponRepository: StaffCouponRepository = {
    async list() {
      const organizationId = getReadableOrganizationId(access);
      if (organizationId === null) {
        return [];
      }

      const query = supabase.from("staff_coupons").select("*").order("valid_until", { ascending: true });
      const { data, error } = await (organizationId ? query.eq("organization_id", organizationId) : query);
      if (error) throw error;
      return (data as Row[]).map(mapStaffCoupon);
    },
    async findById(couponId) {
      const { data, error } = await supabase
        .from("staff_coupons")
        .select("*")
        .eq("id", couponId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapStaffCoupon(data as Row) : undefined;
    },
    async recordDownload(input) {
      const coupon = await this.findById(input.couponId);
      if (!coupon) {
        return {
          recorded: false,
          reason: "coupon_not_found"
        };
      }

      if (coupon.organizationId !== input.organizationId) {
        return {
          recorded: false,
          reason: "organization_mismatch"
        };
      }

      const { data, error } = await supabase
        .from("staff_coupon_downloads")
        .insert({
          coupon_id: input.couponId,
          organization_id: input.organizationId,
          profile_id: input.profileId
        })
        .select("*")
        .single();

      if (error) {
        if (isUniqueViolation(error)) {
          const { data: existing, error: findError } = await supabase
            .from("staff_coupon_downloads")
            .select("*")
            .eq("coupon_id", input.couponId)
            .eq("profile_id", input.profileId)
            .maybeSingle();
          if (findError) throw findError;

          return {
            recorded: true,
            duplicate: true,
            download: existing ? mapStaffCouponDownload(existing as Row) : undefined
          };
        }

        throw error;
      }

      return {
        recorded: true,
        download: mapStaffCouponDownload(data as Row)
      };
    }
  };

  return {
    events: eventRepository,
    messageJobs: messageJobRepository,
    staffCoupons: staffCouponRepository
  };
}

function getReadableOrganizationId(access?: RequestAccessContext) {
  if (access?.role === "admin") {
    return undefined;
  }

  return access?.organizationId ?? null;
}

function mapEvent(row: Row): EventSchedule {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    title: asString(row.title),
    eventDate: asString(row.event_date),
    audience: asString(row.audience),
    classNames: asStringArray(row.class_names),
    description: asString(row.description),
    supplies: asStringArray(row.supplies),
    reminderStatus: asReminderStatus(row.reminder_status),
    repeatRule: row.repeat_rule === "yearly" ? "yearly" : undefined
  };
}

function mapMessageJob(row: Row): MessageJob {
  return {
    id: asString(row.id),
    eventId: asString(row.event_id),
    scheduledFor: asString(row.scheduled_for),
    channels: asStringArray(row.channels).filter((channel) =>
      ["alimtalk", "sms", "email"].includes(channel)
    ) as MessageJob["channels"],
    status: asDeliveryStatus(row.status),
    recipientCount: Number(row.recipient_count ?? 0)
  };
}

function mapStaffCoupon(row: Row): StaffCoupon {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    title: asString(row.title),
    description: asString(row.description),
    code: asString(row.code),
    amountLabel: asString(row.amount_label),
    validUntil: asString(row.valid_until),
    assignedTo: asStaffCouponAssignee(row.assigned_to),
    status: asStaffCouponStatus(row.status),
    sites: asStringArray(row.sites).filter((site) =>
      ["jumbokids", "godomall"].includes(site)
    ) as StaffCoupon["sites"],
    siteUrls: {
      jumbokids: asString(row.jumbokids_url),
      godomall: asString(row.godomall_url)
    }
  };
}

function mapStaffCouponDownload(row: Row): StaffCouponDownload {
  return {
    id: asString(row.id),
    couponId: asString(row.coupon_id),
    organizationId: asString(row.organization_id),
    profileId: asString(row.profile_id),
    downloadedAt: asString(row.downloaded_at)
  };
}

function toEventRow(input: Partial<CreateEventInput & UpdateEventInput>) {
  return {
    organization_id: input.organizationId,
    title: input.title,
    event_date: input.eventDate,
    audience: input.audience,
    class_names: input.classNames,
    description: input.description,
    supplies: input.supplies,
    repeat_rule: input.repeatRule,
    reminder_status: input.reminderStatus
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isString) : [];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function asReminderStatus(value: unknown): EventSchedule["reminderStatus"] {
  return ["not_scheduled", "scheduled", "sent", "failed"].includes(asString(value))
    ? (value as EventSchedule["reminderStatus"])
    : "not_scheduled";
}

function asDeliveryStatus(value: unknown): MessageJob["status"] {
  return ["queued", "sent", "failed", "fallback"].includes(asString(value))
    ? (value as MessageJob["status"])
    : "queued";
}

function asStaffCouponAssignee(value: unknown): StaffCoupon["assignedTo"] {
  return ["owner", "teacher", "all_staff"].includes(asString(value))
    ? (value as StaffCoupon["assignedTo"])
    : "all_staff";
}

function asStaffCouponStatus(value: unknown): StaffCoupon["status"] {
  return ["available", "downloaded", "used", "expired"].includes(asString(value))
    ? (value as StaffCoupon["status"])
    : "available";
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && (error as { code?: unknown }).code === "23505";
}
