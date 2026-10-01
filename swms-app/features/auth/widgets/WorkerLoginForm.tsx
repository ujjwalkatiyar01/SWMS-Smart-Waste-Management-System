"use client";

// Worker login (user decision 2026-10-01): organisation, the block / area worked in now, staff ID,
// work email and password. The area becomes today's check-in so duties and tasks match where they work.

import Link from "next/link";
import { useState } from "react";
import { Building2, HardHat, IdCard, Mail, MapPin } from "lucide-react";
import { workerLogin } from "../actions";
import type { SignUpOptions } from "../schema";
import { FormAlert, PasswordField, SelectField, TextField } from "./fields";
import { LoginRoleSwitch } from "./LoginRoleSwitch";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

export function WorkerLoginForm({ options }: { options: SignUpOptions }) {
  const [organizationId, setOrganizationId] = useState(options.organizations.length === 1 ? options.organizations[0].id : "");
  const areas = options.areas.filter((a) => a.organizationId === organizationId);
  const { pending, errors, message, formProps } = useAuthForm((data) =>
    workerLogin({
      organizationId: String(data.get("organizationId") ?? ""),
      areaId: String(data.get("areaId") ?? ""),
      staffId: String(data.get("staffId") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    }),
  );

  return (
    <div className="animate-enter">
      <p className="eyebrow flex items-center gap-1.5 text-leaf-600"><HardHat className="size-4" aria-hidden /> Workers and drivers</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">
        Worker <span className="accent-serif text-leaf-700">login</span>
      </h1>
      <p className="mt-1.5 text-ui text-leaf-950/80">Tell us where you are working today. Your admin plans duties by area.</p>

      <LoginRoleSwitch active="worker" />

      <form {...formProps} className="mt-6 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="organizationId" label="Organisation" icon={Building2} required value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)} error={errors.organizationId}>
            <option value="" disabled>Choose…</option>
            {options.organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </SelectField>
          <SelectField key={organizationId} id="areaId" label="Working today in (block / area)" icon={MapPin} required defaultValue=""
            disabled={!organizationId} error={errors.areaId}>
            <option value="" disabled>Choose…</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </SelectField>
        </div>
        <TextField id="staffId" label="Staff ID" icon={IdCard} autoComplete="username" autoCapitalize="characters"
          placeholder="e.g. CWA-COL-001" maxLength={40} required error={errors.staffId} />
        <TextField id="email" label="Work email" icon={Mail} type="email" inputMode="email" autoComplete="email"
          placeholder="name@organisation.org" required error={errors.email} />
        <PasswordField id="password" label="Password" autoComplete="current-password" required error={errors.password} />
        <Link href="/reset-password" className="self-end text-sm font-semibold text-leaf-800 underline-offset-4 hover:underline">Forgot password?</Link>
        <FormAlert message={message} />
        <SubmitButton pending={pending} label="Start my shift" pendingLabel="Checking…" />
      </form>

      <p className="mt-5 text-center text-ui text-leaf-950/80">
        New worker?{" "}
        <Link href="/signup" className="font-semibold text-leaf-800 underline-offset-4 hover:underline">Create your account with your staff ID</Link>
      </p>
    </div>
  );
}
