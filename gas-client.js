/**
 * gas-client.js — a small PocketBase-compatible client that talks to the Google Apps Script backend.
 * It exposes the subset of the PocketBase JS SDK the app uses:
 *   pb.collection(name).getFullList / getList / getOne / getFirstListItem / create / update / delete
 *   pb.collection("users").authWithPassword / authRefresh
 *   pb.authStore { token, record, isValid, clear() }
 *   pb.filter(expr, params), pb.send(path), pb.files.getURL(), pb.files.download()
 */
(function () {
  const TOKEN_KEY = "sr_token", USER_KEY = "sr_user";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} },
  };

  class ClientError extends Error {
    constructor(status, message, data) { super(message); this.status = status; this.response = { data: data || {} }; }
  }

  // File / Blob -> {name, mime, base64}
  const fileToPayload = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ name: file.name, mime: file.type || "application/octet-stream", base64: String(r.result).split(",")[1] || "" });
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  async function normalizeData(data) {
    // FormData (used by the centers form) -> plain object, logo -> data URL
    if (typeof FormData !== "undefined" && data instanceof FormData) {
      const o = {};
      for (const [k, v] of data.entries()) {
        if (typeof File !== "undefined" && v instanceof File) { if (v.size) o[k] = await fileToDataUrl(v); }
        else o[k] = v;
      }
      return o;
    }
    const out = { ...data };
    if (Array.isArray(out["files+"])) out["files+"] = await Promise.all(out["files+"].map(fileToPayload));
    return out;
  }

  class GasPB {
    constructor(url) {
      this.url = url;
      const self = this;
      let user = null;
      try { user = JSON.parse(store.get(USER_KEY) || "null"); } catch (_) {}
      this.authStore = {
        token: store.get(TOKEN_KEY) || "",
        record: user,
        get isValid() { return !!(this.token && this.record); },
        save(token, record) { this.token = token; this.record = record; store.set(TOKEN_KEY, token); store.set(USER_KEY, JSON.stringify(record)); },
        clear() { const t = this.token; this.token = ""; this.record = null; store.set(TOKEN_KEY, null); store.set(USER_KEY, null); if (t) self.call({ action: "logout", token: t }).catch(() => {}); },
      };
      this.files = {
        getURL: (rec, name) => (name && String(name).startsWith("data:") ? name : ""),
        getToken: async () => this.authStore.token,
        download: async (rec, name) => {
          const r = await this.call({ action: "fileData", collection: rec.collectionName, id: rec.id, name });
          const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: r.mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          if (/^(application\/pdf|image\/)/.test(r.mime)) { window.open(url, "_blank"); }
          else { a.href = url; a.download = r.name; document.body.appendChild(a); a.click(); a.remove(); }
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        },
      };
    }

    autoCancellation() {}

    async call(body) {
      if (!this.url) throw new ClientError(0, "لم يتم ضبط رابط الخادم (Apps Script).");
      let res;
      try {
        // text/plain keeps this a "simple" CORS request (no preflight), which Apps Script supports.
        res = await fetch(this.url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow" });
      } catch (e) {
        throw new ClientError(0, "تعذر الاتصال بالخادم. تحقق من الإنترنت ومن رابط Apps Script.");
      }
      let out;
      try { out = await res.json(); } catch (e) {
        // Not JSON: wrong URL (404), or the deployment is not public (Google login page).
        const hint = res.status === 404
          ? "رابط الخادم غير صحيح (404). انسخ رابط Web app من Apps Script: Deploy ← Manage deployments، يجب أن ينتهي بـ /exec."
          : "الخادم لم يرد ببيانات صحيحة. تأكد أن النشر Web app وأن Who has access = Anyone، ثم أعد النشر بنسخة جديدة.";
        throw new ClientError(0, hint);
      }
      if (!out.ok) {
        const err = out.error || {};
        if (err.status === 401 && body.action !== "auth") { this.authStore.token = ""; this.authStore.record = null; store.set(TOKEN_KEY, null); store.set(USER_KEY, null); }
        throw new ClientError(err.status || 500, err.message || "Error", err.data);
      }
      return out.result;
    }

    authed(body) { return this.call({ ...body, token: this.authStore.token }); }

    filter(expr, params) {
      return String(expr).replace(/\{:(\w+)\}/g, (_, k) => {
        const v = params ? params[k] : undefined;
        if (v === null || v === undefined) return "null";
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        return '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
      });
    }

    async send(path) {
      if (/send-reminders/.test(path)) return this.authed({ action: "sendReminders" });
      throw new ClientError(404, "Unknown endpoint");
    }

    collection(name) {
      const pb = this;
      return {
        async getFullList(opts = {}) {
          const r = await pb.authed({ action: "list", collection: name, filter: opts.filter || "", sort: opts.sort || "", expand: opts.expand || "" });
          return r.items;
        },
        async getList(page = 1, perPage = 30, opts = {}) {
          return pb.authed({ action: "list", collection: name, page, perPage, filter: opts.filter || "", sort: opts.sort || "", expand: opts.expand || "" });
        },
        async getOne(id, opts = {}) { return pb.authed({ action: "one", collection: name, id, expand: opts.expand || "" }); },
        async getFirstListItem(filter, opts = {}) {
          const r = await pb.authed({ action: "list", collection: name, page: 1, perPage: 1, filter: filter || "", sort: opts.sort || "", expand: opts.expand || "" });
          if (!r.items.length) throw new ClientError(404, "The requested resource wasn't found.");
          return r.items[0];
        },
        async create(data) { return pb.authed({ action: "create", collection: name, data: await normalizeData(data) }); },
        async update(id, data) {
          const rec = await pb.authed({ action: "update", collection: name, id, data: await normalizeData(data) });
          if (name === "users" && pb.authStore.record && rec.id === pb.authStore.record.id) pb.authStore.save(pb.authStore.token, rec);
          return rec;
        },
        async delete(id) { return pb.authed({ action: "delete", collection: name, id }); },
        async authWithPassword(identity, password) {
          const r = await pb.call({ action: "auth", identity, password });
          pb.authStore.save(r.token, r.record);
          return r;
        },
        async authRefresh() {
          const r = await pb.authed({ action: "refresh" });
          pb.authStore.save(r.token, r.record);
          return r;
        },
      };
    }
  }

  window.GasPB = GasPB;
})();
