"use client";

// Sign-up (03 F1.1): "Who are you?" first. Residents give a home area; workers and admins give the
// staff ID from the organisation's staff list, which the database checks before the account exists (0800).

import Link from "next/link";
import { useRef, useState } from "react";
import { BadgeCheck, Building2, HardHat, IdCard, Mail, MapPin, Phone, ShieldCheck, Trash2, Truck, UserRound } from "lucide-react";
import { signUp } from "../actions";
import { PASSWORD_MIN, type AccountType, type SignUpOptions } from "../schema";
import { ChoiceCards } from "./ChoiceCards";
import { FormAlert, PasswordField, SelectField, SelectPromptField, TextField } from "./fields";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

const WHO = [
  { value: "resident", label: "Resident", hint: "Report and track", icon: UserRound },
  { value: "worker", label: "Worker", hint: "Collector or driver", icon: HardHat },
  { value: "admin", label: "Administrator", hint: "Runs the dashboard", icon: ShieldCheck },
] as const;

const WORK = [
  { value: "collector", label: "Waste collector", hint: "Cleans and collects", icon: Trash2 },
  { value: "driver", label: "Driver", hint: "Drives the vehicle", icon: Truck },
] as const;

export function SignUpForm({ options }: { options: SignUpOptions }) {
  const [accountType, setAccountType] = useState<AccountType>("resident");
  const [workerType, setWorkerType] = useState<"collector" | "driver" | "">("");
  const staff = accountType !== "resident";
  const [organizationId, setOrganizationId] = useState(options.organizations.length === 1 ? options.organizations[0].id : "");
  const organizationSelect = useRef<HTMLSelectElement>(null);
  const areas = options.areas.filter((a) => a.organizationId === organizationId);

  function chooseOrganizationFirst() {
    const select = organizationSelect.current;
    if (!select) return;
    select.focus();
    try {
      select.showPicker();
    } catch {
      // Focus still takes the user to Organisation if the browser cannot open its native picker.
    }
  }

  const { pending, errors, message, formProps } = useAuthForm((data) =>
    signUp({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      password: String(data.get("password") ?? ""),
      organizationId: String(data.get("organizationId") ?? ""),
      areaId: String(data.get("areaId") ?? ""),
      accountType,
      staffId: String(data.get("staffId") ?? ""),
      workerType: accountType === "worker" ? workerType : "",
    }),
  );

  return (
    <div className="animate-enter">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">
        Join your <span className="accent-serif text-leaf-700">area</span>
      </h1>
      <p className="mt-1.5 text-ui text-leaf-950/80">
        {staff ? "Staff accounts are checked against your organisation's staff list." : "Create a resident account to report issues and request pickups."}
      </p>

      <form {...formProps} className="mt-6 flex flex-col gap-4">
        <ChoiceCards name="accountType" legend="Who are you?" options={WHO} value={accountType} onChange={setAccountType} />
        {accountType === "worker" && (
          <ChoiceCards name="workerType" legend="Type of work" options={WORK} value={workerType} onChange={setWorkerType} error={errors.workerType} />
        )}
        <TextField id="name" label="Full name" icon={UserRound} autoComplete="name" required error={errors.name} />
        <TextField
          id="email"
          label={staff ? "Work email" : "Email"}
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={staff ? "name@organisation.org" : "you@example.com"}
          hint={staff ? "The email your organisation listed with your staff ID." : undefined}
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
            ref={organizationSelect}
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
          {accountType !== "admin" && (organizationId ? (
            <SelectField
              key={organizationId}
              id="areaId"
              label={staff ? "Work area (block)" : "Home area"}
              icon={MapPin}
              required
              defaultValue=""
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
          ) : (
            <SelectPromptField
              id="areaId"
              label={staff ? "Work area (block)" : "Home area"}
              icon={MapPin}
              hint="Choose an organisation to see its areas."
              error={errors.areaId}
              onClick={chooseOrganizationFirst}
            />
          ))}
        </div>
        {staff && (
          <TextField
            id="staffId"
            label="Staff ID"
            icon={IdCard}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="e.g. CWA-DRV-002"
            maxLength={40}
            required
            hint="Printed on your staff card. Your role comes from the staff list, not from this form."
            error={errors.staffId}
          />
        )}
        <FormAlert message={message} />
        <SubmitButton
          pending={pending}
          label={staff ? "Verify and create account" : "Create account"}
          pendingLabel={staff ? "Checking staff list…" : "Creating account…"}
        />
        {staff && (
          <p className="flex items-start gap-1.5 text-sm text-leaf-950/70">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-leaf-700" aria-hidden />
            Checked against the staff list your organisation keeps in SWMS. Not connected to a government database.
          </p>
        )}
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
