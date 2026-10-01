/** Result of a server action that returns no data: success, or a plain-language message for the screen. */
export type ActionOutcome = { ok: true } | { ok: false; message: string };
