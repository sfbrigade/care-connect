import './Facility.css';
import CategoryIcon from './CategoryIcon';

export default function Facility ({ facility, isSelected, onSelect }) {
  return (
    <article
      key={facility.id}
      className={`card ${isSelected ? 'card--selected' : ''}`}
      role='button'
      tabIndex={0}
      onClick={() => onSelect(facility.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onSelect(facility.id);
        }
      }}
    >
      <div className='card__row'>
        <CategoryIcon categoryId={facility.primaryCategory} variant='card' />
        <span className='card__metric'>
          {facility.distanceMiles != null ? `${facility.distanceMiles.toFixed(1)} mi` : 'Distance n/a'}
        </span>
      </div>
      <h3 className='card__title'>
        <span className='card__title-text'>{facility.name}</span>
      </h3>
      <p className='card__neighborhood'>{facility.districtLabel}</p>
      {facility.displayAddress && (
        <p className='card__subtitle'>{facility.displayAddress}</p>
      )}
      {facility.primaryService && (
        <p className='card__meta'>{facility.primaryService}</p>
      )}
    </article>
  );
}
