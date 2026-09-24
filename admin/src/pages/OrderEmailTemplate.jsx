import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Save, RotateCcw, Send, Monitor, Smartphone, Loader2, Plus, GripVertical, Eye, EyeOff,
  Copy, Trash2, ChevronUp, ChevronDown, Lock, Palette, Blocks, FileCode, AlertTriangle,
  Upload, Undo2, X,
} from 'lucide-react'
import { backendUrl } from '../App'
import BlockEditor, { BLOCK_TYPES, blockSummary } from '../components/emailBuilder/BlockEditor'
import { TextInput, ColorInput, RangeInput, SelectInput, TokenMenu, uploadEmailImage } from '../components/emailBuilder/fields'

const API = `${backendUrl}/api/email-template`
const uid = () => Math.random().toString(36).slice(2, 10)

const THEME_PRESETS = [
  { name: 'Febeul Blush', theme: { pageBg: '#fdf5f5', cardBg: '#ffffff', accent: '#f9aeaf', accentSoft: '#fff0f0', accentText: '#d17a7b', textColor: '#333333' } },
  { name: 'Midnight Luxe', theme: { pageBg: '#f4f4f6', cardBg: '#ffffff', accent: '#1f1b2e', accentSoft: '#efedf6', accentText: '#4b3f72', textColor: '#1f1b2e' } },
  { name: 'Champagne', theme: { pageBg: '#faf6ef', cardBg: '#ffffff', accent: '#c8a96a', accentSoft: '#f6eedd', accentText: '#9a7b3c', textColor: '#2d2a26' } },
  { name: 'Sage', theme: { pageBg: '#f3f6f2', cardBg: '#ffffff', accent: '#8fae8b', accentSoft: '#e8f0e6', accentText: '#56785a', textColor: '#27322a' } },
]

const REQUIRED_HTML_TOKENS = ['itemRows', 'totalAmount', 'orderId']

