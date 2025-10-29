'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const SUPPORTED_FORMATS = ['webp', 'avif', 'jpeg', 'png'];
const CROP_MODES = ['fill', 'fit', 'scale', 'crop', 'pad'];
const GRAVITY = ['center','north','south','east','west','face','auto'];

function buildTransformUrl(originalUrl: string, params: Record<string,string>) {
  // Strip leading slash from originalUrl
  const filePath = originalUrl.replace(/^\//, '');
  const segments: string[] = [];
  Object.entries(params).forEach(([k,v]) => {
    if (!v) return;
    // special-case aspect containing colon
    segments.push(`${k}:${v}`);
  });

  return `/t/${segments.join('/')}/${filePath}`;
}

export default function MediaPreviewPage(){
  const search = useSearchParams();
  const url = search?.get('url') || '';
  const name = search?.get('name') || '';

  const [format, setFormat] = useState<string>('webp');
  const [quality, setQuality] = useState<number>(80);
  const [resize, setResize] = useState<string>('');
  const [crop, setCrop] = useState<string>('fill');
  const [gravity, setGravity] = useState<string>('center');
  const [rotate, setRotate] = useState<string>('');
  const [background, setBackground] = useState<string>('');
  const [aspect, setAspect] = useState<string>('');

  const [variants, setVariants] = useState<string[]>([]);

  const baseOriginal = useMemo(()=>url, [url]);

  const apply = () => {
    const p: Record<string,string> = {};
    if (format) p.format = format;
    if (quality) p.quality = String(quality);
    if (resize) p.resize = resize;
    if (crop) p.crop = crop;
    if (gravity) p.gravity = gravity;
    if (rotate) p.rotate = rotate;
    if (background) p.background = background.replace('#','');
    if (aspect) p.aspect = aspect;

    const u = buildTransformUrl(baseOriginal, p);
    setVariants(v => [u, ...v]);
  };

  if (!url) return <div className="p-6">No image specified.</div>;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start gap-6">
          <div className="w-2/5">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="w-full relative bg-gray-100">
                <div style={{paddingTop: '100%'}} />
                {/* original preview */}
                {baseOriginal.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={baseOriginal} className="absolute inset-0 w-full h-full object-contain" controls/>
                ) : (
                  <img src={baseOriginal} alt={name} className="absolute inset-0 w-full h-full object-contain" />
                )}
              </div>
              <div className="p-2">
                <div className="text-sm font-medium truncate">{name}</div>
                <div className="text-xs text-muted-foreground mt-1">Original</div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Transform controls</h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm mb-1">Format</label>
                <select className="w-full rounded-md border px-2 py-1" value={format} onChange={e=>setFormat(e.target.value)}>
                  {SUPPORTED_FORMATS.map(f=> <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Quality</label>
                <input type="number" min={1} max={100} value={quality} onChange={e=>setQuality(Number(e.target.value))} className="w-full rounded-md border px-2 py-1" />
              </div>

              <div>
                <label className="block text-sm mb-1">Resize (WxH)</label>
                <input placeholder="800x600" value={resize} onChange={e=>setResize(e.target.value)} className="w-full rounded-md border px-2 py-1" />
              </div>

              <div>
                <label className="block text-sm mb-1">Aspect (W:H)</label>
                <input placeholder="16:9" value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full rounded-md border px-2 py-1" />
              </div>

              <div>
                <label className="block text-sm mb-1">Crop</label>
                <select className="w-full rounded-md border px-2 py-1" value={crop} onChange={e=>setCrop(e.target.value)}>
                  {CROP_MODES.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Gravity</label>
                <select className="w-full rounded-md border px-2 py-1" value={gravity} onChange={e=>setGravity(e.target.value)}>
                  {GRAVITY.map(g=> <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Rotate</label>
                <input placeholder="auto or degrees" value={rotate} onChange={e=>setRotate(e.target.value)} className="w-full rounded-md border px-2 py-1" />
              </div>

              <div>
                <label className="block text-sm mb-1">Background</label>
                <input placeholder="#000000 or transparent" value={background} onChange={e=>setBackground(e.target.value)} className="w-full rounded-md border px-2 py-1" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={apply}>Apply</Button>
              <Button onClick={()=>setVariants([])} variant="ghost">Clear</Button>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-3">Applied transforms</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {variants.map((v, i) => (
            <div key={i} className="group bg-card border border-border rounded-lg overflow-hidden">
              <div className="w-full relative bg-gray-100">
                <div style={{paddingTop: '100%'}} />
                <img src={v} alt={`variant-${i}`} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <div className="text-sm font-medium truncate">{v.split('/').slice(-1)[0]}</div>
                <div className="text-xs text-muted-foreground mt-1">Transformed</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
