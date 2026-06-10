import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Locale } from '@/i18n/request'
import { getGroup } from '@/lib/api'
import { defaultCurrencyList, getCurrency } from '@/lib/currency'
import { GroupFormValues, groupFormSchema } from '@/lib/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Save, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { CurrencySelector } from './currency-selector'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Textarea } from './ui/textarea'
import { useMediaQuery } from '@/lib/hooks'

export type Props = {
  group?: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  onSubmit: (
    groupFormValues: GroupFormValues,
    participantId?: string,
  ) => Promise<void>
  protectedParticipantIds?: string[]
}

export function GroupForm({
  group,
  onSubmit,
  protectedParticipantIds = [],
}: Props) {
  const locale = useLocale()
  const t = useTranslations('GroupForm')
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: group
      ? {
          name: group.name,
          information: group.information ?? '',
          currency: group.currency ?? '',
          currencyCode: group.currencyCode ?? '',
          participants: group.participants,
        }
      : {
          name: '',
          information: '',
          currency: '',
          currencyCode: 'EUR',
          participants: [
            { name: 'Jey' },
            { name: 'Pit' },
            { name: 'Mr Beans' },
          ],
        },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'participants',
    keyName: 'key',
  })

  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [participantValue, setParticipantValue] = useState<string>('')

  useEffect(() => {
    if (activeUser === null) {
      const currentActiveUser =
        fields.find(
          (f) => f.id === localStorage.getItem(`${group?.id}-activeUser`),
        )?.name || t('Settings.ActiveUserField.none')
      setActiveUser(currentActiveUser)
    }
  }, [t, activeUser, fields, group?.id])

  useEffect(() => {
    if (activeUser !== null) {
      setParticipantValue(activeUser)
    }
  }, [activeUser])

  const updateActiveUser = () => {
    if (!activeUser) return
    if (group?.id) {
      const participant = group.participants.find((p) => p.name === activeUser)
      if (participant?.id) {
        localStorage.setItem(`${group.id}-activeUser`, participant.id)
      } else {
        localStorage.setItem(`${group.id}-activeUser`, activeUser)
      }
    } else {
      localStorage.setItem('newGroup-activeUser', activeUser)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(
            values,
            group?.participants.find((p) => p.name === activeUser)?.id ??
              undefined,
          )
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('NameField.label')}</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder={t('NameField.placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('NameField.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="information"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('InformationField.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        className="text-base"
                        {...field}
                        placeholder={t('InformationField.placeholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <FormField
              control={form.control}
              name="currencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CurrencyCodeField.label')}</FormLabel>
                  <CurrencySelector
                    currencies={defaultCurrencyList(locale as Locale)}
                    defaultValue={form.watch(field.name) ?? 'EUR'}
                    onValueChange={(newCurrency) => {
                      field.onChange(newCurrency)
                      const currency = getCurrency(newCurrency)
                      if (
                        currency.code.length ||
                        form.getFieldState('currency').isTouched
                      )
                        form.setValue('currency', currency.symbol, {
                          shouldValidate: true,
                          shouldTouch: true,
                          shouldDirty: true,
                        })
                    }}
                    isLoading={false}
                  />
                  <FormDescription>
                    {t(
                      group
                        ? 'CurrencyCodeField.editDescription'
                        : 'CurrencyCodeField.createDescription',
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem hidden={!!form.watch('currencyCode')?.length}>
                  <FormLabel>{t('CurrencyField.label')}</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder={t('CurrencyField.placeholder')}
                      max={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('CurrencyField.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Participants.title')}</CardTitle>
            <CardDescription>{t('Participants.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {fields.map((item, index) => (
                <li key={item.key}>
                  <FormField
                    control={form.control}
                    name={`participants.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">
                          Participant #{index + 1}
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              className="text-base"
                              {...field}
                              placeholder={t('Participants.new')}
                            />
                            {item.id &&
                            protectedParticipantIds.includes(item.id) ? (
                              <HoverCard>
                                <HoverCardTrigger>
                                  <Button
                                    variant="ghost"
                                    className="text-destructive-"
                                    type="button"
                                    size="icon"
                                    disabled
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive opacity-50" />
                                  </Button>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  align="end"
                                  className="text-sm"
                                >
                                  {t('Participants.protectedParticipant')}
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <Button
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => remove(index)}
                                type="button"
                                size="icon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                append({ name: '' })
              }}
              type="button"
            >
              {t('Participants.add')}
            </Button>
            {group && (
              <div className="flex justify-end">
                <ShareButton group={group} />
              </div>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who are you?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              {activeUser !== null && (
                <FormItem>
                  <FormLabel>Who are you?</FormLabel>
                  <FormControl>
                    <ParticipantSelector
                      participants={[
                        { name: t('Settings.ActiveUserField.none') },
                        ...form.watch('participants'),
                      ].filter((item) => item.name.length > 0)}
                      defaultValue={participantValue}
                      onValueChange={(value) => {
                        setActiveUser(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-40 mt-0 flex gap-2 border-t border-border/70 bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:rounded-b-2xl sm:border-x">
          <SubmitButton
            className="flex-1"
            loadingContent={t(group ? 'Settings.saving' : 'Settings.creating')}
            onClick={updateActiveUser}
          >
            <Save className="w-4 h-4 mr-2" />
            {t(group ? 'Settings.save' : 'Settings.create')}
          </SubmitButton>
          {!group && (
            <Button variant="ghost" asChild className="flex-1">
              <Link href="/groups">{t('Settings.cancel')}</Link>
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

function ParticipantSelector({
  participants,
  defaultValue,
  onValueChange,
}: {
  participants: { name: string }[]
  defaultValue: string
  onValueChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const t = useTranslations('GroupForm')

  useEffect(() => {
    if (defaultValue !== value) {
      setValue(defaultValue)
    }
  }, [defaultValue, value])

  const selectedParticipant =
    participants.find((participant) => participant.name === value) ?? participants[0]

  const selectorContent = (
    <Command>
      <CommandInput placeholder="Search participants" className="text-base" />
      <CommandEmpty>No participants found</CommandEmpty>
      {participants.map((participant) => (
        <CommandItem
          key={participant.name}
          value={participant.name}
          onSelect={() => {
            setValue(participant.name)
            onValueChange(participant.name)
            setOpen(false)
          }}
        >
          {participant.name}
        </CommandItem>
      ))}
    </Command>
  )

  return isDesktop ? (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex w-full justify-between"
        >
          {selectedParticipant?.name ?? 'Select yourself'}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        {selectorContent}
      </PopoverContent>
    </Popover>
  ) : (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex w-full justify-between"
        >
          {selectedParticipant?.name ?? 'Select yourself'}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="p-0">
        {selectorContent}
      </DrawerContent>
    </Drawer>
  )
}
