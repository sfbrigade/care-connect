import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head } from '@unhead/react';
import { useQuery } from '@tanstack/react-query';

import Api from './Api';
import FacilityMap from './Components/FacilityMap';
import './styles/Home.css';

const DEFAULT_COORDINATE = {
  latitude: 37.7749,
  longitude: -122.4194,
};

const CATEGORY_CONFIG = [
  {
    id: 'medical',
    label: 'Medical Help (MH, Detox, Crisis)',
    icon: '🩺',
    keywords: ['medical', 'detox', 'crisis', 'withdrawal', 'sobering', 'triage'],
  },
  {
    id: 'shelter',
    label: 'Temporary Shelter (Respite, Shelter)',
    icon: '🛏️',
    keywords: ['shelter', 'respite', 'housing', 'stabilization'],
  },
  {
    id: 'ongoing',
    label: 'Ongoing Support (Case Mgmt, Navigation)',
    icon: '🤝',
    keywords: ['case', 'navigation', 'support', 'coordination'],
  },
  {
    id: 'basic',
    label: 'Basic Services (Showers, Food)',
    icon: '🍽️',
    keywords: ['shower', 'food', 'hygiene', 'laundry'],
  },
  {
    id: 'mobile',
    label: 'Mobile Access (Van)',
    icon: '🚐',
    keywords: ['mobile', 'van', 'outreach'],
  },
  {
    id: 'other',
    label: 'Additional Programs',
    icon: '⭐️',
    keywords: [],
  },
];

const EARTH_RADIUS_MI = 3958.8;

function toRadians (degrees) {
  return degrees * (Math.PI / 180);
}

function computeDistanceMiles (latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const lat1 = toRadians(latitude);
  const lon1 = toRadians(longitude);
  const lat2 = toRadians(DEFAULT_COORDINATE.latitude);
  const lon2 = toRadians(DEFAULT_COORDINATE.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLon / 2) ** 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MI * c;
}

const updatedFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatUpdatedAt (isoString) {
  if (!isoString) {
    return 'Unknown';
  }
  try {
    return updatedFormatter.format(new Date(isoString));
  } catch {
    return 'Unknown';
  }
}

function formatAddress (address) {
  if (!address) {
    return '';
  }

  const segments = [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(', '),
    address.postalCode,
  ].filter(Boolean);

  return segments.join(', ');
}

function getFacilityCategories (facility) {
  const searchableText = [
    facility.description ?? '',
    ...facility.services.map((service) => service.name ?? ''),
    ...facility.services.map((service) => service.description ?? ''),
  ].join(' ').toLowerCase();

  const matches = CATEGORY_CONFIG
    .filter(({ keywords, id }) => id !== 'other' && keywords.some((keyword) => searchableText.includes(keyword)))
    .map(({ id }) => id);

  if (!matches.length) {
    matches.push('other');
  }

  return matches;
}

