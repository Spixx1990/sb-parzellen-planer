/* Gemeinsamer Plan: liest und schreibt das Layout in Upstash Redis.
 *
 * GET  /api/layout             -> aktueller Stand   {ok,layout,rev,savedAt,savedBy}
 * GET  /api/layout?history=1   -> letzte 10 Staende  {ok,history:[...]}
 * POST /api/layout             -> speichern         {layout,rev,by,key,force}
 *
 * Umgebungsvariablen (Vercel -> Settings -> Environment Variables):
 *   UPSTASH_REDIS_REST_URL     von der Upstash-Datenbank
 *   UPSTASH_REDIS_REST_TOKEN   dito, bleibt serverseitig
 *   PLAN_WRITE_KEY             frei gewaehlt; Schreiben nur mit diesem Schluessel
 *
 * Fehlen die Variablen, antwortet die Funktion mit 503 und "configured:false" -
 * die Seite faellt dann auf den lokalen Speicher zurueck und bleibt bedienbar.
 * Bewusst ohne npm-Pakete: Upstash spricht REST, fetch genuegt.
 */
"use strict";

var KEY_CUR = "plan:current";     // JSON-Datensatz des aktuellen Standes
var KEY_REV = "plan:rev";         // Zaehler, verhindert stilles Ueberschreiben
var KEY_HIST = "plan:history";    // Liste der letzten Staende, neuester zuerst
var HIST_MAX = 10;
var MAX_BYTES = 256 * 1024;       // ein Layout ist wenige KB; alles darueber ist Unfug

function env() {
  var url = process.env.UPSTASH_REDIS_REST_URL,
      tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && tok ? { url: url.replace(/\/+$/, ""), tok: tok } : null;
}

/* Ein Redis-Befehl als REST-Aufruf: ["SET","key","wert"] */
async function cmd(e, args) {
  var r = await fetch(e.url, {
    method: "POST",
    headers: { authorization: "Bearer " + e.tok, "content-type": "application/json" },
    body: JSON.stringify(args)
  });
  if (!r.ok) throw new Error("Upstash " + r.status + " " + (await r.text()).slice(0, 200));
  var j = await r.json();
  if (j.error) throw new Error("Upstash: " + j.error);
  return j.result;
}

function readBody(req) {
  if (req.body) return typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  return new Promise(function (res, rej) {
    var s = "", over = false;
    req.on("data", function (c) { s += c; if (s.length > MAX_BYTES) { over = true; req.destroy(); } });
    req.on("end", function () { over ? rej(new Error("zu gross")) : res(s); });
    req.on("error", rej);
  });
}

function send(res, code, obj) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");   // der Stand darf nie aus einem Cache kommen
  res.status(code).send(JSON.stringify(obj));
}

module.exports = async function (req, res) {
  var e = env();
  if (!e) return send(res, 503, { ok: false, configured: false,
    error: "Speicher nicht eingerichtet – UPSTASH_REDIS_REST_URL und _TOKEN fehlen." });

  try {
    if (req.method === "GET") {
      if (req.query && req.query.history) {
        var raw = await cmd(e, ["LRANGE", KEY_HIST, "0", String(HIST_MAX - 1)]);
        var hist = (raw || []).map(function (s) {
          try { var d = JSON.parse(s); return { rev: d.rev, savedAt: d.savedAt, savedBy: d.savedBy, layout: d.layout }; }
          catch (err) { return null; }
        }).filter(Boolean);
        return send(res, 200, { ok: true, configured: true, history: hist });
      }
      var cur = await cmd(e, ["GET", KEY_CUR]);
      if (!cur) return send(res, 200, { ok: true, configured: true, empty: true, rev: 0 });
      var d = JSON.parse(cur);
      return send(res, 200, { ok: true, configured: true, layout: d.layout, rev: d.rev,
                              savedAt: d.savedAt, savedBy: d.savedBy });
    }

    if (req.method === "POST") {
      var body = await readBody(req), inp;
      try { inp = JSON.parse(body); } catch (err) { return send(res, 400, { ok: false, error: "Kein gültiges JSON." }); }

      var need = process.env.PLAN_WRITE_KEY || "";
      if (need && inp.key !== need)
        return send(res, 403, { ok: false, error: "Zum Ändern fehlt der Schlüssel im Link." });

      if (typeof inp.layout !== "string" || !inp.layout)
        return send(res, 400, { ok: false, error: "Kein Layout mitgeschickt." });
      if (inp.layout.length > MAX_BYTES)
        return send(res, 413, { ok: false, error: "Layout zu groß." });
      try { JSON.parse(inp.layout); } catch (err) {
        return send(res, 400, { ok: false, error: "Layout ist kein gültiges JSON." }); }

      /* Kollisionsschutz: der Client schickt den Stand, den er geladen hat.
         Ist inzwischen ein neuerer da, wird nicht überschrieben - ausser force. */
      var revNow = parseInt(await cmd(e, ["GET", KEY_REV]), 10) || 0;
      if (!inp.force && typeof inp.rev === "number" && inp.rev !== revNow) {
        var other = await cmd(e, ["GET", KEY_CUR]);
        var o = other ? JSON.parse(other) : {};
        return send(res, 409, { ok: false, conflict: true, rev: revNow,
          savedAt: o.savedAt, savedBy: o.savedBy,
          error: "Jemand anderes hat zwischenzeitlich gespeichert." });
      }

      var rev = parseInt(await cmd(e, ["INCR", KEY_REV]), 10);
      var rec = { layout: inp.layout, rev: rev, savedAt: new Date().toISOString(),
                  savedBy: String(inp.by || "").slice(0, 40) };
      var s = JSON.stringify(rec);
      await cmd(e, ["SET", KEY_CUR, s]);
      await cmd(e, ["LPUSH", KEY_HIST, s]);
      await cmd(e, ["LTRIM", KEY_HIST, "0", String(HIST_MAX - 1)]);
      return send(res, 200, { ok: true, configured: true, rev: rev, savedAt: rec.savedAt, savedBy: rec.savedBy });
    }

    res.setHeader("allow", "GET, POST");
    return send(res, 405, { ok: false, error: "Methode nicht erlaubt." });
  } catch (err) {
    return send(res, 502, { ok: false, error: "Speicher nicht erreichbar: " + err.message });
  }
};
