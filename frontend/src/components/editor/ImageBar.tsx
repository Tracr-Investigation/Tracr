import type { Editor } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { Btn, Divider, ICON_SIZE } from './ToolbarButton';
import { IMAGE_WIDTHS, type ImageAlign } from './ImageNode';

const ALIGN_BUTTONS: { align: ImageAlign; title: string; icon: typeof AlignLeft }[] = [
  { align: 'left', title: 'Image à gauche', icon: AlignLeft },
  { align: 'center', title: 'Image centrée', icon: AlignCenter },
  { align: 'right', title: 'Image à droite', icon: AlignRight },
];

interface ImageBarProps {
  editor: Editor;
}

// Secondary toolbar row shown when an image is selected: display width and alignment.
export const ImageBar = ({ editor }: ImageBarProps) => {
  const { width, align } = editor.getAttributes('image') as { width: string | null; align: ImageAlign | null };
  const currentWidth = width ?? '100%';

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1 border-b border-primary/20 bg-card">
      <span className="text-[10px] uppercase font-semibold text-secondary mr-1">Image</span>
      {IMAGE_WIDTHS.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => editor.chain().focus().setImageLayout({ width: value === '100%' ? null : value }).run()}
          title={`Largeur : ${value} de la page`}
          className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
            currentWidth === value
              ? 'bg-primary/20 text-primary'
              : 'text-secondary hover:text-accent hover:bg-primary/10'
          }`}
        >
          {value}
        </button>
      ))}
      <Divider />
      {ALIGN_BUTTONS.map(({ align: value, title, icon: Icon }) => (
        <Btn
          key={value}
          active={(align ?? 'left') === value}
          onClick={() => editor.chain().focus().setImageLayout({ align: value }).run()}
          title={title}
        >
          <Icon size={ICON_SIZE} />
        </Btn>
      ))}
    </div>
  );
};
