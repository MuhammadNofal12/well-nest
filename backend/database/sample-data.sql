-- Run after `npm run db:seed`. The seed command creates the demo business and
-- user with a bcrypt password hash; these inserts add representative history.
INSERT INTO appointments (business_id, user_id, service, clinician, starts_at, status)
SELECT u.business_id, u.id, 'Annual wellness visit', 'Dr. Maya Chen', NOW() + INTERVAL '4 days', 'scheduled'
FROM users u JOIN businesses b ON b.id = u.business_id
WHERE b.slug = 'wellnest-demo' AND u.email = 'alex@example.test'
  AND NOT EXISTS (
    SELECT 1 FROM appointments a WHERE a.user_id = u.id AND a.service = 'Annual wellness visit'
  );

INSERT INTO appointments (business_id, user_id, service, clinician, starts_at, status)
SELECT u.business_id, u.id, 'Dental cleaning', 'Dr. James Wilson', NOW() + INTERVAL '7 days', 'scheduled'
FROM users u JOIN businesses b ON b.id = u.business_id
WHERE b.slug = 'wellnest-demo' AND u.email = 'alex@example.test'
  AND NOT EXISTS (
    SELECT 1 FROM appointments a WHERE a.user_id = u.id AND a.service = 'Dental cleaning'
  );

INSERT INTO chat_sessions (business_id, user_id, title, metadata)
SELECT u.business_id, u.id, 'Sample appointment conversation', '{"source":"sample-data"}'::JSONB
FROM users u JOIN businesses b ON b.id = u.business_id
WHERE b.slug = 'wellnest-demo' AND u.email = 'alex@example.test'
  AND NOT EXISTS (
    SELECT 1 FROM chat_sessions s WHERE s.user_id = u.id AND s.title = 'Sample appointment conversation'
  );

INSERT INTO chat_messages (session_id, role, content, ai_provider, extracted_intent)
SELECT s.id, 'user', 'I would like to book a dental cleaning.', NULL, NULL
FROM chat_sessions s JOIN users u ON u.id = s.user_id
JOIN businesses b ON b.id = s.business_id
WHERE b.slug = 'wellnest-demo' AND u.email = 'alex@example.test'
  AND s.title = 'Sample appointment conversation'
  AND NOT EXISTS (SELECT 1 FROM chat_messages m WHERE m.session_id = s.id);

INSERT INTO chat_messages (session_id, role, content, ai_provider, extracted_intent)
SELECT s.id, 'assistant', 'I can help with that. Choose a provider and an available time in the booking form.', 'fallback',
       '{"service":"Dental care","clinician":null,"date":null,"time":null}'::JSONB
FROM chat_sessions s JOIN users u ON u.id = s.user_id
JOIN businesses b ON b.id = s.business_id
WHERE b.slug = 'wellnest-demo' AND u.email = 'alex@example.test'
  AND s.title = 'Sample appointment conversation'
  AND NOT EXISTS (
    SELECT 1 FROM chat_messages m WHERE m.session_id = s.id AND m.role = 'assistant'
  );
