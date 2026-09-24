import React from 'react'
import {
  Image, Sparkles, Hash, Type, ClipboardList, ShoppingBag, Receipt, MousePointerClick,
  LayoutPanelLeft, Minus, MoveVertical, Share2, PanelBottom, Code,
} from 'lucide-react'
import {
  TextInput, TextArea, ColorInput, RangeInput, SelectInput, Toggle, AlignInput,
  ImageInput, RichTextInput, LinksEditor,
} from './fields'

export const BLOCK_TYPES = {
  logo: { label: 'Logo', icon: Image, description: 'Brand logo at the top' },
  hero: { label: 'Hero Banner', icon: Sparkles, description: 'Big headline with colour or image background' },
  orderBadge: { label: 'Order ID Badge', icon: Hash, description: 'Order number + Luxe badge', order: true },
  text: { label: 'Text', icon: Type, description: 'Rich text with links, lists & images' },
  orderDetails: { label: 'Order & Shipping Info', icon: ClipboardList, description: 'Date, payment, invoice & address', order: true },
  items: { label: 'Ordered Items', icon: ShoppingBag, description: 'Table of purchased products', order: true },
  totals: { label: 'Price Summary', icon: Receipt, description: 'Subtotal, discounts, GST & total', order: true },
  button: { label: 'Button', icon: MousePointerClick, description: 'Call-to-action link button' },
  image: { label: 'Image', icon: Image, description: 'Banner or promo image with link' },
  imageText: { label: 'Image + Text', icon: LayoutPanelLeft, description: 'Side-by-side promo card' },
  divider: { label: 'Divider', icon: Minus, description: 'Horizontal line' },
  spacer: { label: 'Spacer', icon: MoveVertical, description: 'Empty vertical space' },
  social: { label: 'Social Links', icon: Share2, description: 'Row of social icons' },
  footer: { label: 'Footer', icon: PanelBottom, description: 'Help text, socials & legal note' },
  html: { label: 'Custom HTML', icon: Code, description: 'Paste your own HTML snippet' },
}

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

export const blockSummary = (b) => {
  switch (b.type) {
    case 'hero': return b.title
    case 'text':
    case 'imageText':
    case 'footer': return stripHtml(b.html)
    case 'button': return b.text
    case 'image': return b.alt || (b.url ? b.url.split('/').pop() : 'No image selected')
    case 'orderBadge': return `${b.label || ''} #XXXXXXXX`
    case 'items':
    case 'orderDetails': return b.title || b.orderTitle
    case 'totals': return b.totalLabel
    case 'social': return `${(b.links || []).length} link(s)`
    case 'spacer': return `${b.height}px`
    case 'html': return stripHtml(b.html) || 'HTML snippet'
    default: return ''
  }
}

const Grid = ({ children }) => <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>{children}</div>

