import type { NextRequest } from "next/server";
import { z } from "zod";
import { todayIn } from "@/lib/dates";
import { toCsvLong, toCsvWide } from "@/lib/io/csv";
import { guardLocalRequest } from "@/lib/security";
import { buildExportFile, fileStamp } from "@/lib/services/export-service";
import { getSettings } from "@/lib/services/settings-store";

const querySchema = z.object({
  format: z.enum(["json", "csv-long", "csv-wide"]).default("json"),
  year: z.coerce.number().int().min(1970).max(2100).optional(),
});

/** FR-18. GET /api/export?format=json|csv-long|csv-wide&year= */
export async function GET(request: NextRequest) {
  const blocked = guardLocalRequest(request, { mutating: false });
  if (blocked) return blocked;

  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) {
    return Response.json({ message: "Parameter tidak valid.", errors: z.flattenError(query.error).fieldErrors }, { status: 400 });
  }
  const { format } = query.data;

  const now = new Date();
  const [file, settings] = await Promise.all([buildExportFile(now), getSettings()]);
  const stamp = fileStamp(settings.timezone, now);
  const today = todayIn(settings.timezone, now);

  const body =
    format === "json"
      ? JSON.stringify(file, null, 2)
      : format === "csv-long"
        ? toCsvLong(file)
        : toCsvWide(file, query.data.year ?? Number(today.slice(0, 4)), today);

  return new Response(body, {
    headers: {
      "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="habit-tracker-${stamp}.${format === "json" ? "json" : "csv"}"`,
      "Cache-Control": "no-store",
    },
  });
}
