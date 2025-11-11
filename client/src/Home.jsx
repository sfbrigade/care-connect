import { useEffect, useMemo, useState } from 'react';
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

function formatRelativeTime (isoString) {
  if (!isoString) {
    return 'just now';
  }

  const timestamp = Date.parse(isoString);
  if (Number.isNaN(timestamp)) {
    return 'just now';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes <= 0) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
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

  useEffect(() => {
    if (!filteredFacilities.length) {
      return;
    }

    const containsSelection = filteredFacilities.some((facility) => facility.id === selectedFacilityId);
    if (!containsSelection) {
      setSelectedFacilityId(filteredFacilities[0].id);
    }
  }, [filteredFacilities, selectedFacilityId]);

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

  const [showMap, setShowMap] = useState(true);

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
              <div className='home__hero-header'>
                <div>
                  <p className='home__hero-subtitle'>San Francisco · Downtown</p>
                  <h1 className='home__title'>Available Sites</h1>
                  <p className='home__metrics'>
                    {(filteredFacilities.length || facilitiesWithMeta.length)} sites open · updated {formatRelativeTime(latestUpdatedAt)}
                  </p>
                </div>
                <div className={`home__view-switch ${showMap ? 'home__view-switch--on' : 'home__view-switch--off'}`}>
                  <span className='home__view-switch-label'>Map</span>
                  <button
                    type='button'
                    className='home__toggle'
                    aria-pressed={showMap}
                    onClick={() => setShowMap((previous) => !previous)}
                  >
                    <span className='home__toggle-thumb' aria-hidden='true' />
                  </button>
                </div>
              </div>
              <div className='home__filters-scroll'>
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
              {showMap && (
                <>
                  <div className='map-panel__canvas'>
                    {isClient && (
                      <FacilityMap facilities={facilitiesWithMeta} height={400} />
                    )}
                  </div>
                  <p className='map-panel__footer'>
                    Last updated {formatUpdatedAt(latestUpdatedAt)}
                  </p>
                </>
              )}
            </section>

            <section className='home__categories'>
              {CATEGORY_CONFIG.map((category) => {
                const categoryFacilities = facilitiesByCategory[category.id] ?? [];
                if (!categoryFacilities.length) {
                  return null;
                }

                return (
                  <section key={category.id} className='home__category-section'>
                    <header className='home__category-header'>
                      <span className='home__category-icon' aria-hidden='true'>{category.icon}</span>
                      <h2 className='home__category-title'>{category.label}</h2>
                    </header>
                    <div className='home__list'>
                      {categoryFacilities.map((facility) => (
                        <article
                          key={facility.id}
                          className={`card ${selectedFacilityId === facility.id ? 'card--selected' : ''}`}
                          role='button'
                          tabIndex={0}
                          onClick={() => setSelectedFacilityId(facility.id)}
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
                            <span className='badge'>{facility.primaryBadge ?? 'Open'}</span>
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
          </>
        )}
      </main>
    </>
  );
}

export default Home;
