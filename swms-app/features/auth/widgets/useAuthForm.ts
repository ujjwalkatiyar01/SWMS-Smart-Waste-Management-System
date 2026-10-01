"use client";

// Shared submit behaviour for login and sign-up: one request at a time, errors under fields,
// focus on the first invalid field, typed values kept after a failure.

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AuthResult } from "../schema";

const UNEXPECTED = "Something went wrong. Please try again.";

export function useAuthForm<Field extends string>(submit: (data: FormData) => Promise<AuthResult<Field>>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState<string>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    setPending(true);
    setMessage(undefined);

    let result: AuthResult<Field>;
    try {
      result = await submit(new FormData(form));
    } catch {
      result = { ok: false, message: UNEXPECTED };
    }

    if (result.ok) {
      router.push(result.home);
      return; // stay "pending" while the next page loads
    }
    setPending(false);
    const fieldErrors = result.fieldErrors ?? {};
    setErrors(fieldErrors);
    setMessage(result.message);
    const first = Object.keys(fieldErrors)[0];
    if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
  }

  function onInput(e: FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name as Field;
    if (!errors[name]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  return { pending, errors, message, formProps: { onSubmit, onInput, noValidate: true } };
}
