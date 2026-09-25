import { Categories } from './home/Categories'
import { CtaBanner } from './home/CtaBanner'
import { Features } from './home/Features'
import { Hero } from './home/Hero'
import { Highlights } from './home/Highlights'
import { HowItWorks } from './home/HowItWorks'

export function HomePage() {
  return (
    <>
      <Hero />
      <Highlights />
      <Categories />
      <HowItWorks />
      <Features />
      <CtaBanner />
    </>
  )
}
