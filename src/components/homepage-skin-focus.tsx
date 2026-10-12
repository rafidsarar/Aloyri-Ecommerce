import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

const focuses = [
  { name: "Hydration", focus: "hydration", note: "Find your comfortable, hydrated feel.", symbol: "drop" },
  { name: "Light textures", focus: "lightweight", note: "Easy layers for an everyday routine.", symbol: "layers" },
  { name: "Gentle daily care", focus: "gentle", note: "Keep your daily essentials simple.", symbol: "petal" },
  { name: "Daily SPF", focus: "spf", note: "Make room for sun protection.", symbol: "sun" },
];

export function HomepageSkinFocus() {
  return <section className="shell home-focus-section" aria-labelledby="home-focus-heading">
    <div className="home-focus-heading">
      <p className="store-home-overline">A little more personal</p>
      <h2 id="home-focus-heading" className="display">What are you looking for?</h2>
      <p className="store-home-muted">Explore skincare by the feel and finish you prefer.</p>
    </div>
    <nav aria-label="Shop by skincare focus" className="home-focus-grid">
      {focuses.map(item => <Link key={item.focus} href={`/shop?focus=${item.focus}`} className="home-focus-card">
        <span className={`home-focus-symbol home-focus-symbol-${item.symbol}`} aria-hidden="true" />
        <h3>{item.name}</h3><p>{item.note}</p><ArrowIcon />
      </Link>)}
    </nav>
  </section>;
}
