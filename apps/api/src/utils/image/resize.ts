import sharp from 'sharp';
import { CropMode, GravityMode } from 'shared';
import { getSharpPosition } from './gravity';
import { parseBackgroundColor } from './background';

/**
 * Apply resize transformation to an image
 */
export const applyResize = (
  image: sharp.Sharp,
  resizeParam: string,
  cropMode: CropMode = 'fill',
  gravity: GravityMode = 'center',
  background?: string
): sharp.Sharp => {
  if (!resizeParam || !resizeParam.includes('x')) {
    return image; // invalid resize param, skip safely
  }
  const [w, h] = resizeParam.split('x');
  const width = parseInt(w, 10);
  const height = parseInt(h, 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return image; // guard against bad values
  }
  
  const resizeOptions: sharp.ResizeOptions = {
    width,
    height,
  };

  switch (cropMode) {
    case 'fill':
      // Resize to fill the entire area, cropping if necessary
      resizeOptions.fit = 'cover';
      resizeOptions.position = getSharpPosition(gravity);
      break;
    
    case 'fit':
      // Produce an image of the exact requested dimensions while maintaining aspect ratio
      // by letterboxing/pillarboxing the image within the canvas.
      // This better matches the expectation of "fit" producing WxH when crop is defined.
      resizeOptions.fit = 'contain';
      resizeOptions.background = parseBackgroundColor(background);
      // We want the final canvas to be exactly WxH, so do not prohibit enlargement
      resizeOptions.withoutEnlargement = false;
      break;
    
    case 'scale':
      // Scale to exact dimensions, ignoring aspect ratio
      resizeOptions.fit = 'fill';
      break;
    
    case 'crop':
      // Resize and crop to exact dimensions, maintaining aspect ratio
      resizeOptions.fit = 'cover';
      resizeOptions.position = getSharpPosition(gravity);
      break;
    
    case 'pad':
      // Resize to fit within dimensions and pad with background color
      resizeOptions.fit = 'contain';
      resizeOptions.background = parseBackgroundColor(background);
      break;
    
    default:
      // Default to fill mode
      resizeOptions.fit = 'cover';
      resizeOptions.position = getSharpPosition(gravity);
  }

  return image.resize(resizeOptions);
};