<?php

namespace WordCamp\Blocks\Speakers;
defined( 'WPINC' ) || die();

use WP_Post;
use WordCamp\Blocks;
use WordCamp_Post_Types_Plugin;

/**
 * Register block types and enqueue scripts.
 *
 * @return void
 */
function init() {
	register_block_type( 'wordcamp/speakers', array(
		'attributes'      => get_attributes_schema(),
		'render_callback' => __NAMESPACE__ . '\render',
	) );
}

add_action( 'init', __NAMESPACE__ . '\init' );

/**
 *
 *
 * @param array $data
 *
 * @return array
 */
function add_script_data( array $data ) {
	$data['speakers'] = [
		'schema'  => get_attributes_schema(),
		'options' => array(
			'align'   => get_options( 'align' ),
			'content' => get_options( 'content' ),
			'display' => get_options( 'display' ),
			'mode'    => get_options( 'mode' ),
			'sort'    => get_options( 'sort' ),
		),
	];

	return $data;
}

add_filter( 'wordcamp_blocks_script_data', __NAMESPACE__ . '\add_script_data' );

/**
 * Render the block on the front end.
 *
 * @param array $attributes Block attributes.
 *
 * @return string
 */
function render( $attributes ) {
	$defaults   = wp_list_pluck( get_attributes_schema(), 'default' );
	$attributes = wp_parse_args( $attributes, $defaults );

	$speakers = get_speaker_posts( $attributes );
	$sessions = [];

	if ( ! empty( $speakers ) && true === $attributes['show_session'] ) {
		$sessions = get_speaker_sessions( wp_list_pluck( $speakers, 'ID' ) );
	}

	ob_start();
	require Blocks\PLUGIN_DIR . 'view/speakers.php';
	$html = ob_get_clean();

	return $html;
}


function get_speaker_posts( array $attributes ) {
	$post_args = [
		'post_type'      => 'wcb_speaker',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
	];

	$sort = explode( '_', $attributes['sort'] );

	if ( 2 === count( $sort ) ) {
		$post_args['orderby'] = $sort[0];
		$post_args['order']   = $sort[1];
	}

	switch ( $attributes['mode'] ) {
		case 'specific_posts' :
			$post_args['post__in'] = $attributes['post_ids'];
			break;

		case 'specific_terms' :
			$post_args['tax_query'] = [
				[
					'taxonomy' => 'wcb_speaker_group',
					'field'    => 'id',
					'terms'    => $attributes['term_ids'],
				],
			];
			break;
	}

	return get_posts( $post_args );
}


function get_speaker_sessions( array $speaker_ids ) {
	$sessions_by_speaker = [];

	$session_args = [
		'post_type'      => 'wcb_session',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'meta_key'       => '_wcpt_session_time',
		'orderby'        => 'meta_value_num',
	];

	$session_posts = get_posts( $session_args );

	foreach ( $session_posts as $session ) {
		$session_speaker_ids = get_post_meta( $session->ID, '_wcpt_speaker_id', false );

		foreach ( $session_speaker_ids as $speaker_id ) {
			if ( in_array( $speaker_id, $speaker_ids ) ) {
				if ( ! isset( $sessions_by_speaker[ $speaker_id ] ) ) {
					$sessions_by_speaker[ $speaker_id ] = [];
				}

				$sessions_by_speaker[ $speaker_id ][] = $session;
			}
		}
	}

	return $sessions_by_speaker;
}

/**
 * Generate an excerpt for a post with a maximum specified length.
 *
 * @param WP_Post $post
 * @param int     $excerpt_length
 *
 * @return string
 */
function get_speaker_excerpt( WP_Post $post, $excerpt_length ) {
	$excerpt_length = absint( $excerpt_length );
	$excerpt_more   = __( '&hellip;', 'wordcamporg' );

	if ( has_excerpt( $post ) ) {
		$content = $post->post_excerpt;
	} else {
		$content = get_the_content( '' );

		$content = strip_shortcodes( $content );
		$content = excerpt_remove_blocks( $content );

		/** This filter is documented in wp-includes/post-template.php */
		$content = apply_filters( 'the_content', $content );
		$content = str_replace( ']]>', ']]&gt;', $content );
	}

	$excerpt = wp_trim_words( $content, $excerpt_length, $excerpt_more );

	/** This filter is documented in wp-includes/post-template.php */
	return apply_filters( 'the_excerpt', $excerpt );
}

