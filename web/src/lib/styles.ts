// Shared style constants for consistent UI throughout the app

export const buttonStyles = {
  // Primary button style - used for main actions
  primary: 'border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-white',

  // Destructive button style - used for delete/remove actions
  destructive: 'border-red-600 bg-red-600/20 hover:bg-red-600/30 text-red-400',

  // Ghost button style - minimal visual weight
  ghost: 'hover:bg-slate-700/50 text-slate-400 hover:text-white',
} as const

export const inputStyles = {
  // Standard input field
  default: 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500',
} as const

export const cardStyles = {
  // Standard card container
  default: 'border-slate-700 bg-slate-800/50',
} as const
