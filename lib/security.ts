/**
 * Perlindungan Route Handler (NFR-02). Server memang hanya mendengarkan 127.0.0.1, tetapi situs web lain yang
 * dibuka di browser yang sama tetap dapat mengirim request ke localhost:
 *  - CSRF: form lintas situs dapat mem-POST berkas ke /api/import dan menimpa data.
 *  - DNS rebinding: domain penyerang yang di-resolve ke 127.0.0.1 membawa header Host berbeda.
 * Karena itu Host harus localhost, dan request yang mengubah data harus berasal dari origin yang sama.
 */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

type HeaderSource = { headers: Pick<Headers, "get"> };

const hostnameOf = (host: string) => (host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0]).toLowerCase();

export function guardLocalRequest(request: HeaderSource, { mutating }: { mutating: boolean }): Response | null {
  const host = request.headers.get("host");
  if (!host || !LOCAL_HOSTNAMES.has(hostnameOf(host))) {
    return Response.json({ message: "Host tidak diizinkan." }, { status: 403 });
  }

  if (mutating) {
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      return Response.json({ message: "Permintaan lintas situs ditolak." }, { status: 403 });
    }
    const origin = request.headers.get("origin");
    if (origin) {
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        // origin tidak valid → ditolak di bawah
      }
      if (originHost !== host) return Response.json({ message: "Origin tidak diizinkan." }, { status: 403 });
    }
  }
  return null;
}
