import { motion } from 'motion/react'
import { Link, Navigate } from 'react-router'
import AuthShell from '../components/AuthShell.jsx'
import Button from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { BRAND } from '../components/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const STEPS = [
  {
    icon: 'shield',
    title: 'Ask your workspace administrator',
    text: `Accounts are created by an Admin in ${BRAND.name}, so every person gets the right role from day one.`,
  },
  {
    icon: 'key',
    title: 'Receive your sign-in details',
    text: 'Your administrator shares your work email and a starting password with you.',
  },
  {
    icon: 'arrow',
    title: 'Sign in and start working',
    text: 'You land on a dashboard built for your role: Admin, Project Manager, Team Member or Viewer.',
  },
]

// /signup: the platform has no self-registration (accounts are created by an
// Admin through POST /api/users), so this page explains how to get access
// instead of offering a sign-up form that could not work.
export default function SignupPage() {
  const { status } = useAuth()
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  return (
    <AuthShell>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
          <Icon name="lock" className="h-3.5 w-3.5" /> Invite-only workspace
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Get access to {BRAND.name}</h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          {BRAND.name} workspaces are managed by an administrator, who creates an account for each team member.
        </p>
      </div>

      <ol className="mt-8 space-y-4">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.title}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name={step.icon} className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{step.text}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      <div className="mt-8 space-y-3">
        <Button to="/login" size="lg" className="w-full" iconRight="arrow">
          I have an account, sign in
        </Button>
        <Button to="/" size="lg" variant="secondary" className="w-full">
          Back to home
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Are you an administrator? Sign in and open <span className="font-medium text-slate-700">Users</span> to create accounts.{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
