import { useEffect, useState } from 'react';

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface AdminAuditLogRecord {
  id: number;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
  actor: {
    id: string | null;
    email: string | null;
    name: string | null;
  };
}

export interface AdminBindingMismatchRecord {
  tag_id: string;
  web_id: string;
  expected_web_id_hash: string;
  board_web_id_hash: string | null;
  board_lock_state: string;
  mismatch_state: 'matched' | 'backend_only' | 'board_only' | 'mismatch';
  board_synced_at: string | null;
  updated_at: string;
  owner: {
    user_id: string;
    email: string;
    name: string;
  };
}

interface UseAdminToolsParams {
  authToken: string;
  backendBase: string;
  currentUserRole: 'user' | 'admin';
  authorizedFetch: (input: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => Promise<void>;
  setMessage: (message: string) => void;
}

export function useAdminTools(params: UseAdminToolsParams) {
  const { authToken, backendBase, currentUserRole, authorizedFetch, onUnauthorized, setMessage } = params;
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);
  const [bindingMismatches, setBindingMismatches] = useState<AdminBindingMismatchRecord[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
    const res = await authorizedFetch(`${backendBase.trim()}${path}`, init);
    if (res.status === 401) {
      await onUnauthorized();
      return null;
    }
    if (res.status === 403) {
      setMessage('บัญชีนี้ยังไม่มีสิทธิ์เข้าเมนูแอดมิน');
      return null;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(data?.message ?? 'admin_request_failed');
    }

    return (await res.json()) as T;
  }

  async function loadAdminData() {
    if (!authToken || currentUserRole !== 'admin' || !backendBase.trim()) {
      setAdminUsers([]);
      setAuditLogs([]);
      setBindingMismatches([]);
      return;
    }

    setAdminLoading(true);
    try {
      const [users, logs, mismatches] = await Promise.all([
        fetchJson<AdminUserRecord[]>('/api/admin/users'),
        fetchJson<AdminAuditLogRecord[]>('/api/admin/audit-logs'),
        fetchJson<AdminBindingMismatchRecord[]>('/api/admin/binding-mismatches'),
      ]);

      setAdminUsers(users ?? []);
      setAuditLogs(logs ?? []);
      setBindingMismatches(mismatches ?? []);
    } catch {
      setMessage('โหลดข้อมูลแอดมินไม่สำเร็จ');
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, [authToken, backendBase, currentUserRole]);

  async function updateUserRole(userId: string, role: 'user' | 'admin') {
    try {
      const updated = await fetchJson<AdminUserRecord>(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!updated) return false;

      setAdminUsers((current) =>
        current.map((user) =>
          user.id === updated.id
            ? {
                ...user,
                role: updated.role,
                email: updated.email,
                name: updated.name,
              }
            : user,
        ),
      );

      void loadAdminData();
      setMessage(`อัปเดตสิทธิ์ของ ${updated.email} เป็น ${role} แล้ว`);
      return true;
    } catch {
      setMessage('อัปเดต role ไม่สำเร็จ');
      return false;
    }
  }

  async function deleteUser(userId: string) {
    try {
      const deleted = await fetchJson<AdminUserRecord>(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      if (!deleted) return false;

      setAdminUsers((current) => current.filter((user) => user.id !== deleted.id));
      void loadAdminData();
      setMessage(`ลบผู้ใช้ ${deleted.email} แล้ว`);
      return true;
    } catch {
      setMessage('ลบผู้ใช้ไม่สำเร็จ');
      return false;
    }
  }

  async function clearTagState(tagId: string) {
    try {
      const result = await fetchJson<{ ok: true; tag_id: string }>('/api/admin/cleanup/tag-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
      if (!result) return false;

      setBindingMismatches((current) => current.filter((item) => item.tag_id !== tagId));
      void loadAdminData();
      setMessage(`ล้างสถานะของ ${tagId} แล้ว`);
      return true;
    } catch {
      setMessage('ล้างสถานะแท็กไม่สำเร็จ');
      return false;
    }
  }

  return {
    adminUsers,
    auditLogs,
    bindingMismatches,
    adminLoading,
    loadAdminData,
    updateUserRole,
    deleteUser,
    clearTagState,
  };
}
