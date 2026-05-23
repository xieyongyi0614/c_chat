import type { MediaPreviewItem } from '@c_chat/shared-types';
import { useEffect, useState } from 'react';
import { resolveMediaUrl, revokeObjectUrl } from '../utils/media';
import { getMediaName } from '../utils/preview';

interface PreviewThumbProps {
  item: MediaPreviewItem;
}

export function PreviewThumb({ item }: PreviewThumbProps) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    resolveMediaUrl(item)
      .then((url) => {
        if (!active) {
          revokeObjectUrl(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch((error) => {
        console.error('Failed to load thumbnail:', error);
        if (active) setSrc('');
      });

    return () => {
      active = false;
      revokeObjectUrl(objectUrl);
    };
  }, [item]);

  if (!src) {
    return (
      <div className="grid size-12 place-items-center rounded bg-black/5 text-[10px] text-black/45">
        加载
      </div>
    );
  }

  if (item.type === 'video') {
    return (
      <video src={src} className="size-12 rounded bg-black object-cover" muted preload="metadata" />
    );
  }

  return <img src={src} alt={getMediaName(item)} className="size-12 rounded object-cover" />;
}
