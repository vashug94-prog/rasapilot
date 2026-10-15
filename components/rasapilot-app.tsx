"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { BriefInput, Concept, Mode, PlanResponse, ReferenceInput, ReferenceType } from "@/lib/types";

const PROCESS = [
  "Interpret the business brief",
  "Resolve cultural references",
  "Read local taste signals",
  "Check constraints & shape concepts",
  "Prepare a launch experiment",
];

type ServerStatus = { mode: Mode; demo: boolean; message: string };
type View = "concepts" | "compare" | "launch";

function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.3"/></>,
    sparkle: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></>,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z"/><path d="M5 21c3-6 7-9 13-12"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m6 9 6 6 6-6"/>,
    arrowUp: <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
    fork: <><path d="M6 3v12"/><path d="M18 9a3 3 0 1 0-3-3c0 4-9 3-9 9"/><path d="M6 15a3 3 0 1 0 3 3"/></>,
    bowl: <><path d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8Z"/><path d="M6 7c1-1 1-2 0-3M12 7c1-1 1-2 0-3M18 7c1-1 1-2 0-3"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    spinner: <><path d="M21 12a9 9 0 1 1-2.64-6.36"/></>,
    quote: <><path d="M3 21c3 0 6-2 6-6V5H3v7h4"/><path d="M14 21c3 0 6-2 6-6V5h-6v7h4"/></>,
    close: <><path d="m18 6-12 12"/><path d="m6 6 12 12"/></>,
  };
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" {...common}>{paths[name] ?? paths.sparkle}</svg>;
}

const referenceFields: { type: ReferenceType; label: string; placeholder: string; icon: string }[] = [
  { type: "place", label: "Restaurants", placeholder: "e.g. a favorite neighborhood spot", icon: "bowl" },
  { type: "brand", label: "Brands", placeholder: "e.g. a brand your audience loves", icon: "layers" },
  { type: "artist", label: "Artists", placeholder: "e.g. a musician or artist", icon: "sparkle" },
  { type: "movie", label: "Films", placeholder: "e.g. a film with the right mood", icon: "quote" },
];

const parseNames = (value: string, type: ReferenceType): ReferenceInput[] => value.split(",").map(name => name.trim()).filter(Boolean).map(name => ({ name, type }));
const parseSSE = (block: string) => {
  const lines = block.trim().split(/\r?\n/);
  const event = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
  const data = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
  return { event, data };
};

function BrandMark() {
  return <div className="flex items-center gap-2.5" aria-label="RasaPilot home">
    <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#dce878] text-[#284b3b]">
      <span className="absolute h-[18px] w-[18px] rounded-full border-[1.6px] border-current" />
      <span className="absolute h-[6px] w-[6px] rounded-full bg-current" />
      <span className="absolute -right-[2px] top-[4px] h-[6px] w-[6px] rounded-full bg-[#e7795b]" />
    </div>
    <span className="text-[19px] font-bold tracking-[-.055em]">rasa<span className="font-normal text-white/55">pilot</span></span>
  </div>;
}

