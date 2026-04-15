import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  Shield,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  ImagePlus,
} from 'lucide-react';
import ImportExportControls from '@/components/ImportExportControls';
import { generateLocalPageTemplate } from '@/lib/localPageGenerator';
import { persistDelete, persistGet, persistSet } from '@/lib/persistentStorage';

const builtinNavItems = [
  { name: 'Home', page: 'RedTeamHome', color: 'text-slate-300' },
];

const colorCycle = ['cyan', 'green', 'red', 'purple', 'orange', 'pink', 'blue', 'yellow'];

const pageTypes = [
  { value: 'notes', label: 'Notes', desc: 'Column-based map and technique cards' },
  { value: 'resource', label: 'Resources', desc: 'Categorized links and reference collections' },
  { value: 'text', label: 'Text', desc: 'Long-form notes, plans, and reports' },
  { value: 'home', label: 'Home', desc: 'Dashboard layout with author card and map' },
];

function dedupePages(pages) {
  const seen = new Set();
  return pages.filter((page) => {
    if (seen.has(page.key)) return false;
    seen.add(page.key);
    return true;
  });
}

function localLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function hasHomeWorkspaceContent(meta, columns) {
  const hasMeta = Boolean(
    meta?.titleLeft ||
    meta?.titleRight ||
    meta?.description ||
    meta?.authorInitials ||
    meta?.authorName ||
    meta?.authorSub ||
    meta?.authorTag
  );

  return hasMeta || (Array.isArray(columns) && columns.length > 0);
}

