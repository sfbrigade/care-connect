import { useParams } from 'react-router';

export default function Form849BHtmlPreview () {
  const { deflectionId } = useParams();

  return (
    <iframe
      src={`/api/forms/849b/html/${deflectionId}`}
      title='849B HTML Preview'
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
}
