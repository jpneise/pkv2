
"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Shield, Lock, Clock, ArrowRight, ArrowLeft, Phone, Mail, User, Stethoscope, Hospital, Pill, Info } from "lucide-react";
import { z } from "zod";

/* Lightweight UI shims (no external UI lib needed) */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "ghost"; asChild?: boolean };
export function Button({ variant = "default", asChild, className = "", children, ...rest }: ButtonProps) {
  const base = "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring disabled:opacity-60";
  const styles = { default: "bg-black text-white hover:opacity-90", secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200", ghost: "bg-transparent text-gray-700 hover:bg-gray-100" } as const;
  const cls = `${base} ${styles[variant]} ${className}`;
  if (asChild && React.isValidElement(children)) {
    // @ts-ignore
    return React.cloneElement(children, { className: `${cls} ${children.props.className ?? ""}` });
  }
  return (<button className={cls} {...rest}>{children}</button>);
}
export function Card({ className = "", children }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`rounded-2xl border ${className}`}>{children}</div>; }
export function CardHeader({ className = "", children }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`p-5 ${className}`}>{children}</div>; }
export function CardTitle({ children }: { children: React.ReactNode }) { return <h2 className="text-xl font-semibold">{children}</h2>; }
export function CardContent({ className = "", children }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`p-5 pt-0 ${className}`}>{children}</div>; }
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`w-full rounded-xl border px-3 py-2 ${props.className ?? ""}`} />; }
export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) { return <label {...props} className={`block text-sm font-medium text-gray-700 ${props.className ?? ""}`} />; }
export function Checkbox({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) { return (<input id={id} type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />); }
const RadioGroupCtx = React.createContext<{ name: string; value?: string; onValueChange: (v: string) => void } | null>(null);
export function RadioGroup({ value, onValueChange, className = "", children }: { value?: string; onValueChange: (v: string) => void; className?: string; children: React.ReactNode }) {
  const name = useMemo(() => `rg-${Math.random().toString(36).slice(2)}`,[/* no deps */]);
  return (<RadioGroupCtx.Provider value={{ name, value, onValueChange }}><div className={className}>{children}</div></RadioGroupCtx.Provider>);
}
export function RadioGroupItem({ value, id }: { value: string; id?: string }) {
  const ctx = React.useContext(RadioGroupCtx); if (!ctx) return null;
  return (<input id={id} type="radio" name={ctx.name} value={value} checked={ctx.value === value} onChange={() => ctx.onValueChange(value)} className="h-4 w-4 border-gray-300" />);
}
export function Progress({ value = 0, className = "" }: { value?: number; className?: string }) { return (<div className={`w-full overflow-hidden rounded-full bg-gray-100 ${className}`}><div className="h-2 rounded-full bg-black" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>); }
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`w-full rounded-xl border px-3 py-2 ${props.className ?? ""}`} />; }

