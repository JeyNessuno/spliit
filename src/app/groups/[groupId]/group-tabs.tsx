'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { Euro, ChartNoAxesColumn, Settings } from 'lucide-react'

type Props = {
  groupId: string
}

export function GroupTabs({ groupId }: Props) {
  const t = useTranslations()
  const pathname = usePathname()
  const currentPath =
    pathname.replace(/\/groups\/[^\/]+\/([^/]+).*/, '$1') || 'expenses'
  const value =
    currentPath === 'balances'
      ? 'expenses'
      : currentPath === 'activity'
      ? 'stats'
      : currentPath === 'information'
      ? 'edit'
      : currentPath
  const router = useRouter()

  return (
    <Tabs
      value={value}
      className="min-w-0 flex-1 overflow-x-auto"
      onValueChange={(value) => {
        router.push(`/groups/${groupId}/${value}`)
      }}
    >
      <TabsList className="w-full justify-evenly">
        <TabsTrigger
          value="expenses"
          title={t('Expenses.title')}
          className="flex-1"
        >
          <Euro className="h-6 w-6" />
          <span className="sr-only">{t('Expenses.title')}</span>
        </TabsTrigger>
        <TabsTrigger
          value="stats"
          title={t('Stats.title')}
          className="flex-1"
        >
          <ChartNoAxesColumn className="h-6 w-6" />
          <span className="sr-only">{t('Stats.title')}</span>
        </TabsTrigger>
        <TabsTrigger
          value="edit"
          title={t('Settings.title')}
          className="flex-1"
        >
          <Settings className="h-6 w-6" />
          <span className="sr-only">{t('Settings.title')}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
