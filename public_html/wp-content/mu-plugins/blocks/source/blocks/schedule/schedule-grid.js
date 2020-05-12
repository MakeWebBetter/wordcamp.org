/**
 * WordPress dependencies
 */
import { dateI18n } from '@wordpress/date';
import { __, _x } from '@wordpress/i18n';
import { useContext } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { Sessions } from './sessions';
import { NoContent } from '../../components/';
import { DATE_SLUG_FORMAT, implicitTrack, sortBySlug } from './data';
import { ScheduleGridContext } from './edit';

/**
 * Render the schedule.
 *
 * @param {Object} props
 * @param {Array}  props.sessions
 *
 * @return {Element}
 */
export function ScheduleGrid( { sessions } ) {
	const { attributes } = useContext( ScheduleGridContext );
	const scheduleDays = [];

	if ( sessions.length === 0 ) {
		return (
			<NoContent
				loading={ false }
				message={ __(
					'No published sessions are assigned to the chosen days and tracks.',
					'wordcamporg'
				) }
			/>
		);
	}

	const groupedSessions = groupSessionsByDate( sessions );

	Object.keys( groupedSessions ).forEach( ( date ) => {
		const sessionsGroup = groupedSessions[ date ];

		scheduleDays.push(
			<ScheduleDay
				key={ date }
				date={ date }
				sessions={ sessionsGroup }
			/>
		);
	} );

	return (
		<div className={ `wordcamp-schedule ${ attributes.className || '' }` }>
			{ scheduleDays }
		</div>
	);
}

/**
 * Create an array of sessions, indexed by their date.
 *
 * @param {Array} sessions
 *
 * @return {Array}
 */
function groupSessionsByDate( sessions ) {
	return sessions.reduce( ( groups, session ) => {
		/*
		 * Ideally this would be done in `fetchScheduleData()`, but making meta queries with the REST API requires
		 * jumping through a lot of extra hoops.
		 */
		if ( 0 === session.derived.startTime ) {
			return groups;
		}

		const date = dateI18n( 'Ymd', session.derived.startTime );

		if ( date ) {
			groups[ date ] = groups[ date ] || [];
			groups[ date ].push( session );
		}

		return groups;
	}, {} );
}

/**
 * Render the schedule for a specific day.
 *
 * @param {Object} props
 * @param {string} props.date     In a format acceptable by `wp.date.dateI18n()`.
 * @param {Array}  props.sessions
 *
 * @return {Element}
 */
function ScheduleDay( { date, sessions } ) {
	const { attributes, allTracks, settings } = useContext( ScheduleGridContext );
	const { chooseSpecificTracks, chosenTrackIds } = attributes;

	const displayedTracks = getDisplayedTracks( sessions, allTracks, chooseSpecificTracks, chosenTrackIds );
	const formattedDate = dateI18n( DATE_SLUG_FORMAT, date );
	const formattedTrackIds = chooseSpecificTracks ? displayedTracks.map( ( track ) => track.id ).join( '-' ) : 'all';

	/*
	 * The ID must be unique across blocks, because otherwise the corresponding `grid-template-rows` and
	 * `grid-template-columns` could conflict when there are multiple blocks on the same page.
	 *
	 * e.g., one block showing April 21st 2020 with the "designer" track, and another block showing April 21st
	 * 2020 with the "developer" track.
	 *
	 * The ID should only change when the user _explicitly_ makes a change that forces changes to the grid layout.
	 * Otherwise their Custom CSS would be disconnected, and they'd have to update the ID to get it to apply again.
	 *
	 * `useInstanceId` can't be used, because it sometimes changes when `attributes` changes. Another reason it's
	 * not ideal is because it's origin and meaning wouldn't be obvious to organizers. The Block's `clientId` also
	 * isn't ideal, for the same reason.
	 *
	 * The combination of the date and tracks is intuitive, and minimizes the scenarios where changes to
	 * `attributes` would change the ID. `tracks-all` is used when they haven't chosen specific tracks, because
	 * tracks could still be added/removed when they publish/un-publish sessions, but that shouldn't disconnect
	 * their custom styles.
	 */
	const sectionId = `wordcamp-schedule__day-${ formattedDate }-tracks-${ formattedTrackIds }`;

	const startEndTimes = sessions.reduce( ( accumulatingTimes, session ) => {
		accumulatingTimes.push( session.derived.startTime );
		accumulatingTimes.push( session.derived.endTime );

		return accumulatingTimes;
	}, [] );

	return (
		<>
			{ /* Style tags outside of `<body>` are valid since HTML 5.2. */ }
			<style>
				{ renderDynamicGridStyles( sectionId, displayedTracks, startEndTimes ) }
			</style>

			<h2 className="wordcamp-schedule__date">
				{ dateI18n( settings.date_format, date ) }
			</h2>

			<section
				id={ sectionId }
				className="wordcamp-schedule__day"
			>
				<GridColumnHeaders displayedTracks={ displayedTracks } />

				<Sessions
					displayedTracks={ displayedTracks }
					sessions={ sessions }
				/>
			</section>
		</>
	);
}

/**
 * Get the tracks that will be displayed in the grid UI -- the ones that the given Sessions are assigned to.
 *
 * In general, it's more useful for this block to know which tracks are assigned, rather than which ones exist,
 * because e.g., you don't want to print all tracks in `GridColumnHeaders`, only the ones being used.
 *
 * @param {Array}   sessions
 * @param {Array}   allTracks
 * @param {boolean} chooseSpecificTracks
 * @param {Array}   chosenTrackIds
 *
 * @return {Array}
 */
