/* 图片压缩 — Canvas resize + WebP 输出 */

function compressImage(file, maxDim, quality) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(maxDim / w, maxDim / h, 1);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        resolve({ blob: blob, width: canvas.width, height: canvas.height });
      }, 'image/webp', quality);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

async function compressMatchPhoto(file) {
  var full = await compressImage(file, 1920, 0.85);
  var thumb = await compressImage(file, 400, 0.75);
  return {
    full:  { blob: full.blob,  w: full.width,  h: full.height },
    thumb: { blob: thumb.blob, w: thumb.width, h: thumb.height }
  };
}
