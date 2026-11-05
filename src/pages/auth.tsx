import { useRef, useState } from "react"
import { useStore } from "../store"
import { Brand, EMAIL_ERROR, Field, Icon, isEmail, isPhone, PHONE_ERROR, useForm } from "../ui"

const PASSWORD_ERROR = "Use at least 8 characters"

export function Login() {
  const { go, signIn, enterRole, toast, customers } = useStore()
  const [show, setShow] = useState(false)
  const lastTen = (phone: string) => phone.replace(/\D/g, "").slice(-10)
  const isSuspended = (id: string) =>
    customers.some(
      (c) =>
        c.status === "Suspended" &&
        (c.email.toLowerCase() === id.trim().toLowerCase() || (isPhone(id) && lastTen(c.phone) === lastTen(id))),
    )
  const form = useForm({ id: "", password: "" }, (v) => ({
    id: !v.id.trim()
      ? "Enter your email or phone number"
      : !(isEmail(v.id) || isPhone(v.id))
        ? "Enter a valid email or 10-digit mobile number"
        : isSuspended(v.id)
          ? "This account has been suspended. Please contact support."
          : undefined,
    password: !v.password ? "Enter your password" : v.password.length < 8 ? PASSWORD_ERROR : undefined,
  }))
  return (
    <main className="auth-page">
      <div className="auth-image">
        <Brand inverse />
        <div>
          <span className="overline light">WELCOME TO PUJANOW</span>
          <h1>
            Sacred moments,
            <br />
            made simpler.
          </h1>
          <p>
            Plan meaningful pujas with trusted experts and complete peace of
            mind.
          </p>
        </div>
        <span>Trusted by 12,000+ families across India</span>
      </div>
      <div className="auth-form">
        <button type="button" className="back-link" onClick={() => go("home")}>
          <Icon name="back" size={18} /> Back to home
        </button>
        <div>
        <form
          noValidate
          onSubmit={form.submit(() => {
            signIn()
            toast("Welcome back")
          })}
        >
          <h1>Welcome back</h1>
          <p>Sign in to manage your pujas and bookings.</p>
          <Field label="Email or phone number" error={form.errors.id}>
            <input placeholder="Enter your email or phone" autoComplete="username" {...form.bind("id")} />
          </Field>
          <Field label="Password" error={form.errors.password}>
            <div className="input-wrap">
              <input
                type={show ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                {...form.bind("password")}
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <small className="demo-hint">
            Demo sign-in: any valid email or mobile number with a password of 8+
            characters. Passwords are not saved.
          </small>
          <button type="submit" className="button full">
            Sign in
          </button>
          <div className="divider">
            <span>or continue as</span>
          </div>
          <div className="role-buttons">
            <button type="button" onClick={() => enterRole("pandit")}>
              Pandit partner
            </button>
            <button type="button" onClick={() => enterRole("admin")}>
              Administrator
            </button>
          </div>
          <p className="form-foot">
            New to PujaNow?{" "}
            <button type="button" onClick={() => go("register")}>
              Create an account
            </button>
          </p>
        </form>
        </div>
      </div>
    </main>
  )
}

export function GenericAuth() {
  const { go, register, profile, toast, customers } = useStore()
  const form = useForm({ name: "", phone: "", email: "", password: "" }, (v) => ({
    name: v.name.trim().length < 2 ? "Enter your full name" : undefined,
    phone: isPhone(v.phone) ? undefined : PHONE_ERROR,
    email: !isEmail(v.email)
      ? EMAIL_ERROR
      : customers.some((c) => c.email.toLowerCase() === v.email.trim().toLowerCase())
        ? "An account with this email already exists. Please sign in."
        : undefined,
    password: v.password.length < 8 ? PASSWORD_ERROR : undefined,
  }))
  return (
    <main className="simple-page">
      <form
        className="simple-card"
        noValidate
        onSubmit={form.submit((v) => {
          register({ ...profile, name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim(), address: "" })
          toast("Your demo account has been created")
        })}
      >
        <Brand />
        <span className="overline">CREATE YOUR ACCOUNT</span>
        <h1>Welcome to PujaNow</h1>
        <p>Plan and manage meaningful pujas for your family.</p>
        <div className="form-grid">
          <Field label="Full name" error={form.errors.name}>
            <input placeholder="Your full name" autoComplete="name" {...form.bind("name")} />
          </Field>
          <Field label="Phone number" error={form.errors.phone}>
            <input placeholder="+91" inputMode="tel" autoComplete="tel" {...form.bind("phone")} />
          </Field>
          <Field label="Email address" className="wide" error={form.errors.email}>
            <input type="email" placeholder="you@example.com" autoComplete="email" {...form.bind("email")} />
          </Field>
          <Field label="Password" className="wide" error={form.errors.password}>
            <input type="password" placeholder="At least 8 characters" autoComplete="new-password" {...form.bind("password")} />
          </Field>
        </div>
        <button type="submit" className="button full">
          Create account
        </button>
        <p className="form-foot">
          Already have an account?{" "}
          <button type="button" onClick={() => go("login")}>
            Sign in
          </button>
        </p>
      </form>
    </main>
  )
}

const services = ["Griha Pravesh Puja", "Satyanarayan Puja", "Ganesh Puja", "Navgraha Shanti"]
const labels = ["Personal details", "Identity verification", "Experience", "Services & pricing"]

export function Onboarding() {
  const { update, enterRole, notify } = useStore()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [fileName, setFileName] = useState("")
  const [fileError, setFileError] = useState("")
  const [offered, setOffered] = useState(services.map((_, i) => i < 3))
  const [prices, setPrices] = useState<string[]>(services.map((_, i) => (i === 0 ? "₹5,100" : "₹3,500")))
  const [serviceError, setServiceError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const form = useForm(
    { name: "", phone: "", email: "", city: "", languages: "", years: "", qualification: "", about: "" },
    (v) =>
      step === 1
        ? {
            name: v.name.trim().length < 2 ? "Enter your full name" : undefined,
            phone: isPhone(v.phone) ? undefined : PHONE_ERROR,
            email: isEmail(v.email) ? undefined : EMAIL_ERROR,
            city: v.city ? undefined : "Please select your city",
            languages: v.languages.trim() ? undefined : "Enter the languages you speak",
          }
        : step === 3
          ? {
              years: /^\d{1,2}$/.test(v.years.trim()) ? undefined : "Enter your experience in years",
              qualification: v.qualification.trim() ? undefined : "Enter your institution or gurukul",
              about: v.about.trim().length < 20 ? "Please write at least 20 characters" : undefined,
            }
          : {},
  )
  const submitApplication = () => {
    const v = form.values
    update((s) =>
      notify(
        {
          ...s,
          verifications: [
            {
              id: `v${Date.now()}`,
              name: v.name.trim(),
              city: v.city,
              exp: `${v.years.trim()} years`,
              langs: v.languages.trim(),
              document: fileName,
              status: "Documents ready",
            },
            ...s.verifications,
          ],
        },
        "admin",
        `New partner application from ${v.name.trim()}`,
        "admin-verification",
      ),
    )
    setSubmitted(true)
  }
  const next = () => {
    if (step === 2 && !fileName) {
      setFileError("Please upload a government-issued ID")
      return
    }
    if (step === 4) {
      const chosen = offered.flatMap((on, i) => (on ? [i] : []))
      if (!chosen.length) {
        setServiceError("Select at least one service")
        return
      }
      if (chosen.some((i) => !/\d/.test(prices[i]))) {
        setServiceError("Enter a base price for each selected service")
        return
      }
      submitApplication()
      return
    }
    form.submit(() => setStep(step + 1))()
  }
  return (
    <main className="onboarding">
      <aside>
        <Brand inverse />
        <h2>Join PujaNow</h2>
        <p>Complete your profile to start receiving verified bookings.</p>
        <div className="onboard-steps">
          {labels.map((x, i) => (
            <div
              key={x}
              className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""}
            >
              <span>
                {step > i + 1 ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <b>{x}</b>
            </div>
          ))}
        </div>
        <small>Need help? partners@pujanow.in</small>
      </aside>
      <section>
        <div className="onboard-top">
          <span>Step {step} of 4</span>
          <b>{submitted ? 100 : step * 25}% complete</b>
        </div>
        {submitted ? (
          <div className="onboard-form">
            <span className="overline">APPLICATION RECEIVED</span>
            <h1>Thank you, {form.values.name.trim().split(" ")[0]}</h1>
            <p>
              Your application is now waiting for verification. An administrator
              can review it under Verification requests.
            </p>
            <div className="onboard-actions">
              <button type="button" className="button" onClick={() => enterRole("pandit")}>
                Go to partner dashboard <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>
        ) : (
          <div className="onboard-form">
            <span className="overline">PARTNER REGISTRATION</span>
            <h1>{labels[step - 1]}</h1>
            <p>
              {step === 1
                ? "Tell us a little about yourself. This information will appear on your public profile."
                : step === 2
                  ? "Help us keep PujaNow safe and trusted for every family."
                  : step === 3
                    ? "Share your background and areas of Vedic expertise."
                    : "Choose the services you offer and set transparent pricing."}
            </p>
            {step === 1 && (
              <div className="form-grid">
                <Field label="Full name" error={form.errors.name}>
                  <input placeholder="As per government ID" {...form.bind("name")} />
                </Field>
                <Field label="Phone number" error={form.errors.phone}>
                  <input placeholder="+91" inputMode="tel" {...form.bind("phone")} />
                </Field>
                <Field label="Email address" error={form.errors.email}>
                  <input type="email" placeholder="you@example.com" {...form.bind("email")} />
                </Field>
                <Field label="Primary city" error={form.errors.city}>
                  <select {...form.bind("city")}>
                    <option value="">Select your city</option>
                    <option>Gurugram</option>
                    <option>New Delhi</option>
                    <option>Noida</option>
                    <option>Jaipur</option>
                    <option>Pune</option>
                    <option>Ahmedabad</option>
                  </select>
                </Field>
                <Field label="Languages spoken" className="wide" error={form.errors.languages}>
                  <input placeholder="Hindi, Sanskrit, English" {...form.bind("languages")} />
                </Field>
              </div>
            )}
            {step === 2 && (
              <div className="upload-zone">
                <Icon name="shield" size={32} />
                <h3>{fileName || "Upload government-issued ID"}</h3>
                <p>Aadhaar, PAN card or passport · PDF, JPG or PNG</p>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  aria-label="Government-issued ID"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && !/\.(pdf|jpe?g|png)$/i.test(file.name)) {
                      setFileError("Please choose a PDF, JPG or PNG file")
                      return
                    }
                    if (file) {
                      setFileName(file.name)
                      setFileError("")
                    }
                  }}
                />
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => fileInput.current?.click()}
                >
                  {fileName ? "Choose a different file" : "Choose file"}
                </button>
                {fileError && (
                  <span className="field-error" role="alert">
                    {fileError}
                  </span>
                )}
              </div>
            )}
            {step === 3 && (
              <div className="form-grid">
                <Field label="Years of experience" error={form.errors.years}>
                  <input placeholder="e.g. 12" inputMode="numeric" {...form.bind("years")} />
                </Field>
                <Field label="Vedic qualification" error={form.errors.qualification}>
                  <input placeholder="Institution or gurukul" {...form.bind("qualification")} />
                </Field>
                <Field label="About your practice" className="wide" error={form.errors.about}>
                  <textarea placeholder="Describe your training, approach and experience" {...form.bind("about")} />
                </Field>
              </div>
            )}
            {step === 4 && (
              <div className="service-select">
                {services.map((x, i) => (
                  <label key={x}>
                    <input
                      type="checkbox"
                      checked={offered[i]}
                      onChange={(e) => {
                        setOffered(offered.map((v, j) => (j === i ? e.target.checked : v)))
                        setServiceError("")
                      }}
                    />
                    <span>
                      <b>{x}</b>
                      <small>Set base price</small>
                    </span>
                    <input
                      aria-label={`${x} base price`}
                      value={prices[i]}
                      onChange={(e) => {
                        setPrices(prices.map((v, j) => (j === i ? e.target.value : v)))
                        setServiceError("")
                      }}
                    />
                  </label>
                ))}
                {serviceError && (
                  <span className="field-error" role="alert">
                    {serviceError}
                  </span>
                )}
              </div>
            )}
            <div className="onboard-actions">
              {step > 1 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              )}
              <button type="button" className="button" onClick={next}>
                {step === 4 ? "Submit for verification" : "Continue"}{" "}
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
