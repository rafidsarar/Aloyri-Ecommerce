"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type DragEvent, type ReactNode } from "react";
import Link from "next/link";
import { saveVisualBuilder } from "@/app/admin/actions";
import { VisualBuilderBlock } from "@/components/visual-builder-block";
import { BuilderPreviewViewport } from "@/components/admin/builder-preview-viewport";
import { homepageBlocks, type HomepageBlockId } from "@/lib/homepage-builder";
import type { InfoPageContent, StorefrontConfig } from "@/lib/storefront-admin-store";
import {
  coreBlockId,
  customBlockId,
  defaultVisualLayout,
  visualComponentCatalog,
  type VisualBlock,
  type VisualBlockKind,
  type VisualLayout,
  type VisualPageKey,
} from "@/lib/visual-builder";

type History = { past: VisualLayout[]; current: VisualLayout; future: VisualLayout[] };
type HistoryAction = { type: "change"; next: VisualLayout } | { type: "undo" | "redo" | "reset" };
const sections = new Map<string, string>(homepageBlocks.map(block => [coreBlockId(block.id), block.label]));

type CoreContent = Pick<StorefrontConfig["homepage"], "eyebrow" | "headline" | "intro" | "primaryLabel" | "primaryHref" | "secondaryLabel" | "secondaryHref" | "heroImagePath" | "heroStyle" | "heroAlignment" | "heroLayout" | "browseEyebrow" | "browseTitle" | "browseIntro" | "browsePlaceholder" | "categoriesEyebrow" | "categoriesTitle" | "categoriesIntro" | "routineFinderHeadline" | "routineFinderIntro" | "ideaEyebrow" | "ideaHeadline" | "ideaCopy">;

function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "reset") return { past: [], current: structuredClone(defaultVisualLayout), future: [] };
  if (action.type === "undo" && state.past.length) {
    return { past: state.past.slice(0, -1), current: state.past[state.past.length - 1], future: [state.current, ...state.future].slice(0, 40) };
  }
  if (action.type === "redo" && state.future.length) {
    return { past: [...state.past, state.current].slice(-40), current: state.future[0], future: state.future.slice(1) };
  }
  if (action.type === "change") {
    if (JSON.stringify(state.current) === JSON.stringify(action.next)) return state;
    return { past: [...state.past, state.current].slice(-40), current: action.next, future: [] };
  }
  return state;
}
const field = "w-full min-h-11 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-[#2f211f] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#713a35]";
const secondaryButton = "min-h-10 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-[#4b2e2a] hover:bg-[#f6ebe8] disabled:cursor-not-allowed disabled:opacity-35";

function freshBlock(kind: VisualBlockKind): VisualBlock {
  return {
    id: "vb-" + Math.random().toString(36).slice(2, 12),
    kind,
    enabled: true,
    eyebrow: "",
    title: kind === "faq" ? "Questions, answered" : kind === "quote" ? "From our community" : kind === "cta" ? "Discover your next favorite" : kind === "features" ? "Why shop with Aloyri" : kind === "image" ? "A little more about Aloyri" : kind === "text" ? "Your story starts here" : "",
    body: kind === "text" || kind === "cta" || kind === "image" ? "Add your own message in the properties panel." : "",
    ctaLabel: kind === "cta" ? "Browse the edit" : "",
    ctaHref: kind === "cta" ? "/shop" : "",
    imagePath: "",
    items: kind === "features" ? ["Thoughtfully selected skincare", "Clear product information", "Bangladesh delivery"] : kind === "faq" ? ["How do I place an order?|Choose your products and sign in to complete checkout."] : kind === "quote" ? ["Add an authentic quotation here."] : [],
    align: "left",
    tone: kind === "cta" ? "rose" : "light",
    spacing: "regular",
    hideMobile: false,
    hideDesktop: false,
  };
}

