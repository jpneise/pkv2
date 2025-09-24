"use client";
import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Shield, Lock, Clock, ArrowRight, ArrowLeft, Phone, Mail, User, Stethoscope, Hospital, Pill, Info } from "lucide-react";
import { z } from "zod";

// ======================================
// UI SHIMS (einfache Tailwind-Komponenten)
// ======================================
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "ghost"; asChild?: boolean };
function Button({ variant = "default", asChild, className = "", children, ...rest }: ButtonProps) {
  const base = "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring disabled:opacity-60";
  const styles = { default: "bg-black text-white hover:opacity-90", secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200", ghost: "bg-transparent text-gray-700 hover:bg-gray-100" } as const;
  const cls = `${base} ${styles[variant]} ${className}`;
  if (asChild && React.isValidElement(children)) {
    // @ts-ignore – wir stylen Kind-Element (z. B. <a>) als Button
    return React.cloneElement(children, { className: `${cls} ${children.props.className ?? ""}` });
  }
  return <button className={cls} {...rest}>{children}</button>;
}
function Card({ className = "", children }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`rounded-2xl border ${className}`}>{children}</div>; }
function CardHeader({ className = "", children }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`p-5 ${className}`}>{children}</div>; }
function CardTitle({ children }: { children: React.ReactNode }) { return <h2 className="text-xl font-semibold">{children}</h2>; }
function CardContent({ className = "", children }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`p-5 pt-0 ${className}`}>{children}</div>; }
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`w-full rounded-xl border px-3 py-2 ${props.className ?? ""}`} />; }
function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) { return <label {...props} className={`block text-sm font-medium text-gray-700 ${props.className ?? ""}`} />; }
function Checkbox({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) { return <input id={id} type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />; }

// RadioGroup (kleiner Context für zusammengehörige Radios)
const RadioGroupCtx = React.createContext<{ name: string; value?: string; onValueChange: (v: string) => void } | null>(null);
function RadioGroup({ value, onValueChange, className = "", children }: { value?: string; onValueChange: (v: string) => void; className?: string; children: React.ReactNode }) {
  const name = useMemo(() => `rg-${Math.random().toString(36).slice(2)}`,[/* no deps */]);
  return (
    <RadioGroupCtx.Provider value={{ name, value, onValueChange }}>
      <div className={className}>{children}</div>
    </RadioGroupCtx.Provider>
  );
}
function RadioGroupItem({ value, id }: { value: string; id?: string }) {
  const ctx = React.useContext(RadioGroupCtx);
  if (!ctx) return null;
  return (
    <input id={id} type="radio" name={ctx.name} value={value} checked={ctx.value === value} onChange={() => ctx.onValueChange(value)} className="h-4 w-4 border-gray-300" />
  );
}
function Progress({ value = 0, className = "" }: { value?: number; className?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-gray-100 ${className}`}>
      <div className="h-2 rounded-full bg-black" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`w-full rounded-xl border px-3 py-2 ${props.className ?? ""}`} />; }

// ======================================
// Fachlogik (Scoring & Ampel) + Tests
// ======================================
const PRIVACY_MODE = true; // Gesundheitsangaben bleiben lokal (nicht gesendet)
const ageOptions = Array.from({ length: 63 }, (_, i) => 18 + i); // 18–80
const incomeOptions = [
  "unter 3.000 €",
  "3.000–3.999 €",
  "4.000–4.999 €",
  "5.000–5.999 €",
  "6.000–6.999 €",
  "7.000–7.999 €",
  "8.000 € oder mehr",
];
const occupationOptions = ["Angestellt", "Selbstständig", "Beamter/Beamtin", "Student/in", "Sonstiges"] as const;

type Occupation = typeof occupationOptions[number];

function incomeBelow6000(income: string) {
  return new Set(["unter 3.000 €", "3.000–3.999 €", "4.000–4.999 €", "5.000–5.999 €"]).has(income);
}

type Step = 1 | 2 | 3 | 4 | 5; // 5 = Ergebnis

const schemaStep1 = z.object({
  age: z.number({ required_error: "Bitte Alter wählen" }).min(18).max(80),
  occupation: z.custom<Occupation>((v) => occupationOptions.includes(v as Occupation), { message: "Bitte Beruf wählen" }),
  income: z.string().min(3, "Bitte Einkommen wählen"),
});
const schemaStep2 = z.object({ priorities: z.array(z.string()).min(1, "Bitte mindestens eine Priorität wählen") });
const schemaStep3 = z.object({
  chronic: z.enum(["ja", "nein"], { required_error: "Bitte auswählen" }),
  hospital5y: z.enum(["ja", "nein"], { required_error: "Bitte auswählen" }),
  meds: z.enum(["ja", "nein"], { required_error: "Bitte auswählen" }),
  openFindings: z.enum(["ja", "nein"], { required_error: "Bitte auswählen" }),
  notes: z.string().max(600).optional(),
});
const schemaStep4 = z.object({
  firstName: z.string().min(2, "Bitte Vornamen eingeben"),
  lastName: z.string().min(2, "Bitte Nachnamen eingeben"),
  phone: z.string().min(6, "Bitte Telefonnummer eingeben"),
  email: z.string().email("Bitte gültige E-Mail eingeben"),
  consent: z.literal(true, { errorMap: () => ({ message: "Bitte Einwilligung erteilen" }) }),
});

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.18 } };

function Badge({ color = "gray", children }: { color?: "green" | "yellow" | "red" | "gray"; children: React.ReactNode }) {
  const colorMap: Record<string, string> = { green: "bg-green-100 text-green-700 ring-1 ring-green-300", yellow: "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300", red: "bg-red-100 text-red-700 ring-1 ring-red-300", gray: "bg-gray-100 text-gray-700 ring-1 ring-gray-300" };
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorMap[color]} whitespace-nowrap`}>{children}</span>;
}

// --- Reines Scoring (für UI & Tests) ---
type S1 = z.infer<typeof schemaStep1>;
type S3 = z.infer<typeof schemaStep3>;
function computeScore(s1: S1, s3: S3) {
  let points = 0;
  if (s1.occupation === "Beamter/Beamtin") points += 2;
  if (s1.age >= 18 && s1.age <= 45) points += 1;
  if (s1.occupation === "Angestellt" && !incomeBelow6000(s1.income)) points += 1;
  if (s3.chronic === "ja") points -= 3;
  if (s3.hospital5y === "ja") points -= 2;
  if (s3.meds === "ja") points -= 2;
  if (s3.openFindings === "ja") points -= 2;
  const allHealthy = s3.chronic === "nein" && s3.hospital5y === "nein" && s3.meds === "nein" && s3.openFindings === "nein";
  if (allHealthy) points += 1;
  if (s1.occupation === "Selbstständig" && allHealthy) points += 1;
  return points;
}
function computeBucket(s1: S1, score: number): "green" | "yellow" | "red" {
  if (s1.age > 55) return "red";
  if (s1.occupation === "Angestellt" && incomeBelow6000(s1.income)) return "red";
  if (score >= 2) return "green";
  if (score >= -2) return "yellow";
  return "red";
}

// --- Selbsttests (laufen im Browser; ändern bestehende Logik NICHT) ---
function runSelfTests() {
  const baseS1 = { age: 40, occupation: "Angestellt" as Occupation, income: "6.000–6.999 €" };
  const healthy: S3 = { chronic: "nein", hospital5y: "nein", meds: "nein", openFindings: "nein", notes: "" };
  console.assert(computeBucket({ ...baseS1, age: 56 }, computeScore({ ...baseS1, age: 56 }, healthy)) === "red", "Ü55 muss rot sein");
  console.assert(computeBucket({ age: 40, occupation: "Angestellt", income: "4.000–4.999 €" }, computeScore({ age: 40, occupation: "Angestellt", income: "4.000–4.999 €" } as any, healthy)) === "red", "Angestellt < JAEG muss rot sein");
  console.assert(computeBucket({ age: 30, occupation: "Selbstständig", income: "3.000–3.999 €" }, computeScore({ age: 30, occupation: "Selbstständig", income: "3.000–3.999 €" } as any, healthy)) === "green", "Selbstständig gesund jung sollte grün sein");
  console.assert(computeBucket({ age: 40, occupation: "Beamter/Beamtin", income: "unter 3.000 €" }, computeScore({ age: 40, occupation: "Beamter/Beamtin", income: "unter 3.000 €" } as any, healthy)) === "green", "Beamte gesund sollten grün sein");
}
try { if (typeof window !== "undefined") runSelfTests(); } catch {}

// ======================================
// Haupt-Komponente
// ======================================
export default function PKVHealthCheckLandingPage() {
  // Consent-Banner (technisch notwendige Speicherung der Wahl)
  const [consent, setConsent] = useState<null | "accepted" | "declined">(null);
  useEffect(() => {
    try { const v = localStorage.getItem("consent"); if (v === "accepted" || v === "declined") setConsent(v as any); } catch {}
  }, []);
  function handleConsent(value: "accepted" | "declined") { try { localStorage.setItem("consent", value); } catch {} setConsent(value); }

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [s1, setS1] = useState<z.infer<typeof schemaStep1>>({ age: 30, occupation: "Angestellt", income: incomeOptions[1] });
  const [s2, setS2] = useState<z.infer<typeof schemaStep2>>({ priorities: [] });
  const [s3, setS3] = useState<z.infer<typeof schemaStep3>>({ chronic: "nein", hospital5y: "nein", meds: "nein", openFindings: "nein", notes: "" });
  const [s4, setS4] = useState<z.infer<typeof schemaStep4>>({ firstName: "", lastName: "", phone: "", email: "", consent: false });

  const progress = useMemo(() => ((step - 1) / 4) * 100, [step]);
  const score = useMemo(() => computeScore(s1 as any, s3 as any), [s1, s3]);
  const bucket = useMemo(() => computeBucket(s1 as any, score), [s1, score]);

  const bucketText = {
    green: "Sehr gute Ausgangslage – hohe Chance auf PKV-Zusage (ggf. zu Top-Konditionen)",
    yellow: "Gute Chancen – voraussichtlich mit Rückfragen oder leichtem Zuschlag",
    red: "Eher schwierig – wir prüfen gezielt Alternativen (z. B. Zusatzversicherung/GKV-Option)",
  } as const;

  const overrideReason = useMemo(() => {
    if (s1.age > 55) return "Hinweis: Ab 55 Jahren ist ein Wechsel in die PKV in der Regel nicht mehr möglich (Ausnahmen nur in Sonderfällen).";
    if (s1.occupation === "Angestellt" && incomeBelow6000(s1.income)) return "Hinweis: Als Angestellte/r unterhalb der Versicherungspflichtgrenze (JAEG) besteht GKV-Pflicht – ein Wechsel in die PKV ist grundsätzlich nicht möglich.";
    return null;
  }, [s1]);

  function next<T extends z.ZodTypeAny>(schema: T, data: unknown, target: Step) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) { setError(parsed.error.errors[0]?.message ?? "Bitte Eingaben prüfen"); return; }
    setError(null); setStep(target);
  }
  function prev() { setError(null); setStep((s) => Math.max(1, (s - 1) as Step)); }

  async function handleSubmit() {
    if (bucket === "red") { setError("Terminbuchung ist bei roter Einschätzung nicht möglich."); return; }
    const ok4 = schemaStep4.safeParse(s4); if (!ok4.success) { setError(ok4.error.errors[0]?.message ?? "Bitte Eingaben prüfen"); return; }
    setLoading(true); setError(null);
    const payload = { step1: s1, step2: s2, ...(PRIVACY_MODE ? {} : { step3: s3, scoring: { score, bucket } }), contact: s4, source: typeof window !== "undefined" ? window.location.href : "unknown", timestamp: new Date().toISOString() };
    try {
      // await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      await new Promise((r) => setTimeout(r, 600));
      console.log("Lead gesendet:", payload);
      setSubmitted(true); setStep(5);
    } catch (e) { setError("Es ist ein Fehler aufgetreten. Bitte später erneut versuchen."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="mx-auto max-w-6xl px-6 py-16 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Passt die private Krankenversicherung zu Ihnen?</h1>
            <p className="mt-4 text-gray-600 text-lg">Machen Sie den kostenlosen Gesundheits-Check und erfahren Sie in 2 Minuten, ob eine PKV für Sie möglich und sinnvoll ist.</p>
            <div className="mt-6 flex gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5"/><span>100 % kostenlos & unverbindlich</span></div>
              <div className="flex items-center gap-2"><Lock className="h-5 w-5"/><span>Sicher & DSGVO-konform</span></div>
              <div className="flex items-center gap-2"><Clock className="h-5 w-5"/><span>Schnelle Rückmeldung</span></div>
            </div>
            {PRIVACY_MODE && (
              <p className="mt-3 text-xs text-gray-500">Datenschutzhinweis: Ihre Gesundheitsangaben werden nur <strong>lokal im Browser</strong> ausgewertet und weder gespeichert noch übertragen. Wir erhalten erst nach positivem Vorcheck Ihre Kontaktdaten.</p>
            )}
            <Button className="mt-8" onClick={() => setStep(1)}>
              Jetzt Gesundheits-Check starten <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Card className="shadow-xl border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle>PKV-Gesundheits-Check</CardTitle>
                <div className="mt-2">
                  <Progress value={progress} className="h-2" />
                  <div className="mt-2 text-xs text-gray-500">Schritt {step <= 4 ? step : 4} von 4</div>
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="step1" {...fade} className="space-y-6">
                      <div>
                        <Label>Alter</Label>
                        <select value={s1.age} onChange={(e) => setS1({ ...s1, age: Number(e.target.value) })} className="mt-2 w-full rounded-xl border px-3 py-2" aria-label="Alter">
                          {ageOptions.map((a) => (<option key={a} value={a}>{a}</option>))}
                        </select>
                      </div>
                      <div>
                        <Label>Beruf / Tätigkeit</Label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {occupationOptions.map((o) => (
                            <Button key={o} type="button" variant={s1.occupation === o ? "default" : "secondary"} onClick={() => setS1({ ...s1, occupation: o })} className="justify-start">{o}</Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Bruttoeinkommen / Monat</Label>
                        <select value={s1.income} onChange={(e) => setS1({ ...s1, income: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2" aria-label="Einkommen">
                          {incomeOptions.map((i) => (<option key={i} value={i}>{i}</option>))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">Grundsätzliche Einordnung</div>
                        <Button onClick={() => next(schemaStep1, s1, 2)}>Weiter <ArrowRight className="ml-2 h-4 w-4"/></Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="step2" {...fade} className="space-y-6">
                      <div>
                        <Label>Welche Punkte sind Ihnen besonders wichtig?</Label>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {["Ambulant (freie Arztwahl)", "Stationär (Einbettzimmer)", "Zahnleistungen", "Beitragsstabilität im Alter", "Günstiger Beitrag jetzt"].map((p) => {
                            const active = s2.priorities.includes(p);
                            return (
                              <Button key={p} type="button" variant={active ? "default" : "secondary"} onClick={() => setS2((prev) => ({ ...prev, priorities: active ? prev.priorities.filter((x) => x !== p) : [...prev.priorities, p] }))} className="justify-start">{p}</Button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={prev}><ArrowLeft className="mr-2 h-4 w-4"/>Zurück</Button>
                        <Button onClick={() => next(schemaStep2, s2, 3)}>Weiter <ArrowRight className="ml-2 h-4 w-4"/></Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="step3" {...fade} className="space-y-6">
                      <div className="grid gap-4">
                        <QuestionRow icon={<Stethoscope className="h-4 w-4"/>} label="Chronische Erkrankungen?" value={s3.chronic} onChange={(v) => setS3({ ...s3, chronic: v as any })} />
                        <QuestionRow icon={<Hospital className="h-4 w-4"/>} label="Krankenhaus/OP in den letzten 5 Jahren?" value={s3.hospital5y} onChange={(v) => setS3({ ...s3, hospital5y: v as any })} />
                        <QuestionRow icon={<Pill className="h-4 w-4"/>} label="Dauerhafte Medikamente?" value={s3.meds} onChange={(v) => setS3({ ...s3, meds: v as any })} />
                        <QuestionRow icon={<Info className="h-4 w-4"/>} label="Offene Befunde/Diagnosen?" value={s3.openFindings} onChange={(v) => setS3({ ...s3, openFindings: v as any })} />
                      </div>
                      {PRIVACY_MODE && (<p className="text-xs text-gray-500">Hinweis: Diese Angaben verlassen Ihren Browser nicht. Sie dienen nur der lokalen Einschätzung, ob eine Terminbuchung sinnvoll ist.</p>)}
                      <div>
                        <Label>Sonstige Angaben (optional)</Label>
                        <Textarea className="mt-2" value={s3.notes} onChange={(e) => setS3({ ...s3, notes: e.target.value })} placeholder="Hier können Sie Besonderheiten erläutern (max. 600 Zeichen)"/>
                      </div>
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={prev}><ArrowLeft className="mr-2 h-4 w-4"/>Zurück</Button>
                        <Button onClick={() => {
                          const parsed = schemaStep3.safeParse(s3);
                          if (!parsed.success) { setError(parsed.error.errors[0]?.message ?? "Bitte Eingaben prüfen"); return; }
                          setError(null);
                          if (PRIVACY_MODE) {
                            const hardRed = (s1.age > 55) || (s1.occupation === "Angestellt" && incomeBelow6000(s1.income));
                            if (hardRed || (score < -2)) { setSubmitted(true); setStep(5); return; }
                          }
                          setStep(4);
                        }}>Weiter <ArrowRight className="ml-2 h-4 w-4"/></Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div key="step4" {...fade} className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Vorname" icon={<User className="h-4 w-4"/>}><Input value={s4.firstName} onChange={(e) => setS4({ ...s4, firstName: e.target.value })} placeholder="Max"/></Field>
                        <Field label="Nachname" icon={<User className="h-4 w-4"/>}><Input value={s4.lastName} onChange={(e) => setS4({ ...s4, lastName: e.target.value })} placeholder="Mustermann"/></Field>
                        <Field label="Telefon" icon={<Phone className="h-4 w-4"/>}><Input value={s4.phone} onChange={(e) => setS4({ ...s4, phone: e.target.value })} placeholder="0151 2345678"/></Field>
                        <Field label="E-Mail" icon={<Mail className="h-4 w-4"/>}><Input value={s4.email} onChange={(e) => setS4({ ...s4, email: e.target.value })} placeholder="max@example.de"/></Field>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl border p-3">
                        <Checkbox id="consent" checked={s4.consent} onCheckedChange={(v) => setS4({ ...s4, consent: Boolean(v) })} />
                        <Label htmlFor="consent" className="text-sm leading-5">Ich willige ein, dass meine Angaben zum Zweck einer individuellen Beratung zur privaten Krankenversicherung gespeichert und verarbeitet werden. Eine Weitergabe erfolgt ausschließlich an den ausgewählten Versicherungsmakler. Ich kann meine Einwilligung jederzeit widerrufen.</Label>
                      </div>
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={prev}><ArrowLeft className="mr-2 h-4 w-4"/>Zurück</Button>
                        <Button disabled={loading} onClick={handleSubmit}>{loading ? "Wird gesendet…" : "Kostenlose Einschätzung anfordern"}</Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 5 && (
                    <motion.div key="step5" {...fade} className="space-y-6">
                      <div className="rounded-2xl border p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-500">Vorläufige Einschätzung</div>
                            <div className="text-xl font-semibold">Ihre Ausgangslage</div>
                          </div>
                          <Badge color={bucket}>{bucket.toUpperCase()}</Badge>
                        </div>
                        <p className="mt-3 text-gray-700">{bucketText[bucket]}</p>
                        {bucket === "red" && overrideReason && (<p className="mt-2 text-sm text-gray-600">{overrideReason}</p>)}
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <TrustTile icon={<Shield className="h-5 w-5"/>} title="Persönliche Auswertung" text="Ein Experte prüft Ihre Angaben individuell – keine Weitergabe an Dritte."/>
                        <TrustTile icon={<Clock className="h-5 w-5"/>} title="Schnelle Rückmeldung" text="Sie erhalten i. d. R. innerhalb von 24 Std. eine erste Einschätzung."/>
                        <TrustTile icon={<Lock className="h-5 w-5"/>} title="DSGVO-konform" text="Verschlüsselte Übertragung & Speicherung, widerrufbar jederzeit."/>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="text-sm text-gray-600">Nächste Schritte</div>
                        <ul className="mt-2 list-disc pl-5 text-gray-700">
                          {bucket === "green" && (<><li>Wir berücksichtigen Ihre Leistungswünsche und prüfen mehrere Gesellschaften parallel.</li><li>Sie erhalten konkrete Tarifvorschläge und können direkt einen Beratungstermin buchen.</li></>)}
                          {bucket === "yellow" && (<><li>Wir holen gezielt Risikovoranfragen ein (anonym, ohne Antrag) und klären mögliche Zuschläge.</li><li>Sie bekommen eine transparente Übersicht: Zusage aussichtsreich, mit/ohne Zuschlag.</li></>)}
                          {bucket === "red" && (<><li>Wir prüfen Chancen über anonyme Voranfragen; wenn nicht sinnvoll, zeigen wir Alternativen (z. B. hochwertige Zusatzversicherung).</li><li>So erhalten Sie trotzdem einen starken Gesundheitsschutz – ohne Frust durch Ablehnungen.</li></>)}
                        </ul>
                      </div>
                      {bucket !== "red" ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Button asChild><a href="https://calendly.com/john-neise-vantage-partners/erstgesprach" target="_blank" rel="noopener noreferrer" aria-label="Beratungstermin buchen">Beratungstermin buchen</a></Button>
                          <Button variant="secondary" onClick={() => { setSubmitted(false); setStep(1); }}>Neuen Check starten</Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Button variant="secondary" onClick={() => { setSubmitted(false); setStep(1); }}>Neuen Check starten</Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (<p className="mt-4 text-sm text-red-600" role="alert">{error}</p>)}
                {!submitted && (<p className="mt-6 text-xs text-gray-500">Hinweis: Dieser Check ersetzt keine abschließende Risikoprüfung der Versicherer. Wir nutzen Ihre Angaben für eine erste, realistische Einschätzung und ggf. anonyme Voranfragen.</p>)}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About / Trust */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-3">
          <TrustTile icon={<CheckCircle2 className="h-5 w-5"/>} title="Unabhängige Beratung" text="Wir vergleichen Gesellschaften objektiv und vertreten Ihre Interessen."/>
          <TrustTile icon={<Shield className="h-5 w-5"/>} title="Transparente Einschätzung" text="Klartext statt leere Versprechen – wir sagen ehrlich, was möglich ist."/>
          <TrustTile icon={<Lock className="h-5 w-5"/>} title="Datenschutz first" text="Gesundheitsdaten sind sensibel – wir behandeln sie mit größter Sorgfalt."/>
        </div>
      </section>

      {/* Impressum */}
      <section id="impressum" className="border-t bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold">Impressum</h2>
          <p className="mt-2 text-sm text-gray-600">Angaben gemäß § 5 TMG, § 34d GewO und § 15 VersVermV.</p>
          <div className="mt-6 grid gap-4 text-sm text-gray-700 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Diensteanbieter</h3>
              <p><strong>John Neise - Finanzmakler</strong><br/>Flurweg 11, 07743 Jena<br/>Deutschland</p>
              <p className="mt-2">Telefon: 0163 7362858<br/>E-Mail: <a className="underline" href="mailto:info@john-neise.de">info@john-neise.de</a></p>
            </div>
            <div>
              <h3 className="font-semibold">Vermittlerstatus & Aufsicht</h3>
              <p>Versicherungsvermittlerstatus: <strong>Versicherungsmakler gem. §34d Abs. 1 GewO</strong></p>
              <p className="mt-2">Zuständige Erlaubnis-/Aufsichtsbehörde:<br/>Industrie- und Handelskammer Ostthüringen zu Gera, Gaswerkstraße 23, 07546 Gera</p>
              <p className="mt-2">Registrierungsnummer im Vermittlerregister: <strong>D-JUD5-BM0ZF-37</strong></p>
              <p className="mt-2">Vermittlerregister: <a className="underline" href="https://www.vermittlerregister.info/" target="_blank" rel="noopener noreferrer">www.vermittlerregister.info</a></p>
              <p className="mt-2">Beteiligungen: Keine direkten oder indirekten Beteiligungen von über 10 % an oder durch Versicherungsunternehmen.</p>
            </div>
          </div>
          <div className="mt-6 text-sm text-gray-700">
            <h3 className="font-semibold">Schlichtungsstellen</h3>
            <p>Versicherungsombudsmann e.V., Postfach 08 06 32, 10006 Berlin – <a className="underline" href="https://www.versicherungsombudsmann.de/" target="_blank" rel="noopener noreferrer">www.versicherungsombudsmann.de</a></p>
            <p>Ombudsmann Private Kranken- und Pflegeversicherung, Leipziger Str. 104, 10117 Berlin – <a className="underline" href="https://www.pkv-ombudsmann.de/" target="_blank" rel="noopener noreferrer">www.pkv-ombudsmann.de</a></p>
          </div>
          <div className="mt-6 text-sm text-gray-700">
            <h3 className="font-semibold">Verantwortlich i.S.d. § 18 Abs. 2 MStV</h3>
            <p>John Neise, Flurweg 11 - 07743 Jena</p>
          </div>
        </div>
      </section>

      {/* Datenschutz – Kurzfassung */}
      <section id="datenschutz" className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold">Datenschutzerklärung (Kurzfassung)</h2>
          <p className="mt-2 text-sm text-gray-600">Ausführliche Informationen gehören in eine separate Seite. Diese Kurzfassung deckt die wichtigsten Hinweise ab.</p>
          <div className="mt-6 grid gap-6 text-sm text-gray-700 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Verantwortlicher</h3>
              <p><strong>John Neise</strong><br/>Flurweg 11 - 07743 Jena<br/>E-Mail: <a className="underline" href="mailto:info@john-neise.de">info@john-neise.de</a></p>
              <h3 className="mt-4 font-semibold">Zwecke & Daten</h3>
              <ul className="list-disc pl-5">
                <li>Vorqualifizierung PKV-Interesse (Gesundheitsangaben werden im <strong>Privacy-Mode nur lokal</strong> im Browser ausgewertet).</li>
                <li>Kontaktaufnahme & Terminvereinbarung (Name, E-Mail, Telefon).</li>
                <li>Website-Betrieb (Server-Logs, technisch notwendige Daten).</li>
              </ul>
              <h3 className="mt-4 font-semibold">Rechtsgrundlagen</h3>
              <ul className="list-disc pl-5">
                <li>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für Kontakt/Telefon/E-Mail.</li>
                <li>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) für Sicherheits-/Betriebsdaten.</li>
                <li>Art. 9 Abs. 2 lit. a DSGVO (Einwilligung) <em>nur</em>, sofern Gesundheitsdaten tatsächlich übermittelt/verarbeitet würden (hier im Privacy-Mode nicht).</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Empfänger & Drittlandtransfer</h3>
              <ul className="list-disc pl-5">
                <li>Hosting/Deployment: <strong>IONOS</strong> (ionos.de) bzw. ggf. Vercel als Auftragsverarbeiter.</li>
                <li>Termin-Tool: <strong>Calendly</strong> (calendly.com). Hinweis: möglicher Drittlandtransfer; Absicherung über Standardvertragsklauseln (SCCs).</li>
                <li>Weitere Empfänger (z. B. CRM/Newsletter) nur bei separater Einwilligung.</li>
              </ul>
              <h3 className="mt-4 font-semibold">Speicherdauer</h3>
              <ul className="list-disc pl-5">
                <li>Leaddaten: maximal <strong>14 Tage</strong> (sofern kein Vertragsverhältnis zustande kommt).</li>
                <li>Gesetzliche Aufbewahrungspflichten bleiben unberührt.</li>
              </ul>
              <h3 className="mt-4 font-semibold">Ihre Rechte</h3>
              <ul className="list-disc pl-5">
                <li>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch.</li>
                <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft.</li>
                <li>Beschwerderecht bei der zuständigen Aufsichtsbehörde.</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-xs text-gray-500">Hinweis: Diese Kurzfassung ist eine unverbindliche Vorlage und ersetzt keine Rechtsberatung. Zuständige Datenschutz-Aufsichtsbehörde: <a className="underline" href="https://www.tlfdi.de/" target="_blank" rel="noopener noreferrer">Thüringer Landesbeauftragte für den Datenschutz und die Informationsfreiheit (TLfDI)</a>. Bitte passen Sie die Angaben an Ihre tatsächlichen Prozesse an.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-gray-500">
          <div className="flex flex-col gap-2">
            <div>© {new Date().getFullYear()} – Ihr unabhängiger Finanzmakler</div>
            <div className="flex flex-wrap gap-4">
              <a href="/impressum" className="underline">Impressum</a>
              <a href="/datenschutz" className="underline">Datenschutz</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Consent Banner */}
      {consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur p-4">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">Wir verwenden technisch notwendige Cookies für den Betrieb dieser Seite. Details finden Sie in unserer <a href="/datenschutz" className="underline">Datenschutzerklärung</a>.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => handleConsent("declined")}>Ablehnen</Button>
              <Button onClick={() => handleConsent("accepted")}>Akzeptieren</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================
// Hilfs-UI
// ======================================
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2">
        {icon && <span className="text-gray-500">{icon}</span>}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
function QuestionRow({ label, value, onChange, icon }: { label: string; value: "ja" | "nein"; onChange: (v: "ja" | "nein") => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
      <div className="flex items-center gap-2 text-sm"><span className="text-gray-600">{icon}</span><span>{label}</span></div>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as any)} className="flex gap-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="ja" id={`${label}-ja`} />
          <Label htmlFor={`${label}-ja`}>Ja</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="nein" id={`${label}-nein`} />
          <Label htmlFor={`${label}-nein`}>Nein</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
function TrustTile({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border p-5 shadow-sm">
      <div className="flex items-center gap-2 text-gray-700">{icon}<h3 className="font-semibold">{title}</h3></div>
      <p className="mt-2 text-sm text-gray-600">{text}</p>
    </div>
  );
}
