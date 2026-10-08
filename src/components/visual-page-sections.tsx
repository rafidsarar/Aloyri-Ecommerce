import type { VisualLayout } from "@/lib/visual-builder";
import { VisualBuilderBlock } from "@/components/visual-builder-block";

export function VisualPageSections({ layout }: { layout: VisualLayout }) {
  if (!layout.blocks.length) return null;
  const lookup = new Map(layout.blocks.map(block => [`custom:${block.id}`, block]));
  return <div aria-label="Additional page content" className="pb-10">
    {layout.order.map(id => {
      const block = lookup.get(id);
      return block ? <VisualBuilderBlock block={block} key={id} /> : null;
    })}
  </div>;
}
