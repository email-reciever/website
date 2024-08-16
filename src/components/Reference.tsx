'use server'

import { BellIcon } from '@radix-ui/react-icons'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export type ReferenceProps = {
  title: string
  url: string
}

export function Reference({ title, url }: ReferenceProps) {
  return (
    <Alert variant="warning" className="mb-2 mt-4">
      <BellIcon className="w-4 h-4" />
      <AlertTitle>原文信息</AlertTitle>
      <AlertDescription>
        <a href={url} target="_blank">
          《{title}》
        </a>
      </AlertDescription>
    </Alert>
  )
}
