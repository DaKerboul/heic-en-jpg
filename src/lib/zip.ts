import JSZip from 'jszip';

export async function downloadAsZipBlob(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  return await zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

export async function downloadAsZip(files: { name: string; blob: Blob }[], zipName = 'images-converties.zip') {
  const content = await downloadAsZipBlob(files);
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
