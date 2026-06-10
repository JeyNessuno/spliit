'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group } = useCurrentGroup()

  return (
    <div className="sticky top-0 z-40 flex flex-col gap-4 border-b border-border/70 bg-background/95 px-4 pt-4 backdrop-blur-xl sm:rounded-t-2xl sm:border-x">
      <h1 className="text-xl font-bold tracking-[0.18em] text-center uppercase">
        <Link href="/groups" className="flex justify-center">
          {isLoading ? (
            <Skeleton className="mt-1.5 mb-1.5 h-5 w-32" />
          ) : (
            <span className="truncate">{group.name}</span>
          )}
        </Link>
      </h1>

      <div className="flex gap-3 justify-center">
        <GroupTabs groupId={groupId} />
      </div>
    </div>
  )
}
