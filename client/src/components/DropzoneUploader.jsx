import { useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone-esm';
import { v4 as uuid } from 'uuid';

import Api from '../Api';

function DropzoneUploader ({ className, children, id, maxPhotos, photoCount, onAllUploaded, onRemoved, onUploading }) {
  const [files, setFiles] = useState([]);
  const [rejectedFiles, setRejectedFiles] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [batchId, setBatchId] = useState(null);
  const completedBatchRef = useRef(null);

  useEffect(
    () => () => {
      // Make sure to revoke the data uris to avoid memory leaks
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    },
    [files]
  );

  useEffect(() => {
    for (const status of statuses) {
      if (status.status === 'uploading') {
        break;
      } else if (status.status === 'pending') {
        status.status = 'uploading';
        setStatuses([...statuses]);
        if (onUploading) {
          onUploading(status);
        }
        const data = {
          filename: status.file.name,
          contentType: status.file.type || 'application/octet-stream',
          byteSize: status.file.size,
        };
        Api.assets
          .create(data)
          .then((response) => {
            const { filename, url, headers } = response.data;
            status.filename = filename;
            return Api.assets.upload(url, headers, status.file);
          })
          .then(() => {
            status.status = 'uploaded';
            setStatuses([...statuses]);
          });
        break;
      }
    }
  }, [onUploading, statuses]);

  useEffect(() => {
    if (!onAllUploaded || !batchId || statuses.length === 0) {
      return;
    }

    const allUploaded = statuses.every((status) => status.status === 'uploaded');
    if (allUploaded && completedBatchRef.current !== batchId) {
      completedBatchRef.current = batchId;
      const filenames = statuses.map((status) => status.filename).filter(Boolean);
      onAllUploaded(filenames);
    }
  }, [batchId, onAllUploaded, statuses]);

  function onDropAccepted (acceptedFiles) {
    const nextBatchId = uuid();
    setBatchId(nextBatchId);
    setFiles(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
    );
    const statuses = [];
    for (const file of acceptedFiles) {
      const status = {
        id: uuid(),
        batchId: nextBatchId,
        file,
        status: 'pending', // uploading, uploaded, error
        filename: null,
      };
      statuses.push(status);
    }
    setStatuses(statuses);
  }

  function onDropRejected (rejectedFiles) {
    setRejectedFiles(rejectedFiles);
  }

  function onRemove (status) {
    setFiles(files.filter((f) => f !== status.file));
    setStatuses(statuses.filter((s) => s !== status));
    if (onRemoved) {
      onRemoved(status);
    }
  }

  const { getRootProps, getInputProps } = useDropzone({
    id,
    maxFiles: maxPhotos - photoCount,
    onDropAccepted,
    onDropRejected,
  });

  return (
    <div className={className}>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        {children({ statuses, onRemove, rejectedFiles })}
      </div>
    </div>
  );
}

export default DropzoneUploader;
