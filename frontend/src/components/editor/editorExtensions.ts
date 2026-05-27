import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import type { Extensions } from '@tiptap/core';
import { LocationNode } from './LocationNode';
import { EmbedNode } from './EmbedNode';

// Extensions TipTap communes à tous les éditeurs du projet.
// DocumentEditor y ajoute CommentMark + Collaboration/CollaborationCursor.
export const createBaseExtensions = (placeholder: string, hasCollaboration = false): Extensions => {
  const starterKitOptions = hasCollaboration ? { history: false as const } : {};

  return [
    StarterKit.configure(starterKitOptions),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image.configure({ HTMLAttributes: { class: 'editor-img' } }),
    Link.configure({ openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    Placeholder.configure({ placeholder }),
    LocationNode,
    EmbedNode,
  ];
};
