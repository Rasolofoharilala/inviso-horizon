import test from 'node:test'
import assert from 'node:assert/strict'
import { ageFromDates, validCivilDate, businessToday } from '../src/utils/lotAge.ts'

test('J1, J7, J8 et J14 : semaine d’élevage inclusive', () => {
  assert.deepEqual(ageFromDates('2026-11-01', '2026-11-01'), { day: 1, week: 1 })
  assert.deepEqual(ageFromDates('2026-11-01', '2026-11-07'), { day: 7, week: 1 })
  assert.deepEqual(ageFromDates('2026-11-01', '2026-11-08'), { day: 8, week: 2 })
  assert.deepEqual(ageFromDates('2026-11-01', '2026-11-14'), { day: 14, week: 2 })
})
test('mois, année et année bissextile', () => {
  assert.deepEqual(ageFromDates('2026-12-28', '2027-01-04'), { day: 8, week: 2 })
  assert.deepEqual(ageFromDates('2024-02-28', '2024-03-01'), { day: 3, week: 1 })
})
test('dates impossibles, absentes ou futures refusées', () => {
  assert.equal(validCivilDate('2026-02-30'), false)
  assert.equal(validCivilDate(''), false)
  assert.equal(ageFromDates('2026-11-26', '2026-11-25'), null)
})
test('le jour bascule à minuit à Madagascar même si UTC est encore la veille', () => {
  assert.equal(businessToday('Indian/Antananarivo', new Date('2026-11-25T21:30:00Z')), '2026-11-26')
  assert.equal(businessToday('Indian/Antananarivo', new Date('2026-11-25T20:59:59Z')), '2026-11-25')
})
