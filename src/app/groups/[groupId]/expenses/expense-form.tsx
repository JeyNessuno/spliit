import { CategorySelector } from '@/components/category-selector'
import { ExpenseDocumentsInput } from '@/components/expense-documents-input'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Locale } from '@/i18n/request'
import { randomId } from '@/lib/api'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { useActiveUser } from '@/lib/hooks'
import {
  ExpenseFormValues,
  SplittingOptions,
  expenseFormSchema,
} from '@/lib/schemas'
import { calculateShare } from '@/lib/totals'
import {
  amountAsDecimal,
  amountAsMinorUnits,
  cn,
  formatCurrency,
  formatDateOnly,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { zodResolver } from '@hookform/resolvers/zod'
import { RecurrenceRule } from '@prisma/client'
import { Calendar, Save } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { DeletePopup } from '../../../../components/delete-popup'
import { extractCategoryFromTitle } from '../../../../components/expense-form-actions'
import { Textarea } from '../../../../components/ui/textarea'

const enforceCurrencyPattern = (value: string) =>
  value
    .replace(/^\s*-/, '_') // replace leading minus with _
    .replace(/[.,]/, '#') // replace first comma with #
    .replace(/[-.,]/g, '') // remove other minus and commas characters
    .replace(/_/, '-') // change back _ to minus
    .replace(/#/, '.') // change back # to dot
    .replace(/[^-\d.]/g, '') // remove all non-numeric characters

const getDefaultSplittingOptions = (
  group: NonNullable<AppRouterOutput['groups']['get']['group']>,
) => {
  const defaultValue = {
    splitMode: 'EVENLY' as const,
    paidFor: group.participants.map(({ id }) => ({
      participant: id,
      shares: '1' as any, // Use string to ensure consistent schema handling
    })),
  }

  if (typeof localStorage === 'undefined') return defaultValue
  const defaultSplitMode = localStorage.getItem(
    `${group.id}-defaultSplittingOptions`,
  )
  if (defaultSplitMode === null) return defaultValue
  const parsedDefaultSplitMode = JSON.parse(
    defaultSplitMode,
  ) as SplittingOptions

  if (parsedDefaultSplitMode.paidFor === null) {
    parsedDefaultSplitMode.paidFor = defaultValue.paidFor
  }

  // if there is a participant in the default options that does not exist anymore,
  // remove the stale default splitting options
  for (const parsedPaidFor of parsedDefaultSplitMode.paidFor) {
    if (
      !group.participants.some(({ id }) => id === parsedPaidFor.participant)
    ) {
      localStorage.removeItem(`${group.id}-defaultSplittingOptions`)
      return defaultValue
    }
  }

  return {
    splitMode: parsedDefaultSplitMode.splitMode,
    paidFor: parsedDefaultSplitMode.paidFor.map((paidFor) => ({
      participant: paidFor.participant,
      shares: (paidFor.shares / 100).toString() as any, // Convert to string for consistent schema handling
    })),
  }
}

async function persistDefaultSplittingOptions(
  groupId: string,
  expenseFormValues: ExpenseFormValues,
) {
  if (localStorage && expenseFormValues.saveDefaultSplittingOptions) {
    const computePaidFor = (): SplittingOptions['paidFor'] => {
      if (expenseFormValues.splitMode === 'EVENLY') {
        return expenseFormValues.paidFor.map(({ participant }) => ({
          participant,
          shares: 100,
        }))
      } else if (expenseFormValues.splitMode === 'BY_AMOUNT') {
        return null
      } else {
        return expenseFormValues.paidFor
      }
    }

    const splittingOptions = {
      splitMode: expenseFormValues.splitMode,
      paidFor: computePaidFor(),
    } satisfies SplittingOptions

    localStorage.setItem(
      `${groupId}-defaultSplittingOptions`,
      JSON.stringify(splittingOptions),
    )
  }
}

export function ExpenseForm({
  group,
  categories,
  expense,
  onSubmit,
  onDelete,
  runtimeFeatureFlags,
}: {
  group: NonNullable<AppRouterOutput['groups']['get']['group']>
  categories: AppRouterOutput['categories']['list']['categories']
  expense?: AppRouterOutput['groups']['expenses']['get']['expense']
  onSubmit: (value: ExpenseFormValues, participantId?: string) => Promise<void>
  onDelete?: (participantId?: string) => Promise<void>
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const t = useTranslations('ExpenseForm')
  const locale = useLocale() as Locale
  const isCreate = expense === undefined
  const searchParams = useSearchParams()

  const getSelectedPayer = (field?: { value: string }) => {
    if (isCreate && typeof window !== 'undefined') {
      const activeUser = localStorage.getItem(`${group.id}-activeUser`)
      if (activeUser && activeUser !== 'None' && field?.value === undefined) {
        return activeUser
      }
    }
    return field?.value
  }

  const getSelectedRecurrenceRule = (field?: { value: string }) => {
    return field?.value as RecurrenceRule
  }
  const defaultSplittingOptions = getDefaultSplittingOptions(group)
  const groupCurrency = getCurrencyFromGroup(group)
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          title: expense.title,
          expenseDate: expense.expenseDate ?? new Date(),
          amount: amountAsDecimal(expense.amount, groupCurrency),
          category: expense.categoryId,
          paidBy: expense.paidById,
          paidFor: expense.paidFor.map(({ participantId, shares }) => ({
            participant: participantId,
            shares: (expense.splitMode === 'BY_AMOUNT'
              ? amountAsDecimal(shares, groupCurrency)
              : (shares / 100).toString()) as any, // Convert to string to ensure consistent handling
          })),
          splitMode: expense.splitMode,
          saveDefaultSplittingOptions: false,
          isReimbursement: expense.isReimbursement,
          documents: expense.documents,
          notes: expense.notes ?? '',
          recurrenceRule: expense.recurrenceRule ?? undefined,
        }
      : searchParams.get('reimbursement')
      ? {
          title: t('reimbursement'),
          expenseDate: new Date(),
          amount: amountAsDecimal(
            Number(searchParams.get('amount')) || 0,
            groupCurrency,
          ),
          category: 1, // category with Id 1 is Payment
          paidBy: searchParams.get('from') ?? undefined,
          paidFor: [
            searchParams.get('to')
              ? {
                  participant: searchParams.get('to')!,
                  shares: '1' as any, // String for consistent form handling
                }
              : undefined,
          ],
          isReimbursement: true,
          splitMode: defaultSplittingOptions.splitMode,
          saveDefaultSplittingOptions: false,
          documents: [],
          notes: '',
          recurrenceRule: RecurrenceRule.NONE,
        }
      : {
          title: searchParams.get('title') ?? '',
          expenseDate: searchParams.get('date')
            ? new Date(searchParams.get('date') as string)
            : new Date(),
          amount: Number(searchParams.get('amount')) || 0,
          category: searchParams.get('categoryId')
            ? Number(searchParams.get('categoryId'))
            : 0, // category with Id 0 is General
          // paid for all, split evenly
          paidFor: defaultSplittingOptions.paidFor,
          paidBy: getSelectedPayer(),
          isReimbursement: false,
          splitMode: defaultSplittingOptions.splitMode,
          saveDefaultSplittingOptions: false,
          documents: searchParams.get('imageUrl')
            ? [
                {
                  id: randomId(),
                  url: searchParams.get('imageUrl') as string,
                  width: Number(searchParams.get('imageWidth')),
                  height: Number(searchParams.get('imageHeight')),
                },
              ]
            : [],
          notes: '',
          recurrenceRule: RecurrenceRule.NONE,
        },
  })
  const [isCategoryLoading, setCategoryLoading] = useState(false)
  const activeUserId = useActiveUser(group.id)
  const amountInputRef = useRef<HTMLInputElement | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)

  useLayoutEffect(() => {
    if (!isCreate) return

    const input = amountInputRef.current
    if (!input) return

    let shouldRetry = false
    try {
      shouldRetry = !!sessionStorage.getItem('spliit.focusAmount')
      if (shouldRetry) sessionStorage.removeItem('spliit.focusAmount')
    } catch (e) {}

    requestAnimationFrame(() => {
      try {
        input.focus({ preventScroll: true })
        input.select()
      } catch (e) {}

      if (shouldRetry) {
        // Some iOS contexts only open keyboard on a later focus attempt.
        setTimeout(() => {
          try {
            input.focus()
            input.select()
          } catch (e) {}
        }, 300)
      }
    })
  }, [isCreate])

  const submit = async (values: ExpenseFormValues) => {
    await persistDefaultSplittingOptions(group.id, values)

    // Store monetary amounts in minor units (cents)
    values.amount = amountAsMinorUnits(values.amount, groupCurrency)
    values.paidFor = values.paidFor.map(({ participant, shares }) => ({
      participant,
      shares:
        values.splitMode === 'BY_AMOUNT'
          ? amountAsMinorUnits(shares, groupCurrency)
          : shares,
    }))

    return onSubmit(values, activeUserId ?? undefined)
  }

  const [isIncome, setIsIncome] = useState(Number(form.getValues().amount) < 0)
  const [manuallyEditedParticipants, setManuallyEditedParticipants] = useState<
    Set<string>
  >(new Set())

  const sExpense = isIncome ? 'Income' : 'Expense'

  useEffect(() => {
    setManuallyEditedParticipants(new Set())
  }, [form.watch('splitMode'), form.watch('amount')])

  useEffect(() => {
    const splitMode = form.getValues().splitMode

    // Auto-balance for split modes where a remaining value can be derived.
    // By amount: distribute the remaining amount over unedited participants.
    // By percentage: calculate the last participant's percentage once all others are entered.
    if (
      (splitMode === 'BY_AMOUNT' || splitMode === 'BY_PERCENTAGE') &&
      (form.getFieldState('paidFor').isDirty ||
        form.getFieldState('amount').isDirty)
    ) {
      const totalAmount = Number(form.getValues().amount) || 0
      const paidFor = form.getValues().paidFor
      let newPaidFor = [...paidFor]

      const editedParticipants = Array.from(manuallyEditedParticipants)
      let remainingAmount = totalAmount
      let remainingParticipants = newPaidFor.length - editedParticipants.length

      newPaidFor = newPaidFor.map((participant) => {
        if (editedParticipants.includes(participant.participant)) {
          const participantShare = Number(participant.shares) || 0
          if (splitMode === 'BY_AMOUNT') {
            remainingAmount -= participantShare
          }
          return participant
        }
        return participant
      })

      if (splitMode === 'BY_AMOUNT') {
        if (remainingParticipants > 0) {
          const amountPerRemaining = remainingAmount / remainingParticipants

          newPaidFor = newPaidFor.map((participant) => {
            if (!editedParticipants.includes(participant.participant)) {
              return {
                ...participant,
                shares: amountPerRemaining.toFixed(
                  groupCurrency.decimal_digits,
                ) as any,
              }
            }
            return participant
          })
        }
      }

      if (splitMode === 'BY_PERCENTAGE') {
        const remainingParticipantsList = newPaidFor.filter(
          ({ participant }) => !editedParticipants.includes(participant),
        )

        if (remainingParticipantsList.length === 1) {
          const editedSum = newPaidFor.reduce((sum, participant) => {
            if (editedParticipants.includes(participant.participant)) {
              return sum + (Number(participant.shares) || 0)
            }
            return sum
          }, 0)

          const remainingPercentage = Math.max(0, 100 - editedSum)

          newPaidFor = newPaidFor.map((participant) => {
            if (!editedParticipants.includes(participant.participant)) {
              return {
                ...participant,
                shares: remainingPercentage.toFixed(0) as any,
              }
            }
            return participant
          })
        }
      }

      form.setValue('paidFor', newPaidFor, { shouldValidate: true })
    }
  }, [
    manuallyEditedParticipants,
    form.watch('amount'),
    form.watch('splitMode'),
  ])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Card>
          <CardHeader>
            <CardTitle>
              {t(`${sExpense}.${isCreate ? 'create' : 'edit'}`)}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(`${sExpense}.TitleField.label`)}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(`${sExpense}.TitleField.placeholder`)}
                      className="text-base"
                      {...field}
                      onBlur={async () => {
                        field.onBlur() // avoid skipping other blur event listeners since we overwrite `field`
                        if (runtimeFeatureFlags.enableCategoryExtract) {
                          setCategoryLoading(true)
                          const { categoryId } = await extractCategoryFromTitle(
                            field.value,
                          )
                          form.setValue('category', categoryId)
                          setCategoryLoading(false)
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {t(`${sExpense}.TitleField.description`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem className="sr-only">
                  <FormLabel>{t(`${sExpense}.DateField.label`)}</FormLabel>
                  <FormControl>
                    <Input
                      ref={dateInputRef}
                      className="date-base"
                      type="date"
                      value={formatDate(field.value)}
                      onChange={(event) => {
                        return field.onChange(new Date(event.target.value))
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Currency conversion feature removed */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="order-4 sm:order-2">
                  <FormLabel>{t('categoryField.label')}</FormLabel>
                  <CategorySelector
                    categories={categories}
                    defaultValue={
                      form.watch(field.name) // may be overwritten externally
                    }
                    onValueChange={field.onChange}
                    isLoading={isCategoryLoading}
                  />
                  <FormDescription>
                    {t(`${sExpense}.categoryFieldDescription`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field: { onChange, ref: _formRef, ...field } }) => (
                <FormItem className="sm:order-1 col-span-2">
                  <FormLabel>{t('amountField.label')}</FormLabel>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-12 items-center rounded-xl border border-border px-4 text-sm font-medium">
                      {group.currency}
                    </span>

                    <FormControl className="flex-1">
                      <Input
                        ref={amountInputRef}
                        className="max-w-full"
                        type="tel"
                        inputMode="decimal"
                        placeholder="0.00"
                        autoFocus={isCreate}
                        onChange={(event) => {
                          const v = enforceCurrencyPattern(event.target.value)
                          const income = Number(v) < 0
                          setIsIncome(income)
                          if (income) form.setValue('isReimbursement', false)
                          onChange(v)
                        }}
                        onFocus={(e) => {
                          const target = e.currentTarget
                          setTimeout(() => target.select(), 1)
                        }}
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-12 p-0"
                      onClick={() => {
                        dateInputRef.current?.showPicker?.()
                        dateInputRef.current?.focus()
                      }}
                    >
                      <Calendar className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {formatDateOnly(form.watch('expenseDate'), locale, {
                      dateStyle: 'medium',
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem className="sm:order-5">
                  <FormLabel>{t(`${sExpense}.paidByField.label`)}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={getSelectedPayer(field)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(`${sExpense}.paidByField.placeholder`)}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {group.participants.map(({ id, name }) => (
                        <SelectItem key={id} value={id}>
                          {name}
                          {activeUserId === id && ' (you)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(`${sExpense}.paidByField.description`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:order-6">
                  <FormLabel>{t('notesField.label')}</FormLabel>
                  <FormControl>
                    <Textarea className="text-base" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>{t(`${sExpense}.paidFor.title`)}</span>
              <Button
                variant="link"
                type="button"
                className="-my-2 -mx-4"
                onClick={() => {
                  const paidFor = form.getValues().paidFor
                  const allSelected =
                    paidFor.length === group.participants.length
                  const newPaidFor = allSelected
                    ? []
                    : group.participants.map((p) => ({
                        participant: p.id,
                        shares: (paidFor.find(
                          (pfor) => pfor.participant === p.id,
                        )?.shares ?? '1') as any, // Use string to ensure consistent schema handling
                      }))
                  form.setValue('paidFor', newPaidFor as any, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }}
              >
                {form.getValues().paidFor.length ===
                group.participants.length ? (
                  <>{t('selectNone')}</>
                ) : (
                  <>{t('selectAll')}</>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              {t(`${sExpense}.paidFor.description`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="paidFor"
              render={() => (
                <FormItem className="sm:order-4 row-span-2 space-y-0">
                  {group.participants.map(({ id, name }) => (
                    <FormField
                      key={id}
                      control={form.control}
                      name="paidFor"
                      render={({ field }) => {
                        return (
                          <div
                            data-id={`${id}/${form.getValues().splitMode}/${
                              group.currency
                            }`}
                            className="-mx-4 flex flex-wrap items-center gap-y-4 border-t border-border/70 px-4 py-4 last-of-type:border-b sm:-mx-5 sm:px-5"
                          >
                            <FormItem className="flex-1 flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.some(
                                    ({ participant }) => participant === id,
                                  )}
                                  onCheckedChange={(checked) => {
                                    const options = {
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true,
                                    }
                                    checked
                                      ? form.setValue(
                                          'paidFor',
                                          [
                                            ...field.value,
                                            {
                                              participant: id,
                                              shares: '1', // Use string to ensure consistent schema handling
                                            },
                                          ] as any,
                                          options,
                                        )
                                      : form.setValue(
                                          'paidFor',
                                          field.value?.filter(
                                            (value) => value.participant !== id,
                                          ),
                                          options,
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal flex-1">
                                {name}
                                {activeUserId === id && ' (you)'}
                                {field.value?.some(
                                  ({ participant }) => participant === id,
                                ) &&
                                  !form.watch('isReimbursement') && (
                                    <span className="text-muted-foreground ml-2">
                                      (
                                      {formatCurrency(
                                        groupCurrency,
                                        calculateShare(id, {
                                          amount: amountAsMinorUnits(
                                            Number(form.watch('amount')),
                                            groupCurrency,
                                          ), // Convert to cents
                                          paidFor: field.value.map(
                                            ({ participant, shares }) => ({
                                              participant: {
                                                id: participant,
                                                name: '',
                                                groupId: '',
                                              },
                                              shares:
                                                form.watch('splitMode') ===
                                                'BY_PERCENTAGE'
                                                  ? Number(shares) * 100 // Convert percentage to basis points (e.g., 50% -> 5000)
                                                  : form.watch('splitMode') ===
                                                    'BY_AMOUNT'
                                                  ? amountAsMinorUnits(
                                                      shares,
                                                      groupCurrency,
                                                    )
                                                  : shares,
                                              expenseId: '',
                                              participantId: '',
                                            }),
                                          ),
                                          splitMode: form.watch('splitMode'),
                                          isReimbursement:
                                            form.watch('isReimbursement'),
                                        }),
                                        locale,
                                      )}
                                      )
                                    </span>
                                  )}
                              </FormLabel>
                            </FormItem>
                            <div className="flex">
                              {form.getValues().splitMode !== 'EVENLY' && (
                                <FormField
                                  name={`paidFor[${field.value.findIndex(
                                    ({ participant }) => participant === id,
                                  )}].shares`}
                                  render={() => {
                                    const sharesLabel = (
                                      <span
                                        className={cn('text-sm', {
                                          'text-muted': !field.value?.some(
                                            ({ participant }) =>
                                              participant === id,
                                          ),
                                        })}
                                      >
                                        {match(form.getValues().splitMode)
                                          .with('BY_SHARES', () => (
                                            <>{t('shares')}</>
                                          ))
                                          .with('BY_PERCENTAGE', () => <>%</>)
                                          .with('BY_AMOUNT', () => (
                                            <>{group.currency}</>
                                          ))
                                          .otherwise(() => (
                                            <></>
                                          ))}
                                      </span>
                                    )
                                    return (
                                      <div>
                                        <div className="flex gap-1 items-center">
                                          {form.getValues().splitMode ===
                                            'BY_AMOUNT' && sharesLabel}
                                          <FormControl>
                                            <Input
                                              key={String(
                                                !field.value?.some(
                                                  ({ participant }) =>
                                                    participant === id,
                                                ),
                                              )}
                                              className="-my-2 w-[88px]"
                                              type="text"
                                              disabled={
                                                !field.value?.some(
                                                  ({ participant }) =>
                                                    participant === id,
                                                )
                                              }
                                              value={
                                                field.value?.find(
                                                  ({ participant }) =>
                                                    participant === id,
                                                )?.shares
                                              }
                                              onChange={(event) => {
                                                field.onChange(
                                                  field.value.map((p) =>
                                                    p.participant === id
                                                      ? {
                                                          participant: id,
                                                          shares:
                                                            enforceCurrencyPattern(
                                                              event.target
                                                                .value,
                                                            ),
                                                        }
                                                      : p,
                                                  ),
                                                )
                                                setManuallyEditedParticipants(
                                                  (prev) =>
                                                    new Set(prev).add(id),
                                                )
                                              }}
                                              inputMode={
                                                form.getValues().splitMode ===
                                                'BY_AMOUNT'
                                                  ? 'decimal'
                                                  : 'numeric'
                                              }
                                              step={
                                                form.getValues().splitMode ===
                                                'BY_AMOUNT'
                                                  ? 10 **
                                                    -groupCurrency.decimal_digits
                                                  : 1
                                              }
                                            />
                                          </FormControl>
                                          {[
                                            'BY_SHARES',
                                            'BY_PERCENTAGE',
                                          ].includes(
                                            form.getValues().splitMode,
                                          ) && sharesLabel}
                                        </div>
                                        <FormMessage className="float-right" />
                                      </div>
                                    )
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="splitMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('SplitModeField.label')}</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        form.setValue('splitMode', value as any, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EVENLY">
                          {t('SplitModeField.evenly')}
                        </SelectItem>
                        <SelectItem value="BY_PERCENTAGE">
                          {t('SplitModeField.byPercentage')}
                        </SelectItem>
                        <SelectItem value="BY_AMOUNT">
                          {t('SplitModeField.byAmount')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {t(`${sExpense}.splitModeDescription`)}
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {runtimeFeatureFlags.enableExpenseDocuments && (
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{t('attachDocuments')}</span>
              </CardTitle>
              <CardDescription>
                {t(`${sExpense}.attachDescription`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="documents"
                render={({ field }) => (
                  <ExpenseDocumentsInput
                    documents={field.value}
                    updateDocuments={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>
        )}

        <div className="sticky bottom-0 z-40 -mx-0 mt-0 flex gap-2 border-t border-border/70 bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:rounded-b-2xl sm:border-x">
          <SubmitButton
            className="flex-1"
            loadingContent={t(isCreate ? 'creating' : 'saving')}
          >
            <Save className="w-4 h-4 mr-2" />
            {t(isCreate ? 'create' : 'save')}
          </SubmitButton>
          {!isCreate && onDelete && (
            <DeletePopup
              onDelete={() => onDelete(activeUserId ?? undefined)}
            ></DeletePopup>
          )}
          <Button variant="ghost" asChild className="flex-1">
            <Link href={`/groups/${group.id}`}>{t('cancel')}</Link>
          </Button>
        </div>
      </form>
    </Form>
  )
}

function formatDate(date?: Date) {
  if (!date || isNaN(date as any)) date = new Date()
  return date.toISOString().substring(0, 10)
}
