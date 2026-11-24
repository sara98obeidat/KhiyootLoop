import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS, PRODUCTION_ESTIMATE_TEXT, TAG_MATERIALS } from "@/config/catalog";
import { DEMONSTRATION_PRICES, DEMONSTRATION_PRICE_NOTE } from "@/config/pricing";
import { currentOrderMode } from "@/config/site";
import { TAG_MAX_VISIBLE_CHARS } from "@/lib/tagText";
import { formatJod } from "@/lib/pricing";

export const metadata: Metadata = { title: "Materials, care, production and ordering" };

export default function InfoPage() {
  const test = currentOrderMode() === "test";
  return (
    <article style={{ maxWidth: 760 }}>
      <h1>Materials, care, production and ordering</h1>

      <section className="info-section" aria-labelledby="materials">
        <h2 id="materials">Materials</h2>
        {(["bag", "scarf"] as const).map((id) => (
          <div key={id} className="card" style={{ marginBottom: 12 }}>
            <h3>{PRODUCTS[id].name}</h3>
            <ul>
              {PRODUCTS[id].materials.map((m) => (
                <li key={m.id}><strong>{m.label}:</strong> {m.description}</li>
              ))}
            </ul>
            <p className="small muted" style={{ margin: 0 }}>
              Colours: {PRODUCTS[id].colors.map((c) => c.label).join(", ")}. Only colours in stock for the chosen yarn are offered.
            </p>
          </div>
        ))}
        <p className="small">
          Exact fibre percentages will be listed once they are confirmed from the supplier labels. We do not make
          claims such as organic, recycled or zero-waste.
        </p>
      </section>

      <section className="info-section" aria-labelledby="tags">
        <h2 id="tags">Personalised tags</h2>
        <p>
          Choose a {TAG_MATERIALS.map((t) => t.label.toLowerCase()).join(" or a ")} with one line of text in Arabic or
          English, up to {TAG_MAX_VISIBLE_CHARS} characters including spaces (a provisional limit). We save your text
          exactly as you reviewed it. The engraver still has to confirm lettering, size and Arabic support; if your text
          cannot be made as shown, we will contact you before production.
        </p>
      </section>

      <section className="info-section" aria-labelledby="care">
        <h2 id="care">Care</h2>
        <p>
          Care instructions will be added here from the yarn suppliers&apos; labels. Until then, please ask us before
          washing your item. Where possible the tag is attached so that it can be removed for washing.
        </p>
      </section>

      <section className="info-section" aria-labelledby="production">
        <h2 id="production">Production</h2>
        <p>
          Every piece is crocheted by hand after the order is confirmed. Because yarns differ in thickness, stitch
          counts are adjusted to reach the stated dimensions, and small differences in size, texture and colour are normal.
        </p>
        <p>{PRODUCTION_ESTIMATE_TEXT}</p>
        <p>Before dispatch, each item is checked against your saved specification: dimensions, seams, loose ends, tag spelling and attachment, and colour.</p>
      </section>

      <section className="info-section" aria-labelledby="ordering">
        <h2 id="ordering">Ordering</h2>
        <ol>
          <li>Design your item and review the full specification and price.</li>
          <li>Submit your order request. You receive an order reference on screen and by email. This confirms we <strong>received</strong> your request, not that production has started.</li>
          <li>We check materials, tag engraving, capacity and payment arrangements, and then confirm production with you separately.</li>
        </ol>
        <p>There is no online payment on this website. Delivery is additional to the item price.</p>
        {test && (
          <div className="notice notice-test">
            <p style={{ margin: 0 }}>
              <strong>The website is currently in classroom test mode.</strong> Orders are test orders with no payment
              or production commitment. Test prices: bag {formatJod(DEMONSTRATION_PRICES.bag)}, scarf{" "}
              {formatJod(DEMONSTRATION_PRICES.scarf)}. {DEMONSTRATION_PRICE_NOTE}
            </p>
          </div>
        )}
      </section>

      <div className="cta-row">
        <Link className="btn btn-primary" href="/customize/bag">Customize a bag</Link>
        <Link className="btn btn-secondary" href="/customize/scarf">Customize a scarf</Link>
      </div>
    </article>
  );
}