const BlockEditor = ({ block, onChange, token, tokens }) => {
  const set = (key) => (value) => onChange({ [key]: value })
  const p = block
  const paddingField = p.paddingY !== undefined && (
    <RangeInput label='Vertical padding' value={p.paddingY} onChange={set('paddingY')} min={0} max={120} />
  )

  switch (block.type) {
    case 'logo':
      return (
        <>
          <ImageInput label='Logo image' value={p.imageUrl} onChange={set('imageUrl')} token={token} />
          <Grid>
            <TextInput label='Alt text' value={p.alt} onChange={set('alt')} />
            <TextInput label='Link (optional)' type='url' value={p.link} onChange={set('link')} placeholder='https://febeul.com' />
          </Grid>
          <RangeInput label='Width' value={p.width} onChange={set('width')} min={40} max={400} />
          <Grid>
            <AlignInput value={p.align} onChange={set('align')} />
            <ColorInput label='Background' value={p.bgColor} onChange={set('bgColor')} allowEmpty emptyLabel='Transparent' />
          </Grid>
          {paddingField}
          <Toggle label='Show divider line below' checked={p.showDivider} onChange={set('showDivider')} />
        </>
      )

    case 'hero':
      return (
        <>
          <TextInput label='Headline' value={p.title} onChange={set('title')} />
          <TextArea label='Subtitle' value={p.subtitle} onChange={set('subtitle')} rows={2} />
          <Grid>
            <ColorInput label='Background colour' value={p.bgColor} onChange={set('bgColor')} allowEmpty emptyLabel='Accent colour' />
            <ColorInput label='Text colour' value={p.textColor} onChange={set('textColor')} />
          </Grid>
          <ImageInput label='Background image (optional)' value={p.bgImage} onChange={set('bgImage')} token={token}
            hint='Shown behind the text in clients that support it; the background colour is the fallback.' />
          <RangeInput label='Headline size' value={p.titleSize} onChange={set('titleSize')} min={14} max={72} />
          <AlignInput value={p.align} onChange={set('align')} />
          {paddingField}
        </>
      )

    case 'orderBadge':
      return (
        <>
          <TextInput label='Badge label' value={p.label} onChange={set('label')} hint='The order number is added automatically after this label.' />
          <Toggle label='Show "Luxe Member" badge for members' checked={p.showLuxeBadge !== false} onChange={set('showLuxeBadge')} />
          <RangeInput label='Top padding' value={p.paddingY} onChange={set('paddingY')} min={0} max={120} />
        </>
      )

    case 'text':
      return (
        <>
          <RichTextInput label='Content' value={p.html} onChange={set('html')} token={token} tokens={tokens} />
          <Grid>
            <AlignInput value={p.align} onChange={set('align')} />
            <RangeInput label='Font size' value={p.fontSize} onChange={set('fontSize')} min={10} max={40} />
          </Grid>
          <Grid>
            <ColorInput label='Text colour' value={p.color} onChange={set('color')} allowEmpty />
            <ColorInput label='Background' value={p.bgColor} onChange={set('bgColor')} allowEmpty emptyLabel='Transparent' />
          </Grid>
          {paddingField}
        </>
      )

    case 'orderDetails':
      return (
        <>
          <Grid>
            <TextInput label='Order card title' value={p.orderTitle} onChange={set('orderTitle')} />
            <TextInput label='Shipping card title' value={p.shippingTitle} onChange={set('shippingTitle')} />
          </Grid>
          <ColorInput label='Card background' value={p.cardBg} onChange={set('cardBg')} />
          {paddingField}
        </>
      )

    case 'items':
      return (
        <>
          <TextInput label='Section title' value={p.title} onChange={set('title')} />
          <div className='grid grid-cols-3 gap-3'>
            <TextInput label='Item column' value={p.colItem} onChange={set('colItem')} />
            <TextInput label='Qty column' value={p.colQty} onChange={set('colQty')} />
            <TextInput label='Amount column' value={p.colAmount} onChange={set('colAmount')} />
          </div>
          {paddingField}
        </>
      )

    case 'totals':
      return (
        <>
          <div className='grid grid-cols-3 gap-3'>
            <TextInput label='Subtotal label' value={p.subtotalLabel} onChange={set('subtotalLabel')} />
            <TextInput label='Shipping label' value={p.shippingLabel} onChange={set('shippingLabel')} />
            <TextInput label='Total label' value={p.totalLabel} onChange={set('totalLabel')} />
          </div>
          <ColorInput label='Box background' value={p.bgColor} onChange={set('bgColor')} />
          <p className='text-[11px] text-gray-400'>Coupon, COD, gift-wrap and GST rows appear automatically when they apply to the order.</p>
          {paddingField}
        </>
      )

    case 'button':
      return (
        <>
          <Grid>
            <TextInput label='Button text' value={p.text} onChange={set('text')} />
            <TextInput label='Link URL' type='url' value={p.url} onChange={set('url')} placeholder='https://febeul.com/…' />
          </Grid>
          <Grid>
            <ColorInput label='Button colour' value={p.bgColor} onChange={set('bgColor')} />
            <ColorInput label='Text colour' value={p.textColor} onChange={set('textColor')} />
          </Grid>
          <Grid>
            <AlignInput value={p.align} onChange={set('align')} />
            <RangeInput label='Corner radius' value={p.radius} onChange={set('radius')} min={0} max={50} />
          </Grid>
          <Toggle label='Full width' checked={p.fullWidth} onChange={set('fullWidth')} />
          {paddingField}
        </>
      )

    case 'image':
      return (
        <>
          <ImageInput label='Image' value={p.url} onChange={set('url')} token={token} />
          <Grid>
            <TextInput label='Alt text' value={p.alt} onChange={set('alt')} placeholder='Describe the image' />
            <TextInput label='Link when clicked (optional)' type='url' value={p.link} onChange={set('link')} placeholder='https://…' />
          </Grid>
          <Grid>
            <RangeInput label='Width' value={p.width} onChange={set('width')} min={10} max={100} unit='%' />
            <RangeInput label='Corner radius' value={p.radius} onChange={set('radius')} min={0} max={60} />
          </Grid>
          <AlignInput value={p.align} onChange={set('align')} />
          {paddingField}
        </>
      )

    case 'imageText':
      return (
        <>
          <ImageInput label='Image' value={p.imageUrl} onChange={set('imageUrl')} token={token} />
          <TextInput label='Image link (optional)' type='url' value={p.imageLink} onChange={set('imageLink')} placeholder='https://…' />
          <SelectInput label='Image position' value={p.imagePosition} onChange={set('imagePosition')}
            options={[{ value: 'left', label: 'Image on the left' }, { value: 'right', label: 'Image on the right' }]} />
          <RichTextInput label='Text' value={p.html} onChange={set('html')} token={token} tokens={tokens} />
          <Grid>
            <TextInput label='Button text (optional)' value={p.buttonText} onChange={set('buttonText')} />
            <TextInput label='Button link' type='url' value={p.buttonUrl} onChange={set('buttonUrl')} placeholder='https://…' />
          </Grid>
          <ColorInput label='Background' value={p.bgColor} onChange={set('bgColor')} allowEmpty emptyLabel='Transparent' />
          {paddingField}
        </>
      )

    case 'divider':
      return (
        <>
          <Grid>
            <ColorInput label='Line colour' value={p.color} onChange={set('color')} />
            <RangeInput label='Thickness' value={p.thickness} onChange={set('thickness')} min={1} max={10} />
          </Grid>
          {paddingField}
        </>
      )

    case 'spacer':
      return <RangeInput label='Height' value={p.height} onChange={set('height')} min={4} max={200} />

    case 'social':
      return (
        <>
          <LinksEditor links={p.links} onChange={set('links')} token={token} />
          <Grid>
            <AlignInput value={p.align} onChange={set('align')} />
            <RangeInput label='Icon size' value={p.iconSize} onChange={set('iconSize')} min={12} max={64} />
          </Grid>
          <ColorInput label='Background' value={p.bgColor} onChange={set('bgColor')} allowEmpty emptyLabel='Transparent' />
          {paddingField}
        </>
      )

    case 'footer':
      return (
        <>
          <RichTextInput label='Footer text' value={p.html} onChange={set('html')} token={token} tokens={tokens} />
          <LinksEditor label='Social links' links={p.links} onChange={set('links')} token={token} />
          <TextArea label='Legal / small print' value={p.legal} onChange={set('legal')} rows={4}
            hint='Each new line becomes a line break. {{currentYear}} is replaced with the current year.' />
          <Grid>
            <ColorInput label='Background' value={p.bgColor} onChange={set('bgColor')} />
            <ColorInput label='Text colour' value={p.textColor} onChange={set('textColor')} />
          </Grid>
        </>
      )

    case 'html':
      return (
        <>
          <TextArea label='HTML' value={p.html} onChange={set('html')} rows={8} mono
            hint='Use inline styles — many mail clients ignore <style> tags. Variables like {{orderId}} work here too.' />
          {paddingField}
        </>
      )

    default:
      return null
  }
}

export default BlockEditor
