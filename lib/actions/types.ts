import type { FieldErrors } from "@/lib/validation/habit";

/** State yang dikembalikan Server Action ke `useActionState`. `values` menjaga isian form saat validasi gagal. */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };
