/**
 * The side rail: the four pours that need a tally, not a recipe.
 *
 * Nobody looks up how to open a beer mid-rush. These are counted, not made,
 * so they get one tap on the edge of the screen instead of a row in the sheet.
 *
 * price is 0 on purpose — an agreed per-pour price is Thomas's call, not a
 * number to invent. Until it is set these count toward drinks made and NOT
 * toward the shift's ticket total.
 */
export type QuickPour = {
  id: string
  name: string
  short: string
  tint: string
}

export const QUICK_POURS: QuickPour[] = [
  { id: 'quick-wine', name: 'Wine', short: 'Wine', tint: '#b05a72' },
  { id: 'quick-beer', name: 'Beer', short: 'Beer', tint: '#d3a24a' },
  { id: 'quick-mimosa', name: 'Mimosa', short: 'Mimosa', tint: '#e08a48' },
  { id: 'quick-seltzer', name: 'Seltzer', short: 'Seltzer', tint: '#7eb6d9' },
]

export const QUICK_POUR_IDS = new Set(QUICK_POURS.map((p) => p.id))
