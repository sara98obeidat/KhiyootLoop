import Image from "next/image";
import Link from "next/link";
import logo from "../../public/brand/khiyootloop-logo.png";
import { PRODUCTS, PRODUCTION_ESTIMATE_TEXT } from "@/config/catalog";
import { DEMONSTRATION_PRICES } from "@/config/pricing";
import { currentOrderMode } from "@/config/site";
import { ProductPreviewV1 } from "@/components/preview/ProductPreview";
import { defaultConfiguration } from "@/lib/configuration";
import { formatJod } from "@/lib/pricing";

export default function HomePage() {
  const test = currentOrderMode() === "test";
  const cards = (["bag", "scarf"] as const).map((id) => ({
    id,
    product: PRODUCTS[id],
    config: { ...defaultConfiguration(id), tagText: id === "bag" ? "Loop" : "خيوط" },
  }));
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">Handmade crochet · Made to order in Jordan</p>
          <h1 id="hero-title">Design your own crochet bag or scarf</h1>
          <p>
            Choose the size, stitch, yarn and colour, then add a leather or metal tag with your own short
            text in Arabic or English. An illustrative preview updates as you choose, so you can see how your
            choices fit together before you send your order request.
          </p>
          <div className="cta-row">
            <Link className="btn btn-primary" href="/customize/bag">Customize a bag</Link>
            <Link className="btn btn-secondary" href="/customize/scarf">Customize a scarf</Link>
          </div>
        </div>
        <div className="hero-logo-wrap">
          <Image src={logo} alt="KhiyootLoop logo: a crocheted infinity loop" className="hero-logo" priority />
        </div>
      </section>

      <section aria-labelledby="products-title">
        <h2 id="products-title">Two pieces, made for you</h2>
        <div className="grid-2">
          {cards.map(({ id, product, config }) => (
            <article key={id} className="card product-card">
              <div className="art">
                <ProductPreviewV1 config={config} idPrefix={`home-${id}`} />
              </div>
              <p className="placeholder-label">
                Illustration, not a product photograph. Real photos will be added once samples are made.
              </p>
              <h3>{product.name}</h3>
              <p>{product.baseDesign}</p>
              <ul className="small">
                {product.sizes.map((s) => (
                  <li key={s.id}>
                    {s.label}: {s.dimensionsLabel}
                  </li>
                ))}
                <li>{product.stitches.length} stitches · {product.materials.length} yarns · {product.colors.length} colours</li>
              </ul>
              {test && (
                <p className="small">
                  <strong>{formatJod(DEMONSTRATION_PRICES[id])}</strong>{" "}
                  <span className="badge">Classroom test price</span>
                </p>
              )}
              <Link className="btn btn-primary btn-block" href={`/customize/${id}`}>
                Customize this {product.shortName.toLowerCase()}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 24 }} aria-labelledby="how-title">
        <h2 id="how-title">How ordering works</h2>
        <ol className="steps">
          <li>Choose the bag or the scarf, then its size, stitch, yarn and colour.</li>
          <li>Choose a leather or metal tag and type up to 12 characters.</li>
          <li>Check the preview, dimensions, full specification and price.</li>
          <li>Enter your contact details, review once more, and submit.</li>
          <li>You get an order reference and a full order summary on screen, which you can print or save. This confirms we received your request.</li>
          <li>We then check materials, tag engraving, capacity and payment, and confirm production separately.</li>
        </ol>
        <p className="small muted" style={{ marginTop: 12 }}>{PRODUCTION_ESTIMATE_TEXT}</p>
      </section>
    </>
  );
}
