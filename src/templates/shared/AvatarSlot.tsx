/* eslint-disable @next/next/no-img-element */

import type { PictureConfig } from "@/lib/schema/resume.schema";

export function shouldShowAvatar(picture: PictureConfig): boolean {
  return picture.hidden !== true && picture.url.trim() !== "";
}

export function AvatarSlot({
  picture,
  onError,
}: {
  picture: PictureConfig;
  /** Lets the header collapse the empty column when the image cannot load. */
  onError?: () => void;
}) {
  if (!shouldShowAvatar(picture)) {
    return null;
  }

  return (
    <img
      src={picture.url}
      alt=""
      loading="eager"
      decoding="sync"
      onError={onError}
      style={{
        display: "block",
        flexShrink: 0,
        width: `${picture.size}pt`,
        height: `${picture.size * picture.aspectRatio}pt`,
        borderRadius: `${picture.borderRadius}pt`,
        objectFit: picture.fit,
      }}
    />
  );
}