function Home () {
  const isClient = typeof window !== 'undefined';
  const { data: facilities = [], isLoading, isError } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const response = await Api.facilities.list();
      if (import.meta.env.DEV) {
        console.debug('[Home] Facilities response', response.data);
      }
      return response.data;
    },
    enabled: isClient,
  });

  const facilitiesWithMeta = useMemo(() => facilities.map((facility) => {
    const distanceMiles = computeDistanceMiles(facility.latitude, facility.longitude);
    const categories = getFacilityCategories(facility);
    const primaryService = facility.services[0]?.name ?? null;
    const primaryBadge = facility.services[0]?.availableBeds != null
      ? `${facility.services[0].availableBeds} beds`
      : null;
    const displayAddress = formatAddress(facility.address);
    const primaryContact = facility.contacts?.find((contact) => contact.isPrimary) ?? facility.contacts?.[0] ?? null;

    return {
      ...facility,
      categories,
      distanceMiles,
      primaryService,
      primaryBadge,
      displayAddress,
      primaryContact,
      serviceNames: facility.services.map((service) => service.name).filter(Boolean),
    };
  }), [facilities]);

  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);

  useEffect(() => {
    if (!selectedFacilityId && facilitiesWithMeta.length) {
      setSelectedFacilityId(facilitiesWithMeta[0].id);
    }
  }, [facilitiesWithMeta, selectedFacilityId]);

  const filteredFacilities = useMemo(() => {
    if (activeFilter === 'All') {
      return facilitiesWithMeta;
    }

    return facilitiesWithMeta.filter((facility) => facility.serviceNames.includes(activeFilter));
  }, [facilitiesWithMeta, activeFilter]);

  const facilitiesByCategory = useMemo(() => {
    const map = CATEGORY_CONFIG.reduce((accumulator, category) => {
      accumulator[category.id] = [];
      return accumulator;
    }, {});

    filteredFacilities.forEach((facility) => {
      facility.categories.forEach((categoryId) => {
        if (map[categoryId]) {
          map[categoryId].push(facility);
        }
      });
    });

    return map;
  }, [filteredFacilities]);

  const availableFilters = useMemo(() => {
    const serviceNames = new Set();
    facilitiesWithMeta.forEach((facility) => {
      facility.serviceNames.forEach((name) => serviceNames.add(name));
    });

    return ['All', ...Array.from(serviceNames).sort((a, b) => a.localeCompare(b))];
  }, [facilitiesWithMeta]);

  const selectedFacility = useMemo(() => facilitiesWithMeta.find((facility) => facility.id === selectedFacilityId) ?? null,
    [facilitiesWithMeta, selectedFacilityId]);

  const latestUpdatedAt = useMemo(() => {
    if (!facilitiesWithMeta.length) {
      return null;
    }
    const timestamps = facilitiesWithMeta
      .map((facility) => Date.parse(facility.updatedAt))
      .filter((value) => !Number.isNaN(value));
    if (!timestamps.length) {
      return null;
    }
    return new Date(Math.max(...timestamps)).toISOString();
  }, [facilitiesWithMeta]);

  const handlePosthogClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.posthog?.capture) {
      window.posthog.capture('home_test_button_clicked', {
        page: 'home',
        label: 'Test PostHog Capture',
      });
    } else {
      console.info('PostHog not initialized; skipping capture.');
    }
  }, []);

  if (!isClient) {
    return (
      <>
        <Head>
          <title>Home</title>
        </Head>
        <main className='home'>
          <div className='home__card'>
            <p className='home__empty-state'>Loading client experience…</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <main className='home'>
        {isLoading && (
          <div className='home__card'>
            <p className='home__empty-state'>Loading facility data…</p>
          </div>
        )}

        {isError && (
          <div className='home__card'>
            <p className='home__empty-state'>
              We couldn&rsquo;t load facilities right now. Please refresh to try again.
            </p>
            <button
              type='button'
              className='cta-button cta-button--secondary'
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <section className='map-panel map-panel--hero'>
              <header className='home__header'>
                <h2 className='home__title'>Map View</h2>
              </header>
              <div className='map-panel__canvas'>
                {isClient && (
                  <FacilityMap facilities={facilitiesWithMeta} height={520} />
                )}
              </div>
              <p className='map-panel__footer'>
                Last updated&nbsp;
                {formatUpdatedAt(latestUpdatedAt)}
              </p>
            </section>

            <div className='home__grid'>
              <section className='home__card'>
                <header className='home__header'>
                  <h1 className='home__title'>Available Sites</h1>
                  {availableFilters.length > 1 && (
                    <div className='home__filters'>
                      {availableFilters.map((filter) => (
                        <button
                          key={filter}
                          type='button'
                          className={`chip ${filter === activeFilter ? 'chip--active' : ''}`}
                          onClick={() => setActiveFilter(filter)}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}
                </header>

                {CATEGORY_CONFIG.map((category) => {
                  const categoryFacilities = facilitiesByCategory[category.id] ?? [];
                  if (!categoryFacilities.length) {
                    return null;
                  }

                  return (
                    <section key={category.id} className='home__category'>
                      <h2 className='home__category-title'>
                        <span aria-hidden='true'>{category.icon}</span>
                        {category.label}
                      </h2>
                      <div className='home__list'>
                        {categoryFacilities.map((facility) => (
                          <article
                            key={facility.id}
                            className={`card ${selectedFacilityId === facility.id ? 'card--selected' : ''}`}
                            onClick={() => {
                              setSelectedFacilityId(facility.id);
                            }}
                            role='button'
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                setSelectedFacilityId(facility.id);
                              }
                            }}
                          >
                            <div className='card__row'>
                              <span className='card__metric'>
                                {facility.distanceMiles != null ? `${facility.distanceMiles.toFixed(1)} mi` : 'Distance n/a'}
                              </span>
                              {facility.primaryBadge && (
                                <span className='badge'>{facility.primaryBadge}</span>
                              )}
                            </div>
                            <h3 className='card__title'>{facility.name}</h3>
                            {facility.displayAddress && (
                              <p className='card__subtitle'>{facility.displayAddress}</p>
                            )}
                            {facility.primaryService && (
                              <p className='card__meta'>{facility.primaryService}</p>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}

                {!filteredFacilities.length && (
                  <p className='home__empty-state'>
                    No facilities match this filter yet. Try a different category.
                  </p>
                )}
              </section>

              <aside className='details-panel'>
                {!selectedFacility && (
                  <p className='home__empty-state'>
                    Select a facility from the list to explore detailed information.
                  </p>
                )}

                {selectedFacility && (
                  <>
                    <header className='details-panel__header'>
                      <h2 className='details-panel__title'>{selectedFacility.name}</h2>
                      {selectedFacility.primaryService && (
                        <p className='details-panel__subtitle'>{selectedFacility.primaryService}</p>
                      )}
                    </header>

                    <section className='details-panel__section'>
                      <h3 className='details-panel__section-title'>At a glance</h3>
                      <ul className='details-panel__list'>
                        <li className='details-panel__list-item'>
                          {selectedFacility.distanceMiles != null
                            ? `≈ ${selectedFacility.distanceMiles.toFixed(1)} miles from downtown`
                            : 'Distance unavailable'}
                        </li>
                        <li className='details-panel__list-item'>
                          {selectedFacility.displayAddress || <span className='details-panel__muted'>Address not provided</span>}
                        </li>
                        <li className='details-panel__list-item'>
                          {selectedFacility.primaryContact?.phone
                            || selectedFacility.phone
                            || <span className='details-panel__muted'>Phone not provided</span>}
                        </li>
                      </ul>
                    </section>

                    {selectedFacility.services.length > 0 && (
                      <section className='details-panel__section'>
                        <h3 className='details-panel__section-title'>Services</h3>
                        <ul className='details-panel__list'>
                          {selectedFacility.services.map((service) => (
                            <li key={service.id} className='details-panel__list-item'>
                              <strong>{service.name}</strong>
                              {service.availableBeds != null && ` · ${service.availableBeds} beds`}
                              {service.description && ` — ${service.description}`}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {selectedFacility.eligibility.length > 0 && (
                      <section className='details-panel__section'>
                        <h3 className='details-panel__section-title'>Eligibility</h3>
                        <ul className='details-panel__list'>
                          {selectedFacility.eligibility.map((item) => (
                            <li key={item.id} className='details-panel__list-item'>
                              <strong>{item.type.replace(/_/g, ' ')}</strong>
                              {item.value && `: ${item.value}`}
                              {!item.value && item.notes && `: ${item.notes}`}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {selectedFacility.amenities.length > 0 && (
                      <section className='details-panel__section'>
                        <h3 className='details-panel__section-title'>Site amenities</h3>
                        <ul className='details-panel__list'>
                          {selectedFacility.amenities.map((item) => (
                            <li key={item.id} className='details-panel__list-item'>
                              {item.name}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {selectedFacility.primaryContact && (
                      <section className='details-panel__section'>
                        <h3 className='details-panel__section-title'>Primary contact</h3>
                        <ul className='details-panel__list'>
                          <li className='details-panel__list-item'>
                            {selectedFacility.primaryContact.name}
                            {selectedFacility.primaryContact.role && ` — ${selectedFacility.primaryContact.role}`}
                          </li>
                          {selectedFacility.primaryContact.phone && (
                            <li className='details-panel__list-item'>
                              {selectedFacility.primaryContact.phone}
                            </li>
                          )}
                          {selectedFacility.primaryContact.email && (
                            <li className='details-panel__list-item'>
                              {selectedFacility.primaryContact.email}
                            </li>
                          )}
                          {selectedFacility.primaryContact.notes && (
                            <li className='details-panel__list-item'>
                              {selectedFacility.primaryContact.notes}
                            </li>
                          )}
                        </ul>
                      </section>
                    )}

                    <button
                      type='button'
                      className='cta-button cta-button--primary'
                      onClick={handlePosthogClick}
                    >
                      Capture PostHog Test Event
                    </button>
                    <p className='details-panel__footer'>
                      Last updated {formatUpdatedAt(selectedFacility.updatedAt)}
                    </p>
                  </>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default Home;
