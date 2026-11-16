import { Link } from "react-router-dom";
import { FigLabel } from "../components/ui";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-32 text-center">
      <FigLabel>error 404</FigLabel>
      <h1 className="mt-3 font-serif text-5xl">This page isn't in the file.</h1>
      <p className="mt-4 text-muted">The link may be out of date, or the page was unpublished.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper">Go home</Link>
        <Link to="/university" className="rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-medium">Browse University</Link>
      </div>
    </section>
  );
}
