import { useEffect } from 'react';
import { Box, CloseButton, Image, Input, Loader, Text } from '@mantine/core';
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
      <Input renderRoot={(props) => (
        <Box h='auto' {...props}>
          <DropzoneUploader
            id={id}
            multiple={false}
            disabled={!!_value && _value !== ''}
            onRemoved={onRemoved}
            onUploaded={onUploaded}
          >
            {({ statuses, onRemove }) => {
              if (statuses.length > 0) {
                return statuses.map((s) => (
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
                ));
              } else if (statuses.length === 0 && _value) {
                return (
                  <Box className={classes.preview}>
                    <Image src={valueUrl} alt='' />
                    <CloseButton className={classes.remove} onClick={onRemoved} />
                  </Box>
                );
              } else if (statuses.length === 0 && !_value) {
                return children || <Text className='clickable' inherit={false} fz='sm' my='sm'>Drag-and-drop a photo file here, or click here to browse and select a file.</Text>;
              }
            }}
          </DropzoneUploader>
        </Box>
      )}
      />
    </Input.Wrapper>
  );
}

export default PhotoInput;