/**
 * Get the schema for the block's attributes.
 *
 * @return array
 */
function get_attributes_schema() {
	return [
		'mode'           => [
			'type'    => 'string',
			'enum'    => wp_list_pluck( get_options( 'mode' ), 'value' ),
			'default' => '',
		],
		'post_ids'       => [
			'type'    => 'array',
			'default' => [],
			'items'   => [
				'type' => 'integer',
			],
		],
		'term_ids'       => [
			'type'    => 'array',
			'default' => [],
			'items'   => [
				'type' => 'integer',
			],
		],
		'sort'           => [
			'type'    => 'string',
			'enum'    => wp_list_pluck( get_options( 'sort' ), 'value' ),
			'default' => 'title_asc',
		],
		'display'     => [
			'type'    => 'string',
			'enum'    => wp_list_pluck( get_options( 'display' ), 'value' ),
			'default' => 'list',
		],
		'className'      => [
			'type'    => 'string',
			'default' => '',
		],
		'show_avatars'   => [
			'type'    => 'bool',
			'default' => true,
		],
		'avatar_size'    => [
			'type'    => 'integer',
			'minimum' => 25,
			'maximum' => 600,
			'default' => 150,
		],
		'avatar_align'   => [
			'type'    => 'string',
			'enum'    => wp_list_pluck( get_options( 'align' ), 'value' ),
			'default' => 'none',
		],
		'content'        => [
			'type'    => 'string',
			'enum'    => wp_list_pluck( get_options( 'content' ), 'value' ),
			'default' => 'full',
		],
		'excerpt_length' => [
			'type'    => 'integer',
			'minimum' => 10,
			'maximum' => 1000,
			'default' => 55,
		],
		'speaker_link'   => [
			'type'    => 'bool',
			'default' => false,
		],
		'show_session'   => [
			'type'    => 'bool',
			'default' => false,
		],
	];
}

/**
 * Get the label/value pairs for a type of options.
 *
 * @param string $type
 *
 * @return array
 */
function get_options( $type ) {
	$options = [];

	switch ( $type ) {
		case 'align':
			$options = [
				[
					'label' => _x( 'None', 'alignment option', 'wordcamporg' ),
					'value' => 'none',
				],
				[
					'label' => _x( 'Left', 'alignment option', 'wordcamporg' ),
					'value' => 'left',
				],
				[
					'label' => _x( 'Center', 'alignment option', 'wordcamporg' ),
					'value' => 'center',
				],
				[
					'label' => _x( 'Right', 'alignment option', 'wordcamporg' ),
					'value' => 'right',
				],
			];
			break;
		case 'content':
			$options = [
				[
					'label' => _x( 'Full', 'content option', 'wordcamporg' ),
					'value' => 'full',
				],
				[
					'label' => _x( 'Excerpt', 'content option', 'wordcamporg' ),
					'value' => 'excerpt',
				],
				[
					'label' => _x( 'None', 'content option', 'wordcamporg' ),
					'value' => 'none',
				],
			];
			break;
		case 'display':
			$options = [
				[
					'label' => _x( 'List', 'content option', 'wordcamporg' ),
					'value' => 'list',
				],
				[
					'label' => _x( 'Grid', 'content option', 'wordcamporg' ),
					'value' => 'grid',
				],
			];
			break;
		case 'mode':
			$options = [
				[
					'label' => '',
					'value' => '',
				],
				[
					'label' => _x( 'List all speakers', 'mode option', 'wordcamporg' ),
					'value' => 'all',
				],
				[
					'label' => _x( 'Add a speaker', 'mode option', 'wordcamporg' ),
					'value' => 'specific_posts',
				],
				[
					'label' => _x( 'Add a group', 'mode option', 'wordcamporg' ),
					'value' => 'specific_terms',
				],
			];
			break;
		case 'sort':
			$options = [
				[
					'label' => _x( 'A → Z', 'sort option', 'wordcamporg' ),
					'value' => 'title_asc',
				],
				[
					'label' => _x( 'Z → A', 'sort option', 'wordcamporg' ),
					'value' => 'title_desc',
				],
				[
					'label' => _x( 'Newest to Oldest', 'sort option', 'wordcamporg' ),
					'value' => 'date_desc',
				],
				[
					'label' => _x( 'Oldest to Newest', 'sort option', 'wordcamporg' ),
					'value' => 'date_asc',
				],
			];
			break;
	}

	return $options;
}
