// Function to parse URL parameters
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const tokenParam = params.get('token');
  if (!tokenParam) {
    return null;
  }
  const [collectionId, tokenId] = tokenParam.split('-');
  return {
    collectionId,
    tokenId,
  };
}

// Function to fetch token data from the API
function fetchTokenData(collectionId, tokenId) {
  const url = `https://rest.unique.network/v2/opal/token?collectionId=${collectionId}&tokenId=${tokenId}&withChildren=true`;
  return fetch(url, {
    headers: {
      'accept': 'application/json',
    },
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to fetch token data');
    }
    return response.json();
  });
}

// Function to load an image and return a Promise
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Important for CORS
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
    img.src = url;
  });
}

// Function to extract images and overlay specs from token data
function extractImages(tokenData) {
  const images = [];

  // Extract self image and overlay specs
  if (tokenData.customizing && tokenData.customizing.self) {
    const self = tokenData.customizing.self;
    images.push({
      url: self.url,
      overlaySpecs: self.image_overlay_specs || {},
      layer: self.image_overlay_specs && self.image_overlay_specs.layer || 0,
      orderInLayer: self.image_overlay_specs && self.image_overlay_specs.order_in_layer || 0,
    });
  } else if (tokenData.image) {
    // Fallback to tokenData.image if customizing.self is not present
    images.push({
      url: tokenData.image,
      overlaySpecs: {},
      layer: 0,
      orderInLayer: 0,
    });
  }

  // Process children tokens
  if (Array.isArray(tokenData.children)) {
    tokenData.children.forEach((child) => {
      images.push(...extractImages(child));
    });
  }

  return images;
}

// Function to draw an image with overlay specs
function drawImageWithOverlay(ctx, image, overlaySpecs) {
  ctx.save();

  // Set global alpha (opacity)
  if (overlaySpecs.opacity !== undefined) {
    ctx.globalAlpha = overlaySpecs.opacity;
  }

  // Calculate position
  let x = 0;
  let y = 0;

  // Apply parent_anchor_point
  if (overlaySpecs.parent_anchor_point) {
    x += overlaySpecs.parent_anchor_point.x || 0;
    y += overlaySpecs.parent_anchor_point.y || 0;
  }

  // Apply offset
  if (overlaySpecs.offset) {
    x += overlaySpecs.offset.x || 0;
    y += overlaySpecs.offset.y || 0;
  }

  // Apply anchor_point (we need to adjust for the anchor point)
  const anchorX = overlaySpecs.anchor_point ? overlaySpecs.anchor_point.x || 0 : 0;
  const anchorY = overlaySpecs.anchor_point ? overlaySpecs.anchor_point.y || 0 : 0;

  // Translate to the position where we want to draw
  ctx.translate(x, y);

  // Apply rotation
  if (overlaySpecs.rotation) {
    ctx.rotate((overlaySpecs.rotation * Math.PI) / 180); // Convert degrees to radians
  }

  // Apply scaling
  if (overlaySpecs.scale) {
    let scaleX = 1;
    let scaleY = 1;
    const unit = overlaySpecs.scale.unit || '%';
    if (unit === '%') {
      scaleX = (overlaySpecs.scale.x !== undefined ? overlaySpecs.scale.x : 100) / 100;
      scaleY = (overlaySpecs.scale.y !== undefined ? overlaySpecs.scale.y : 100) / 100;
    } else if (unit === 'px') {
      scaleX = (overlaySpecs.scale.x !== undefined ? overlaySpecs.scale.x : image.width) / image.width;
      scaleY = (overlaySpecs.scale.y !== undefined ? overlaySpecs.scale.y : image.height) / image.height;
    }
    ctx.scale(scaleX, scaleY);
  }

  // Translate to adjust for anchor point
  ctx.translate(-anchorX, -anchorY);

  // Draw the image
  ctx.drawImage(image, 0, 0);

  ctx.restore();
}

// Main function to compose images
async function composeImages() {
  const params = getQueryParams();
  if (!params || !params.collectionId || !params.tokenId) {
    alert('Please provide token parameter in format token={collectionId}-{tokenId}.');
    return;
  }

  const { collectionId, tokenId } = params;

  try {
    // Fetch token data
    const tokenData = await fetchTokenData(collectionId, tokenId);

    // Extract images and overlay specs
    const imagesData = extractImages(tokenData);

    // Load all images
    const images = await Promise.all(imagesData.map((imgData) =>
      loadImage(imgData.url).then((img) => {
        img.imgData = imgData; // Attach imgData to the image object
        return img;
      })
    ));

    // Sort images by layer and order_in_layer
    images.sort((a, b) => {
      const layerDiff = (a.imgData.layer || 0) - (b.imgData.layer || 0);
      if (layerDiff !== 0) return layerDiff;
      return (a.imgData.orderInLayer || 0) - (b.imgData.orderInLayer || 0);
    });

    // Create canvas context
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Determine canvas size based on the first image
    const baseImage = images[0];
    const canvasWidth = baseImage.width;
    const canvasHeight = baseImage.height;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Optional: Set background color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw images in sorted order
    images.forEach((image) => {
      drawImageWithOverlay(ctx, image, image.imgData.overlaySpecs);
    });

    // Provide a way to download the composed image
    createDownloadLink(canvas);

  } catch (error) {
    console.error(error);
    alert('An error occurred while processing the token data.');
  }
}

// Function to create a download link for the composed image
function createDownloadLink(canvas) {
  // Remove existing download link if any
  const existingLink = document.getElementById('download-link');
  if (existingLink) {
    existingLink.remove();
  }

  const link = document.createElement('a');
  link.id = 'download-link';
  link.download = 'composed-image.png';
  link.href = canvas.toDataURL();
  link.textContent = 'Download Composed Image';
  link.style.display = 'block';
  link.style.textAlign = 'center';
  link.style.marginTop = '20px';
  link.style.fontSize = '20px';
  link.style.textDecoration = 'none';
  link.style.color = '#fff';
  link.style.backgroundColor = '#007BFF';
  link.style.padding = '10px 20px';
  link.style.borderRadius = '5px';
  link.style.width = 'fit-content';
  link.style.cursor = 'pointer';

  // Optional: Add hover effect
  link.onmouseover = () => {
    link.style.backgroundColor = '#0056b3';
  };
  link.onmouseout = () => {
    link.style.backgroundColor = '#007BFF';
  };

  document.body.appendChild(link);
}

// Execute the composeImages function when the page loads
window.onload = composeImages;
