-- =============================================================================
-- Seeds: Development / Testing Data
-- Local Lead AI — 3 scrape jobs, 5 leads each, varied pipeline stages
-- =============================================================================

-- =============================================================================
-- SCRAPE JOBS
-- =============================================================================

INSERT INTO scrape_jobs (id, industry, location, raw_query, status, apify_run_id, leads_count, completed_at)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Salon',
    'South Bopal',
    'Salon in South Bopal',
    'completed',
    'apify-run-001',
    5,
    NOW() - INTERVAL '2 days'
  ),
  (
    'a2000000-0000-0000-0000-000000000002',
    'Dentist',
    'Prahlad Nagar',
    'Dentist in Prahlad Nagar',
    'completed',
    'apify-run-002',
    5,
    NOW() - INTERVAL '1 day'
  ),
  (
    'a3000000-0000-0000-0000-000000000003',
    'Gym',
    'Satellite Ahmedabad',
    'Gym in Satellite Ahmedabad',
    'completed',
    'apify-run-003',
    5,
    NOW() - INTERVAL '3 hours'
  );


-- =============================================================================
-- LEADS — Job 1: Salons in South Bopal
-- =============================================================================

INSERT INTO leads (
  id, scrape_job_id, business_name, phone, email, website,
  address, city, state, google_rating, review_count,
  google_maps_url, place_id, category,
  instagram_url, lead_score, pipeline_stage,
  outreach_personalization
)
VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Glamour Touch Salon',
    '+919876500001',
    'glamourtouch@gmail.com',
    NULL,
    '12, South Bopal Main Road, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.2, 87,
    'https://maps.google.com/?cid=111111',
    'ChIJ_salon_001',
    'Beauty Salon',
    'https://instagram.com/glamourtouchsalon',
    72,
    'new',
    '{"hook": "We noticed Glamour Touch has 87 Google reviews but no website — most of your competitors in South Bopal with a site are booking 30% more appointments online.", "pain_point": "no_website", "offer_angle": "free_website_audit"}'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'Shear Perfection Unisex Salon',
    '+919876500002',
    NULL,
    'https://shearperfectionsalon.in',
    '7, Bopal Cross Road, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.5, 213,
    'https://maps.google.com/?cid=111112',
    'ChIJ_salon_002',
    'Unisex Salon',
    NULL,
    65,
    'contacted',
    '{"hook": "Your 213 reviews show strong word-of-mouth — we help salons like yours turn that trust into automated WhatsApp bookings.", "pain_point": "manual_bookings", "offer_angle": "whatsapp_booking_automation"}'
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000001',
    'The Style Studio',
    '+919876500003',
    'style.studio.ahm@gmail.com',
    NULL,
    'Shop 4, Bopal BRTS Stand, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    3.9, 44,
    'https://maps.google.com/?cid=111113',
    'ChIJ_salon_003',
    'Beauty Salon',
    'https://instagram.com/thestylestudioahm',
    55,
    'replied',
    '{"hook": "44 reviews is a solid start — a simple website with online booking could double that in 6 months.", "pain_point": "low_visibility", "offer_angle": "google_seo_package"}'
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000001',
    'Bliss Beauty Lounge',
    '+919876500004',
    NULL,
    'https://blissbeautylounge.com',
    '22, South Bopal Society Gate, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.7, 356,
    'https://maps.google.com/?cid=111114',
    'ChIJ_salon_004',
    'Beauty Lounge',
    'https://instagram.com/blissbeautylounge',
    88,
    'interested',
    '{"hook": "With 356 reviews and a website you are already ahead — we help premium salons add a WhatsApp AI receptionist that handles bookings 24/7.", "pain_point": "staff_bandwidth", "offer_angle": "ai_receptionist"}'
  ),
  (
    'b1000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000001',
    'Aura Hair & Nails',
    '+919876500005',
    'aura.hair.nails@gmail.com',
    NULL,
    'G-3, Bopal Arcade, South Bopal, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.0, 62,
    'https://maps.google.com/?cid=111115',
    'ChIJ_salon_005',
    'Hair Salon',
    NULL,
    60,
    'call_booked',
    '{"hook": "You are missing a website while competitors rank on Google — we can fix that and drive 15+ new clients per month.", "pain_point": "no_website", "offer_angle": "local_seo_website"}'
  );


-- =============================================================================
-- LEADS — Job 2: Dentists in Prahlad Nagar
-- =============================================================================

