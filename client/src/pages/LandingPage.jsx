import { motion } from 'motion/react'
import { useEffect } from 'react'
import Button from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { LandingFooter, LandingNav } from '../components/landing/LandingChrome.jsx'
import ProductPreview, { MockAvatars, MockBoard, MockChart, MockProjectCard, MockTaskCard } from '../components/landing/ProductPreview.jsx'
import Reveal from '../components/landing/Reveal.jsx'
import { BRAND } from '../components/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const HIGHLIGHTS = [
  { icon: 'target', label: 'Project planning' },
  { icon: 'tasks', label: 'Task management' },
  { icon: 'users', label: 'Team collaboration' },
  { icon: 'trend', label: 'Progress tracking' },
  { icon: 'shield', label: 'Role-based access' },
]

const FEATURES = [
  {
    icon: 'projects',
    title: 'Project Management',
    text: 'Create projects, assign project managers and monitor progress from one central location.',
    tone: 'from-brand-500 to-violet-500',
  },
  {
    icon: 'tasks',
    title: 'Task Management',
    text: 'Create tasks, assign team members, manage priorities and track completion.',
    tone: 'from-sky-500 to-brand-500',
  },
  {
    icon: 'comment',
    title: 'Team Collaboration',
    text: 'Keep project members connected with shared tasks, comments and clear ownership.',
    tone: 'from-teal-500 to-sky-500',
  },
  {
    icon: 'shield',
    title: 'Role-Based Access',
    text: 'Give administrators, project managers, team members and viewers the right level of access.',
    tone: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: 'trend',
    title: 'Progress Tracking',
    text: 'Monitor active projects, completed tasks, overdue work and overall performance.',
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    icon: 'grid',
    title: 'Organized Workspace',
    text: 'Keep projects, tasks and team information organized in one intuitive platform.',
    tone: 'from-amber-500 to-rose-500',
  },
]

const ROLES = [
  {
    icon: 'shield',
    role: 'Administrators',
    text: 'See every project, create and archive work, assign project managers and manage user accounts.',
  },
  {
    icon: 'projects',
    role: 'Project managers',
    text: 'Run your projects end to end: build the team, plan tasks, assign owners and track deadlines.',
  },
  {
    icon: 'users',
    role: 'Team members',
    text: 'Focus on the tasks assigned to you, update their status and discuss the details in comments.',
  },
  {
    icon: 'eye',
    role: 'Viewers',
    text: 'Follow project progress and status with read-only access. Nothing can be changed by accident.',
  },
]

const STEPS = [
  { icon: 'folder', title: 'Create a project', text: 'Set up your project and define its objectives.' },
  { icon: 'user-plus', title: 'Build your team', text: 'Assign project managers and team members.' },
  { icon: 'tasks', title: 'Organize your tasks', text: 'Break work into manageable tasks and assign ownership.' },
  { icon: 'trend', title: 'Track your progress', text: 'Monitor deadlines, statuses and project completion.' },
]

const TESTIMONIALS = [
  {
    name: 'Alex Morgan',
    role: 'Operations Lead (sample)',
    text: 'Having projects, owners and deadlines in one view means our weekly status meeting takes ten minutes instead of an hour.',
  },
  {
    name: 'Priya Desai',
    role: 'Project Manager (sample)',
    text: 'The board makes it obvious what is blocked and who owns it. My team updates their own tasks, so the picture is always current.',
  },
  {
    name: 'Daniel Okafor',
    role: 'Engineering Manager (sample)',
    text: 'Role-based access was the deciding factor. Stakeholders can follow progress without being able to change anything.',
  },
]

const heroText = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}
const heroLine = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      {eyebrow && <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-base leading-7 text-slate-500">{text}</p>}
    </Reveal>
  )
}

