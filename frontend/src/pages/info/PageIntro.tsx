import type { ReactNode } from 'react'

import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'

// The title band at the top of the information pages
export function PageIntro({ icon, eyebrow, title, text }: { icon: ReactNode; eyebrow: string; title: string; text: string }) {
  return (
    <section className="border-b border-border bg-surface">
      <Container className="py-12 text-center sm:py-16">
        <Reveal>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-fg">{icon}</span>
          <p className="mt-5 text-sm font-bold text-muted">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted sm:text-lg">{text}</p>
        </Reveal>
      </Container>
    </section>
  )
}

// A rounded card with an icon, a title and a list of points
export function InfoCard({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div className="h-full rounded-3xl border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft">{icon}</span>
        <h2 className="text-lg font-extrabold">{title}</h2>
      </div>
      <ul className="mt-4 space-y-2.5 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
