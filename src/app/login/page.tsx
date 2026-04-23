import Image from "next/image";
import { Boxes, TrendingUp, Truck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-svh grid lg:grid-cols-2">
      {/* Left — brand proposition (hidden on mobile) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground p-12">
        {/* dot grid (drifting) */}
        <div
          className="cmis-drift pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,_white_1px,_transparent_1px)] [background-size:22px_22px]"
          aria-hidden
        />
        {/* soft radial glow top-right */}
        <div
          className="cmis-float-a pointer-events-none absolute -right-32 -top-32 size-[560px] rounded-full bg-accent/25 blur-3xl"
          aria-hidden
        />
        {/* teal bloom bottom-left */}
        <div
          className="cmis-float-b pointer-events-none absolute -bottom-40 -left-24 size-[420px] rounded-full bg-accent/15 blur-3xl"
          aria-hidden
        />
        {/* thin highlight line */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-primary-foreground/20 to-transparent"
          aria-hidden
        />
        {/* decorative hex lattice, very subtle */}
        <svg
          className="cmis-spin-slow pointer-events-none absolute -right-10 top-1/2 size-[380px] text-primary-foreground/10"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          aria-hidden
        >
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) => {
              const x = 30 + c * 45 + (r % 2 === 0 ? 0 : 22.5);
              const y = 30 + r * 38;
              return (
                <polygon
                  key={`${r}-${c}`}
                  points={`${x},${y - 22} ${x + 19},${y - 11} ${x + 19},${y + 11} ${x},${y + 22} ${x - 19},${y + 11} ${x - 19},${y - 11}`}
                />
              );
            }),
          )}
        </svg>

        <div className="cmis-rise relative flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm">
            <Image
              src="/chemico_logo.png"
              alt="Chemico"
              width={36}
              height={36}
              className="size-full object-contain"
              priority
            />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-semibold tracking-tight">CMIS</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-primary-foreground/70">
              Forecast
            </span>
          </div>
        </div>

        <div className="cmis-rise cmis-rise-delay-1 relative max-w-lg space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
              Demand forecasting &amp; inventory
            </p>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Demand forecasting that earns its keep on the balance sheet.
            </h2>
            <p className="text-base leading-relaxed text-primary-foreground/80">
              Predict chemical consumption by customer, plant, SKU, and season.
              Recommend reorder points and flag demand spikes or drops — all on
              a single ops dashboard.
            </p>
          </div>

          <ul className="space-y-4 border-t border-primary-foreground/15 pt-6">
            <li className="flex items-start gap-3 text-sm">
              <TrendingUp
                className="mt-0.5 size-5 shrink-0 text-accent"
                aria-hidden
              />
              <div>
                <p className="font-medium">Working capital freed</p>
                <p className="text-primary-foreground/70">
                  Release excess inventory to the balance sheet.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <Boxes
                className="mt-0.5 size-5 shrink-0 text-accent"
                aria-hidden
              />
              <div>
                <p className="font-medium">Stockouts prevented</p>
                <p className="text-primary-foreground/70">
                  Protect production continuity for Fortune 100 customers.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <Truck
                className="mt-0.5 size-5 shrink-0 text-accent"
                aria-hidden
              />
              <div>
                <p className="font-medium">Expedited freight avoided</p>
                <p className="text-primary-foreground/70">
                  The fastest-payback AI lever for ops-heavy businesses.
                </p>
              </div>
            </li>
          </ul>
        </div>

        <p className="cmis-rise cmis-rise-delay-3 relative text-xs text-primary-foreground/60">
          Chemico × Zaigo AI Strategy · Confidential — for internal use.
        </p>
      </aside>

      {/* Right — sign-in form */}
      <section className="relative flex items-center justify-center overflow-hidden p-6 sm:p-10">
        <div
          className="pointer-events-none absolute -right-40 -top-40 size-[420px] rounded-full bg-accent/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-48 -left-40 size-[440px] rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="cmis-rise cmis-rise-delay-2 relative w-full max-w-sm space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-lg font-semibold tracking-tight">
                CMIS
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Forecast
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Access the forecasting dashboard.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
