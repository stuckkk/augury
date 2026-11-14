/** Small line icons for the top bar (24×24, stroke = currentColor). */
const paths = {
  chart: 'M4 19h16M6 15l4-5 3 3 5-7',
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15ZM5 19.5A1.5 1.5 0 0 0 6.5 21H19',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 12l2-1-1-3-2.2.2-1.5-1.5L16.5 4.5l-3-1L12 5 10.5 3.5l-3 1 .2 2.2-1.5 1.5L4 8 3 11l2 1-2 1 1 3 2.2-.2 1.5 1.5-.2 2.2 3 1L12 19l1.5 1.5 3-1-.2-2.2 1.5-1.5 2.2.2 1-3-2-1Z',
  exit: 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10',
}

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  )
}
