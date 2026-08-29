import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Ban, CheckCircle2, Eye, KeyRound, RefreshCw, Shield, ShieldOff, Trash2, UserPlus, Users as UsersIcon } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { AdminUser, Role, User } from "../../lib/types";
import { cn, formatDate, timeAgo } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Avatar, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Spinner } from "../../components/ui";
import { CorePageHeader } from "../components/CorePageHeader";
import { CoreTable, CoreTd, CoreTh, CoreTr } from "../components/CoreTable";
import { CoreIconButton, CorePagination, CoreSearch, CoreSegmented } from "../components/CoreControls";
import { RolePill, UserStatusPill } from "../components/CoreStatus";

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

type RoleFilter = "" | "learner" | "admin";
type PendingAction = { kind: "role" | "status" | "delete"; user: AdminUser };

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "learner", label: "Learners" },
  { value: "admin", label: "Admins" },
];

export default function Users() {
  usePageTitle("Admin users");
  const { user: me } = useAuth();
  const toast = useToast();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: debouncedQ, role, page: String(page) });
      setData(await api.get<UsersResponse>(`/admin/users?${params.toString()}`));
    } catch (err) {
      setError(errorMessage(err, "Could not load users"));
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  const replaceUser = (updated: User) => {
    setData((d) => (d ? { ...d, users: d.users.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)) } : d));
  };

  const patchUser = async (target: AdminUser, body: Record<string, unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await api.patch<{ user: User }>(`/admin/users/${target.id}`, body);
      replaceUser(res.user);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error("Action failed", errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const runPending = async () => {
    if (!pending) return;
    const { kind, user } = pending;
    if (kind === "role") {
      const next: Role = user.role === "admin" ? "learner" : "admin";
      const ok = await patchUser(user, { role: next }, `${user.name} is now ${next === "admin" ? "an admin" : "a learner"}`);
      if (ok) setPending(null);
      return;
    }
    if (kind === "status") {
      const next = user.status === "banned" ? "active" : "banned";
      const ok = await patchUser(user, { status: next }, next === "banned" ? `${user.name} has been suspended` : `${user.name} can sign in again`);
      if (ok) setPending(null);
      return;
    }
    setBusy(true);
    try {
      await api.del(`/admin/users/${user.id}`);
      toast.success("User deleted", `${user.name} and their progress were removed.`);
      setPending(null);
      load();
    } catch (err) {
      toast.error("Could not delete user", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pendingCopy = (() => {
    if (!pending) return { title: "", message: "", confirmLabel: "Confirm", danger: false };
    const { kind, user } = pending;
    if (kind === "role")
      return user.role === "admin"
        ? { title: `Demote ${user.name} to learner?`, message: "They will lose access to the admin panel immediately. Their progress and account remain intact.", confirmLabel: "Make learner", danger: true }
        : { title: `Make ${user.name} an admin?`, message: "Admins can edit all content, manage users and change site settings. Only promote people you trust.", confirmLabel: "Make admin", danger: false };
    if (kind === "status")
      return user.status === "banned"
        ? { title: `Restore access for ${user.name}?`, message: "They will be able to log in and continue learning right away.", confirmLabel: "Unban", danger: false }
        : { title: `Suspend ${user.name}?`, message: "They will be logged out and unable to sign in until you restore access. Their progress is kept.", confirmLabel: "Ban user", danger: true };
    return { title: `Delete ${user.name}?`, message: "This permanently removes the account, XP, badges and lesson progress. This cannot be undone.", confirmLabel: "Delete user", danger: true };
  })();

  const users = data?.users ?? [];

  return (
    <div>
      <CorePageHeader
        eyebrow="People"
        title="Users"
        subtitle={data ? `${data.total.toLocaleString()} account${data.total === 1 ? "" : "s"} on the platform.` : "Manage learners and administrators."}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus size={14} /> Add user
            </Button>
          </>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <CoreSearch value={q} onChange={setQ} placeholder="Search by name or email" className="w-full md:max-w-sm" />
        <CoreSegmented
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
        />
      </div>

      {error && (
        <Alert type="error" className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={load}>
            Try again
          </Button>
        </Alert>
      )}

      {loading && !data ? (
        <Spinner label="Loading users" />
      ) : users.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<UsersIcon size={26} />}
            title={debouncedQ || role ? "No users match" : "No users yet"}
            description={debouncedQ || role ? "Try a different search or clear the role filter." : "Create the first account to get started."}
            action={
              debouncedQ || role ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQ("");
                    setRole("");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setAddOpen(true)}>
                  <UserPlus size={14} /> Add user
                </Button>
              )
            }
          />
        </div>
      ) : (
        <CoreTable className={cn(loading && "opacity-60 pointer-events-none")} footer={data && <CorePagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}>
          <thead>
            <tr>
              <CoreTh>User</CoreTh>
              <CoreTh>Role</CoreTh>
              <CoreTh>Status</CoreTh>
              <CoreTh>Goal / level</CoreTh>
              <CoreTh className="text-right">Lessons</CoreTh>
              <CoreTh className="text-right">XP</CoreTh>
              <CoreTh>Joined</CoreTh>
              <CoreTh>Last login</CoreTh>
              <CoreTh className="text-right">Actions</CoreTh>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = me?.id === u.id;
              return (
                <CoreTr key={u.id}>
                  <CoreTd>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <Avatar name={u.name} color={u.avatarColor} size="sm" />
                      <div className="min-w-0">
                        <Link to={`/admin/users/${u.id}`} className="block font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate">
                          {u.name}
                          {isMe && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">you</span>}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                      </div>
                    </div>
                  </CoreTd>
                  <CoreTd>
                    <RolePill role={u.role} />
                  </CoreTd>
                  <CoreTd>
                    <UserStatusPill status={u.status} />
                  </CoreTd>
                  <CoreTd>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{u.goal || "-"}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{u.level || "-"}</div>
                  </CoreTd>
                  <CoreTd className="text-right tabular-nums">{u.lessonsDone}</CoreTd>
                  <CoreTd className="text-right tabular-nums font-black text-blue-600 dark:text-blue-400">{u.xp.toLocaleString()}</CoreTd>
                  <CoreTd className="whitespace-nowrap text-xs">{formatDate(u.createdAt, { year: "numeric", month: "short", day: "numeric" })}</CoreTd>
                  <CoreTd className="whitespace-nowrap text-xs" title={u.lastLoginAt ?? undefined}>
                    {u.lastLoginAt ? timeAgo(u.lastLoginAt) : <span className="text-slate-400">Never</span>}
                  </CoreTd>
                  <CoreTd>
                    <div className="flex items-center justify-end gap-0.5">
                      <CoreIconButton title="View profile" to={`/admin/users/${u.id}`} tone="primary">
                        <Eye size={16} />
                      </CoreIconButton>
                      <CoreIconButton title={u.role === "admin" ? "Make learner" : "Make admin"} disabled={isMe || busy} onClick={() => setPending({ kind: "role", user: u })}>
                        {u.role === "admin" ? <ShieldOff size={16} /> : <Shield size={16} />}
                      </CoreIconButton>
                      <CoreIconButton title={u.status === "banned" ? "Unban user" : "Ban user"} tone={u.status === "banned" ? "success" : "danger"} disabled={isMe || busy} onClick={() => setPending({ kind: "status", user: u })}>
                        {u.status === "banned" ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                      </CoreIconButton>
                      <CoreIconButton title="Reset password" disabled={busy} onClick={() => setResetTarget(u)}>
                        <KeyRound size={16} />
                      </CoreIconButton>
                      <CoreIconButton title="Delete user" tone="danger" disabled={isMe || busy} onClick={() => setPending({ kind: "delete", user: u })}>
                        <Trash2 size={16} />
                      </CoreIconButton>
                    </div>
                  </CoreTd>
                </CoreTr>
              );
            })}
          </tbody>
        </CoreTable>
      )}

      <ConfirmDialog open={!!pending} onCancel={() => !busy && setPending(null)} onConfirm={runPending} title={pendingCopy.title} message={pendingCopy.message} confirmLabel={pendingCopy.confirmLabel} danger={pendingCopy.danger} loading={busy} />

      <ResetPasswordModal
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onSubmit={async (password) => {
          if (!resetTarget) return false;
          return patchUser(resetTarget, { newPassword: password }, `Password updated for ${resetTarget.name}`);
        }}
      />

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(created) => {
          toast.success("User created", `${created.name} can now sign in.`);
          setAddOpen(false);
          load();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------- Reset password */
function ResetPasswordModal({ user, onClose, onSubmit }: { user: AdminUser | null; onClose: () => void; onSubmit: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }, [user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setError(null);
    setBusy(true);
    const ok = await onSubmit(password);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal open={!!user} onClose={() => !busy && onClose()} title="Reset password" size="sm">
      {user && (
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <Avatar name={user.name} color={user.avatarColor} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 dark:text-white truncate">{user.name}</div>
              <div className="text-xs text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
          {error && <Alert type="error">{error}</Alert>}
          <Field label="New password" hint="At least 6 characters. Share it with the user through a secure channel.">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={6} autoFocus />
          </Field>
          <Field label="Confirm password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={6} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              <KeyRound size={14} /> Update password
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------- Add user */
function AddUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (user: User) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("learner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("learner");
      setError(null);
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>("/admin/users", { name: name.trim(), email: email.trim(), password, role });
      onCreated(res.user);
    } catch (err) {
      setError(errorMessage(err, "Could not create user"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Add user" size="sm">
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" required minLength={2} maxLength={80} autoFocus />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" required />
        </Field>
        <Field label="Password" hint="At least 6 characters.">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={6} />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="learner">Learner</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            <UserPlus size={14} /> Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
