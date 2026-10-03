alter table public.helios_items
  add column action_kind text not null default 'official_page'
    check (action_kind in (
      'official_page', 'role_directory', 'interest_form',
      'registration_page', 'contact_page', 'assignment_directory'
    )),
  add column action_label text not null default 'Visit official page'
    check (length(trim(action_label)) > 0),
  add column action_note text not null default 'Confirm availability with the organization.'
    check (length(trim(action_note)) > 0),
  add column availability_status text not null default 'not_confirmed'
    check (availability_status in ('not_confirmed', 'open_confirmed', 'closed'));

update public.helios_items set
  action_url = 'https://www.redcross.org/local/california/los-angeles/about-us/news-and-events/events/sound-the-alarm-lakewood.html',
  action_kind = 'registration_page',
  action_label = 'Find a volunteer shift',
  action_note = 'The event page links to a shift finder. Confirm the Lakewood shift and its availability there.',
  source_checked_at = now(), updated_at = now()
where id = 'red-cross-lakewood-alarms-2026';

update public.helios_items set
  action_url = 'https://volunteer.redcross.org.uk/opportunities',
  action_kind = 'role_directory',
  action_label = 'Browse open roles',
  action_note = 'Applicants must reside in the UK. Open roles and requirements vary by location.',
  source_checked_at = now(), updated_at = now()
where id = 'british-red-cross-volunteer';

update public.helios_items set
  action_url = 'https://www.redcross.org.au/volunteer/',
  action_kind = 'role_directory',
  action_label = 'Explore volunteer roles',
  action_note = 'Choose a local role and check its application requirements with Australian Red Cross.',
  source_checked_at = now(), updated_at = now()
where id = 'australian-red-cross-volunteer';

update public.helios_items set
  action_kind = 'interest_form',
  action_label = 'Register interest',
  action_note = 'Warehouse sessions are on weekdays and require volunteers to be at least 16. The organization confirms available places.',
  source_checked_at = now(), updated_at = now()
where id = 'food-bank-singapore-warehouse';

update public.helios_items set
  action_kind = 'registration_page',
  action_label = 'Read requirements and register',
  action_note = 'Outreach requires registration and confirmation. The organization says a branded shirt is compulsory for outreach and lists a price.',
  source_checked_at = now(), updated_at = now()
where id = 'lagos-food-bank-volunteer';

update public.helios_items set
  title = 'Arrange a team food bank session in Cape Town',
  summary = 'FoodForward SA welcomes corporate teams for warehouse volunteering that includes sorting and packing food. Contact the organization to arrange a Cape Town session.',
  schedule_text = 'Contact the organization for a team session and availability',
  action_url = 'https://www.foodforwardsa.org/take-action/',
  action_kind = 'contact_page',
  action_label = 'Contact FoodForward SA',
  action_note = 'The older individual signup link is unavailable. The current official page provides a contact route for corporate teams.',
  source_url = 'https://www.foodforwardsa.org/take-action/',
  source_checked_at = now(), updated_at = now()
where id = 'foodforward-sa-cape-town';

update public.helios_items set
  action_url = 'https://forms.gle/YaTyBQTfq6J8pe4E8',
  action_kind = 'interest_form',
  action_label = 'Open TECHO signup form',
  action_note = 'The collection runs across Chile. The Santiago pin is not a collection meeting point.',
  source_checked_at = now(), updated_at = now()
where id = 'techo-chile-colecta-2026';

update public.helios_items set
  action_url = 'https://actividades.techo.org/inscripciones/actividad/35546',
  action_kind = 'registration_page',
  action_label = 'Start TECHO registration',
  action_note = 'Login or registration is required. TECHO shares future activity details after signup; no specific shift is confirmed here.',
  source_checked_at = now(), updated_at = now()
where id = 'techo-guatemala-quetzaltenango';

update public.helios_items set
  action_kind = 'assignment_directory',
  action_label = 'Find online assignments',
  action_note = 'Assignments are remote and applicants must be at least 18. Choose a current assignment on the UNV platform.',
  source_checked_at = now(), updated_at = now()
where id = 'unv-online-volunteering';
