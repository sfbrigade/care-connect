import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Container, Grid, Group, Stack, Switch, Text, Title } from '@mantine/core';
import { Head } from '@unhead/react';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import Facility from '@/components/Facility';
import FacilityMap from '@/components/FacilityMap';
import '../styles/Home.css';

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

function computeDistanceMiles (latitude, longitude, origin = DEFAULT_COORDINATE) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const lat1 = toRadians(latitude);
  const lon1 = toRadians(longitude);
  const lat2 = toRadians(origin.latitude);
  const lon2 = toRadians(origin.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLon / 2) ** 2);
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

function formatAddress (facility) {
  if (!facility) {
    return '';
  }

  const segments = [
    facility.addressLine1,
    facility.addressLine2,
    [facility.city, facility.state].filter(Boolean).join(', '),
    facility.postalCode,
  ].filter(Boolean);

  return segments.join(', ');
}

function getFacilityCategories (facility) {
  const searchableText = [
    facility.description ?? '',
    ...facility.services.map((service) => service.serviceType.name ?? ''),
    ...facility.services.map((service) => service.description ?? service.serviceType.description ?? ''),
  ].join(' ').toLowerCase();

  const matches = [];

  // Check service type names and abbreviations
  for (const service of facility.services) {
    const serviceName = (service.serviceType.name ?? '').toLowerCase();

    // Medical/Health services
    if (serviceName.includes('mh') || serviceName.includes('acute') ||
      serviceName.includes('sud') || serviceName.includes('subacute') ||
      serviceName.includes('detox') || serviceName.includes('crisis') ||
      serviceName.includes('sobering') || serviceName.includes('lesc') ||
      serviceName.includes('medical') || serviceName.includes('mental health')) {
      if (!matches.includes('medical')) {
        matches.push('medical');
      }
    }

    // Shelter/Respite services
    if (serviceName.includes('respite') || serviceName.includes('shelter') ||
      serviceName.includes('housing') || serviceName.includes('stabilization')) {
      if (!matches.includes('shelter')) {
        matches.push('shelter');
      }
    }

    // Basic services
    if (serviceName.includes('shower') || serviceName.includes('food') ||
      serviceName.includes('hygiene') || serviceName.includes('laundry')) {
      if (!matches.includes('basic')) {
        matches.push('basic');
      }
    }

    // Mobile services
    if (serviceName.includes('mobile') || serviceName.includes('van') ||
      serviceName.includes('outreach')) {
      if (!matches.includes('mobile')) {
        matches.push('mobile');
      }
    }

    // Ongoing support
    if (serviceName.includes('case') || serviceName.includes('navigation') ||
      serviceName.includes('support') || serviceName.includes('coordination')) {
      if (!matches.includes('ongoing')) {
        matches.push('ongoing');
      }
    }
  }

  // Also check keywords in description and service descriptions
  const keywordMatches = CATEGORY_CONFIG
    .filter(({ keywords, id }) => id !== 'other' && keywords.some((keyword) => searchableText.includes(keyword)))
    .map(({ id }) => id);

  // Combine matches
  const allMatches = [...new Set([...matches, ...keywordMatches])];

  if (!allMatches.length) {
    allMatches.push('other');
  }

  return allMatches;
}

function createSlug (name) {
  if (!name) {
    return 'UNK';
  }

  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.map((word) => word.replace(/[^A-Za-z0-9]/g, '').charAt(0)).filter(Boolean);
  let slug = letters.slice(0, 3).join('').toUpperCase();

  if (!slug) {
    const clean = name.replace(/[^A-Za-z0-9]/g, '');
    slug = clean.slice(0, 3).toUpperCase();
  }

  if (!slug) {
    slug = 'UNK';
  }

  if (slug.length === 1 && name.length >= 3) {
    const clean = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    slug = clean.slice(0, 3) || slug.repeat(3);
  }

  if (slug.length < 3) {
    slug = (slug + slug.slice(-1).repeat(3)).slice(0, 3);
  }

  return slug.slice(0, 3);
}

