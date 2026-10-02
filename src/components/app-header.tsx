"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

export function AppHeader({
  name,
  image,
  isAdmin,
}: {
  name?: string | null;
  image?: string | null;
  isAdmin?: boolean;
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          English<span className="text-brand">Course</span>
        </Link>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-brand"
            >
              Admin
            </Link>
          )}

          <div className="hidden items-center gap-2 sm:flex">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={name ?? "Usuário"}
                className="h-8 w-8 rounded-full"
              />
            ) : null}
            <span className="text-sm text-muted">{name}</span>
          </div>

          <button
            type="button"
            onClick={() => void signOut({ redirectTo: "/" })}
            className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-danger hover:text-danger"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
