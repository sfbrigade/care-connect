import Card from './Card';
import CategoryIcon from './CategoryIcon';

export default function Facility ({ facility, isSelected, onSelect }) {
  return (
    <div
      style={{
        cursor: 'pointer',
        border: isSelected ? '1px solid #228be6' : 'none',
        boxShadow: isSelected ? '0 14px 30px rgba(34, 139, 230, 0.2)' : 'none',
        borderRadius: '16px',
        outline: 'none',
      }}
      onClick={() => onSelect(facility.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onSelect(facility.id);
        }
      }}
      tabIndex={0}
      role='button'
    >
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CategoryIcon categoryId={facility.primaryCategory} variant='card' />
          <span
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 600,
              color: '#000000',
            }}
          >
            {facility.distanceMiles != null ? `${facility.distanceMiles.toFixed(1)} mi` : 'Distance n/a'}
          </span>
        </div>
        <span
          style={{
            fontSize: '15px',
            lineHeight: '22px',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 600,
            color: '#212529',
            margin: 0,
          }}
        >
          {facility.name}
        </span>
        {facility.districtLabel && (
          <span
            style={{
              fontSize: '13px',
              lineHeight: '18px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 500,
              color: '#0f172a',
              margin: 0,
            }}
          >
            {facility.districtLabel}
          </span>
        )}
        {facility.displayAddress && (
          <span
            style={{
              fontSize: '13px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
              margin: 0,
            }}
          >
            {facility.displayAddress}
          </span>
        )}
        {facility.primaryService && (
          <span
            style={{
              fontSize: '13px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
              margin: 0,
            }}
          >
            {facility.primaryService}
          </span>
        )}
      </Card>
    </div>
  );
}
