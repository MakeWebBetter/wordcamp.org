/**
 * WordPress dependencies
 */
import { createContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { getScheduleData } from './data';
import { ScheduleGrid } from './schedule-grid';
import InspectorControls from './inspector-controls';
import { NoContent } from '../../components/';
import './edit.scss';

export const ScheduleGridContext = createContext();

/**
 * Top-level component for the editing UI for the block.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 *
 * @return {Element}
 */
export function ScheduleEdit( { attributes, setAttributes } ) {
	const scheduleData = getScheduleData( attributes );
	const { allSessions, chosenSessions, allTracks, settings } = scheduleData;

	if ( scheduleData.loading ) {
		return <NoContent loading={ true } />;
	}

	const contextValues = {
		allTracks: allTracks,
		attributes: attributes,
		settings: settings,
		renderEnvironment: 'editor'
	};

	return (
		<>
			<ScheduleGridContext.Provider value={ contextValues }>
				<ScheduleGrid sessions={ chosenSessions } />
			</ScheduleGridContext.Provider>

			<InspectorControls
				/*
				 * This is intentionally using `allSessions` instead of `chosenSessions`, for the same reason that
				 * `allTracks` is used instead of the assigned tracks. See `ChooseSpecificTracks()`.
				 */
				allSessions={ allSessions }
				allTracks={ allTracks }
				attributes={ attributes }
				setAttributes={ setAttributes }
				settings={ settings }
			/>
		</>
	);
}





/*
todo still need this?

need to support child categories/tracks in ScheduleInspectorControls()?

maybe not since don't need to worry about back-compat?
but if so, need to disable them on new sites once the block is launched
will still want to _display_ them using the "hierarchical" list of checkboxes, though,
rather than the search-y list for "tags"
probably simpler to just copy/paste the from from G, but mark it as temporary, and remove it when #17476 is fixed

```
import HierarchicalTermSelector from '@wordpress/editor'; doesn't work

function customizeTaxonomySelector( OriginalComponent ) {
    return function( props ) {

        if ( 'my_taxonomy' !== props.slug ) {
        	return <OriginalComponent { ...props } />;
        }

        return <HierarchicalTermSelector { ...props } />;
    };
}
wp.hooks.addFilter( 'editor.PostTaxonomyType', 'my-custom-plugin', customizeTaxonomySelector );
// might not be necessary after https://github.com/WordPress/gutenberg/issues/13816 fixed, but doesn't run there?
```

another approach would be to just ignore tha parent level directories, and only show the bottom level
or better yet, flatten them all into the same level, and then ignore the ones that don't have any terms
directly assigned to them (which should throw out the parents in most cases)
ugh, probably have to do this, since can't overwrite UI in Gutenberg --
see https://github.com/WordPress/gutenberg/issues/13816#issuecomment-532885577
and https://github.com/WordPress/gutenberg/issues/17476

another would be to trick G into thinking it's hierarchical by overwriting the rest api value but that's not
elegant. could restrict to context=edit but still

once this is done, it should probably live in `inspector-controls.js`, but ran into some issues there that
didn't run into here, so putting that off until it's working here.
*/