function StatusPill({ mode, compact = false }: { mode: Mode | "checking"; compact?: boolean }) {
  const live = mode === "live";
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] ${live ? "border-[#77a78b]/45 bg-[#315d4a]/10 text-[#315d4a]" : "border-[#e7cf96] bg-[#fff8e9] text-[#8f6821]"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${mode === "checking" ? "animate-pulse bg-[#9ca39b]" : live ? "bg-[#4b9a69]" : "bg-[#c68a2a]"}`} />
    {mode === "checking" ? "Checking mode" : live ? "Live Qloo" : compact ? "Demo" : "Demonstration mode"}
  </span>;
}

function Field({ label, id, hint, children }: { label: string; id?: string; hint?: string; children: React.ReactNode }) {
  const controlId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return <div><label htmlFor={controlId} className="field-label">{label}</label>{children}{hint && <p className="mt-1.5 text-[11px] leading-4 text-[#89918a]">{hint}</p>}</div>;
}

function ConceptCard({ concept, index, selected, onSelect, mode }: { concept: Concept; index: number; selected: boolean; onSelect: () => void; mode: Mode }) {
  return <article className={`overflow-hidden rounded-[20px] border bg-[#fffefa] transition-all ${selected ? "border-[#315d4a] shadow-[0_12px_34px_rgba(40,75,59,.11)]" : "border-[#e6e4da] shadow-[0_3px_13px_rgba(29,41,37,.035)]"}`}>
    <div className="flex items-center justify-between border-b border-[#eeece4] px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3"><span className="serif text-[27px] leading-none text-[#a8ae97]">0{index + 1}</span><span className="rounded-full bg-[#f1f2e9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#536a58]">{concept.operationalLift} lift</span></div>
      <span className="text-[11px] font-medium text-[#8a9189]">{index === 0 ? "LOW RISK" : index === 1 ? "CULTURE-LED" : "SOCIAL-FIRST"}</span>
    </div>
    <div className="p-5 sm:p-6">
      <h3 className="serif text-[29px] leading-[1.03] sm:text-[32px]">{concept.name}</h3>
      <p className="mt-2 text-[13px] font-semibold text-[#66816e]">{concept.format}</p>
      <p className="mt-4 text-[14px] leading-[1.65] text-[#59645d]">{concept.positioning}</p>
      <div className="mt-5 rounded-[14px] bg-[#f5f5ed] p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#4b6b56]"><Icon name="sparkle" size={14}/> Cultural rationale</div>
        <p className="text-[12px] leading-[1.65] text-[#59645d]">{concept.rationale}</p>
      </div>
      <div className="mt-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#858b81]">Menu direction</div>
        <ul className="space-y-2">{concept.menuDirection.map((item, i) => <li key={i} className="flex gap-2.5 text-[12px] leading-5 text-[#4c5851]"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#d08d49]"/>{item}</li>)}</ul>
      </div>
      <details className="group mt-5 border-t border-[#eeece4] pt-4">
        <summary className="flex list-none items-center justify-between text-[11px] font-bold uppercase tracking-[.12em] text-[#777f76] marker:hidden">Practical checks <Icon name="chevron" size={15} className="transition group-open:rotate-180"/></summary>
        <ul className="mt-3 space-y-2.5">{concept.constraints.map((item, i) => <li key={i} className="flex gap-2 text-[12px] leading-5 text-[#626c64]"><Icon name="check" size={14} className="mt-0.5 shrink-0 text-[#63846c]"/>{item}</li>)}</ul>
        <div className="mt-4 rounded-xl border border-[#e8e5d9] bg-[#fffefa] p-3.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#aa7633]"><Icon name="fork" size={14}/> Suggested validation</div>
          <p className="mt-2 text-[12px] leading-[1.6] text-[#59645d]">{concept.experiment}</p>
        </div>
      </details>
      <button type="button" onClick={onSelect} className={`mt-5 flex w-full items-center justify-between rounded-xl px-4 py-3 text-[12px] font-bold transition ${selected ? "bg-[#315d4a] text-white" : "border border-[#dce0d5] bg-white text-[#315d4a] hover:border-[#315d4a]"}`}>
        {selected ? "Selected for launch plan" : "Choose this direction"}<Icon name={selected ? "check" : "arrow"} size={16}/>
      </button>
    </div>
  </article>;
}

function EvidencePanel({ result }: { result: PlanResponse }) {
  const { evidence } = result;
  return <section id="evidence" className="overflow-hidden rounded-[20px] border border-[#e5e3d9] bg-[#fffefa]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeece4] px-5 py-4 sm:px-6">
      <div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#7c857a]">Evidence ledger</div><h3 className="serif mt-1 text-[23px]">What informed the ideas</h3></div>
      <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] ${evidence.mode === "live" ? "bg-[#e9f3eb] text-[#315d4a]" : "bg-[#fff3d8] text-[#8f6821]"}`}>{evidence.source}</span>
    </div>
    <div className="grid gap-0 md:grid-cols-2">
      <div className="p-5 sm:p-6 md:border-r md:border-[#eeece4]">
        <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#788279]">Resolved references</span><span className="text-[10px] text-[#949a91]">{evidence.references.filter(x => x.status === "resolved").length} matched</span></div>
        {!evidence.references.length ? <p className="rounded-xl bg-[#f7f6f0] p-3 text-[12px] leading-5 text-[#7d857c]">No cultural references were entered. Place discovery is based on the city and audience brief.</p> : <div className="space-y-2">{evidence.references.map((reference, i) => <div key={`${reference.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f6f0] px-3.5 py-3">
          <div className="min-w-0"><div className="truncate text-[12px] font-semibold text-[#34423a]">{reference.name}</div><div className="mt-0.5 text-[10px] capitalize text-[#92988e]">{reference.type} · {evidence.mode === "live" ? "Qloo Entity Search" : "demo fixture"}</div></div>
          {reference.status === "resolved" ? <span className="shrink-0 rounded-full bg-[#e7f1e8] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-[#3d744e]">Matched</span> : <span className="shrink-0 rounded-full bg-[#f1eee7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-[#888278]">No match</span>}
        </div>)}</div>}
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#788279]">Local place insights</span><span className="text-[10px] text-[#949a91]">{evidence.places.length} returned</span></div>
        {!evidence.places.length ? <p className="rounded-xl bg-[#f7f6f0] p-3 text-[12px] leading-5 text-[#7d857c]">No places returned for this query. The concepts remain ideas generated from your brief.</p> : <div className="space-y-2">{evidence.places.slice(0, 5).map((entity, i) => <div key={`${entity.entity_id}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f6f0] px-3.5 py-3">
          <div className="min-w-0"><div className="truncate text-[12px] font-semibold text-[#34423a]">{entity.name}</div><div className="mt-0.5 truncate text-[10px] text-[#92988e]">{typeof entity.properties?.city === "string" ? entity.properties.city : entity.subtype ?? entity.type}</div></div>
          {typeof entity.affinity === "number" && <span className="shrink-0 font-mono text-[11px] text-[#42694f]">{entity.affinity.toFixed(3)}</span>}
          {typeof entity.affinity !== "number" && <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] text-[#92988e]">{evidence.mode === "demo" ? "fixture" : "returned"}</span>}
        </div>)}</div>}
      </div>
    </div>
    <details className="border-t border-[#eeece4]">
      <summary className="flex list-none items-center justify-between px-5 py-4 text-[11px] font-bold text-[#657169] marker:hidden sm:px-6">Query and provenance details <Icon name="chevron" size={15}/></summary>
      <div className="px-5 pb-5 sm:px-6">
        <p className="mb-3 text-[11px] leading-5 text-[#858c83]">{evidence.mode === "live" ? "Entity names and optional affinity values below came from Qloo responses. Menu ideas, feasibility notes and validation experiments are generated by RasaPilot." : "Everything in this ledger is an illustrative local fixture. No Qloo request was made; no fixture entity or value represents live Qloo data. Menu ideas are generated by RasaPilot."}</p>
        <pre className="max-h-56 overflow-auto rounded-xl bg-[#242f29] p-4 text-[10px] leading-5 text-[#e5ebdc]">{JSON.stringify(evidence.rawSummary, null, 2)}</pre>
        {evidence.warnings.length > 0 && <ul className="mt-3 space-y-1.5">{evidence.warnings.map((warning, i) => <li key={i} className="text-[11px] leading-5 text-[#9b6d31]">• {warning}</li>)}</ul>}
      </div>
    </details>
  </section>;
}

export default function RasaPilotApp() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [businessType, setBusinessType] = useState("Cloud kitchen");
  const [city, setCity] = useState("Mumbai, India");
  const [audience, setAudience] = useState("Curious young professionals");
  const [priceRange, setPriceRange] = useState("$$ · Everyday treat");
  const [dietary, setDietary] = useState("Vegetarian options, no peanuts");
  const [cuisineText, setCuisineText] = useState("Maharashtrian, Korean");
  const [refValues, setRefValues] = useState<Record<ReferenceType, string>>({ place: "", brand: "", artist: "", movie: "" });
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("concepts");
  const [selectedId, setSelectedId] = useState("signature");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" }).then(response => response.json()).then(setStatus).catch(() => setStatus({ mode: "demo", demo: true, message: "Mode check is unavailable; demonstration fixtures will be used." }));
  }, []);

  const brief = useMemo<BriefInput>(() => ({
    businessType, city, audience, priceRange, dietaryConstraints: dietary,
    cuisines: cuisineText.split(",").map(x => x.trim()).filter(Boolean),
    references: referenceFields.flatMap(field => parseNames(refValues[field.type], field.type)).slice(0, 8),
  }), [businessType, city, audience, priceRange, dietary, cuisineText, refValues]);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setResult(null); setRunning(true); setActiveStep(0); setView("concepts");
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(brief) });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${response.status}).`);
      }
      if (!response.body) throw new Error("Your browser could not open the planning stream. Please try again.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotResult = false;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const { event: eventName, data } = parseSSE(block);
          if (!eventName || !data) continue;
          const payload = JSON.parse(data);
          if (eventName === "progress") setActiveStep(payload.step);
          if (eventName === "error") throw new Error(payload.error || "The planning run failed.");
          if (eventName === "result") { setResult(payload as PlanResponse); gotResult = true; setActiveStep(null); setSelectedId("signature"); }
        }
        if (done) break;
      }
      if (!gotResult) throw new Error("The planning service ended before returning a result.");
      setTimeout(() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The planning run could not be completed.");
      setActiveStep(null);
    } finally { setRunning(false); }
  }

  const selectedConcept = result?.concepts.find(concept => concept.id === selectedId) ?? result?.concepts[0];

  return <main className="min-h-screen overflow-hidden bg-[#f7f5ef]">
    <header className="grain relative z-10 bg-[#253b31] text-white">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <BrandMark />
        <nav className="hidden items-center gap-8 text-[12px] text-white/65 md:flex"><a href="#workflow" className="transition hover:text-white">How it works</a><a href="#workspace" className="transition hover:text-white">Studio</a><a href="#evidence" className="transition hover:text-white">Evidence</a></nav>
        <a href="#workspace" className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold text-white transition hover:border-[#dce878] hover:text-[#dce878]">Open the studio <Icon name="arrow" size={14}/></a>
      </div>
      <div className="mx-auto grid max-w-[1280px] items-center gap-9 px-5 pb-12 pt-9 sm:px-8 md:grid-cols-[1.15fr_.85fr] md:pb-[74px] md:pt-14 lg:px-12 lg:gap-16">
        <div className="max-w-[690px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.055] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-[#dce878]"><Icon name="sparkle" size={13}/> Cultural intelligence for food founders</div>
          <h1 className="serif max-w-[680px] text-[48px] leading-[.98] tracking-[-.065em] sm:text-[64px] lg:text-[76px]">Good food knows <span className="italic text-[#dce878]">where it’s from.</span></h1>
          <p className="mt-5 max-w-[560px] text-[15px] leading-[1.75] text-white/68 sm:text-[16px]">RasaPilot turns local taste signals and cultural cues into menu ideas people can feel at home with — and a small, sensible way to test them.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#workspace" className="inline-flex items-center gap-3 rounded-full bg-[#dce878] px-5 py-3 text-[12px] font-bold text-[#273d32] transition hover:bg-[#e7f28a]">Build a menu brief <Icon name="arrow" size={16}/></a>
            <span className="flex items-center gap-2 text-[11px] text-white/48"><span className="h-1.5 w-1.5 rounded-full bg-[#dce878]"/>No audience profiling. Just cultural signals.</span>
          </div>
        </div>
        <div className="relative mx-auto hidden h-[270px] w-full max-w-[440px] md:block">
          <div className="absolute right-[9%] top-[7%] h-[212px] w-[212px] rounded-full border border-white/[.13]"/>
          <div className="absolute right-[17%] top-[15%] h-[180px] w-[180px] rounded-full border border-dashed border-[#dce878]/50"/>
          <div className="absolute right-[23%] top-[21%] grid h-[154px] w-[154px] place-items-center rounded-full bg-[#dce878] shadow-[0_20px_70px_rgba(217,231,117,.18)]">
            <div className="grid h-[120px] w-[120px] place-items-center rounded-full border-[7px] border-[#315d4a] bg-[#f8f4de]"><div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-[#c56f4d]"><div className="flex h-[62px] w-[62px] items-center justify-center gap-1.5 rounded-full bg-[#f3c76e]"><span className="h-2 w-2 rounded-full bg-[#315d4a]"/><span className="h-2 w-2 rounded-full bg-[#315d4a]"/><span className="h-2 w-2 rounded-full bg-[#315d4a]"/></div></div></div>
          </div>
          <div className="absolute left-[3%] top-[20%] rounded-2xl border border-white/15 bg-[#31493c]/90 p-3.5 shadow-xl backdrop-blur"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#dce878]"><Icon name="pin" size={12}/> Place</div><div className="serif mt-1.5 text-[16px]">A city has a palate.</div></div>
          <div className="absolute bottom-[9%] left-[11%] rounded-2xl border border-white/15 bg-[#31493c]/90 p-3.5 shadow-xl backdrop-blur"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#f2a082]"><Icon name="sparkle" size={12}/> Culture</div><div className="serif mt-1.5 text-[16px]">Taste has a story.</div></div>
          <div className="absolute bottom-[4%] right-[5%] flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[.11em] text-[#315d4a] shadow-xl"><span className="h-1.5 w-1.5 rounded-full bg-[#d17b57]"/>Taste graph → menu test</div>
        </div>
      </div>
      <div className="absolute -bottom-[1px] left-0 right-0 h-4 rounded-t-[50%] bg-[#f7f5ef]"/>
    </header>

    <section id="workflow" className="mx-auto max-w-[1280px] px-5 pb-10 pt-8 sm:px-8 lg:px-12">
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["01", "Start with your place", "Share the business, neighborhood and people you hope to serve."],
          ["02", "Connect cultural cues", "Resolve favorite places, brands, artists and films into Qloo entities."],
          ["03", "Pilot with purpose", "Compare three directions and leave with a practical validation test."],
        ].map(([number, title, copy]) => <div key={number} className="flex gap-4 rounded-2xl border border-[#e7e5dc] bg-[#fbfaf5] p-4 sm:p-5"><span className="serif text-[25px] text-[#b7bd9f]">{number}</span><div><h2 className="text-[13px] font-bold text-[#33433a]">{title}</h2><p className="mt-1.5 max-w-[260px] text-[11px] leading-[1.6] text-[#818a81]">{copy}</p></div></div>)}
      </div>
    </section>

    <section id="workspace" className="mx-auto max-w-[1280px] scroll-mt-4 px-5 pb-20 pt-2 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#deddd3] pb-5">
        <div><div className="text-[10px] font-bold uppercase tracking-[.17em] text-[#78847a]">The menu concept studio</div><h2 className="serif mt-2 text-[35px] leading-none sm:text-[42px]">A brief with a point of view.</h2></div>
        <StatusPill mode={status?.mode ?? "checking"}/>
      </div>

      {status?.demo && <div className="mb-6 flex gap-3 rounded-[14px] border border-[#e9d6a8] bg-[#fff7e5] p-4 text-[#816328] sm:px-5"><div className="mt-0.5"><Icon name="sparkle" size={17}/></div><div><div className="text-[11px] font-bold uppercase tracking-[.13em]">Demonstration mode · Not live Qloo data</div><p className="mt-1 text-[12px] leading-5">The sample run uses clearly labeled local fixtures so you can explore the workflow. Add <code className="rounded bg-[#f3e7c9] px-1 py-0.5 text-[11px]">QLOO_API_KEY</code> to the server environment to enable live entity search and Insights.</p></div></div>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,.88fr)] lg:gap-8">
        <form onSubmit={createPlan} className="rounded-[22px] border border-[#e4e2d8] bg-[#fffefa] p-5 shadow-[0_5px_26px_rgba(40,45,36,.04)] sm:p-7">
          <div className="mb-6 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#889084]">Business brief</div><div className="serif mt-1 text-[24px]">Tell us what you’re cooking.</div></div><span className="rounded-lg bg-[#f1f2e9] px-2.5 py-1.5 text-[10px] font-bold text-[#607460]">2–3 MIN</span></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business type"><select id="field-business-type" className="field text-[13px]" value={businessType} onChange={e => setBusinessType(e.target.value)}><option>Restaurant</option><option>Cloud kitchen</option><option>Food startup</option><option>Regional food entrepreneur</option><option>Café or bakery</option></select></Field>
            <Field label="City or region" id="city-region"><div className="relative"><Icon name="pin" size={16} className="pointer-events-none absolute left-3 top-[13px] text-[#899186]"/><input id="city-region" required minLength={2} maxLength={120} className="field pl-9 text-[13px]" placeholder="City, country" value={city} onChange={e => setCity(e.target.value)}/></div></Field>
            <div className="sm:col-span-2"><Field label="Who do you want at the table?" hint="A group or occasion is enough; don't enter personal details."><input id="field-who-do-you-want-at-the-table" required minLength={2} maxLength={180} className="field text-[13px]" placeholder="e.g. office lunch regulars, families on weekends" value={audience} onChange={e => setAudience(e.target.value)}/></Field></div>
            <Field label="Price range"><select id="field-price-range" className="field text-[13px]" value={priceRange} onChange={e => setPriceRange(e.target.value)}><option>$ · Everyday value</option><option>$$ · Everyday treat</option><option>$$$ · Special occasion</option><option>Flexible · Test first</option></select></Field>
            <Field label="Dietary constraints" hint="Optional; verify recipes and cross-contact before service."><input id="field-dietary-constraints" maxLength={240} className="field text-[13px]" placeholder="e.g. vegetarian, nut-free options" value={dietary} onChange={e => setDietary(e.target.value)}/></Field>
            <div className="sm:col-span-2"><Field label="Preferred cuisines or food traditions" hint="Separate with commas. Used as creative constraints, not as Qloo-verified labels."><input id="field-preferred-cuisines-or-food-traditions" className="field text-[13px]" placeholder="e.g. coastal, Maharashtrian, Levantine" value={cuisineText} onChange={e => setCuisineText(e.target.value)}/></Field></div>
          </div>
          <div className="my-6 border-t border-[#eeece4]"/>
          <div className="mb-4 flex items-center justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#859084]">Cultural touchstones</div><p className="mt-1 text-[11px] text-[#90968e]">Optional · up to 8 · matched by Qloo entity search</p></div><span className="hidden rounded-full bg-[#f6f3e9] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#8a8372] sm:inline">No personal data needed</span></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {referenceFields.map(field => <Field key={field.type} label={field.label} id={`reference-${field.type}`}><div className="relative"><span className="absolute left-3 top-[12px] text-[#899186]"><Icon name={field.icon} size={15}/></span><input id={`reference-${field.type}`} className="field pl-9 text-[12px]" placeholder={field.placeholder} value={refValues[field.type]} onChange={e => setRefValues(value => ({ ...value, [field.type]: e.target.value }))}/></div></Field>)}
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-[#eeece4] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[270px] text-[10px] leading-4 text-[#969b92]">Your brief stays on this run. Qloo receives only the city and named public cultural entities you choose.</p>
            <button type="submit" disabled={running} className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#315d4a] px-5 py-3.5 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(49,93,74,.15)] transition hover:bg-[#214334] disabled:cursor-wait disabled:opacity-70">{running ? <><Icon name="spinner" size={16} className="spin"/>Building your concepts</> : <>Find my menu direction <Icon name="arrow" size={16}/></>}</button>
          </div>
        </form>

        <aside className="space-y-5">
          <div className="rounded-[22px] bg-[#e9ebde] p-5 sm:p-6">
            <div className="flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#73816f]">Planning agent</div><span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.1em] text-[#83907c]"><span className={`h-1.5 w-1.5 rounded-full ${running ? "animate-pulse bg-[#cb8c46]" : "bg-[#729477]"}`}/>{running ? "Working" : "Ready"}</span></div>
            <div className="serif mt-2 text-[24px]">A little reasoning, step by step.</div>
            <p className="mt-2 text-[11px] leading-5 text-[#778175]">A transparent sequence of lookups and planning checks. Ideas are kept separate from retrieved evidence.</p>
            <div className="mt-6 space-y-0">{PROCESS.map((label, i) => {
              const completed = result !== null || (activeStep !== null && i < activeStep);
              const current = running && i === activeStep;
              return <div key={label} className="flex min-h-[42px] gap-3.5">
                <div className="flex w-5 flex-col items-center"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[9px] font-bold ${completed ? "border-[#315d4a] bg-[#315d4a] text-white" : current ? "border-[#bc8a47] bg-[#fff7e5] text-[#9b6e31]" : "border-[#c9cec0] bg-transparent text-[#98a092]"}`}>{completed ? <Icon name="check" size={12}/> : current ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#bc8a47]"/> : `0${i + 1}`}</span>{i < PROCESS.length - 1 && <span className={`mt-1 w-px flex-1 ${completed ? "bg-[#8fa890]" : "bg-[#ced2c4]"}`}/>}</div>
                <div className={`pt-0.5 text-[11px] ${completed || current ? "font-semibold text-[#3f5545]" : "text-[#8b9487]"}`}>{label}{current && <span className="ml-2 text-[9px] font-medium text-[#9c7a4d]">in progress</span>}</div>
              </div>;
            })}</div>
          </div>
          <div className="rounded-[22px] border border-[#e6e3d8] bg-[#fffefa] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#8b8f83]"><Icon name="layers" size={15}/> What you’ll leave with</div>
            <div className="mt-4 divide-y divide-[#efede5]">
              {[["03", "Differentiated menu concepts"], ["01", "Concise launch direction"], ["↗", "Evidence you can inspect"]].map(([number, label]) => <div key={label} className="flex items-center gap-3 py-3"><span className="serif w-8 text-[22px] text-[#c27f54]">{number}</span><span className="text-[12px] font-semibold text-[#49564d]">{label}</span></div>)}
            </div>
          </div>
          <div className="flex gap-3 rounded-[18px] border border-[#e7e3d8] bg-[#f0eee6] p-4"><span className="mt-0.5 text-[#a77743]"><Icon name="quote" size={16}/></span><p className="text-[11px] leading-[1.65] text-[#7f857b]">Cultural signals are aggregate patterns. Treat each menu as a hypothesis, then ask your actual customers.</p></div>
        </aside>
      </div>

      {error && <div role="alert" className="mt-6 flex items-start justify-between gap-3 rounded-[14px] border border-[#e6b4a7] bg-[#fff0ec] p-4 text-[#914d3f]"><div><div className="text-[11px] font-bold uppercase tracking-[.12em]">Couldn’t finish the planning run</div><p className="mt-1 text-[12px] leading-5">{error}</p></div><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><Icon name="close" size={17}/></button></div>}

      {running && <div className="mt-7 rounded-[20px] border border-[#e2e2d6] bg-[#fffefa] p-5 sm:p-7" aria-live="polite"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#f1f2e9] text-[#43644d]"><Icon name="spinner" size={19} className="spin"/></div><div><div className="text-[12px] font-bold text-[#35443a]">{PROCESS[activeStep ?? 0]}…</div><div className="mt-1 text-[11px] text-[#879086]">The server is working through the brief. This may take a few seconds.</div></div></div></div>}

      {result && <section id="recommendations" className="lift-in mt-12 scroll-mt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#859084]">Your first pass</span><StatusPill mode={result.mode} compact/></div><h2 className="serif mt-2 text-[35px] leading-none sm:text-[42px]">Three ways to make it yours.</h2><p className="mt-2 max-w-[620px] text-[12px] leading-5 text-[#838b82]">RasaPilot-generated menu hypotheses, grounded in the evidence ledger below. Pick one direction to tailor the launch plan.</p></div>
          <a href="#evidence" className="flex items-center gap-2 rounded-full border border-[#dcded3] px-4 py-2.5 text-[11px] font-bold text-[#4f6654] transition hover:bg-white">Inspect the evidence <Icon name="arrow" size={14}/></a>
        </div>
        {result.demoDisclosure && <div className="mb-5 flex gap-3 rounded-xl border border-[#e9d6a8] bg-[#fff7e5] px-4 py-3 text-[11px] leading-5 text-[#80632a]"><span className="mt-0.5"><Icon name="sparkle" size={14}/></span>{result.demoDisclosure}</div>}
        <div className="mb-5 flex flex-wrap gap-2 border-b border-[#dfded4] pb-3" role="tablist" aria-label="Planning output views">
          {([ ["concepts", "Concepts"], ["compare", "Compare"], ["launch", "Launch plan"] ] as [View, string][]).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`rounded-full px-4 py-2 text-[11px] font-bold transition ${view === key ? "bg-[#315d4a] text-white" : "text-[#778077] hover:bg-white"}`}>{label}</button>)}
        </div>

        {view === "concepts" && <div className="grid gap-4 xl:grid-cols-3">{result.concepts.map((concept, index) => <ConceptCard key={concept.id} concept={concept} index={index} selected={selectedId === concept.id} onSelect={() => setSelectedId(concept.id)} mode={result.mode}/>)}</div>}

        {view === "compare" && <div className="overflow-x-auto rounded-[20px] border border-[#e5e3d9] bg-[#fffefa]"><table className="w-full min-w-[720px] border-collapse text-left"><thead><tr className="border-b border-[#eeece4] text-[10px] uppercase tracking-[.13em] text-[#848c82]"><th className="px-5 py-4 font-bold">Direction</th><th className="px-4 py-4 font-bold">Positioning</th><th className="px-4 py-4 font-bold">Menu footprint</th><th className="px-4 py-4 font-bold">Operational lift</th><th className="px-4 py-4 font-bold">Best first test</th><th className="px-4 py-4"/></tr></thead><tbody>{result.concepts.map(concept => <tr key={concept.id} className={`border-b border-[#f0eee7] align-top last:border-0 ${selectedId === concept.id ? "bg-[#f4f6ef]" : ""}`}><td className="px-5 py-4"><div className="text-[12px] font-bold text-[#3d4c42]">{concept.name}</div><div className="mt-1 text-[10px] text-[#8a9288]">{concept.format}</div></td><td className="max-w-[220px] px-4 py-4 text-[11px] leading-5 text-[#68736a]">{concept.positioning}</td><td className="px-4 py-4 text-[11px] leading-5 text-[#68736a]">{concept.menuDirection.length} menu elements</td><td className="px-4 py-4"><span className="rounded-full bg-[#f0f1e9] px-2.5 py-1 text-[10px] font-semibold text-[#57705b]">{concept.operationalLift}</span></td><td className="max-w-[260px] px-4 py-4 text-[11px] leading-5 text-[#68736a]">{concept.experiment}</td><td className="px-4 py-4"><button onClick={() => setSelectedId(concept.id)} className="whitespace-nowrap text-[10px] font-bold text-[#315d4a] underline decoration-[#b2c3ab] underline-offset-4">{selectedId === concept.id ? "Selected" : "Choose"}</button></td></tr>)}</tbody></table><p className="border-t border-[#eeece4] px-5 py-3 text-[10px] text-[#92978e]">Operational lift and footprint are RasaPilot planning estimates, not Qloo data.</p></div>}

        {view === "launch" && selectedConcept && <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
          <div className="rounded-[20px] bg-[#315d4a] p-6 text-white sm:p-7"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#dce878]"><Icon name="sparkle" size={14}/> Direction selected</div><h3 className="serif mt-3 text-[34px] leading-[1.03]">{selectedConcept.name}</h3><p className="mt-3 text-[12px] leading-5 text-white/68">{selectedConcept.positioning}</p><div className="mt-6 border-t border-white/15 pt-5"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/50">Brand direction</div><p className="mt-2 text-[12px] leading-[1.7] text-white/85">{result.launchPlan.brandDirection}</p></div></div>
          <div className="rounded-[20px] border border-[#e5e3d9] bg-[#fffefa] p-6 sm:p-7"><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#839084]">Launch plan</div><h3 className="serif mt-2 text-[28px]">Make the first test count.</h3><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#879085]">Marketing angles</div><ul className="mt-3 space-y-3">{result.launchPlan.marketingAngles.map((angle, i) => <li key={i} className="flex gap-2 text-[11px] leading-[1.6] text-[#606b62]"><span className="serif text-[16px] leading-4 text-[#ce865d]">0{i + 1}</span>{angle}</li>)}</ul></div><div><div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#879085]">Next steps</div><ol className="mt-3 space-y-2.5">{result.launchPlan.nextSteps.map((step, i) => <li key={i} className="flex gap-2 text-[11px] leading-[1.6] text-[#606b62]"><span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#e8eddf] text-[9px] font-bold text-[#527056]">{i + 1}</span>{step}</li>)}</ol></div></div><div className="mt-5 rounded-xl bg-[#f4f4ed] p-4"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.13em] text-[#71806e]"><Icon name="quote" size={13}/> Sample social copy</div><p className="mt-2 text-[12px] leading-[1.7] text-[#59645d]">{result.launchPlan.sampleSocial}</p><button onClick={() => navigator.clipboard?.writeText(result.launchPlan.sampleSocial)} className="mt-3 text-[10px] font-bold text-[#315d4a] underline decoration-[#b8c7ae] underline-offset-4">Copy sample</button></div></div>
        </div>}
        <div className="mt-6"><EvidencePanel result={result}/></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#deddd3] pt-5"><p className="max-w-[640px] text-[10px] leading-5 text-[#93988e]">Qloo data describes aggregate cultural relationships. RasaPilot’s concept language, menu suggestions, operational estimates and launch ideas are generated planning hypotheses; validate them with your customers and kitchen.</p><button onClick={() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 text-[11px] font-bold text-[#315d4a]">Refine the brief <Icon name="arrowUp" size={14}/></button></div>
      </section>}
    </section>
    <footer className="border-t border-[#e4e2d8] bg-[#f1efe7]"><div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-6 text-[10px] text-[#8a9086] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><div className="flex items-center gap-2"><span className="font-bold text-[#536a58]">rasapilot</span><span>·</span><span>Culture on the menu, with evidence.</span></div><div>Designed for independent food businesses · Qloo-powered when configured</div></div></footer>
  </main>;
}