const OrderEmailTemplate = ({ token }) => {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState(null)
  const [savedJson, setSavedJson] = useState('')
  const [meta, setMeta] = useState(null)
  const [info, setInfo] = useState({ creator: null, updatedAt: null, isDefault: true })
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  const [panel, setPanel] = useState('blocks')
  const [selectedId, setSelectedId] = useState(null)
  const [showPalette, setShowPalette] = useState(false)
  const [dragHandleId, setDragHandleId] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  const [preview, setPreview] = useState({ html: '', subject: '', template: '', source: 'sample' })
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [device, setDevice] = useState('desktop')
  const [source, setSource] = useState('sample')
  const [frameHeight, setFrameHeight] = useState(900)
  const [boxWidth, setBoxWidth] = useState(600)
  const boxRef = useRef(null)

  const [testTo, setTestTo] = useState(() => localStorage.getItem('userEmail') || '')
  const [sendingTest, setSendingTest] = useState(false)

  const htmlRef = useRef(null)
  const htmlUploadRef = useRef(null)
  const [htmlUploading, setHtmlUploading] = useState(false)

  const dirty = !!content && JSON.stringify(content) !== savedJson
  const textTokens = useMemo(() => (meta?.tokens || []).filter((t) => t.group === 'text'), [meta])

  // ---------- Load ----------
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/order-confirmation`, { headers: { token } })
        if (res.data.success) {
          setContent(res.data.content)
          setSavedJson(JSON.stringify(res.data.content))
          setMeta(res.data.meta)
          setInfo({ creator: res.data.creator, updatedAt: res.data.updatedAt, isDefault: res.data.isDefault })
        } else {
          toast.error(res.data.message || 'Failed to load template')
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load template')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  // ---------- Live preview (debounced, server-rendered so it matches the real email exactly) ----------
  useEffect(() => {
    if (!content) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const res = await axios.post(`${API}/order-confirmation/preview`, { content, source }, { headers: { token }, signal: controller.signal })
        if (res.data.success) {
          setPreview(res.data)
          setPreviewError('')
        } else {
          setPreviewError(res.data.message || 'Preview failed')
        }
      } catch (err) {
        if (!axios.isCancel(err)) setPreviewError(err.response?.data?.message || 'Preview failed')
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false)
      }
    }, 450)
    return () => { clearTimeout(timer); controller.abort() }
  }, [content, source, token])

  useEffect(() => {
    if (!boxRef.current) return
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width))
    ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [loading])

  useEffect(() => {
    if (!dirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // ---------- Mutators ----------
  const patch = (p) => setContent((c) => ({ ...c, ...p }))
  const updateTheme = (key, value) => setContent((c) => ({ ...c, theme: { ...c.theme, [key]: value } }))
  const updateBlock = (id, p) => setContent((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) }))

  const moveBlock = (id, dir) => setContent((c) => {
    const i = c.blocks.findIndex((b) => b.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= c.blocks.length) return c
    const blocks = [...c.blocks]
    ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
    return { ...c, blocks }
  })

  const reorder = (fromId, toId) => setContent((c) => {
    const from = c.blocks.findIndex((b) => b.id === fromId)
    const to = c.blocks.findIndex((b) => b.id === toId)
    if (from < 0 || to < 0 || from === to) return c
    const blocks = [...c.blocks]
    const [moved] = blocks.splice(from, 1)
    blocks.splice(to, 0, moved)
    return { ...c, blocks }
  })

  const removeBlock = (id) => {
    setContent((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== id) }))
    if (selectedId === id) setSelectedId(null)
  }

  const duplicateBlock = (id) => {
    const newId = uid()
    setContent((c) => {
      const i = c.blocks.findIndex((b) => b.id === id)
      const blocks = [...c.blocks]
      blocks.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(c.blocks[i])), id: newId })
      return { ...c, blocks }
    })
    setSelectedId(newId)
  }

  const addBlock = (type) => {
    const block = { id: uid(), type, ...JSON.parse(JSON.stringify(meta.blockDefaults[type])) }
    setContent((c) => {
      const i = c.blocks.findIndex((b) => b.id === selectedId)
      const blocks = [...c.blocks]
      blocks.splice(i >= 0 ? i + 1 : blocks.length, 0, block)
      return { ...c, blocks }
    })
    setSelectedId(block.id)
    setShowPalette(false)
  }

  const switchMode = (mode) => {
    if (mode === content.mode) return
    if (mode === 'html' && !content.html.trim()) {
      patch({ mode, html: preview.template || '' })
      if (preview.template) toast.info('Started from your current visual design')
    } else {
      patch({ mode })
    }
  }

  const insertIntoHtml = (text) => {
    const el = htmlRef.current
    const html = content.html || ''
    const start = el?.selectionStart ?? html.length
    const end = el?.selectionEnd ?? start
    patch({ html: html.slice(0, start) + text + html.slice(end) })
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const handleHtmlImageUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setHtmlUploading(true)
    try {
      const url = await uploadEmailImage(file, token)
      insertIntoHtml(`<img src="${url}" alt="" width="570" style="display:block;width:100%;max-width:570px;height:auto;border:0;">`)
      toast.success('Image inserted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed')
    } finally {
      setHtmlUploading(false)
    }
  }

  // ---------- Server actions ----------
  const handleSave = async () => {
    if (content.mode === 'html' && !content.html.trim()) {
      toast.error('HTML template cannot be empty')
      return
    }
    setSaving(true)
    try {
      const res = await axios.post(`${API}/order-confirmation`, { content }, { headers: { token } })
      if (res.data.success) {
        setContent(res.data.content)
        setSavedJson(JSON.stringify(res.data.content))
        setInfo({ creator: res.data.creator, updatedAt: res.data.updatedAt, isDefault: false })
        toast.success('Template saved — new orders will use it')
      } else {
        toast.error(res.data.message || 'Failed to save')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Reset the order confirmation email to the original Febeul design? Your customisations will be lost.')) return
    setResetting(true)
    try {
      const res = await axios.delete(`${API}/order-confirmation`, { headers: { token } })
      if (res.data.success) {
        setContent(res.data.content)
        setSavedJson(JSON.stringify(res.data.content))
        setInfo({ creator: null, updatedAt: null, isDefault: true })
        setSelectedId(null)
        toast.success('Template reset to default')
      } else {
        toast.error(res.data.message || 'Failed to reset')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset')
    } finally {
      setResetting(false)
    }
  }

  const handleDiscard = () => {
    if (!window.confirm('Discard all unsaved changes?')) return
    setContent(JSON.parse(savedJson))
    setSelectedId(null)
  }

  const handleSendTest = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo.trim())) {
      toast.error('Enter a valid email address')
      return
    }
    setSendingTest(true)
    try {
      const res = await axios.post(`${API}/order-confirmation/test`, { content, to: testTo.trim(), source }, { headers: { token } })
      if (res.data.success) toast.success(res.data.message)
      else toast.error(res.data.message || 'Failed to send test email')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  // ---------- Derived ----------
  const warnings = useMemo(() => {
    if (!content) return []
    const list = []
    if (content.mode === 'html') {
      const missing = REQUIRED_HTML_TOKENS.filter((k) => !new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`).test(content.html || ''))
      if (missing.length) list.push(`Your HTML is missing ${missing.map((k) => `{{${k}}}`).join(', ')} — customers won't see that order information.`)
    } else {
      const visible = (type) => content.blocks.some((b) => b.type === type && !b.hidden)
      if (!visible('items')) list.push('The "Ordered Items" block is hidden or missing — customers won\'t see what they bought.')
      if (!visible('totals')) list.push('The "Price Summary" block is hidden or missing — customers won\'t see their order total.')
    }
    return list
  }, [content])

  const missingOrderBlocks = useMemo(
    () => (meta && content ? meta.orderBlockTypes.filter((t) => !content.blocks.some((b) => b.type === t)) : []),
    [meta, content],
  )

  if (loading) {
    return (
      <div className='flex items-center justify-center py-24'>
        <Loader2 size={28} className='animate-spin text-gray-400' />
      </div>
    )
  }

  if (!content || !meta) {
    return <div className='p-6 text-center text-gray-500'>Could not load the email template. Please refresh the page.</div>
  }

  const frameWidth = device === 'mobile' ? 375 : 680
  const scale = Math.min(1, Math.max(0.3, (boxWidth - 24) / frameWidth))

  const tabBtn = (active) => `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-black text-white shadow' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`
  const iconBtn = 'p-1.5 rounded-md text-gray-400 hover:text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400'

  return (
    <div className='flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-16'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-800 flex items-center gap-3'>
            Order Confirmation Email
            {dirty && <span className='text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-700'>Unsaved changes</span>}
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            Design the email customers receive right after placing an order.{' '}
            {info.isDefault
              ? <span className='text-gray-400'>Currently using the default design.</span>
              : info.creator && (
                <span className='text-gray-400'>
                  Last saved by <span className='font-medium text-gray-600'>{info.creator.name}</span>
                  {info.updatedAt && ` on ${new Date(info.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`}
                </span>
              )}
          </p>
        </div>
        <div className='flex items-center gap-2 flex-wrap'>
          {dirty && (
            <button onClick={handleDiscard} className='flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600'>
              <Undo2 size={16} /> Discard
            </button>
          )}
          <button onClick={handleReset} disabled={resetting || info.isDefault} className='flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50'>
            {resetting ? <Loader2 size={16} className='animate-spin' /> : <RotateCcw size={16} />} Reset to default
          </button>
          <button onClick={handleSave} disabled={saving || !dirty} className='flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg bg-black hover:bg-gray-800 text-white disabled:bg-gray-400'>
            {saving ? <Loader2 size={16} className='animate-spin' /> : <Save size={16} />} Save template
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className='flex flex-col gap-1 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800'>
          {warnings.map((w) => (
            <p key={w} className='flex items-start gap-2'><AlertTriangle size={16} className='shrink-0 mt-0.5' /> {w}</p>
          ))}
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] gap-6 items-start'>
        {/* ---------- Editor column ---------- */}
        <div className='flex flex-col gap-5 min-w-0'>
          {/* Email settings */}
          <div className='bg-white p-5 rounded-xl shadow-sm border flex flex-col gap-4'>
            <div className='flex items-center justify-between gap-2'>
              <h2 className='text-sm font-bold text-gray-800 flex items-center gap-2'><span className='w-2 h-2 bg-pink-400 rounded-full' /> Email settings</h2>
              <TokenMenu tokens={textTokens} onPick={(t) => patch({ subject: `${content.subject}${content.subject.endsWith(' ') ? '' : ' '}${t}` })} label='Add to subject' />
            </div>
            <TextInput label='Subject line' value={content.subject} onChange={(v) => patch({ subject: v })} placeholder='Febeul Order Confirmed - #{{orderId}}' />
            {content.mode === 'builder' && (
              <TextInput label='Preview text' value={content.preheader} onChange={(v) => patch({ preheader: v })}
                hint='The grey snippet shown next to the subject in the inbox.' />
            )}
          </div>

          {/* Mode */}
          <div className='flex items-center gap-2 bg-white p-1.5 rounded-xl border shadow-sm w-fit'>
            <button onClick={() => switchMode('builder')} className={tabBtn(content.mode === 'builder')}><Blocks size={16} /> Visual builder</button>
            <button onClick={() => switchMode('html')} className={tabBtn(content.mode === 'html')}><FileCode size={16} /> HTML code</button>
          </div>

          {content.mode === 'builder' ? (
            <div className='bg-white rounded-xl shadow-sm border'>
              <div className='flex items-center gap-1 border-b px-3'>
                {[{ key: 'blocks', label: 'Content blocks', Icon: Blocks }, { key: 'theme', label: 'Theme & colours', Icon: Palette }].map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setPanel(key)}
                    className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 -mb-px ${panel === key ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              {panel === 'blocks' ? (
                <div className='p-4 flex flex-col gap-2'>
                  {content.blocks.map((b, index) => {
                    const def = BLOCK_TYPES[b.type] || { label: b.type, icon: Blocks }
                    const Icon = def.icon
                    const selected = selectedId === b.id
                    return (
                      <div
                        key={b.id}
                        draggable={dragHandleId === b.id}
                        onDragStart={(e) => { setDragId(b.id); e.dataTransfer.effectAllowed = 'move' }}
                        onDragOver={(e) => { if (dragId) { e.preventDefault(); setDragOverId(b.id) } }}
                        onDrop={(e) => { e.preventDefault(); if (dragId) reorder(dragId, b.id); setDragId(null); setDragOverId(null) }}
                        onDragEnd={() => { setDragId(null); setDragOverId(null); setDragHandleId(null) }}
                        className={`rounded-xl border bg-white transition-all ${selected ? 'border-black shadow-md' : 'border-gray-200 hover:border-gray-300'} ${dragOverId === b.id && dragId !== b.id ? 'ring-2 ring-pink-300' : ''} ${dragId === b.id ? 'opacity-40' : ''}`}
                      >
                        <div className='flex items-center gap-2 px-2 py-2.5 cursor-pointer' onClick={() => setSelectedId(selected ? null : b.id)}>
                          <span
                            onMouseDown={() => setDragHandleId(b.id)}
                            onMouseUp={() => setDragHandleId(null)}
                            onClick={(e) => e.stopPropagation()}
                            className='text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing'
                            title='Drag to reorder'
                          >
                            <GripVertical size={16} />
                          </span>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${def.order ? 'bg-pink-50 text-pink-500' : 'bg-gray-100 text-gray-600'}`}>
                            <Icon size={16} />
                          </div>
                          <div className={`flex-1 min-w-0 ${b.hidden ? 'opacity-50' : ''}`}>
                            <div className='text-sm font-semibold text-gray-800 flex items-center gap-1.5'>
                              {def.label}
                              {def.order && <span title='Order data block — can be hidden or moved, not deleted'><Lock size={11} className='text-gray-400' /></span>}
                              {b.hidden && <span className='text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500'>Hidden</span>}
                            </div>
                            <div className='text-xs text-gray-400 truncate'>{blockSummary(b) || def.description}</div>
                          </div>
                          <div className='flex items-center shrink-0' onClick={(e) => e.stopPropagation()}>
                            <button className={iconBtn} disabled={index === 0} onClick={() => moveBlock(b.id, -1)} title='Move up'><ChevronUp size={16} /></button>
                            <button className={iconBtn} disabled={index === content.blocks.length - 1} onClick={() => moveBlock(b.id, 1)} title='Move down'><ChevronDown size={16} /></button>
                            <button className={iconBtn} onClick={() => updateBlock(b.id, { hidden: !b.hidden })} title={b.hidden ? 'Show' : 'Hide'}>
                              {b.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            {!def.order && (
                              <>
                                <button className={iconBtn} onClick={() => duplicateBlock(b.id)} title='Duplicate'><Copy size={15} /></button>
                                <button className={`${iconBtn} hover:!text-red-600 hover:!bg-red-50`} onClick={() => removeBlock(b.id)} title='Delete'><Trash2 size={15} /></button>
                              </>
                            )}
                          </div>
                        </div>
                        {selected && (
                          <div className='border-t px-4 py-4 flex flex-col gap-4 bg-gray-50/50 rounded-b-xl'>
                            <BlockEditor block={{ ...meta.blockDefaults[b.type], ...b }} onChange={(p) => updateBlock(b.id, p)} token={token} tokens={textTokens} />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {showPalette ? (
                    <div className='border-2 border-dashed border-gray-200 rounded-xl p-4 mt-2'>
                      <div className='flex items-center justify-between mb-3'>
                        <p className='text-sm font-semibold text-gray-700'>
                          Add a block {selectedId && <span className='font-normal text-gray-400'>(inserted below the selected block)</span>}
                        </p>
                        <button onClick={() => setShowPalette(false)} className='p-1 text-gray-400 hover:text-black'><X size={16} /></button>
                      </div>
                      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                        {Object.entries(BLOCK_TYPES)
                          .filter(([type, def]) => !def.order || missingOrderBlocks.includes(type))
                          .map(([type, def]) => {
                            const Icon = def.icon
                            return (
                              <button key={type} onClick={() => addBlock(type)}
                                className='flex flex-col items-start gap-1 p-3 rounded-xl border border-gray-200 hover:border-black hover:shadow-sm text-left bg-white transition-all'>
                                <Icon size={18} className={def.order ? 'text-pink-500' : 'text-gray-700'} />
                                <span className='text-sm font-semibold text-gray-800'>{def.label}</span>
                                <span className='text-[11px] text-gray-400 leading-snug'>{def.description}</span>
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowPalette(true)}
                      className='mt-2 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-black hover:text-black'>
                      <Plus size={16} /> Add block
                    </button>
                  )}
                </div>
              ) : (
                <div className='p-5 flex flex-col gap-5'>
                  <div>
                    <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2'>Presets</p>
                    <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                      {THEME_PRESETS.map((preset) => (
                        <button key={preset.name} onClick={() => setContent((c) => ({ ...c, theme: { ...c.theme, ...preset.theme } }))}
                          className='flex flex-col gap-2 p-2.5 rounded-xl border border-gray-200 hover:border-black text-left bg-white'>
                          <div className='flex h-6 rounded-md overflow-hidden border border-gray-100'>
                            {['pageBg', 'accent', 'accentSoft', 'accentText', 'textColor'].map((k) => (
                              <span key={k} className='flex-1' style={{ background: preset.theme[k] }} />
                            ))}
                          </div>
                          <span className='text-xs font-medium text-gray-700'>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <ColorInput label='Page background' value={content.theme.pageBg} onChange={(v) => updateTheme('pageBg', v)} />
                    <ColorInput label='Email background' value={content.theme.cardBg} onChange={(v) => updateTheme('cardBg', v)} />
                    <ColorInput label='Accent (hero, highlights)' value={content.theme.accent} onChange={(v) => updateTheme('accent', v)} />
                    <ColorInput label='Accent soft (badge bg)' value={content.theme.accentSoft} onChange={(v) => updateTheme('accentSoft', v)} />
                    <ColorInput label='Accent text (badge, links)' value={content.theme.accentText} onChange={(v) => updateTheme('accentText', v)} />
                    <ColorInput label='Main text' value={content.theme.textColor} onChange={(v) => updateTheme('textColor', v)} />
                    <SelectInput label='Body font' value={content.theme.bodyFont} onChange={(v) => updateTheme('bodyFont', v)}
                      options={meta.fonts.map((f) => ({ value: f, label: f }))} />
                    <SelectInput label='Heading font' value={content.theme.headingFont} onChange={(v) => updateTheme('headingFont', v)}
                      options={meta.fonts.map((f) => ({ value: f, label: f }))} />
                  </div>
                  <RangeInput label='Email corner radius' value={content.theme.radius} onChange={(v) => updateTheme('radius', v)} min={0} max={40} />
                  <p className='text-[11px] text-gray-400'>Web fonts show in Apple Mail, iOS and most mobile apps; Gmail and Outlook fall back to a similar system font.</p>
                </div>
              )}
            </div>
          ) : (
            <div className='bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-xs text-gray-500 max-w-sm'>Full control over the email HTML. Use inline styles for the best results across mail clients.</p>
                <div className='flex items-center gap-2 flex-wrap'>
                  <TokenMenu tokens={meta.tokens} onPick={insertIntoHtml} />
                  <input ref={htmlUploadRef} type='file' accept='image/png,image/jpeg,image/jpg,image/webp' className='hidden' onChange={handleHtmlImageUpload} />
                  <button onClick={() => htmlUploadRef.current?.click()} disabled={htmlUploading}
                    className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-60'>
                    {htmlUploading ? <Loader2 size={13} className='animate-spin' /> : <Upload size={13} />} Insert image
                  </button>
                  <button
                    onClick={() => {
                      if (content.html.trim() && !window.confirm('Replace your HTML with the current visual-builder design?')) return
                      patch({ html: preview.template || '' })
                    }}
                    className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600'>
                    <Blocks size={13} /> Copy from visual builder
                  </button>
                </div>
              </div>
              <textarea
                ref={htmlRef}
                value={content.html}
                onChange={(e) => patch({ html: e.target.value })}
                spellCheck={false}
                rows={30}
                className='w-full font-mono text-xs leading-relaxed p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-gray-50 resize-y'
              />
              <p className='text-[11px] text-gray-400'>
                Required: <code>{'{{itemRows}}'}</code> inside a <code>&lt;tbody&gt;</code>, and <code>{'{{totalAmount}}'}</code>. Row variables such as <code>{'{{gstRows}}'}</code> output <code>&lt;tr&gt;</code> elements, so place them inside a table. Switching back to the visual builder keeps this HTML saved, but the builder design is what gets sent.
              </p>
            </div>
          )}
        </div>

        {/* ---------- Preview column ---------- */}
        <div className='flex flex-col gap-4 lg:sticky lg:top-4 min-w-0'>
          <div className='bg-white rounded-xl shadow-sm border overflow-hidden'>
            <div className='flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b'>
              <div className='flex items-center gap-2'>
                <h2 className='text-sm font-bold text-gray-800'>Live preview</h2>
                {previewLoading && <Loader2 size={14} className='animate-spin text-gray-400' />}
              </div>
              <div className='flex items-center gap-2'>
                <select value={source} onChange={(e) => setSource(e.target.value)}
                  className='text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-black bg-white'>
                  <option value='sample'>Sample order</option>
                  <option value='latest'>Latest real order</option>
                </select>
                <div className='inline-flex rounded-lg border border-gray-200 overflow-hidden'>
                  <button onClick={() => setDevice('desktop')} title='Desktop' className={`px-2.5 py-1.5 ${device === 'desktop' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Monitor size={15} /></button>
                  <button onClick={() => setDevice('mobile')} title='Mobile' className={`px-2.5 py-1.5 ${device === 'mobile' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Smartphone size={15} /></button>
                </div>
              </div>
            </div>

            <div className='px-4 py-3 border-b bg-gray-50/60 text-xs flex flex-col gap-0.5'>
              <p className='text-gray-400'>Subject</p>
              <p className='font-semibold text-gray-800 truncate'>{preview.subject || '—'}</p>
              {source === 'latest' && preview.source === 'sample' && (
                <p className='text-amber-600 mt-1'>No real orders found yet — showing the sample order.</p>
              )}
            </div>

            <div ref={boxRef} className='bg-gray-100 overflow-auto max-h-[75vh] p-3'>
              {previewError ? (
                <div className='flex flex-col items-center justify-center gap-2 py-20 text-sm text-red-600'>
                  <AlertTriangle size={20} /> {previewError}
                </div>
              ) : (
                <div style={{ width: frameWidth * scale, height: frameHeight * scale, margin: '0 auto' }}
                  className={device === 'mobile' ? 'rounded-[28px] ring-8 ring-gray-800 overflow-hidden bg-white' : ''}>
                  <iframe
                    key={device}
                    title='Email preview'
                    srcDoc={preview.html}
                    // same-origin (without allow-scripts) only so we can measure the document height
                    sandbox='allow-same-origin allow-popups allow-popups-to-escape-sandbox'
                    onLoad={(e) => {
                      try {
                        // body.offsetHeight (not documentElement.scrollHeight) so the frame can also shrink
                        const h = e.currentTarget.contentDocument?.body?.offsetHeight
                        if (h) setFrameHeight(Math.max(h, 200))
                      } catch { /* cross-origin guard */ }
                    }}
                    style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0, background: '#fff', display: 'block' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className='bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-3'>
            <h2 className='text-sm font-bold text-gray-800 flex items-center gap-2'><span className='w-2 h-2 bg-blue-500 rounded-full' /> Send a test email</h2>
            <p className='text-xs text-gray-500'>Sends the current (unsaved) design, filled with the {source === 'latest' ? 'latest real order' : 'sample order'}.</p>
            <div className='flex gap-2'>
              <input type='email' value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder='you@example.com'
                className='flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-black' />
              <button onClick={handleSendTest} disabled={sendingTest}
                className='flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-black hover:bg-gray-800 text-white disabled:bg-gray-400 shrink-0'>
                {sendingTest ? <Loader2 size={15} className='animate-spin' /> : <Send size={15} />} Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderEmailTemplate
