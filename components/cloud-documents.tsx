"use client";
import { useEffect, useState } from "react";
import { CloudDownload, Folder, FileText, Link2 } from "lucide-react";
import type { Workspace } from "@/lib/types";
import type { FileService } from "@/lib/connections/config";
import type { CloudFile } from "@/lib/connections/files";
type Status = {
  configured: boolean;
  connected: boolean;
  email?: string;
  status?: string;
};
const labels = {
  "google-drive": "Google Drive",
  "microsoft-drive": "OneDrive",
};
export default function CloudDocuments({
  w,
  onUpdate,
}: {
  w: Workspace;
  onUpdate: (w: Workspace) => void;
}) {
  const [service, setService] = useState<FileService>("google-drive");
  return (
    <details className="cloud-documents">
      <summary>
        <CloudDownload size={19} /> Import from cloud storage
      </summary>
      <p>
        Choose a document to add to your evidence. Files stay unchanged in your
        drive.
      </p>
      <label>
        File service
        <select
          value={service}
          onChange={(e) => setService(e.target.value as FileService)}
        >
          <option value="google-drive">Google Drive</option>
          <option value="microsoft-drive">OneDrive</option>
        </select>
      </label>
      <CloudPicker key={service} service={service} w={w} onUpdate={onUpdate} />
    </details>
  );
}
function CloudPicker({
  service,
  w,
  onUpdate,
}: {
  service: FileService;
  w: Workspace;
  onUpdate: (w: Workspace) => void;
}) {
  const [state, setState] = useState<Status>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [files, setFiles] = useState<CloudFile[]>(),
    [cursor, setCursor] = useState<string>(),
    [path, setPath] = useState<{ id: string; name: string }[]>([]),
    [selected, setSelected] = useState<CloudFile>();
  const [employer, setEmployer] = useState("previous"),
    [kind, setKind] = useState("policy"),
    [confirmed, setConfirmed] = useState(false);
  const label = labels[service];
  async function status() {
    const r = await fetch(`/api/connections/${service}`);
    if (!r.ok)
      throw new Error(
        "Connection status unavailable. Reopen My documents to retry.",
      );
    setState(await r.json());
  }
  useEffect(() => {
    status().catch((e) => setNotice(e.message));
  }, [service]);
  async function post(action: string, data?: unknown) {
    const fileAction = ["list", "import"].includes(action);
    const r = await fetch(
      `/api/connections/${service}${fileAction ? "/files" : ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      },
    );
    const v = await r.json();
    if (!r.ok) throw new Error(v.error || "Please try again.");
    return v;
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function browse(nextPath: typeof path, nextCursor?: string) {
    const r = await post("list", {
      folder: nextPath.at(-1)?.id,
      cursor: nextCursor,
    });
    setFiles(r.files);
    setCursor(r.cursor);
    setPath(nextPath);
    setSelected(undefined);
    setConfirmed(false);
  }
  return (
    <div className="cloud-picker" aria-label={`${label} import`}>
      <p className="muted">
        {service === "google-drive"
          ? "Google requests permission to view and download all your Drive files."
          : "Microsoft requests permission to read your OneDrive files."}{" "}
        JobSwitch browses file names and downloads only the document you
        confirm. It never edits your drive or sends document contents to public
        web search.
      </p>
      {notice && <p role="status">{notice}</p>}
      {!state ? (
        <p>Loading connection…</p>
      ) : !state.configured ? (
        <p>{label} is awaiting setup.</p>
      ) : w.demo ? (
        <p>
          Start a personal workspace in Settings before connecting your files.
        </p>
      ) : (
        <>
          <p>
            {state.connected
              ? `Connected: ${state.email}`
              : state.status === "reconnect"
                ? "Access expired. Disconnect, then connect again."
                : `${label} is not connected.`}
          </p>
          {!state.connected && state.status !== "reconnect" && (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const r = await post("connect");
                  if (
                    ![
                      "https://accounts.google.com",
                      "https://login.microsoftonline.com",
                    ].includes(new URL(r.url).origin)
                  )
                    throw new Error("Invalid sign-in destination.");
                  window.location.assign(r.url);
                })
              }
            >
              <Link2 size={16} /> Connect {label}
            </button>
          )}
          {state.status && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await post("disconnect");
                  setFiles(undefined);
                  setSelected(undefined);
                  setConfirmed(false);
                  await status();
                  setNotice(
                    "Disconnected. Imported evidence remains in your workspace.",
                  );
                })
              }
            >
              Disconnect {label}
            </button>
          )}
          {state.connected && (
            <>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => run(() => browse([]))}
              >
                Browse {label}
              </button>
              <p className="muted">
                PDF, TXT and Markdown, up to 4 MB and 40 pages.
                {service === "google-drive"
                  ? " Google Docs are imported as PDF pages."
                  : ""}{" "}
                Other formats can be exported to PDF and uploaded. Shared
                shortcuts and team libraries are excluded.
              </p>
              {files && (
                <>
                  <nav className="cloud-path" aria-label="Cloud folder">
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => run(() => browse([]))}
                    >
                      My drive
                    </button>
                    {path.map((p, i) => (
                      <button
                        key={p.id}
                        className="secondary"
                        disabled={busy}
                        onClick={() => run(() => browse(path.slice(0, i + 1)))}
                      >
                        {p.name}
                      </button>
                    ))}
                  </nav>
                  <ul className="cloud-file-list">
                    {files.map((f) => (
                      <li key={f.id}>
                        <button
                          className="cloud-file"
                          disabled={busy || (!f.folder && !f.supported)}
                          onClick={() =>
                            f.folder
                              ? run(() =>
                                  browse([...path, { id: f.id, name: f.name }]),
                                )
                              : (setSelected(f), setConfirmed(false))
                          }
                        >
                          {f.folder ? (
                            <Folder size={18} />
                          ) : (
                            <FileText size={18} />
                          )}
                          <span>
                            {f.name}
                            <small>
                              {f.folder
                                ? "Folder"
                                : f.supported
                                  ? "Select to import"
                                  : "Unsupported type or file too large"}
                            </small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!files.length && <p>No files in this folder.</p>}
                  {cursor && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => run(() => browse(path, cursor))}
                    >
                      Next files
                    </button>
                  )}
                </>
              )}
              {selected && (
                <form
                  className="cloud-import-review"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      const result = await post("import", {
                        selection: selected.selection,
                        employer,
                        kind,
                        confirmed: true,
                      });
                      onUpdate(result);
                      setSelected(undefined);
                      setConfirmed(false);
                      setNotice(
                        "Document imported. Your agent will update the board.",
                      );
                    });
                  }}
                >
                  <h3>Import {selected.name}</h3>
                  <p>
                    From {label} · {state.email}. This saves a copy of its
                    readable text in this workspace and lets your agent analyze
                    it. Later edits in your drive do not update this copy.
                  </p>
                  <div className="cloud-categories">
                    <label>
                      Belongs to
                      <select
                        disabled={busy}
                        value={employer}
                        onChange={(e) => {
                          setEmployer(e.target.value);
                          setConfirmed(false);
                        }}
                      >
                        <option value="previous">Previous employer</option>
                        <option value="next">New employer</option>
                        <option value="personal">Personal</option>
                      </select>
                    </label>
                    <label>
                      Document type
                      <select
                        disabled={busy}
                        value={kind}
                        onChange={(e) => {
                          setKind(e.target.value);
                          setConfirmed(false);
                        }}
                      >
                        <option value="policy">Policy</option>
                        <option value="receipt">Receipt</option>
                        <option value="certificate">Certificate</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>
                  <label className="cloud-confirm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={busy}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    I want JobSwitch to store and analyze this document.
                  </label>
                  <button className="primary" disabled={busy || !confirmed}>
                    {busy ? "Importing…" : "Import selected document"}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => setSelected(undefined)}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
