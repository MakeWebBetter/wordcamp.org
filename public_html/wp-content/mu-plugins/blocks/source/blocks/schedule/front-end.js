/**
 * Internal dependencies
 */
import { ScheduleGridContext } from './edit';
import { getDerivedSessions } from './data';
import './front-end.scss';

const rawScheduleData = window.WordCampBlocks.schedule || {};
// rename to blockData for consistency w/ other blocks?
	// not descriptive though. i guess this one isn't either. maybe rename to something more descriptie instead of blockdata
	// if so, rename in edit.js too

// this file is being loading in the editor, but should only load on the front end
	// probably similar problem mentioned in init(), so maybe conditionally register it if on the front end
		// wp_using_themes + ! wcorg_is_rest_api_request? - https://wordpress.stackexchange.com/a/360401/3898

// todo-front build file for full schedule contains a bunch of other stuff, like classnames, memoize, @babel and @emotion, etc. shouldn't those be in gutenberg build files already?
	// maybe just need to explicitly add the @wordpress/* components that we're using to package.json `dependencies`? then the above packages will be registered as externals automatically?

/*
 todo-beta

 then lint php and js
 switch to v8.0.0 and test, b/c have been working from gutneberg `master` to avoid console errors - https://github.com/WordPress/gutenberg/issues/22080
 once front-end ready for beta, squash this branch down to atomic commits as if you were going to merge to production
 review each commit to make sure doesn't contain stuff that doesn't match the commit msg

 then create a new branch from here, and strip out to-do comments and anything other tangential things. includes everything needed for beta test, but avoid unnecessary unfinished things
 submit pr for ^ branch for review of major architectural things, then start beta test
	 can close scaffolding pr
	 post on neso p2 for more visibility
 then come back to this branch finish & polish everything that's remaining, so we can do a full review at the end
 draft p2 post for community blog
    ask for beta testers
    especially want feedback around customizing w/ css
    if not currently planning, go back to old site and try to recreate schedule w/ the new block
        can just draft new page
        will probably need to edit each session to set the duration
        add custom css to match what you did w/ shortcode
        any pain points? does anything look wierd? anything take more work than it felt like it should have?
        need any extra css classes or anything?
        are the css classes intuitive? are the implications between `is-spanning-some-tracks` and `is-spanning-all-tracks` obvious? (no, they're not, but not sure what's better)
        ask them to share the public preview url in the comments
    xpost to meta p2

probably not for beta, but maybe - add button to convert times to browser timezone, b/c for online camps it'd tediuous for people in other timezones
 *
 */

/*
WARNING in asset size limit: The following asset(s) exceed the recommended size limit (244 KiB).
This can impact web performance.
Assets:
  blocks.min.js (371 KiB)
  schedule-front-end.min.js (327 KiB)

  WARNING in entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (244 KiB). This can impact web performance.
Entrypoints:
  blocks (384 KiB)
      blocks.min.css
      blocks.min.js
      blocks.min.asset.php
  schedule-front-end (345 KiB)
      schedule-front-end.min.css
      schedule-front-end.min.js
      schedule-front-end.min.asset.php


WARNING in webpack performance recommendations:
You can limit the size of your bundles by using import() or require.ensure to lazy load some parts of your application.
For more info visit https://webpack.js.org/guides/code-splitting/
 */

import { ScheduleGrid } from './schedule-grid';
	// should export _default_ instead and remove the braces above?
import renderFrontend from '../../utils/render-frontend';

/**
 * Wrap ScheduleGrid with a Context provider.
 *
 * @param {Object} props
 * @param {Array}  props.chosenSessions
 * @param {Array}  props.allTracks
 * @param {Object} props.attributes
 * @param {Object} props.settings
 *
 * @return {Element}
 */
function ScheduleGridWithContext( props ) {
	const { chosenSessions, allTracks, attributes, settings } = props;

	/*
	 * `attributes.attributes` is an unparsed JSON string. It's an artifact from `renderFrontend()` expecting
	 * individual `data-{foo}` HTML attributes, instead of a single `data-attributes` one. For this block, though,
	 * that would take extra work to maintain without providing any benefit. Removing it prevents it from causing
	 * any confusion.
	 *
	 * @todo-front Maybe look at refactoring that function to avoid workarounds like this.
	 */
	delete attributes.attributes;

	return (
		<ScheduleGridContext.Provider
			value={ { allTracks, attributes, settings, renderEnvironment: 'front-end' } }
		>
			<ScheduleGrid sessions={ chosenSessions } />
		</ScheduleGridContext.Provider>
	);
}

/**
 * Gather the props that should be passed to ScheduleGrid.
 *
 * document that pulling [...pulling what? forgot what i was gonna write - todo]
 *
 * @param {Element} element
 *
 * @return {Object}
 */
function getScheduleGrdProps( element ) {
	const { attributes: rawAttributes } = element.dataset;
	const { allCategories, allTracks, settings } = rawScheduleData;
		// todo document why outting in initial response instead of fetching async - perf/ux - faster. document in controller.php or here or both?
		// see also cotroller.php::populate_global_data_store(), and the other filter callback if that sticks around

	let parsedAttributes = {};
	let derivedSessions = [];

	if ( rawAttributes ) {
		parsedAttributes = JSON.parse( decodeURIComponent( rawAttributes ) );
		derivedSessions = getDerivedSessions( rawScheduleData.allSessions, allCategories, allTracks, parsedAttributes );
	}

	const props = {
		allTracks: allTracks,
		settings: settings,
		attributes: parsedAttributes,
		chosenSessions: derivedSessions.chosenSessions,
	};

	return props;
}

renderFrontend( '.wp-block-wordcamp-schedule', ScheduleGridWithContext, getScheduleGrdProps );
	// can just call ScheduleGrid directly here instead of needing a extra component?
		// maybe move the logic in into getAttributesFromData ?
			// can't b/c it's not the one calling ScheduleGrid, unless there's some way to do it that i'm not aware of
		// or maybe wrap renderFrontend with <Context> ?
			// can't b/c attributes are different? but those could be passed as props?
				// but they're not props in editor, so would have to change there to make it a prop, or maybe can add to context in schedulegrid? but that would be weird
	// maybe modify renderFrontEnd so that it'll set Context, if getAttributesFromData() returns an object named 'context.name' and `context.value` ?
