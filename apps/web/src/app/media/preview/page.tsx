'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SUPPORTED_FORMATS = ['webp', 'avif', 'jpeg', 'png'];
const CROP_MODES = ['fill', 'fit', 'scale', 'crop', 'pad'];
const GRAVITY = ['center','north','south','east','west','face','auto'];

function buildTransformUrl(originalUrl: string, params: Record<string,string>) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  // Derive path relative to API origin. Accept absolute or relative input.
  let pathPart = originalUrl;
  try {
    const maybeUrl = new URL(originalUrl);
    pathPart = maybeUrl.pathname; // e.g. /public/image.png
  } catch {
    // not an absolute URL; keep as-is
  }

  // If original came from same API base, trim its origin prefix
  if (apiBase && originalUrl.startsWith(apiBase)) {
    pathPart = originalUrl.slice(apiBase.length);
  }

  // Ensure no leading slash duplication in final join and drop leading 'public/' if present
  let normalizedPath = pathPart.replace(/^\//, '');
  if (normalizedPath.startsWith('public/')) {
    normalizedPath = normalizedPath.replace(/^public\//, '');
  }

  const segments: string[] = [];
  Object.entries(params).forEach(([k,v]) => {
    if (!v) return;
    segments.push(`${k}:${v}`);
  });

  const tPath = `t/${segments.join('/')}/${normalizedPath}`;
  return apiBase ? `${apiBase}/${tPath}` : `/${tPath}`;
}

type Variant = { url: string; params: Record<string,string>; size?: number };

function formatBytes(bytes?: number) {
  if (!bytes || bytes < 0) return '-';
  const units = ['B','KB','MB','GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function summarizeParams(params: Record<string,string>) {
  const order = ['format','quality','resize','crop','gravity','rotate','background','aspect'];
  return order
    .filter(k => params[k])
    .map(k => `${k}:${params[k]}`)
    .join(', ');
}

async function fetchVariantSize(u: string): Promise<number | undefined> {
  try {
    // Try HEAD first
    const head = await fetch(u, { method: 'HEAD', cache: 'no-store' });
    if (head.ok) {
      const x = head.headers.get('X-Optimized-Size') || head.headers.get('content-length');
      return x ? Number(x) : undefined;
    }
  } catch {}
  try {
    const res = await fetch(u, { method: 'GET', cache: 'no-store' });
    const x = res.headers.get('X-Optimized-Size') || res.headers.get('content-length');
    if (x) return Number(x);
    // Fallback: compute size from blob if headers not exposed/available
    const blob = await res.clone().blob();
    return blob.size;
  } catch {}
  return undefined;
}

async function resolveSizeWithRetry(u: string, attempts = 3, delayMs = 300): Promise<number | undefined> {
  for (let i = 0; i < attempts; i++) {
    const s = await fetchVariantSize(u);
    if (typeof s === 'number' && !Number.isNaN(s)) return s;
    if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return undefined;
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

  const [applyQuality, setApplyQuality] = useState<boolean>(false);
  const [applyResize, setApplyResize] = useState<boolean>(false);
  const [applyAspect, setApplyAspect] = useState<boolean>(false);
  const [applyCrop, setApplyCrop] = useState<boolean>(false);
  const [applyGravity, setApplyGravity] = useState<boolean>(false);
  const [applyRotate, setApplyRotate] = useState<boolean>(false);
  const [applyBackground, setApplyBackground] = useState<boolean>(false);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [originalSize, setOriginalSize] = useState<number | undefined>(undefined);

  const baseOriginal = useMemo(()=>url, [url]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!baseOriginal) return;
      const size = await fetchVariantSize(baseOriginal);
      if (active) setOriginalSize(size);
    })();
    return () => { active = false };
  }, [baseOriginal]);

  const apply = async () => {
    const p: Record<string,string> = {};
    if (format) p.format = format;
    if (applyQuality && quality) p.quality = String(quality);
    if (applyResize && resize) p.resize = resize;
    if (applyCrop && crop) p.crop = crop;
    if (applyGravity && gravity) p.gravity = gravity;
    if (applyRotate && rotate) p.rotate = rotate;
    if (applyBackground && background) p.background = background.replace('#','');
    if (applyAspect && aspect) p.aspect = aspect;

    const u = buildTransformUrl(baseOriginal, p);
    // Optimistically add, then fill size
    setVariants(v => [{ url: u, params: p }, ...v]);
    const size = await resolveSizeWithRetry(u);
    setVariants(v => v.map(item => item.url === u ? { ...item, size } : item));
  };

  const handleClear = () => {
    setVariants([]);
    setApplyQuality(false);
    setApplyResize(false);
    setApplyAspect(false);
    setApplyCrop(false);
    setApplyGravity(false);
    setApplyRotate(false);
    setApplyBackground(false);

    setQuality(80);
    setResize('');
    setAspect('');
    setCrop('fill');
    setGravity('center');
    setRotate('');
    setBackground('');
  };

  if (!url) return <div className="p-6">No image specified.</div>;

  return (
    <div className="p-6">
      <div className="mx-auto">
        <div className="mb-6 flex items-start gap-6">
          <div className="w-1/5">
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
                <div className="text-xs text-muted-foreground mt-1">Original • {formatBytes(originalSize)}</div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Transform controls</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm mb-1">Format</label>
                <select className="w-full rounded-md border px-2 py-1" value={format} onChange={e=>setFormat(e.target.value)}>
                  {SUPPORTED_FORMATS.map(f=> <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant={applyQuality ? 'secondary' : 'outline'} size="sm" onClick={()=>setApplyQuality(v=>!v)}>Quality</Button>
              <Button variant={applyResize ? 'secondary' : 'outline'} size="sm" onClick={()=>setApplyResize(v=>!v)}>Resize</Button>
              <Button variant={applyAspect ? 'secondary' : 'outline'} size="sm" onClick={()=>setApplyAspect(v=>!v)}>Aspect</Button>
              <Button variant={applyCrop ? 'secondary' : 'outline'} size="sm" onClick={()=>setApplyCrop(v=>!v)}>Crop</Button>
              <Button variant={applyGravity ? 'secondary' : 'outline'} size="sm" onClick={()=>setApplyGravity(v=>!v)}>Gravity</Button>
              <Button variant={applyRotate ? 'secondary' : 'outline'} size="sm" onClick={()=>setApplyRotate(v=>!v)}>Rotate</Button>
              <Button variant={applyBackground ? 'secondary' : 'outline'} size="sm" onClick={()=>setApplyBackground(v=>!v)}>Background</Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {applyQuality && (
                <div>
                  <label className="block text-sm mb-1">Quality</label>
                  <input type="number" min={1} max={100} value={quality} onChange={e=>setQuality(Number(e.target.value))} className="w-full rounded-md border px-2 py-1" />
                </div>
              )}

              {applyResize && (
                <div>
                  <label className="block text-sm mb-1">Resize (WxH)</label>
                  <input placeholder="800x600" value={resize} onChange={e=>setResize(e.target.value)} className="w-full rounded-md border px-2 py-1" />
                </div>
              )}

              {applyAspect && (
                <div>
                  <label className="block text-sm mb-1">Aspect (W:H)</label>
                  <input placeholder="16:9" value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full rounded-md border px-2 py-1" />
                </div>
              )}

              {applyCrop && (
                <div>
                  <label className="block text-sm mb-1">Crop</label>
                  <select className="w-full rounded-md border px-2 py-1" value={crop} onChange={e=>setCrop(e.target.value)}>
                    {CROP_MODES.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {applyGravity && (
                <div>
                  <label className="block text-sm mb-1">Gravity</label>
                  <select className="w-full rounded-md border px-2 py-1" value={gravity} onChange={e=>setGravity(e.target.value)}>
                    {GRAVITY.map(g=> <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}

              {applyRotate && (
                <div>
                  <label className="block text-sm mb-1">Rotate</label>
                  <input placeholder="auto or degrees" value={rotate} onChange={e=>setRotate(e.target.value)} className="w-full rounded-md border px-2 py-1" />
                </div>
              )}

              {applyBackground && (
                <div>
                  <label className="block text-sm mb-1">Background</label>
                  <input placeholder="#000000 or transparent" value={background} onChange={e=>setBackground(e.target.value)} className="w-full rounded-md border px-2 py-1" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={apply}>Apply</Button>
              <Button onClick={handleClear} variant="ghost">Clear</Button>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-3">Applied transforms</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {variants.map((v, i) => (
            <TooltipProvider key={i} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="group bg-card border border-border rounded-lg overflow-hidden cursor-default">
                    <div className="w-full bg-gray-100 flex items-center justify-center">
                      <img src={v.url || ''} alt={`variant-${i}`} className="max-h-64 w-auto object-contain" />
                    </div>
                    <div className="p-2">
                      <div className="text-sm font-medium truncate">{(v.url || '').split('/').slice(-1)[0]}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatBytes(v.size)}
                        {typeof originalSize === 'number' && typeof v.size === 'number' && originalSize > 0 ? (
                          <> • -{((1 - v.size / originalSize) * 100).toFixed(1)}%</>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  <div className="font-medium mb-1">Applied</div>
                  <div className="text-muted-foreground break-words">{summarizeParams(v.params)}</div>
                  <div className="mt-2">Size: {formatBytes(v.size)}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  );
}
