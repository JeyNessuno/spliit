import { PropsWithChildren, Suspense } from 'react'

export default function GroupsLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Suspense>
      <main className="flex-1 max-w-screen-sm w-full mx-auto px-0 sm:px-4 py-0 sm:py-6 pb-24 flex flex-col gap-4">
        {children}
      </main>
    </Suspense>
  )
}
