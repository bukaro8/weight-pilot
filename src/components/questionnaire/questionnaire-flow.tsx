"use client";

import {ArrowLeft, ArrowRight, Check, Clock3, LoaderCircle, LockKeyhole, Pencil, Send, ShieldCheck} from "lucide-react";
import {useTranslations} from "next-intl";
import {useCallback, useEffect, useRef, useState, type FormEvent} from "react";

import {Button} from "@/components/ui/button";
import {calculateBmi, calculateTargetLossPercentage} from "@/features/questionnaire/calculations";
import type {QuestionnaireData} from "@/features/questionnaire/types";
import {imperialHeightToCm, imperialWeightToKg, metricHeightToImperial, metricWeightToImperial, type MeasurementSystem} from "@/features/questionnaire/units";
import {aboutYouStepSchema, goalStepSchema, healthConditionOptions, questionnaireSubmissionSchema, sexOptions, type HealthCondition, type QuestionnaireDraftInput, type SexAssignedAtBirth} from "@/features/questionnaire/validation";
import {onBeforeLocaleChange} from "@/lib/draft-events";
import {cn} from "@/lib/utils";
import {useRouter} from "@/i18n/navigation";

type AnswersState = {
  measurementSystem: MeasurementSystem; age: string; sexAssignedAtBirth: SexAssignedAtBirth | null; heightCm: string; currentWeightKg: string;
  targetWeightKg: string; healthConditions: HealthCondition[]; medications: string; noMedication: boolean;
};
type SaveState = "saved" | "saving" | "unsaved" | "error";

const fieldClassName = "h-13 w-full rounded-xl border border-border bg-background px-4 text-base text-primary-dark shadow-[0_2px_8px_rgba(30,58,95,0.03)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted/60 focus:border-primary/45 focus:bg-surface focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPayload(id: string, answers: AnswersState, currentStep: number): QuestionnaireDraftInput {
  return {
    questionnaireId: id,
    currentStep,
    measurementSystem: answers.measurementSystem,
    age: nullableNumber(answers.age),
    sexAssignedAtBirth: answers.sexAssignedAtBirth,
    heightCm: nullableNumber(answers.heightCm),
    currentWeightKg: nullableNumber(answers.currentWeightKg),
    targetWeightKg: nullableNumber(answers.targetWeightKg),
    healthConditions: answers.healthConditions,
    medications: answers.noMedication ? null : answers.medications.trim() || null,
    noMedication: answers.noMedication,
  };
}