INSERT INTO leads (
  id, scrape_job_id, business_name, phone, email, website,
  address, city, state, google_rating, review_count,
  google_maps_url, place_id, category,
  instagram_url, lead_score, pipeline_stage,
  outreach_personalization
)
VALUES
  (
    'b2000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000002',
    'Smile Care Dental Clinic',
    '+919876500011',
    'smilecare.dental@gmail.com',
    NULL,
    '101, Pushkar Complex, Prahlad Nagar, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.6, 198,
    'https://maps.google.com/?cid=222221',
    'ChIJ_dentist_001',
    'Dental Clinic',
    NULL,
    78,
    'contacted',
    '{"hook": "Smile Care has 198 reviews but no website — patients actively search for dental clinics online and you are losing them to competitors.", "pain_point": "no_online_presence", "offer_angle": "dental_website_package"}'
  ),
  (
    'b2000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000002',
    'Dr. Patel''s Orthodontic Centre',
    '+919876500012',
    NULL,
    'https://drpatelortho.com',
    '205, Titanium City Centre, Prahlad Nagar, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.8, 422,
    'https://maps.google.com/?cid=222222',
    'ChIJ_dentist_002',
    'Orthodontist',
    'https://instagram.com/drpatelortho',
    92,
    'closed_won',
    '{"hook": "Your reputation is excellent — we help specialist clinics fill appointment gaps with automated WhatsApp follow-up campaigns.", "pain_point": "appointment_gaps", "offer_angle": "whatsapp_appointment_bot"}'
  ),
  (
    'b2000000-0000-0000-0000-000000000003',
    'a2000000-0000-0000-0000-000000000002',
    'Pearl Dental Studio',
    '+919876500013',
    'pearl.dental.ahm@gmail.com',
    NULL,
    'Shop 8, Swati Complex, Prahlad Nagar, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.1, 73,
    'https://maps.google.com/?cid=222223',
    'ChIJ_dentist_003',
    'Dental Studio',
    NULL,
    61,
    'replied',
    '{"hook": "73 reviews shows patients love you — a website with before/after gallery and online booking can grow that 3x in a year.", "pain_point": "growth_plateau", "offer_angle": "dental_website_with_gallery"}'
  ),
  (
    'b2000000-0000-0000-0000-000000000004',
    'a2000000-0000-0000-0000-000000000002',
    'Family Dental Care',
    '+919876500014',
    NULL,
    NULL,
    '3, Gulbai Tekra, Near Prahlad Nagar Garden, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    3.8, 31,
    'https://maps.google.com/?cid=222224',
    'ChIJ_dentist_004',
    'Dental Clinic',
    NULL,
    42,
    'not_interested',
    '{"hook": "31 Google reviews and no website means most patients find you by word of mouth only — we can change that.", "pain_point": "no_digital_presence", "offer_angle": "starter_web_package"}'
  ),
  (
    'b2000000-0000-0000-0000-000000000005',
    'a2000000-0000-0000-0000-000000000002',
    'Bright Smile Multispeciality Dental',
    '+919876500015',
    'brightsmile.dental@gmail.com',
    'https://brightsmileahmedabad.com',
    '402, Shalin Complex, Prahlad Nagar Road, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.4, 167,
    'https://maps.google.com/?cid=222225',
    'ChIJ_dentist_005',
    'Multispeciality Dental',
    'https://instagram.com/brightsmile_dental_ahm',
    82,
    'interested',
    '{"hook": "Bright Smile has a great foundation — we help multi-speciality clinics automate patient re-activation campaigns via WhatsApp.", "pain_point": "patient_reactivation", "offer_angle": "patient_reactivation_campaign"}'
  );


-- =============================================================================
-- LEADS — Job 3: Gyms in Satellite Ahmedabad
-- =============================================================================

