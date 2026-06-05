import { AppShell } from "@/components/app-shell";

interface PagePlaceholderProps {
  title: string;
  subtitle: string;
  description: string;
}

export function PagePlaceholder({ title, subtitle, description }: PagePlaceholderProps) {
  return (
    <AppShell title={title} subtitle={subtitle} showSearch={false}>
      <section className="rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h2 className="text-2xl font-semibold text-[#383433]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">{description}</p>
        <div className="mt-6 rounded-2xl border border-dashed border-[rgb(107_107_107_/_18%)] bg-[#fffaf5] px-4 py-10 text-center text-sm text-[var(--brand-muted)]">
          W budowie. Zaczynamy od pierwszych ekranów.
        </div>
      </section>
    </AppShell>
  );
}
