import {
  couponCampaigns,
  couponItems,
  events,
  getCampaignById,
  getCampaignItems,
  messageJobs,
  profiles
} from "./mock-data";
import { isTomorrow } from "./format";
import { createSupabaseServiceClient } from "./supabase";
import type {
  CouponCampaign,
  CouponItem,
  EventSchedule,
  MessageJob,
  NoticeType,
  Profile,
  TargetScope
} from "./types";

type Row = Record<string, unknown>;

export type CreateEventInput = Omit<EventSchedule, "id" | "reminderStatus"> & {
  reminderStatus?: EventSchedule["reminderStatus"];
};

export type UpdateEventInput = Partial<
  Pick<
    EventSchedule,
    "title" | "eventDate" | "audience" | "classNames" | "description" | "supplies" | "couponCampaignId" | "repeatRule"
  >
>;

export type CreateCouponCampaignInput = Omit<CouponCampaign, "id" | "isActive" | "createdBy"> & {
  isActive?: boolean;
  createdBy?: string;
};

export type UpdateCouponCampaignInput = Partial<
  Pick<
    CouponCampaign,
    | "name"
    | "description"
    | "issueMode"
    | "targetScope"
    | "validFrom"
    | "validUntil"
    | "isActive"
    | "noticeType"
    | "noticeHtml"
    | "noticeImageUrl"
    | "selectedOrganizationIds"
    | "selectedProfileIds"
  >
>;

export type CreateCouponItemInput = Omit<CouponItem, "id" | "campaignId">;

export interface UpdateCampaignTargetsInput {
  selectedOrganizationIds: string[];
  selectedProfileIds: string[];
}

export type UpdateCampaignNoticeInput =
  | {
      noticeType: Extract<NoticeType, "html">;
      noticeHtml: string;
    }
  | {
      noticeType: Extract<NoticeType, "image">;
      noticeImageUrl: string;
    };

export interface EventRepository {
  list(): Promise<EventSchedule[]>;
  findById(eventId: string): Promise<EventSchedule | undefined>;
  findTomorrow(now: Date): Promise<EventSchedule[]>;
  create(input: CreateEventInput): Promise<EventSchedule>;
  update(eventId: string, input: UpdateEventInput): Promise<EventSchedule | undefined>;
}

export interface CouponRepository {
  listCampaigns(): Promise<CouponCampaign[]>;
  findCampaignById(campaignId: string): Promise<CouponCampaign | undefined>;
  createCampaign(input: CreateCouponCampaignInput): Promise<CouponCampaign>;
  updateCampaign(campaignId: string, input: UpdateCouponCampaignInput): Promise<CouponCampaign | undefined>;
  listItems(campaignId: string): Promise<CouponItem[]>;
  addItem(campaignId: string, input: CreateCouponItemInput): Promise<CouponItem>;
  updateTargets(campaignId: string, input: UpdateCampaignTargetsInput): Promise<CouponCampaign | undefined>;
  updateNotice(campaignId: string, input: UpdateCampaignNoticeInput): Promise<CouponCampaign | undefined>;
  listRecipients(campaign: CouponCampaign): Promise<Profile[]>;
}

export interface MessageJobRepository {
  findExistingJob(eventId: string, campaignId: string, scheduledDate: string): Promise<MessageJob | undefined>;
}

