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

    // Extract image URLs
    const imageUrls = [tokenData.image];

    // If there are children, include their images
    if (Array.isArray(tokenData.children)) {
      tokenData.children.forEach((child) => {
        if (child.image) {
          imageUrls.push(child.image);
        }
      });
    }

    // Load all images
    const images = await Promise.all(imageUrls.map((url) => loadImage(url)));

    // Create canvas context
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Determine canvas size based on the first image
    const canvasWidth = images[0].width;
    const canvasHeight = images[0].height;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Optional: Set background color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw images in order
    images.forEach((image) => {
      ctx.drawImage(image, 0, 0);
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