function Home () {
  const geolocationRequestRef = useRef(false);
  const permissionStatusRef = useRef(null);
  const { data: facilities = [], isLoading, isError } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const response = await Api.facilities.list({ include: 'services', type: 'DIDO' });
      if (import.meta.env.DEV) {
        console.debug('[Home] Facilities response', response.data);
      }
      return response.data;
    },
  });

  const [userCoordinate, setUserCoordinate] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('unsupported');
      return () => { };
    }

    let watchId;

    const startWatch = () => {
      if (watchId != null) {
        return;
      }

      geolocationRequestRef.current = true;
      setGeoStatus((prev) => prev === 'granted' ? prev : 'pending');

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          geolocationRequestRef.current = false;
          setUserCoordinate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setGeoStatus('granted');
        },
        (error) => {
          geolocationRequestRef.current = false;

          if (error.code === error.PERMISSION_DENIED) {
            setGeoStatus('denied');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setGeoStatus('unavailable');
          } else if (error.code === error.TIMEOUT) {
            setGeoStatus('timeout');
          } else {
            setGeoStatus('error');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    };

    if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
      navigator.permissions.query({ name: 'geolocation' })
        .then((status) => {
          permissionStatusRef.current = status;

          if (status.state === 'granted' || status.state === 'prompt') {
            startWatch();
          } else if (status.state === 'denied') {
            setGeoStatus('denied');
          }

          const handlePermissionChange = () => {
            if (status.state === 'granted' || status.state === 'prompt') {
              startWatch();
            } else if (status.state === 'denied') {
              setGeoStatus('denied');
              if (watchId != null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = undefined;
              }
            }
          };

          status.addEventListener('change', handlePermissionChange);

          return () => {
            status.removeEventListener('change', handlePermissionChange);
          };
        })
        .catch(() => {
          startWatch();
        });
    } else {
      startWatch();
    }

    return () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const referenceCoordinate = userCoordinate ?? DEFAULT_COORDINATE;

  const facilitiesWithMeta = useMemo(() => facilities.map((facility) => {
    const distanceMiles = computeDistanceMiles(facility.latitude, facility.longitude, referenceCoordinate);
    const categories = getFacilityCategories(facility);
    const primaryCategory = categories[0] ?? 'other';
    const primaryService = facility.services[0]?.serviceType?.name ?? null;
    const primaryBadge = facility.services[0]?.availableBeds != null
      ? `${facility.services[0].availableBeds} beds`
      : null;
    const displayAddress = formatAddress(facility);
    const primaryContact = facility.contacts?.find((contact) => contact.isPrimary) ?? facility.contacts?.[0] ?? null;

    const districtLabel = (facility.nstDistrict ?? '').trim() || 'Unknown';
    const slug = createSlug(facility.name);

    return {
      ...facility,
      categories,
      primaryCategory,
      distanceMiles,
      primaryService,
      primaryBadge,
      displayAddress,
      primaryContact,
      slug,
      serviceNames: facility.services.map((service) => service.serviceType.name).filter(Boolean),
      districtLabel,
    };
  }), [facilities, referenceCoordinate]);

  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);

  const filteredFacilities = useMemo(() => {
    const base = activeFilter === 'All'
      ? facilitiesWithMeta
      : facilitiesWithMeta.filter((facility) => facility.districtLabel === activeFilter);

    return [...base].sort((a, b) => {
      const aDistance = a.distanceMiles ?? Number.POSITIVE_INFINITY;
      const bDistance = b.distanceMiles ?? Number.POSITIVE_INFINITY;
      return aDistance - bDistance;
    });
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
    const districts = new Set();
    facilitiesWithMeta.forEach((facility) => {
      districts.add(facility.districtLabel);
    });

    return ['All', ...Array.from(districts).sort((a, b) => a.localeCompare(b))];
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

  const locationLabel = userCoordinate ? 'Near your location' : 'San Francisco · Downtown';
  const locationStatusMessage = useMemo(() => {
    switch (geoStatus) {
      case 'pending':
        return 'Detecting your location…';
      case 'granted':
        return 'Showing availability near you.';
      case 'denied':
        return 'Location access denied — showing San Francisco by default.';
      case 'unsupported':
        return 'Location detection not supported; showing San Francisco by default.';
      case 'unavailable':
      case 'timeout':
      case 'error':
        return 'Couldn’t determine your location — showing San Francisco by default.';
      default:
        return null;
    }
  }, [geoStatus]);

  const [showMap, setShowMap] = useState(true);

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <Container>

        {isLoading && (
          <Text>Loading facility data…</Text>
        )}

        {isError && (
          <Stack>
            <Text>
              We couldn&rsquo;t load facilities right now. Please refresh to try again.
            </Text>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Stack>
        )}

        {!isLoading && !isError &&
          <>
            <Stack>
              <Box>
                <Text c='gray' tt='uppercase' size='sm'>{locationLabel}</Text>
                <Title>Available Sites</Title>
                <Group align='flex-start' justify='space-between'>
                  <Box>
                    <Text size='sm' c='dark'>
                      {(filteredFacilities.length || facilitiesWithMeta.length)} sites open · updated {formatRelativeTime(latestUpdatedAt)}
                    </Text>
                    {locationStatusMessage && (
                      <Text size='xs' c='dimmed'>{locationStatusMessage}</Text>
                    )}
                  </Box>
                  <Switch defaultChecked onChange={() => setShowMap((previous) => !previous)} label='Map' labelPosition='left' size='md' color='black' withThumbIndicator={false} />
                </Group>
              </Box>
              <Chip.Group value={activeFilter} onChange={setActiveFilter}>
                <Group mb='md' gap='xs' wrap='nowrap' style={{ overflowX: 'scroll' }}>
                  {availableFilters.map((filter) => (
                    <Chip
                      key={filter}
                      value={filter}
                    >
                      {filter}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Stack>
            <Grid>
              <Grid.Col span={{ base: 12, md: showMap ? 4 : 12 }} order={{ base: 2, md: 1 }}>
                <Stack>
                  {CATEGORY_CONFIG.map((category) => {
                    const categoryFacilities = facilitiesByCategory[category.id] ?? [];
                    if (!categoryFacilities.length) {
                      return null;
                    }

                    return (
                      <Stack key={category.id}>
                        <Title order={3}><span className='home__category-icon' aria-hidden='true'>{category.icon}</span>&nbsp;&nbsp;{category.label}</Title>
                        {categoryFacilities.map((facility) => (
                          <Facility key={facility.id} facility={facility} isSelected={selectedFacilityId === facility.id} onSelect={setSelectedFacilityId} />
                        ))}
                      </Stack>
                    );
                  })}
                  {!filteredFacilities.length && (
                    <Text>
                      No facilities match this filter yet. Try a different category.
                    </Text>
                  )}
                </Stack>
              </Grid.Col>
              {showMap &&
                <Grid.Col span={{ base: 12, md: 8 }} order={{ base: 1, md: 2 }}>
                  <Stack gap='xs'>
                    <Box mx={{ base: '-md', md: 0 }}>
                      <FacilityMap
                        facilities={filteredFacilities}
                        userLocation={userCoordinate}
                        height={400}
                      />
                    </Box>
                    <Text size='xs' c='dimmed'>
                      Last updated {formatUpdatedAt(latestUpdatedAt)}
                    </Text>
                  </Stack>
                </Grid.Col>}
            </Grid>
          </>}
      </Container>
    </>
  );
}

export default Home;
