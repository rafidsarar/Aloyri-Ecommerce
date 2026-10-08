import Link from "next/link";
import { CustomerGoogleLink } from "@/components/customer-google-link";

function GoogleMark() {
  return (
    <span aria-hidden="true" className="account-google-mark">
      G
    </span>
  );
}

export function CustomerAuthLanding({
  checkout = false,
  returnTo = "/account",
  authError,
}: {
  checkout?: boolean;
  returnTo?: string;
  authError?: string;
}) {
  // Both actions use the existing secure Google OAuth flow, never passwords.
  const destination = checkout ? "/checkout" : returnTo;
  const signupDestination = "/account/setup?next=" + encodeURIComponent(destination);
  const loginHref =
    "/api/customer-auth/google/start?next=" + encodeURIComponent(destination);
  const signupHref =
    "/api/customer-auth/google/start?next=" + encodeURIComponent(signupDestination);

  const authMessage =
    authError === "google-not-ready"
      ? "Google sign-in is temporarily unavailable. Please try again later."
      : authError === "google-cancelled"
        ? "Google sign-in was not completed. You can try again."
        : authError === "google-failed"
          ? "We could not complete your Google sign-in. Please try again."
          : null;

  return (
    <div className="account-entry">
      <div className="mb-7 max-w-2xl">
        <p className="account-overline">Aloyri customer account</p>
        <h1 className="account-display display mt-3 text-4xl leading-tight sm:text-5xl">
          {checkout ? "Your account, then checkout." : "Welcome to your account."}
        </h1>
        <p className="account-muted mt-4 text-sm leading-7 sm:text-base">
          {checkout
            ? "Sign in or create your Aloyri account to place your order. Your shopping cart stays available without signing in."
            : "Access your own orders, delivery addresses and customer support in one secure place."}
        </p>
      </div>

      {authMessage ? (
        <p role="alert" className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
          {authMessage}
        </p>
      ) : null}

      <div className="account-entry-grid grid gap-5 lg:grid-cols-2 lg:gap-6">
        <section aria-labelledby="account-login-heading" className="account-panel flex flex-col rounded-[1.6rem] border p-6 sm:p-8">
          <p className="account-overline">Already a customer?</p>
          <h2 id="account-login-heading" className="account-display display mt-3 text-3xl sm:text-4xl">
            Sign in
          </h2>
          <p className="account-muted mt-3 text-sm leading-7">
            Use your Google account to access your saved addresses, orders and support history.
          </p>
          <ul className="account-check-list mt-7 space-y-3 text-sm">
            <li><span aria-hidden="true">✓</span> Your private order history</li>
            <li><span aria-hidden="true">✓</span> Saved delivery information</li>
            <li><span aria-hidden="true">✓</span> Wishlist and customer support</li>
          </ul>
          <div className="mt-auto pt-9">
            <CustomerGoogleLink href={loginHref} className="account-primary-button flex min-h-13 w-full items-center justify-center gap-3 rounded-full px-5 py-3 text-sm font-semibold">
              <GoogleMark />
              Sign in with Google
            </CustomerGoogleLink>
            <p className="account-muted mt-3 text-center text-xs leading-5">
              No separate Aloyri password needed.
            </p>
          </div>
        </section>

        <section aria-labelledby="account-register-heading" className="account-panel account-panel-highlight flex flex-col rounded-[1.6rem] border p-6 sm:p-8">
          <p className="account-overline">First time at Aloyri?</p>
          <h2 id="account-register-heading" className="account-display display mt-3 text-3xl sm:text-4xl">
            Create an account
          </h2>
          <p className="account-muted mt-3 text-sm leading-7">
            Registration is quick. Google verifies your email, then you provide your full name and mobile number.
          </p>
          <ol className="account-number-list mt-7 space-y-3 text-sm">
            <li><span>1</span> Continue securely with Google</li>
            <li><span>2</span> Add your name and mobile number</li>
            <li><span>3</span> Add a delivery address when you order</li>
          </ol>
          <div className="mt-auto pt-9">
            <CustomerGoogleLink href={signupHref} className="account-secondary-button flex min-h-13 w-full items-center justify-center gap-3 rounded-full px-5 py-3 text-sm font-semibold">
              <GoogleMark />
              Create account with Google
            </CustomerGoogleLink>
            <p className="account-muted mt-3 text-center text-xs leading-5">
              Your email comes from Google. No password to remember.
            </p>
          </div>
        </section>
      </div>

      <div className="account-info-strip mt-6 grid gap-5 rounded-2xl p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <p className="text-sm font-semibold">Shop before signing in</p>
          <p className="account-muted mt-1 text-xs leading-6">Browse skincare and add items to your cart freely.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Address at checkout</p>
          <p className="account-muted mt-1 text-xs leading-6">Only name, verified email and phone are needed for signup.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Track without an account</p>
          <p className="account-muted mt-1 text-xs leading-6">
            <Link href="/track-order" className="account-inline-link font-semibold underline underline-offset-4">
              Track your order
            </Link>{" "}
            using its order details.
          </p>
        </div>
      </div>
      {checkout ? (
        <p className="mt-6 text-center text-sm">
          <Link href="/cart" className="account-inline-link font-semibold underline underline-offset-4">
            ← Return to your cart
          </Link>
        </p>
      ) : null}
    </div>
  );
}
