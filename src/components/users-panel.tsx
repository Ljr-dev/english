"use client";

import { useCallback, useEffect, useState } from "react";

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  active: boolean;
  createdAt: string;
  attempts: number;
};

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    if (response.ok) {
      const data = (await response.json()) as { users: AdminUser[] };
      setUsers(data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/admin/users");
      if (cancelled) return;
      if (response.ok) {
        const data = (await response.json()) as { users: AdminUser[] };
        setUsers(data.users);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: name || undefined, password, role }),
    });
    const result = (await response.json()) as { error?: string };

    if (response.ok) {
      setMessage(`Usuário ${email} criado.`);
      setEmail("");
      setName("");
      setPassword("");
      setRole("USER");
      await reload();
    } else {
      setMessage(result.error ?? "Erro ao criar usuário.");
    }
    setBusy(false);
  }

  async function updateUser(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const result = (await response.json()) as { error?: string };

    setMessage(response.ok ? "Usuário atualizado." : result.error ?? "Erro.");
    await reload();
    setBusy(false);
  }

  async function resetPassword(user: AdminUser) {
    const newPassword = window.prompt(
      `Nova senha para ${user.email}:`,
      "",
    );
    if (!newPassword) return;
    if (newPassword.length < 6) {
      setMessage("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    await updateUser(user.id, { password: newPassword });
  }

  async function removeUser(user: AdminUser) {
    if (!window.confirm(`Excluir ${user.email}? O progresso será apagado.`)) {
      return;
    }
    setBusy(true);
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Usuário excluído." : result.error ?? "Erro.");
    await reload();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Cadastrar novo usuário</h2>
        <form
          onSubmit={createUser}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-brand"
          />
          <input
            type="text"
            placeholder="Nome (opcional)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-brand"
          />
          <input
            type="text"
            required
            minLength={6}
            placeholder="Senha (mín. 6)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-brand"
          />
          <div className="flex gap-3">
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "USER" | "ADMIN")
              }
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none transition focus:border-brand"
            >
              <option value="USER">Aluno</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Criar
            </button>
          </div>
        </form>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Respostas</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{user.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${
                      user.role === "ADMIN"
                        ? "bg-brand-soft text-brand"
                        : "bg-border text-muted"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${
                      user.active
                        ? "bg-success-soft text-success"
                        : "bg-danger-soft text-danger"
                    }`}
                  >
                    {user.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{user.attempts}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void resetPassword(user)}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs transition hover:border-brand disabled:opacity-50"
                    >
                      Trocar senha
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void updateUser(user.id, {
                          role: user.role === "ADMIN" ? "USER" : "ADMIN",
                        })
                      }
                      className="rounded-lg border border-border px-2.5 py-1 text-xs transition hover:border-brand disabled:opacity-50"
                    >
                      {user.role === "ADMIN" ? "Tornar aluno" : "Tornar admin"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void updateUser(user.id, { active: !user.active })
                      }
                      className="rounded-lg border border-border px-2.5 py-1 text-xs transition hover:border-brand disabled:opacity-50"
                    >
                      {user.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeUser(user)}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs transition hover:border-danger hover:text-danger disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
