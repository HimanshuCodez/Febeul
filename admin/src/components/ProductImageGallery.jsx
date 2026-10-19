/* eslint-disable react/prop-types -- Shared by the product editors with their image arrays and callbacks. */
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, X } from 'lucide-react';
import { PRODUCT_IMAGE_ACCEPT, PRODUCT_UPLOAD_HINT } from '../../../shared/productUploads.js';

function ImagePreview({ image, alt }) {
  const [source, setSource] = useState(typeof image === 'string' ? image : '');
  useEffect(() => {
    if (typeof image === 'string') { setSource(image); return; }
    const objectUrl = URL.createObjectURL(image);
    setSource(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);
  return <img src={source || undefined} alt={alt} draggable={false} className="h-24 w-24 select-none rounded-xl border border-[#e5dbe9] bg-white object-cover" />;
}

export default function ProductImageGallery({ images, onChange, onUpload, variationIndex, canRemove = true, disabled = false }) {
  const galleryId = useId();
  const identities = useRef(new WeakMap());
  const nextIdentity = useRef(0);
  const dragSource = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const variationNumber = variationIndex + 1;
  const imageKey = image => {
    if (typeof image === 'string') return image;
    if (!identities.current.has(image)) identities.current.set(image, `upload-${nextIdentity.current++}`);
    return identities.current.get(image);
  };

  const finishDrag = () => {
    dragSource.current = null;
    setDragging(null);
    setDropTarget(null);
  };
  const moveImage = (from, to) => {
    if (disabled || from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) return;
    const reordered = [...images];
    const [image] = reordered.splice(from, 1);
    reordered.splice(to, 0, image);
    onChange(reordered);
    setAnnouncement(`Image ${from + 1} moved to position ${to + 1}${to === 0 ? ', the cover image' : ''}.`);
  };
  const controlClass = 'flex h-7 w-8 items-center justify-center rounded-md text-[#776580] hover:bg-[#f5e9f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b77997] disabled:cursor-not-allowed disabled:opacity-30';

  return <div className="min-w-0">
    <p className="mb-2 text-xs font-medium text-[#776580]">Images</p>
    <p id={`${galleryId}-help`} className="mb-3 text-[11px] leading-relaxed text-[#8b7b93]">Drag images to reorder, or use the arrows. The first image is the cover.</p>
    <div className="flex flex-wrap items-start gap-3" role="list" aria-label={`Images for variation ${variationNumber}`}>
      {images.map((image, index) => <div
        key={imageKey(image)} role="listitem" data-image-index={index}
        className={`relative w-24 rounded-xl transition-shadow ${dragging === index ? 'opacity-50' : ''} ${dropTarget === index && dragging !== index ? 'ring-2 ring-[#b77997] ring-offset-2' : ''}`}
        onDragOver={event => {
          if (disabled || dragSource.current === null) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDropTarget(index);
        }}
        onDrop={event => {
          if (disabled || dragSource.current === null) return;
          event.preventDefault();
          moveImage(dragSource.current, index);
          finishDrag();
        }}
      >
        <div
          role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled}
          aria-label={`Reorder image ${index + 1} in variation ${variationNumber}`}
          aria-describedby={`${galleryId}-help`}
          draggable={!disabled && images.length > 1}
          className={`relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#b77997] ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
          onDragStart={event => {
            if (disabled) { event.preventDefault(); return; }
            dragSource.current = index;
            setDragging(index);
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', `${galleryId}:${index}`);
          }}
          onDragEnd={finishDrag}
          onKeyDown={event => {
            const target = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: images.length - 1 }[event.key];
            if (target !== undefined) { event.preventDefault(); moveImage(index, target); }
          }}
        >
          <ImagePreview image={image} alt={`Variation ${variationNumber}, image ${index + 1}`} />
          <span className={`pointer-events-none absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${index === 0 ? 'bg-[#514459] text-white' : 'bg-white/95 text-[#514459]'}`}>{index === 0 ? 'Cover' : index + 1}</span>
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-white/90 p-0.5 text-[#776580]"><GripVertical size={13} aria-hidden="true" /></span>
        </div>
        {canRemove && <button type="button" disabled={disabled} aria-label={`Remove image ${index + 1} from variation ${variationNumber}`}
          onClick={() => { finishDrag(); onChange(images.filter((_, i) => i !== index)); }}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#e9d9e3] bg-white text-[#a96483] shadow-sm hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">
          <X size={14} aria-hidden="true" />
        </button>}
        <div className="mt-1 flex justify-between">
          <button type="button" title="Move earlier" aria-label={`Move image ${index + 1} earlier in variation ${variationNumber}`} disabled={disabled || index === 0} onClick={() => moveImage(index, index - 1)} className={controlClass}><ArrowLeft size={14} aria-hidden="true" /></button>
          <button type="button" title="Move later" aria-label={`Move image ${index + 1} later in variation ${variationNumber}`} disabled={disabled || index === images.length - 1} onClick={() => moveImage(index, index + 1)} className={controlClass}><ArrowRight size={14} aria-hidden="true" /></button>
        </div>
      </div>)}
      <div role="listitem">
        <label className={`relative flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfb8d7] bg-white text-[#a27695] transition-colors focus-within:ring-2 focus-within:ring-[#b77997] ${disabled ? 'opacity-40' : 'cursor-pointer hover:border-[#b77997] hover:bg-[#faf0f6]'}`}>
          <ImagePlus size={22} aria-hidden="true" /><span className="text-[11px] font-medium">Upload images</span>
          <input aria-label={`Upload images for variation ${variationNumber}`} accept={PRODUCT_IMAGE_ACCEPT} onChange={onUpload} disabled={disabled} type="file" multiple className="sr-only" />
        </label>
      </div>
    </div>
    <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    <p className="mt-2 text-[11px] leading-relaxed text-[#8b7b93]">{PRODUCT_UPLOAD_HINT}</p>
  </div>;
}