export function VisualBuilderStudio({ initialLayout, pageKey, mediaPaths = [], initialCoreContent, advancedSettings, initialView = "canvas", initialPageContent, initialSiteContent }: { initialLayout: VisualLayout; pageKey: "home" | VisualPageKey; mediaPaths?: string[]; initialCoreContent?: CoreContent; advancedSettings?: ReactNode; initialView?: "canvas" | "advanced"; initialPageContent?: InfoPageContent; initialSiteContent?: { announcement: string; footerDescription: string } }) {
  const [{ past, current: layout, future }, dispatch] = useReducer(historyReducer, { past: [], current: initialLayout, future: [] });
  const [coreContent, setCoreContent] = useState<CoreContent | undefined>(initialCoreContent);
  const [pageContent, setPageContent] = useState<InfoPageContent | undefined>(initialPageContent);
  const [siteContent, setSiteContent] = useState(initialSiteContent);
  const publicFrame = useRef<HTMLIFrameElement>(null);
  const [publicSelection, setPublicSelection] = useState<"header" | "footer" | "page">("page");
  const [initialCoreSnapshot] = useState(() => initialCoreContent ? JSON.stringify(initialCoreContent) : "");
  const [corePast, setCorePast] = useState<CoreContent[]>([]);
  const [coreFuture, setCoreFuture] = useState<CoreContent[]>([]);
  function editCore<K extends keyof CoreContent>(key: K, value: CoreContent[K]) {
    if (!coreContent) return;
    setCorePast(p => [...p, coreContent].slice(-40));
    setCoreFuture([]);
    setCoreContent({ ...coreContent, [key]: value });
  }
  function undoCore() { if (!corePast.length || !coreContent) return; setCoreFuture(f => [coreContent, ...f]); setCoreContent(corePast[corePast.length - 1]); setCorePast(p => p.slice(0, -1)); }
  function redoCore() { if (!coreFuture.length || !coreContent) return; setCorePast(p => [...p, coreContent]); setCoreContent(coreFuture[0]); setCoreFuture(f => f.slice(1)); }
  const [selectedId, setSelectedId] = useState(layout.order[0] || "");
  const [view, setView] = useState<"canvas" | "advanced">(initialView);
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [previewMode, setPreviewMode] = useState<"live" | "draft">("live");
  const [focusPreview, setFocusPreview] = useState(false);
  const draftFrame = useRef<HTMLIFrameElement>(null);
  const sendDraft = useCallback(() => draftFrame.current?.contentWindow?.postMessage({ type: "aloyri-builder-draft", layout, coreContent, selectedId }, window.location.origin), [layout, coreContent, selectedId]);
  useEffect(() => {
    const receiveReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source === publicFrame.current?.contentWindow && event.data?.type === "aloyri-builder-public-select" && ["header", "footer", "page"].includes(event.data.section)) setPublicSelection(event.data.section);
      if (event.source !== draftFrame.current?.contentWindow) return;
      if (event.data?.type === "aloyri-builder-ready") sendDraft();
      if (event.data?.type === "aloyri-builder-select" && typeof event.data.id === "string" && layout.order.includes(event.data.id)) setSelectedId(event.data.id);
    };
    window.addEventListener("message", receiveReady);
    sendDraft();
    return () => window.removeEventListener("message", receiveReady);
  }, [layout, sendDraft]);
  useEffect(() => {
    publicFrame.current?.contentWindow?.postMessage({ type: "aloyri-builder-page-draft", content: pageContent, siteContent }, window.location.origin);
    draftFrame.current?.contentWindow?.postMessage({ type: "aloyri-builder-site-draft", siteContent }, window.location.origin);
  }, [pageContent, siteContent]);
  const [filter, setFilter] = useState("");
  const isHomepage = pageKey === "home";
  const selectedCustom = layout.blocks.find(block => customBlockId(block.id) === selectedId);
  const selectedCore = selectedId.startsWith("core:") ? selectedId.slice(5) as HomepageBlockId : null;

  function change(next: VisualLayout) { dispatch({ type: "change", next }); }
  function add(kind: VisualBlockKind) {
    if (layout.blocks.length >= 32) return;
    const block = freshBlock(kind);
    const id = customBlockId(block.id);
    const at = layout.order.indexOf(selectedId);
    const order = [...layout.order];
    order.splice(at < 0 ? order.length : at + 1, 0, id);
    change({ ...layout, order, blocks: [...layout.blocks, block] });
    setSelectedId(id);
  }
  function updateBlock<K extends keyof VisualBlock>(key: K, value: VisualBlock[K]) {
    if (!selectedCustom) return;
    change({ ...layout, blocks: layout.blocks.map(block => block.id === selectedCustom.id ? { ...block, [key]: value } : block) });
  }
  function swap(id: string, changeBy: number) {
    const from = layout.order.indexOf(id);
    const to = from + changeBy;
    if (from < 0 || to < 0 || to >= layout.order.length) return;
    const order = [...layout.order];
    [order[from], order[to]] = [order[to], order[from]];
    change({ ...layout, order });
  }
  function drop(event: DragEvent<HTMLElement>, target: string) {
    event.preventDefault();
    const dragging = event.dataTransfer.getData("text/plain");
    if (!layout.order.includes(dragging) || dragging === target) return;
    const order = layout.order.filter(id => id !== dragging);
    order.splice(order.indexOf(target), 0, dragging);
    change({ ...layout, order });
    setSelectedId(dragging);
  }
  function remove(id: string) {
    if (!id.startsWith("custom:")) return;
    change({ ...layout, order: layout.order.filter(item => item !== id), blocks: layout.blocks.filter(block => customBlockId(block.id) !== id) });
    setSelectedId("core:hero");
  }
  function duplicate() {
    if (!selectedCustom || layout.blocks.length >= 32) return;
    const block = { ...selectedCustom, id: freshBlock(selectedCustom.kind).id, items: [...selectedCustom.items] };
    const id = customBlockId(block.id);
    const at = layout.order.indexOf(selectedId);
    const order = [...layout.order];
    order.splice(at + 1, 0, id);
    change({ ...layout, order, blocks: [...layout.blocks, block] });
    setSelectedId(id);
  }
  function toggleCore(id: HomepageBlockId) {
    const hidden = new Set(layout.hiddenCore);
    if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
    change({ ...layout, hiddenCore: [...hidden] });
  }
  function componentName(kind: VisualBlockKind) {
    return visualComponentCatalog.find(item => item.kind === kind)?.name || kind;
  }
  function name(id: string) {
    if (sections.has(id)) return sections.get(id)!;
    const block = layout.blocks.find(item => customBlockId(item.id) === id);
    return block ? (block.title || componentName(block.kind)) : "Unknown section";
  }
  function hidden(id: string) {
    if (id.startsWith("core:")) return layout.hiddenCore.includes(id.slice(5) as HomepageBlockId);
    return layout.blocks.find(block => customBlockId(block.id) === id)?.enabled === false;
  }
  function visibilityToggle(id: string) {
    if (id.startsWith("core:")) return toggleCore(id.slice(5) as HomepageBlockId);
    const block = layout.blocks.find(item => customBlockId(item.id) === id);
    if (block) change({ ...layout, blocks: layout.blocks.map(item => item.id === block.id ? { ...item, enabled: !item.enabled } : item) });
  }

  const deviceWidths = { mobile: 390, tablet: 768, desktop: 1060 };
  return (
    <form action={saveVisualBuilder} className="space-y-4">
      <input type="hidden" name="layout" value={JSON.stringify(layout)} />
      {isHomepage && coreContent && <input type="hidden" name="coreContent" value={JSON.stringify(coreContent)} />}
      {isHomepage && <input type="hidden" name="coreBaseline" value={initialCoreSnapshot} />}
      <input type="hidden" name="pageKey" value={pageKey} />
      {siteContent && <input type="hidden" name="siteContent" value={JSON.stringify(siteContent)} />}
      {initialSiteContent && <input type="hidden" name="siteBaseline" value={JSON.stringify(initialSiteContent)} />}
      {pageContent && <input type="hidden" name="pageContent" value={JSON.stringify(pageContent)} />}
      {isHomepage && advancedSettings && <input type="hidden" name="homepageControls" value="1" />}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <div>
          <p className="text-sm font-semibold">Visual editor</p>
          <p className="mt-1 text-xs text-black/55">Drag to reorder. Use arrows for keyboard or touch. Changes stay in this editor until you save.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { if (corePast.length) undoCore(); else dispatch({ type: "undo" }); }} disabled={!past.length && !corePast.length} className={secondaryButton}>↶ Undo</button>
          <button type="button" onClick={() => { if (coreFuture.length) redoCore(); else dispatch({ type: "redo" }); }} disabled={!future.length && !coreFuture.length} className={secondaryButton}>↷ Redo</button>
          <Link href="/admin/history" className={secondaryButton}>Version history ↗</Link>
          <button type="submit" className="min-h-11 rounded-xl bg-[#713a35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5a2e2a]">Save website changes</button>
        </div>
      </div>
      {isHomepage && advancedSettings && <nav aria-label="Homepage editing tools" className="flex flex-wrap gap-2 rounded-2xl border border-black/10 bg-white p-3">
        <button type="button" aria-current={view === "canvas" ? "page" : undefined} onClick={() => setView("canvas")} className={view === "canvas" ? "min-h-11 rounded-xl bg-[#713a35] px-4 text-sm font-semibold text-white" : secondaryButton}>Visual layout & components</button>
        <button type="button" aria-current={view === "advanced" ? "page" : undefined} onClick={() => setView("advanced")} className={view === "advanced" ? "min-h-11 rounded-xl bg-[#713a35] px-4 text-sm font-semibold text-white" : secondaryButton}>Existing sections & detailed settings</button>
        <p className="basis-full text-xs leading-5 text-black/60">One workspace, one save: switch between editors without losing unsaved changes. Both views save together.</p>
      </nav>}
      <div className={isHomepage && advancedSettings && view === "advanced" ? "hidden" : ""}>
      <div className={`builder-workspace grid min-w-0 gap-4 ${focusPreview ? "builder-workspace--focus" : ""}`}>
        <aside className="builder-library min-w-0 rounded-2xl border border-black/10 bg-white p-4" aria-label="Component library">
          <h2 className="text-sm font-semibold">Add components</h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-black/55">Insert a reusable block after the selected section.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8">
            {visualComponentCatalog.map(item => <button key={item.kind} type="button" disabled={layout.blocks.length >= 32} onClick={() => add(item.kind)}
              title={item.description} className="min-h-12 rounded-xl border border-black/10 bg-[#faf7f5] px-3 py-2 text-left text-xs font-semibold hover:border-[#713a35]/40 disabled:opacity-40">
              <span className="mr-2 text-base text-[#713a35]" aria-hidden="true">＋</span>{item.name}
            </button>)}
          </div>
          <div className="mt-4 border-t border-black/10 pt-4 text-xs leading-5 text-black/55">Add up to 32 custom blocks. Existing commerce sections remain connected to real products, inventory and checkout.</div>
        </aside>
        <section className="builder-canvas flex min-w-0 flex-col gap-4" aria-label="Homepage canvas">
          <div className="builder-structure order-2 rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold">{isHomepage ? "Homepage structure" : "Page content blocks"}</h2><p className="mt-1 text-xs text-black/55">{layout.order.length} sections · {layout.blocks.length} custom components</p></div>
              <input aria-label="Find a section" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Find a section…" className={field + " max-w-48"} />
            </div>
            <ol className="max-h-[290px] space-y-2 overflow-y-auto pr-1">
              {layout.order.filter(id => name(id).toLowerCase().includes(filter.toLowerCase())).map(id => {
                const index = layout.order.indexOf(id);
                const core = id.startsWith("core:");
                return <li key={id} draggable onDragStart={event => event.dataTransfer.setData("text/plain", id)} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, id)}
                  className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 ${selectedId === id ? "border-[#713a35] bg-[#f8eee9]" : "border-black/10 bg-white"}`}>
                  <span className="cursor-grab px-1 text-black/40" title="Drag to reorder" aria-hidden="true">⠿</span>
                  <button type="button" onClick={() => setSelectedId(id)} aria-pressed={selectedId === id}
                    className="min-w-0 flex-1 text-left focus-visible:rounded focus-visible:outline-2">
                    <span className="block truncate text-xs font-semibold">{name(id)}</span>
                    <span className="text-[11px] text-black/50">{core ? "Built-in commerce section" : componentName(layout.blocks.find(block => customBlockId(block.id) === id)!.kind)} · {hidden(id) ? "Hidden" : "Visible"}</span>
                  </button>
                  <button type="button" aria-label={`Toggle visibility of ${name(id)}`} onClick={() => visibilityToggle(id)} className={secondaryButton}>{hidden(id) ? "○" : "●"}</button>
                  <button type="button" aria-label={`Move ${name(id)} up`} disabled={index === 0} onClick={() => swap(id, -1)} className={secondaryButton}>↑</button>
                  <button type="button" aria-label={`Move ${name(id)} down`} disabled={index === layout.order.length - 1} onClick={() => swap(id, 1)} className={secondaryButton}>↓</button>
                </li>;
              })}
            </ol>
            <p className="mt-3 text-xs text-black/50">The entire section can be dragged on desktop. Arrows work on all devices.</p>
          </div>
          <div className="builder-preview order-1 min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold">Storefront preview</h2><p className="text-xs text-black/55">{isHomepage ? previewMode === "live" ? "Actual storefront components with unsaved section order, visibility, text edits and custom blocks. Product and campaign data stays live." : "Unsaved section order and custom components; existing sections are represented by editable summaries." : "Existing page content appears in the preview above; custom components appear in the unsaved layout below. The existing page can be edited through its management screen."}</p></div>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Design preview device">
                {(["mobile", "tablet", "desktop"] as const).map(item => <button key={item} type="button" aria-pressed={device === item} onClick={() => setDevice(item)}
                  className={`min-h-9 rounded-lg px-3 py-1 text-xs font-semibold ${device === item ? "bg-[#713a35] text-white" : "bg-[#f7f1ee] text-[#713a35]"}`}>{item}</button>)}
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#fbf8f6] px-3 py-2">
              <p className="text-xs text-black/55">Preview uses real device breakpoints and fits the editor automatically.</p>
              <button type="button" aria-pressed={focusPreview} onClick={() => setFocusPreview(value => !value)} className={secondaryButton}>
                {focusPreview ? "Show editing panels" : "Focus preview"}
              </button>
            </div>
            {isHomepage && <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Preview content mode">
              <button type="button" aria-pressed={previewMode === "live"} onClick={() => setPreviewMode("live")} className={previewMode === "live" ? "min-h-10 rounded-lg bg-[#713a35] px-3 text-xs font-semibold text-white" : secondaryButton}>Interactive unsaved preview</button>
              <button type="button" aria-pressed={previewMode === "draft"} onClick={() => setPreviewMode("draft")} className={previewMode === "draft" ? "min-h-10 rounded-lg bg-[#713a35] px-3 text-xs font-semibold text-white" : secondaryButton}>Unsaved layout & components</button>
            </div>}
            <div className="min-w-0 rounded-xl bg-[#eee8e4] p-2 sm:p-4">
              {isHomepage && previewMode === "live" ? <BuilderPreviewViewport width={deviceWidths[device]} height={780}><iframe key={device} title={`Real storefront preview at ${deviceWidths[device]} pixels`} ref={draftFrame} src="/?builderPreview=1" onLoad={() => { sendDraft(); draftFrame.current?.contentWindow?.postMessage({ type: "aloyri-builder-site-draft", siteContent }, window.location.origin); }} width={deviceWidths[device]} height={780} loading="lazy" className="block border-0 bg-white" style={{ width: deviceWidths[device], height: 780, maxWidth: "none" }} /></BuilderPreviewViewport> : null}
              {!isHomepage && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 text-xs">
                <span className="font-semibold">Selected: {publicSelection === "header" ? "Site header" : publicSelection === "footer" ? "Site footer" : "Page content"}</span>
                <Link className={secondaryButton} href={publicSelection === "page" && ["about", "shipping", "returns", "contact", "faq"].includes(pageKey) ? `/admin/pages/${pageKey}` : publicSelection === "page" ? "/admin/merchandising" : "/admin/settings"}>Edit selected existing feature ↗</Link>
                <span className="text-black/50">Click an existing area in the preview to select it.</span>
              </div>}
              {!isHomepage && <BuilderPreviewViewport width={deviceWidths[device]} height={650}><iframe ref={publicFrame} onLoad={() => publicFrame.current?.contentWindow?.postMessage({ type: "aloyri-builder-page-draft", content: pageContent, siteContent }, window.location.origin)} title={`Saved ${pageKey} page preview`} src={(pageKey === "shipping" ? "/shipping-delivery" : pageKey === "returns" ? "/returns-refunds" : pageKey === "category" ? "/shop" : pageKey === "product" ? "/shop" : `/${pageKey}`) + "?builderPreview=1"} width={deviceWidths[device]} height={650} loading="lazy" className="block border-0 bg-white" style={{ width: deviceWidths[device], height: 650, maxWidth: "none" }} /></BuilderPreviewViewport>}
              {(!isHomepage || previewMode === "draft") && <div className="mx-auto min-h-56 overflow-hidden rounded-lg bg-[#fffaf8] shadow-sm" style={{ width: deviceWidths[device], maxWidth: "none" }}>
                <div className="flex justify-between border-b border-black/10 bg-white px-5 py-3 text-xs font-semibold"><span>ALOYRI</span><span>Preview</span></div>
                {layout.order.map(id => {
                  if (hidden(id)) return null;
                  if (id.startsWith("core:")) return <div key={id} className="mx-3 my-2 rounded-lg border border-dashed border-[#a98075]/35 bg-[#f7efeb] px-4 py-6 text-center text-xs font-semibold text-[#87675d]">{selectedId === id && coreContent ? <span className="block text-left"><span className="font-semibold">{id === "core:hero" ? coreContent.headline : id === "core:browse" ? coreContent.browseTitle : id === "core:categories" ? coreContent.categoriesTitle : id === "core:routineFinder" ? coreContent.routineFinderHeadline : id === "core:brandStory" ? coreContent.ideaHeadline : name(id)}</span></span> : name(id)}<span className="mt-1 block text-[10px] font-normal">Existing storefront section · select to edit</span></div>;
                  const block = layout.blocks.find(item => customBlockId(item.id) === id);
                  return block ? <VisualBuilderBlock key={id} block={block} /> : null;
                })}
              </div>}
            </div>
            <p className="mt-3 text-xs text-black/55">{isHomepage && previewMode === "live" ? "This preview uses the real storefront sections with your unsaved order, visibility and editable text. Advanced settings not yet represented here may require saving to appear." : "This is an approximate draft layout. Existing commerce sections are represented by summaries; choose Interactive unsaved preview to see their actual content."}</p>
          </div>
        </section>
        <aside className="builder-properties min-w-0 self-start rounded-2xl border border-black/10 bg-white p-4" aria-label="Selected component properties">
          <h2 className="text-sm font-semibold">Properties</h2>
          <p className="mt-1 mb-4 text-xs leading-5 text-black/55">Select a section in the preview or page structure to edit its content and appearance.</p>
          {siteContent && <div className="mb-3 space-y-3 rounded-xl border border-black/10 bg-white p-4" aria-label="Header and footer editor">
                <p className="text-sm font-semibold">Existing header and footer content</p>
                <label className="block text-xs font-semibold">Announcement text
                  <input className={field + " mt-1"} maxLength={180} value={siteContent.announcement} onChange={event => setSiteContent(current => current ? { ...current, announcement: event.target.value } : current)} />
                </label>
                <label className="block text-xs font-semibold">Footer description
                  <textarea className={field + " mt-1"} maxLength={600} rows={3} value={siteContent.footerDescription} onChange={event => setSiteContent(current => current ? { ...current, footerDescription: event.target.value } : current)} />
                </label>
                <Link href="/admin/settings" className="text-xs font-semibold text-[#713a35] underline">Edit navigation links and site appearance ↗</Link>
              </div>}
              {pageContent && <div className="mb-3 space-y-3 rounded-xl border border-black/10 bg-white p-4" aria-label="Existing page text editor">
                <p className="text-sm font-semibold">Edit existing {pageKey} page</p>
                <p className="text-xs text-black/60">Changes appear in the page preview and are saved together with the layout.</p>
                {(["eyebrow", "title", "intro"] as const).map(key => <label key={key} className="block text-xs font-semibold capitalize">{key}
                  <input className={field + " mt-1"} value={pageContent[key]} maxLength={key === "intro" ? 1000 : key === "title" ? 180 : 120} onChange={event => setPageContent(current => current ? { ...current, [key]: event.target.value } : current)} />
                </label>)}
                {pageContent.sections.map((section, index) => <label key={index} className="block text-xs font-semibold">Section {index + 1} heading
                  <input className={field + " mt-1"} value={section.title} maxLength={180} onChange={event => setPageContent(current => current ? { ...current, sections: current.sections.map((item, i) => i === index ? { ...item, title: event.target.value } : item) } : current)} />
                </label>)}
              </div>}
              
          {selectedCore ? <>
            <p className="mt-3 font-semibold">{sections.get(selectedId)}</p>
            {coreContent ? <><p className="mt-2 text-xs leading-5 text-black/60">Edit the existing section here. The storefront retains its working features and CRM data.</p>{selectedCore === "hero" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold">Small label<input aria-label="Small label" value={coreContent.eyebrow} maxLength={600} onChange={event => editCore("eyebrow", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Main heading<input aria-label="Main heading" value={coreContent.headline} maxLength={600} onChange={event => editCore("headline", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Description<input aria-label="Description" value={coreContent.intro} maxLength={600} onChange={event => editCore("intro", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Primary button<input aria-label="Primary button" value={coreContent.primaryLabel} maxLength={600} onChange={event => editCore("primaryLabel", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Primary destination<input aria-label="Primary destination" value={coreContent.primaryHref} maxLength={200} onChange={event => editCore("primaryHref", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Secondary button<input aria-label="Secondary button" value={coreContent.secondaryLabel} maxLength={600} onChange={event => editCore("secondaryLabel", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Secondary destination<input aria-label="Secondary destination" value={coreContent.secondaryHref} maxLength={200} onChange={event => editCore("secondaryHref", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Image path<input aria-label="Image path" value={coreContent.heroImagePath} maxLength={200} onChange={event => editCore("heroImagePath", event.target.value)} className={field + " mt-1"} /></label><label className="block text-xs font-semibold">Hero style<select value={coreContent.heroStyle} onChange={event => editCore("heroStyle", event.target.value as CoreContent["heroStyle"])} className={field + " mt-1"}><option value="soft">Soft</option><option value="minimal">Minimal</option><option value="contrast">Contrast</option></select></label><label className="block text-xs font-semibold">Layout<select value={coreContent.heroLayout} onChange={event => editCore("heroLayout", event.target.value as CoreContent["heroLayout"])} className={field + " mt-1"}><option value="split">Split</option><option value="stacked">Stacked</option></select></label></div>}
{selectedCore === "browse" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold">Small label<input aria-label="Small label" value={coreContent.browseEyebrow} maxLength={600} onChange={event => editCore("browseEyebrow", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Heading<input aria-label="Heading" value={coreContent.browseTitle} maxLength={600} onChange={event => editCore("browseTitle", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Description<input aria-label="Description" value={coreContent.browseIntro} maxLength={600} onChange={event => editCore("browseIntro", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Search placeholder<input aria-label="Search placeholder" value={coreContent.browsePlaceholder} maxLength={600} onChange={event => editCore("browsePlaceholder", event.target.value)} className={field + " mt-1"} /></label></div>}
{selectedCore === "categories" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold">Small label<input aria-label="Small label" value={coreContent.categoriesEyebrow} maxLength={600} onChange={event => editCore("categoriesEyebrow", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Heading<input aria-label="Heading" value={coreContent.categoriesTitle} maxLength={600} onChange={event => editCore("categoriesTitle", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Description<input aria-label="Description" value={coreContent.categoriesIntro} maxLength={600} onChange={event => editCore("categoriesIntro", event.target.value)} className={field + " mt-1"} /></label></div>}
{selectedCore === "routineFinder" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold">Heading<input aria-label="Heading" value={coreContent.routineFinderHeadline} maxLength={600} onChange={event => editCore("routineFinderHeadline", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Description<input aria-label="Description" value={coreContent.routineFinderIntro} maxLength={600} onChange={event => editCore("routineFinderIntro", event.target.value)} className={field + " mt-1"} /></label></div>}
{selectedCore === "brandStory" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold">Small label<input aria-label="Small label" value={coreContent.ideaEyebrow} maxLength={600} onChange={event => editCore("ideaEyebrow", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Heading<input aria-label="Heading" value={coreContent.ideaHeadline} maxLength={600} onChange={event => editCore("ideaHeadline", event.target.value)} className={field + " mt-1"} /></label>
<label className="block text-xs font-semibold">Description<input aria-label="Description" value={coreContent.ideaCopy} maxLength={600} onChange={event => editCore("ideaCopy", event.target.value)} className={field + " mt-1"} /></label></div>}</> : <p className="mt-2 text-xs text-black/60">Use the linked management screen for this section.</p>}
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={!layout.hiddenCore.includes(selectedCore)} onChange={() => toggleCore(selectedCore)} /> Show section</label>
            {selectedCore === "products" ? <Link href="/admin/merchandising" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-black/15 px-4 py-2 text-xs font-semibold">Edit products & campaigns →</Link> : advancedSettings ? <button type="button" onClick={() => setView("advanced")} className={secondaryButton + " mt-4"}>Detailed section settings →</button> : <Link href="/admin/builder?view=advanced" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-black/15 px-4 py-2 text-xs font-semibold">Detailed section settings →</Link>}
          </> : selectedCustom ? <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={duplicate} disabled={layout.blocks.length >= 32} className={secondaryButton}>Duplicate</button>
              <button type="button" onClick={() => remove(selectedId)} className={secondaryButton}>Remove</button>
            </div>
            <label className="block text-xs font-semibold">Component type
              <select value={selectedCustom.kind} onChange={event => updateBlock("kind", event.target.value as VisualBlockKind)} className={field + " mt-1"}>
                {visualComponentCatalog.map(item => <option key={item.kind} value={item.kind}>{item.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={selectedCustom.enabled} onChange={event => updateBlock("enabled", event.target.checked)} /> Show on website</label>
            {!["spacer", "divider"].includes(selectedCustom.kind) && <>
              <label className="block text-xs font-semibold">Small label
                <input maxLength={100} value={selectedCustom.eyebrow} onChange={event => updateBlock("eyebrow", event.target.value)} className={field + " mt-1"} />
              </label>
              <label className="block text-xs font-semibold">Heading
                <input maxLength={180} value={selectedCustom.title} onChange={event => updateBlock("title", event.target.value)} className={field + " mt-1"} />
              </label>
              <label className="block text-xs font-semibold">Description
                <textarea maxLength={1200} rows={4} value={selectedCustom.body} onChange={event => updateBlock("body", event.target.value)} className={field + " mt-1"} />
              </label>
            </>}
            {selectedCustom.kind === "image" && <label className="block text-xs font-semibold">Media library image
              <select value={mediaPaths.includes(selectedCustom.imagePath) ? selectedCustom.imagePath : ""} onChange={event => updateBlock("imagePath", event.target.value)} className={field + " mt-1"}>
                <option value="">Choose an uploaded image</option>
                {mediaPaths.map(path => <option key={path} value={path}>{path.startsWith("media/") ? path.slice(6) : path}</option>)}
              </select>
              <span className="mt-2 block text-xs font-normal text-black/60">Or enter an image path manually:</span>
              <span className="mt-2 block text-xs font-semibold">Image path</span>
              <input placeholder="media/your-image.webp" value={selectedCustom.imagePath} onChange={event => updateBlock("imagePath", event.target.value)} className={field + " mt-1"} />
              <Link href="/admin/media" target="_blank" className="mt-1 block font-normal text-[#713a35] underline">Open media library ↗</Link>
            </label>}
            {["features", "quote", "faq"].includes(selectedCustom.kind) && <label className="block text-xs font-semibold">{selectedCustom.kind === "faq" ? "Questions (question|answer on each line)" : selectedCustom.kind === "features" ? "Feature cards (one per line)" : "Quote"}
              <textarea rows={5} maxLength={2000} value={selectedCustom.items.join("\n")} onChange={event => updateBlock("items", event.target.value.split(/\r?\n/).slice(0, 8))} className={field + " mt-1"} />
            </label>}
            {!["spacer", "divider", "features", "faq", "quote"].includes(selectedCustom.kind) && <>
              <label className="block text-xs font-semibold">Button label
                <input maxLength={70} value={selectedCustom.ctaLabel} onChange={event => updateBlock("ctaLabel", event.target.value)} className={field + " mt-1"} />
              </label>
              <label className="block text-xs font-semibold">Button destination (internal URL)
                <input placeholder="/shop" value={selectedCustom.ctaHref} onChange={event => updateBlock("ctaHref", event.target.value)} className={field + " mt-1"} />
              </label>
            </>}
            <div className="border-t border-black/10 pt-4">
              <p className="mb-3 text-xs font-semibold">Appearance</p>
              <label className="block text-xs font-semibold">Background
                <select value={selectedCustom.tone} onChange={event => updateBlock("tone", event.target.value as VisualBlock["tone"])} className={field + " mt-1"}>
                  <option value="light">Soft white</option><option value="rose">Aloyri rose</option><option value="sage">Sage green</option><option value="dark">Dark cocoa</option>
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold">Spacing
                <select value={selectedCustom.spacing} onChange={event => updateBlock("spacing", event.target.value as VisualBlock["spacing"])} className={field + " mt-1"}>
                  <option value="compact">Compact</option><option value="regular">Regular</option><option value="spacious">Spacious</option>
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold">Text alignment
                <select value={selectedCustom.align} onChange={event => updateBlock("align", event.target.value as VisualBlock["align"])} className={field + " mt-1"}>
                  <option value="left">Left</option><option value="center">Center</option>
                </select>
              </label>
              <label className="mt-4 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={selectedCustom.hideMobile} onChange={event => updateBlock("hideMobile", event.target.checked)} /> Hide on mobile</label>
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={selectedCustom.hideDesktop} onChange={event => updateBlock("hideDesktop", event.target.checked)} /> Hide on desktop and tablet</label>
            </div>
          </div> : <p className="mt-3 text-xs text-black/60">Select a section to edit.</p>}
        </aside>
      </div>
      </div>
      {isHomepage && advancedSettings && <section className={view === "advanced" ? "min-w-0" : "hidden"} aria-label="Detailed homepage settings">
        {advancedSettings}
      </section>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <p className="text-xs text-black/60">Saving updates the selected public page with a recoverable version-history snapshot. Orders, prices and stock remain managed by their existing systems.</p>
        <button type="submit" className="min-h-11 rounded-xl bg-[#713a35] px-5 py-2.5 text-sm font-semibold text-white">Save website changes</button>
      </div>
    </form>
  );
}
