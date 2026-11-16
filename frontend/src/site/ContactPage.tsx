import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { api, apiError, initializeCsrf, type ValidationErrors } from "../lib/api";
import { useSite, useDocumentTitle } from "./useSite";
import { Alert, Button, Field, FigLabel, Input, Textarea } from "../components/ui";

export default function ContactPage() {
  const { data: site } = useSite();
  const [params] = useSearchParams();
  const plan = params.get("plan");
  useDocumentTitle("Book a demo");

  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: plan ? `Interested in the ${plan} plan.` : "", website: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setErrors({});
    try {
      await initializeCsrf();
      await api.post("/leads", { ...form, source: plan ? "pricing" : "contact" });
      setSent(true);
    } catch (err) {
      const { message, errors } = apiError(err);
      setError(message); setErrors(errors);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <FigLabel>contact</FigLabel>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">See it on a <span className="font-serif font-normal italic text-accent">real</span> engagement.</h1>
        <p className="mt-5 max-w-md text-lg text-muted">Tell us a little about your practice. We'll reply within one working day to set up a 30-minute walkthrough.</p>
        <ul className="mt-10 space-y-4 text-sm">
          {site?.contact.email && <li className="flex items-center gap-3"><Mail className="size-4 text-accent" /><a href={`mailto:${site.contact.email}`} className="hover:underline">{site.contact.email}</a></li>}
          {site?.contact.phone && <li className="flex items-center gap-3"><Phone className="size-4 text-accent" />{site.contact.phone}</li>}
          {site?.contact.address && <li className="flex items-center gap-3"><MapPin className="size-4 text-accent" />{site.contact.address}</li>}
        </ul>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        {sent ? (
          <div className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="size-10 text-accent" />
            <h2 className="mt-4 text-xl font-semibold">Thanks — we've got it.</h2>
            <p className="mt-2 max-w-sm text-sm text-muted">Someone from our team will email you within one working day.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {error && !Object.keys(errors).length && <Alert>{error}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *" error={errors.name?.[0]}><Input required value={form.name} onChange={set("name")} autoComplete="name" /></Field>
              <Field label="Work email *" error={errors.email?.[0]}><Input required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></Field>
              <Field label="Phone" error={errors.phone?.[0]}><Input value={form.phone} onChange={set("phone")} autoComplete="tel" /></Field>
              <Field label="Firm / company" error={errors.company?.[0]}><Input value={form.company} onChange={set("company")} autoComplete="organization" /></Field>
            </div>
            <Field label="What would you like to see?" error={errors.message?.[0]}>
              <Textarea rows={5} value={form.message} onChange={set("message")} placeholder="Number of engagements a year, audit types, current tools…" />
            </Field>
            {/* Honeypot: hidden from people, filled by bots */}
            <input type="text" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <Button type="submit" loading={loading} className="h-11 w-full">Request a demo</Button>
            <p className="text-center text-xs text-muted">We'll only use your details to respond to this request.</p>
          </form>
        )}
      </div>
    </section>
  );
}
