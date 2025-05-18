import React, { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import Button from './Button';

interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
  imageSrc?: string | null;
  loading?: boolean;
  error?: string | null;
}

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ open, onClose, onCropComplete, imageSrc, loading: loadingProp, error: errorProp }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const loading = loadingProp !== undefined ? loadingProp : loadingInternal;
  const errorMsg = errorProp;
  const [minZoom, setMinZoom] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const isMobile = window.innerWidth < 640;
  const cropperRef = useRef<any>(null);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(minZoom);
    setCroppedAreaPixels(null);
    setPreview(null);
  }, [imageSrc, open, minZoom]);

  const onCropChange = (crop: any) => setCrop(crop);
  const onZoomChange = (zoom: number) => setZoom(zoom);
  const onCropCompleteInternal = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
    if (imageSrc && croppedAreaPixels) {
      getCroppedImg(imageSrc, croppedAreaPixels).then((img) => setPreview(img));
    }
  }, [imageSrc]);

  const handleMediaLoaded = useCallback((mediaSize: { width: number; height: number }) => {
    const containerWidth = isMobile ? window.innerWidth : 400;
    const containerHeight = isMobile ? window.innerHeight * 0.65 : Math.min(window.innerWidth * 0.6, 400);
    const cropSize = Math.min(containerWidth, containerHeight);
    const minZoomCalc = Math.max(cropSize / mediaSize.width, cropSize / mediaSize.height);
    setMinZoom(minZoomCalc);
    setZoom(minZoomCalc);
  }, [isMobile]);

  async function getCroppedImg(imageSrc: string, crop: any) {
    const image = new window.Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );
    return canvas.toDataURL('image/jpeg');
  }

  const handleCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    if (loadingProp === undefined) setLoadingInternal(true);
    const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
    if (loadingProp === undefined) setLoadingInternal(false);
    if (croppedImage) {
      onCropComplete(croppedImage);
      onClose();
    }
  };

  if (!open || !imageSrc) return null;

  if (isMobile) {
    // MOBILE: fullscreen, barra topo fixa, cropper ocupa 65vh, preview maior, botões fixos embaixo
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-base font-bold">Edit Profile Photo</h2>
          <button className="text-gray-500 text-2xl leading-none" onClick={onClose}>&times;</button>
        </div>
        {/* Cropper */}
        <div className="flex-1 flex flex-col items-center justify-center px-2 overflow-y-auto">
          <div className="relative w-full" style={{ height: '50vh', maxHeight: 350 }}>
            <Cropper
              ref={cropperRef}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteInternal}
              minZoom={minZoom}
              maxZoom={4}
              restrictPosition={true}
              onMediaLoaded={handleMediaLoaded}
            />
          </div>
          <input
            type="range"
            min={minZoom}
            max={4}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full my-3"
          />
          <div
            className="mx-auto mb-2 flex items-center justify-center border-2 border-accent/40 bg-gray-100"
            style={{
              width: '25vw',
              height: '25vw',
              minWidth: 80,
              minHeight: 80,
              maxWidth: 120,
              maxHeight: 120,
              borderRadius: '9999px',
            }}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-text-muted text-xs">Preview</span>
            )}
          </div>
        </div>
        {/* Bottom bar */}
        {errorMsg && <div className="text-red-500 text-sm mb-2 text-center">{errorMsg}</div>}
        <div className="flex gap-3 w-full px-4 py-3 bg-white border-t border-gray-200 sticky bottom-0 z-10">
          <Button variant="outline" className="flex-1 py-2 text-sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button className="flex-1 py-2 text-sm" onClick={handleCrop} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    );
  }

  // DESKTOP: mantém layout atual, preview rounded-full
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-2">
        <button className="absolute top-3 right-3 text-gray-500 hover:text-accent z-10" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold mb-4 text-center">Edit Profile Photo</h2>
        <div className="flex flex-row gap-8 items-center">
          {/* Cropper */}
          <div className="relative w-full max-w-[400px] h-[min(60vw,400px)] bg-gray-100 rounded-lg overflow-hidden mb-4">
            <Cropper
              ref={cropperRef}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteInternal}
              minZoom={minZoom}
              maxZoom={4}
              restrictPosition={true}
              onMediaLoaded={handleMediaLoaded}
            />
          </div>
          {/* Preview ao vivo */}
          <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-accent/40 bg-gray-100 flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-text-muted">Preview</span>
            )}
          </div>
        </div>
        <input
          type="range"
          min={minZoom}
          max={4}
          step={0.01}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="w-full mb-4"
        />
        {errorMsg && <div className="text-red-500 text-sm mb-2 text-center">{errorMsg}</div>}
        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button className="flex-1" onClick={handleCrop} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal; 