export interface RepositorySet {
  events: EventRepository;
  coupons: CouponRepository;
  messageJobs: MessageJobRepository;
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

export const mockCouponRepository: CouponRepository = {
  async listCampaigns() {
    return couponCampaigns;
  },
  async findCampaignById(campaignId) {
    return getCampaignById(campaignId);
  },
  async createCampaign(input) {
    const campaign: CouponCampaign = {
      id: `coupon-${couponCampaigns.length + 1}`,
      isActive: input.isActive ?? true,
      createdBy: input.createdBy ?? "current-user",
      ...input
    };
    couponCampaigns.push(campaign);
    return campaign;
  },
  async updateCampaign(campaignId, input) {
    const campaign = getCampaignById(campaignId);
    if (!campaign) {
      return undefined;
    }

    Object.assign(campaign, input);
    return campaign;
  },
  async listItems(campaignId) {
    return getCampaignItems(campaignId);
  },
  async addItem(campaignId, input) {
    const item: CouponItem = {
      id: `item-${couponItems.length + 1}`,
      campaignId,
      ...input
    };
    couponItems.push(item);
    return item;
  },
  async updateTargets(campaignId, input) {
    const campaign = getCampaignById(campaignId);
    if (!campaign) {
      return undefined;
    }

    campaign.targetScope = "selected_members";
    campaign.selectedOrganizationIds = input.selectedOrganizationIds;
    campaign.selectedProfileIds = input.selectedProfileIds;
    return campaign;
  },
  async updateNotice(campaignId, input) {
    const campaign = getCampaignById(campaignId);
    if (!campaign) {
      return undefined;
    }

    campaign.noticeType = input.noticeType;
    campaign.noticeHtml = input.noticeType === "html" ? input.noticeHtml : undefined;
    campaign.noticeImageUrl = input.noticeType === "image" ? input.noticeImageUrl : undefined;
    return campaign;
  },
  async listRecipients(campaign) {
    if (campaign.targetScope === "all_members") {
      return profiles;
    }

    return profiles.filter((profile) => {
      return (
        campaign.selectedProfileIds.includes(profile.id) ||
        campaign.selectedOrganizationIds.includes(profile.organizationId)
      );
    });
  }
};

export const mockMessageJobRepository: MessageJobRepository = {
  async findExistingJob(eventId, campaignId, scheduledDate) {
    return messageJobs.find((job) => {
      return (
        job.eventId === eventId &&
        job.campaignId === campaignId &&
        job.scheduledFor.slice(0, 10) === scheduledDate
      );
    });
  }
};

export function getRepositories(): RepositorySet {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      events: mockEventRepository,
      coupons: mockCouponRepository,
      messageJobs: mockMessageJobRepository
    };
  }

  return createSupabaseRepositories(supabase);
}