export function QuestionnaireFlow({initialQuestionnaire}: {initialQuestionnaire: QuestionnaireData}) {
  const t = useTranslations("questionnaire");
  const router = useRouter();
  const [questionnaire, setQuestionnaire] = useState(initialQuestionnaire);
  const [step, setStep] = useState(Math.min(Math.max(initialQuestionnaire.currentStep, 1), 5));
  const [answers, setAnswers] = useState<AnswersState>({
    measurementSystem: initialQuestionnaire.measurementSystem,
    age: initialQuestionnaire.age?.toString() ?? "",
    sexAssignedAtBirth: initialQuestionnaire.sexAssignedAtBirth,
    heightCm: initialQuestionnaire.heightCm?.toString() ?? "",
    currentWeightKg: initialQuestionnaire.currentWeightKg?.toString() ?? "",
    targetWeightKg: initialQuestionnaire.targetWeightKg?.toString() ?? "",
    healthConditions: initialQuestionnaire.healthConditions,
    medications: initialQuestionnaire.medications ?? "",
    noMedication: initialQuestionnaire.noMedication,
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const questionnaireId = questionnaire.id;
  const questionnaireStatus = questionnaire.status;
  const answersRef = useRef(answers);
  const stepRef = useRef(step);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const requestNumberRef = useRef(0);
  const changeVersionRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { stepRef.current = step; }, [step]);

  const persist = useCallback((override?: QuestionnaireDraftInput) => {
    if (questionnaireStatus !== "DRAFT") return Promise.resolve(undefined);
    const payload = override ?? toPayload(questionnaireId, answersRef.current, stepRef.current);
    const requestNumber = ++requestNumberRef.current;
    const changeVersion = changeVersionRef.current;
    setSaveState("saving");
    const task = saveQueueRef.current.catch(() => undefined).then(async () => {
      const response = await fetch("/api/questionnaire", {
        method: "PATCH", headers: {"content-type": "application/json"},
        body: JSON.stringify(payload), keepalive: true,
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      const body = await response.json() as {questionnaire: QuestionnaireData};
      setQuestionnaire(body.questionnaire);
      return body.questionnaire;
    });
    saveQueueRef.current = task;
    void task.then(() => {
      if (requestNumber === requestNumberRef.current) setSaveState(changeVersion === changeVersionRef.current ? "saved" : "unsaved");
    }).catch(() => {
      if (requestNumber === requestNumberRef.current) setSaveState("error");
    });
    return task;
  }, [questionnaireId, questionnaireStatus]);

  useEffect(() => {
    if (questionnaire.status !== "DRAFT") return;
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setSaveState("unsaved");
    const timer = window.setTimeout(() => { void persist(); }, 650);
    return () => window.clearTimeout(timer);
  }, [answers, step, persist, questionnaire.status]);

  useEffect(() => onBeforeLocaleChange(() => persist()), [persist]);
  useEffect(() => {
    const saveBeforeLeaving = () => { void persist(); };
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => window.removeEventListener("pagehide", saveBeforeLeaving);
  }, [persist]);

  const update = <K extends keyof AnswersState>(key: K, value: AnswersState[K]) => {
    changeVersionRef.current += 1;
    setMessage(undefined);
    setAnswers((current) => ({...current, [key]: value}));
  };

  const goToStep = (nextStep: number) => {
    changeVersionRef.current += 1;
    setStep(nextStep);
    setMessage(undefined);
  };

  function validateStep(currentStep: number) {
    const payload = toPayload(questionnaire.id, answers, currentStep);
    if (currentStep === 1 && !aboutYouStepSchema.safeParse(payload).success) return t("errors.aboutYou");
    if (currentStep === 2 && !goalStepSchema.safeParse(payload).success) return t("errors.goal");
    if (currentStep === 3 && payload.healthConditions.length === 0) return t("errors.health");
    if (currentStep === 4 && payload.medications && payload.medications.length > 2000) return t("errors.medicationLength");
    return undefined;
  }

  async function continueTo(nextStep: number) {
    const validationMessage = validateStep(step);
    if (validationMessage) { setMessage(validationMessage); return; }
    setMessage(undefined);
    const next = Math.min(5, nextStep);
    goToStep(next);
    try { await persist(toPayload(questionnaire.id, answers, next)); }
    catch { setMessage(t("errors.save")); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = toPayload(questionnaire.id, answers, 5);
    if (!questionnaireSubmissionSchema.safeParse(payload).success) { setMessage(t("errors.review")); return; }
    setSubmitting(true); setMessage(undefined);
    try {
      await persist(payload);
      const response = await fetch("/api/questionnaire", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({questionnaireId: questionnaire.id})});
      if (!response.ok) throw new Error("SUBMIT_FAILED");
      const body = await response.json() as {questionnaire: QuestionnaireData};
      setQuestionnaire(body.questionnaire);
      setSaveState("saved");
      router.replace("/consultations/results");
    } catch { setMessage(t("errors.submit")); } finally { setSubmitting(false); }
  }

  if (questionnaire.status === "SUBMITTED") return <SubmissionLoading/>;

  const toggleHealth = (option: HealthCondition) => {
    const exclusive = option === "NONE" || option === "NOT_SURE";
    if (exclusive) {
      update("healthConditions", answers.healthConditions.includes(option) ? [] : [option]);
      return;
    }
    const withoutExclusive = answers.healthConditions.filter((item) => item !== "NONE" && item !== "NOT_SURE");
    update("healthConditions", withoutExclusive.includes(option) ? withoutExclusive.filter((item) => item !== option) : [...withoutExclusive, option]);
  };

  return (
    <main id="main-content" className="relative flex-1 overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-pale-blush/65"/>
      <div className="mx-auto max-w-5xl">
        <header className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-hover">{t("eyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-primary-dark sm:text-5xl">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-muted">{t("intro")}</p></div>
          <SaveIndicator state={saveState}/>
        </header>

        <Progress current={step}/>

        <form onSubmit={submit} className="mt-6 rounded-[1.5rem] border border-primary/10 bg-surface p-5 shadow-[0_22px_65px_rgba(20,42,71,0.09)] min-[375px]:p-6 sm:p-9 lg:p-11">
          {(step === 1 || step === 2 || step === 5) && <MeasurementToggle value={answers.measurementSystem} onChange={(value) => update("measurementSystem", value)}/>} 
          {step === 1 && <StepAbout answers={answers} update={update}/>} 
          {step === 2 && <StepGoal answers={answers} update={update}/>} 
          {step === 3 && <StepHealth selected={answers.healthConditions} toggle={toggleHealth}/>} 
          {step === 4 && <StepMedication answers={answers} update={update}/>} 
          {step === 5 && <Review answers={answers} onEdit={goToStep}/>} 

          <div className="mt-8 min-h-6" aria-live="polite">{message && <p className="rounded-xl bg-pale-blush px-4 py-3 text-sm font-semibold leading-6 text-red-900" role="alert">{message}</p>}</div>
          <div className="mt-4 flex flex-col-reverse gap-3 border-t border-border pt-6 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            {step > 1 ? <Button type="button" variant="secondary" size="large" onClick={() => goToStep(step - 1)} className="w-full min-[420px]:w-auto"><ArrowLeft className="mr-2" aria-hidden="true" size={18}/>{t("previous")}</Button> : <span/>}
            {step < 5 ? <Button type="button" size="large" onClick={() => void continueTo(step + 1)} className="w-full min-[420px]:w-auto">{t("continue")}<ArrowRight className="ml-2" aria-hidden="true" size={18}/></Button> : <Button type="submit" size="large" disabled={submitting} className="w-full min-[420px]:w-auto">{submitting ? <LoaderCircle className="mr-2 animate-spin" aria-hidden="true" size={18}/> : <Send className="mr-2" aria-hidden="true" size={18}/>} {submitting ? t("submitting") : t("submit")}</Button>}
          </div>
        </form>
        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-muted"><LockKeyhole className="mr-1.5 inline text-primary" aria-hidden="true" size={14}/>{t("privacyNote")}</p>
      </div>
    </main>
  );
}

function Progress({current}: {current: number}) {
  const t = useTranslations("questionnaire");
  return <section className="mt-8 rounded-2xl border border-primary/10 bg-surface/90 px-4 py-4 shadow-sm sm:mt-10 sm:px-6" aria-label={t("progressLabel")}>
    <div className="flex items-center justify-between gap-4"><p className="text-sm font-semibold text-primary">{t("stepCount", {current, total: 5})}</p><p className="text-xs text-muted">{t(`steps.${current}`)}</p></div>
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist-blue"><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{width: `${current * 20}%`}}/></div>
    <ol className="mt-3 hidden grid-cols-5 gap-2 text-center text-[0.6875rem] font-semibold text-muted sm:grid">{[1,2,3,4,5].map((item) => <li key={item} className={cn(item <= current && "text-primary")}>{t(`steps.${item}`)}</li>)}</ol>
  </section>;
}

function SaveIndicator({state}: {state: SaveState}) {
  const t = useTranslations("questionnaire.save");
  const Icon = state === "saving" ? LoaderCircle : state === "saved" ? Check : state === "error" ? ShieldCheck : Clock3;
  return <div className={cn("inline-flex min-h-11 w-fit items-center gap-2 rounded-full border px-4 text-sm font-semibold", state === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-primary/10 bg-surface text-muted")} role="status"><Icon className={cn("text-primary", state === "saving" && "animate-spin")} aria-hidden="true" size={17}/>{t(state)}</div>;
}

function SectionHeading({eyebrow, title, body}: {eyebrow: string; title: string; body: string}) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-hover">{eyebrow}</p><h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-primary-dark sm:text-4xl">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">{body}</p></div>;
}

function NumberField({id, label, value, onChange, unit, integer = false, min = 0}: {id: string; label: string; value: string; onChange: (value: string) => void; unit?: string; integer?: boolean; min?: number}) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-primary-dark">{label}</label><div className="relative"><input id={id} type="number" inputMode={integer ? "numeric" : "decimal"} min={min} step={integer ? 1 : 0.1} value={value} onChange={(event) => onChange(event.target.value)} className={cn(fieldClassName, unit && "pr-14")} required/><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-muted">{unit}</span></div></div>;
}

function MeasurementToggle({value, onChange}: {value: MeasurementSystem; onChange: (value: MeasurementSystem) => void}) {
  const t = useTranslations("questionnaire.units");
  return <fieldset className="mb-7"><legend className="mb-2 text-sm font-semibold text-primary-dark">{t("label")}</legend><div className="inline-grid w-full grid-cols-2 rounded-full border border-primary/15 bg-background p-1 sm:w-auto sm:min-w-64">{(["METRIC", "IMPERIAL"] as const).map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={cn("min-h-11 rounded-full px-5 text-sm font-bold transition-[color,background-color,box-shadow] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", value === option ? "bg-primary text-white shadow-sm" : "text-primary hover:bg-mist-blue")}>{t(option.toLowerCase())}</button>)}</div></fieldset>;
}

function numericPart(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function ImperialHeightField({valueCm, onChange}: {valueCm: string; onChange: (value: string) => void}) {
  const t = useTranslations("questionnaire.units");
  const value = nullableNumber(valueCm);
  const imperial = value === null ? {feet: "", inches: ""} : metricHeightToImperial(value);
  const setValue = (feet: string | number, inches: string | number) => onChange(String(imperialHeightToCm(numericPart(String(feet)), numericPart(String(inches)))));
  return <fieldset><legend className="mb-2 text-sm font-semibold text-primary-dark">{t("height")}</legend><div className="grid grid-cols-2 gap-3"><NumberField id="height-feet" label={t("feet")} value={String(imperial.feet)} onChange={(feet) => setValue(feet, imperial.inches)} unit={t("feetShort")} integer/><NumberField id="height-inches" label={t("inches")} value={String(imperial.inches)} onChange={(inches) => setValue(imperial.feet, inches)} unit={t("inchesShort")} integer/></div></fieldset>;
}

function ImperialWeightField({id, label, valueKg, onChange}: {id: string; label: string; valueKg: string; onChange: (value: string) => void}) {
  const t = useTranslations("questionnaire.units");
  const value = nullableNumber(valueKg);
  const imperial = value === null ? {stones: "", pounds: ""} : metricWeightToImperial(value);
  const setValue = (stones: string | number, pounds: string | number) => onChange(String(imperialWeightToKg(numericPart(String(stones)), numericPart(String(pounds)))));
  return <fieldset><legend className="mb-2 text-sm font-semibold text-primary-dark">{label}</legend><div className="grid grid-cols-2 gap-3"><NumberField id={`${id}-stones`} label={t("stones")} value={String(imperial.stones)} onChange={(stones) => setValue(stones, imperial.pounds)} unit={t("stonesShort")} integer/><NumberField id={`${id}-pounds`} label={t("pounds")} value={String(imperial.pounds)} onChange={(pounds) => setValue(imperial.stones, pounds)} unit={t("poundsShort")} integer/></div></fieldset>;
}

function StepAbout({answers, update}: {answers: AnswersState; update: <K extends keyof AnswersState>(key: K, value: AnswersState[K]) => void}) {
  const t = useTranslations("questionnaire");
  return <section><SectionHeading eyebrow={t("about.eyebrow")} title={t("about.title")} body={t("about.body")}/><div className="mt-7 grid gap-5 sm:grid-cols-2"><NumberField id="age" label={t("about.age")} value={answers.age} onChange={(value) => update("age", value)} integer min={18}/>{answers.measurementSystem === "METRIC" ? <NumberField id="height" label={t("about.height")} value={answers.heightCm} onChange={(value) => update("heightCm", value)} unit="cm"/> : <ImperialHeightField valueCm={answers.heightCm} onChange={(value) => update("heightCm", value)}/>}<div className="sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]">{answers.measurementSystem === "METRIC" ? <NumberField id="current-weight" label={t("about.currentWeight")} value={answers.currentWeightKg} onChange={(value) => update("currentWeightKg", value)} unit="kg"/> : <ImperialWeightField id="current-weight" label={t("about.currentWeight")} valueKg={answers.currentWeightKg} onChange={(value) => update("currentWeightKg", value)}/>}</div><fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-semibold text-primary-dark">{t("about.sex")}</legend><div className="grid gap-2 min-[420px]:grid-cols-2 sm:grid-cols-4">{sexOptions.map((option) => <button type="button" key={option} aria-pressed={answers.sexAssignedAtBirth === option} onClick={() => update("sexAssignedAtBirth", option)} className={choiceClass(answers.sexAssignedAtBirth === option)}>{answers.sexAssignedAtBirth === option && <Check aria-hidden="true" size={17}/>}<span>{t(`sex.${option}`)}</span></button>)}</div></fieldset></div></section>;
}

function StepGoal({answers, update}: {answers: AnswersState; update: <K extends keyof AnswersState>(key: K, value: AnswersState[K]) => void}) {
  const t = useTranslations("questionnaire");
  return <section><SectionHeading eyebrow={t("goal.eyebrow")} title={t("goal.title")} body={t("goal.body")}/><div className="mt-7 max-w-md">{answers.measurementSystem === "METRIC" ? <NumberField id="target-weight" label={t("goal.targetWeight")} value={answers.targetWeightKg} onChange={(value) => update("targetWeightKg", value)} unit="kg"/> : <ImperialWeightField id="target-weight" label={t("goal.targetWeight")} valueKg={answers.targetWeightKg} onChange={(value) => update("targetWeightKg", value)}/>}<p className="mt-3 text-xs leading-5 text-muted">{t("goal.hint")}</p></div></section>;
}

function choiceClass(selected: boolean) {
  return cn("flex min-h-13 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center text-sm font-semibold leading-5 transition-[color,background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", selected ? "border-primary bg-primary text-white shadow-[0_8px_20px_rgba(30,58,95,0.14)]" : "border-primary/15 bg-background text-primary-dark hover:border-primary/35 hover:bg-mist-blue");
}

function StepHealth({selected, toggle}: {selected: HealthCondition[]; toggle: (option: HealthCondition) => void}) {
  const t = useTranslations("questionnaire");
  return <section><SectionHeading eyebrow={t("health.eyebrow")} title={t("health.title")} body={t("health.body")}/><div className="mt-7 grid gap-2 sm:grid-cols-2">{healthConditionOptions.map((option) => <button type="button" key={option} aria-pressed={selected.includes(option)} onClick={() => toggle(option)} className={cn(choiceClass(selected.includes(option)), "justify-start text-left")}>{selected.includes(option) && <Check className="shrink-0" aria-hidden="true" size={18}/>}<span>{t(`conditions.${option}`)}</span></button>)}</div><p className="mt-4 text-xs leading-5 text-muted">{t("health.exclusiveHint")}</p></section>;
}

function StepMedication({answers, update}: {answers: AnswersState; update: <K extends keyof AnswersState>(key: K, value: AnswersState[K]) => void}) {
  const t = useTranslations("questionnaire");
  return <section><SectionHeading eyebrow={t("medication.eyebrow")} title={t("medication.title")} body={t("medication.body")}/><div className="mt-7"><label htmlFor="medications" className="mb-2 block text-sm font-semibold text-primary-dark">{t("medication.label")}</label><textarea id="medications" rows={5} maxLength={2000} value={answers.medications} onChange={(event) => update("medications", event.target.value)} disabled={answers.noMedication} placeholder={t("medication.placeholder")} className={cn(fieldClassName, "h-auto min-h-32 resize-y py-3 leading-6")}/><p className="mt-2 text-right text-xs text-muted">{answers.medications.length}/2000</p><label className="mt-4 flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border border-primary/15 bg-background px-4 py-3 text-sm font-semibold text-primary-dark transition-colors hover:bg-mist-blue"><input type="checkbox" checked={answers.noMedication} onChange={(event) => {update("noMedication", event.target.checked); if (event.target.checked) update("medications", "");}} className="size-5 rounded border-primary/30 accent-primary"/><span>{t("medication.none")}</span></label></div></section>;
}

function Review({answers, onEdit}: {answers: AnswersState; onEdit?: (step: number) => void}) {
  const t = useTranslations("questionnaire");
  const payload = toPayload("00000000-0000-0000-0000-000000000000", answers, 5);
  const bmi = payload.currentWeightKg && payload.heightCm ? calculateBmi(payload.currentWeightKg, payload.heightCm) : null;
  const loss = payload.currentWeightKg && payload.targetWeightKg ? calculateTargetLossPercentage(payload.currentWeightKg, payload.targetWeightKg) : null;
  const formatHeight = (value: number | null) => value === null ? t("review.notProvided") : payload.measurementSystem === "METRIC" ? `${value} cm` : (() => {const imperial = metricHeightToImperial(value); return t("units.heightValue", imperial);})();
  const formatWeight = (value: number | null) => value === null ? t("review.notProvided") : payload.measurementSystem === "METRIC" ? `${value} kg` : (() => {const imperial = metricWeightToImperial(value); return t("units.weightValue", imperial);})();
  return <section><SectionHeading eyebrow={t("review.eyebrow")} title={t("review.title")} body={t("review.body")}/><div className="mt-7 grid gap-4">
    <ReviewCard title={t("review.aboutTitle")} step={1} onEdit={onEdit}><ReviewRow label={t("about.age")} value={payload.age ? t("review.years", {value: payload.age}) : t("review.notProvided")}/><ReviewRow label={t("about.sex")} value={payload.sexAssignedAtBirth ? t(`sex.${payload.sexAssignedAtBirth}`) : t("review.notProvided")}/><ReviewRow label={t("about.height")} value={formatHeight(payload.heightCm)}/><ReviewRow label={t("about.currentWeight")} value={formatWeight(payload.currentWeightKg)}/></ReviewCard>
    <ReviewCard title={t("review.goalTitle")} step={2} onEdit={onEdit}><ReviewRow label={t("goal.targetWeight")} value={formatWeight(payload.targetWeightKg)}/><ReviewRow label={t("review.bmi")} value={bmi?.toFixed(1) ?? t("review.notAvailable")}/><ReviewRow label={t("review.targetLoss")} value={loss !== null ? `${loss.toFixed(1)}%` : t("review.notAvailable")}/></ReviewCard>
    <ReviewCard title={t("review.healthTitle")} step={3} onEdit={onEdit}><p className="text-sm leading-6 text-muted">{payload.healthConditions.length ? payload.healthConditions.map((item) => t(`conditions.${item}`)).join(", ") : t("review.notProvided")}</p></ReviewCard>
    <ReviewCard title={t("review.medicationTitle")} step={4} onEdit={onEdit}><p className="whitespace-pre-wrap text-sm leading-6 text-muted">{payload.noMedication ? t("medication.none") : payload.medications || t("review.notProvided")}</p></ReviewCard>
  </div><div className="mt-6 rounded-2xl bg-primary-dark p-5 text-white sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-accent" aria-hidden="true" size={22}/><div><h3 className="font-display text-xl font-semibold">{t("review.guidanceTitle")}</h3><p className="mt-2 text-sm leading-6 text-white/80">{t("review.guidanceBody")}</p></div></div></div></section>;
}

function ReviewCard({title, step, onEdit, children}: {title: string; step: number; onEdit?: (step: number) => void; children: React.ReactNode}) {
  const t = useTranslations("questionnaire");
  return <section className="rounded-2xl border border-border bg-background p-5"><div className="flex items-center justify-between gap-4"><h3 className="font-display text-xl font-semibold text-primary-dark">{title}</h3>{onEdit && <button type="button" onClick={() => onEdit(step)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil aria-hidden="true" size={15}/>{t("review.edit")}</button>}</div><div className="mt-4 space-y-3">{children}</div></section>;
}

function ReviewRow({label, value}: {label: string; value: string}) {
  return <div className="grid gap-1 text-sm min-[420px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] min-[420px]:gap-4"><span className="font-semibold text-primary-dark">{label}</span><span className="text-muted min-[420px]:text-right">{value}</span></div>;
}

function SubmissionLoading() {
  const t = useTranslations("questionnaire");
  return <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-16"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" size={32}/><p className="mt-4 font-semibold text-primary-dark" role="status">{t("submitted.loading")}</p></div></main>;
}
