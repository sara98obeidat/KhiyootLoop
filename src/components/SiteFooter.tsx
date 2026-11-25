import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="gold-rule" aria-hidden="true" />
        <p>KhiyootLoop — handmade crochet, made to order in Jordan.</p>
        <p className="small">
          Previews on this site are AI-generated concept images, not photographs of finished pieces. Handmade details and screen colours vary.{" "}
          <Link href="/info">Materials, care, production and ordering</Link> ·{" "}
          <Link href="/founder">Founder login</Link>
        </p>
      </div>
    </footer>
  );
}
