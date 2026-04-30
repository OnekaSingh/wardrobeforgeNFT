/* ============= Image Pixelizer Component ============= */
/* Convert uploaded images into editable pixel grids with live preview. */

const PixelizerUtils = {
  quantize(imageData, numColors) {
    const pixels = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 128) {
        pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
      }
    }

    if (pixels.length === 0) return [];

    let palette = [];
    const step = Math.max(1, Math.floor(pixels.length / numColors));
    for (let i = 0; i < numColors && i * step < pixels.length; i++) {
      palette.push(pixels[i * step]);
    }

    for (let iter = 0; iter < 4; iter++) {
      const clusters = palette.map(() => ({ sum: [0, 0, 0], count: 0 }));
      for (const pixel of pixels) {
        let best = 0;
        let bestDistance = Infinity;
        for (let j = 0; j < palette.length; j++) {
          const distance = this.colorDist(pixel, palette[j]);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = j;
          }
        }

        clusters[best].sum[0] += pixel[0];
        clusters[best].sum[1] += pixel[1];
        clusters[best].sum[2] += pixel[2];
        clusters[best].count++;
      }

      palette = clusters.map((cluster, index) =>
        cluster.count > 0
          ? [
              cluster.sum[0] / cluster.count,
              cluster.sum[1] / cluster.count,
              cluster.sum[2] / cluster.count,
            ]
          : palette[index]
      );
    }

    return palette.map((color) => color.map(Math.round));
  },

  colorDist(a, b) {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  },

  closestColor(r, g, b, palette) {
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const distance = this.colorDist([r, g, b], palette[i]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return palette[best];
  },

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((value) => {
      const hex = Math.round(value).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ] : [0, 0, 0];
  },

  luminance(hex) {
    const [r, g, b] = this.hexToRgb(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  saturation(hex) {
    const [r, g, b] = this.hexToRgb(hex);
    return Math.max(r, g, b) - Math.min(r, g, b);
  },

  drawPixelDataToCanvas(canvas, pixelData, pixelScale = 1) {
    if (!canvas || !pixelData) return;
    const { grid, width, height } = pixelData;
    canvas.width = width * pixelScale;
    canvas.height = height * pixelScale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = grid[y][x];
        if (!pixel || pixel.transparent) continue;
        ctx.fillStyle = pixel.hex;
        ctx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
      }
    }
  },

  backgroundMaskFromEdges(pixelData, tolerance = 22) {
    const { grid, width, height } = pixelData;
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const mask = Array.from({ length: height }, () => Array(width).fill(false));
    const queue = [];

    const edgePixels = [];
    for (let x = 0; x < width; x++) {
      if (grid[0] && grid[0][x] && !grid[0][x].transparent) edgePixels.push(grid[0][x]);
      if (grid[height - 1] && grid[height - 1][x] && !grid[height - 1][x].transparent) edgePixels.push(grid[height - 1][x]);
    }
    for (let y = 1; y < height - 1; y++) {
      if (grid[y] && grid[y][0] && !grid[y][0].transparent) edgePixels.push(grid[y][0]);
      if (grid[y] && grid[y][width - 1] && !grid[y][width - 1].transparent) edgePixels.push(grid[y][width - 1]);
    }

    const edgeColorCounts = new Map();
    edgePixels.forEach((pixel) => {
      edgeColorCounts.set(pixel.hex, (edgeColorCounts.get(pixel.hex) || 0) + 1);
    });

    const dominantEdgeColors = [...edgeColorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hex]) => {
        const [r, g, b] = this.hexToRgb(hex);
        return { hex, rgb: [r, g, b] };
      });

    const seedPoints = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
    ];

    const matchesBackground = (pixel) => {
      if (!pixel || pixel.transparent) return true;
      return dominantEdgeColors.some((edgeColor) => (
        pixel.hex === edgeColor.hex ||
        this.colorDist([pixel.r, pixel.g, pixel.b], edgeColor.rgb) <= tolerance * tolerance * 3
      ));
    };

    seedPoints.forEach(([x, y]) => {
      if (x >= 0 && x < width && y >= 0 && y < height) queue.push([x, y]);
    });

    while (queue.length) {
      const [x, y] = queue.shift();
      if (x < 0 || y < 0 || x >= width || y >= height || visited[y][x]) continue;
      visited[y][x] = true;

      const pixel = grid[y][x];
      if (!matchesBackground(pixel)) continue;

      mask[y][x] = true;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return mask;
  },

  trimPixelData(pixelData, options = {}) {
    if (!pixelData) return pixelData;
    const { tolerance = 22, padding = 1 } = options;
    const mask = this.backgroundMaskFromEdges(pixelData, tolerance);
    const { grid, width, height } = pixelData;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = grid[y][x];
        if (!pixel || pixel.transparent || mask[y][x]) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX === -1 || maxY === -1) return pixelData;

    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const nextGrid = [];
    const nextPalette = new Set();

    for (let y = minY; y <= maxY; y++) {
      const row = [];
      for (let x = minX; x <= maxX; x++) {
        const pixel = grid[y][x];
        if (!pixel || pixel.transparent || mask[y][x]) {
          row.push({ transparent: true });
        } else {
          row.push(pixel);
          nextPalette.add(pixel.hex);
        }
      }
      nextGrid.push(row);
    }

    return {
      ...pixelData,
      grid: nextGrid,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      palette: [...nextPalette],
    };
  },

  suggestEditableRegions(pixelData) {
    if (!pixelData) return { skin: [], eyes: [] };

    const skinCounts = new Map();
    const eyeCounts = new Map();
    const { grid, width, height } = pixelData;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = grid[y][x];
        if (!pixel || pixel.transparent) continue;

        const color = pixel.hex;
        const lum = this.luminance(color);
        const sat = this.saturation(color);
        const inFaceBand = x >= width * 0.18 && x <= width * 0.82 && y >= height * 0.08 && y <= height * 0.62;
        const inEyeBand = x >= width * 0.12 && x <= width * 0.88 && y >= height * 0.16 && y <= height * 0.48;

        if (inFaceBand && lum > 95 && lum < 245 && sat > 10 && sat < 95) {
          skinCounts.set(color, (skinCounts.get(color) || 0) + 1);
        }

        if (inEyeBand && lum > 25 && lum < 220 && sat > 35) {
          eyeCounts.set(color, (eyeCounts.get(color) || 0) + 1);
        }
      }
    }

    const skin = [...skinCounts.entries()]
      .sort((a, b) => b[1] - a[1] || this.luminance(b[0]) - this.luminance(a[0]))
      .slice(0, 2)
      .map(([color]) => color);

    const eye = [...eyeCounts.entries()]
      .filter(([color]) => !skin.includes(color))
      .sort((a, b) => b[1] - a[1] || this.saturation(b[0]) - this.saturation(a[0]))
      .slice(0, 2)
      .map(([color]) => color);

    return { skin, eyes: eye };
  },

  async pixelateImage(imgElement, blockSize, numColors) {
    const canvas = document.createElement('canvas');
    const maxW = 600;
    let w = imgElement.width;
    let h = imgElement.height;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0, w, h);

    const pixW = Math.ceil(w / blockSize);
    const pixH = Math.ceil(h / blockSize);
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = pixW;
    tmpCanvas.height = pixH;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.drawImage(canvas, 0, 0, pixW, pixH);

    const imgData = tmpCtx.getImageData(0, 0, pixW, pixH);
    const palette = this.quantize(imgData, numColors);
    const out = tmpCtx.createImageData(pixW, pixH);
    const grid = [];

    for (let y = 0; y < pixH; y++) {
      const row = [];
      for (let x = 0; x < pixW; x++) {
        const index = (y * pixW + x) * 4;
        const alpha = imgData.data[index + 3];

        if (alpha < 128) {
          out.data[index + 3] = 0;
          row.push({ transparent: true });
          continue;
        }

        const [r, g, b] = this.closestColor(
          imgData.data[index],
          imgData.data[index + 1],
          imgData.data[index + 2],
          palette
        );

        out.data[index] = r;
        out.data[index + 1] = g;
        out.data[index + 2] = b;
        out.data[index + 3] = alpha;
        row.push({ r, g, b, hex: this.rgbToHex(r, g, b) });
      }
      grid.push(row);
    }

    tmpCtx.putImageData(out, 0, 0);

    const result = {
      grid,
      palette: palette.map((color) => this.rgbToHex(color[0], color[1], color[2])),
      width: pixW,
      height: pixH,
      previewDataUrl: tmpCanvas.toDataURL('image/png'),
    };

    result.suggestedRegions = this.suggestEditableRegions(result);
    return result;
  },
};

