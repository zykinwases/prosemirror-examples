import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
import { Plugin } from 'prosemirror-state';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { menuBar } from 'prosemirror-menu';
import { buildInputRules } from './rules';
import { buildKeymap } from './keyBindings';
import { Schema } from 'prosemirror-model';
import { buildMenuItems } from './menu';

/**
Create an array of plugins pre-configured for the given schema.
The resulting array will include the following plugins:

 * Input rules for smart quotes and creating the block types in the
   schema using markdown conventions (say `"> "` to create a
   blockquote)

 * A keymap that defines keys to create and manipulate the nodes in the
   schema

 * A keymap binding the default keys provided by the
   prosemirror-commands module

 * The undo history plugin

 * The drop cursor plugin

 * The gap cursor plugin

 * A custom plugin that adds a `menuContent` prop for the
   prosemirror-menu wrapper, and a CSS class that enables the
   additional styling defined in `style/style.css` in this package

Probably only useful for quickly setting up a passable
editor—you'll need more control over your settings in most
real-world situations.
*/
function exampleSetup(options: { schema: Schema; mapKeys?: { [x: string]: string; }; menuBar?: boolean; floatingMenu?: boolean; menuContent?: any; history?: boolean; }) {
    let plugins = [
        buildInputRules(options.schema),
        keymap(buildKeymap(options.schema, options.mapKeys)),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
    ];
    if (options.menuBar !== false)
        plugins.push(menuBar({ floating: options.floatingMenu !== false,
            content: options.menuContent || buildMenuItems(options.schema) }));
    if (options.history !== false)
        plugins.push(history());
    // новый плагин заставляет весь редактор иметь css-класс ProseMirror-example-setup-style
    return plugins.concat(new Plugin({
        props: {
            attributes: { class: "ProseMirror-example-setup-style" }
        }
    }));
}

export { exampleSetup }
