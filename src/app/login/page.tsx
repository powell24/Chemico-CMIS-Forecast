import { Boxes, TrendingUp, Truck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-svh grid lg:grid-cols-2">
      {/* Left — brand proposition (hidden on mobile) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground p-12">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-[480px] rounded-full bg-accent/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-[360px] rounded-full bg-primary-foreground/5 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">CMIS</span>
          <span className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
            Forecast
          </span>
        </div>

        <div className="relative max-w-lg space-y-8">
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

        <p className="relative text-xs text-primary-foreground/60">
          Chemico × Zaigo AI Strategy · Confidential — for internal use.
        </p>
      </aside>

      {/* Right — sign-in form */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
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
