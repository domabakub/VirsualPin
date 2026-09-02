"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { importQuickTakes, listQuickTakes } from "@/lib/takes/storage";

type TokenResponse = { access_token?: string; error?: string };
type TokenClient = { requestAccessToken(options?: { prompt?: string }): void };

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(options: { client_id: string; scope: string; callback(response: TokenResponse): void }): TokenClient;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const BACKUP_NAME = "virtual-phin-quick-takes-v1.json";

async function driveFetch(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers },
  });
  if (!response.ok) throw new Error(`Google Drive ตอบกลับ ${response.status}`);
  return response;
}

async function findBackup(accessToken: string) {
  const query = encodeURIComponent(`name='${BACKUP_NAME.replaceAll("'", "\\'")}' and trashed=false`);
  const response = await driveFetch(`/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)&pageSize=1`, accessToken);
  const value = await response.json() as { files?: Array<{ id: string; modifiedTime?: string }> };
  return value.files?.[0] ?? null;
}

export function GoogleDriveBackup({ onRestore }: { onRestore(): void | Promise<void> }) {
  const [scriptReady, setScriptReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [message, setMessage] = useState("ข้อมูลยังอยู่เฉพาะอุปกรณ์นี้");
  const tokenClientRef = useRef<TokenClient | null>(null);

  const connect = () => {
    if (!CLIENT_ID || !window.google) return;
    tokenClientRef.current ??= window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.appdata",
      callback: response => {
        if (response.error || !response.access_token) { setMessage("เชื่อม Google Drive ไม่สำเร็จ"); return; }
        setAccessToken(response.access_token);
        setMessage("เชื่อม Google Drive แล้ว · กดสำรองหรือกู้คืนได้");
      },
    });
    tokenClientRef.current.requestAccessToken({ prompt: "consent" });
  };

  const backup = async () => {
    if (!accessToken) return;
    setBusy("backup");
    try {
      const takes = await listQuickTakes();
      const payload = JSON.stringify({ version: 1, exportedAt: Date.now(), takes });
      const existing = await findBackup(accessToken);
      let fileId = existing?.id;
      if (!fileId) {
        const created = await driveFetch("/drive/v3/files?fields=id", accessToken, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: BACKUP_NAME, mimeType: "application/json", parents: ["appDataFolder"] }),
        });
        fileId = (await created.json() as { id: string }).id;
      }
      await driveFetch(`/upload/drive/v3/files/${fileId}?uploadType=media`, accessToken, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: payload });
      setMessage(`สำรองแล้ว · ${takes.length} บันทึก`);
    } catch (reason) {
      console.error("Google Drive backup failed", reason);
      setMessage("สำรองไม่สำเร็จ · ลองเชื่อม Drive ใหม่");
    } finally { setBusy(null); }
  };

  const restore = async () => {
    if (!accessToken) return;
    setBusy("restore");
    try {
      const existing = await findBackup(accessToken);
      if (!existing) { setMessage("ยังไม่พบข้อมูลสำรองใน Google Drive"); return; }
      const response = await driveFetch(`/drive/v3/files/${existing.id}?alt=media`, accessToken);
      const value = await response.json() as { version?: number; takes?: unknown };
      if (value.version !== 1) throw new Error("Unsupported backup version");
      const count = await importQuickTakes(value.takes);
      await onRestore();
      setMessage(`กู้คืนแล้ว · ${count} บันทึก`);
    } catch (reason) {
      console.error("Google Drive restore failed", reason);
      setMessage("กู้คืนไม่สำเร็จ · ข้อมูลบนเครื่องยังไม่ถูกลบ");
    } finally { setBusy(null); }
  };

  return <section className="drive-backup" aria-label="สำรองข้อมูลด้วย Google Drive">
    {CLIENT_ID && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />}
    <div><strong>Local-first</strong><p>{message}</p></div>
    {!CLIENT_ID ? <span className="drive-not-configured">Google Sync ยังไม่ถูกตั้งค่า</span> : !accessToken ? <button type="button" className="ui-button" disabled={!scriptReady} onClick={connect}>{scriptReady ? "เชื่อม Google Drive" : "กำลังเตรียม Google…"}</button> : <div className="drive-actions"><button type="button" className="ui-button ui-primary" disabled={Boolean(busy)} onClick={() => { void backup(); }}>{busy === "backup" ? "กำลังสำรอง…" : "สำรองตอนนี้"}</button><button type="button" className="ui-button" disabled={Boolean(busy)} onClick={() => { void restore(); }}>{busy === "restore" ? "กำลังกู้คืน…" : "กู้คืน"}</button></div>}
  </section>;
}

