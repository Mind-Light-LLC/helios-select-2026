alter table public.helios_items
  add column place_label text not null default 'Location disclosed by source',
  add column pin_meaning text not null default 'organization_city'
    check (pin_meaning in ('event_city', 'organization_city')),
  add column schedule_text text;

drop function public.helios_search(extensions.vector, integer);

create function public.helios_search(query_embedding extensions.vector(768), match_count integer default 20)
returns table (
  id text,
  record_kind text,
  title text,
  summary text,
  organization_name text,
  country text,
  place_label text,
  pin_meaning text,
  schedule_text text,
  latitude double precision,
  longitude double precision,
  source_url text,
  action_url text,
  starts_at timestamptz,
  source_checked_at timestamptz
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select i.id, i.record_kind, i.title, i.summary, i.organization_name,
    i.country, i.place_label, i.pin_meaning, i.schedule_text,
    i.latitude, i.longitude, i.source_url, i.action_url,
    i.starts_at, i.source_checked_at
  from public.helios_items as i
  where i.published and i.embedding is not null
  order by i.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 20), 1), 50);
$$;

revoke all on function public.helios_search(extensions.vector, integer) from public;
grant execute on function public.helios_search(extensions.vector, integer) to anon, authenticated;

insert into public.helios_items (
  id, record_kind, title, summary, organization_name, country,
  place_label, pin_meaning, schedule_text, latitude, longitude,
  source_url, action_url, starts_at, source_checked_at, published
) values
  ('red-cross-lakewood-alarms-2026', 'event',
   'Install free smoke alarms in Lakewood',
   'The American Red Cross Los Angeles Region seeks volunteers for a Sound the Alarm event in Lakewood, California. Check the official page for the current registration path.',
   'American Red Cross', 'United States', 'Lakewood, California', 'event_city',
   '17 October 2026, 8:30 am to 2:00 pm local time', 33.8536, -118.1339,
   'https://www.redcross.org/local/california/los-angeles.html',
   'https://www.redcross.org/local/california/los-angeles.html',
   '2026-10-17 08:30:00-07', '2026-10-03 17:54:00+00', true),
  ('british-red-cross-volunteer', 'volunteer',
   'Find a British Red Cross volunteer role',
   'Browse local and remote roles in emergency response, refugee support, charity shops and other services. The British Red Cross accepts volunteer applications from UK residents.',
   'British Red Cross', 'United Kingdom', 'London, United Kingdom', 'organization_city',
   'Roles vary by location and availability', 51.5074, -0.1278,
   'https://www.redcross.org.uk/get-involved/volunteer',
   'https://www.redcross.org.uk/get-involved/volunteer',
   null, '2026-10-03 17:54:00+00', true),
  ('australian-red-cross-volunteer', 'volunteer',
   'Volunteer with Australian Red Cross',
   'Explore community roles such as emergency resilience, migration support, phone connection, meal delivery and Red Cross shops. Availability depends on the local program.',
   'Australian Red Cross', 'Australia', 'Sydney, Australia', 'organization_city',
   'Roles vary by location and availability', -33.8688, 151.2093,
   'https://www.redcross.org.au/act/action-catalogue/volunteer/',
   'https://www.redcross.org.au/act/action-catalogue/volunteer/',
   null, '2026-10-03 17:54:00+00', true),
  ('food-bank-singapore-warehouse', 'volunteer',
   'Sort and pack food in Singapore',
   'The Food Bank Singapore lists warehouse volunteering to sort, pack and organize donated food for beneficiary partners. Individual volunteers can register interest on the official page.',
   'The Food Bank Singapore', 'Singapore', 'Singapore', 'organization_city',
   'Weekday sessions, subject to available places', 1.3000, 103.8000,
   'https://foodbank.sg/volunteer/', 'https://foodbank.sg/volunteer/',
   null, '2026-10-03 17:54:00+00', true),
  ('lagos-food-bank-volunteer', 'volunteer',
   'Help fight hunger in Lagos',
   'Lagos Food Bank Initiative invites volunteers to help collect, sort, pack and distribute food, with nutrition and outreach programs across Lagos. Registration is handled by the organization.',
   'Lagos Food Bank Initiative', 'Nigeria', 'Lagos, Nigeria', 'organization_city',
   'Programs run throughout the year; confirm a place with the organization', 6.5244, 3.3792,
   'https://lagosfoodbank.org/become-a-volunteer/',
   'https://lagosfoodbank.org/become-a-volunteer/',
   null, '2026-10-03 17:54:00+00', true),
  ('foodforward-sa-cape-town', 'volunteer',
   'Volunteer at a food bank warehouse in Cape Town',
   'FoodForward SA describes two-hour warehouse sessions that include food sorting, picking and packing. It welcomes individuals and groups; confirm availability through its official volunteer program.',
   'FoodForward SA', 'South Africa', 'Cape Town, South Africa', 'organization_city',
   'Two-hour sessions, subject to booking', -33.9249, 18.4241,
   'https://www.foodforwardsa.org/join-foodforward-sas-volunteer-programme/',
   'https://www.foodforwardsa.org/join-foodforward-sas-volunteer-programme/',
   null, '2026-10-03 17:54:00+00', true),
  ('techo-chile-colecta-2026', 'event',
   'Join TECHO Chile volunteer fundraising drive',
   'TECHO Chile is recruiting volunteers for its 22 to 25 October 2026 collection across Chile to support housing and community work. The Santiago pin represents the organization, not every collection point.',
   'TECHO Chile', 'Chile', 'Santiago, Chile', 'organization_city',
   '22 to 25 October 2026; check the official sign-up for your meeting point', -33.4489, -70.6693,
   'https://cl.techo.org/colecta-techo-2026-sumate-como-voluntario-y-moviliza-el-cambio/',
   'https://cl.techo.org/colecta-techo-2026-sumate-como-voluntario-y-moviliza-el-cambio/',
   null, '2026-10-03 17:54:00+00', true),
  ('techo-guatemala-quetzaltenango', 'volunteer',
   'Join TECHO in Quetzaltenango',
   'Register interest in TECHO Guatemala volunteer work around housing and community action in Quetzaltenango. The organization will share the next activities and participation details.',
   'TECHO Guatemala', 'Guatemala', 'Quetzaltenango, Guatemala', 'organization_city',
   '2026 volunteer campaign; check the official page for upcoming activities', 14.8347, -91.5181,
   'https://actividades.techo.org/actividades/35546',
   'https://actividades.techo.org/actividades/35546',
   null, '2026-10-03 17:54:00+00', true),
  ('unv-online-volunteering', 'volunteer',
   'Find remote UN Online Volunteering assignments',
   'United Nations Volunteers lists online assignments through its Unified Volunteering Platform. Eligible people can apply from anywhere; the Bonn pin marks UNV headquarters, not an assignment location.',
   'United Nations Volunteers', 'Global', 'Bonn, Germany (UNV headquarters)', 'organization_city',
   'Assignments and eligibility vary; confirm on the official platform', 50.7374, 7.0982,
   'https://www.unv.org/become-online-volunteer?page=1',
   'https://www.unv.org/become-volunteer/',
   null, '2026-10-03 17:54:00+00', true);
