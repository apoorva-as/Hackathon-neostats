// Pure helpers for the login page's account picker (unit tested).
import { ROLE_LABELS, ROLE_ORDER } from './labels.js'

// Case-insensitive match on name, email or role label ("project", "viewer"…).
// Every word of the query must match somewhere. Keeps the server's order.
export function filterAccounts(accounts, query = '') {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return accounts
  return accounts.filter((account) => {
    const haystack = `${account.name} ${account.email} ${ROLE_LABELS[account.role] ?? account.role}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

// One account per role (in ROLE_ORDER), for the quick-pick demo links.
export function firstAccountPerRole(accounts) {
  return ROLE_ORDER.map((role) => accounts.find((a) => a.role === role)).filter(Boolean)
}

// Accounts with the given role (all of them, server order). No role → [].
// UI filtering only: the server never trusts a role chosen in the browser.
export function accountsForRole(accounts, role) {
  if (!role) return []
  return accounts.filter((account) => account.role === role)
}
