"use client";

// Resident sign-up (03 F1.1): name, email, phone (optional), password, organisation, home area.

import Link from "next/link";
import { useState } from "react";
import { Building2, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { signUp } from "../actions";
import { PASSWORD_MIN, type SignUpOptions } from "../schema";
import { FormAlert, PasswordField, SelectField, TextField } from "./fields";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

export function SignUpForm({ options }: { options: SignUpOptions }) {
  const [organizationId, setOrganizationId] = useState(options.organizations.length === 1 ? options.organizations[0].id : "");
  const areas = options.areas.filter((a) => a.organizationId === organizationId);

  const { pending, errors, message, formProps } = useAuthForm((data) =>
    signUp({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      password: String(data.get("password") ?? ""),
      organizationId: String(data.get("organizationId") ?? ""),
      areaId: String(data.get("areaId") ?? ""),
    }),
  );

  return (
    <div className="animate-enter">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">
        Join your <span className="accent-serif text-leaf-700">area</span>
      </h1>
      <p className="mt-1.5 text-ui text-leaf-950/80">Create a resident account to report issues and request pickups.</p>

      <form {...formProps} className="mt-6 flex flex-col gap-4">
        <TextField id="name" label="Full name" icon={UserRound} autoComplete="name" required error={errors.name} />
        <TextField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          error={errors.email}
        />
        <TextField
          id="phone"
          label="Phone"
          icon={Phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          optional
          error={errors.phone}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          required
          hint={`At least ${PASSWORD_MIN} characters.`}
          error={errors.password}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="organizationId"
            label="Organisation"
            icon={Building2}
            required
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            error={errors.organizationId}
          >
            <option value="" disabled>
              Choose…
            </option>
            {options.organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            key={organizationId}
            id="areaId"
            label="Home area"
            icon={MapPin}
            required
            defaultValue=""
            disabled={!organizationId}
            error={errors.areaId}
          >
            <option value="" disabled>
              Choose…
            </option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </SelectField>
        </div>
        <FormAlert message={message} />
        <SubmitButton pending={pending} label="Create account" pendingLabel="Creating account…" />
      </form>

      <p className="mt-5 text-center text-ui text-leaf-950/80">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-leaf-800 underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
