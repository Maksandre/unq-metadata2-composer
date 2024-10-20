// Function to parse URL parameters
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    img1: params.get('img1'),
    img2: params.get('img2'),
  };
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
  const { img1, img2 } = getQueryParams();

  if (!img1 || !img2) {
    alert('Please provide both img1 and img2 URL parameters.');
    return;
  }

  try {
    // Load both images concurrently
    const [image1, image2] = await Promise.all([
      loadImage(img1),
      loadImage(img2),
    ]);

    // Create canvas context
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Determine canvas size based on images
    const canvasWidth = Math.max(image1.width, image2.width);
    const canvasHeight = Math.max(image1.height, image2.height);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Optional: Set background color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw the first image
    // You can adjust the x and y positions as needed
    const img1X = 0; // X-coordinate for image1
    const img1Y = 0; // Y-coordinate for image1
    ctx.drawImage(image1, img1X, img1Y);

    // Draw the second image on top of the first image
    const img2X = 0; // X-coordinate for image2 (adjust for desired overlap)
    const img2Y = 0; // Y-coordinate for image2 (adjust for desired overlap)
    ctx.globalAlpha = 0.7; // Set transparency for overlapping effect (0.0 to 1.0)
    ctx.drawImage(image2, img2X, img2Y);
    ctx.globalAlpha = 1.0; // Reset alpha

    // Provide a way to download the composed image
    createDownloadLink(canvas);

  } catch (error) {
    console.error(error);
    alert('An error occurred while loading images.');
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
