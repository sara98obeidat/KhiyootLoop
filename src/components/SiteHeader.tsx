import Image from "next/image";
import Link from "next/link";
import logo from "../../public/brand/khiyootloop-logo.png";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label="KhiyootLoop home">
          {/* Original logo, scaled proportionally (never stretched). */}
          <Image src={logo} alt="KhiyootLoop" width={104} height={Math.round((104 * 163) / 281)} priority />
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/customize/bag">Design a bag</Link>
          <Link href="/customize/scarf">Design a scarf</Link>
          <Link href="/info">Materials &amp; ordering</Link>
        </nav>
      </div>
    </header>
  );
}