/** App **/
const PRIVACY_MODE = true;
const ageOptions = Array.from({ length: 63 }, (_, i) => 18 + i);
const incomeOptions = ["unter 3.000 €","3.000–3.999 €","4.000–4.999 €","5.000–5.999 €","6.000–6.999 €","7.000–7.999 €","8.000 € oder mehr"];
const occupationOptions = ["Angestellt", "Selbstständig", "Beamter/Beamtin", "Student/in", "Sonstiges"] as const;
function incomeBelow6000(income: string){ return new Set(["unter 3.000 €","3.000–3.999 €","4.000–4.999 €","5.000–5.999 €"]).has(income); }
function incomeAtLeast6000(income: string){ return !incomeBelow6000(income); }
type Occupation = typeof occupationOptions[number];
type Step = 1|2|3|4|5;
const schemaStep1 = z.object({ age: z.number().min(18).max(80), occupation: z.custom<Occupation>((v)=>occupationOptions.includes(v as Occupation)), income: z.string().min(3)});
const schemaStep2 = z.object({ priorities: z.array(z.string()).min(1) });
const schemaStep3 = z.object({ chronic: z.enum(["ja","nein"]), hospital5y: z.enum(["ja","nein"]), meds: z.enum(["ja","nein"]), openFindings: z.enum(["ja","nein"]), notes: z.string().max(600).optional() });
const schemaStep4 = z.object({ firstName: z.string().min(2), lastName: z.string().min(2), phone: z.string().min(6), email: z.string().email(), consent: z.literal(true) });
const fade = { initial:{opacity:0,y:10}, animate:{opacity:1,y:0}, exit:{opacity:0,y:-10}, transition:{duration:0.18} };
function Badge({ color = "gray", children }: { color?: "green"|"yellow"|"red"|"gray"; children: React.ReactNode }) {
  const colorMap: Record<string,string> = { green:"bg-green-100 text-green-700 ring-1 ring-green-300", yellow:"bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300", red:"bg-red-100 text-red-700 ring-1 ring-red-300", gray:"bg-gray-100 text-gray-700 ring-1 ring-gray-300" };
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorMap[color]} whitespace-nowrap`}>{children}</span>;
}
export default function Page(){
  const [step,setStep] = useState<Step>(1);
  const [loading,setLoading] = useState(false);
  const [submitted,setSubmitted] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [s1,setS1] = useState({ age:30, occupation:"Angestellt", income: incomeOptions[1] });
  const [s2,setS2] = useState({ priorities: [] as string[] });
  const [s3,setS3] = useState({ chronic:"nein", hospital5y:"nein", meds:"nein", openFindings:"nein", notes:"" });
  const [s4,setS4] = useState({ firstName:"", lastName:"", phone:"", email:"", consent:false });
  const progress = useMemo(()=>((step-1)/4)*100,[step]);
  const score = useMemo(()=>{
    let points = 0;
    if (s1.occupation === "Beamter/Beamtin") points += 2;
    if (s1.age >= 18 && s1.age <= 45) points += 1;
    if (s1.occupation === "Angestellt" && incomeAtLeast6000(s1.income)) points += 1;
    if (s3.chronic === "ja") points -= 3;
    if (s3.hospital5y === "ja") points -= 2;
    if (s3.meds === "ja") points -= 2;
    if (s3.openFindings === "ja") points -= 2;
    const allHealthy = s3.chronic==="nein" && s3.hospital5y==="nein" && s3.meds==="nein" && s3.openFindings==="nein";
    if (allHealthy) points += 1;
    if (s1.occupation === "Selbstständig" && allHealthy) points += 1;
    return points;
  },[s1,s3]);
  const bucket = useMemo(()=>"red" as "red"|"yellow"|"green",[]);
  // override: implement full logic
  const _bucket = useMemo(()=>{
    if (s1.age > 55) return "red";
    if (s1.occupation === "Angestellt" && incomeBelow6000(s1.income)) return "red";
    if (score >= 2) return "green";
    if (score >= -2) return "yellow";
    return "red";
  },[score, s1]);
  const bucketText = { green:"Sehr gute Ausgangslage – hohe Chance auf PKV-Zusage (ggf. zu Top-Konditionen)", yellow:"Gute Chancen – voraussichtlich mit Rückfragen oder leichtem Zuschlag", red:"Eher schwierig – wir prüfen gezielt Alternativen (z. B. Zusatzversicherung/GKV-Option)" };
  const overrideReason = useMemo(()=>{
    if (s1.age > 55) return "Hinweis: Ab 55 Jahren ist ein Wechsel in die PKV in der Regel nicht mehr möglich (Ausnahmen nur in Sonderfällen).";
    if (s1.occupation === "Angestellt" && incomeBelow6000(s1.income)) return "Hinweis: Als Angestellte/r unterhalb der Versicherungspflichtgrenze (JAEG) besteht GKV-Pflicht – ein Wechsel in die PKV ist grundsätzlich nicht möglich.";
    return null;
  },[s1]);
  function next(schema:any, data:any, target:Step){
    const parsed = schema.safeParse(data); if(!parsed.success){ setError(parsed.error.errors[0]?.message ?? "Bitte Eingaben prüfen"); return; }
    setError(null); setStep(target);
  }
  function prev(){ setError(null); setStep(s=>Math.max(1,(s-1) as Step)); }
  async function handleSubmit(){
    if (_bucket === "red"){ setError("Terminbuchung ist bei roter Einschätzung nicht möglich."); return; }
    // validate
    const ok4 = schemaStep4.safeParse(s4); if(!ok4.success){ setError(ok4.error.errors[0]?.message ?? "Bitte Eingaben prüfen"); return; }
    setLoading(True:=False)
  }
  return (<div className="min-h-screen bg-white p-6">Bitte nutze den Code aus der Canvas-Version. Diese Exportdatei dient nur als Platzhalter.</div>)
}
