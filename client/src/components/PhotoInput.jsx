import { useEffect } from 'react';
import { Box, Button, CloseButton, Image, Input, Loader, Text } from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import classNames from 'classnames';

import DropzoneUploader from './DropzoneUploader';
import classes from './PhotoInput.module.css';

function PhotoInput ({ children, description, error, id, label, name, onChange, defaultValue, value, valueUrl }) {
  const [_value, handleChange] = useUncontrolled({
    value,
    defaultValue,
    finalValue: '',
    onChange,
  });

  useEffect(() => {
    if (!_value) {
      handleChange(defaultValue);
    }
  }, [defaultValue]);

  function onRemoved () {
    handleChange('');
  }

  function onUploaded (status) {
    handleChange(status.filename);
  }

  return (
    <Input.Wrapper label={label} description={description} error={error}>
      <Input
        variant='unstyled' renderRoot={(props) => (
          <Box h='auto' {...props}>
            <DropzoneUploader
              id={id}
              multiple={false}
              disabled={!!_value && _value !== ''}
              onRemoved={onRemoved}
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
                  {statuses.length === 0 && !!_value && (
                    <Box className={classes.preview}>
                      <Image src={valueUrl} alt='' />
                      <CloseButton className={classes.remove} onClick={onRemoved} />
                      <Button onClick={onRemoved} variant='secondary' size='md' mt='md'>Change photo</Button>
                    </Box>
                  )}
                  {statuses.length === 0 && !_value && (
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
