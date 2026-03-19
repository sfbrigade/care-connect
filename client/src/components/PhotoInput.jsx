import { Box, CloseButton, Image, Input, Loader, Text } from '@mantine/core';
import classNames from 'classnames';

import DropzoneUploader from './DropzoneUploader';
import classes from './PhotoInput.module.css';

function PhotoInput ({ children, description, error, id, label, maxPhotos, onAllUploaded, onChange, photoCount }) {
  function onUploaded (status) {
    onChange?.(status.filename);
  }

  return (
    <Input.Wrapper label={label} description={description} error={error}>
      <Input
        variant='unstyled'
        classNames={{ input: classes.compactInput }}
        renderRoot={(props) => (
          <Box {...props}>
            <DropzoneUploader
              id={id}
              maxPhotos={maxPhotos}
              photoCount={photoCount}
              onAllUploaded={onAllUploaded}
              onUploaded={onUploaded}
            >
              {({ statuses, onRemove }) => (
                <Box>
                  {statuses.length > 0 && statuses.map((s) => (
                    <Box
                      key={s.id}
                      className={classNames(classes.preview, {
                        [classes['preview--uploading']]: s.status === 'pending' || s.status === 'uploading',
                      })}
                    >
                      <Image src={s.file.preview} alt='' />
                      <CloseButton onClick={() => onRemove(s)} className={classes.remove} />
                      <Loader className={classes.spinner} />
                    </Box>
                  ))}
                  {statuses.length === 0 && photoCount < maxPhotos && (
                    children || <Text className='clickable' inherit={false} fz='sm' my='sm'>Drag-and-drop a photo file here, or click here to browse and select a file.</Text>
                  )}
                </Box>
              )}
            </DropzoneUploader>
          </Box>
        )}
      />
    </Input.Wrapper>
  );
}

export default PhotoInput;
