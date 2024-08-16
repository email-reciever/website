import { type PropsWithChildren } from 'react'

import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionTrigger
} from './ui/accordion'

export function Detail({ children }: PropsWithChildren) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="origin-detail">
        <AccordionTrigger>原文内容(未翻译)</AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
