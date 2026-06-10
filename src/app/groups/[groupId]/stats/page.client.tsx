import { ActivityList } from '@/app/groups/[groupId]/activity/activity-list'
import { Totals } from '@/app/groups/[groupId]/stats/totals'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslations } from 'next-intl'

export function TotalsPageClient() {
  const t = useTranslations('Stats')
  const activity = useTranslations('Activity')

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('Totals.title')}</CardTitle>
          <CardDescription>{t('Totals.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <Totals />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{activity('title')}</CardTitle>
          <CardDescription>{activity('description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <ActivityList />
        </CardContent>
      </Card>
    </>
  )
}
