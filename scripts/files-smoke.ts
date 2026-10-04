// Only fictional disposable workspaces and mocked provider HTTP. Never reads a real drive.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, getWorkspace, mutate } from "../lib/db";
import { begin, finish } from "../lib/connections/oauth";
import { disconnect } from "../lib/connections/store";
import { listFiles, importFile } from "../lib/connections/files";
import { services, type FileService } from "../lib/connections/config";
const ids = [randomUUID(), randomUUID()];
Object.assign(process.env, {
  GOOGLE_CLIENT_ID: "fixture",
  GOOGLE_CLIENT_SECRET: "fixture",
  MICROSOFT_CLIENT_ID: "fixture",
  MICROSOFT_CLIENT_SECRET: "fixture",
  GOOGLE_CONNECTIONS_REDIRECT_URI:
    "http://localhost:3001/api/connections/callback",
  MICROSOFT_CONNECTIONS_REDIRECT_URI:
    "http://localhost:3001/api/connections/callback",
  GMAIL_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString("base64"),
  SESSION_SECRET: "fixture-files-secret",
});
let current: FileService = "google-drive",
  downloads = 0,
  changed = false,
  reads = 0,
  evil = false;
const original = globalThis.fetch;
const file = () => ({
  id: "fictional-file",
  name: "fictional-policy.txt",
  mimeType: "text/plain",
  file: { mimeType: "text/plain" },
  size: 60,
  version: changed && reads > 1 ? "2" : "1",
  eTag: changed && reads > 1 ? "2" : "1",
});
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.endsWith("/token"))
    return Response.json({
      access_token: "fake-access",
      refresh_token: "fake-refresh",
      scope: services[current].scope,
    });
  if (url.includes("/userinfo"))
    return Response.json({
      sub: "fake-user",
      email: "fictional@example.com",
      email_verified: true,
    });
  if (url.includes("/me?$select"))
    return Response.json({ id: "fake-user", mail: "fictional@example.com" });
  if (url.includes("/files?") || url.includes("/children"))
    return Response.json(
      current === "google-drive"
        ? { files: [file()], nextPageToken: "next-fixture" }
        : {
            value: [file()],
            "@odata.nextLink": evil
              ? "https://evil.example/steal"
              : "https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=fixture",
          },
    );
  if (url.includes("alt=media")) {
    downloads++;
    return new Response(
      "Fictional Northstar policy: eligible expenses require HR review.",
    );
  }
  if (url.endsWith("/content"))
    return new Response(null, {
      status: 302,
      headers: {
        location: evil
          ? "https://evil.example/file"
          : "https://fictional.sharepoint.com/file",
      },
    });
  if (url === "https://fictional.sharepoint.com/file") {
    assert.equal(init?.headers, undefined);
    downloads++;
    return new Response(
      "Fictional Northstar policy: eligible expenses require HR review.",
    );
  }
  if (url.includes("/fictional-file?")) {
    reads++;
    return Response.json(file());
  }
  throw new Error("Unexpected provider request in file smoke.");
};
try {
  for (const id of ids) {
    await getWorkspace(id);
    await mutate(id, (w) => {
      w.demo = false;
      w.documents = [];
      w.agent = { enabled: false };
    });
  }
  for (const service of ["google-drive", "microsoft-drive"] as const) {
    current = service;
    reads = 0;
    changed = false;
    evil = false;
    const state = new URL(await begin(ids[0], service)).searchParams.get(
      "state",
    )!;
    await assert.rejects(finish(ids[1], state, "fake"));
    await finish(ids[0], state, "fake");
    await assert.rejects(finish(ids[0], state, "fake"));
    const listed = await listFiles(ids[0], service, {});
    assert.equal(listed.files.length, 1);
    assert.ok(listed.cursor);
    assert.equal(downloads, service === "google-drive" ? 0 : 2);
    await listFiles(ids[0], service, { cursor: listed.cursor });
    const input = {
      selection: listed.files[0].selection,
      employer: "previous",
      kind: "policy",
      confirmed: true,
    };
    await assert.rejects(importFile(ids[1], service, input));
    await assert.rejects(
      importFile(ids[0], service, { ...input, confirmed: false }),
    );
    if (service === "microsoft-drive") {
      evil = true;
      await assert.rejects(listFiles(ids[0], service, {}));
      await assert.rejects(importFile(ids[0], service, input));
      evil = false;
    }
    const before = downloads;
    const w = await importFile(ids[0], service, input);
    assert.equal(downloads, before + 1);
    assert.ok(w.documents.some((d) => d.cloudSource?.service === service));
    assert.match(w.documents.at(-1)!.pages[0], /Fictional/);
    await importFile(ids[0], service, input);
    assert.equal(downloads, before + 1);
    await mutate(ids[0], (w) => {
      w.documents = [];
    });
    reads = 0;
    changed = true;
    await assert.rejects(importFile(ids[0], service, input), /changed/);
    assert.equal((await getWorkspace(ids[0])).documents.length, 0);
    changed = false;
    await disconnect(ids[0], service);
    const fresh = new URL(await begin(ids[0], service)).searchParams.get(
      "state",
    )!;
    await finish(ids[0], fresh, "fake");
    await assert.rejects(
      listFiles(ids[0], service, { cursor: listed.cursor }),
      /refresh/,
    );
    await assert.rejects(importFile(ids[0], service, input), /refresh/);
    await disconnect(ids[0], service);
  }
  console.log(
    "File smoke passed: OAuth isolation, selected-only download, signed pagination, redirect fencing, exact versions, duplicate suppression, changed-file rejection and reconnect fencing. All provider HTTP mocked.",
  );
} finally {
  globalThis.fetch = original;
  await pool.query(
    "DELETE FROM jobswitch_workspaces WHERE id=ANY($1::uuid[])",
    [ids],
  );
  await pool.end();
}
