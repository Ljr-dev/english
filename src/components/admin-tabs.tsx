"use client";

import { useState } from "react";

export function AdminTabs({
  sentences,
  users,
}: {
  sentences: React.ReactNode;
  users: React.ReactNode;
}) {
  const [tab, setTab] = useState<"sentences" | "users">("sentences");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 border-b border-border">
        <TabButton
          active={tab === "sentences"}
          onClick={() => setTab("sentences")}
        >
          Frases
        </TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          Usuários
        </TabButton>
      </div>

      {tab === "sentences" ? sentences : users}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-brand text-brand"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