const PixelizedAvatar = ({ pixelData, colorMap = {}, scale = 4, style = {} }) => {
  if (!pixelData) return null;

  const { grid, width, height } = pixelData;
  const shadows = [];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const pixel = grid[y][x];
      if (!pixel || pixel.transparent) continue;
      const color = colorMap[pixel.hex] || pixel.hex;
      shadows.push(`${x * scale}px ${y * scale}px 0 ${color}`);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: width * scale,
        height: height * scale,
        ...style,
      }}
    >
      <div
        style={{
          width: scale,
          height: scale,
          boxShadow: shadows.length ? shadows.join(',') : 'none',
          background: 'transparent',
        }}
      />
    </div>
  );
};

const AVATAR_STORAGE_KEY = 'wardrobeforge.avatar.v1';

const getAvatarScopedStorageKey = () => (
  window.WardrobeForgeAuth?.getScopedStorageKey?.(AVATAR_STORAGE_KEY) || AVATAR_STORAGE_KEY
);

const mixHexColors = (fromHex, toHex, amount) => {
  const [r1, g1, b1] = PixelizerUtils.hexToRgb(fromHex);
  const [r2, g2, b2] = PixelizerUtils.hexToRgb(toHex);
  const mix = (from, to) => Math.round(from + (to - from) * amount);
  return PixelizerUtils.rgbToHex(mix(r1, r2), mix(g1, g2), mix(b1, b2));
};