function getDisplayedTracks( sessions, allTracks, chooseSpecificTracks, chosenTrackIds ) {
	let displayedTracksIds;

	if ( chooseSpecificTracks && chosenTrackIds.length ) {
		displayedTracksIds = chosenTrackIds;

	} else {
		// Gather all of the tracks from the given sessions.
		const uniqueTrackIds = new Set();

		for ( const session of sessions ) {
			for ( const track of session.derived.assignedTracks ) {
				uniqueTrackIds.add( track.id );
			}
		}

		displayedTracksIds = Array.from( uniqueTrackIds );
	}

	const displayedTracks = allTracks.filter(
		( track ) => displayedTracksIds.includes( track.id )
	);

	if ( displayedTracksIds.includes( implicitTrack.id ) ) {
		displayedTracks.push( implicitTrack );
	}

	/*
	 * Nothing above should change the sorting, but sort it again just to be safe, because the order is very
	 * important. See `fetchScheduleData()`.
	 */
	displayedTracks.sort( sortBySlug );

	return displayedTracks;
}

/**
 * Render CSS styles that have to be generated on the fly.
 *
 * @param {string} containerId
 * @param {Array}  tracks
 * @param {Array}  startEndTimes
 *
 * @return {string}
 */
function renderDynamicGridStyles( containerId, tracks, startEndTimes ) {
	// This needs to be kept in sync with the `breakpoint-grid-layout` mixin.
	const styles = `
		@supports ( display: grid ) {
			@media screen and ( min-width: 550px ) {
				#${ containerId } {
					${ renderGridTemplateColumns( tracks ) }
					${ renderGridTemplateRows( startEndTimes ) }
				}
			}
		}
	`;

	return styles;
}

/**
 * Render dynamic `grid-template-column` styles.
 *
 * @param {Array} tracks
 *
 * @return {string}
 */
function renderGridTemplateColumns( tracks ) {
	const firstTrackId = tracks[ 0 ].id;
	const lastTrackId = tracks[ tracks.length - 1 ].id;

	let trackGridLines = `[wordcamp-schedule-track-${ firstTrackId }-start] 1fr`;

	tracks.forEach( ( track, index ) => {
		if ( index === tracks.length - 1 ) {
			return;
		}

		const nextTrackId = tracks[ index + 1 ].id;

		const line = `
			[
				wordcamp-schedule-track-${ track.id }-end
				wordcamp-schedule-track-${ nextTrackId }-start
			] 1fr
		`;

		trackGridLines += line;
	} );

	trackGridLines += `[wordcamp-schedule-track-${ lastTrackId }-end]`;

	const templateColumns = `grid-template-columns:
		[times] auto
		${ trackGridLines }
	;`;

	return templateColumns;
}

/**
 * Render dynamic `grid-template-row` styles.
 *
 * @param {Array} startEndTimes All of the start and end times that should be present in the grid. They can be
 *                              passed in any format that Moment.js can parse.
 *
 * @return {string}
 */
function renderGridTemplateRows( startEndTimes ) {
	startEndTimes.sort(); // Put them in chronological order.

	const timeList = startEndTimes.reduce( ( accumulatingTimes, time ) => {
		const formattedTime = dateI18n( 'Hi', time );

		return accumulatingTimes += `[time-${ formattedTime }] auto `;
	}, '' );

	const templateRows = `
		/* Organizers: Set these to \`1fr\` to make the row height relative to the time duration of the session. */
		grid-template-rows:
			[tracks] auto
			${ timeList }
		;
	`;
	// todo the organizers note isn't really noticable, since it's not there when you "view source", and the dom
	// inspector doesn't show it in the calculated/parsed areas. you only see it if you inspect the <style> tag,
	// and even there it's not formatted so it's difficult to read. is there a better way to communicate this?

	return templateRows;
}

/**
 * Render the column headers for a schedule.
 *
 * When `attributes.chooseSpecificTracks` is `true`, all of the chosen tracks will be displayed, even if they
 * don't have any sessions assigned to them. That's intentional, because not showing them would create a situation
 * where it wouldn't be obvious to the user why the tracks that they selected aren't being shown.
 *
 * @param {Object} props
 * @param {Array} props.displayedTracks
 *
 * @return {Element}
 */
function GridColumnHeaders( { displayedTracks } ) {
	/*
	 * If we're using an implicit track, then there won't be any track names printed, so there's not much point
	 * in printing the "Time" header either. It's obvious enough, and it'd looks odd on its own without the track
	 * names.
	 */
	if ( implicitTrack.id === displayedTracks[ 0 ].id ) {
		return null;
	}

	return (
		<>
			{ /*
			 * Columns headings are hidden from screen readers because the time/track info is already displayed
			 * in each session, and screen readers couldn't make sense of these headers; they're only an extra
			 * visual aid for sighted users.
			 */ }
			<span
				className="wordcamp-schedule__column-header"
				aria-hidden="true"
				style={ { gridColumn: 'times' } }
			>
				{ _x( 'Time', 'table column heading', 'wordcamporg' ) }
			</span>

			{ displayedTracks.map( ( track ) => (
				<span
					key={ track.id }
					className="wordcamp-schedule__column-header"
					aria-hidden="true" // See note above about aria-hidden.
					style={ { gridColumn: `wordcamp-schedule-track-${ track.id }` } }
				>
					{ track.name }
				</span>
			) ) }
		</>
	);
}
