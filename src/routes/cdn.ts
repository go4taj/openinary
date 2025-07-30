import { Hono } from 'hono';
import { getCachePath, existsInCache, saveToCache, readFromCache } from '../utils/cache';
import { parseParams } from '../utils/parser';
import { transformImage } from '../utils/image';
import { transformVideo } from '../utils/video';
import { createStorageClient } from '../utils/storage';
import { existsSync } from 'fs';

const cdn = new Hono();
const storage = createStorageClient();

cdn.get('/*', async (c) => {
  const path = c.req.path;
  const segments = path.split('/').slice(2); // Remove '/cdn' prefix
  const params = parseParams(path);
  
  // Filter out parameter segments to get the actual file path
  const fileSegments = segments.filter(segment => !segment.includes(':'));
  const filePath = fileSegments.join('/');
  
  const cachePath = getCachePath(path);
  let originalPath = `./public/${filePath}`;
  const ext = filePath.split('.').pop();

  // Fonction pour définir le Content-Type
  const setContentType = (extension: string) => {
    if (extension?.match(/jpe?g|jpeg/)) {
      c.header('Content-Type', 'image/jpeg');
    } else if (extension?.match(/png/)) {
      c.header('Content-Type', 'image/png');
    } else if (extension?.match(/webp/)) {
      c.header('Content-Type', 'image/webp');
    } else if (extension?.match(/avif/)) {
      c.header('Content-Type', 'image/avif');
    } else if (extension?.match(/gif/)) {
      c.header('Content-Type', 'image/gif');
    } else if (extension?.match(/mp4/)) {
      c.header('Content-Type', 'video/mp4');
    } else if (extension?.match(/mov/)) {
      c.header('Content-Type', 'video/quicktime');
    } else if (extension?.match(/webm/)) {
      c.header('Content-Type', 'video/webm');
    }
  };

  // 1. Vérifier d'abord dans le cache cloud (si configuré)
  if (storage) {
    try {
      if (await storage.exists(filePath, params)) {
        console.log(`📦 Serving from cloud cache: ${filePath}`);
        const buffer = await storage.download(filePath, params);
        setContentType(ext || '');
        return c.body(buffer);
      }
    } catch (error) {
      console.warn('Cloud cache error, falling back to local cache:', error);
    }
  }

  // 2. Vérifier dans le cache local
  if (await existsInCache(cachePath)) {
    console.log(`💾 Serving from local cache: ${filePath}`);
    const cachedBuffer = await readFromCache(cachePath);
    setContentType(ext || '');
    return c.body(cachedBuffer);
  }

  // 3. Vérifier si le fichier original existe
  let fileExistsLocally = false;
  let fileExistsInCloud = false;
  
  if (storage) {
    // Si un provider cloud est configuré, on utilise EXCLUSIVEMENT le cloud
    try {
      fileExistsInCloud = await storage.existsOriginal(filePath);
      console.log(`🔍 Checking cloud for original file: ${filePath} - ${fileExistsInCloud ? 'Found' : 'Not found'}`);
    } catch (error) {
      console.warn('Error checking cloud storage for original file:', error);
    }
    
    if (!fileExistsInCloud) {
      console.error(`❌ File not found in cloud storage: ${filePath}`);
      return c.text(`File not found: ${filePath}. Make sure the file exists in your cloud storage bucket.`, 404);
    }
  } else {
    // Si aucun provider cloud n'est configuré, on utilise les fichiers locaux
    fileExistsLocally = existsSync(originalPath);
    
    if (!fileExistsLocally) {
      console.error(`❌ File not found locally: ${filePath}`);
      return c.text(`File not found: ${filePath}. Make sure the file exists in the public folder or configure cloud storage.`, 404);
    }
  }

  // 4. Traitement et stockage
  try {
    let buffer;
    let contentType = '';
    
    // Déterminer la source du fichier
    if (storage) {
      // Provider cloud configuré : utiliser EXCLUSIVEMENT le cloud
      console.log(`☁️ Processing from cloud file: ${filePath}`);
      const sourceBuffer = await storage.downloadOriginal(filePath);
      
      // Sauvegarder temporairement le fichier localement pour le traitement
      const fs = await import('fs');
      const path = await import('path');
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempPath = path.join(tempDir, path.basename(filePath));
      fs.writeFileSync(tempPath, sourceBuffer);
      originalPath = tempPath;
    } else {
      // Aucun provider cloud : utiliser les fichiers locaux
      console.log(`📁 Processing from local file: ${originalPath}`);
    }
    
    if (ext?.match(/jpe?g|png|webp|avif|gif/)) {
      buffer = await transformImage(originalPath, params);
      if (ext?.match(/jpe?g|jpeg/)) {
        contentType = 'image/jpeg';
      } else if (ext?.match(/png/)) {
        contentType = 'image/png';
      } else if (ext?.match(/webp/)) {
        contentType = 'image/webp';
      } else if (ext?.match(/avif/)) {
        contentType = 'image/avif';
      } else if (ext?.match(/gif/)) {
        contentType = 'image/gif';
      }
    } else if (ext?.match(/mp4|mov|webm/)) {
      buffer = await transformVideo(originalPath, params);
      if (ext?.match(/mp4/)) {
        contentType = 'video/mp4';
      } else if (ext?.match(/mov/)) {
        contentType = 'video/quicktime';
      } else if (ext?.match(/webm/)) {
        contentType = 'video/webm';
      }
    } else {
      return c.text('Unsupported file type', 400);
    }

    // Nettoyer le fichier temporaire si utilisé (quand provider cloud configuré)
    if (storage) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(originalPath)) {
          fs.unlinkSync(originalPath);
        }
      } catch (error) {
        console.warn('Failed to cleanup temp file:', error);
      }
    }

    // Sauvegarder dans le cache local (temporaire en mode cloud)
    await saveToCache(cachePath, buffer);

    // Sauvegarder dans le cache cloud (si configuré)
    if (storage) {
      try {
        const cloudUrl = await storage.upload(filePath, params, buffer, contentType);
        console.log(`☁️ Uploaded to cloud cache: ${cloudUrl}`);
        
        // En mode cloud, supprimer immédiatement le cache local après upload
        try {
          const fs = await import('fs');
          if (fs.existsSync(cachePath)) {
            fs.unlinkSync(cachePath);
            console.log(`🧹 Cleaned local cache immediately: ${cachePath}`);
          }
        } catch (error) {
          console.warn('Failed to cleanup local cache:', error);
        }
      } catch (error) {
        console.warn('Failed to upload to cloud cache:', error);
      }
    }

    setContentType(ext || '');
    return c.body(buffer);
  } catch (error) {
    console.error('Processing error:', error);
    return c.text(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
});

export default cdn;