function Hero({ signedIn }) {
  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pt-36 lg:pb-24">
      {/* Soft animated background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 animate-gradient rounded-full bg-[linear-gradient(120deg,rgb(91_75_255/0.22),rgb(56_189_248/0.16),rgb(167_139_250/0.22))] bg-[length:200%_200%] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div className="mx-auto max-w-3xl text-center" variants={heroText} initial="hidden" animate="show">
          <motion.p variants={heroLine} className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1 text-xs font-medium text-brand-700 shadow-sm backdrop-blur">
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            {BRAND.tagline}
          </motion.p>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-[68px] lg:leading-[1.05]">
            <motion.span variants={heroLine} className="block">
              Bring every project.
            </motion.span>
            <motion.span variants={heroLine} className="block">
              Every team.
            </motion.span>
            <motion.span variants={heroLine} className="block bg-gradient-to-r from-brand-600 via-violet-500 to-sky-500 bg-clip-text text-transparent">
              Into one workspace.
            </motion.span>
          </h1>
          <motion.p variants={heroLine} className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {BRAND.name} helps teams plan projects, manage tasks, collaborate seamlessly and track progress — all from one
            beautifully organized workspace.
          </motion.p>
          <motion.div variants={heroLine} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to={signedIn ? '/dashboard' : '/signup'} size="lg" iconRight="arrow" className="w-full shadow-glow sm:w-auto">
              {signedIn ? 'Open your workspace' : 'Get started'}
            </Button>
            <Button href="#product" size="lg" variant="secondary" className="w-full sm:w-auto">
              Explore platform
            </Button>
          </motion.div>
          <motion.p variants={heroLine} className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Icon name="check-circle" className="h-4 w-4 text-emerald-500" />
            Built for teams that want to work smarter.
          </motion.p>
        </motion.div>

        {/* Product showcase with floating cards */}
        <motion.div
          className="relative mx-auto mt-16 max-w-6xl"
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute -inset-x-6 -bottom-6 top-10 -z-10 rounded-[2rem] bg-gradient-to-b from-brand-200/50 to-transparent blur-2xl" aria-hidden="true" />
          <ProductPreview />

          <div className="pointer-events-none absolute -left-10 top-24 hidden w-56 animate-float xl:block" aria-hidden="true">
            <MockTaskCard title="Ship onboarding flow" tag="Mobile App" priority="High" who="Ana Ruiz" progress={80} className="shadow-lift" />
          </div>
          <div className="pointer-events-none absolute -right-10 bottom-20 hidden w-60 animate-float-slow xl:block" aria-hidden="true">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lift">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon name="check" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-slate-800">Task completed</p>
                  <p className="text-[10px] text-slate-400">Homepage hero redesign</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <MockAvatars names={['Mia Chen', 'Lea Novak', 'Sam Lee']} size="h-5 w-5 text-[8px]" />
                <span className="text-[10px] font-medium text-brand-600">+12% this week</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Highlights() {
  return (
    <section className="border-y border-slate-200/70 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-sm font-semibold text-slate-900">Everything your team needs to move forward.</p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {HIGHLIGHTS.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.06}>
              <div className="flex items-center justify-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                <Icon name={item.icon} className="h-5 w-5 text-brand-500" />
                {item.label}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to manage work better."
          text="One platform for planning, assigning, discussing and delivering work, with the right access for every person on the team."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.tone} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}>
                  <Icon name={feature.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{feature.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Solutions() {
  return (
    <section id="solutions" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Solutions"
          title="A workspace shaped around every role."
          text="Each person signs in to a dashboard built for their responsibilities, and only sees the actions they are allowed to take."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((item, i) => (
            <Reveal key={item.role} delay={i * 0.07}>
              <div className="h-full rounded-2xl border border-slate-200 bg-slate-50/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lift">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{item.role}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="How it works" title="From planning to completion, all in one flow." />
        <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
          {/* Connecting line: horizontal on desktop, vertical on mobile */}
          <div className="absolute left-6 top-6 h-[calc(100%-3rem)] w-px bg-gradient-to-b from-brand-300 via-brand-200 to-transparent md:left-[12.5%] md:right-[12.5%] md:h-px md:w-auto md:bg-gradient-to-r" aria-hidden="true">
            <motion.div
              className="h-full w-full origin-top bg-brand-500 md:origin-left"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ opacity: 0.5 }}
            />
          </div>
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={0.15 + i * 0.15} className="relative flex gap-5 md:flex-col md:items-center md:text-center">
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-lift ring-1 ring-brand-100">
                <Icon name={step.icon} className="h-5 w-5" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
              </span>
              <div className="md:mt-5">
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

const SHOWCASE = [
  {
    title: 'Project Dashboard',
    text: 'A live overview of every project you can access: status, progress, owners and what needs attention.',
    points: ['Statistics calculated from your real projects and tasks', 'Progress per project', 'Overdue and upcoming work'],
    preview: (
      <div className="space-y-2.5">
        <MockProjectCard project={{ name: 'Website Redesign', pct: 72, status: 'Active', color: 'bg-emerald-500', team: ['Mia Chen', 'Lea Novak', 'Sam Lee'] }} />
        <MockChart />
      </div>
    ),
  },
  {
    title: 'Task Management Board',
    text: 'Move work across To do, In progress and Done. Every change is checked, so nobody overwrites someone else by accident.',
    points: ['Drag-and-drop status updates', 'Priorities, due dates and owners at a glance', 'Conflict detection for simultaneous edits'],
    preview: <MockBoard />,
  },
  {
    title: 'Team Collaboration',
    text: 'Shared tasks, comment threads and clear ownership keep everyone on the same page.',
    points: ['Comments on every task', 'Project-level team membership', 'Read-only access for stakeholders'],
    preview: (
      <div className="space-y-2.5">
        {[
          { who: 'Mia Chen', text: 'Hero copy is final. Moving this to review.', time: '2m' },
          { who: 'Sam Lee', text: 'Great, I will update the illustrations today.', time: '1m' },
        ].map((c, i) => (
          <div key={c.who} className="flex gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
            <MockAvatars names={[c.who]} size="h-7 w-7 text-[10px]" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-800">
                {c.who} <span className="font-normal text-slate-400">· {c.time} ago</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600">{c.text}</p>
            </div>
            {i === 0 && <Icon name="comment" className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-400" />}
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2.5 text-[11px] text-slate-400">Write a comment…</div>
      </div>
    ),
  },
]

function Showcase() {
  return (
    <section id="product" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="The platform" title="See your work clearly, at every level." />
        <div className="mt-16 space-y-20">
          {SHOWCASE.map((item, i) => (
            <div key={item.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <p className="text-sm font-semibold text-brand-600">0{i + 1}</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-500">{item.text}</p>
                <ul className="mt-6 space-y-3">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <Icon name="check" className="h-3 w-3" />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.1} className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <div className="rounded-3xl bg-gradient-to-br from-brand-50 via-white to-sky-50 p-4 ring-1 ring-slate-200/70 sm:p-8" aria-hidden="true">
                  <div className="transition-transform duration-500 hover:-translate-y-1">{item.preview}</div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section id="testimonials" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Testimonials" title="What teams value in a better workspace." />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex gap-0.5 text-amber-400" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, s) => (
                    <svg key={s} viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-6 text-slate-600">“{item.text}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <MockAvatars names={[item.name]} size="h-9 w-9 text-xs" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Illustrative sample testimonials for design purposes; not statements from real customers.</p>
      </div>
    </section>
  )
}

function CallToAction({ signedIn }) {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#4938e8,#5b4bff,#7c3aed,#4f46e5)] bg-[length:220%_220%] px-6 py-16 text-center shadow-glow animate-gradient sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgb(255_255_255/0.35)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" aria-hidden="true" />
          <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to bring your projects together?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base text-brand-100">Give your team a clearer way to plan, collaborate and deliver.</p>
          <div className="relative mt-8 flex justify-center">
            <Button to={signedIn ? '/dashboard' : '/signup'} variant="white" size="lg" iconRight="arrow">
              {signedIn ? 'Open your workspace' : `Get started with ${BRAND.name}`}
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

// Public marketing homepage at "/".
export default function LandingPage() {
  const { status } = useAuth()
  const signedIn = status === 'authenticated'

  useEffect(() => {
    document.title = `${BRAND.name} · ${BRAND.tagline}`
    // Arriving from another page via "/#features" etc.: scroll once the section exists.
    if (window.location.hash) {
      document.querySelector(window.location.hash)?.scrollIntoView()
    }
  }, [])

  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />
      <main>
        <Hero signedIn={signedIn} />
        <Highlights />
        <Features />
        <Solutions />
        <HowItWorks />
        <Showcase />
        <Testimonials />
        <CallToAction signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  )
}
