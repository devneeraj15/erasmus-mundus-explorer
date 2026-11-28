import Link from "next/link";
import { ArrowRight, BadgeEuro, CalendarClock, ExternalLink, FileCheck2, Globe2, GraduationCap, Plane, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PROGRAMS } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "What is Erasmus Mundus? · Mobility Explorer",
  description: "A plain-language guide to Erasmus Mundus Joint Masters: what they are, who can apply, what the scholarship covers and how to apply.",
};

const OFFICIAL_EMJM = "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters";
const OFFICIAL_CATALOGUE = "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en";

const STEPS = [
  { title: "Shortlist programmes", body: "Browse the catalogue by field, or upload your CV to get your 5 best-fitting programmes. Most people apply to a handful." },
  { title: "Check the entry rules", body: "Each programme sets its own requirements: degree subject, credits (ECTS), grades, English level and sometimes work experience." },
  { title: "Prepare your documents", body: "Usually transcripts, degree certificate (or proof you'll graduate in time), CV, motivation letter, 2 recommendation letters, an English test result and your passport." },
  { title: "Apply on the programme's website", body: "You apply directly to each programme (the consortium of universities), not to the EU. Many programmes charge no application fee." },
  { title: "Selection and results", body: "Applications are scored and some programmes interview. Scholarships go to the top-ranked candidates; others may be offered a self-funded place or a reserve-list spot." },
  { title: "Visa, enrolment and travel", body: "Accept your offer, sign the scholarship agreement, arrange your visa and insurance, and start in the first country of the programme, usually in September." },
];

const FAQ = [
  {
    q: "Is it only for non-Europeans?",
    a: "No. Students from anywhere in the world, including EU countries, can apply. To keep cohorts diverse, the programme limits how many scholarships one programme can give to students of the same nationality.",
  },
  {
    q: "Can I apply if I'm still in my final year?",
    a: "Usually yes. Most programmes accept final-year students as long as you get your degree before the programme starts. Check the exact date each programme asks for.",
  },
  {
    q: "Can I apply to more than one programme?",
    a: "Yes, you can apply to several programmes, each with its own application. Each programme selects independently.",
  },
  {
    q: "I already had an Erasmus Mundus scholarship. Can I get another?",
    a: "No. A student who has already received an Erasmus Mundus Joint Master scholarship can't get a second one, though you may still be admitted as a self-funded student.",
  },
  {
    q: "What if I don't get the scholarship?",
    a: "Many programmes also admit self-funded students, and some offer their own partial scholarships or fee waivers. Those fees and conditions vary a lot, so check each programme.",
  },
  {
    q: "Do I need IELTS or TOEFL?",
    a: "Most programmes are taught in English and ask for a test such as IELTS or TOEFL. Some waive it for native speakers or if your degree was taught in English. The rules differ by programme.",
  },
];

export default function AboutPage() {
  const emjmCount = PROGRAMS.filter((p) => p.program_type === "EMJM").length;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="space-y-4">
        <p className="text-sm font-medium text-primary">Beginner&apos;s guide</p>
        <h1 className="text-3xl font-semibold tracking-tight">What is Erasmus Mundus?</h1>
        <p className="text-lg text-muted-foreground">
          Erasmus Mundus Joint Masters are master&apos;s degrees run together by several universities in different countries and funded by the European
          Union. You study in at least two countries, graduate with a joint or multiple degree, and the best applicants each year receive a full EU
          scholarship.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/cv-match" className={cn(buttonVariants())}>
            Match my CV to programmes <ArrowRight className="size-4" />
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Browse {emjmCount} Joint Masters
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Fact icon={<GraduationCap className="size-5" />} title="One master's, several universities">
          Programmes last 1 to 2 years (60, 90 or 120 ECTS) and are delivered by a consortium of universities, often with companies and research centres as
          partners.
        </Fact>
        <Fact icon={<Plane className="size-5" />} title="Study in at least two countries">
          Mobility is built in: you spend semesters at different partner universities, and many programmes add internships or a thesis abroad.
        </Fact>
        <Fact icon={<BadgeEuro className="size-5" />} title="Full scholarship for top applicants">
          The EU scholarship pays a monthly allowance of €1,400, covers your participation costs (tuition, insurance and other mandatory fees) and
          contributes to travel and installation costs, for the whole programme (up to 24 months).
        </Fact>
        <Fact icon={<Globe2 className="size-5" />} title="Open to the whole world">
          Anyone with a bachelor&apos;s degree, or who is about to finish one, can apply, from any country.
        </Fact>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Who can apply?</h2>
        <Card>
          <CardContent className="space-y-2 p-5 text-sm">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">A first university degree:</span> a bachelor&apos;s degree (or an equivalent qualification recognised in the
                country where you studied). Final-year students can usually apply if they&apos;ll graduate before the start date.
              </li>
              <li>
                <span className="font-medium">A relevant background:</span> each programme lists which degree subjects it accepts. Some also accept related
                fields if you can show the right courses.
              </li>
              <li>
                <span className="font-medium">Language skills:</span> usually English, proven with a test or an accepted waiver.
              </li>
              <li>
                <span className="font-medium">No previous Erasmus Mundus Joint Master scholarship.</span>
              </li>
            </ul>
            <p className="pt-2 text-muted-foreground">
              Want a quick read on where you stand?{" "}
              <Link href="/eligibility" className="font-medium text-primary hover:underline">
                Try the eligibility checker
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">How to apply, step by step</h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-xl border bg-card p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
              <div className="space-y-1">
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Fact icon={<CalendarClock className="size-5" />} title="When to apply">
          Most programmes open applications in the autumn and close between October and March for studies starting the following September. Scholarship
          deadlines are often earlier than self-funded ones.{" "}
          <Link href="/deadlines" className="font-medium text-primary hover:underline">
            See upcoming deadlines
          </Link>
          .
        </Fact>
        <Fact icon={<FileCheck2 className="size-5" />} title="What makes a strong application">
          A clear fit between your degree and the programme, good grades, a specific motivation letter (why this programme, not just any), and strong
          references. Relevant projects, research or work experience help.
        </Fact>
        <Fact icon={<Users className="size-5" />} title="Other EU-funded options">
          This site also lists EIT Master Schools (innovation and entrepreneurship masters), MSCA Doctoral Networks (paid PhD positions) and Erasmus+
          traineeships. They have their own rules and funding.
        </Fact>
        <Fact icon={<GraduationCap className="size-5" />} title="What you graduate with">
          A joint degree issued by the consortium, or degrees from two or more of the partner universities, recognised in the countries that award them.
        </Fact>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Common questions</h2>
        <div className="divide-y rounded-xl border bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90">›</span>
                {f.q}
              </summary>
              <p className="mt-2 pl-5 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Official sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            This page is a plain-language summary of the Erasmus+ rules, not an official EU text. Amounts and rules can change with each call, and each
            programme adds its own requirements, so always confirm on the official pages:
          </p>
          <ul className="space-y-1">
            <li>
              <a href={OFFICIAL_EMJM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                Erasmus+: Erasmus Mundus Joint Masters <ExternalLink className="size-3.5" />
              </a>
            </li>
            <li>
              <a href={OFFICIAL_CATALOGUE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                EACEA: Erasmus Mundus Catalogue <ExternalLink className="size-3.5" />
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 pb-2">
        <span className="text-primary">{icon}</span>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