function createSupabaseRepositories(supabase: ReturnType<typeof createSupabaseServiceClient>): RepositorySet {
  if (!supabase) {
    throw new Error("Supabase service client is not configured.");
  }

  const eventRepository: EventRepository = {
    async list() {
      const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
      if (error) throw error;
      return (data as Row[]).map(mapEvent);
    },
    async findById(eventId) {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return data ? mapEvent(data as Row) : undefined;
    },
    async findTomorrow(now) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const date = tomorrow.toISOString().slice(0, 10);
      const { data, error } = await supabase.from("events").select("*").eq("event_date", date);
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

  const couponRepository: CouponRepository = {
    async listCampaigns() {
      const { data, error } = await supabase
        .from("coupon_campaigns")
        .select("*, coupon_campaign_targets(*)")
        .order("valid_until", { ascending: true });
      if (error) throw error;
      return (data as Row[]).map(mapCampaign);
    },
    async findCampaignById(campaignId) {
      const { data, error } = await supabase
        .from("coupon_campaigns")
        .select("*, coupon_campaign_targets(*)")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapCampaign(data as Row) : undefined;
    },
    async createCampaign(input) {
      const { data, error } = await supabase
        .from("coupon_campaigns")
        .insert(toCampaignRow(input))
        .select("*, coupon_campaign_targets(*)")
        .single();
      if (error) throw error;

      const campaign = mapCampaign(data as Row);
      if (input.targetScope === "selected_members") {
        return (await this.updateTargets(campaign.id, {
          selectedOrganizationIds: input.selectedOrganizationIds,
          selectedProfileIds: input.selectedProfileIds
        })) as CouponCampaign;
      }

      return campaign;
    },
    async updateCampaign(campaignId, input) {
      const { data, error } = await supabase
        .from("coupon_campaigns")
        .update(toCampaignRow(input))
        .eq("id", campaignId)
        .select("*, coupon_campaign_targets(*)")
        .maybeSingle();
      if (error) throw error;
      return data ? mapCampaign(data as Row) : undefined;
    },
    async listItems(campaignId) {
      const { data, error } = await supabase.from("coupon_items").select("*").eq("campaign_id", campaignId);
      if (error) throw error;
      return (data as Row[]).map(mapCouponItem);
    },
    async addItem(campaignId, input) {
      const { data, error } = await supabase
        .from("coupon_items")
        .insert(toCouponItemRow(campaignId, input))
        .select("*")
        .single();
      if (error) throw error;
      return mapCouponItem(data as Row);
    },
    async updateTargets(campaignId, input) {
      const { error: deleteError } = await supabase
        .from("coupon_campaign_targets")
        .delete()
        .eq("campaign_id", campaignId);
      if (deleteError) throw deleteError;

      const targetRows = [
        ...input.selectedOrganizationIds.map((organizationId) => ({
          campaign_id: campaignId,
          organization_id: organizationId,
          profile_id: null
        })),
        ...input.selectedProfileIds.map((profileId) => ({
          campaign_id: campaignId,
          organization_id: null,
          profile_id: profileId
        }))
      ];

      if (targetRows.length > 0) {
        const { error: insertError } = await supabase.from("coupon_campaign_targets").insert(targetRows);
        if (insertError) throw insertError;
      }

      const { data, error } = await supabase
        .from("coupon_campaigns")
        .update({ target_scope: "selected_members" satisfies TargetScope })
        .eq("id", campaignId)
        .select("*, coupon_campaign_targets(*)")
        .maybeSingle();
      if (error) throw error;
      return data ? mapCampaign(data as Row) : undefined;
    },
    async updateNotice(campaignId, input) {
      const row =
        input.noticeType === "html"
          ? { notice_type: input.noticeType, notice_html: input.noticeHtml, notice_image_path: null }
          : { notice_type: input.noticeType, notice_html: null, notice_image_path: input.noticeImageUrl };
      const { data, error } = await supabase
        .from("coupon_campaigns")
        .update(row)
        .eq("id", campaignId)
        .select("*, coupon_campaign_targets(*)")
        .maybeSingle();
      if (error) throw error;
      return data ? mapCampaign(data as Row) : undefined;
    },
    async listRecipients(campaign) {
      if (campaign.targetScope === "all_members") {
        const { data, error } = await supabase.from("profiles").select("*, memberships(organization_id, role)");
        if (error) throw error;
        return (data as Row[]).map(mapProfileFromMembership);
      }

      const organizationIds = campaign.selectedOrganizationIds;
      const profileIds = campaign.selectedProfileIds;
      const matched = new Map<string, Profile>();

      if (profileIds.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*, memberships(organization_id, role)")
          .in("id", profileIds);
        if (error) throw error;
        (data as Row[]).map(mapProfileFromMembership).forEach((profile) => matched.set(profile.id, profile));
      }

      if (organizationIds.length > 0) {
        const { data, error } = await supabase
          .from("memberships")
          .select("organization_id, role, profiles(*)")
          .in("organization_id", organizationIds);
        if (error) throw error;
        (data as Row[]).map(mapProfileFromMembershipJoin).forEach((profile) => matched.set(profile.id, profile));
      }

      return Array.from(matched.values());
    }
  };

  const messageJobRepository: MessageJobRepository = {
    async findExistingJob(eventId, campaignId, scheduledDate) {
      const start = `${scheduledDate}T00:00:00.000Z`;
      const end = `${scheduledDate}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from("message_jobs")
        .select("*")
        .eq("event_id", eventId)
        .eq("campaign_id", campaignId)
        .gte("scheduled_for", start)
        .lte("scheduled_for", end)
        .maybeSingle();
      if (error) throw error;
      return data ? mapMessageJob(data as Row) : undefined;
    }
  };

  return {
    events: eventRepository,
    coupons: couponRepository,
    messageJobs: messageJobRepository
  };
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
    couponCampaignId: asString(row.coupon_campaign_id),
    reminderStatus: asReminderStatus(row.reminder_status),
    repeatRule: row.repeat_rule === "yearly" ? "yearly" : undefined
  };
}

function mapCampaign(row: Row): CouponCampaign {
  const targets = asRows(row.coupon_campaign_targets);

  return {
    id: asString(row.id),
    name: asString(row.name),
    description: asString(row.description),
    issueMode: row.issue_mode === "manual" ? "manual" : "jumbokids_api",
    targetScope: row.target_scope === "selected_members" ? "selected_members" : "all_members",
    validFrom: asString(row.valid_from),
    validUntil: asString(row.valid_until),
    isActive: Boolean(row.is_active),
    noticeType: row.notice_type === "image" ? "image" : "html",
    noticeHtml: asOptionalString(row.notice_html),
    noticeImageUrl: asOptionalString(row.notice_image_path),
    createdBy: asString(row.created_by),
    selectedOrganizationIds: targets.map((target) => asOptionalString(target.organization_id)).filter(isString),
    selectedProfileIds: targets.map((target) => asOptionalString(target.profile_id)).filter(isString)
  };
}

function mapCouponItem(row: Row): CouponItem {
  return {
    id: asString(row.id),
    campaignId: asString(row.campaign_id),
    title: asString(row.title),
    benefitType: row.benefit_type === "credit" ? "credit" : "coupon",
    amountLabel: asString(row.amount_label),
    manualCode: asOptionalString(row.manual_code),
    manualUrl: asOptionalString(row.manual_url),
    jumbokidsBenefitType: asJumbokidsBenefitType(row.jumbokids_benefit_type)
  };
}

function mapMessageJob(row: Row): MessageJob {
  return {
    id: asString(row.id),
    eventId: asString(row.event_id),
    campaignId: asString(row.campaign_id),
    scheduledFor: asString(row.scheduled_for),
    channels: asStringArray(row.channels).filter((channel) =>
      ["alimtalk", "sms", "email"].includes(channel)
    ) as MessageJob["channels"],
    status: asDeliveryStatus(row.status),
    recipientCount: Number(row.recipient_count ?? 0),
    landingUrl: asString(row.landing_url)
  };
}

function mapProfileFromMembership(row: Row): Profile {
  const memberships = asRows(row.memberships);
  const membership = memberships[0] ?? {};

  return {
    id: asString(row.id),
    name: asString(row.name),
    email: asString(row.email),
    phone: asString(row.phone),
    organizationId: asString(membership.organization_id),
    role: asRole(membership.role)
  };
}

function mapProfileFromMembershipJoin(row: Row): Profile {
  const profile = asRow(row.profiles);

  return {
    id: asString(profile.id),
    name: asString(profile.name),
    email: asString(profile.email),
    phone: asString(profile.phone),
    organizationId: asString(row.organization_id),
    role: asRole(row.role)
  };
}

function toEventRow(input: Partial<CreateEventInput & UpdateEventInput>) {
  return {
    organization_id: input.organizationId,
    coupon_campaign_id: input.couponCampaignId || null,
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

function toCampaignRow(input: Partial<CreateCouponCampaignInput & UpdateCouponCampaignInput>) {
  return {
    name: input.name,
    description: input.description,
    issue_mode: input.issueMode,
    target_scope: input.targetScope,
    valid_from: input.validFrom,
    valid_until: input.validUntil,
    is_active: input.isActive,
    notice_type: input.noticeType,
    notice_html: input.noticeType === "html" ? input.noticeHtml : input.noticeType === "image" ? null : undefined,
    notice_image_path: input.noticeType === "image" ? input.noticeImageUrl : input.noticeType === "html" ? null : undefined,
    created_by: input.createdBy
  };
}

function toCouponItemRow(campaignId: string, input: CreateCouponItemInput) {
  return {
    campaign_id: campaignId,
    title: input.title,
    benefit_type: input.benefitType,
    amount_label: input.amountLabel,
    manual_code: input.manualCode,
    manual_url: input.manualUrl,
    jumbokids_benefit_type: input.jumbokidsBenefitType
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isString) : [];
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(isRow) : [];
}

function asRow(value: unknown): Row {
  return isRow(value) ? value : {};
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRow(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function asRole(value: unknown): Profile["role"] {
  return ["owner", "manager", "teacher", "admin"].includes(asString(value)) ? (value as Profile["role"]) : "teacher";
}

function asJumbokidsBenefitType(value: unknown): CouponItem["jumbokidsBenefitType"] {
  return ["discount_coupon", "photo_credit", "album_coupon"].includes(asString(value))
    ? (value as CouponItem["jumbokidsBenefitType"])
    : undefined;
}
