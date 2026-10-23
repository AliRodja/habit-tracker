import type { NextRequest } from "next/server";
import { todayIn } from "@/lib/dates";
import type { ImportMode } from "@/lib/io/plan";
import { guardLocalRequest } from "@/lib/security";
import { previewImport, runImport } from "@/lib/services/import-service";
import { getSettings } from "@/lib/services/settings-store";

const MAX_BYTES = 10 * 1024 * 1024;
const ISSUE_LIMIT = 50;

/** FR-19. POST multipart (field `file`) ke /api/import?mode=merge|replace&dryRun=true */
export async function POST(request: NextRequest) {
  const blocked = guardLocalRequest(request, { mutating: true });
  if (blocked) return blocked;

  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") ?? "merge";
  if (mode !== "merge" && mode !== "replace") {
    return Response.json({ message: "mode harus merge atau replace." }, { status: 400 });
  }
  const dryRun = params.get("dryRun") === "true";

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: "Kirim berkas sebagai multipart/form-data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ message: "Berkas tidak ditemukan pada field `file`." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ message: "Berkas terlalu besar (maksimal 10 MB)." }, { status: 413 });

  const text = await file.text();
  const { timezone } = await getSettings();
  const today = todayIn(timezone);
  const importMode: ImportMode = mode;

  const outcome = dryRun
    ? { plan: await previewImport(text, file.name, importMode, today), applied: false, backupPath: undefined }
    : await runImport(text, file.name, importMode, today);

  const { plan } = outcome;
  const body = {
    dryRun,
    applied: outcome.applied,
    backupPath: outcome.backupPath ?? null,
    format: plan.format,
    mode: plan.mode,
    counts: plan.counts,
    canApply: plan.canApply,
    issueCount: plan.issues.length,
    issues: plan.issues.slice(0, ISSUE_LIMIT),
  };
  // Pratinjau dengan galat tetap 200 agar UI menampilkan galat per baris; menerapkan berkas tidak valid ditolak.
  return Response.json(body, { status: dryRun || plan.canApply ? 200 : 422 });
}
