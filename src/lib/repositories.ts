import { events, messageJobs } from "./mock-data";
import { isTomorrow } from "./format";
import { createSupabaseServiceClient } from "./supabase";
import type { EventSchedule, MessageJob } from "./types";

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

export interface RepositorySet {
  events: EventRepository;
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

export const mockMessageJobRepository: MessageJobRepository = {
  async findExistingJob(eventId, scheduledDate) {
    return messageJobs.find((job) => {
      return job.eventId === eventId && job.scheduledFor.slice(0, 10) === scheduledDate;
    });
  }
};

export function getRepositories(): RepositorySet {
  const dataBackend = process.env.KIDSMEMO_DATA_BACKEND ?? "mock";

  if (dataBackend !== "supabase") {
    return {
      events: mockEventRepository,
      messageJobs: mockMessageJobRepository
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      events: mockEventRepository,
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

  return {
    events: eventRepository,
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