INSERT INTO leads (
  id, scrape_job_id, business_name, phone, email, website,
  address, city, state, google_rating, review_count,
  google_maps_url, place_id, category,
  instagram_url, lead_score, pipeline_stage,
  outreach_personalization
)
VALUES
  (
    'b3000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000003',
    'IronCore Fitness',
    '+919876500021',
    'ironcore.fitness@gmail.com',
    NULL,
    '15, Satellite Road, Near Jodhpur Cross Road, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.3, 142,
    'https://maps.google.com/?cid=333331',
    'ChIJ_gym_001',
    'Gym',
    'https://instagram.com/ironcore_fitness_ahm',
    70,
    'new',
    '{"hook": "IronCore has 142 loyal members reviewing you — but no website means you are missing walk-ins and January resolution signups.", "pain_point": "seasonal_membership_gaps", "offer_angle": "gym_website_with_trial_form"}'
  ),
  (
    'b3000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000003',
    'Gold''s Gym Satellite',
    '+919876500022',
    NULL,
    'https://goldsgym-satellite.com',
    '102, Aakar Complex, Satellite, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.6, 508,
    'https://maps.google.com/?cid=333332',
    'ChIJ_gym_002',
    'Gym & Fitness Centre',
    'https://instagram.com/goldsgym_satellite',
    95,
    'contacted',
    '{"hook": "With 508 reviews you are clearly the area leader — premium gyms use WhatsApp bots to convert enquiries to memberships 24/7 without extra staff.", "pain_point": "lead_conversion", "offer_angle": "membership_whatsapp_bot"}'
  ),
  (
    'b3000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000003',
    'FitZone Studio',
    '+919876500023',
    'fitzone.studio.ahm@gmail.com',
    NULL,
    'G-12, Solitaire Complex, Satellite, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.0, 56,
    'https://maps.google.com/?cid=333333',
    'ChIJ_gym_003',
    'Fitness Studio',
    'https://instagram.com/fitzonestudio',
    58,
    'new',
    '{"hook": "FitZone''s Instagram shows great community energy — a simple website converts those followers into paying members.", "pain_point": "instagram_to_member_conversion", "offer_angle": "landing_page_for_gym"}'
  ),
  (
    'b3000000-0000-0000-0000-000000000004',
    'a3000000-0000-0000-0000-000000000003',
    'Crossfit Satellite',
    '+919876500024',
    NULL,
    'https://crossfit-satellite.in',
    '7, Vastrapur Lake Road, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    4.7, 289,
    'https://maps.google.com/?cid=333334',
    'ChIJ_gym_004',
    'CrossFit Box',
    'https://instagram.com/crossfit_satellite_ahm',
    89,
    'call_booked',
    '{"hook": "Crossfit Satellite is already ahead with 289 reviews and a website — we help premium boxes add automated retention campaigns for members at risk of dropping off.", "pain_point": "member_churn", "offer_angle": "retention_automation"}'
  ),
  (
    'b3000000-0000-0000-0000-000000000005',
    'a3000000-0000-0000-0000-000000000003',
    'Nucleus Gym',
    '+919876500025',
    'nucleusgym.amd@gmail.com',
    NULL,
    'B-4, Satellite Commercial Centre, Ahmedabad',
    'Ahmedabad', 'Gujarat',
    3.7, 28,
    'https://maps.google.com/?cid=333335',
    'ChIJ_gym_005',
    'Gym',
    NULL,
    45,
    'closed_lost',
    '{"hook": "28 reviews tells us you have real members who love you — a quick digital push can triple walk-in trials in 60 days.", "pain_point": "low_visibility", "offer_angle": "google_ads_trial"}'
  );


-- =============================================================================
-- OUTREACH MESSAGES (initial + one follow-up for select leads)
-- =============================================================================

