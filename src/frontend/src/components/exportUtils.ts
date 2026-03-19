/**
 * Export diagram as SVG or PNG from the rendered Mermaid output.
 */

function getDiagramSvg(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector('svg');
}

function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Ensure xmlns is set for standalone SVG
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  return new XMLSerializer().serializeToString(clone);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSvg(container: HTMLElement, filename = 'diagram.svg'): boolean {
  const svg = getDiagramSvg(container);
  if (!svg) return false;

  const svgString = serializeSvg(svg);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, filename);
  return true;
}

export function exportPng(container: HTMLElement, filename = 'diagram.png', scale = 2): Promise<boolean> {
  return new Promise((resolve) => {
    const svg = getDiagramSvg(container);
    if (!svg) {
      resolve(false);
      return;
    }

    const svgString = serializeSvg(svg);
    const bbox = svg.getBoundingClientRect();
    const width = bbox.width * scale;
    const height = bbox.height * scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, filename);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 'image/png');
    };
    img.onerror = () => resolve(false);
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  });
}