const buildUploadedAvatarColorMap = (editableRegions, skinTones, eyeColors, skinKey, eyeKey) => {
  const colorMap = {};
  const skinTone = skinTones[skinKey] || skinTones.light;
  const eyeColor = eyeColors[eyeKey] || eyeColors.brown;

  const skinColors = [...(editableRegions.skin || [])].sort((a, b) => (
    PixelizerUtils.luminance(a) - PixelizerUtils.luminance(b)
  ));

  if (skinColors.length === 1) {
    colorMap[skinColors[0]] = skinTone.mid;
  } else if (skinColors.length > 1) {
    skinColors.forEach((color, index) => {
      const ratio = skinColors.length === 1 ? 1 : index / (skinColors.length - 1);
      colorMap[color] = mixHexColors(skinTone.shadow, skinTone.mid, ratio);
    });
  }

  (editableRegions.eyes || []).forEach((color) => {
    colorMap[color] = eyeColor;
  });

  return colorMap;
};

const saveAvatarState = (avatarState) => {
  try {
    window.localStorage.setItem(getAvatarScopedStorageKey(), JSON.stringify(avatarState));
  } catch (error) {
    // ignore storage failures in the static prototype
  }
};

const loadAvatarState = () => {
  try {
    const raw = window.localStorage.getItem(getAvatarScopedStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const ImagePixelizerTool = ({ onPixelDataReady }) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [pixelSize, setPixelSize] = React.useState(4);
  const [colorCount, setColorCount] = React.useState(32);
  const [sourceUrl, setSourceUrl] = React.useState('');
  const [pixelData, setPixelData] = React.useState(null);
  const [error, setError] = React.useState('');
  const fileInputRef = React.useRef(null);
  const originalCanvasRef = React.useRef(null);
  const pixelCanvasRef = React.useRef(null);

  const renderFromSource = React.useCallback((nextSourceUrl) => {
    if (!nextSourceUrl) return;

    setIsProcessing(true);
    setError('');

    const img = new Image();
    img.onload = async () => {
      const maxW = 600;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }

      const originalCanvas = originalCanvasRef.current;
      if (originalCanvas) {
        originalCanvas.width = w;
        originalCanvas.height = h;
        const ctx = originalCanvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
      }

      const nextPixelData = await PixelizerUtils.pixelateImage(img, pixelSize, colorCount);
      setPixelData(nextPixelData);
      PixelizerUtils.drawPixelDataToCanvas(pixelCanvasRef.current, nextPixelData, pixelSize);
      setIsProcessing(false);
    };
    img.onerror = () => {
      setError('Could not read that image.');
      setIsProcessing(false);
    };
    img.src = nextSourceUrl;
  }, [pixelSize, colorCount]);

  React.useEffect(() => {
    if (sourceUrl) renderFromSource(sourceUrl);
  }, [sourceUrl, renderFromSource]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!pixelCanvasRef.current) return;
    const link = document.createElement('a');
    link.href = pixelCanvasRef.current.toDataURL('image/png');
    link.download = 'pixelized-avatar.png';
    link.click();
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed ' + (isDragging ? 'var(--coral)' : '#aaa'),
          borderRadius: 12,
          padding: '2.5rem 1rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#fff0ec' : '#f9f9f9',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => handleFile(event.target.files[0])}
        />
        <p className="pixel" style={{ fontSize: 12, marginBottom: 8 }}>
          {isDragging ? 'DROP IMAGE HERE' : 'DROP IMAGE OR CLICK TO BROWSE'}
        </p>
        <p className="mono" style={{ fontSize: 14, opacity: 0.65 }}>
          PNG, JPG, GIF, WebP
        </p>
      </div>

      {!!sourceUrl && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '1rem 0' }}>
            <div className="pxl-box" style={{ padding: 12 }}>
              <div className="pixel" style={{ fontSize: 9, marginBottom: 8 }}>
                PIXEL SIZE: <span style={{ color: 'var(--coral)' }}>{pixelSize}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="32"
                step="1"
                value={pixelSize}
                onChange={(event) => setPixelSize(parseInt(event.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="pxl-box" style={{ padding: 12 }}>
              <div className="pixel" style={{ fontSize: 9, marginBottom: 8 }}>
                COLORS: <span style={{ color: 'var(--coral)' }}>{colorCount}</span>
              </div>
              <input
                type="range"
                min="2"
                max="256"
                step="1"
                value={colorCount}
                onChange={(event) => setColorCount(parseInt(event.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: '1rem' }}>
            <div className="pxl-box no-drop" style={{ padding: 8, background: '#f5f5f5' }}>
              <div className="mono" style={{ fontSize: 12, color: '#777', marginBottom: 6, textAlign: 'center' }}>
                Original
              </div>
              <canvas ref={originalCanvasRef} style={{ maxWidth: '100%', borderRadius: 4, imageRendering: 'pixelated' }} />
            </div>

            <div className="pxl-box no-drop" style={{ padding: 8, background: '#f5f5f5' }}>
              <div className="mono" style={{ fontSize: 12, color: '#777', marginBottom: 6, textAlign: 'center' }}>
                Pixelized
              </div>
              <canvas ref={pixelCanvasRef} style={{ maxWidth: '100%', borderRadius: 4, imageRendering: 'pixelated' }} />
            </div>
          </div>
        </>
      )}

      {pixelData && !isProcessing && (
        <div className="pxl-box no-drop" style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,.9)' }}>
          <div className="pixel" style={{ fontSize: 8, marginBottom: 8 }}>SUGGESTED EDITABLE COLORS</div>
          <div className="mono" style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
            Skin: {pixelData.suggestedRegions.skin.length ? pixelData.suggestedRegions.skin.join(', ') : 'none detected'}
          </div>
          <div className="mono" style={{ fontSize: 13, opacity: 0.7 }}>
            Eyes: {pixelData.suggestedRegions.eyes.length ? pixelData.suggestedRegions.eyes.join(', ') : 'none detected'}
          </div>
        </div>
      )}

      {error && (
        <div className="mono" style={{ marginTop: 12, color: 'var(--coral-deep)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className="pxl-btn ghost"
          style={{ flex: 1 }}
          onClick={handleDownload}
          disabled={!pixelData || isProcessing}
        >
          DOWNLOAD PNG
        </button>
        <button
          className="pxl-btn"
          style={{ flex: 1 }}
          onClick={() => pixelData && onPixelDataReady(pixelData)}
          disabled={!pixelData || isProcessing}
        >
          USE THIS AVATAR
        </button>
      </div>
    </div>
  );
};

window.PixelizerUtils = PixelizerUtils;
window.PixelizedAvatar = PixelizedAvatar;
window.ImagePixelizerTool = ImagePixelizerTool;
window.buildUploadedAvatarColorMap = buildUploadedAvatarColorMap;
window.saveAvatarState = saveAvatarState;
window.loadAvatarState = loadAvatarState;
