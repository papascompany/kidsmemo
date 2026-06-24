"use client";

import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { AdminOrganizationOption, AdminOrganizationsPayload } from "@/lib/admin-organizations";

export interface AdminOrganizationSelectProps {
  value: string;
  onChange: (organizationId: string, organizationName: string) => void;
  initialOrganization?: AdminOrganizationOption | null;
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function AdminOrganizationSelect({
  value,
  onChange,
  initialOrganization = null,
  id,
  name,
  label = "기관",
  placeholder = "기관명 또는 지역으로 검색",
  disabled = false,
  required = false,
  className = ""
}: AdminOrganizationSelectProps) {
  const generatedId = useId();
  const inputId = id ?? `admin-organization-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const statusId = `${inputId}-status`;
  const rootRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [selected, setSelected] = useState<AdminOrganizationOption | null>(
    initialOrganization?.id === value ? initialOrganization : null
  );
  const [query, setQuery] = useState(initialOrganization?.id === value ? initialOrganization.name : "");
  const [options, setOptions] = useState<AdminOrganizationOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      setQuery("");
      return;
    }

    if (selected?.id === value) return;
    if (initialOrganization?.id === value) {
      setSelected(initialOrganization);
      setQuery(initialOrganization.name);
      return;
    }

    const controller = new AbortController();
    void fetchOrganizations({ id: value, signal: controller.signal })
      .then((items) => {
        const organization = items[0] ?? null;
        setSelected(organization);
        setQuery(organization?.name ?? "");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSelected(null);
          setQuery("");
        }
      });

    return () => controller.abort();
  }, [initialOrganization, selected?.id, value]);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const items = await fetchOrganizations({
          query: selected && query === selected.name ? "" : query,
          signal: controller.signal
        });
        setOptions(items);
        setActiveIndex(items.length > 0 ? 0 : -1);
      } catch {
        if (!controller.signal.aborted) {
          setOptions([]);
          setActiveIndex(-1);
          setErrorMessage("기관 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query, selected]);

  function selectOrganization(organization: AdminOrganizationOption) {
    setSelected(organization);
    setQuery(organization.name);
    setIsOpen(false);
    onChange(organization.id, organization.name);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setOptions([]);
    setActiveIndex(-1);
    setIsOpen(true);
    onChange("", "");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      event.preventDefault();
      const organization = options[activeIndex];
      if (organization) selectOrganization(organization);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setQuery(selected?.name ?? "");
    }
  }

  const activeOption = activeIndex >= 0 ? options[activeIndex] : null;
  const statusMessage = errorMessage
    ? errorMessage
    : isLoading
      ? "기관을 검색하고 있습니다."
      : options.length === 0
        ? "검색 결과가 없습니다."
        : `${options.length}개의 기관을 찾았습니다.`;

  return (
    <div ref={rootRef} className={`relative grid gap-2 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
        {required ? <span className="ml-1 text-coral">*</span> : null}
      </label>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id={inputId}
          type="text"
          role="combobox"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOption ? `${inputId}-option-${activeOption.id}` : undefined}
          aria-describedby={statusId}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="min-h-11 w-full rounded border border-line bg-white py-2 pl-10 pr-20 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
          {isLoading ? <Loader2 size={17} className="mr-2 animate-spin text-muted" aria-hidden /> : null}
          {value && !disabled ? (
            <button
              type="button"
              onClick={clearSelection}
              className="grid min-h-9 min-w-9 place-items-center rounded text-muted hover:bg-surface hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
              aria-label="선택한 기관 지우기"
              title="선택 지우기"
            >
              <X size={17} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            disabled={disabled}
            className="grid min-h-9 min-w-9 place-items-center rounded text-muted hover:bg-surface hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed"
            aria-label={isOpen ? "기관 목록 닫기" : "기관 목록 열기"}
            title={isOpen ? "목록 닫기" : "목록 열기"}
            tabIndex={-1}
          >
            <ChevronDown
              size={18}
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <p id={statusId} className="sr-only" aria-live="polite">
        {isOpen ? statusMessage : selected ? `${selected.name} 선택됨` : ""}
      </p>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="기관 검색 결과"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded border border-line bg-white p-1 shadow-soft"
        >
          {isLoading && options.length === 0 ? (
            <div className="flex min-h-20 items-center justify-center gap-2 px-3 py-4 text-sm text-muted">
              <Loader2 size={17} className="animate-spin" aria-hidden />
              기관을 검색하고 있습니다.
            </div>
          ) : errorMessage ? (
            <div className="px-3 py-4 text-center text-sm text-coral">{errorMessage}</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted">검색 결과가 없습니다.</div>
          ) : (
            options.map((organization, index) => {
              const isSelected = organization.id === value;
              const isActive = index === activeIndex;

              return (
                <button
                  id={`${inputId}-option-${organization.id}`}
                  key={organization.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => selectOrganization(organization)}
                  className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left transition ${
                    isActive ? "bg-brand/10 text-ink" : "text-ink hover:bg-surface"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{organization.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {organization.region} · {organization.type === "daycare" ? "어린이집" : "유치원"}
                    </span>
                  </span>
                  {isSelected ? <Check size={18} className="shrink-0 text-brand" aria-hidden /> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

async function fetchOrganizations({
  id,
  query,
  signal
}: {
  id?: string;
  query?: string;
  signal: AbortSignal;
}) {
  const searchParams = new URLSearchParams();
  if (id) searchParams.set("id", id);
  if (query) searchParams.set("q", query);

  const response = await authenticatedFetch(`/api/admin/organizations?${searchParams.toString()}`, { signal });
  if (!response.ok) throw new Error("organization_fetch_failed");

  const payload: unknown = await response.json();
  if (!isOrganizationsResponse(payload)) throw new Error("invalid_organization_response");
  return payload.data.organizations;
}

function isOrganizationsResponse(
  payload: unknown
): payload is { ok: true; data: AdminOrganizationsPayload } {
  if (!payload || typeof payload !== "object" || !("data" in payload)) return false;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object" || !("organizations" in data)) return false;
  return Array.isArray((data as AdminOrganizationsPayload).organizations);
}
