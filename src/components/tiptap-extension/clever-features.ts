import { Extension, textInputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Node } from "@tiptap/pm/model";

// Emoji replacer extension
export const EmojiReplacer = Extension.create({
  name: "emojiReplacer",

  addInputRules() {
    return [
      textInputRule({ find: /-___- $/, replace: "😑 " }),
      textInputRule({ find: /:'-\) $/, replace: "😂 " }),
      textInputRule({ find: /':-\) $/, replace: "😅 " }),
      textInputRule({ find: /':-D $/, replace: "😅 " }),
      textInputRule({ find: />:-\) $/, replace: "😆 " }),
      textInputRule({ find: /-__- $/, replace: "😑 " }),
      textInputRule({ find: /':-\( $/, replace: "😓 " }),
      textInputRule({ find: /:'-\( $/, replace: "😢 " }),
      textInputRule({ find: />:-\( $/, replace: "😠 " }),
      textInputRule({ find: /O:-\) $/, replace: "😇 " }),
      textInputRule({ find: /0:-3 $/, replace: "😇 " }),
      textInputRule({ find: /0:-\) $/, replace: "😇 " }),
      textInputRule({ find: /0;\^\) $/, replace: "😇 " }),
      textInputRule({ find: /O;-\) $/, replace: "😇 " }),
      textInputRule({ find: /0;-\) $/, replace: "😇 " }),
      textInputRule({ find: /O:-3 $/, replace: "😇 " }),
      textInputRule({ find: /:'\) $/, replace: "😂 " }),
      textInputRule({ find: /:-D $/, replace: "😃 " }),
      textInputRule({ find: /':\) $/, replace: "😅 " }),
      textInputRule({ find: /'=\) $/, replace: "😅 " }),
      textInputRule({ find: /':D $/, replace: "😅 " }),
      textInputRule({ find: /'=D $/, replace: "😅 " }),
      textInputRule({ find: />:\) $/, replace: "😆 " }),
      textInputRule({ find: />;\) $/, replace: "😆 " }),
      textInputRule({ find: />=\) $/, replace: "😆 " }),
      textInputRule({ find: /;-\) $/, replace: "😉 " }),
      textInputRule({ find: /\*-\) $/, replace: "😉 " }),
      textInputRule({ find: /;-\] $/, replace: "😉 " }),
      textInputRule({ find: /;\^\) $/, replace: "😉 " }),
      textInputRule({ find: /B-\) $/, replace: "😎 " }),
      textInputRule({ find: /8-\) $/, replace: "😎 " }),
      textInputRule({ find: /B-D $/, replace: "😎 " }),
      textInputRule({ find: /8-D $/, replace: "😎 " }),
      textInputRule({ find: /:-\* $/, replace: "😘 " }),
      textInputRule({ find: /:\^\* $/, replace: "😘 " }),
      textInputRule({ find: /:-\) $/, replace: "🙂 " }),
      textInputRule({ find: /-_- $/, replace: "😑 " }),
      textInputRule({ find: /:-X $/, replace: "😶 " }),
      textInputRule({ find: /:-# $/, replace: "😶 " }),
      textInputRule({ find: /:-x $/, replace: "😶 " }),
      textInputRule({ find: />.< $/, replace: "😣 " }),
      textInputRule({ find: /:-O $/, replace: "😮 " }),
      textInputRule({ find: /:-o $/, replace: "😮 " }),
      textInputRule({ find: /O_O $/, replace: "😮 " }),
      textInputRule({ find: />:O $/, replace: "😮 " }),
      textInputRule({ find: /:-P $/, replace: "😛 " }),
      textInputRule({ find: /:-p $/, replace: "😛 " }),
      textInputRule({ find: /:-Þ $/, replace: "😛 " }),
      textInputRule({ find: /:-þ $/, replace: "😛 " }),
      textInputRule({ find: /:-b $/, replace: "😛 " }),
      textInputRule({ find: />:P $/, replace: "😜 " }),
      textInputRule({ find: /X-P $/, replace: "😜 " }),
      textInputRule({ find: /x-p $/, replace: "😜 " }),
      textInputRule({ find: /':\( $/, replace: "😓 " }),
      textInputRule({ find: /'=\( $/, replace: "😓 " }),
      textInputRule({ find: />:\\ $/, replace: "😕 " }),
      textInputRule({ find: />:\/ $/, replace: "😕 " }),
      textInputRule({ find: /:-\/ $/, replace: "😕 " }),
      textInputRule({ find: /:-. $/, replace: "😕 " }),
      textInputRule({ find: />:\[ $/, replace: "😞 " }),
      textInputRule({ find: /:-\( $/, replace: "😞 " }),
      textInputRule({ find: /:-\[ $/, replace: "😞 " }),
      textInputRule({ find: /:'\( $/, replace: "😢 " }),
      textInputRule({ find: /;-\( $/, replace: "😢 " }),
      textInputRule({ find: /#-\) $/, replace: "😵 " }),
      textInputRule({ find: /%-\) $/, replace: "😵 " }),
      textInputRule({ find: /X-\) $/, replace: "😵 " }),
      textInputRule({ find: />:\( $/, replace: "😠 " }),
      textInputRule({ find: /0:3 $/, replace: "😇 " }),
      textInputRule({ find: /0:\) $/, replace: "😇 " }),
      textInputRule({ find: /O:\) $/, replace: "😇 " }),
      textInputRule({ find: /O=\) $/, replace: "😇 " }),
      textInputRule({ find: /O:3 $/, replace: "😇 " }),
      textInputRule({ find: /<\/3 $/, replace: "💔 " }),
      textInputRule({ find: /:D $/, replace: "😃 " }),
      textInputRule({ find: /=D $/, replace: "😃 " }),
      textInputRule({ find: /;\) $/, replace: "😉 " }),
      textInputRule({ find: /\*\) $/, replace: "😉 " }),
      textInputRule({ find: /;\] $/, replace: "😉 " }),
      textInputRule({ find: /;D $/, replace: "😉 " }),
      textInputRule({ find: /B\) $/, replace: "😎 " }),
      textInputRule({ find: /8\) $/, replace: "😎 " }),
      textInputRule({ find: /:\* $/, replace: "😘 " }),
      textInputRule({ find: /=\* $/, replace: "😘 " }),
      textInputRule({ find: /:\) $/, replace: "🙂 " }),
      textInputRule({ find: /=\] $/, replace: "🙂 " }),
      textInputRule({ find: /=\) $/, replace: "🙂 " }),
      textInputRule({ find: /:\] $/, replace: "🙂 " }),
      textInputRule({ find: /:X $/, replace: "😶 " }),
      textInputRule({ find: /:# $/, replace: "😶 " }),
      textInputRule({ find: /=X $/, replace: "😶 " }),
      textInputRule({ find: /=x $/, replace: "😶 " }),
      textInputRule({ find: /:x $/, replace: "😶 " }),
      textInputRule({ find: /=# $/, replace: "😶 " }),
      textInputRule({ find: /:O $/, replace: "😮 " }),
      textInputRule({ find: /:o $/, replace: "😮 " }),
      textInputRule({ find: /:P $/, replace: "😛 " }),
      textInputRule({ find: /=P $/, replace: "😛 " }),
      textInputRule({ find: /:p $/, replace: "😛  " }),
      textInputRule({ find: /=p $/, replace: "😛 " }),
      textInputRule({ find: /:Þ $/, replace: "😛 " }),
      textInputRule({ find: /:þ $/, replace: "😛 " }),
      textInputRule({ find: /:b $/, replace: "😛 " }),
      textInputRule({ find: /d: $/, replace: "😛 " }),
      textInputRule({ find: /:\/ $/, replace: "😕 " }),
      textInputRule({ find: /:\\ $/, replace: "😕 " }),
      textInputRule({ find: /=\/ $/, replace: "😕 " }),
      textInputRule({ find: /=\\ $/, replace: "😕 " }),
      textInputRule({ find: /:L $/, replace: "😕 " }),
      textInputRule({ find: /=L $/, replace: "😕 " }),
      textInputRule({ find: /:\( $/, replace: "😞 " }),
      textInputRule({ find: /:\[ $/, replace: "😞 " }),
      textInputRule({ find: /=\( $/, replace: "😞 " }),
      textInputRule({ find: /;\( $/, replace: "😢 " }),
      textInputRule({ find: /D: $/, replace: "😨 " }),
      textInputRule({ find: /:\$ $/, replace: "😳 " }),
      textInputRule({ find: /=\$ $/, replace: "😳 " }),
      textInputRule({ find: /#\) $/, replace: "😵 " }),
      textInputRule({ find: /%\) $/, replace: "😵 " }),
      textInputRule({ find: /X\) $/, replace: "😵 " }),
      textInputRule({ find: /:@ $/, replace: "😠 " }),
      textInputRule({ find: /<3 $/, replace: "❤️ " }),
      textInputRule({ find: /\/shrug $/, replace: "¯\\_(ツ)_/¯" }),
    ];
  },
});

// Enhanced typography extension
export const EnhancedTypography = Extension.create({
  name: "enhancedTypography",

  addInputRules() {
    return [
      textInputRule({ find: /-> $/, replace: "→" }),
      textInputRule({ find: /<- $/, replace: "←" }),
      textInputRule({ find: /-- $/, replace: "—" }),
      textInputRule({ find: /... $/, replace: "…" }),
      textInputRule({ find: /1\/2 $/, replace: "½" }),
      textInputRule({ find: /1\/4 $/, replace: "¼" }),
      textInputRule({ find: /3\/4 $/, replace: "¾" }),
      textInputRule({ find: /\(c\) $/, replace: "©" }),
      textInputRule({ find: /\(r\) $/, replace: "®" }),
      textInputRule({ find: /\(tm\) $/, replace: "™" }),
      textInputRule({ find: /!= $/, replace: "≠" }),
      textInputRule({ find: /<= $/, replace: "≤" }),
      textInputRule({ find: />= $/, replace: "≥" }),
      textInputRule({ find: /<< $/, replace: "«" }),
      textInputRule({ find: />> $/, replace: "»" }),
    ];
  },
});

// Smart quotes extension
export const SmartQuotes = Extension.create({
  name: "smartQuotes",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("smartQuotes"),
        props: {
          handleTextInput(view, from, to, text) {
            if (text === '"') {
              const { $from } = view.state.selection;
              const textBefore = $from.nodeBefore?.textContent || "";
              const isStartOfWord = !textBefore || /\s$/.test(textBefore);

              const quote = isStartOfWord ? '"' : '"';
              const tr = view.state.tr;
              tr.replaceRangeWith(from, to, view.state.schema.text(quote));
              view.dispatch(tr);
              return true;
            }

            if (text === "'") {
              const { $from } = view.state.selection;
              const textBefore = $from.nodeBefore?.textContent || "";
              const isStartOfWord = !textBefore || /\s$/.test(textBefore);

              const quote = isStartOfWord ? "'" : "'";
              const tr = view.state.tr;
              tr.replaceRangeWith(from, to, view.state.schema.text(quote));
              view.dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

// Auto-link extension
export const AutoLink = Extension.create({
  name: "autoLink",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("autoLink"),
        props: {
          handleTextInput(view, from, to, text) {
            if (text === " ") {
              const { $from } = view.state.selection;
              const textBefore = $from.nodeBefore?.textContent || "";

              const urlRegex = /(https?:\/\/[^\s]+)/g;
              const match = urlRegex.exec(textBefore);

              if (match) {
                const url = match[1];
                const linkStart = $from.pos - textBefore.length + match.index;
                const linkEnd = linkStart + url.length;

                const tr = view.state.tr;
                const linkMark = view.state.schema.marks.link.create({
                  href: url,
                });
                tr.addMark(linkStart, linkEnd, linkMark);
                view.dispatch(tr);
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

// Markdown shortcuts extension
export const MarkdownShortcuts = Extension.create({
  name: "markdownShortcuts",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("markdownShortcuts"),
        props: {
          handleTextInput(view, from, to, text) {
            if (text === " ") {
              const { $from } = view.state.selection;
              const textBefore = $from.nodeBefore?.textContent || "";

              // Handle headings
              const headingMatch = textBefore.match(/^(#{1,6})\s*(.*)$/);
              if (headingMatch) {
                const level = headingMatch[1].length;
                const content = headingMatch[2];

                const tr = view.state.tr;
                const nodeStart = $from.pos - textBefore.length - 1;
                const nodeEnd = $from.pos - 1;

                tr.delete(nodeStart, nodeEnd);
                tr.setBlockType(
                  nodeStart,
                  nodeStart,
                  view.state.schema.nodes.heading,
                  { level },
                );
                if (content) {
                  tr.insertText(content, nodeStart);
                }
                view.dispatch(tr);
                return true;
              }

              // Handle bullet lists
              if (textBefore.match(/^[-*+]\s*$/)) {
                const tr = view.state.tr;
                const nodeStart = $from.pos - textBefore.length - 1;
                const nodeEnd = $from.pos - 1;

                tr.delete(nodeStart, nodeEnd);

                // Create the list item and wrap it in a bullet list
                const listItemType = view.state.schema.nodes.listItem;
                const bulletListType = view.state.schema.nodes.bulletList;

                if (listItemType && bulletListType) {
                  tr.setBlockType(nodeStart, nodeStart, listItemType);
                  const $pos = tr.doc.resolve(nodeStart);
                  const range = $pos.blockRange($pos);
                  if (range) {
                    tr.wrap(range, [{ type: bulletListType }]);
                  }
                }

                view.dispatch(tr);
                return true;
              }

              // Handle numbered lists
              if (textBefore.match(/^1\.\s*$/)) {
                const tr = view.state.tr;
                const nodeStart = $from.pos - textBefore.length - 1;
                const nodeEnd = $from.pos - 1;

                tr.delete(nodeStart, nodeEnd);

                // Create the list item and wrap it in an ordered list
                const listItemType = view.state.schema.nodes.listItem;
                const orderedListType = view.state.schema.nodes.orderedList;

                if (listItemType && orderedListType) {
                  tr.setBlockType(nodeStart, nodeStart, listItemType);
                  const $pos = tr.doc.resolve(nodeStart);
                  const range = $pos.blockRange($pos);
                  if (range) {
                    tr.wrap(range, [{ type: orderedListType }]);
                  }
                }

                view.dispatch(tr);
                return true;
              }

              // Handle blockquotes
              if (textBefore.match(/^>\s*$/)) {
                const tr = view.state.tr;
                const nodeStart = $from.pos - textBefore.length - 1;
                const nodeEnd = $from.pos - 1;

                tr.delete(nodeStart, nodeEnd);
                tr.setBlockType(
                  nodeStart,
                  nodeStart,
                  view.state.schema.nodes.blockquote,
                );
                view.dispatch(tr);
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
}); 