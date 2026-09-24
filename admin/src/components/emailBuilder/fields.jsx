import React, { useMemo, useRef, useState } from 'react'
import axios from 'axios'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { toast } from 'react-toastify'
import { AlignLeft, AlignCenter, AlignRight, Upload, Loader2, X, Plus, Trash2, ChevronUp, ChevronDown, Braces } from 'lucide-react'
import { backendUrl } from '../../App'

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-black focus:ring-2 focus:ring-black/5 bg-white'

export const Field = ({ label, hint, children }) => (
  <div className='flex flex-col gap-1.5'>
    {label && <label className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>{label}</label>}
    {children}
    {hint && <p className='text-[11px] text-gray-400'>{hint}</p>}
  </div>
)

export const TextInput = ({ label, hint, value, onChange, placeholder, type = 'text' }) => (
  <Field label={label} hint={hint}>
    <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
  </Field>
)

export const TextArea = ({ label, hint, value, onChange, rows = 3, placeholder, mono }) => (
  <Field label={label} hint={hint}>
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      spellCheck={!mono}
      className={`${inputClass} resize-y ${mono ? 'font-mono text-xs leading-relaxed' : ''}`}
    />
  </Field>
)

const toPickerHex = (v) => {
  const s = String(v || '').trim()
  if (/^#[0-9a-f]{6}$/i.test(s)) return s
  if (/^#[0-9a-f]{3}$/i.test(s)) return '#' + s.slice(1).split('').map((c) => c + c).join('')
  return '#ffffff'
}

export const ColorInput = ({ label, value, onChange, allowEmpty, emptyLabel = 'Theme default' }) => (
  <Field label={label}>
    <div className='flex items-center gap-2'>
      <input
        type='color'
        value={toPickerHex(value)}
        onChange={(e) => onChange(e.target.value)}
        className='w-10 h-9 p-0.5 border border-gray-200 rounded-lg cursor-pointer bg-white shrink-0'
      />
      <input
        type='text'
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={allowEmpty ? emptyLabel : '#000000'}
        className={`${inputClass} font-mono`}
      />
      {allowEmpty && value && (
        <button type='button' onClick={() => onChange('')} title='Reset' className='p-2 text-gray-400 hover:text-black shrink-0'>
          <X size={14} />
        </button>
      )}
    </div>
  </Field>
)

export const RangeInput = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = 'px' }) => (
  <Field label={label}>
    <div className='flex items-center gap-3'>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={Number(value) || 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className='flex-1 accent-black'
      />
      <div className='flex items-center gap-1 shrink-0'>
        <input
          type='number'
          min={min}
          max={max}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className='w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-black text-right'
        />
        <span className='text-xs text-gray-400 w-4'>{unit}</span>
      </div>
    </div>
  </Field>
)

export const SelectInput = ({ label, value, onChange, options }) => (
  <Field label={label}>
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </Field>
)

export const Toggle = ({ label, checked, onChange }) => (
  <label className='flex items-center justify-between gap-3 cursor-pointer select-none py-1'>
    <span className='text-sm text-gray-700'>{label}</span>
    <button
      type='button'
      role='switch'
      aria-checked={!!checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-black' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  </label>
)

export const AlignInput = ({ label = 'Alignment', value, onChange }) => {
  const opts = [
    { v: 'left', Icon: AlignLeft },
    { v: 'center', Icon: AlignCenter },
    { v: 'right', Icon: AlignRight },
  ]
  return (
    <Field label={label}>
      <div className='inline-flex rounded-lg border border-gray-200 overflow-hidden w-fit'>
        {opts.map(({ v, Icon }) => (
          <button
            key={v}
            type='button'
            onClick={() => onChange(v)}
            title={v}
            className={`px-3 py-2 ${value === v ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </Field>
  )
}

export const uploadEmailImage = async (file, token) => {
  const formData = new FormData()
  formData.append('image', file)
  const res = await axios.post(`${backendUrl}/api/email-template/upload`, formData, {
    headers: { token, 'Content-Type': 'multipart/form-data' },
  })
  if (!res.data.success) throw new Error(res.data.message || 'Upload failed')
  return res.data.imageUrl
}

const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/jpg,image/webp'

export const ImageInput = ({ label, hint, value, onChange, token, compact }) => {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      onChange(await uploadEmailImage(file, token))
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field label={label} hint={hint ?? (compact ? undefined : 'PNG, JPG or WEBP. Images are hosted on Cloudinary so they load in every inbox.')}>
      <div className='flex items-center gap-2'>
        {value ? (
          <img src={value} alt='' className={`${compact ? 'w-9 h-9' : 'w-12 h-12'} object-contain rounded-lg border border-gray-200 bg-gray-50 shrink-0`} />
        ) : (
          <div className={`${compact ? 'w-9 h-9' : 'w-12 h-12'} rounded-lg border border-dashed border-gray-300 bg-gray-50 shrink-0`} />
        )}
        <input
          type='url'
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder='https://…'
          className={inputClass}
        />
        <input ref={fileRef} type='file' accept={ACCEPTED_IMAGES} className='hidden' onChange={handleFile} />
        <button
          type='button'
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title='Upload image'
          className='flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 shrink-0 disabled:opacity-60'
        >
          {uploading ? <Loader2 size={14} className='animate-spin' /> : <Upload size={14} />}
          {!compact && 'Upload'}
        </button>
      </div>
    </Field>
  )
}

export const TokenMenu = ({ tokens, onPick, label = 'Insert variable' }) => {
  const [open, setOpen] = useState(false)
  if (!tokens?.length) return null
  return (
    <div className='relative'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
      >
        <Braces size={13} /> {label}
      </button>
      {open && (
        <>
          <div className='fixed inset-0 z-10' onClick={() => setOpen(false)} />
          <div className='absolute right-0 z-20 mt-1 w-64 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl py-1'>
            {tokens.map((t) => (
              <button
                key={t.key}
                type='button'
                onClick={() => { onPick(`{{${t.key}}}`); setOpen(false) }}
                className='w-full text-left px-3 py-2 hover:bg-gray-50 flex flex-col'
              >
                <span className='text-sm text-gray-800'>{t.label}</span>
                <span className='text-[11px] font-mono text-gray-400'>{`{{${t.key}}}`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export const RichTextInput = ({ label, value, onChange, token, tokens }) => {
  const quillRef = useRef(null)

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        // Default Quill image handler embeds base64, which most mail clients block.
        image: function () {
          const quill = this.quill
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = ACCEPTED_IMAGES
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            const toastId = toast.loading('Uploading image…')
            try {
              const url = await uploadEmailImage(file, token)
              const range = quill.getSelection(true)
              quill.insertEmbed(range ? range.index : quill.getLength(), 'image', url, 'user')
              toast.update(toastId, { render: 'Image inserted', type: 'success', isLoading: false, autoClose: 2000 })
            } catch (err) {
              toast.update(toastId, { render: err.response?.data?.message || 'Image upload failed', type: 'error', isLoading: false, autoClose: 3000 })
            }
          }
          input.click()
        },
      },
    },
  }), [token])

  const insertToken = (text) => {
    const editor = quillRef.current?.getEditor()
    if (!editor) return
    const range = editor.getSelection(true)
    const index = range ? range.index : editor.getLength() - 1
    editor.insertText(index, text, 'user')
    editor.setSelection(index + text.length, 0)
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <label className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>{label}</label>
        <TokenMenu tokens={tokens} onPick={insertToken} />
      </div>
      <div className='bg-white rounded-lg [&_.ql-container]:min-h-[120px] [&_.ql-container]:rounded-b-lg [&_.ql-toolbar]:rounded-t-lg [&_.ql-editor]:text-sm'>
        <ReactQuill
          ref={quillRef}
          theme='snow'
          value={value || ''}
          // Ignore Quill's own normalisation of the initial HTML so opening a block doesn't mark the template dirty.
          onChange={(html, _delta, source) => { if (source === 'user') onChange(html) }}
          modules={modules}
        />
      </div>
    </div>
  )
}

export const LinksEditor = ({ label = 'Links', links, onChange, token }) => {
  const list = Array.isArray(links) ? links : []
  const update = (i, patch) => onChange(list.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <Field label={label} hint='Leave the icon empty to show the label as a text link.'>
      <div className='flex flex-col gap-3'>
        {list.map((l, i) => (
          <div key={i} className='border border-gray-200 rounded-xl p-3 flex flex-col gap-2 bg-gray-50/50'>
            <div className='flex items-center gap-2'>
              <input value={l.label ?? ''} onChange={(e) => update(i, { label: e.target.value })} placeholder='Label (e.g. Instagram)' className={inputClass} />
              <button type='button' onClick={() => move(i, -1)} className='p-1.5 text-gray-400 hover:text-black' title='Move up'><ChevronUp size={16} /></button>
              <button type='button' onClick={() => move(i, 1)} className='p-1.5 text-gray-400 hover:text-black' title='Move down'><ChevronDown size={16} /></button>
              <button type='button' onClick={() => onChange(list.filter((_, idx) => idx !== i))} className='p-1.5 text-gray-400 hover:text-red-600' title='Remove'><Trash2 size={16} /></button>
            </div>
            <input type='url' value={l.url ?? ''} onChange={(e) => update(i, { url: e.target.value })} placeholder='https://instagram.com/…' className={inputClass} />
            <ImageInput compact value={l.iconUrl} onChange={(v) => update(i, { iconUrl: v })} token={token} />
          </div>
        ))}
        <button
          type='button'
          onClick={() => onChange([...list, { label: '', url: '', iconUrl: '' }])}
          className='flex items-center justify-center gap-1.5 py-2 text-sm font-medium border border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-black hover:text-black'
        >
          <Plus size={14} /> Add link
        </button>
      </div>
    </Field>
  )
}
