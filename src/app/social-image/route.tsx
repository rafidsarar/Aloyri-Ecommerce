import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px", background: "#faf4ee", color: "#713a35" }}>
      <div style={{ display: "flex", fontSize: 100, fontWeight: 700 }}>Aloyri</div>
      <div style={{ display: "flex", fontSize: 48, marginTop: 24 }}>Let Your Skin Glow.</div>
      <div style={{ display: "flex", fontSize: 28, marginTop: 60 }}>Skincare for your everyday routine</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
