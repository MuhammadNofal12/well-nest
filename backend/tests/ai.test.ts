import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildFallbackReply } from '../src/services/ai.js'

test('extracts explicit service, date, and time from a booking request', () => {
  const result = buildFallbackReply('Book dental care for 2026-10-23 at 14:30')

  assert.deepEqual(result.bookingIntent, {
    service: 'Dental care',
    clinician: null,
    date: '2026-10-23',
    time: '14:30',
  })
  assert.equal(result.requiresForm, true)
  assert.equal(result.provider, 'fallback')
})

test('does not invent a booking intent for a general question', () => {
  const result = buildFallbackReply('What should I bring to my visit?')

  assert.equal(result.bookingIntent, null)
  assert.equal(result.requiresForm, false)
  assert.match(result.reply, /medical questions/)
})

test('asks for missing booking details and hands off to the form', () => {
  const result = buildFallbackReply('I need to book an appointment')

  assert.equal(result.bookingIntent?.service, null)
  assert.equal(result.requiresForm, true)
  assert.match(result.reply, /type of care/)
})