INSERT INTO outreach_messages (id, lead_id, message_type, message_body, wa_message_id, wa_phone_number, status, sent_at, delivered_at, read_at)
VALUES
  -- Salon leads
  (
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'initial',
    'Hi! I noticed Shear Perfection Salon has 213 happy reviews — that''s amazing! Most salons that size still rely only on word-of-mouth for bookings. We help salons just like yours automate WhatsApp bookings so you fill your calendar without extra staff. Would a quick 5-min chat be useful? 😊',
    'wamid.salon001',
    '+919876500002',
    'read',
    NOW() - INTERVAL '2 days' + INTERVAL '10 hours',
    NOW() - INTERVAL '2 days' + INTERVAL '10 hours 2 minutes',
    NOW() - INTERVAL '2 days' + INTERVAL '11 hours'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003',
    'initial',
    'Hey! The Style Studio looks great on Google Maps. I noticed you don''t have a website yet — competitors in South Bopal with a site are getting 30% more new clients online. We build simple, affordable websites for salons. Want to see a quick demo of what yours could look like?',
    'wamid.salon002',
    '+919876500003',
    'read',
    NOW() - INTERVAL '1 day 18 hours',
    NOW() - INTERVAL '1 day 17 hours 58 minutes',
    NOW() - INTERVAL '1 day 16 hours'
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000004',
    'initial',
    'Hi Bliss Beauty Lounge team! 356 reviews — you''re clearly doing something right! 🌟 Quick question: do you have a way for clients to book appointments on WhatsApp automatically, even at 2 AM? We''ve built this for 40+ salons and they report 25% fewer no-shows. Worth a 5-min call?',
    'wamid.salon003',
    '+919876500004',
    'read',
    NOW() - INTERVAL '1 day 14 hours',
    NOW() - INTERVAL '1 day 13 hours 55 minutes',
    NOW() - INTERVAL '1 day 12 hours'
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000005',
    'initial',
    'Hello Aura Hair & Nails! I was looking at salons in South Bopal and noticed you don''t have a website. We specialize in getting local salons found on Google — our last client went from 60 to 180 reviews in 4 months with 15+ new walk-ins per month. Can I show you how?',
    'wamid.salon004',
    '+919876500005',
    'delivered',
    NOW() - INTERVAL '20 hours',
    NOW() - INTERVAL '19 hours 50 minutes',
    NULL
  ),
  -- Dentist leads
  (
    'c2000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'initial',
    'Hi Smile Care Dental! Your 198 reviews are impressive for Prahlad Nagar. I noticed your clinic doesn''t appear on Google''s website results — most patients now check websites before booking. We build dental clinic websites with online appointment booking. Interested in a free consultation?',
    'wamid.dentist001',
    '+919876500011',
    'read',
    NOW() - INTERVAL '1 day 8 hours',
    NOW() - INTERVAL '1 day 7 hours 58 minutes',
    NOW() - INTERVAL '1 day 6 hours'
  ),
  (
    'c2000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000005',
    'initial',
    'Hello Bright Smile team! Loved seeing your multispeciality setup. With 167 reviews you clearly have happy patients — but are you re-activating patients who haven''t visited in 6+ months? We run automated WhatsApp reactivation for dental clinics. Average result: 12 reactivated patients per month. Quick chat?',
    'wamid.dentist002',
    '+919876500015',
    'read',
    NOW() - INTERVAL '18 hours',
    NOW() - INTERVAL '17 hours 57 minutes',
    NOW() - INTERVAL '16 hours'
  ),
  -- Gym leads
  (
    'c3000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000002',
    'initial',
    'Hi Gold''s Gym Satellite! 508 reviews — you''re the top-rated gym in the area! Quick question: how many membership enquiries do you get on WhatsApp that don''t convert because nobody replies immediately? We build a WhatsApp AI that answers, qualifies, and books trials 24/7. Worth a look?',
    'wamid.gym001',
    '+919876500022',
    'read',
    NOW() - INTERVAL '10 hours',
    NOW() - INTERVAL '9 hours 55 minutes',
    NOW() - INTERVAL '9 hours'
  ),
  (
    'c3000000-0000-0000-0000-000000000002',
    'b3000000-0000-0000-0000-000000000004',
    'initial',
    'Hey Crossfit Satellite! Your 289 reviews speak for themselves. One thing we''ve seen with great boxes like yours: 20-30% of members quietly cancel because nobody checks in. We build automated retention campaigns via WhatsApp that cut churn by half. Want to see the numbers from a similar box?',
    'wamid.gym002',
    '+919876500024',
    'delivered',
    NOW() - INTERVAL '8 hours',
    NOW() - INTERVAL '7 hours 58 minutes',
    NULL
  );


-- =============================================================================
-- CONVERSATIONS (for leads that have replied)
-- =============================================================================

