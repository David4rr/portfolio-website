export default {
  getURL(options, imageConfig) {
    if (typeof options.src === 'object' && options.src.src) {
      return options.src.src;
    }
    return options.src;
  },
  parseURL(url, imageConfig) {
    return { src: url, width: 0, height: 0, format: 'webp' };
  },
  getHTMLAttributes(options, imageConfig) {
    let targetWidth = options.width;
    let targetHeight = options.height;
    if (typeof options.src === 'object') {
      targetWidth = targetWidth || options.src.width;
      targetHeight = targetHeight || options.src.height;
    }
    return {
      src: typeof options.src === 'object' ? options.src.src : options.src,
      width: targetWidth,
      height: targetHeight,
      ...options.attributes,
    };
  }
};
