<?php

namespace WordCamp\SpeakerFeedback\View;
use function WordCamp\SpeakerFeedback\Post\get_session_speaker_names;

$session_args = array(
	'post_type'      => 'wcb_session',
	'posts_per_page' => -1,
	'orderby'        => 'meta_value_num',
	'order'          => 'asc',
	'meta_key'       => '_wcpt_session_time',
	// get only sessions, no breaks.
	'meta_query'     => array(
		array(
			'key'   => '_wcpt_session_type',
			'value' => 'session',
		),
	),
);

$sessions = new \WP_Query( $session_args );

if ( $sessions->have_posts() ) : ?>
<form id="sft-navigation" class="speaker-feedback-navigation">
	<label for="sft-session"><?php esc_html_e( 'Select a session to leave feedback', 'wordcamporg' ); ?></label>
	<div class="speaker-feedback__wrapper">
		<div class="speaker-feedback__field">
			<select name="sft_session" id="sft-session">
				<?php while ( $sessions->have_posts() ) :
					$sessions->the_post();
					$session_title = get_the_title();
					$session_time  = absint( get_post_meta( get_the_ID(), '_wcpt_session_time', true ) );
					$option_text   = sprintf( '%1$s: %2$s', wp_date( 'M d, g:ia', $session_time ), $session_title );

					$speakers = get_session_speaker_names( get_the_ID() );
					if ( ! empty( $speakers ) ) {
						$option_text .= ' — ' . implode( ', ', $speakers );
					}
					printf(
						'<option value="%s">%s</option>',
						esc_attr( get_the_ID() ),
						wp_kses_post( $option_text )
					);
				endwhile; ?>
			</select>
		</div>
		<input type="submit" value="<?php esc_attr_e( 'Give Feedback', 'wordcamporg' ); ?>" />
	</div>
</form>
<?php endif;
wp_reset_postdata();