function NavContextMenu({ x, y, label, onDelete, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[200] min-w-[160px] rounded-lg border border-slate-700 bg-[#0d1117] py-1 shadow-xl"
      style={{ top: y, left: x }}
    >
      <div className="mb-1 border-b border-slate-800 px-3 py-1.5 text-[11px] font-mono text-slate-500">{label}</div>
      <button
        onClick={onDelete}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-mono text-red-400 transition-colors hover:bg-red-500/10"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete Page
      </button>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [customPages, setCustomPagesState] = useState(() => dedupePages(localLoad('redops_custom_pages', [])));
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageType, setNewPageType] = useState('notes');
  const [contextMenu, setContextMenu] = useState(null);
  const [hiddenPages, setHiddenPagesState] = useState(() => localLoad('redops_hidden_pages', []));
  const [generatorPrompt, setGeneratorPrompt] = useState('');
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState(null);
  const [generatorImageName, setGeneratorImageName] = useState('');
  const [homeNavVisible, setHomeNavVisible] = useState(() =>
    hasHomeWorkspaceContent(
      localLoad('redops_homemeta_rtHome', null),
      localLoad('redops_columns_rtHome', localLoad('redops_homecolumns_rtHome', []))
    )
  );
  const imageInputRef = useRef(null);
  const navDragIndex = useRef(null);

  const [navOrder, setNavOrderRaw] = useState(() => {
    const saved = localLoad('redops_nav_order', null);
    return [...new Set(saved || builtinNavItems.map((item) => item.page))];
  });

  useEffect(() => {
    persistGet('redops_custom_pages').then((value) => {
      if (value) setCustomPagesState(dedupePages(value));
    });
    persistGet('redops_hidden_pages').then((value) => {
      if (value) setHiddenPagesState(value);
    });
    persistGet('redops_nav_order').then((value) => {
      if (value) setNavOrderRaw([...new Set(value)]);
    });
    persistGet('redops_homemeta_rtHome').then((metaValue) => {
      persistGet('redops_columns_rtHome').then((columnsValue) => {
        const nextColumns = columnsValue ?? localLoad('redops_homecolumns_rtHome', []);
        setHomeNavVisible(hasHomeWorkspaceContent(metaValue, nextColumns));
      });
    });
  }, []);

  const setCustomPages = (value) => {
    const next = typeof value === 'function' ? value(customPages) : value;
    const deduped = dedupePages(next);
    setCustomPagesState(deduped);
    persistSet('redops_custom_pages', deduped);
  };

  const setHiddenPages = (value) => {
    const next = typeof value === 'function' ? value(hiddenPages) : value;
    setHiddenPagesState(next);
    persistSet('redops_hidden_pages', next);
  };

  const setNavOrder = (value) => {
    const raw = typeof value === 'function' ? value(navOrder) : value;
    const next = [...new Set(raw)];
    setNavOrderRaw(next);
    persistSet('redops_nav_order', next);
  };

  useEffect(() => {
    setNavOrder((previous) => {
      const next = [...previous];
      let changed = false;

      customPages.forEach((page) => {
        if (!next.includes(page.key)) {
          next.push(page.key);
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPages.length]);

  const handleImport = () => {
    window.location.href = '/';
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGeneratorImageName(file.name);
    setGeneratorError('');
  };

  const handleGenerateTemplate = async () => {
    if (!generatorPrompt.trim() && !generatorImageName) return;

    setGeneratorLoading(true);
    setGeneratorError('');

    try {
      const result = generateLocalPageTemplate({
        prompt: generatorPrompt.trim(),
        imageName: generatorImageName,
      });

      setGeneratedTemplate(result);
      setNewPageName(result.pageName || '');
      setNewPageType(result.pageType || 'notes');
    } catch {
      setGeneratorError('Template generation failed.');
    } finally {
      setGeneratorLoading(false);
    }
  };

  const resetPageModal = () => {
    setAddPageOpen(false);
    setNewPageName('');
    setNewPageType('notes');
    setGeneratorPrompt('');
    setGeneratorError('');
    setGeneratedTemplate(null);
    setGeneratorImageName('');
  };

  const handleAddPage = () => {
    const name = newPageName.trim();
    if (!name) return;

    let slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existingKeys = customPages.map((page) => page.key);
    const builtinRoutes = builtinNavItems.map((item) => item.page.toLowerCase());
    const baseSlug = slug || 'page';
    let counter = 1;

    while (existingKeys.includes(slug) || builtinRoutes.includes(slug) || !slug) {
      slug = `${baseSlug}-${counter++}`;
    }

    persistSet(`redops_pagetype_${slug}`, newPageType);

    if (generatedTemplate) {
      if ((newPageType === 'notes' || newPageType === 'home') && generatedTemplate.columns?.length) {
        const seededColumns = generatedTemplate.columns.map((column, columnIndex) => ({
          header: column.header,
          color: column.color || 'cyan',
          nodes: (column.nodes || []).map((node, nodeIndex) => ({
            title: node.title,
            subtitle: node.subtitle || '',
            tags: [],
            id: `seed-node-${Date.now()}-${columnIndex}-${nodeIndex}`,
          })),
        }));
        persistSet(`redops_columns_${slug}`, seededColumns);
        persistSet(`redops_homecolumns_${slug}`, seededColumns);
      }

      if (newPageType === 'resource' && generatedTemplate.categories?.length) {
        const seededCategories = generatedTemplate.categories.map((category, categoryIndex) => ({
          name: category.name,
          color: category.color || colorCycle[categoryIndex % colorCycle.length],
          links: (category.items || []).map((item) => ({
            name: item.title,
            desc: '',
            url: item.url || '#',
          })),
        }));
        persistSet(`redops_resource_${slug}`, seededCategories);
      }

      if (newPageType === 'text' && generatedTemplate.sections?.length) {
        const seededSections = generatedTemplate.sections.map((section, index) => ({
          id: `seed-section-${Date.now()}-${index}`,
          title: section.title || '',
          body: section.body || '',
        }));
        persistSet(`redops_text_${slug}`, seededSections);
      }
    }

    persistSet(`redops_meta_${slug}`, {
      titleLeft: name,
      titleRight: '',
      titleLeftColor: 'cyan',
      title: name,
      titleColor: 'cyan',
      description: '',
      tags: [],
    });

    if (newPageType === 'home') {
      persistSet(`redops_homemeta_${slug}`, {
        titleLeft: name,
        titleRight: '',
        titleLeftColor: 'red',
        description: '',
        authorInitials: '',
        authorName: '',
        authorSub: '',
        authorTag: '',
      });
    }

    const page = { name, key: slug };
    const updatedPages = [...customPages, page];
    setCustomPages(updatedPages);
    setNavOrder((previous) => [...previous, slug]);
    resetPageModal();
    window.location.href = `/note/${slug}`;
  };

  const handleDeletePage = (key) => {
    setCustomPages((previous) => previous.filter((page) => page.key !== key));
    setNavOrder((previous) => previous.filter((pageKey) => pageKey !== key));
    setContextMenu(null);

    [
      `redops_pagetype_${key}`,
      `redops_meta_${key}`,
      `redops_columns_${key}`,
      `redops_cards_${key}`,
      `redops_order_${key}`,
      `redops_hidden_${key}`,
      `redops_resource_${key}`,
      `redops_text_${key}`,
      `redops_homemeta_${key}`,
      `redops_homecolumns_${key}`,
    ].forEach((storageKey) => persistDelete(storageKey));

    if (currentPageName === `note/${key}`) {
      window.location.href = '/';
    }
  };

  const handleHideBuiltinPage = (page) => {
    const updated = [...hiddenPages, page];
    setHiddenPages(updated);
    setContextMenu(null);
    if (currentPageName === page) {
      window.location.href = '/';
    }
  };

  const openContextMenu = (event, label, pageKey = null, builtinPage = null) => {
    event.preventDefault();
    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - 100);
    setContextMenu({ x, y, label, pageKey, builtinPage });
  };

  const renderNavLink = (key, isMobile = false) => {
    const builtin = builtinNavItems.find((item) => item.page === key);
    const custom = customPages.find((page) => page.key === key);

    if (builtin && !hiddenPages.includes(key)) {
      if (builtin.page === 'RedTeamHome' && !homeNavVisible) {
        return null;
      }

      const classes = currentPageName === key
        ? `${builtin.color} bg-white/5`
        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5';

      return (
        <Link
          key={key}
          to="/"
          draggable={!isMobile}
          onDragStart={() => { navDragIndex.current = navOrder.indexOf(key); }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            const from = navDragIndex.current;
            const to = navOrder.indexOf(key);
            if (from !== null && from !== to) {
              setNavOrder((previous) => {
                const next = [...previous];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                return next;
              });
            }
            navDragIndex.current = null;
          }}
          onClick={() => isMobile && setMobileOpen(false)}
          onContextMenu={(event) => openContextMenu(event, builtin.name, null, key)}
          className={
            isMobile
              ? `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-mono transition-all ${classes}`
              : `whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-all cursor-grab ${classes}`
          }
        >
          {isMobile && <ChevronRight className="h-3 w-3" />}
          {builtin.name}
        </Link>
      );
    }

    if (!custom) return null;

    const classes = currentPageName === `note/${key}`
      ? 'text-slate-300 bg-white/5'
      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5';

    return (
      <Link
        key={key}
        to={`/note/${key}`}
        draggable={!isMobile}
        onDragStart={() => { navDragIndex.current = navOrder.indexOf(key); }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => {
          const from = navDragIndex.current;
          const to = navOrder.indexOf(key);
          if (from !== null && from !== to) {
            setNavOrder((previous) => {
              const next = [...previous];
              const [moved] = next.splice(from, 1);
              next.splice(to, 0, moved);
              return next;
            });
          }
          navDragIndex.current = null;
        }}
        onClick={() => isMobile && setMobileOpen(false)}
        onContextMenu={(event) => openContextMenu(event, custom.name, key)}
        className={
          isMobile
            ? `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-mono transition-all ${classes}`
            : `whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-all cursor-grab ${classes}`
        }
      >
        {isMobile && <ChevronRight className="h-3 w-3" />}
        {custom.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <nav className="sticky top-0 z-50 border-b border-slate-800/50 bg-[#0a0e1a]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 md:px-6">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="group mr-8 flex items-center gap-2.5">
              <Shield className="h-5 w-5 text-red-500 transition-colors group-hover:text-red-400" />
              <span className="hidden font-mono text-sm font-bold sm:block">
                <span className="text-white">CYBER</span> <span className="text-red-500">|</span> <span className="text-white">NOTES</span>
              </span>
            </Link>

            <div className="hidden flex-1 items-center gap-1 overflow-x-auto px-4 md:flex" style={{ scrollbarWidth: 'thin' }}>
              {navOrder.map((key) => renderNavLink(key, false))}
              <button
                onClick={() => setAddPageOpen(true)}
                className="ml-2 flex-shrink-0 flex items-center gap-1 rounded-md border border-dashed border-slate-700 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-600 transition-all hover:border-slate-500 hover:bg-white/5 hover:text-slate-300"
              >
                <Plus className="h-3 w-3" /> New Page
              </button>
            </div>

            <div className="ml-2 flex-shrink-0">
              <ImportExportControls
                customPages={customPages}
                hiddenPages={hiddenPages}
                navOrder={navOrder}
                onImport={handleImport}
              />
            </div>

            <button
              onClick={() => setMobileOpen((previous) => !previous)}
              className="ml-2 text-slate-400 transition-colors hover:text-slate-200 md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-800/50 bg-[#0a0e1a]/95 backdrop-blur-xl md:hidden">
            <div className="space-y-1 px-4 py-3">
              {navOrder.map((key) => renderNavLink(key, true))}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setAddPageOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700 px-3 py-2.5 text-sm font-mono text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300"
              >
                <Plus className="h-3 w-3" /> New Page
              </button>
            </div>
          </div>
        )}
      </nav>

      {contextMenu && (
        <NavContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          label={contextMenu.label}
          onDelete={() => (
            contextMenu.pageKey
              ? handleDeletePage(contextMenu.pageKey)
              : handleHideBuiltinPage(contextMenu.builtinPage)
          )}
          onClose={() => setContextMenu(null)}
        />
      )}

      {addPageOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg border border-slate-800 bg-[#0d1117] p-6">
            <h3 className="text-lg font-mono font-bold text-slate-200">New Page</h3>

            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
              <label className="mb-1.5 flex items-center gap-1 text-xs font-mono text-slate-400">
                <Sparkles className="h-3 w-3 text-purple-400" /> SMART TEMPLATE
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatorPrompt}
                  onChange={(event) => setGeneratorPrompt(event.target.value)}
                  placeholder="e.g., cloud attack techniques"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                  onKeyDown={(event) => event.key === 'Enter' && handleGenerateTemplate()}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  title="Attach reference image"
                  className={`rounded-lg border px-2.5 py-2 font-mono text-xs transition-colors ${
                    generatorImageName
                      ? 'border-purple-500/50 bg-purple-600/20 text-purple-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <button
                  onClick={handleGenerateTemplate}
                  disabled={(!generatorPrompt.trim() && !generatorImageName) || generatorLoading}
                  className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-mono text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {generatorLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {generatorLoading ? '' : 'Generate'}
                </button>
              </div>

              {generatorImageName && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-xs font-mono text-purple-400">✓ {generatorImageName}</span>
                  <button
                    onClick={() => setGeneratorImageName('')}
                    className="text-slate-600 transition-colors hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {generatorError && <p className="mt-1 text-xs font-mono text-red-400">{generatorError}</p>}
              {generatedTemplate && !generatorLoading && (
                <p className="mt-1 text-xs font-mono text-emerald-400">
                  ✓ Generated: <span className="text-slate-300">{generatedTemplate.pageType}</span> page
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-mono text-slate-500">PAGE NAME</label>
              <input
                type="text"
                value={newPageName}
                onChange={(event) => setNewPageName(event.target.value)}
                placeholder="e.g., Cloud Attacks"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAddPage();
                  if (event.key === 'Escape') resetPageModal();
                }}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-mono text-slate-500">PAGE TYPE</label>
              <div className="space-y-2">
                {pageTypes.map((pageType) => (
                  <button
                    key={pageType.value}
                    onClick={() => setNewPageType(pageType.value)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left font-mono transition-all ${
                      newPageType === pageType.value
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-slate-200'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-sm font-semibold">{pageType.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{pageType.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={resetPageModal}
                className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-mono text-slate-300 transition-colors hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPage}
                disabled={!newPageName.trim()}
                className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-mono font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-12">
        {children}
      </main>
    </div>
  );
}
