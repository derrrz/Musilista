'use client'

import { useEffect, useState } from 'react'

// Mesmo breakpoint md: (768px) já usado pra esconder a Sidebar/trocar pra
// navegação mobile — mantém um único critério de "é mobile?" em todo o app.
const BREAKPOINT_PX = 768

/**
 * true quando o viewport está abaixo do breakpoint md:. Retorna false até o
 * componente montar no cliente (sem acesso a matchMedia durante SSR), então
 * o primeiro render sempre assume desktop — evita mismatch de hidratação,
 * ao custo de um flash breve de conteúdo desktop em telas realmente estreitas.
 */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT_PX - 1}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}