INSERT INTO conversations (id, lead_id, wa_phone_number, status, ai_summary, pain_points, call_booked_at, last_message_at)
VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000003',  -- The Style Studio (replied)
    '+919876500003',
    'active',
    'Lead replied positively. Owner (Kavita) curious about cost. Asked for website examples. AI sent 3 portfolio links. Lead asking about timeline.',
    '["No website", "Low Google visibility", "Manual booking process"]',
    NULL,
    NOW() - INTERVAL '14 hours'
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000004',  -- Bliss Beauty Lounge (interested)
    '+919876500004',
    'active',
    'Very warm lead. Manager Priya mentioned they get 50+ WhatsApp enquiries per day but only 3 staff to respond. Interested in AI bot demo. Call scheduled.',
    '["Staff bandwidth", "High WhatsApp volume", "Missed bookings after hours"]',
    NOW() + INTERVAL '1 day 10 hours',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'd2000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000003',  -- Pearl Dental Studio (replied)
    '+919876500013',
    'active',
    'Dr. Shah replied saying they''ve thought about a website before but worried about cost and maintenance. AI explained our managed service model. Positive but undecided.',
    '["Cost concerns", "No technical staff", "Maintenance worries"]',
    NULL,
    NOW() - INTERVAL '20 hours'
  ),
  (
    'd3000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000004',  -- Crossfit Satellite (call booked)
    '+919876500024',
    'active',
    'Coach Arjun very engaged. Confirmed they lose 8-10 members per month silently. Excited about retention automation. Call booked for tomorrow.',
    '["Silent member churn", "No retention system", "Manual check-ins only"]',
    NOW() + INTERVAL '18 hours',
    NOW() - INTERVAL '7 hours'
  );


-- =============================================================================
-- CONVERSATION MESSAGES
-- =============================================================================

INSERT INTO conversation_messages (conversation_id, direction, sender, message_body, wa_message_id)
VALUES
  -- The Style Studio thread
  (
    'd1000000-0000-0000-0000-000000000001', 'outbound', 'ai_agent',
    'Hey! The Style Studio looks great on Google Maps. I noticed you don''t have a website yet — competitors in South Bopal with a site are getting 30% more new clients online. We build simple, affordable websites for salons. Want to see a quick demo of what yours could look like?',
    'wamid.salon002'
  ),
  (
    'd1000000-0000-0000-0000-000000000001', 'inbound', 'lead',
    'Hi! Yes we have been thinking about a website. How much does it cost?',
    'wamid.lead.style001'
  ),
  (
    'd1000000-0000-0000-0000-000000000001', 'outbound', 'ai_agent',
    'Great question Kavita! Our salon websites start at ₹8,000 one-time with ₹1,500/month for hosting and updates — no tech hassle on your side. Here are 3 examples we built recently: [link1] [link2] [link3]. Most salons see ROI in the first month from just 2-3 new bookings. Would you like a free mockup of The Style Studio?',
    'wamid.agent.style002'
  ),
  (
    'd1000000-0000-0000-0000-000000000001', 'inbound', 'lead',
    'These look really good! How long does it take to build?',
    'wamid.lead.style003'
  ),

  -- Bliss Beauty Lounge thread
  (
    'd1000000-0000-0000-0000-000000000002', 'outbound', 'ai_agent',
    'Hi Bliss Beauty Lounge team! 356 reviews — you''re clearly doing something right! 🌟 Quick question: do you have a way for clients to book appointments on WhatsApp automatically, even at 2 AM? We''ve built this for 40+ salons and they report 25% fewer no-shows. Worth a 5-min call?',
    'wamid.salon003'
  ),
  (
    'd1000000-0000-0000-0000-000000000002', 'inbound', 'lead',
    'Hi! Yes actually this is a real problem for us. We get messages at all hours and miss a lot. Who is this?',
    'wamid.lead.bliss001'
  ),
  (
    'd1000000-0000-0000-0000-000000000002', 'outbound', 'ai_agent',
    'I''m Riya from LocalLead AI! We build WhatsApp AI bots for salons — your clients message "book appointment", the bot collects details, checks your calendar and confirms — all without any staff involvement. Priya, would you be free for a 15-min demo call this week?',
    'wamid.agent.bliss002'
  ),
  (
    'd1000000-0000-0000-0000-000000000002', 'inbound', 'lead',
    'Yes I am Priya the manager. This sounds exactly what we need. We get 50+ messages a day. Can we do a call tomorrow at 11am?',
    'wamid.lead.bliss003'
  ),
  (
    'd1000000-0000-0000-0000-000000000002', 'outbound', 'ai_agent',
    'Perfect Priya! I''ve booked you in for tomorrow at 11 AM. You''ll receive a Google Meet link shortly. Looking forward to showing you how we can turn those 50+ daily messages into automated confirmed bookings! 🎉',
    'wamid.agent.bliss004'
  ),

  -- Crossfit Satellite thread
  (
    'd3000000-0000-0000-0000-000000000001', 'outbound', 'ai_agent',
    'Hey Crossfit Satellite! Your 289 reviews speak for themselves. One thing we''ve seen with great boxes like yours: 20-30% of members quietly cancel because nobody checks in. We build automated retention campaigns via WhatsApp that cut churn by half. Want to see the numbers from a similar box?',
    'wamid.gym002'
  ),
  (
    'd3000000-0000-0000-0000-000000000001', 'inbound', 'lead',
    'This is Arjun, head coach. Yeah churn is a real issue we lose around 8-10 members a month silently. How does this work exactly?',
    'wamid.lead.cf001'
  ),
  (
    'd3000000-0000-0000-0000-000000000001', 'outbound', 'ai_agent',
    'Great to connect Arjun! Here''s how it works: our system flags members who haven''t checked in for 7 days and sends a personalised WhatsApp check-in. If no response in 48h, it escalates to a special offer. A CrossFit box in Mumbai cut monthly churn from 11 to 4 members using this. I can share their case study — want a quick 20-min call to walk through it?',
    'wamid.agent.cf002'
  ),
  (
    'd3000000-0000-0000-0000-000000000001', 'inbound', 'lead',
    'Yes definitely want to see this. Can we do tomorrow evening around 6pm?',
    'wamid.lead.cf003'
  ),
  (
    'd3000000-0000-0000-0000-000000000001', 'outbound', 'ai_agent',
    'Done! Call booked for tomorrow 6 PM. I''ll send a calendar invite to confirm. Arjun, if you can have your monthly member report handy, we can show you exactly how much revenue you''re losing and what the ROI looks like. See you then! 💪',
    'wamid.agent.cf004'
  );


