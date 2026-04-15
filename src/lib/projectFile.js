import JSZip from 'jszip';
import { persistSet } from './persistentStorage';

const BUILTIN_PAGES = [
  { key: 'RedTeamHome', name: 'Home', storageKey: 'rtHome' },
];

const PAGE_SUFFIXES = [
  'pagetype',
  'meta',
  'columns',
  'cards',
  'order',
  'hidden',
  'resource',
  'text',
  'homemeta',
  'homecolumns',
];

export async function exportProject(customPages, hiddenPages, navOrder) {
  const visibleCustomPages = customPages.filter((page) => !hiddenPages.includes(page.key));
  const visibleBuiltinPages = BUILTIN_PAGES.filter((page) => !hiddenPages.includes(page.key));
  const visibleNavKeys = new Set([...visibleBuiltinPages, ...visibleCustomPages].map((page) => page.key));
  const visibleNavOrder = navOrder.filter((key) => visibleNavKeys.has(key));

  const zip = new JSZip();
  const pagesFolder = zip.folder('pages');

  for (const page of [...visibleBuiltinPages, ...visibleCustomPages]) {
    const storageKey = page.storageKey || page.key;
    const pageFile = {
      key: page.key,
      name: page.name,
      storageKey,
      builtin: BUILTIN_PAGES.some((builtinPage) => builtinPage.key === page.key),
    };

    for (const suffix of PAGE_SUFFIXES) {
      const pageStorageKey = `redops_${suffix}_${storageKey}`;
      try {
        const raw = localStorage.getItem(pageStorageKey);
        if (raw !== null) {
          pageFile[suffix] = JSON.parse(raw);
        }
      } catch {}
    }

    pagesFolder.file(`${page.key}.json`, JSON.stringify(pageFile, null, 2));
  }

  zip.file('manifest.json', JSON.stringify({
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: 'CYBER | NOTES',
    pages: visibleCustomPages,
    builtins: visibleBuiltinPages.map(({ key, name, storageKey }) => ({ key, name, storageKey })),
    navOrder: visibleNavOrder,
  }, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cybernotes-${new Date().toISOString().slice(0, 10)}.cybernotes`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function importProjectFile(file) {
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('Could not read file. The selected archive is invalid.');
  }

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Missing manifest.json. The selected archive is invalid.');
  }

  let manifest;
  try {
    manifest = JSON.parse(await manifestFile.async('string'));
  } catch {
    throw new Error('Could not parse manifest.json.');
  }

  if (!manifest.pages || !manifest.navOrder) {
    throw new Error('Invalid manifest. Missing pages or navOrder.');
  }

  const pagesFolder = zip.folder('pages');
  const manifestPages = [...(manifest.builtins || []), ...manifest.pages];

  for (const page of manifestPages) {
    const pageFile = pagesFolder.file(`${page.key}.json`);
    if (!pageFile) continue;

    let pageData;
    try {
      pageData = JSON.parse(await pageFile.async('string'));
    } catch {
      continue;
    }

    const storageKey = pageData.storageKey || page.key;
    for (const suffix of PAGE_SUFFIXES) {
      if (pageData[suffix] !== undefined) {
        await persistSet(`redops_${suffix}_${storageKey}`, pageData[suffix]);
      }
    }
  }

  await persistSet('redops_custom_pages', manifest.pages);
  await persistSet('redops_nav_order', manifest.navOrder);
  await persistSet('redops_hidden_pages', []);

  return manifest;
}
