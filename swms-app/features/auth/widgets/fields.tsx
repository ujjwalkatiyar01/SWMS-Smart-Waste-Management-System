"use client";

// Labelled glass inputs with an icon, helper text and an error under the field.

import { useState, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { CircleAlert, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const control =
  "h-12 w-full rounded-2xl border border-white/60 bg-white/45 pl-11 pr-4 text-base text-leaf-950 shadow-[inset_0_1px_2px_rgba(22,52,25,0.06)] outline-none ring-1 ring-leaf-900/10 transition-[background-color,box-shadow] duration-200 placeholder:text-leaf-950/50 backdrop-blur-md hover:bg-white/60 focus:bg-white/85 focus:ring-2 focus:ring-leaf-600 focus-visible:outline-none aria-invalid:ring-2 aria-invalid:ring-danger";
const selectControl = cn(control, "appearance-none bg-[length:18px] bg-[right_1rem_center] bg-no-repeat pr-10");
const selectStyle = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232e6420' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };

function FieldShell({
  id,
  label,
  icon: Icon,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  icon: IconType;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-leaf-950">
        {label}
        {optional && <span className="ml-1 font-normal text-leaf-950/70">(optional)</span>}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-leaf-700" aria-hidden />
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-leaf-950/70">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type FieldProps = { label: string; icon: IconType; hint?: string; error?: string; optional?: boolean };

export function TextField({ id, label, icon, hint, error, optional, className, ...input }: ComponentProps<"input"> & FieldProps & { id: string }) {
  return (
    <FieldShell id={id} label={label} icon={icon} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, className)}
        {...input}
      />
    </FieldShell>
  );
}

export function PasswordField(props: Omit<ComponentProps<typeof TextField>, "type" | "icon">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextField {...props} icon={LockKeyhole} type={visible ? "text" : "password"} className="pr-14" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute right-1 top-[1.75rem] inline-flex size-11 items-center justify-center rounded-xl text-leaf-800 transition-colors hover:bg-leaf-100/70 active:scale-95"
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}

export function SelectField({
  id,
  label,
  icon,
  hint,
  error,
  optional,
  children,
  ...select
}: ComponentProps<"select"> & FieldProps & { id: string }) {
  return (
    <FieldShell id={id} label={label} icon={icon} hint={hint} error={error} optional={optional}>
      <select
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={selectControl}
        style={selectStyle}
        {...select}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function SelectPromptField({ id, label, icon, hint, error, onClick }: FieldProps & { id: string; onClick: () => void }) {
  return (
    <FieldShell id={id} label={label} icon={icon} hint={hint} error={error}>
      <button
        id={id}
        name={id}
        type="button"
        onClick={onClick}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(selectControl, "text-left")}
        style={selectStyle}
      >
        Choose organisation first
      </button>
    </FieldShell>
  );
}

export function FormAlert({ message }: { message?: string }) {
  return (
    <div role="alert" aria-live="assertive">
      {message && (
        <p className="flex items-start gap-2 rounded-2xl border border-danger/20 bg-danger-soft/90 px-4 py-3 text-sm font-medium text-danger animate-pop">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {message}
        </p>
      )}
    </div>
  );
}
