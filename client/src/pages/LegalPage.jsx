import { useEffect } from 'react'
import Button from '../components/Button.jsx'
import { LandingFooter, LandingNav } from '../components/landing/LandingChrome.jsx'
import { BRAND } from '../components/Logo.jsx'

const CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    intro: `This page is a placeholder for the ${BRAND.name} privacy policy.`,
    points: [
      'The policy must be written and reviewed before the product is offered to customers.',
      'In this installation, data is stored in the local PostgreSQL database configured by your administrator.',
      'Sessions use an HttpOnly cookie; passwords are stored only as bcrypt hashes.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro: `This page is a placeholder for the ${BRAND.name} terms of service.`,
    points: [
      'The terms must be written and reviewed before the product is offered to customers.',
      'Access to a workspace is granted by its administrator.',
    ],
  },
}

// /privacy and /terms: honest placeholders linked from the footer.
export default function LegalPage({ kind }) {
  const page = CONTENT[kind]
  useEffect(() => {
    document.title = `${page.title} · ${BRAND.name}`
  }, [page.title])

  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6">
        <p className="text-sm font-semibold text-brand-600">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{page.title}</h1>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          <p className="text-base leading-7 text-slate-600">{page.intro}</p>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {page.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="mt-8">
            <Button to="/" variant="secondary" icon="left">
              Back to home
            </Button>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
