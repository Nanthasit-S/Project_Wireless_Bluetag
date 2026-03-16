import { useEffect, useState } from 'react';
import type { TagBindingAccessRecord, TagBindingRecord, WebIdRecord, WebIdTagOverview } from '../../types/bluetag';

interface UseWebBindingsParams {
  authToken: string;
  backendBase: string;
  currentUserName: string;
  currentUserEmail: string;
  authorizedFetch: (input: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => Promise<void>;
  setMessage: (message: string) => void;
}

function slugifyConnectionName(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/-+/g, '-')
    .toUpperCase();

  return slug || 'USER';
}

function hashConnectionSeed(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(36).toUpperCase().padStart(10, '0').slice(-10);
}

function buildDefaultWebId(currentUserName: string, currentUserEmail: string) {
  const rawName = currentUserName.trim();
  const emailLocal = currentUserEmail.trim().split('@')[0] || '';
  const safeName = slugifyConnectionName(rawName || emailLocal);
  const seed = `${currentUserEmail.trim().toLowerCase()}|${rawName.toLowerCase()}`;
  const suffix = hashConnectionSeed(seed || safeName);
  return `BLUETAG-${safeName}-${suffix}`;
}

export function useWebBindings({
  authToken,
  backendBase,
  currentUserName,
  currentUserEmail,
  authorizedFetch,
  onUnauthorized,
  setMessage,
}: UseWebBindingsParams) {
  const [selectedWebId, setSelectedWebId] = useState('');
  const [tagBindings, setTagBindings] = useState<Record<string, string>>({});
  const [selectedWebIdOverview, setSelectedWebIdOverview] = useState<WebIdTagOverview[]>([]);

  async function ensureDefaultWebId() {
    const base = backendBase.trim();
    if (!authToken || !base) return null;
    if (!currentUserName.trim() && !currentUserEmail.trim()) return null;

    const defaultWebId = buildDefaultWebId(currentUserName, currentUserEmail);
    const createRes = await authorizedFetch(`${base}/api/web-ids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ web_id: defaultWebId }),
    });

    if (createRes.status === 401) {
      await onUnauthorized();
      return null;
    }

    if (!createRes.ok) {
      const data = (await createRes.json().catch(() => null)) as { message?: string } | null;
      throw new Error(data?.message ?? 'สร้างรหัสเชื่อมต่ออัตโนมัติไม่สำเร็จ');
    }

    return defaultWebId;
  }

  async function loadBindingsData(options?: { preserveSelection?: boolean }) {
    if (!authToken) return;
    const base = backendBase.trim();
    if (!base) return;

    const [webIdsRes, bindingsRes] = await Promise.all([authorizedFetch(`${base}/api/web-ids`), authorizedFetch(`${base}/api/bindings`)]);

    if (webIdsRes.status === 401 || bindingsRes.status === 401) {
      await onUnauthorized();
      return;
    }

    if (!webIdsRes.ok || !bindingsRes.ok) {
      throw new Error('โหลดข้อมูลรหัสเชื่อมต่อไม่สำเร็จ');
    }

    let webIdRows = (await webIdsRes.json()) as WebIdRecord[];
    const bindingRows = (await bindingsRes.json()) as TagBindingRecord[];

    if (webIdRows.length === 0) {
      const createdWebId = await ensureDefaultWebId();
      if (createdWebId) {
        webIdRows = [{ web_id: createdWebId, created_at: new Date().toISOString() }];
      }
    }

    const nextWebIds = webIdRows.map((row) => row.web_id);
    const nextBindings = Object.fromEntries(bindingRows.map((row) => [row.tag_id, row.web_id]));

    setTagBindings(nextBindings);
    setSelectedWebId((prev) => {
      if (options?.preserveSelection && prev && nextWebIds.includes(prev)) return prev;
      if (prev && nextWebIds.includes(prev)) return prev;
      return nextWebIds[0] ?? '';
    });
  }

  async function loadSelectedWebIdOverview(webId: string) {
    if (!authToken || !webId) {
      setSelectedWebIdOverview([]);
      return;
    }

    const base = backendBase.trim();
    if (!base) {
      setSelectedWebIdOverview([]);
      return;
    }

    const res = await authorizedFetch(`${base}/api/web-ids/${encodeURIComponent(webId)}/tags`);
    if (res.status === 401) {
      await onUnauthorized();
      return;
    }
    if (res.status === 404) {
      setSelectedWebIdOverview([]);
      return;
    }
    if (!res.ok) {
      throw new Error('โหลดข้อมูลตำแหน่งของรหัสเชื่อมต่อไม่สำเร็จ');
    }

    const data = (await res.json()) as { web_id: string; tags: WebIdTagOverview[] };
    setSelectedWebIdOverview(data.tags);
  }

  useEffect(() => {
    if (authToken) return;
    setSelectedWebId('');
    setTagBindings({});
    setSelectedWebIdOverview([]);
  }, [authToken]);

  useEffect(() => {
    void loadSelectedWebIdOverview(selectedWebId).catch(() => {
      setMessage('โหลดข้อมูลตำแหน่งของรหัสเชื่อมต่อไม่สำเร็จ');
    });
  }, [authToken, backendBase, selectedWebId]);

  useEffect(() => {
    if (!authToken || !selectedWebId) return;

    const timer = setInterval(() => {
      void loadSelectedWebIdOverview(selectedWebId).catch(() => {
        setMessage('โหลดข้อมูลตำแหน่งของรหัสเชื่อมต่อไม่สำเร็จ');
      });
    }, 8000);

    return () => clearInterval(timer);
  }, [authToken, backendBase, selectedWebId]);

  useEffect(() => {
    void loadBindingsData({ preserveSelection: true }).catch(() => {
      setMessage('โหลดข้อมูลรหัสเชื่อมต่อไม่สำเร็จ');
    });
  }, [authToken, backendBase, currentUserEmail, currentUserName]);

  async function handleAssignTag(tagId: string, webId: string) {
    try {
      const res = await authorizedFetch(`${backendBase.trim()}/api/bindings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId, web_id: webId }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setMessage(data?.message ?? 'ผูก BlueTag ไม่สำเร็จ');
        return false;
      }
      await loadBindingsData({ preserveSelection: true });
      await loadSelectedWebIdOverview(webId);
      setMessage(`ผูก ${tagId} กับ ${webId} แล้ว`);
      return true;
    } catch {
      setMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      return false;
    }
  }

  async function handleUnassignTag(tagId: string) {
    try {
      const res = await authorizedFetch(`${backendBase.trim()}/api/bindings/${encodeURIComponent(tagId)}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setMessage(data?.message ?? 'ยกเลิกการผูกไม่สำเร็จ');
        return false;
      }
      await loadBindingsData({ preserveSelection: true });
      await loadSelectedWebIdOverview(selectedWebId);
      setMessage(`ยกเลิกการผูก ${tagId} แล้ว`);
      return true;
    } catch {
      setMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      return false;
    }
  }

  async function checkTagAccess(tagId: string) {
    try {
      const res = await authorizedFetch(`${backendBase.trim()}/api/bindings/${encodeURIComponent(tagId)}/access`);
      if (res.status === 401) {
        await onUnauthorized();
        return null;
      }
      if (!res.ok) {
        return null;
      }
      return (await res.json()) as TagBindingAccessRecord;
    } catch {
      return null;
    }
  }

  async function handleSyncBoardState(params: {
    tagId: string;
    webId: string;
    boardWebIdHash: string | null;
    boardLockState: 'locked' | 'unbound';
  }) {
    try {
      const res = await authorizedFetch(`${backendBase.trim()}/api/bindings/${encodeURIComponent(params.tagId)}/board-state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          web_id: params.webId,
          board_web_id_hash: params.boardWebIdHash,
          board_lock_state: params.boardLockState,
        }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setMessage(data?.message ?? 'ซิงก์สถานะบอร์ดไม่สำเร็จ');
        return false;
      }
      await loadBindingsData({ preserveSelection: true });
      return true;
    } catch {
      setMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      return false;
    }
  }

  async function handleTechnicianResetTag(tagId: string) {
    try {
      const res = await authorizedFetch(`${backendBase.trim()}/api/bindings/${encodeURIComponent(tagId)}/technician-reset`, {
        method: 'POST',
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setMessage(data?.message ?? 'ล้างสถานะบอร์ดฝั่งระบบไม่สำเร็จ');
        return false;
      }
      await loadBindingsData({ preserveSelection: true });
      await loadSelectedWebIdOverview(selectedWebId);
      setMessage(`technician reset ${tagId} แล้ว`);
      return true;
    } catch {
      setMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      return false;
    }
  }

  async function handleFactoryResetTag(tagId: string) {
    try {
      const res = await authorizedFetch(`${backendBase.trim()}/api/bindings/${encodeURIComponent(tagId)}/factory-reset`, {
        method: 'POST',
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (res.status === 401) {
        await onUnauthorized();
        return false;
      }
      if (!res.ok) {
        setMessage(data?.message ?? 'factory reset ไม่สำเร็จ');
        return false;
      }
      await loadBindingsData({ preserveSelection: true });
      await loadSelectedWebIdOverview(selectedWebId);
      setMessage(`factory reset ${tagId} แล้ว`);
      return true;
    } catch {
      setMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      return false;
    }
  }

  return {
    selectedWebId,
    tagBindings,
    selectedWebIdOverview,
    checkTagAccess,
    setSelectedWebId,
    loadBindingsData,
    loadSelectedWebIdOverview,
    handleAssignTag,
    handleUnassignTag,
    handleSyncBoardState,
    handleTechnicianResetTag,
    handleFactoryResetTag,
  };
}
