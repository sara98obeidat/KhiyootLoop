"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, EMAIL_STATUS_LABELS, type EmailStatus, type OrderStatus } from "@/lib/orders";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-quiet btn-small"
      onClick={async () => {
        await fetch("/api/founder/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

export function StatusControl({ orderId, status, reference }: { orderId: string; status: OrderStatus; reference: string }) {
  const router = useRouter();
  const [value, setValue] = useState<OrderStatus>(status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const id = `status-${orderId}`;
  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setMsg(null);
        try {
          const res = await fetch(`/api/founder/orders/${orderId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: value }),
          });
          const data = await res.json().catch(() => null);
          setMsg(res.ok && data?.ok ? `Saved: ${ORDER_STATUS_LABELS[value]}` : data?.message ?? "Could not save.");
          if (res.ok) router.refresh();
        } catch {
          setMsg("Could not reach the server.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={id} className="visually-hidden">Order status for {reference}</label>
      <select id={id} value={value} onChange={(e) => setValue(e.target.value as OrderStatus)}>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
        ))}
      </select>
      <button className="btn btn-primary btn-small" type="submit" disabled={busy || value === status}>
        {busy ? "Saving…" : "Update status"}
      </button>
      <span role="status" className="small">{msg}</span>
    </form>
  );
}

export function ResendEmailButton({ orderId, emailStatus }: { orderId: string; emailStatus: EmailStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const alreadyAccepted = emailStatus === "accepted" || emailStatus === "delivered";
  return (
    <div className="inline-form">
      <button
        type="button"
        className="btn btn-secondary btn-small"
        disabled={busy || emailStatus === "sending"}
        onClick={async () => {
          if (busy) return;
          if (alreadyAccepted && !window.confirm("This email was already accepted. Send it again?")) return;
          setBusy(true);
          setMsg(null);
          try {
            const res = await fetch(`/api/founder/orders/${orderId}/email`, { method: "POST" });
            const data = await res.json().catch(() => null);
            if (data?.emailStatus) setMsg(EMAIL_STATUS_LABELS[data.emailStatus as EmailStatus]);
            else setMsg(data?.message ?? "Could not send.");
            router.refresh();
          } catch {
            setMsg("Could not reach the server.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Sending…" : alreadyAccepted ? "Send email again" : "Retry email"}
      </button>
      <span role="status" className="small">{msg}</span>
    </div>
  );
}
