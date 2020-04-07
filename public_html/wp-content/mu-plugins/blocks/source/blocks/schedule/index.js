/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ScheduleEdit } from './edit';

export const NAME = 'wordcamp/schedule';
export const LABEL = __( 'Schedule', 'wordcamporg' );
export const ICON = 'schedule';

const supports = {
	align: [ 'wide', 'full' ],
	// todo-misc make this dry w/ php side? speaker block doesn't, but might be nice
};

// todo explain that otherwise block styles are very very long
// need to pass in data? can maybe import it from tests?
// see https://github.com/WordPress/gutenberg/issues/13312
// addding this does cause it do use the default attributes, so it may show more tracks than thye want, but that's probably a worthwhile tradeoff
const example = {
	attributes: {
		'__isStylesPreview' : true,
	},
};

const styles = [
	{
		name: 'default',
		label: __( 'Grid Layout', 'wordcamporg' ),
		isDefault: true,
	},

	/*
	 * This allows organizers to force the mobile view for a block, even when the display is large. It's useful
	 * when the grid is too wide to comfortably fit even on large screens (e.g., the block has 4+ tracks).
	 */
	{
		name: 'single-column-layout',
		label: 'Single-Column Layout',
	},
];

export const SETTINGS = {
	title: __( 'Schedule', 'wordcamporg' ),
	description: __( "Display your WordCamp's awesome schedule.", 'wordcamporg' ),
	icon: ICON,
	example: example,
	category: 'wordcamp',
	supports: supports,
	styles: styles,
	edit: ScheduleEdit,
	save: () => null,
};