-- =============================================================================
-- FOLLOW-UP QUEUE
-- =============================================================================

INSERT INTO follow_up_queue (lead_id, follow_up_type, scheduled_at, status)
VALUES
  -- New leads from Job 3 (Gyms) — scheduled for first follow-up
  (
    'b3000000-0000-0000-0000-000000000001',  -- IronCore Fitness (new)
    'followup_1',
    NOW() + INTERVAL '2 days',
    'pending'
  ),
  (
    'b3000000-0000-0000-0000-000000000003',  -- FitZone Studio (new)
    'followup_1',
    NOW() + INTERVAL '2 days 2 hours',
    'pending'
  ),
  -- New salon lead (Glamour Touch)
  (
    'b1000000-0000-0000-0000-000000000001',  -- Glamour Touch (new)
    'followup_1',
    NOW() + INTERVAL '1 day 8 hours',
    'pending'
  ),
  -- Second follow-up for contacted but no reply
  (
    'b3000000-0000-0000-0000-000000000002',  -- Gold's Gym (contacted, read but no reply)
    'followup_2',
    NOW() + INTERVAL '4 days',
    'pending'
  ),
  -- Already sent follow-ups (completed records for history)
  (
    'b2000000-0000-0000-0000-000000000001',  -- Smile Care Dental (contacted)
    'followup_1',
    NOW() - INTERVAL '12 hours',
    'sent'
  ),
  (
    'b2000000-0000-0000-0000-000000000004',  -- Family Dental Care (not_interested — cancelled)
    'followup_1',
    NOW() - INTERVAL '6 hours',
    'cancelled'
  );


-- =============================================================================
-- DAILY SCRAPE PROMPTS
-- =============================================================================

INSERT INTO daily_scrape_prompts (
  id, prompt_sent_at, user_reply, reply_received_at,
  parsed_industry, parsed_location, scrape_job_id, status
)
VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '2 days 7 hours 30 minutes',
    'Salon in South Bopal',
    NOW() - INTERVAL '2 days 7 hours 22 minutes',
    'Salon',
    'South Bopal',
    'a1000000-0000-0000-0000-000000000001',
    'completed'
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    NOW() - INTERVAL '1 day 7 hours 30 minutes',
    'Dentist in Prahlad Nagar',
    NOW() - INTERVAL '1 day 7 hours 18 minutes',
    'Dentist',
    'Prahlad Nagar',
    'a2000000-0000-0000-0000-000000000002',
    'completed'
  ),
  (
    'e1000000-0000-0000-0000-000000000003',
    NOW() - INTERVAL '7 hours 30 minutes',
    'Gym in Satellite Ahmedabad',
    NOW() - INTERVAL '7 hours 15 minutes',
    'Gym',
    'Satellite Ahmedabad',
    'a3000000-0000-0000-0000-000000000003',
    'completed'
  );
